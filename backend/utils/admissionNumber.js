const pool = require('../config/db');

const ADMISSION_FORMAT = 'FRP/YYYY/NNN';
const ADMISSION_PATTERN = /^FRP\/\d{4}\/\d{3,}$/;

function normalizeAdmissionNumber(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().toUpperCase();
}

function isValidAdmissionNumber(value) {
  return ADMISSION_PATTERN.test(normalizeAdmissionNumber(value));
}

async function getAdmissionYear(conn = pool) {
  const [rows] = await conn.query(
    'SELECT session_name FROM sessions WHERE is_current = 1 LIMIT 1'
  );
  const match = rows[0] && String(rows[0].session_name || '').match(/\d{4}/);
  return match ? match[0] : String(new Date().getFullYear());
}

async function nextAdmissionNumber(conn = pool, year) {
  const admissionYear = year || await getAdmissionYear(conn);
  const prefix = `FRP/${admissionYear}/`;
  let sql = 'SELECT admission_number FROM students WHERE admission_number LIKE ?';
  const params = [prefix + '%'];

  const [rows] = await conn.query(sql, params);
  let highest = 0;
  rows.forEach(row => {
    const match = String(row.admission_number || '').match(/^FRP\/\d{4}\/(\d+)$/);
    if (match) highest = Math.max(highest, parseInt(match[1], 10));
  });

  return prefix + String(highest + 1).padStart(3, '0');
}

module.exports = {
  ADMISSION_FORMAT,
  ADMISSION_PATTERN,
  normalizeAdmissionNumber,
  isValidAdmissionNumber,
  getAdmissionYear,
  nextAdmissionNumber
};
