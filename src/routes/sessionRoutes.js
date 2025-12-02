const express = require('express');
const sessionController = require('../controllers/sessionController.js');

const router = express.Router();

router.post('/start', sessionController.startSessionController);
router.put('/end', sessionController.endSessionController);

module.exports = router;
