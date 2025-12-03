const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();
router.post('/login', authController.login);
router.get('/login', authController.getLoginPage);

router.get('/logout', authController.logout);
router.get('/me', authController.me);

module.exports = router;