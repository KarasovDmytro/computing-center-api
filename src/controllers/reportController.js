const { getDailyReport } = require('../services/reportService');
const { logAction } = require('../services/loggerService');

const reportController = {
    getReportPage: async (req, res) => {
        try {
            const date = req.query.date || new Date().toISOString().split('T')[0];
            const page = parseInt(req.query.page) || 1;

            await logAction(req, 'REPORT_VIEW', {
                reportDate: date,
                page: page
            });
            
            const stats = await getDailyReport(date, page, 10);

            res.render('pages/reports', {
                stats,
                queryDate: date
            });
        } catch (e) {
            console.error(e);
            await logAction(req, 'REPORT_GENERATION_ERROR', {
                date: req.query.date,
                error: e.message
            }, 'ERROR');
            res.status(500).send("Помилка генерації звіту");
        }
    }
};

module.exports = reportController;