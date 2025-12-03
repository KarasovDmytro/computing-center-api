const express = require('express');
const sessionController = require('../controllers/sessionController.js');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/start', isAuthenticated, sessionController.startSessionController);
router.put('/end',isAuthenticated, sessionController.endSessionController);

module.exports = router;
