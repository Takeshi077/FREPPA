-- FREPPA GROUP OF SCHOOLS Database Schema
-- MySQL 8.x

CREATE DATABASE IF NOT EXISTS freppa_school;
USE freppa_school;

-- =============================================
-- 1. USERS TABLE (base for all roles)
-- =============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'teacher', 'student', 'parent') NOT NULL DEFAULT 'student',
    phone VARCHAR(20),
    address TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. CLASSES TABLE
-- =============================================
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(50),
    academic_year VARCHAR(20) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. STUDENTS TABLE
-- =============================================
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    admission_number VARCHAR(30) UNIQUE NOT NULL,
    class_id INT NOT NULL,
    parent_id INT,
    date_of_birth DATE,
    gender ENUM('male', 'female'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. TEACHERS TABLE
-- =============================================
CREATE TABLE teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    staff_id VARCHAR(30) UNIQUE NOT NULL,
    department VARCHAR(100),
    qualification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. SUBJECTS TABLE
-- =============================================
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL,
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    class_id INT NOT NULL,
    teacher_id INT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. SESSIONS TABLE
-- =============================================
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_name VARCHAR(20) UNIQUE NOT NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 7. TERMS TABLE
-- =============================================
CREATE TABLE terms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    term_name VARCHAR(20) UNIQUE NOT NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 8. RESULTS TABLE
-- =============================================
CREATE TABLE results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    term_id INT NOT NULL,
    session_id INT NOT NULL,
    test1 DECIMAL(5,2) DEFAULT 0.00,
    test2 DECIMAL(5,2) DEFAULT 0.00,
    test3 DECIMAL(5,2) DEFAULT 0.00,
    ca_score DECIMAL(5,2) DEFAULT 0.00,
    exam_score DECIMAL(5,2) DEFAULT 0.00,
    total_score DECIMAL(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
    grade CHAR(2),
    remarks TEXT,
    updated_by_teacher_id INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_result (student_id, subject_id, term_id, session_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by_teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 9. RESULT DOMAINS TABLE (affective & psychomotor)
-- =============================================
CREATE TABLE result_domains (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 10. REPORT CARDS TABLE
-- =============================================
CREATE TABLE report_cards (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 11. ATTENDANCE TABLE
-- =============================================
CREATE TABLE attendance (
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
    FOREIGN KEY (recorded_by) REFERENCES teachers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 9. RESULT AUDIT LOG
-- =============================================
CREATE TABLE result_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    result_id INT NOT NULL,
    teacher_id INT NOT NULL,
    action ENUM('created', 'updated', 'deleted') NOT NULL,
    old_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 10. CONTACT INQUIRIES TABLE
-- =============================================
CREATE TABLE contact_inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_results_student ON results(student_id);
CREATE INDEX idx_results_term_session ON results(term_id, session_id);
CREATE INDEX idx_subjects_class ON subjects(class_id);
CREATE INDEX idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_parent ON students(parent_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_attendance_class_term ON attendance(class_id, term_id, session_id);
CREATE INDEX idx_report_cards_student ON report_cards(student_id, term_id, session_id);
