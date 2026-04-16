const request = require('supertest');
const express = require('express');
const session = require('express-session');



const mockPrisma = {
    user: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, pib: "Ivanov I.I.", login: "ivan", role: "USER" }]),
        count: jest.fn().mockResolvedValue(1)
    },
    computer: {
        findMany: jest.fn().mockResolvedValue([{ id: 99, inventoryNumber: "PC-100", status: "AVAILABLE" }]),
        count: jest.fn().mockResolvedValue(1)
    },
    session: {
        findFirst: jest.fn().mockResolvedValue(null)
    },

    $transaction: jest.fn().mockResolvedValue([
        [{ id: 1, pib: "Ivanov I.I.", login: "ivan", role: "USER" }],
        1
    ])
};

jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => mockPrisma) }));

jest.mock('../../src/config/redis', () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
}));


jest.mock('../../src/models/ComputerDetails', () => {
    const mockData = [{
        computerId: 99,
        specs: { cpu: "Intel i7", ram: "16GB" }
    }];

    return {
        find: jest.fn().mockResolvedValue(mockData)
    };
});

jest.mock('../../src/services/loggerService', () => {
    return jest.fn().mockImplementation(() => ({
        logAction: jest.fn().mockResolvedValue(true)
    }));
});

const container = require('../../src/container');
const userRouters = require('../../src/routes/userRouters');
const computerRoutes = require('../../src/routes/computerRoutes');

describe('Contract Tests', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();

        app = express();
        app.use(express.json());
        app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));


        app.use((req, res, next) => {
            req.session.user = { id: 1, login: 'admin', role: 'DB_ADMIN' };
            next();
        });

        app.use((req, res, next) => {
            res.render = function (viewName, templateData) {
                return res.status(200).json(templateData);
            };
            next();
        });

        app.use('/user', userRouters);
        app.use('/computer', computerRoutes);
    });

    describe('Контракт Моніторингу компютерів', () => {
        it('повинен успішно збирати та передавати масив computers у шаблон', async () => {
            const response = await request(app).get('/computer');

            if (response.status !== 200) {
                console.log('Помилка Комп\'ютерів:', response.status, response.text);
            }

            expect(response.status).toBe(200);

            expect(response.body).toHaveProperty('computers');

            const pc = response.body.computers[0];
            expect(pc).toMatchObject({
                id: 99,
                inventoryNumber: "PC-100",
            });
            expect(pc).toHaveProperty('specs');
        });
    });

    describe('Контракт Користувачів', () => {
        it('повинен успішно збирати та передавати масив users у шаблон', async () => {
            const response = await request(app).get('/user');

            if (response.status !== 200) {
                console.log('Помилка Користувачів:', response.status, response.text);
            }

            expect(response.status).toBe(200);

            expect(response.body).toHaveProperty('users');
            expect(response.body.users[0]).toMatchObject({
                id: 1,
                login: "ivan",
                role: "USER"
            });
        });
    });
});