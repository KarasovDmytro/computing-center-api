const AuditLog = require('../models/AuditLog');

const logAction = async (req, action, details = {}, level = 'INFO') => {
    try {
        const user = req.session?.user || null;

        const logEntry = {
            action,
            level,
            ip: req.ip || req.connection.remoteAddress,
            details: details,
            userId: user ? user.id : null,
            userRole: user ? user.role : 'GUEST',
            userName: user ? `${user.login} (${user.pib})` : 'Unauthenticated'
        };

        await AuditLog.create(logEntry);
        console.log(`LOG [${action}]: saved to Mongo`); //прибрати
    } catch (err) {
        console.error('Logger Service Error:', err.message);
    }
};

module.exports = { logAction };