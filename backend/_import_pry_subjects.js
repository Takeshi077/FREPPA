const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'brainnitro@7', database: 'freppa_school' });

  // PRY classes: id -> suffix
  const pryClasses = { 12: 'P1', 13: 'P2', 14: 'P3', 15: 'P4', 16: 'P5' };

  // Subjects from PRY5_Subjects.xlsx
  const subjects = [
    { name: 'Maths',               code: 'MTH' },
    { name: 'English',             code: 'ENG' },
    { name: 'B.S.T',               code: 'BST' },
    { name: 'P.H.E',               code: 'PHE' },
    { name: 'Computer',            code: 'COM' },
    { name: 'C.R.S',               code: 'CRS' },
    { name: 'Social Studies',      code: 'SST' },
    { name: 'Civic Education',     code: 'CIV' },
    { name: 'C.C.A',               code: 'CCA' },
    { name: 'Home Economics',      code: 'HEC' },
    { name: 'Agricultural Science', code: 'AGR' },
    { name: 'Yoruba',              code: 'YOR' },
    { name: 'French',              code: 'FRN' },
    { name: 'Literature in English', code: 'LIT' },
  ];

  const [existingRows] = await c.query('SELECT subject_code FROM subjects');
  const existingCodes = new Set(existingRows.map(r => r.subject_code));

  let count = 0;
  for (const [classId, suffix] of Object.entries(pryClasses)) {
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

  // Verify
  const [rows] = await c.query(
    `SELECT s.subject_name, s.subject_code, c.class_name
     FROM subjects s
     JOIN classes c ON s.class_id = c.id
     WHERE s.class_id IN (12,13,14,15,16)
     ORDER BY c.id, s.subject_name`
  );
  console.log('\nPRY subjects:');
  let current = '';
  rows.forEach(r => {
    if (r.class_name !== current) {
      current = r.class_name;
      console.log(`\n${current}:`);
    }
    console.log(`  ${r.subject_name} (${r.subject_code})`);
  });

  await c.end();
})();
