const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'brainnitro@7', database: 'freppa_school' });

  // Classes JSS 1 through SSS 2
  const classIds = [1, 2, 3, 4, 5]; // JSS 1, JSS 2, JSS 3, SSS 1, SSS 2

  // Core subjects: English, Maths, Basic Science, Civic Education
  // teacher_id: 3 = Miss Emily Brown, 4 = Mrs. Grace Lee, 5 = Dr. Samuel Adeyemi
  const subjects = [
    { name: 'English Language', code: 'ENG', teacherId: 3 },
    { name: 'Mathematics',       code: 'MTH', teacherId: 4 },
    { name: 'Basic Science',     code: 'SCI', teacherId: 5 },
    { name: 'Civic Education',   code: 'CIV', teacherId: 3 },
  ];

  // Delete existing subjects for these classes
  await c.query('DELETE FROM subjects WHERE class_id IN (?)', [classIds]);
  console.log('Cleared existing subjects for JSS 1 – SSS 2');

  // Insert common core for each class
  let count = 0;
  for (const classId of classIds) {
    for (const sub of subjects) {
      const code = sub.code + (classId <= 3 ? '10' + classId : '20' + (classId - 3));
      await c.query(
        'INSERT INTO subjects (subject_name, subject_code, class_id, teacher_id) VALUES (?, ?, ?, ?)',
        [sub.name, code, classId, sub.teacherId]
      );
      count++;
    }
  }
  console.log(`Inserted ${count} subjects (4 per class across 5 classes)`);

  // Verify
  const [rows] = await c.query(
    `SELECT s.id, s.subject_name, s.subject_code, c.class_name, u.full_name AS teacher
     FROM subjects s
     JOIN classes c ON s.class_id = c.id
     LEFT JOIN teachers t ON s.teacher_id = t.id
     LEFT JOIN users u ON t.user_id = u.id
     WHERE s.class_id IN (1,2,3,4,5)
     ORDER BY c.id, s.subject_name`
  );
  console.log('\nSubjects now:');
  rows.forEach(r => console.log(`  ${r.class_name}: ${r.subject_name} (${r.subject_code}) — ${r.teacher}`));

  await c.end();
})();
