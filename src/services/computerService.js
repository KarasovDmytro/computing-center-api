class ComputerService {
    constructor(prisma, redisClient, ComputerDetails) {
        this.prisma = prisma;
        this.redisClient = redisClient;
        this.ComputerDetails = ComputerDetails;
    }

    async getComputersData(search, status) {
        try {
            const CACHE_KEY = 'computers:dashboard_list';
            const isCleanRequest = !search && !status;
            let computers = null;
            let source = 'BD';

            if (isCleanRequest) {
                const cachedData = await this.redisClient.get(CACHE_KEY);
                if (cachedData) {
                    computers = JSON.parse(cachedData);
                    source = 'REDIS';
                }
            }

            if (!computers) {
                const whereClause = { deletedAt: null };

                if (status) {
                    whereClause.status = status;
                }

                if (search) {
                    whereClause.OR = [
                        {
                            inventoryNumber: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        },
                        {
                            location: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    ];
                }

                computers = await this.prisma.computer.findMany({
                    where: whereClause,
                    orderBy: {
                        inventoryNumber: "asc"
                    }
                });

                if (isCleanRequest && computers.length > 0) {
                    await this.redisClient.setEx(CACHE_KEY, 60, JSON.stringify(computers));
                }
            }

            const computerIds = computers.map(pc => pc.id);
            const specsDocs = await this.ComputerDetails.find({
                computerId: { $in: computerIds }
            });

            const specsMap = new Map();
            specsDocs.forEach(doc => {
                specsMap.set(doc.computerId, doc.specs);
            });

            const computersWithSpecs = computers.map(pc => {
                return {
                    ...pc,
                    specs: specsMap.get(pc.id) || null
                };
            });

            return { computers: computersWithSpecs, source };
        } catch (error) {
            console.error('Помилка при отриманні даних комп\'ютерів:', error);
            return { computers: [], source: 'BD' };
        }
    }

    async getActiveSessionComputerId(userId) {
        if (!userId) return null;

        const activeSession = await this.prisma.session.findFirst({
            where: {
                userId: userId,
                endTime: null
            },
            select: { computerId: true }
        });

        return activeSession ? activeSession.computerId : null;
    }

    async createComputer(data) {
        const { inventoryNumber, location, cpu, ram, gpu, storage } = data;

        if (!inventoryNumber || !location) {
            throw new Error("Інвентарний номер та локація обов'язкові!");
        }

        const newPC = await this.prisma.computer.create({
            data: {
                inventoryNumber,
                location,
                status: "AVAILABLE"
            }
        });

        await this.ComputerDetails.create({
            computerId: newPC.id,
            specs: {
                cpu: cpu || 'Не вказано',
                ram: ram || 'Не вказано',
                gpu: gpu || 'Не вказано',
                storage: storage || 'Не вказано'
            }
        });

        await this.redisClient.del('computers:dashboard_list');
        return newPC;
    }

    async setMaintenanceStatus(id, statusToSet) {
        const validStatuses = ['AVAILABLE', 'MAINTENANCE'];
        if (!validStatuses.includes(statusToSet)) {
            throw new Error("Invalid status");
        }

        const updatedInfo = await this.prisma.computer.update({
            where: { id: parseInt(id) },
            data: { status: statusToSet }
        });

        await this.redisClient.del('computers:dashboard_list');
        return updatedInfo;
    }

    async archiveComputer(id) {
        const activeSession = await this.prisma.session.findFirst({
            where: {
                computerId: parseInt(id),
                endTime: null
            }
        });

        if (activeSession) {
            return { success: false, reason: 'Неможливо видалити: на цьому комп\'ютері зараз активна сесія! Спочатку завершіть її.' };
        }

        const pc = await this.prisma.computer.findUnique({ where: { id: parseInt(id) } });
        if (!pc) return { success: false, reason: 'Комп\'ютер не знайдено' };

        await this.prisma.computer.update({
            where: { id: parseInt(id) },
            data: {
                deletedAt: new Date(),
                status: 'ARCHIVED',
                inventoryNumber: `${pc.inventoryNumber}_DEL_${Date.now()}`
            }
        });

        await this.redisClient.del('computers:dashboard_list');

        return { success: true, oldInvNumber: pc.inventoryNumber };
    }
}

module.exports = ComputerService;
