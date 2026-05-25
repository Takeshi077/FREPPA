const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function fix() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'freppa_school',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  // Fix teachers: find users with role 'teacher' missing from teachers table
  const [missingTeachers] = await pool.query(`
    SELECT u.id, u.full_name
    FROM users u
    LEFT JOIN teachers t ON u.id = t.user_id
    WHERE u.role = 'teacher' AND t.id IS NULL
  `);

  for (const u of missingTeachers) {
    const staffId = `TCH${String(u.id).padStart(4, '0')}`;
    await pool.query(
      'INSERT INTO teachers (user_id, staff_id) VALUES (?, ?)',
      [u.id, staffId]
    );
    console.log(`Created teacher profile for: ${u.full_name} (staff_id: ${staffId})`);
  }

  // Fix students: find users with role 'student' missing from students table
  const [missingStudents] = await pool.query(`
    SELECT u.id, u.full_name
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    WHERE u.role = 'student' AND s.id IS NULL
  `);

  for (const u of missingStudents) {
    const admNo = `ADM${String(u.id).padStart(4, '0')}`;
    await pool.query(
      'INSERT INTO students (user_id, admission_number, class_id) VALUES (?, ?, ?)',
      [u.id, admNo, 1]
    );
    console.log(`Created student profile for: ${u.full_name} (admission: ${admNo}, class_id: 1)`);
  }

  console.log('\nDone. Restart the backend server for changes to take effect.');
  process.exit(0);
}

fix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
