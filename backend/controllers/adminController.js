const bcrypt = require('bcryptjs');
const pool = require('../config/db');

exports.createUser = async (req, res) => {
  try {
    const {
      full_name, email, password, role, phone, address,
      staff_id, department, qualification,
      admission_number, class_id, parent_id, date_of_birth, gender
    } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'Full name, email, password, and role are required.' });
    }

    if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    if (role === 'student' && (!admission_number || !class_id)) {
      return res.status(400).json({ error: 'Admission number and class are required for students.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO users (full_name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
        [full_name, email, password_hash, role, phone || null, address || null]
      );
      const userId = result.insertId;

      if (role === 'teacher') {
        const teacherStaffId = staff_id || `TCH${String(userId).padStart(4, '0')}`;
        await conn.query(
          'INSERT INTO teachers (user_id, staff_id, department, qualification) VALUES (?, ?, ?, ?)',
          [userId, teacherStaffId, department || null, qualification || null]
        );
      } else if (role === 'student') {
        await conn.query(
          'INSERT INTO students (user_id, admission_number, class_id, parent_id, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, admission_number, class_id, parent_id || null, date_of_birth || null, gender || null]
        );
      }

      await conn.commit();
      res.status(201).json({ message: 'User created successfully.', id: userId });
    } catch (err2) {
      await conn.rollback();
      throw err2;
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Duplicate entry. Staff ID or admission number already exists.' });
    }
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, full_name, email, role, phone, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';

    const [users] = await pool.query(query, params);
    res.json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query('SELECT is_active FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newStatus = users[0].is_active ? 0 : 1;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

    res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    console.error('Toggle user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const [classes] = await pool.query(
      `SELECT c.id, c.class_name, c.section, c.academic_year, c.is_active,
              COUNT(s.id) AS student_count
       FROM classes c
       LEFT JOIN students s ON c.id = s.class_id
       GROUP BY c.id
       ORDER BY c.academic_year DESC, c.class_name`
    );
    res.json({ classes });
  } catch (err) {
    console.error('Get classes error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { class_name, section, academic_year } = req.body;
    if (!class_name || !academic_year) {
      return res.status(400).json({ error: 'Class name and academic year are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO classes (class_name, section, academic_year) VALUES (?, ?, ?)',
      [class_name, section || null, academic_year]
    );
    res.status(201).json({ message: 'Class created successfully.', id: result.insertId });
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const [subjects] = await pool.query(
      `SELECT s.id, s.subject_name, s.subject_code, s.class_id, c.class_name,
              s.teacher_id, u.full_name AS teacher_name
       FROM subjects s
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       ORDER BY c.class_name, s.subject_name`
    );
    res.json({ subjects });
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { subject_name, subject_code, class_id, teacher_id } = req.body;
    if (!subject_name || !subject_code || !class_id) {
      return res.status(400).json({ error: 'Subject name, code, and class are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO subjects (subject_name, subject_code, class_id, teacher_id) VALUES (?, ?, ?, ?)',
      [subject_name, subject_code, class_id, teacher_id || null]
    );
    res.status(201).json({ message: 'Subject created successfully.', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Subject code already exists.' });
    }
    console.error('Create subject error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Subject not found.' });
    }
    const [results] = await pool.query('SELECT id FROM results WHERE subject_id = ? LIMIT 1', [id]);
    if (results.length > 0) {
      return res.status(409).json({ error: 'Cannot delete subject with existing results. Remove the results first.' });
    }
    await pool.query('DELETE FROM subjects WHERE id = ?', [id]);
    res.json({ message: 'Subject deleted successfully.' });
  } catch (err) {
    console.error('Delete subject error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.assignTeacher = async (req, res) => {
  try {
    const { subject_id, teacher_id } = req.body;
    if (!subject_id || !teacher_id) {
      return res.status(400).json({ error: 'Subject ID and Teacher ID are required.' });
    }
    await pool.query('UPDATE subjects SET teacher_id = ? WHERE id = ?', [teacher_id, subject_id]);
    res.json({ message: 'Teacher assigned successfully.' });
  } catch (err) {
    console.error('Assign teacher error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getTerms = async (req, res) => {
  try {
    const [terms] = await pool.query('SELECT id, term_name, is_current FROM terms ORDER BY id');
    res.json({ terms });
  } catch (err) {
    console.error('Get terms error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.setCurrentTerm = async (req, res) => {
  try {
    const { term_id } = req.body;
    if (!term_id) {
      return res.status(400).json({ error: 'Term ID is required.' });
    }
    await pool.query('UPDATE terms SET is_current = 0');
    await pool.query('UPDATE terms SET is_current = 1 WHERE id = ?', [term_id]);
    res.json({ message: 'Current term updated successfully.' });
  } catch (err) {
    console.error('Set term error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const [sessions] = await pool.query('SELECT id, session_name, is_current FROM sessions ORDER BY id DESC');
    res.json({ sessions });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.setCurrentSession = async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }
    await pool.query('UPDATE sessions SET is_current = 0');
    await pool.query('UPDATE sessions SET is_current = 1 WHERE id = ?', [session_id]);
    res.json({ message: 'Current session updated successfully.' });
  } catch (err) {
    console.error('Set session error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAuditLog = async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT l.id, l.action, l.ip_address, l.created_at,
              r.student_id, r.subject_id,
              u_teacher.full_name AS teacher_name,
              u_student.full_name AS student_name,
              sub.subject_name
       FROM result_audit_log l
       JOIN results r ON l.result_id = r.id
       JOIN teachers t ON l.teacher_id = t.id
       JOIN users u_teacher ON t.user_id = u_teacher.id
       JOIN students s ON r.student_id = s.id
       JOIN users u_student ON s.user_id = u_student.id
       JOIN subjects sub ON r.subject_id = sub.id
       ORDER BY l.created_at DESC
       LIMIT 100`
    );
    res.json({ logs });
  } catch (err) {
    console.error('Get audit log error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.promoteStudents = async (req, res) => {
  try {
    const { from_class_id, to_class_id, student_ids } = req.body;
    if (!from_class_id || !to_class_id || !student_ids || !Array.isArray(student_ids)) {
      return res.status(400).json({ error: 'from_class_id, to_class_id, and student_ids array are required.' });
    }

    const [toClass] = await pool.query('SELECT id FROM classes WHERE id = ?', [to_class_id]);
    if (toClass.length === 0) {
      return res.status(404).json({ error: 'Target class not found.' });
    }

    for (const id of student_ids) {
      await pool.query('UPDATE students SET class_id = ? WHERE id = ? AND class_id = ?', [to_class_id, id, from_class_id]);
    }

    res.json({ message: `${student_ids.length} students promoted successfully.` });
  } catch (err) {
    console.error('Promote students error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, staff_id, department, qualification } = req.body;

    const [teachers] = await pool.query(
      'SELECT t.user_id FROM teachers t WHERE t.id = ?', [id]
    );
    if (teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    const userId = teachers[0].user_id;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (full_name || email || phone) {
        const updates = [];
        const params = [];
        if (full_name) { updates.push('full_name = ?'); params.push(full_name); }
        if (email) { updates.push('email = ?'); params.push(email); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (updates.length > 0) {
          params.push(userId);
          await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        }
      }

      const tUpdates = [];
      const tParams = [];
      if (staff_id !== undefined) { tUpdates.push('staff_id = ?'); tParams.push(staff_id); }
      if (department !== undefined) { tUpdates.push('department = ?'); tParams.push(department); }
      if (qualification !== undefined) { tUpdates.push('qualification = ?'); tParams.push(qualification); }
      if (tUpdates.length > 0) {
        tParams.push(id);
        await conn.query(`UPDATE teachers SET ${tUpdates.join(', ')} WHERE id = ?`, tParams);
      }

      await conn.commit();
      res.json({ message: 'Teacher updated successfully.' });
    } catch (err2) {
      await conn.rollback();
      throw err2;
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Staff ID already exists.' });
    }
    console.error('Update teacher error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const [teachers] = await pool.query(
      'SELECT t.user_id FROM teachers t WHERE t.id = ?', [id]
    );
    if (teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    const userId = teachers[0].user_id;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query('UPDATE subjects SET teacher_id = NULL WHERE teacher_id = ?', [id]);

      await conn.query('DELETE FROM teachers WHERE id = ?', [id]);

      await conn.query('DELETE FROM users WHERE id = ?', [userId]);

      await conn.commit();
      res.json({ message: 'Teacher deleted successfully.' });
    } catch (err2) {
      await conn.rollback();
      throw err2;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Delete teacher error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_name, subject_code, class_id, teacher_id } = req.body;

    const [existing] = await pool.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    const updates = [];
    const params = [];
    if (subject_name) { updates.push('subject_name = ?'); params.push(subject_name); }
    if (subject_code) { updates.push('subject_code = ?'); params.push(subject_code); }
    if (class_id) { updates.push('class_id = ?'); params.push(class_id); }
    if (teacher_id !== undefined) { updates.push('teacher_id = ?'); params.push(teacher_id || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    params.push(id);
    await pool.query(`UPDATE subjects SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Subject updated successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Subject code already exists.' });
    }
    console.error('Update subject error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const [teachers] = await pool.query(
      `SELECT t.id, t.staff_id, t.department, t.qualification,
              u.id AS user_id, u.full_name, u.email, u.phone
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       ORDER BY u.full_name`
    );
    res.json({ teachers });
  } catch (err) {
    console.error('Get teachers error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT s.id, s.admission_number, s.class_id, c.class_name,
              u.id AS user_id, u.full_name, u.email, u.phone
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       ORDER BY u.full_name`
    );
    res.json({ students });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { session_name } = req.body;
    if (!session_name) {
      return res.status(400).json({ error: 'Session name is required.' });
    }
    const [result] = await pool.query('INSERT INTO sessions (session_name) VALUES (?)', [session_name]);
    res.status(201).json({ message: 'Session created successfully.', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Session already exists.' });
    }
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createTerm = async (req, res) => {
  try {
    const { term_name } = req.body;
    if (!term_name) {
      return res.status(400).json({ error: 'Term name is required.' });
    }
    const [result] = await pool.query('INSERT INTO terms (term_name) VALUES (?)', [term_name]);
    res.status(201).json({ message: 'Term created successfully.', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Term already exists.' });
    }
    console.error('Create term error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
