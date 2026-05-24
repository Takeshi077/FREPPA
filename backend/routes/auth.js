const express = require('express');
const router = express.Router();
const { login, verify } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', login);
router.get('/verify', authenticateToken, verify);

module.exports = router;
