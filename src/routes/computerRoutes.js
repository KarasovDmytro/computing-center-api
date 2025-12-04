const express = require('express');
const computerController = require('../controllers/computerController.js');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', computerController.getAllComputers);
router.post('/create', isAuthenticated, hasRole('DB_ADMIN'), computerController.addComputer);
router.post('/maintenance/end', isAuthenticated, hasRole(['HARDWARE_SPECIALIST', 'DB_ADMIN']), computerController.finishMaintenance);
router.post('/maintenance/start', isAuthenticated, hasRole('HARDWARE_SPECIALIST'), computerController.startMaintenance);

router.get('/create-form', isAuthenticated, hasRole('DB_ADMIN'), computerController.getAddComputerForm);

module.exports = router;