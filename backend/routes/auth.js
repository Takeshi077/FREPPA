const express = require('express');
const router = express.Router();
const { login, verify, changePassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/login', loginLimiter, login);
router.get('/verify', authenticateToken, verify);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;
