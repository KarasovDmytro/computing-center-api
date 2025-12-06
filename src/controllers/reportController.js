const { getDailyReport } = require('../services/reportService');

const reportController = {
    getReportPage: async (req, res) => {
        try {
            const date = req.query.date || new Date().toISOString().split('T')[0];
            const page = parseInt(req.query.page) || 1;
            const role = req.query.role || 'all';
            
            const stats = await getDailyReport(date, page, 10, role);

            res.render('pages/reports', {
                stats,
                queryDate: date,
                currentRole: role
            });
        } catch (e) {
            console.error(e);
            res.status(500).send("Помилка генерації звіту");
        }
    }
};

module.exports = reportController;