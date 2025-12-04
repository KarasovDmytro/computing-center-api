const express = require('express');
const userController = require('../controllers/userController.js');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', isAuthenticated, hasRole('DB_ADMIN'), userController.getUsersPage);
router.get('/create-form', isAuthenticated, hasRole('DB_ADMIN'), userController.getRegisterForm);
router.post('/create', isAuthenticated, hasRole('DB_ADMIN'), userController.registerUser);

router.get('/edit/:id', isAuthenticated, hasRole('DB_ADMIN'), userController.getEditUserForm);
router.post('/update', isAuthenticated, hasRole('DB_ADMIN'), userController.updateUser);
router.post('/delete/:id', isAuthenticated, hasRole('DB_ADMIN'), userController.deleteUser);

module.exports = router;