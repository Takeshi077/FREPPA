const pool = require('../config/db');
const XLSX = require('xlsx');

const OPTIONS = ['A', 'B', 'C', 'D'];

async function getTeacherId(req, res) {
  const [rows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Teacher profile not found.' });
    return null;
  }
  return rows[0].id;
}

// A teacher may manage a subject assigned to them, or one that has no teacher
// yet. With only five staff, leaving the non-departmental subjects unassigned
// would otherwise mean nobody could ever add questions to them.
async function getWritableSubject(req, res, subjectId) {
  const teacherId = await getTeacherId(req, res);
  if (!teacherId) return null;

  const [rows] = await pool.query(
    `SELECT id, subject_name, subject_code, teacher_id
     FROM subjects
     WHERE id = ? AND is_active = 1 AND (teacher_id = ? OR teacher_id IS NULL)`,
    [subjectId, teacherId]
  );

  if (rows.length === 0) {
    res.status(403).json({ error: 'That subject is not assigned to you.' });
    return null;
  }
  return rows[0];
}

// Normalises and validates one question payload. Returns { error } on failure
// so both the single-create and bulk paths share the same rules.
function parseQuestion(row) {
  const text = String(row.question_text ?? row.question ?? '').trim();
  const a = String(row.option_a ?? '').trim();
  const b = String(row.option_b ?? '').trim();
  const c = String(row.option_c ?? '').trim();
  const d = String(row.option_d ?? '').trim();
  const correct = String(row.correct_option ?? '').trim().toUpperCase();

  if (!text) return { error: 'Question text is required.' };
  if (!a || !b || !c || !d) return { error: 'All four options (A-D) are required.' };
  if (!OPTIONS.includes(correct)) return { error: 'Correct option must be A, B, C or D.' };

  const values = [a, b, c, d].map(v => v.toLowerCase());
  if (new Set(values).size !== 4) return { error: 'The four options must all be different.' };

  return {
    value: { question_text: text, option_a: a, option_b: b, option_c: c, option_d: d, correct_option: correct }
  };
}

// Subjects this teacher can build a question pool for: their own, plus any
// left unassigned. Separate from the results endpoint so the Manage Results
// screen is not flooded with subjects they cannot actually score.
exports.listQuestionSubjects = async (req, res) => {
  try {
    const teacherId = await getTeacherId(req, res);
    if (!teacherId) return;

    const [subjects] = await pool.query(
      `SELECT s.id, s.subject_name, s.subject_code, s.teacher_id, c.class_name,
              (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id AND q.is_active = 1) AS question_count
       FROM subjects s
       JOIN classes c ON s.class_id = c.id
       WHERE s.is_active = 1 AND (s.teacher_id = ? OR s.teacher_id IS NULL)
       ORDER BY c.class_name, s.subject_name`,
      [teacherId]
    );

    res.json({ subjects });
  } catch (err) {
    console.error('listQuestionSubjects error:', err);
    res.status(500).json({ error: 'Failed to load subjects.' });
  }
};

exports.listQuestions = async (req, res) => {
  try {
    const subject = await getWritableSubject(req, res, req.query.subject_id);
    if (!subject) return;

    const [questions] = await pool.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option, is_active, created_at
       FROM questions
       WHERE subject_id = ?
       ORDER BY id DESC`,
      [subject.id]
    );

    res.json({ subject, questions });
  } catch (err) {
    console.error('listQuestions error:', err);
    res.status(500).json({ error: 'Failed to load questions.' });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const subject = await getWritableSubject(req, res, req.body.subject_id);
    if (!subject) return;

    const { value, error } = parseQuestion(req.body);
    if (error) return res.status(400).json({ error });

    const [result] = await pool.query(
      `INSERT INTO questions
         (subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [subject.id, value.question_text, value.option_a, value.option_b, value.option_c, value.option_d,
       value.correct_option, req.user.id]
    );

    res.status(201).json({ id: result.insertId, message: 'Question added.' });
  } catch (err) {
    console.error('createQuestion error:', err);
    res.status(500).json({ error: 'Failed to add question.' });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT subject_id FROM questions WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const subject = await getWritableSubject(req, res, existing[0].subject_id);
    if (!subject) return;

    const { value, error } = parseQuestion(req.body);
    if (error) return res.status(400).json({ error });

    await pool.query(
      `UPDATE questions
       SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?
       WHERE id = ?`,
      [value.question_text, value.option_a, value.option_b, value.option_c, value.option_d,
       value.correct_option, req.params.id]
    );

    res.json({ message: 'Question updated.' });
  } catch (err) {
    console.error('updateQuestion error:', err);
    res.status(500).json({ error: 'Failed to update question.' });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT subject_id FROM questions WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const subject = await getWritableSubject(req, res, existing[0].subject_id);
    if (!subject) return;

    await pool.query('DELETE FROM questions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Question deleted.' });
  } catch (err) {
    console.error('deleteQuestion error:', err);
    res.status(500).json({ error: 'Failed to delete question.' });
  }
};

// Spreadsheet import. Columns: Subject Code, Question, Option A-D, Correct Option.
exports.bulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const teacherId = await getTeacherId(req, res);
    if (!teacherId) return;

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    // raw:true stops the parser coercing cells - without it a fraction like
    // 1/2 is read as a date and comes back as a serial number.
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true, defval: '' });

    if (!data.length) {
      return res.status(400).json({ error: 'The file has no rows to import.' });
    }

    const subjectCache = new Map();
    let imported = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const subjectCode = String(row['Subject Code'] || row['subject_code'] || '').trim();

      if (!subjectCache.has(subjectCode)) {
        const [found] = await pool.query(
          `SELECT id FROM subjects
           WHERE subject_code = ? AND is_active = 1 AND (teacher_id = ? OR teacher_id IS NULL)`,
          [subjectCode, teacherId]
        );
        subjectCache.set(subjectCode, found.length ? found[0].id : null);
      }

      const subjectId = subjectCache.get(subjectCode);
      if (!subjectId) {
        errors.push({ row: i + 2, error: `Subject code "${subjectCode || '(blank)'}" not found or not assigned to you.` });
        continue;
      }

      const { value, error } = parseQuestion(row);
      if (error) {
        errors.push({ row: i + 2, error });
        continue;
      }

      await pool.query(
        `INSERT INTO questions
           (subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [subjectId, value.question_text, value.option_a, value.option_b, value.option_c, value.option_d,
         value.correct_option, req.user.id]
      );
      imported++;
    }

    res.json({ imported, failed: errors.length, errors: errors.slice(0, 20) });
  } catch (err) {
    console.error('bulkUpload questions error:', err);
    res.status(500).json({ error: 'Import failed.' });
  }
};

// Blank CSV so teachers know the exact column layout.
exports.downloadTemplate = async (req, res) => {
  const rows = [
    {
      'Subject Code': 'MTH101',
      'Question': 'What is 15 multiplied by 4?',
      'Option A': '45',
      'Option B': '60',
      'Option C': '75',
      'Option D': '90',
      'Correct Option': 'B'
    }
  ];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(sheet);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="question-upload-template.csv"');
  res.send(csv);
};
