const express = require('express');
const sessionController = require('../controllers/sessionController.js');
const computerController = require('../controllers/computerController.js');

const router = express.Router();

router.post('/session-end', sessionController.adminStopSessionController);
router.post('/maintenance/end', computerController.finishMaintenance);

module.exports = router;