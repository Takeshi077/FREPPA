const pool = require('../config/db');
const XLSX = require('xlsx');

function calculateGrade(total) {
  if (total >= 70) return 'A';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 45) return 'D';
  if (total >= 40) return 'E';
  return 'F';
}

exports.getSubjects = async (req, res) => {
  try {
    const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }
    const teacherId = teacherRows[0].id;

    const [subjects] = await pool.query(
      `SELECT s.id, s.subject_name, s.subject_code, c.class_name, c.section
       FROM subjects s
       JOIN classes c ON s.class_id = c.id
       WHERE s.teacher_id = ? AND s.is_active = 1
       ORDER BY c.class_name, s.subject_name`,
      [teacherId]
    );

    res.json({ subjects });
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getStudentsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }
    const teacherId = teacherRows[0].id;

    const [subjects] = await pool.query(
      'SELECT id, class_id FROM subjects WHERE id = ? AND teacher_id = ?',
      [subjectId, teacherId]
    );
    if (subjects.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this subject.' });
    }

    const classId = subjects[0].class_id;

    const [students] = await pool.query(
      `SELECT s.id, s.admission_number, u.full_name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.class_id = ? AND u.is_active = 1
       ORDER BY u.full_name`,
      [classId]
    );

    const [currentTerm] = await pool.query('SELECT id, term_name FROM terms WHERE is_current = 1 LIMIT 1');
    const [currentSession] = await pool.query('SELECT id, session_name FROM sessions WHERE is_current = 1 LIMIT 1');

    const termId = currentTerm.length > 0 ? currentTerm[0].id : null;
    const sessionId = currentSession.length > 0 ? currentSession[0].id : null;

    const studentsWithResults = await Promise.all(students.map(async (student) => {
      let result = null;
      if (termId && sessionId) {
        const [results] = await pool.query(
          `SELECT id, test1, test2, test3, ca_score, exam_score, total_score, grade, remarks
           FROM results
           WHERE student_id = ? AND subject_id = ? AND term_id = ? AND session_id = ?`,
          [student.id, subjectId, termId, sessionId]
        );
        if (results.length > 0) {
          result = results[0];
        }
      }
      return { ...student, result };
    }));

    res.json({
      subjectId: parseInt(subjectId),
      classId,
      term: currentTerm[0] || null,
      session: currentSession[0] || null,
      students: studentsWithResults
    });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateResult = async (req, res) => {
  try {
    const { student_id, subject_id, term_id, session_id, test1, test2, test3, exam_score, remarks } = req.body;

    if (!student_id || !subject_id || !term_id || !session_id) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const t1 = parseFloat(test1 || 0);
    const t2 = parseFloat(test2 || 0);
    const t3 = parseFloat(test3 || 0);
    const exam = parseFloat(exam_score || 0);

    if (t1 < 0 || t1 > 10 || t2 < 0 || t2 > 10 || t3 < 0 || t3 > 10) {
      return res.status(400).json({ error: 'Each test score must be between 0 and 10.' });
    }
    if (exam < 0 || exam > 70) {
      return res.status(400).json({ error: 'Exam score must be between 0 and 70.' });
    }

    const ca_score = t1 + t2 + t3;
    const total = ca_score + exam;
    const grade = calculateGrade(total);

    const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }
    const teacherId = teacherRows[0].id;

    const [subjects] = await pool.query(
      'SELECT id FROM subjects WHERE id = ? AND teacher_id = ?',
      [subject_id, teacherId]
    );
    if (subjects.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this subject.' });
    }

    const [existing] = await pool.query(
      'SELECT id, test1, test2, test3, ca_score, exam_score, total_score, grade, remarks FROM results WHERE student_id = ? AND subject_id = ? AND term_id = ? AND session_id = ?',
      [student_id, subject_id, term_id, session_id]
    );

    if (existing.length > 0) {
      const oldData = existing[0];
      await pool.query(
        `UPDATE results
         SET test1 = ?, test2 = ?, test3 = ?, ca_score = ?, exam_score = ?, grade = ?, remarks = ?, updated_by_teacher_id = ?
         WHERE id = ?`,
        [t1, t2, t3, ca_score, exam, grade, remarks || null, teacherId, existing[0].id]
      );

      await pool.query(
        `INSERT INTO result_audit_log (result_id, teacher_id, action, old_data, new_data, ip_address)
         VALUES (?, ?, 'updated', ?, ?, ?)`,
        [
          existing[0].id,
          teacherId,
          JSON.stringify(oldData),
          JSON.stringify({ test1: t1, test2: t2, test3: t3, exam_score: exam, ca_score, total, grade, remarks }),
          req.ip
        ]
      );

      const [updated] = await pool.query(
        'SELECT id, test1, test2, test3, ca_score, exam_score, total_score, grade, remarks, updated_at FROM results WHERE id = ?',
        [existing[0].id]
      );

      res.json({ message: 'Result updated successfully.', result: updated[0] });
    } else {
      const [insertResult] = await pool.query(
        `INSERT INTO results (student_id, subject_id, term_id, session_id, test1, test2, test3, ca_score, exam_score, grade, remarks, updated_by_teacher_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, subject_id, term_id, session_id, t1, t2, t3, ca_score, exam, grade, remarks || null, teacherId]
      );

      await pool.query(
        `INSERT INTO result_audit_log (result_id, teacher_id, action, old_data, new_data, ip_address)
         VALUES (?, ?, 'created', NULL, ?, ?)`,
        [
          insertResult.insertId,
          teacherId,
          JSON.stringify({ test1: t1, test2: t2, test3: t3, exam_score: exam, ca_score, total, grade, remarks }),
          req.ip
        ]
      );

      const [created] = await pool.query(
        'SELECT id, test1, test2, test3, ca_score, exam_score, total_score, grade, remarks, updated_at FROM results WHERE id = ?',
        [insertResult.insertId]
      );

      res.status(201).json({ message: 'Result created successfully.', result: created[0] });
    }
  } catch (err) {
    console.error('Update result error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.bulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }
    const teacherId = teacherRows[0].id;

    const [currentTerm] = await pool.query('SELECT id FROM terms WHERE is_current = 1 LIMIT 1');
    const [currentSession] = await pool.query('SELECT id FROM sessions WHERE is_current = 1 LIMIT 1');

    const termId = currentTerm[0]?.id;
    const sessionId = currentSession[0]?.id;

    if (!termId || !sessionId) {
      return res.status(400).json({ error: 'No active term or session set.' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const admissionNumber = row['Admission Number'] || row['admission_number'];
      const subjectCode = row['Subject Code'] || row['subject_code'];
      const test1 = parseFloat(row['1st Test'] || row['test1'] || 0);
      const test2 = parseFloat(row['2nd Test'] || row['test2'] || 0);
      const test3 = parseFloat(row['3rd Test'] || row['test3'] || 0);
      const examScore = parseFloat(row['Exam Score'] || row['exam_score']);
      const remarksRow = row['Remarks'] || row['remarks'] || null;

      if (!admissionNumber || !subjectCode || isNaN(examScore)) {
        errors.push({ row: i + 1, error: 'Missing required fields or invalid scores.' });
        continue;
      }

      if (test1 < 0 || test1 > 10 || test2 < 0 || test2 > 10 || test3 < 0 || test3 > 10) {
        errors.push({ row: i + 1, error: 'Test scores out of range (0-10).' });
        continue;
      }
      if (examScore < 0 || examScore > 70) {
        errors.push({ row: i + 1, error: 'Exam score out of range (0-70).' });
        continue;
      }

      const caScore = test1 + test2 + test3;

      const [subjectRows] = await pool.query(
        'SELECT id, class_id FROM subjects WHERE subject_code = ? AND teacher_id = ?',
        [subjectCode, teacherId]
      );
      if (subjectRows.length === 0) {
        errors.push({ row: i + 1, error: `Subject code ${subjectCode} not found or not assigned to you.` });
        continue;
      }

      const [studentRows] = await pool.query(
        'SELECT id, class_id FROM students WHERE admission_number = ?',
        [admissionNumber]
      );
      if (studentRows.length === 0) {
        errors.push({ row: i + 1, error: `Student ${admissionNumber} not found.` });
        continue;
      }

      if (studentRows[0].class_id !== subjectRows[0].class_id) {
        errors.push({ row: i + 1, error: `Student ${admissionNumber} is not in the class for this subject.` });
        continue;
      }

      const total = caScore + examScore;
      const grade = calculateGrade(total);

      try {
        await pool.query(
          `INSERT INTO results (student_id, subject_id, term_id, session_id, test1, test2, test3, ca_score, exam_score, grade, remarks, updated_by_teacher_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE test1 = VALUES(test1), test2 = VALUES(test2), test3 = VALUES(test3),
           ca_score = VALUES(ca_score), exam_score = VALUES(exam_score),
           grade = VALUES(grade), remarks = VALUES(remarks), updated_by_teacher_id = VALUES(updated_by_teacher_id)`,
          [studentRows[0].id, subjectRows[0].id, termId, sessionId, test1, test2, test3, caScore, examScore, grade, remarksRow, teacherId]
        );
        results.push({ row: i + 1, admissionNumber, status: 'success' });
      } catch (dbErr) {
        errors.push({ row: i + 1, error: dbErr.message });
      }
    }

    res.json({
      message: `Processed ${data.length} rows. ${results.length} succeeded, ${errors.length} failed.`,
      results,
      errors
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
