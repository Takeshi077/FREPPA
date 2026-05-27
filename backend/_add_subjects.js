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

  // Get existing subject names per class to avoid duplicates
  const [existing] = await c.query(
    'SELECT class_id, subject_name FROM subjects WHERE class_id IN (?)',
    [classIds]
  );
  const existingSet = new Set(existing.map(r => `${r.class_id}:${r.subject_name}`));

  // Insert common core for each class, skipping existing
  let count = 0;
  for (const classId of classIds) {
    for (const sub of subjects) {
      const key = `${classId}:${sub.name}`;
      if (existingSet.has(key)) {
        console.log(`  Skipping ${sub.name} for class ${classId} (already exists)`);
        continue;
      }
      const code = sub.code + (classId <= 3 ? '10' + classId : '20' + (classId - 3));
      await c.query(
        'INSERT INTO subjects (subject_name, subject_code, class_id, teacher_id) VALUES (?, ?, ?, ?)',
        [sub.name, code, classId, sub.teacherId]
      );
      count++;
    }
  }
  console.log(`\nInserted ${count} new subjects`);

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
