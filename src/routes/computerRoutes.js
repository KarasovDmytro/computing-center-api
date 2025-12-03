const express = require('express');
const computerController = require('../controllers/computerController.js');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', isAuthenticated, computerController.getAllComputers);
router.post('/create', isAuthenticated, hasRole('DB_ADMIN'), computerController.addComputer);
//можна ще подобавлять якщо треба буде:
// router.post('/start/:id', isAuthenticated, ...);
// router.post('/stop/:id', isAuthenticated, hasRole('DB_ADMIN'), ...);

module.exports = router;