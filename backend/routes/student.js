const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getProfile,
  getResults
} = require('../controllers/studentController');

router.use(authenticateToken, requireRole('student'));

router.get('/profile', getProfile);
router.get('/results', getResults);

module.exports = router;
