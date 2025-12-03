const express = require('express');
const computerController = require('../controllers/computerController.js');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', isAuthenticated, computerController.getAllComputers);
router.post('/create', isAuthenticated, hasRole('DB_ADMIN'), computerController.addComputer);
router.post('/maintenance/end', isAuthenticated, hasRole('DB_ADMIN'), computerController.finishMaintenance);

module.exports = router;