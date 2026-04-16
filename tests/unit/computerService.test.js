const ComputerService = require('../../src/services/computerService');

describe('ComputerService', () => {
    let computerService;
    let prismaMock;
    let redisMock;
    let computerDetailsMock;

    beforeEach(() => {
        prismaMock = {
            computer: {
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                findUnique: jest.fn(),
            },
            session: {
                findFirst: jest.fn(),
            }
        };

        redisMock = {
            get: jest.fn(),
            setEx: jest.fn(),
            del: jest.fn(),
        };

        computerDetailsMock = {
            find: jest.fn(),
            create: jest.fn(),
        };

        computerService = new ComputerService(prismaMock, redisMock, computerDetailsMock);


        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('getComputersData', () => {
        const mockComputers = [{ id: 1, inventoryNumber: 'PC01', location: 'Lab 1' }];
        const mockSpecs = [{ computerId: 1, specs: { cpu: 'i5' } }];

        it('має повернути дані з REDIS, якщо вони там є (Cache Hit)', async () => {
            redisMock.get.mockResolvedValue(JSON.stringify(mockComputers));
            computerDetailsMock.find.mockResolvedValue(mockSpecs);

            const result = await computerService.getComputersData();

            expect(result.source).toBe('REDIS');
            expect(result.computers[0].specs).toEqual({ cpu: 'i5' });
            expect(prismaMock.computer.findMany).not.toHaveBeenCalled();
        });

        it('має взяти дані з БД, якщо в Redis порожньо, і зберегти їх в кеш (Cache Miss)', async () => {
            redisMock.get.mockResolvedValue(null);
            prismaMock.computer.findMany.mockResolvedValue(mockComputers);
            computerDetailsMock.find.mockResolvedValue(mockSpecs);

            const result = await computerService.getComputersData();

            expect(result.source).toBe('BD');
            expect(redisMock.setEx).toHaveBeenCalled();
        });

        it('має ігнорувати кеш, якщо є пошуковий запит або статус', async () => {
            prismaMock.computer.findMany.mockResolvedValue(mockComputers);
            computerDetailsMock.find.mockResolvedValue([]);

            await computerService.getComputersData('search-term', 'AVAILABLE');

            expect(redisMock.get).not.toHaveBeenCalled();
            expect(prismaMock.computer.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ status: 'AVAILABLE' })
            }));
        });

        it('має коректно обробити випадок, коли для ПК немає характеристик у MongoDB', async () => {
            redisMock.get.mockResolvedValue(JSON.stringify(mockComputers));
            computerDetailsMock.find.mockResolvedValue([]);

            const result = await computerService.getComputersData();

            expect(result.computers[0].specs).toBeNull();
        });
    });

    describe('getActiveSessionComputerId', () => {
        it('має повернути null, якщо userId не передано', async () => {
            const result = await computerService.getActiveSessionComputerId(null);
            expect(result).toBeNull();
        });

        it('має повернути ID компютера, якщо сесія активна', async () => {
            prismaMock.session.findFirst.mockResolvedValue({ computerId: 5 });
            const result = await computerService.getActiveSessionComputerId(1);
            expect(result).toBe(5);
        });

        it('має повернути null, якщо активної сесії немає', async () => {
            prismaMock.session.findFirst.mockResolvedValue(null);
            const result = await computerService.getActiveSessionComputerId(1);
            expect(result).toBeNull();
        });
    });

    describe('createComputer', () => {
        it('має викинути помилку, якщо бракує обовязкових полів', async () => {
            await expect(computerService.createComputer({}))
                .rejects.toThrow("Інвентарний номер та локація обов'язкові!");
        });

        it('має створити ПК, характеристики в MongoDB та видалити кеш', async () => {
            const input = { inventoryNumber: 'NEW-PC', location: 'Hall', cpu: 'Ryzen 5' };
            prismaMock.computer.create.mockResolvedValue({ id: 10, ...input });

            const result = await computerService.createComputer(input);

            expect(result.id).toBe(10);
            expect(computerDetailsMock.create).toHaveBeenCalled();
            expect(redisMock.del).toHaveBeenCalledWith('computers:dashboard_list');
        });

        it('має використати дефолтні значення характеристик, якщо вони не передані', async () => {
            const minimalData = { inventoryNumber: 'MIN-PC', location: 'Storage' };
            prismaMock.computer.create.mockResolvedValue({ id: 99, ...minimalData });

            await computerService.createComputer(minimalData);

            expect(computerDetailsMock.create).toHaveBeenCalledWith(expect.objectContaining({
                specs: expect.objectContaining({
                    cpu: 'Не вказано',
                    storage: 'SDD 256GB'
                })
            }));
        });

    });

    describe('setMaintenanceStatus', () => {
        it('має викинути помилку при невалідному статусі', async () => {
            await expect(computerService.setMaintenanceStatus(1, 'BUSY'))
                .rejects.toThrow("Invalid status");
        });

        it('має успішно змінити статус та оновити кеш', async () => {
            prismaMock.computer.update.mockResolvedValue({ id: 1, status: 'MAINTENANCE' });

            await computerService.setMaintenanceStatus(1, 'MAINTENANCE');

            expect(prismaMock.computer.update).toHaveBeenCalled();
            expect(redisMock.del).toHaveBeenCalled();
        });
    });

    describe('archiveComputer', () => {
        it('має заборонити видалення, якщо є активна сесія', async () => {
            prismaMock.session.findFirst.mockResolvedValue({ id: 100 });

            const result = await computerService.archiveComputer(1);

            expect(result.success).toBe(false);
            expect(result.reason).toContain('активна сесія');
            expect(prismaMock.computer.update).not.toHaveBeenCalled();
        });

        it('має повернути помилку, якщо ПК не знайдено в базі', async () => {
            prismaMock.session.findFirst.mockResolvedValue(null);
            prismaMock.computer.findUnique.mockResolvedValue(null);

            const result = await computerService.archiveComputer(1);

            expect(result.success).toBe(false);
            expect(result.reason).toBe('Комп\'ютер не знайдено');
        });

        it('має успішно архівувати ПК (Soft Delete)', async () => {
            const mockPC = { id: 1, inventoryNumber: 'PC-OLD' };
            prismaMock.session.findFirst.mockResolvedValue(null);
            prismaMock.computer.findUnique.mockResolvedValue(mockPC);

            const result = await computerService.archiveComputer(1);

            expect(result.success).toBe(true);
            expect(prismaMock.computer.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'ARCHIVED' })
            }));
            expect(redisMock.del).toHaveBeenCalled();
        });
    });
});