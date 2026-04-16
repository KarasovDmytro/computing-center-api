const SessionService = require('../services/sessionService');

describe('SessionService', () => {
    let sessionService;
    let mockPrisma;
    let mockRedis;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-14T10:00:00Z'));

        mockPrisma = {
            session: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn()
            },
            computer: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation(async (cb) => {
                return await cb(mockPrisma);
            })
        };

        mockRedis = {
            del: jest.fn()
        };

        sessionService = new SessionService(mockPrisma, mockRedis);

        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.useRealTimers();
        console.error.mockRestore();
        console.log.mockRestore();
    });

    describe('startSession_ValidRequest_Success', () => {
        it('should return 201 and created session', async () => {
            // Arrange
            const userId = 1;
            const computerId = 10;
            const mockComputer = { id: computerId, status: 'AVAILABLE' };
            const mockCreatedSession = { id: 100, userId, computerId, startTime: new Date() };

            mockPrisma.session.findFirst.mockResolvedValue(null);
            mockPrisma.computer.findUnique.mockResolvedValue(mockComputer);
            mockPrisma.session.create.mockResolvedValue(mockCreatedSession);

            // Act
            const [status, result] = await sessionService.startSession(userId, computerId);

            // Assert
            expect(status).toBe(201);
            expect(result).toEqual(mockCreatedSession);
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

            expect(mockPrisma.session.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
                where: { userId: 1, endTime: null },
                include: { computer: true }
            });

            expect(mockPrisma.computer.findUnique).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.findUnique).toHaveBeenCalledWith({
                where: { id: 10 }
            });

            expect(mockPrisma.session.create).toHaveBeenCalledTimes(1);
            expect(mockPrisma.session.create).toHaveBeenCalledWith({
                data: {
                    userId: 1,
                    computerId: 10,
                    startTime: expect.any(Date)
                }
            });

            expect(mockPrisma.computer.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { status: 'BUSY' }
            });

            expect(mockRedis.del).toHaveBeenCalledTimes(1);
            expect(mockRedis.del).toHaveBeenCalledWith('computers:dashboard_list');
        });
    });

    describe('startSession_UserAlreadyHasSession_ReturnsError', () => {
        it('should return 400 when user has an active session', async () => {
            // Arrange
            const existingSession = { id: 99, computerId: 5 };
            mockPrisma.session.findFirst.mockResolvedValue(existingSession);

            // Act
            const [status, result] = await sessionService.startSession(1, 10);

            // Assert
            expect(status).toBe(400);
            expect(result.error).toContain('Ви вже працюєте за комп\'ютером 5');

            expect(mockPrisma.session.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.session.create).not.toHaveBeenCalled();
            expect(mockPrisma.computer.update).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('startSession_ComputerNotAvailable_ReturnsError', () => {
        it('should return 400 when computer status is BUSY', async () => {
            // Arrange
            mockPrisma.session.findFirst.mockResolvedValue(null);
            mockPrisma.computer.findUnique.mockResolvedValue({ id: 10, status: 'BUSY' });

            // Act
            const [status, result] = await sessionService.startSession(1, 10);

            // Assert
            expect(status).toBe(400);
            expect(result.error).toBe('Комп\'ютер зайнятий або не існує!');

            expect(mockPrisma.computer.findUnique).toHaveBeenCalledTimes(1);
            expect(mockPrisma.session.create).not.toHaveBeenCalled();
            expect(mockPrisma.computer.update).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('startSession_NoUserId_ThrowsError', () => {
        it('should throw error if userId is null', async () => {
            // Act
            const [status, result] = await sessionService.startSession(null, 10);

            // Assert
            expect(status).toBe(400);
            expect(result.error).toBe('Користувач не авторизований!');

            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('endSession_ValidRequest_Success', () => {
        it('should return 200, close session and update computer status', async () => {
            // Arrange
            const activeSession = { id: 100, userId: 1, computerId: 10 };
            mockPrisma.session.findFirst.mockResolvedValue(activeSession);
            mockPrisma.session.update.mockResolvedValue({ ...activeSession, endTime: new Date() });

            // Act
            const [status, result] = await sessionService.endSession(1);

            // Assert
            expect(status).toBe(200);

            expect(mockPrisma.session.findFirst).toHaveBeenCalledTimes(1);

            expect(mockPrisma.session.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.session.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: { endTime: expect.any(Date) }
            });

            expect(mockPrisma.computer.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { status: 'AVAILABLE' }
            });

            expect(mockRedis.del).toHaveBeenCalledTimes(1);
            expect(mockRedis.del).toHaveBeenCalledWith('computers:dashboard_list');
        });
    });

    describe('endSession_NoActiveSession_ReturnsError', () => {
        it('should return 400 when user does not have active session', async () => {
            // Arrange
            mockPrisma.session.findFirst.mockResolvedValue(null);

            // Act
            const [status, result] = await sessionService.endSession(1);

            // Assert
            expect(status).toBe(400);
            expect(result.error).toBe('В цього користувача немає відкритої сесії!');

            expect(mockPrisma.session.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.session.update).not.toHaveBeenCalled();
            expect(mockPrisma.computer.update).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('forceStopSession_ValidRequest_Success', () => {
        it('should return 200 and stop the session for given computer id', async () => {
            // Arrange
            const activeSession = { id: 100, userId: 1, computerId: 10 };
            mockPrisma.session.findFirst.mockResolvedValue(activeSession);
            mockPrisma.session.update.mockResolvedValue({ ...activeSession, endTime: new Date() });

            // Act
            const [status, result] = await sessionService.forceStopSession(10);

            // Assert
            expect(status).toBe(200);
            expect(result.endTime).toBeDefined();

            expect(mockPrisma.session.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.session.update).toHaveBeenCalledTimes(1);

            expect(mockPrisma.computer.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.computer.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { status: 'AVAILABLE' }
            });

            expect(mockRedis.del).toHaveBeenCalledTimes(1);
            expect(mockRedis.del).toHaveBeenCalledWith('computers:dashboard_list');
        });
    });

    describe('forceStopSession_NoActiveSession_ReturnsError', () => {
        it('should return 400 when computer has no active session', async () => {
            // Arrange
            mockPrisma.session.findFirst.mockResolvedValue(null);

            // Act
            const [status, result] = await sessionService.forceStopSession(10);

            // Assert
            expect(status).toBe(400);
            expect(result.error).toBe("На цьому комп'ютері немає активної сесії!");

            expect(mockPrisma.session.update).not.toHaveBeenCalled();
            expect(mockPrisma.computer.update).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    describe('getSessions_WithFilters_Success', () => {
        it('should correctly apply status=active and search filters', async () => {
            // Arrange
            const sessionsList = [{ id: 1 }];
            mockPrisma.session.findMany.mockResolvedValue(sessionsList);
            mockPrisma.session.count.mockResolvedValue(1);

            // Act
            const [sessions, count, code] = await sessionService.getSessions(1, 10, 'John', 'active');

            // Assert
            expect(code).toBe(200);
            expect(sessions).toEqual(sessionsList);
            expect(count).toBe(1);

            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
            expect(mockPrisma.session.findMany).toHaveBeenCalledTimes(1);
            expect(mockPrisma.session.count).toHaveBeenCalledTimes(1);

            expect(mockPrisma.session.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    endTime: null,
                    OR: expect.any(Array)
                }),
                take: 10,
                skip: 0
            }));
        });

        it('should correctly apply status=finished filter', async () => {
            // Arrange
            mockPrisma.session.findMany.mockResolvedValue([]);
            mockPrisma.session.count.mockResolvedValue(0);

            // Act
            const [sessions, count, code] = await sessionService.getSessions(1, 10, '', 'finished');

            // Assert
            expect(code).toBe(200);

            expect(mockPrisma.session.findMany).toHaveBeenCalledTimes(1);
        });
    });

    describe('getSessions_DatabaseError_Returns500', () => {
        it('should return 500 status when prisma fails', async () => {
            // Arrange
            mockPrisma.$transaction.mockRejectedValue(new Error('Database disconnected'));

            // Act
            const [sessions, count, code] = await sessionService.getSessions(1, 10, '', 'all');

            // Assert
            expect(code).toBe(500);
            expect(sessions).toEqual([]);
            expect(count).toBe(0);
        });
    });
});