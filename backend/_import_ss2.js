const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');

(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'brainnitro@7', database: 'freppa_school' });

  const wb = XLSX.readFile(path.join(__dirname, '..', 'SS2_Attendance.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const [maxRow] = await c.query("SELECT MAX(CAST(SUBSTRING(admission_number, 10) AS UNSIGNED)) AS max_ad FROM students WHERE admission_number LIKE 'FRP/2026/%'");
  let nextAdmission = (maxRow[0].max_ad || 264) + 1;

  const hash = await bcrypt.hash('password123', 10);
  const classId = 5; // SSS 2
  let count = 0;

  for (let i = 1; i < rows.length; i++) {
    const name = rows[i]?.[1]?.trim();
    if (!name) continue;
    const sex = rows[i]?.[2]?.trim().toUpperCase() || null;
    const gender = sex === 'M' ? 'male' : sex === 'F' ? 'female' : null;

    const email = name.toLowerCase().replace(/\s+/g, '.') + '@freppa.edu';
    const admission = `FRP/2026/${String(nextAdmission).padStart(3, '0')}`;

    const [existing] = await c.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log(`  Skip ${name} (${email}) — already exists`);
      continue;
    }

    const [u] = await c.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, 'student']
    );
    await c.query(
      'INSERT INTO students (user_id, admission_number, class_id, gender) VALUES (?, ?, ?, ?)',
      [u.insertId, admission, classId, gender]
    );
    console.log(`  ${name} (${admission}) ${gender || ''}`);
    nextAdmission++;
    count++;
  }

  console.log(`\nImported ${count} students into SSS 2`);
  await c.end();
})();
