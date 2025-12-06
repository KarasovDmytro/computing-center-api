const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logAction } = require('../services/loggerService');

const authController = {
    login: async (req, res) => {
        try{
            const {login, password} = req.body;

            if(!login || !password){
                return res.render('pages/login', {error: 'Будь ласка, введіть логін та пароль'});
            }

            const user = await prisma.user.findUnique({
                where: {login: login}
            });

            if(!user || user.password !== password){
                return res.render('pages/login', {error: 'Невірний логін або пароль'});
            }

            req.session.user = {
                id: user.id,
                pib: user.pib,
                role: user.role,
                login: user.login,
                accessGroup: user.accessGroup
            };
            req.session.save(async (err) => {
                if(err){
                    console.error('Session save error:', err);
                    return res.render('pages/login', {error: 'Помилка сервера при створенні сесії користувача'});
                }
                await logAction(req, 'LOGIN_SUCCESS', { role: user.role });
                res.redirect('/computer'); 
            });
        } catch(e){
            console.error('Login error:', e);
            res.render('pages/login', {error: 'Сталася критична помилка на сервері'});
        }
    },
    
    logout: async (req, res) => {
        await logAction(req, 'LOGOUT');
        req.session.destroy((err) => {
            if(err){
                console.error('Logout error:', err);
                return res.status(500).json({ message: 'Не вдалося вийти з системи' });
            }

            res.redirect('/computer');
        });
    },

    getLoginPage: (req, res) => {
        if(req.session.user) return res.redirect('/computer');
        res.render('pages/login', {error: null});
    }

};

module.exports = authController;