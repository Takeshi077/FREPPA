const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'brainnitro@7', database: 'freppa_school' });

  const nurClasses = { 8: 'N1', 9: 'N2' };

  const subjects = [
    { name: 'Mathematics',  code: 'MTH' },
    { name: 'English',      code: 'ENG' },
    { name: 'Basic Science', code: 'BSC' },
    { name: 'P.H.E',        code: 'PHE' },
    { name: 'Social Habit', code: 'SOH' },
    { name: 'Literature',   code: 'LIT' },
    { name: 'Computer',     code: 'COM' },
    { name: 'C.R.S',        code: 'CRS' },
    { name: 'C.C.A',        code: 'CCA' },
    { name: 'Writing',      code: 'WRI' },
    { name: 'Poem',         code: 'POE' },
  ];

  const [existingRows] = await c.query('SELECT subject_code FROM subjects');
  const existingCodes = new Set(existingRows.map(r => r.subject_code));

  let count = 0;
  for (const [classId, suffix] of Object.entries(nurClasses)) {
    for (const sub of subjects) {
      const code = sub.code + suffix;
      if (existingCodes.has(code)) {
        console.log(`  Skip ${code} (exists)`);
        continue;
      }
      await c.query(
        'INSERT INTO subjects (subject_name, subject_code, class_id) VALUES (?, ?, ?)',
        [sub.name, code, classId]
      );
      count++;
    }
  }

  console.log(`\nInserted ${count} subjects`);

  const [rows] = await c.query(
    `SELECT s.subject_name, s.subject_code, c.class_name
     FROM subjects s JOIN classes c ON s.class_id = c.id
     WHERE s.class_id IN (8,9)
     ORDER BY c.id, s.subject_name`
  );
  let current = '';
  rows.forEach(r => {
    if (r.class_name !== current) { current = r.class_name; console.log(`\n${current}:`); }
    console.log(`  ${r.subject_name} (${r.subject_code})`);
  });

  await c.end();
})();
