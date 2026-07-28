const pool = require('../config/db');

function calculateRemark(grade) {
  const map = { A: 'Distinction', B: 'Very Good', C: 'Good', D: 'Average', E: 'Pass', F: 'Fail' };
  return map[grade] || null;
}

function getPromotionStatus(average) {
  const avg = parseFloat(average);
  if (avg >= 90) return 'Promoted with Distinction';
  if (avg >= 40) return 'Promoted with Merit';
  return 'Advised to Repeat';
}

function getTeacherRemark(average) {
  const avg = parseFloat(average);
  if (avg >= 90) return 'Excellent result. Keep up the great work.';
  if (avg >= 75) return 'Very good result. You are doing well.';
  if (avg >= 60) return 'Good result. You can put in more effort.';
  if (avg >= 45) return 'Fair result. You need to work harder.';
  if (avg >= 40) return 'Average result. Put in more effort to improve.';
  return 'Unsatisfactory result. You need to work much harder.';
}

exports.getProfile = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT s.id, s.admission_number, s.date_of_birth, s.gender,
              u.full_name, u.email, u.phone, u.address,
              c.class_name, c.section, c.academic_year
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       WHERE s.user_id = ?`,
      [req.user.id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    res.json({ student: students[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getResults = async (req, res) => {
  try {
    const [studentRows] = await pool.query(
      'SELECT id, class_id FROM students WHERE user_id = ?',
      [req.user.id]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const studentId = studentRows[0].id;
    const { session, term } = req.query;

    let query = `
      SELECT
        r.id AS result_id,
        sub.subject_name,
        sub.subject_code,
        r.test1, r.test2, r.test3,
        r.ca_score,
        r.exam_score,
        r.total_score,
        r.grade,
        r.remarks,
        r.updated_at,
        t.term_name,
        s.session_name
      FROM results r
      JOIN subjects sub ON r.subject_id = sub.id
      JOIN terms t ON r.term_id = t.id
      JOIN sessions s ON r.session_id = s.id
      WHERE r.student_id = ?
    `;
    const params = [studentId];

    if (session) {
      query += ' AND s.id = ?';
      params.push(session);
    }
    if (term) {
      query += ' AND t.id = ?';
      params.push(term);
    }

    query += ' ORDER BY s.session_name, t.id, sub.subject_name';

    let [results] = await pool.query(query, params);
    results = results.map(r => ({ ...r, remarks: r.remarks || calculateRemark(r.grade) }));

    const [sessions] = await pool.query('SELECT id, session_name, is_current FROM sessions ORDER BY id DESC');
    const [terms] = await pool.query('SELECT id, term_name, is_current FROM terms ORDER BY id');

    let summary = null;
    if (results.length > 0) {
      const totalScore = results.reduce((sum, r) => sum + parseFloat(r.total_score || 0), 0);
      const count = results.filter(r => r.total_score !== null).length;
      const average = count > 0 ? (totalScore / count) : 0;
      summary = {
        total_subjects: count,
        total_score: totalScore.toFixed(2),
        average: average.toFixed(2),
        promotion_status: getPromotionStatus(average),
        teacher_remark: getTeacherRemark(average)
      };
    }

    res.json({ results, sessions, terms, summary });
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getParentStudents = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT s.id AS student_id, s.admission_number, u.full_name, c.class_name, c.section
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       WHERE s.parent_id = ?
       ORDER BY u.full_name`,
      [req.user.id]
    );

    res.json({ students });
  } catch (err) {
    console.error('Get parent students error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getChildResults = async (req, res) => {
  try {
    const childId = req.params.childId;

    const [studentRows] = await pool.query(
      'SELECT id, class_id FROM students WHERE id = ? AND parent_id = ?',
      [childId, req.user.id]
    );
    if (studentRows.length === 0) {
      return res.status(403).json({ error: 'You can only view results for your own children.' });
    }

    const studentId = studentRows[0].id;
    const { session, term } = req.query;

    let query = `
      SELECT
        r.id AS result_id,
        sub.subject_name,
        sub.subject_code,
        r.test1, r.test2, r.test3,
        r.ca_score,
        r.exam_score,
        r.total_score,
        r.grade,
        r.remarks,
        t.term_name,
        s.session_name
      FROM results r
      JOIN subjects sub ON r.subject_id = sub.id
      JOIN terms t ON r.term_id = t.id
      JOIN sessions s ON r.session_id = s.id
      WHERE r.student_id = ?
    `;
    const params = [studentId];

    if (session) {
      query += ' AND s.id = ?';
      params.push(session);
    }
    if (term) {
      query += ' AND t.id = ?';
      params.push(term);
    }

    query += ' ORDER BY s.session_name, t.id, sub.subject_name';

    let [results] = await pool.query(query, params);
    results = results.map(r => ({ ...r, remarks: r.remarks || calculateRemark(r.grade) }));

    const [sessions] = await pool.query('SELECT id, session_name, is_current FROM sessions ORDER BY id DESC');
    const [terms] = await pool.query('SELECT id, term_name, is_current FROM terms ORDER BY id');

    let summary = null;
    if (results.length > 0) {
      const totalScore = results.reduce((sum, r) => sum + parseFloat(r.total_score || 0), 0);
      const count = results.filter(r => r.total_score !== null).length;
      const average = count > 0 ? (totalScore / count) : 0;
      summary = {
        total_subjects: count,
        total_score: totalScore.toFixed(2),
        average: average.toFixed(2),
        promotion_status: getPromotionStatus(average),
        teacher_remark: getTeacherRemark(average)
      };
    }

    res.json({ results, sessions, terms, summary });
  } catch (err) {
    console.error('Get child results error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
