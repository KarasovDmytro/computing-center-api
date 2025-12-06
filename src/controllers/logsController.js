const AuditLog = require('../models/AuditLog');
const { logAction } = require('../services/loggerService');

const logsController = {
    getLogsPage: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const search = req.query.search || '';
            const level = req.query.level || 'all';

            const query = {};

            if (level !== 'all') {
                query.level = level;
            }

            if (search) {
                const searchRegex = new RegExp(search, 'i');
                query.$or = [
                    { action: searchRegex },
                    { userName: searchRegex },
                    { ip: searchRegex },
                    { userRole: searchRegex }
                ];
            }

            const totalLogs = await AuditLog.countDocuments(query);

            const logs = await AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const totalPages = Math.ceil(totalLogs / limit) || 1;

            res.render('pages/logs', {
                logs,
                currentPage: page,
                totalPages,
                totalLogs,
                search,
                level,
                user: req.session.user
            });

        } catch (e) {
            console.error('Logs Page Error:', e);
            res.status(500).render('pages/error', {
                message: "Помилка при завантаженні логів. Перевірте з'єднання з MongoDB."
            });
        }


    },

    clearLogs: async (req, res) => {
        try {
            await AuditLog.deleteMany({});

            await AuditLog.create({
                action: 'LOGS_CLEARED',
                level: 'DANGER',
                ip: req.ip || req.connection.remoteAddress,
                userId: req.session.user.id,
                userRole: req.session.user.role,
                userName: req.session.user.login,
                details: { message: 'Адміністратор очистив історію подій' }
            });

            req.session.flash = { type: 'success', message: 'Журнал подій успішно очищено.' };

            res.redirect('/logs');
        } catch (e) {
            console.error('Clear Logs Error:', e);
            res.status(500).send("Помилка при очищенні логів");
        }
    }
};

module.exports = logsController;