const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getSubjects,
  getStudentsBySubject,
  updateResult,
  bulkUpload,
  getSessionsTerms
} = require('../controllers/teacherController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `bulk-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(authenticateToken, requireRole('teacher'));

router.get('/sessions-terms', getSessionsTerms);
router.get('/subjects', getSubjects);
router.get('/subject/:subjectId/students', getStudentsBySubject);
router.post('/result/update', updateResult);
router.post('/result/bulk-upload', upload.single('file'), bulkUpload);

module.exports = router;
