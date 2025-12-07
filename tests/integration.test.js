const request = require('supertest');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const ComputerDetails = require('../src/models/ComputerDetails');

const prisma = new PrismaClient();

const agent = request.agent(app);

describe('Computing Center API Tests', () => {
    beforeAll(async () => {
        const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/computing_center_logs';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGO_URL);
        }

        await prisma.session.deleteMany();
        await prisma.computer.deleteMany();
        await prisma.user.deleteMany();
        await ComputerDetails.deleteMany({});

        await prisma.user.create({
            data: {
                pib: 'Test Admin',
                login: 'testadmin',
                password: 'password123',
                role: 'DB_ADMIN',
                accessGroup: 'root'
            }
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await mongoose.connection.close();
    });

    describe('Auth System', () => {

        it('should login successfully with correct credentials', async () => {
            const res = await agent
                .post('/auth/login')
                .send({
                    login: 'testadmin',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(302);
            expect(res.header.location).toBe('/computer');
        });

        it('should fail with wrong password', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    login: 'testadmin',
                    password: 'wrong'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.text).toContain('Невірний логін або пароль');
        });
    });

    describe('Computer Management (Hybrid DB)', () => {

        it('should create a new computer (Postgres + Mongo)', async () => {
            const res = await agent
                .post('/computer/create')
                .send({
                    inventoryNumber: 'TEST-PC-001',
                    location: 'Test Room',
                    cpu: 'Intel i9',
                    ram: '32GB',
                    storage: 'SSD 1TB',
                    gpu: 'RTX 4090'
                });

            expect(res.statusCode).toEqual(302);
            // Перевірка 1: Чи з'явився запис у PostgreSQL?
            const pgComputer = await prisma.computer.findUnique({
                where: { inventoryNumber: 'TEST-PC-001' }
            });
            expect(pgComputer).toBeTruthy();
            expect(pgComputer.location).toBe('Test Room');

            const mongoSpecs = await ComputerDetails.findOne({
                computerId: pgComputer.id
            });
            expect(mongoSpecs).toBeTruthy();
            expect(mongoSpecs.specs.cpu).toBe('Intel i9');
        });

        it('should prevent creating duplicate computers', async () => {
            const res = await agent
                .post('/computer/create')
                .send({
                    inventoryNumber: 'TEST-PC-001',
                    location: 'Another Room'
                });

            expect(res.statusCode).toEqual(302);

            const count = await prisma.computer.count({
                where: { inventoryNumber: 'TEST-PC-001' }
            });
            expect(count).toBe(1);
        });
    });

    describe('Audit Logs', () => {
        it('should have logged the login and creation actions', async () => {
            const AuditLog = require('../src/models/AuditLog');

            const loginLog = await AuditLog.findOne({ action: 'LOGIN_SUCCESS' });
            const createLog = await AuditLog.findOne({ action: 'COMPUTER_CREATE' });

            expect(loginLog).toBeTruthy();
            expect(loginLog.userName).toContain('testadmin');

            expect(createLog).toBeTruthy();
            expect(createLog.details.invNumber).toBe('TEST-PC-001');
        });
    });

    describe('Session Management', () => {
        let targetComputerId;

        beforeAll(async () => {
            const pc = await prisma.computer.findUnique({
                where: { inventoryNumber: 'TEST-PC-001' }
            });
            targetComputerId = pc.id;
        });

        it('should start a session on available computer', async () => {
            const res = await agent
                .post('/session/start')
                .send({ computerId: targetComputerId });

            expect(res.statusCode).toEqual(302);
            const updatedPC = await prisma.computer.findUnique({
                where: { id: targetComputerId }
            });
            expect(updatedPC.status).toBe('BUSY');

            const session = await prisma.session.findFirst({
                where: {
                    computerId: targetComputerId,
                    endTime: null
                }
            });
            expect(session).toBeTruthy();
            expect(session.userId).toBeTruthy();
        });

        it('should end the active session', async () => {
            const res = await agent
                .post('/session/end')
                .send({ computerId: targetComputerId });

            expect(res.statusCode).toEqual(302);

            const updatedPC = await prisma.computer.findUnique({
                where: { id: targetComputerId }
            });
            expect(updatedPC.status).toBe('AVAILABLE');

            const closedSession = await prisma.session.findFirst({
                where: {
                    computerId: targetComputerId,
                    endTime: { not: null }
                },
                orderBy: { startTime: 'desc' }
            });
            expect(closedSession).toBeTruthy();
        });
    });

    describe('Computer Deletion', () => {
        it('should archive the computer correctly', async () => {
            // Знаходимо ID
            const pc = await prisma.computer.findUnique({
                where: { inventoryNumber: 'TEST-PC-001' }
            });

            const res = await agent
                .post('/computer/delete')
                .send({ id: pc.id });

            expect(res.statusCode).toEqual(302);

            const archivedPC = await prisma.computer.findUnique({
                where: { id: pc.id }
            });

            expect(archivedPC).toBeTruthy();
            expect(archivedPC.status).toBe('ARCHIVED');
            expect(archivedPC.deletedAt).not.toBeNull();
            expect(archivedPC.inventoryNumber).toContain('_DEL_');
        });
    });
});