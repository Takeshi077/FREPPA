const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getReportCard,
  getReportCardByChild,
  getReportHistory,
  getReportPDF,
} = require('../controllers/reportController');

router.use(authenticateToken);

router.get('/card', getReportCard);
router.get('/card/pdf', getReportPDF);
router.get('/history', getReportHistory);
router.get('/child/:childId/card', getReportCardByChild);
router.get('/child/:childId/card/pdf', getReportPDF);

module.exports = router;
