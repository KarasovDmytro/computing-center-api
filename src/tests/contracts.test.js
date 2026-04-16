const SessionService = require('../services/sessionService');
const ComputerService = require('../services/computerService');

describe('Contract Tests for Core Business Processes', () => {

    describe('Process 1: Session Management (Creation Contract)', () => {
        let sessionService;
        let mockPrisma;
        let mockRedis;

        beforeEach(() => {
            mockPrisma = {
                session: {
                    findFirst: jest.fn(),
                    create: jest.fn()
                },
                computer: {
                    findUnique: jest.fn(),
                    update: jest.fn()
                },
                $transaction: jest.fn(async (cb) => cb(mockPrisma))
            };
            mockRedis = {
                del: jest.fn()
            };
            sessionService = new SessionService(mockPrisma, mockRedis);
        });

        it('should fulfill the contract: return [201, SessionSchema] when creating session', async () => {
            const dbResponse = {
                id: 42,
                userId: 1,
                computerId: 10,
                startTime: new Date()
            };

            mockPrisma.session.findFirst.mockResolvedValue(null);
            mockPrisma.computer.findUnique.mockResolvedValue({ id: 10, status: 'AVAILABLE' });
            mockPrisma.session.create.mockResolvedValue(dbResponse);

            // Act
            const [statusCode, responseObj] = await sessionService.startSession(1, 10);

            // Assert
            expect(statusCode).toBe(201);

            // Assert
            expect(responseObj).toEqual(expect.objectContaining({
                id: expect.any(Number),
                userId: expect.any(Number),
                computerId: expect.any(Number),
                startTime: expect.any(Date)
            }));

            expect(responseObj).toHaveProperty('id');
            expect(responseObj).toHaveProperty('startTime');
        });
    });

    describe('Process 2: Computer Catalog (Extraction Contract)', () => {
        let computerService;
        let mockPrisma;
        let mockRedis;
        let mockComputerDetails;

        beforeEach(() => {
            mockPrisma = {
                computer: {
                    findMany: jest.fn()
                }
            };
            mockRedis = {
                get: jest.fn(),
                setEx: jest.fn()
            };
            mockComputerDetails = {
                find: jest.fn()
            };
            computerService = new ComputerService(mockPrisma, mockRedis, mockComputerDetails);
        });

        it('should fulfill DB independence (Return empty array without crashing)', async () => {
            // Arrange
            mockRedis.get.mockResolvedValue(null);
            mockPrisma.computer.findMany.mockResolvedValue([]);
            mockComputerDetails.find.mockResolvedValue([]);

            // Act
            const result = await computerService.getComputersData(undefined, undefined);

            // Assert
            expect(Array.isArray(result.computers)).toBe(true);
            expect(result.computers.length).toBe(0);
        });

        it('should fulfill: Return array of ComputerObjects mapped correctly', async () => {
            const dbComputers = [{
                id: 99,
                inventoryNumber: "INV-100",
                location: "Room A",
                status: "AVAILABLE",
                deletedAt: null
            }];

            mockRedis.get.mockResolvedValue(null);
            mockPrisma.computer.findMany.mockResolvedValue(dbComputers);
            mockComputerDetails.find.mockResolvedValue([]);

            // Act
            const result = await computerService.getComputersData(undefined, undefined);

            // Assert 
            expect(Array.isArray(result.computers)).toBe(true);

            const pcContract = result.computers[0];

            expect(pcContract).toEqual(expect.objectContaining({
                id: expect.any(Number),
                inventoryNumber: expect.any(String),
                location: expect.any(String),
                status: expect.any(String),
            }));

            expect(pcContract).toHaveProperty('specs');
            expect(pcContract.specs).toBeNull();
        });
    });
});