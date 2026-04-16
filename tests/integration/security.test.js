const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { isAuthenticated, hasRole } = require('../../src/middlewares/authMiddleware');

describe('Security Integration Tests (Narrow)', () => {
    let mockController;

    beforeEach(() => {
        mockController = {
            target: jest.fn((req, res) => res.status(200).send('Success'))
        };
    });
    const createTestApp = (userSession, allowedRole) => {
        const app = express();
        app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

        app.use((req, res, next) => {
            if (userSession) req.session.user = userSession;
            next();
        });

        app.get('/test-route', isAuthenticated, hasRole(allowedRole), mockController.target);

        return app;
    };

    describe('isAuthenticated Middleware', () => {
        it('має редіректнути на логін, якщо користувач не авторизований', async () => {
            const app = createTestApp(null, 'ANY');
            const response = await request(app).get('/test-route');

            expect(response.status).toBe(302);
            expect(response.header.location).toBe('/auth/login');
        });
    });

    describe('hasRole Middleware', () => {
        it('має редіректнути на /computer, якщо роль не збігається', async () => {
            const app = createTestApp({ role: 'USER' }, 'DB_ADMIN');
            const response = await request(app).get('/test-route');

            expect(response.status).toBe(302);
            expect(response.header.location).toBe('/computer');
        });

        it('має дозволити доступ, якщо роль збігається (передано як рядок)', async () => {
            const app = createTestApp({ role: 'DB_ADMIN' }, 'DB_ADMIN');
            const response = await request(app).get('/test-route');

            expect(response.status).toBe(200);
            expect(response.text).toBe('Success');
        });

        it('має дозволити доступ, якщо роль збігається (передано як масив)', async () => {
            const app = createTestApp({ role: 'PROGRAMMER' }, ['DB_ADMIN', 'PROGRAMMER']);
            const response = await request(app).get('/test-route');

            expect(response.status).toBe(200);
            expect(response.text).toBe('Success');
        });

        it('має редіректнути на логін, якщо користувач не авторизований (в hasRole)', async () => {
            const app = express();
            app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
            app.get('/defensive-check', hasRole('ANY_ROLE'), mockController.target);

            const response = await request(app).get('/defensive-check');

            expect(response.status).toBe(302);
            expect(response.header.location).toBe('/auth/login');
        });
    });
});