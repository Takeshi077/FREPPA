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
  updateSubject
} = require('../controllers/adminController');

router.use(authenticateToken, requireRole('admin'));

router.post('/users', createUser);
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);

router.get('/teachers', getTeachers);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);
router.get('/students', getStudents);

router.get('/classes', getClasses);
router.post('/classes', createClass);

router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.put('/subjects/assign-teacher', assignTeacher);

router.get('/terms', getTerms);
router.put('/terms/set-current', setCurrentTerm);
router.post('/terms', createTerm);

router.get('/sessions', getSessions);
router.put('/sessions/set-current', setCurrentSession);
router.post('/sessions', createSession);

router.post('/students/promote', promoteStudents);

router.get('/audit-log', getAuditLog);

module.exports = router;
