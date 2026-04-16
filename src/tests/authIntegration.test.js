const express = require('express');
const request = require('supertest');

const mockComputerService = {
    createComputer: jest.fn(),
    archiveComputer: jest.fn(),
    getComputersData: jest.fn(),
    getActiveSessionComputerId: jest.fn()
};

const mockLoggerService = {
    logAction: jest.fn()
};

jest.mock('../container', () => {
    const ComputerController = require('../controllers/computerController');
    return {
        computerController: new ComputerController(mockComputerService, mockLoggerService),
        loggerService: mockLoggerService
    };
});

const computerRoutes = require('../routes/computerRoutes');

describe('Security & Authorization Integration Tests', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        app.set('view engine', 'ejs');

        app.use((req, res, next) => {
            req.session = {
                save: jest.fn((cb) => { if (cb) cb(); }),
                flash: null
            };

            if (req.headers['x-mock-role']) {
                req.session.user = { id: 1, role: req.headers['x-mock-role'] };
            }
            next();
        });

        app.use('/computer', computerRoutes);

        jest.clearAllMocks();

        jest.spyOn(app.response, 'render').mockImplementation(function (view, options) {
            this.send(`Rendered ${view} with max detail`);
        });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        console.error.mockRestore();
        console.log.mockRestore();
        jest.restoreAllMocks();
    });

    describe('1. Middleware: isAuthenticated (Authentication Check)', () => {
        it('should redirect back to login (302) when unauthorized visitor accesses secure route', async () => {
            // Act
            const res = await request(app).get('/computer/create-form');

            // Assert
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/auth/login');
        });

        it('should NOT redirect to login if session exists', async () => {
            // Act
            const res = await request(app)
                .get('/computer/create-form')
                .set('X-Mock-Role', 'DB_ADMIN');

            // Assert
            expect(res.status).toBe(200);
        });
    });

    describe('2. Middleware: hasRole (RBAC Authorization Check)', () => {
        it('should bounce OPERATOR back to /computer (302) when trying to access DB_ADMIN route', async () => {
            // Act
            const res = await request(app)
                .post('/computer/create')
                .set('X-Mock-Role', 'OPERATOR')
                .send({ inventoryNumber: '123123', location: 'Hall 2' });

            // Assert
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/computer');
            expect(mockComputerService.createComputer).not.toHaveBeenCalled();
        });

        it('should execute controller logic if role matches perfectly (DB_ADMIN requests POST /create)', async () => {
            // Arrange
            mockComputerService.createComputer.mockResolvedValue({ id: 1, inventoryNumber: '123' });

            // Act
            const res = await request(app)
                .post('/computer/create')
                .set('X-Mock-Role', 'DB_ADMIN')
                .send({ inventoryNumber: '123', location: 'Hall 1' });

            // Assert
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/computer');
            expect(mockComputerService.createComputer).toHaveBeenCalled();
        });
    });

    describe('3. Sad Paths', () => {
        it('should handle Database total failure gracefully (return 500 error view instead of crashing node process)', async () => {
            // Arrange
            mockComputerService.getComputersData.mockRejectedValue(new Error('Prisma Node Crashed'));

            // Act
            const res = await request(app)
                .get('/computer')
                .set('X-Mock-Role', 'GUEST');

            // Assert
            expect(res.status).toBe(500);
            expect(res.text).toContain('Rendered pages/error');

            expect(mockLoggerService.logAction).toHaveBeenCalledWith(
                expect.any(Object),
                'SYSTEM_ERROR_COMPUTERS_LIST',
                expect.objectContaining({ error: 'Prisma Node Crashed' }),
                'ERROR'
            );
        });

        it('should handle known database rules (e.g. duplicate key P2002) and fallback cleanly', async () => {
            // Arrange
            const mockDbError = new Error('Duplicate error');
            mockDbError.code = 'P2002';
            mockComputerService.createComputer.mockRejectedValue(mockDbError);

            // Act
            const res = await request(app)
                .post('/computer/create')
                .set('X-Mock-Role', 'DB_ADMIN')
                .send({ inventoryNumber: 'DUP123', location: 'Hall 2' });

            // Assert
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/computer');

            expect(mockLoggerService.logAction).toHaveBeenCalledWith(
                expect.any(Object),
                'COMPUTER_CREATE_DUPLICATE',
                expect.any(Object),
                'WARNING'
            );
        });
    });
});