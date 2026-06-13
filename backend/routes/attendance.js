const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  saveAttendance,
  getAttendance,
  getAttendanceSummary
} = require('../controllers/attendanceController');

router.use(authenticateToken);

router.post('/save', requireRole('teacher', 'admin'), saveAttendance);
router.get('/list', requireRole('teacher', 'admin'), getAttendance);
router.get('/summary', requireRole('teacher', 'admin'), getAttendanceSummary);

module.exports = router;
