const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getParentStudents,
  getChildResults
} = require('../controllers/studentController');

router.use(authenticateToken, requireRole('parent'));

router.get('/children', getParentStudents);
router.get('/child/:childId/results', getChildResults);

module.exports = router;
