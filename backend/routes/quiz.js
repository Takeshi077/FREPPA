const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getSubjects, getQuestions, submitQuiz } = require('../controllers/quizController');

router.use(authenticateToken, requireRole('student'));

router.get('/subjects', getSubjects);
router.get('/subjects/:subjectId/questions', getQuestions);
router.post('/subjects/:subjectId/submit', submitQuiz);

module.exports = router;
