const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authController = {
    login: async (req, res) => {
        try{
            const {login, password} = req.body;

            if(!login || !password){
                return res.status(400).json({message: 'Будь ласка, введіть логін та пароль'});
            }

            const user = await prisma.user.findUnique({
                where: {login: login}
            });

            if(!user || user.password !== password){
                return res.status(401).json({message: 'Невірний логін або пароль'});
            }

            req.session.user = {
                id: user.id,
                pib: user.pib,
                role: user.role,
                accessGroup: user.accessGroup
            };
            req.session.save((err) => {
                if(err){
                    console.error('Session save error:', err);
                    return res.status(500).json({ message: 'Помилка сервера при створенні сесії' });
                }
                // res.redirect('/'); or /main ? 
                res.json({
                    success: true, 
                    message: `Вітаємо, ${user.pib}!`, 
                    user: req.session.user
                });
            });
        } catch(e){
            console.error('Login error:', e);
            res.status(500).json({ message: 'Сталася помилка на сервері' });
        }
    },
    
    logout: (req, res) => {
        req.session.destroy((err) => {
            if(err){
                console.error('Logout error:', err);
                return res.status(500).json({ message: 'Не вдалося вийти з системи' });
            }

            res.clearCookie('connect.sid');
            // res.redirect('/login');
            res.json({ success: true, message: 'Сесію успішно завершено' });

        });
    },

    //for frontend
    me: (req, res) => {
        if(req.session.user) {
            res.json({ isAuthenticated: true, user: req.session.user });
        }
        else{
            res.status(401).json({ isAuthenticated: false, message: 'Користувач не авторизований' });
        }
    }

};

module.exports = authController;