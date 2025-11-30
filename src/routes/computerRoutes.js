const express = require('express');
const computerController = require('../controllers/computerController.js');

const router = express.Router();

router.get('/', computerController.getAllComputers);
router.post('/create', computerController.addComputer);

module.exports = router;