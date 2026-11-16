const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { recordFailedLogin, clearLoginAttempts } = require('../middleware/rateLimit');
const { validatePassword } = require('../utils/password');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [users] = await pool.query(
      'SELECT id, full_name, email, password_hash, role, phone FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (users.length === 0) {
      recordFailedLogin(req);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      recordFailedLogin(req);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    clearLoginAttempts(req);

    const tokenPayload = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.verify = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, full_name, email, role, phone FROM users WHERE id = ? AND is_active = 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];

    let extra = {};
    if (user.role === 'teacher') {
      const [teachers] = await pool.query('SELECT id, staff_id, department FROM teachers WHERE user_id = ?', [user.id]);
      if (teachers.length > 0) {
        extra.staff_id = teachers[0].staff_id;
        extra.department = teachers[0].department;
        extra.teacher_id = teachers[0].id;
      }
    } else if (user.role === 'student') {
      const [students] = await pool.query(
        `SELECT s.id, s.admission_number, s.class_id, c.class_name, c.section
         FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE s.user_id = ?`,
        [user.id]
      );
      if (students.length > 0) {
        extra.student_id = students[0].id;
        extra.admission_number = students[0].admission_number;
        extra.class_name = students[0].class_name;
        extra.section = students[0].section;
      }
    } else if (user.role === 'parent') {
      const [students] = await pool.query(
        `SELECT s.id, s.admission_number, u.full_name AS student_name, c.class_name
         FROM students s
         JOIN users u ON s.user_id = u.id
         JOIN classes c ON s.class_id = c.id
         WHERE s.parent_id = ?`,
        [user.id]
      );
      extra.children = students;
    }

    res.json({ user: { ...user, ...extra } });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const validationError = validatePassword(new_password);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (current_password === new_password) {
      return res.status(400).json({ error: 'New password must be different from the current password.' });
    }

    const [users] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ? AND is_active = 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
