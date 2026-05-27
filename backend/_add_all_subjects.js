const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'brainnitro@7', database: 'freppa_school' });

  const jssSubjects = [
    'Social Studies',
    'Agricultural Science',
    'ICT',
    'Physical & Health Education',
    'Yoruba',
    'Basic Technology',
    'Home Economics',
    'Business Studies',
    'Cultural & Creative Arts',
    'C R S',
  ];
  const sssSubjects = [
    'Physics',
    'Chemistry',
    'Biology',
    'Further Mathematics',
    'Economics',
    'Literature in English',
    'Government',
    'Geography',
    'C R S',
    'Agricultural Science',
    'ICT',
    'Yoruba',
  ];

  const jssCodes = ['SST','AGR','ICT','PHE','YOR','TEC','HEC','BUS','CCA','CRS'];
  const sssCodes = ['PHY','CHM','BIO','FUR','ECO','LIT','GOV','GEO','CRS','AGR','ICT','YOR'];

  // Get existing codes to avoid duplicates
  const [existingRows] = await c.query('SELECT subject_code FROM subjects');
  const existingCodes = new Set(existingRows.map(r => r.subject_code));

  let count = 0;

  // JSS 1-3 (class_ids 1,2,3)
  for (let classId = 1; classId <= 3; classId++) {
    for (let i = 0; i < jssSubjects.length; i++) {
      const code = jssCodes[i] + '10' + classId;
      if (existingCodes.has(code)) {
        console.log(`  Skip ${code} (exists)`);
        continue;
      }
      await c.query(
        'INSERT INTO subjects (subject_name, subject_code, class_id) VALUES (?, ?, ?)',
        [jssSubjects[i], code, classId]
      );
      count++;
    }
  }

  // SSS 1-2 (class_ids 4,5)
  for (let classId = 4; classId <= 5; classId++) {
    for (let i = 0; i < sssSubjects.length; i++) {
      const code = sssCodes[i] + '20' + (classId - 3);
      if (existingCodes.has(code)) {
        console.log(`  Skip ${code} (exists)`);
        continue;
      }
      await c.query(
        'INSERT INTO subjects (subject_name, subject_code, class_id) VALUES (?, ?, ?)',
        [sssSubjects[i], code, classId]
      );
      count++;
    }
  }

  console.log(`\nInserted ${count} new subjects`);

  // Verify
  const [rows] = await c.query(
    `SELECT s.subject_name, s.subject_code, c.class_name
     FROM subjects s
     JOIN classes c ON s.class_id = c.id
     WHERE s.class_id IN (1,2,3,4,5)
     ORDER BY c.id, s.subject_name`
  );
  console.log('\nAll subjects:');
  let currentClass = '';
  rows.forEach(r => {
    if (r.class_name !== currentClass) {
      currentClass = r.class_name;
      console.log(`\n${currentClass}:`);
    }
    console.log(`  ${r.subject_name} (${r.subject_code})`);
  });

  await c.end();
})();
