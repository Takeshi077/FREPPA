// Loads every CSV in backend/seed_questions/ into the questions table.
//
//   node backend/seed_questions/load.js            load subjects that are empty
//   node backend/seed_questions/load.js --force    replace existing questions first
//
// Safe to re-run: by default a subject that already has questions is left alone.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const force = process.argv.includes('--force');
const LETTERS = ['A', 'B', 'C', 'D'];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT)
  });

  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.csv'));
  if (!files.length) {
    console.log('No CSV files found in ' + __dirname);
    await conn.end();
    return;
  }

  let grandTotal = 0;

  for (const file of files) {
    const wb = XLSX.readFile(path.join(__dirname, file), { raw: true });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true, defval: '' });

    const codes = [...new Set(rows.map(r => String(r['Subject Code'] || '').trim()).filter(Boolean))];
    if (codes.length !== 1) {
      console.log(file + ': expected exactly one Subject Code, found ' + codes.length + ' - skipped');
      continue;
    }
    const code = codes[0];

    const [subjects] = await conn.query(
      'SELECT id, subject_name FROM subjects WHERE subject_code = ?', [code]
    );
    if (!subjects.length) {
      console.log(file + ': subject code ' + code + ' not found in the database - skipped');
      continue;
    }
    const subject = subjects[0];

    const [existing] = await conn.query(
      'SELECT COUNT(*) AS n FROM questions WHERE subject_id = ?', [subject.id]
    );
    if (existing[0].n > 0 && !force) {
      console.log(file + ': ' + subject.subject_name + ' already has ' + existing[0].n +
                  ' questions - skipped (use --force to replace)');
      continue;
    }
    if (force) {
      await conn.query('DELETE FROM questions WHERE subject_id = ?', [subject.id]);
    }

    let loaded = 0;
    let failed = 0;

    for (const r of rows) {
      const text = String(r['Question'] || '').trim();
      const opts = ['Option A', 'Option B', 'Option C', 'Option D'].map(k => String(r[k] || '').trim());
      const key = String(r['Correct Option'] || '').trim().toUpperCase();

      if (!text || opts.some(o => !o) || new Set(opts.map(o => o.toLowerCase())).size !== 4
          || !LETTERS.includes(key)) {
        failed++;
        continue;
      }

      await conn.query(
        `INSERT INTO questions
           (subject_id, question_text, option_a, option_b, option_c, option_d, correct_option)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [subject.id, text, ...opts, key]
      );
      loaded++;
    }

    grandTotal += loaded;
    console.log(file + ': ' + subject.subject_name + ' (' + code + ') -> ' + loaded +
                ' loaded' + (failed ? ', ' + failed + ' invalid row(s) skipped' : ''));
  }

  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM questions');
  console.log('\nTotal loaded this run: ' + grandTotal);
  console.log('Questions now in database: ' + n);

  await conn.end();
})().catch(e => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
