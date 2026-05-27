const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');

(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'brainnitro@7', database: 'freppa_school' });

  const wb = XLSX.readFile(path.join(__dirname, '..', 'JSS1_Student_List.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const [maxRow] = await c.query("SELECT MAX(CAST(SUBSTRING(admission_number, 10) AS UNSIGNED)) AS max_ad FROM students WHERE admission_number LIKE 'FRP/2026/%'");
  let nextAdmission = (maxRow[0].max_ad || 249) + 1;

  const hash = await bcrypt.hash('password123', 10);
  const classId = 1; // JSS 1
  let count = 0;

  for (let i = 1; i < rows.length; i++) {
    const name = rows[i]?.[1]?.trim();
    if (!name) continue;

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
      [u.insertId, admission, classId, null]
    );
    console.log(`  ${name} (${admission})`);
    nextAdmission++;
    count++;
  }

  console.log(`\nImported ${count} students into JSS 1`);
  await c.end();
})();
