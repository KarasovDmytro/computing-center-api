const express = require('express');
const logsController = require('../controllers/logsController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/',
    isAuthenticated,
    hasRole(['DB_ADMIN', 'PROGRAMMER', 'OPERATOR']),
    logsController.getLogsPage
);

router.post('/clear',
    isAuthenticated,
    hasRole('DB_ADMIN'),
    logsController.clearLogs
);

module.exports = router;