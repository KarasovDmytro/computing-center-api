const ComputerService = require('../services/computerService');

describe('ComputerService', () => {
    let computerService;
    let mockPrisma;
    let mockRedis;
    let mockComputerDetails;

    beforeEach(() => {
        mockPrisma = {
            computer: {
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                findUnique: jest.fn(),
            },
            session: {
                findFirst: jest.fn()
            }
        };

        mockRedis = {
            get: jest.fn(),
            setEx: jest.fn(),
            del: jest.fn()
        };

        mockComputerDetails = {
            find: jest.fn(),
            create: jest.fn()
        };

        computerService = new ComputerService(mockPrisma, mockRedis, mockComputerDetails);

        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('getComputersData_CleanRequestWithCache_ReturnsCachedData', () => {
        it('should parse and return computers from redis without hitting db', async () => {
            // Arrange
            const cachedArray = [{ id: 1, inventoryNumber: 'INV001' }];
            mockRedis.get.mockResolvedValue(JSON.stringify(cachedArray));
            mockComputerDetails.find.mockResolvedValue([]);

            // Act
            const result = await computerService.getComputersData(undefined, undefined);

            // Assert
            expect(result.source).toBe('REDIS');
            expect(result.computers).toHaveLength(1);

            expect(mockRedis.get).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.findMany).not.toHaveBeenCalled();
        });
    });

    describe('getComputersData_CleanRequestEmptyCache_ReturnsFromDBAndCaches', () => {
        it('should fetch from db and cache the result if array is not empty', async () => {
            // Arrange
            mockRedis.get.mockResolvedValue(null);
            const dbComputers = [{ id: 1, inventoryNumber: 'INV001' }];
            mockPrisma.computer.findMany.mockResolvedValue(dbComputers);
            mockComputerDetails.find.mockResolvedValue([]);

            // Act
            const result = await computerService.getComputersData(undefined, undefined);

            // Assert
            expect(result.source).toBe('BD');

            expect(mockRedis.get).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.findMany).toHaveBeenCalledTimes(1);
            expect(mockRedis.setEx).toHaveBeenCalledTimes(1);
            expect(mockRedis.setEx).toHaveBeenCalledWith('computers:dashboard_list', 60, JSON.stringify(dbComputers));
        });
    });

    describe('getComputersData_EmptyDB_DoesNotCache', () => {
        it('should NOT cache the result if DB returns empty array', async () => {
            // Arrange
            mockRedis.get.mockResolvedValue(null);
            mockPrisma.computer.findMany.mockResolvedValue([]);
            mockComputerDetails.find.mockResolvedValue([]);

            // Act
            await computerService.getComputersData(undefined, undefined);

            // Assert
            expect(mockRedis.setEx).not.toHaveBeenCalled();
        });
    });

    describe('getComputersData_WithSearchAndStatus_IgnoresCache', () => {
        it('should correctly build whereClause and NOT use cache', async () => {
            // Arrange
            mockPrisma.computer.findMany.mockResolvedValue([]);
            mockComputerDetails.find.mockResolvedValue([{ computerId: 1, specs: { cpu: 'Intel Core i5', ram: '8GB', gpu: 'Intel HD Graphics', storage: '256GB SSD' } }]);

            // Act
            await computerService.getComputersData('PC', 'AVAILABLE');

            // Assert
            expect(mockRedis.get).not.toHaveBeenCalled();
            expect(mockPrisma.computer.findMany).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    status: 'AVAILABLE',
                    OR: expect.arrayContaining([
                        { inventoryNumber: { contains: 'PC', mode: 'insensitive' } },
                        { location: { contains: 'PC', mode: 'insensitive' } }
                    ])
                })
            }));
        });
    });

    describe('getComputersData_DatabaseError_ReturnsEmptyArray', () => {
        it('should catch error and return empty array', async () => {
            // Arrange
            mockRedis.get.mockRejectedValue(new Error('Redis/DB connection failed'));

            // Act
            const result = await computerService.getComputersData(undefined, undefined);

            // Assert
            expect(result.computers).toEqual([]);
            expect(console.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('archiveComputer_ValidRequest_Success', () => {
        it('should archive computer and clear cache', async () => {
            // Arrange
            mockPrisma.session.findFirst.mockResolvedValue(null);
            mockPrisma.computer.findUnique.mockResolvedValue({ id: 10, status: 'AVAILABLE' });
            mockPrisma.computer.update.mockResolvedValue({ id: 10, status: 'ARCHIVED' });

            // Act
            const result = await computerService.archiveComputer(10);

            // Assert
            expect(result.success).toBe(true);

            expect(mockPrisma.session.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.findUnique).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: {
                    status: 'ARCHIVED',
                    deletedAt: expect.any(Date),
                    inventoryNumber: expect.any(String)
                }
            });
            expect(mockRedis.del).toHaveBeenCalledTimes(1);
        });
    });

    describe('archiveComputer_ActiveSessionExists_ReturnsFalse', () => {
        it('should return success false', async () => {
            // Arrange
            mockPrisma.session.findFirst.mockResolvedValue({ id: 1 });

            // Act
            const result = await computerService.archiveComputer(10);

            // Assert
            expect(result.success).toBe(false);
            expect(result.reason).toContain('Неможливо видалити: на цьому комп\'ютері зараз активна сесія! Спочатку завершіть її.');

            expect(mockPrisma.computer.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.computer.update).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('archiveComputer_ComputerNotFound_ReturnsFalse', () => {
        it('should return success false', async () => {
            // Arrange
            mockPrisma.session.findFirst.mockResolvedValue(null);
            mockPrisma.computer.findUnique.mockResolvedValue(null);

            // Act
            const result = await computerService.archiveComputer(10);

            // Assert
            expect(result.success).toBe(false);
            expect(result.reason).toBe('Комп\'ютер не знайдено');

            expect(mockPrisma.computer.update).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('setMaintenanceStatus_ValidStatus_Success', () => {
        it('should update status and clear cache', async () => {
            // Arrange
            const mockUpdatedPC = { id: 10, status: 'MAINTENANCE' };
            mockPrisma.computer.update.mockResolvedValue(mockUpdatedPC);

            // Act
            const result = await computerService.setMaintenanceStatus(10, 'MAINTENANCE');

            // Assert
            expect(result).toEqual(mockUpdatedPC);

            expect(mockPrisma.computer.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { status: 'MAINTENANCE' }
            });
            expect(mockRedis.del).toHaveBeenCalledTimes(1);
            expect(mockRedis.del).toHaveBeenCalledWith('computers:dashboard_list');
        });
    });

    describe('setMaintenanceStatus_InvalidStatus_ThrowsError', () => {
        it('should throw error', async () => {
            // Act & Assert
            await expect(computerService.setMaintenanceStatus(10, 'DESTROYED')).rejects.toThrow('Invalid status');

            expect(mockPrisma.computer.update).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('getActiveSessionComputerId_ValidRequest_ReturnsId', () => {
        it('should return computer id if user has an active session', async () => {
            // Arrange
            mockPrisma.session.findFirst.mockResolvedValue({ computerId: 5 });

            // Act
            const result = await computerService.getActiveSessionComputerId(1);

            // Assert
            expect(result).toBe(5);
            expect(mockPrisma.session.findFirst).toHaveBeenCalledTimes(1);
        });
    });

    describe('getActiveSessionComputerId_NoActiveSession_ReturnsNull', () => {
        it('should return null', async () => {
            // Arrange
            mockPrisma.session.findFirst.mockResolvedValue(null);

            // Act
            const result = await computerService.getActiveSessionComputerId(1);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('getActiveSessionComputerId_NoUserId_ReturnsNull', () => {
        it('should return null', async () => {
            // Act
            const result = await computerService.getActiveSessionComputerId(null);

            // Assert
            expect(result).toBeNull();
            expect(mockPrisma.session.findFirst).not.toHaveBeenCalled();
        });
    });

    describe('createComputer_ValidData_Success', () => {
        it('should create computer, its details, and clear cache', async () => {
            // Arrange
            const mockPC = { id: 10, inventoryNumber: 'PC-202', location: 'Room 1' };
            mockPrisma.computer.create.mockResolvedValue(mockPC);
            mockComputerDetails.create.mockResolvedValue({});

            // Act
            const result = await computerService.createComputer({
                inventoryNumber: 'PC-202',
                location: 'Room 1',
                cpu: 'Intel',
                ram: '16GB',
                gpu: 'Nvidia',
                storage: '1TB'
            });

            // Assert
            expect(result).toEqual(mockPC);

            expect(mockPrisma.computer.create).toHaveBeenCalledTimes(1);
            expect(mockComputerDetails.create).toHaveBeenCalledTimes(1);
            expect(mockComputerDetails.create).toHaveBeenCalledWith(expect.objectContaining({
                computerId: 10
            }));
            expect(mockRedis.del).toHaveBeenCalledTimes(1);
        });

        it('should use default values when optional specs are not provided', async () => {
            // Arrange
            const mockPC = { id: 11, inventoryNumber: 'PC-202', location: 'Room 2' };
            mockPrisma.computer.create.mockResolvedValue(mockPC);
            mockComputerDetails.create.mockResolvedValue({});

            // Act
            await computerService.createComputer({
                inventoryNumber: 'PC-202',
                location: 'Room 2'
            });

            // Assert
            expect(mockComputerDetails.create).toHaveBeenCalledTimes(1);
            expect(mockComputerDetails.create).toHaveBeenCalledWith(expect.objectContaining({
                specs: expect.objectContaining({
                    cpu: 'Не вказано',
                    ram: 'Не вказано',
                    gpu: 'Не вказано',
                    storage: 'Не вказано'
                })
            }));
        });
    });

    describe('createComputer_InvalidData_ThrowsError', () => {
        it('should throw error if fields are missing', async () => {
            // Act & Assert
            await expect(computerService.createComputer({ location: 'Room 1' }))
                .rejects.toThrow("Інвентарний номер та локація обов'язкові!");

            expect(mockPrisma.computer.create).not.toHaveBeenCalled();
            expect(mockComputerDetails.create).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });
});