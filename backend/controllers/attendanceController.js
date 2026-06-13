const pool = require('../config/db');

exports.saveAttendance = async (req, res) => {
  try {
    const { records, date, class_id, term_id, session_id } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0 || !date || !class_id) {
      return res.status(400).json({ error: 'Records array, date, and class_id are required.' });
    }

    const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }
    const teacherId = teacherRows[0].id;

    const [currentTerm] = term_id
      ? await pool.query('SELECT id FROM terms WHERE id = ?', [term_id])
      : await pool.query('SELECT id FROM terms WHERE is_current = 1 LIMIT 1');
    const [currentSession] = session_id
      ? await pool.query('SELECT id FROM sessions WHERE id = ?', [session_id])
      : await pool.query('SELECT id FROM sessions WHERE is_current = 1 LIMIT 1');

    const finalTermId = currentTerm[0]?.id;
    const finalSessionId = currentSession[0]?.id;

    if (!finalTermId || !finalSessionId) {
      return res.status(400).json({ error: 'No active term or session set.' });
    }

    let saved = 0;
    for (const record of records) {
      if (!record.student_id || !record.status) continue;
      await pool.query(
        `INSERT INTO attendance (student_id, class_id, term_id, session_id, date, status, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), recorded_by = VALUES(recorded_by)`,
        [record.student_id, class_id, finalTermId, finalSessionId, date, record.status, teacherId]
      );
      saved++;
    }

    res.json({ message: `${saved} attendance records saved successfully.` });
  } catch (err) {
    console.error('Save attendance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { class_id, date, term_id, session_id } = req.query;

    if (!class_id || !date) {
      return res.status(400).json({ error: 'class_id and date are required.' });
    }

    const [currentTerm] = term_id
      ? await pool.query('SELECT id FROM terms WHERE id = ?', [term_id])
      : await pool.query('SELECT id FROM terms WHERE is_current = 1 LIMIT 1');
    const [currentSession] = session_id
      ? await pool.query('SELECT id FROM sessions WHERE id = ?', [session_id])
      : await pool.query('SELECT id FROM sessions WHERE is_current = 1 LIMIT 1');

    const finalTermId = currentTerm[0]?.id;
    const finalSessionId = currentSession[0]?.id;

    const [students] = await pool.query(`
      SELECT s.id AS student_id, s.admission_number, u.full_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = ?
      ORDER BY u.full_name
    `, [class_id]);

    const [records] = await pool.query(`
      SELECT student_id, status
      FROM attendance
      WHERE class_id = ? AND date = ? AND term_id = ? AND session_id = ?
    `, [class_id, date, finalTermId, finalSessionId]);

    const recordMap = {};
    records.forEach(r => { recordMap[r.student_id] = r.status; });

    const result = students.map(s => ({
      ...s,
      status: recordMap[s.student_id] || 'present',
    }));

    res.json({ attendance: result, date, class_id: parseInt(class_id) });
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { class_id, term_id, session_id } = req.query;

    const [currentTerm] = term_id
      ? await pool.query('SELECT id FROM terms WHERE id = ?', [term_id])
      : await pool.query('SELECT id FROM terms WHERE is_current = 1 LIMIT 1');
    const [currentSession] = session_id
      ? await pool.query('SELECT id FROM sessions WHERE id = ?', [session_id])
      : await pool.query('SELECT id FROM sessions WHERE is_current = 1 LIMIT 1');

    const finalTermId = currentTerm[0]?.id;
    const finalSessionId = currentSession[0]?.id;

    let query = `
      SELECT s.id AS student_id, s.admission_number, u.full_name,
             SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
             SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent,
             SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excused
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN attendance a ON s.id = a.student_id AND a.term_id = ? AND a.session_id = ?
      WHERE 1=1
    `;
    const params = [finalTermId, finalSessionId];

    if (class_id) {
      query += ' AND s.class_id = ?';
      params.push(class_id);
    }

    query += ' GROUP BY s.id, s.admission_number, u.full_name ORDER BY u.full_name';

    const [summary] = await pool.query(query, params);
    res.json({ summary });
  } catch (err) {
    console.error('Get attendance summary error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
