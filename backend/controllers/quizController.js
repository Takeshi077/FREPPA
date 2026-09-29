const pool = require('../config/db');

const QUESTIONS_PER_QUIZ = 50;
const TIME_LIMIT_MINUTES = 60;

exports.QUIZ_CONFIG = { QUESTIONS_PER_QUIZ, TIME_LIMIT_MINUTES };

// Resolves the logged-in student to their class. The JWT carries the user id
// only, so the students table is the bridge to class_id.
async function getStudentClassId(req) {
  const [rows] = await pool.query(
    'SELECT class_id FROM students WHERE user_id = ?',
    [req.user.id]
  );
  return rows.length ? rows[0].class_id : null;
}

// Confirms the subject exists, is active, and belongs to the student's own
// class. Without this a student could quiz any subject by guessing its id.
async function getOwnedSubject(req, res) {
  const classId = await getStudentClassId(req);
  if (!classId) {
    res.status(404).json({ error: 'Student profile not found.' });
    return null;
  }

  const [rows] = await pool.query(
    `SELECT id, subject_name, subject_code
     FROM subjects
     WHERE id = ? AND class_id = ? AND is_active = 1`,
    [req.params.subjectId, classId]
  );

  if (rows.length === 0) {
    res.status(403).json({ error: 'That subject is not available to your class.' });
    return null;
  }
  return rows[0];
}

// Only subjects that actually have questions are listed, so a student never
// clicks into an empty quiz.
exports.getSubjects = async (req, res) => {
  try {
    const classId = await getStudentClassId(req);
    if (!classId) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const [subjects] = await pool.query(
      `SELECT s.id, s.subject_name, s.subject_code, COUNT(q.id) AS question_count
       FROM subjects s
       JOIN questions q ON q.subject_id = s.id AND q.is_active = 1
       WHERE s.class_id = ? AND s.is_active = 1
       GROUP BY s.id, s.subject_name, s.subject_code
       ORDER BY s.subject_name ASC`,
      [classId]
    );

    res.json({
      subjects,
      config: { questions_per_quiz: QUESTIONS_PER_QUIZ, time_limit_minutes: TIME_LIMIT_MINUTES }
    });
  } catch (err) {
    console.error('getSubjects error:', err);
    res.status(500).json({ error: 'Failed to load quiz subjects.' });
  }
};

// Draws the question set. correct_option is never selected here so the answers
// cannot be read from the network tab.
exports.getQuestions = async (req, res) => {
  try {
    const subject = await getOwnedSubject(req, res);
    if (!subject) return;

    const [questions] = await pool.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d
       FROM questions
       WHERE subject_id = ? AND is_active = 1
       ORDER BY RAND()
       LIMIT ${QUESTIONS_PER_QUIZ}`,
      [subject.id]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: 'No questions have been added for this subject yet.' });
    }

    res.json({
      subject: { id: subject.id, name: subject.subject_name, code: subject.subject_code },
      questions,
      time_limit_minutes: TIME_LIMIT_MINUTES
    });
  } catch (err) {
    console.error('getQuestions error:', err);
    res.status(500).json({ error: 'Failed to load questions.' });
  }
};

// Grades server-side and returns totals. Nothing is written to the database.
exports.submitQuiz = async (req, res) => {
  try {
    const subject = await getOwnedSubject(req, res);
    if (!subject) return;

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    if (answers.length === 0) {
      return res.status(400).json({ error: 'No answers were submitted.' });
    }

    // Questions actually served, recomputed rather than trusted from the
    // client. Anything left blank is simply absent from answers[].
    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS available FROM questions WHERE subject_id = ? AND is_active = 1',
      [subject.id]
    );
    const expected = Math.min(Number(countRows[0].available), QUESTIONS_PER_QUIZ);

    const submitted = new Map();
    for (const a of answers) {
      const id = Number(a.question_id);
      const selected = String(a.selected || '').toUpperCase();
      if (Number.isInteger(id) && ['A', 'B', 'C', 'D'].includes(selected)) {
        submitted.set(id, selected);
      }
    }

    if (submitted.size === 0) {
      return res.status(400).json({ error: 'No valid answers were submitted.' });
    }

    const ids = [...submitted.keys()];
    const [keyRows] = await pool.query(
      `SELECT id, correct_option
       FROM questions
       WHERE subject_id = ? AND id IN (${ids.map(() => '?').join(',')}) AND is_active = 1`,
      [subject.id, ...ids]
    );

    let correct = 0;
    for (const row of keyRows) {
      if (submitted.get(row.id) === row.correct_option) correct++;
    }

    res.json({
      subject: { id: subject.id, name: subject.subject_name, code: subject.subject_code },
      total_questions: expected,
      total_score: correct,
      correct,
      wrong: expected - correct
    });
  } catch (err) {
    console.error('submitQuiz error:', err);
    res.status(500).json({ error: 'Failed to score your quiz.' });
  }
};
