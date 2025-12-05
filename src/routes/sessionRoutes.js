const express = require('express');
const sessionController = require('../controllers/sessionController.js');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/start', isAuthenticated, sessionController.startSessionController);
router.post('/end', isAuthenticated, sessionController.endSessionController);
router.post('/session-end', isAuthenticated, hasRole('DB_ADMIN'), sessionController.adminStopSessionController);
router.get('/', isAuthenticated, hasRole('DB_ADMIN'), sessionController.getSessionsPage);

module.exports = router;
