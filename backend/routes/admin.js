const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createUser,
  getUsers,
  toggleUserStatus,
  getClasses,
  createClass,
  getSubjects,
  createSubject,
  assignTeacher,
  getTerms,
  setCurrentTerm,
  getSessions,
  setCurrentSession,
  getAuditLog,
  promoteStudents,
  getTeachers,
  getStudents,
  createSession,
  createTerm,
  updateTeacher,
  deleteTeacher,
  updateStudent,
  deleteStudent,
  updateSubject,
  deleteSubject,
  getClassPositions,
  generateReportCards,
  finalizeReportCards,
  getReportCards
} = require('../controllers/adminController');

router.use(authenticateToken, requireRole('admin'));

router.post('/users', createUser);
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);

router.get('/teachers', getTeachers);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);
router.get('/students', getStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

router.get('/classes', getClasses);
router.post('/classes', createClass);

router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/assign-teacher', assignTeacher);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

router.get('/terms', getTerms);
router.put('/terms/set-current', setCurrentTerm);
router.post('/terms', createTerm);

router.get('/sessions', getSessions);
router.put('/sessions/set-current', setCurrentSession);
router.post('/sessions', createSession);

router.post('/students/promote', promoteStudents);

router.get('/audit-log', getAuditLog);

router.get('/class-positions', getClassPositions);
router.post('/report-cards/generate', generateReportCards);
router.put('/report-cards/finalize', finalizeReportCards);
router.get('/report-cards', getReportCards);

module.exports = router;
