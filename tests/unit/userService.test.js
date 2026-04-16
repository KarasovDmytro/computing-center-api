const UserService = require('../../src/services/userService');
const bcrypt = require('bcrypt');

jest.mock('bcrypt');

describe('UserService', () => {
    let userService;
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            user: {
                findMany: jest.fn(),
                count: jest.fn(),
                create: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(mockPrisma)),
        };
        userService = new UserService(mockPrisma);
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    describe('getNUsers', () => {
        it('має повернути список користувачів та статус 200 (Success)', async () => {

            const mockUsers = [{ id: 1, pib: 'Test User' }];
            mockPrisma.user.findMany.mockResolvedValue(mockUsers);
            mockPrisma.user.count.mockResolvedValue(1);


            const [users, count, status] = await userService.getNUsers(1, 10, 'test');


            expect(status).toBe(200);
            expect(users).toEqual(mockUsers);
            expect(count).toBe(1);
            expect(mockPrisma.user.findMany).toHaveBeenCalled();
        });

        it('має повернути порожній масив та 400 при помилці', async () => {

            mockPrisma.$transaction.mockRejectedValue(new Error('DB error'));


            const [users, count, status] = await userService.getNUsers(1, 10);


            expect(status).toBe(400);
            expect(users).toEqual([]);
        });
    });

    describe('registerUsr', () => {
        it('має успішно зареєструвати користувача з правильним мапінгом ролі', async () => {

            const userData = { pib: 'Ivan', login: 'ivan123', password: '123', role: 'DB_ADMIN' };
            bcrypt.hash.mockResolvedValue('hashed_pass');
            mockPrisma.user.create.mockResolvedValue({ ...userData, accessGroup: 'root' });


            const [user, status] = await userService.registerUsr(userData.pib, userData.login, userData.password, userData.role);


            expect(status).toBe(201);
            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ accessGroup: 'root' })
            });
        });

        it('має повернути 409, якщо логін вже існує (P2002)', async () => {

            const error = new Error();
            error.code = 'P2002';
            mockPrisma.user.create.mockRejectedValue(error);
            bcrypt.hash.mockResolvedValue('hash');


            const [user, status] = await userService.registerUsr('p', 'l', 'pass', 'USER');


            expect(status).toBe(409);
            expect(user).toBeNull();
        });
    });

    describe('updateUser', () => {
        it('має оновити користувача та захешувати новий пароль, якщо він переданий', async () => {

            const updateData = { pib: 'New', login: 'l', role: 'USER', password: 'new_password' };
            bcrypt.hash.mockResolvedValue('new_hash');
            mockPrisma.user.update.mockResolvedValue({ id: 1, ...updateData });


            const [user, status] = await userService.updateUser(1, updateData);


            expect(status).toBe(200);
            expect(bcrypt.hash).toHaveBeenCalled();
            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ password: 'new_hash' })
            }));
        });

        it('має призначити "guest", якщо в updateUser передана невідома роль', async () => {

            const updateData = { pib: 'Name', login: 'l', role: 'SOME_UNKNOWN_ROLE' };
            mockPrisma.user.update.mockResolvedValue({ id: 1 });


            await userService.updateUser(1, updateData);


            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ accessGroup: 'guest' })
            }));
        });
    });

    describe('deleteUser', () => {
        it('має виконати Soft Delete (статус 200)', async () => {

            mockPrisma.user.findUnique.mockResolvedValue({ id: 1, login: 'user1' });
            mockPrisma.user.update.mockResolvedValue({ id: 1, deletedAt: new Date() });


            const status = await userService.deleteUser(1);


            expect(status).toBe(200);
            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ login: expect.stringContaining('_deleted_') })
            }));
        });

        it('має повернути 404, якщо користувача не існує', async () => {

            mockPrisma.user.findUnique.mockResolvedValue(null);


            const status = await userService.deleteUser(999);


            expect(status).toBe(404);
        });
    });

    describe('getUserById', () => {
        it('має повернути користувача за його ID', async () => {
            const mockUser = { id: 1, login: 'test' };
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await userService.getUserById(1);

            expect(result).toEqual(mockUser);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });

    describe('registerUsr - додаткові гілки', () => {
        it('має призначити групу "guest", якщо роль невідома', async () => {
            mockPrisma.user.create.mockResolvedValue({ id: 1 });
            bcrypt.hash.mockResolvedValue('hash');

            await userService.registerUsr('P', 'L', 'Pass', 'UNKNOWN_ROLE');

            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ accessGroup: 'guest' })
            });
        });

        it('має повернути 500 при невідомій помилці', async () => {
            mockPrisma.user.create.mockRejectedValue(new Error('Unexpected error'));

            const [user, status] = await userService.registerUsr('p', 'l', 'pass', 'USER');

            expect(status).toBe(500);
        });
    });

    describe('updateUser - додаткові гілки та помилки', () => {
        it('НЕ має хешувати пароль, якщо він порожній', async () => {
            const updateData = { pib: 'New', login: 'l', role: 'USER', password: '' };
            mockPrisma.user.update.mockResolvedValue({ id: 1 });

            await userService.updateUser(1, updateData);

            expect(bcrypt.hash).not.toHaveBeenCalled();
        });

        it('має використати існуючу accessGroup, якщо роль не передана', async () => {
            const updateData = { pib: 'New', login: 'l', accessGroup: 'custom' };
            mockPrisma.user.update.mockResolvedValue({ id: 1 });

            await userService.updateUser(1, updateData);

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({ accessGroup: 'custom' })
            });
        });

        it('має повернути 409 при конфлікті логінів в updateUser', async () => {
            const error = new Error();
            error.code = 'P2002';
            mockPrisma.user.update.mockRejectedValue(error);

            const [user, status] = await userService.updateUser(1, { login: 'existing' });

            expect(status).toBe(409);
        });

        it('має повернути 500 при помилці в updateUser', async () => {
            mockPrisma.user.update.mockRejectedValue(new Error('Fail'));
            const [user, status] = await userService.updateUser(1, {});
            expect(status).toBe(500);
        });
    });

    describe('deleteUser - гілки помилок', () => {
        it('має повернути 500 при помилці в deleteUser', async () => {
            mockPrisma.user.findUnique.mockRejectedValue(new Error('Fail'));
            const status = await userService.deleteUser(1);
            expect(status).toBe(500);
        });
    });
});

