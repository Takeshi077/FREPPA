const pool = require('./db');

const statements = [
  `CREATE TABLE IF NOT EXISTS result_domains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    term_id INT NOT NULL,
    session_id INT NOT NULL,
    punctuality CHAR(1) DEFAULT NULL,
    attentiveness CHAR(1) DEFAULT NULL,
    neatness CHAR(1) DEFAULT NULL,
    honesty CHAR(1) DEFAULT NULL,
    politeness CHAR(1) DEFAULT NULL,
    self_control CHAR(1) DEFAULT NULL,
    handwriting CHAR(1) DEFAULT NULL,
    sports CHAR(1) DEFAULT NULL,
    drawing CHAR(1) DEFAULT NULL,
    verbal_fluency CHAR(1) DEFAULT NULL,
    craft_skills CHAR(1) DEFAULT NULL,
    thinking_ability CHAR(1) DEFAULT NULL,
    social_skills CHAR(1) DEFAULT NULL,
    UNIQUE KEY unique_domain (student_id, term_id, session_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS report_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    term_id INT NOT NULL,
    session_id INT NOT NULL,
    grand_total DECIMAL(6,2) DEFAULT NULL,
    subject_count INT DEFAULT 0,
    average DECIMAL(5,2) DEFAULT NULL,
    class_position INT DEFAULT NULL,
    total_students INT DEFAULT NULL,
    teacher_remark TEXT DEFAULT NULL,
    principal_remark TEXT DEFAULT NULL,
    next_term_begins DATE DEFAULT NULL,
    times_present INT DEFAULT 0,
    times_absent INT DEFAULT 0,
    is_finalized TINYINT(1) DEFAULT 0,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY unique_report (student_id, term_id, session_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    term_id INT NOT NULL,
    session_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'excused') NOT NULL DEFAULT 'present',
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attendance (student_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES teachers(id) ON DELETE RESTRICT,
    INDEX idx_attendance_student_date (student_id, date),
    INDEX idx_attendance_class_term (class_id, term_id, session_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE INDEX idx_report_cards_student ON report_cards(student_id, term_id, session_id)`
];

async function ensureSchema() {
  for (let i = 0; i < statements.length; i++) {
    try {
      await pool.query(statements[i]);
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') continue;
      throw err;
    }
  }
  console.log('✓ Report card tables ready');
}

module.exports = ensureSchema;
