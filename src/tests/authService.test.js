const bcrypt = require('bcrypt');
const AuthService = require('../services/authService');

jest.mock('bcrypt');

describe('AuthService', () => {
    let authService;
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            user: {
                findUnique: jest.fn()
            }
        };
        authService = new AuthService(mockPrisma);

        jest.clearAllMocks();

        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('authenticateUser_ValidCredentials_ReturnsUser', () => {
        it('should return user object when login and password match', async () => {
            // Arrange
            const mockUser = { login: 'admin', password: 'hashedPassword123' };
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);

            // Act
            const result = await authService.authenticateUser('admin', 'password123');

            // Assert
            expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { login: 'admin' }
            });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
            expect(result).toHaveProperty('user', mockUser);
            expect(result.error).toBeUndefined();
        });
    });

    describe('authenticateUser_MissingLoginOrPassword_ReturnsError', () => {
        it('should return error when login is empty', async () => {
            // Act
            const result = await authService.authenticateUser('', 'password123');

            // Assert
            expect(result.error).toBe('Будь ласка, введіть логін та пароль');

            expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should return error when password is empty', async () => {
            // Act
            const result = await authService.authenticateUser('admin', '');

            // Assert
            expect(result.error).toBe('Будь ласка, введіть логін та пароль');

            expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });
    });

    describe('authenticateUser_UserNotFound_ReturnsError', () => {
        it('should return error when database returns null for user', async () => {
            // Arrange
            mockPrisma.user.findUnique.mockResolvedValue(null);

            // Act
            const result = await authService.authenticateUser('unknown', 'password123');

            // Assert
            expect(result.error).toBe('Невірний логін або пароль');

            expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { login: 'unknown' }
            });
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });
    });

    describe('authenticateUser_InvalidPassword_ReturnsError', () => {
        it('should return error when bcrypt compare returns false', async () => {
            // Arrange
            const mockUser = { login: 'admin', password: 'hashedPassword123' };
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            // Act
            const result = await authService.authenticateUser('admin', 'wrong_password');

            // Assert
            expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
            expect(bcrypt.compare).toHaveBeenCalledTimes(1);
            expect(result.error).toBe('Невірний логін або пароль');
        });
    });

    describe('authenticateUser_DatabaseError_ThrowsException', () => {
        it('should throw an error when Prisma fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            mockPrisma.user.findUnique.mockRejectedValue(dbError);

            // Act & Assert
            await expect(authService.authenticateUser('admin', 'password123')).rejects.toThrow('Database connection failed');
            expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });
    });
});