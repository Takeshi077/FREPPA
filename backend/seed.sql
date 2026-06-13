-- FREPPA GROUP OF SCHOOLS Sample Data
-- Password for all demo users: password123
-- bcrypt hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

USE freppa_school;

-- =============================================
-- TERMS
-- =============================================
INSERT INTO terms (term_name, is_current) VALUES
('First Term', 1),
('Second Term', 0),
('Third Term', 0);

-- =============================================
-- SESSIONS
-- =============================================
INSERT INTO sessions (session_name, is_current) VALUES
('2024/2025', 0),
('2025/2026', 1);

-- =============================================
-- USERS (password: password123 for all)
-- =============================================
INSERT INTO users (full_name, email, password_hash, role, phone) VALUES
('Admin User', 'admin@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', '08012345678'),
('Mr. Orunkoya Fredrick', 'fredrick.orunkoya@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '08012345679'),
('Mrs. Precious Orunkoya', 'precious.orunkoya@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '08012345680'),
('Miss Emily Brown', 'emily.brown@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '08012345681'),
('Mrs. Grace Lee', 'grace.lee@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '08012345682'),
('Dr. Samuel Adeyemi', 'samuel.adeyemi@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '08012345683'),
('Student One', 'student1@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', NULL),
('Student Two', 'student2@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', NULL),
('Student Three', 'student3@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', NULL),
('Student Four', 'student4@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', NULL),
('Parent One', 'parent1@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'parent', '08012345690'),
('Parent Two', 'parent2@freppa.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'parent', '08012345691');

-- =============================================
-- CLASSES
-- =============================================
INSERT INTO classes (class_name, section, academic_year) VALUES
('JSS 1', 'Junior Secondary', '2025/2026'),
('JSS 2', 'Junior Secondary', '2025/2026'),
('JSS 3', 'Junior Secondary', '2025/2026'),
('SSS 1', 'Senior Secondary', '2025/2026'),
('SSS 2', 'Senior Secondary', '2025/2026'),
('SSS 3', 'Senior Secondary', '2025/2026');

-- =============================================
-- TEACHERS
-- =============================================
INSERT INTO teachers (user_id, staff_id, department) VALUES
(2, 'FRP/TCH/001', 'Proprietor'),
(3, 'FRP/TCH/002', 'Proprietress'),
(4, 'FRP/TCH/003', 'English Department'),
(5, 'FRP/TCH/004', 'Mathematics Department'),
(6, 'FRP/TCH/005', 'Science Department');

-- =============================================
-- SUBJECTS
-- =============================================
INSERT INTO subjects (subject_name, subject_code, class_id, teacher_id) VALUES
('English Language', 'ENG101', 1, 3),
('Mathematics', 'MTH101', 1, 4),
('Basic Science', 'SCI101', 1, 5),
('English Language', 'ENG102', 2, 3),
('Mathematics', 'MTH102', 2, 4),
('Basic Science', 'SCI102', 2, 5),
('English Language', 'ENG201', 4, 3),
('Mathematics', 'MTH201', 4, 4),
('Physics', 'PHY201', 4, 5),
('Chemistry', 'CHM201', 4, 5);

-- =============================================
-- STUDENTS
-- =============================================
INSERT INTO students (user_id, admission_number, class_id, parent_id, date_of_birth, gender) VALUES
(7, 'FRP/2025/001', 1, 11, '2010-05-15', 'male'),
(8, 'FRP/2025/002', 1, 11, '2011-02-20', 'female'),
(9, 'FRP/2025/003', 2, 12, '2009-08-10', 'male'),
(10, 'FRP/2025/004', 4, 12, '2007-11-25', 'female');

-- =============================================
-- SAMPLE RESULTS (First Term, 2025/2026)
-- =============================================
INSERT INTO results (student_id, subject_id, term_id, session_id, test1, test2, test3, ca_score, exam_score, grade, remarks, updated_by_teacher_id)
VALUES
-- Student 1 (JSS 1) - English
(1, 1, 1, 2, 12.00, 12.00, 11.00, 35.00, 52.00, 'B', 'Good performance, keep it up', 3),
-- Student 1 (JSS 1) - Mathematics
(1, 2, 1, 2, 10.00, 10.00, 10.00, 30.00, 45.00, 'C', 'Needs improvement in algebra', 4),
-- Student 1 (JSS 1) - Basic Science
(1, 3, 1, 2, 13.00, 13.00, 12.00, 38.00, 55.00, 'B', 'Excellent in practicals', 5),
-- Student 2 (JSS 1) - English
(2, 1, 1, 2, 11.00, 11.00, 10.00, 32.00, 48.00, 'C', 'Good effort', 3),
-- Student 2 (JSS 1) - Mathematics
(2, 2, 1, 2, 9.00, 9.00, 10.00, 28.00, 40.00, 'D', 'Needs more practice', 4),
-- Student 2 (JSS 1) - Basic Science
(2, 3, 1, 2, 12.00, 12.00, 12.00, 36.00, 50.00, 'B', 'Very good', 5),
-- Student 3 (JSS 2) - English
(3, 4, 1, 2, 12.00, 11.00, 11.00, 34.00, 50.00, 'B', 'Good comprehension skills', 3),
-- Student 3 (JSS 2) - Mathematics
(3, 5, 1, 2, 8.00, 8.00, 9.00, 25.00, 35.00, 'D', 'Needs improvement', 4),
-- Student 3 (JSS 2) - Basic Science
(3, 6, 1, 2, 10.00, 10.00, 10.00, 30.00, 42.00, 'C', 'Satisfactory', 5),
-- Student 4 (SSS 1) - English
(4, 7, 1, 2, 12.00, 12.00, 12.00, 36.00, 55.00, 'B', 'Very good essays', 3),
-- Student 4 (SSS 1) - Mathematics
(4, 8, 1, 2, 11.00, 11.00, 10.00, 32.00, 48.00, 'C', 'Fair performance', 4),
-- Student 4 (SSS 1) - Physics
(4, 9, 1, 2, 9.00, 9.00, 10.00, 28.00, 40.00, 'D', 'Needs to study more', 5),
-- Student 4 (SSS 1) - Chemistry
(4, 10, 1, 2, 12.00, 11.00, 11.00, 34.00, 50.00, 'B', 'Good lab work', 5);

-- =============================================
-- SAMPLE DOMAIN SCORES (First Term, 2025/2026)
-- =============================================
INSERT INTO result_domains (student_id, term_id, session_id, punctuality, attentiveness, neatness, honesty, politeness, self_control, handwriting, sports, drawing, verbal_fluency, craft_skills, thinking_ability, social_skills)
VALUES
(1, 1, 2, 'A', 'B', 'A', 'A', 'B', 'B', 'B', 'A', 'B', 'B', 'B', 'B', 'A'),
(2, 1, 2, 'B', 'A', 'C', 'A', 'B', 'B', 'A', 'B', 'A', 'B', 'B', 'A', 'A'),
(3, 1, 2, 'B', 'B', 'B', 'B', 'B', 'C', 'C', 'B', 'B', 'B', 'C', 'B', 'B'),
(4, 1, 2, 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'A', 'B', 'A', 'A');

-- =============================================
-- SAMPLE REPORT CARDS (First Term, 2025/2026)
-- =============================================
INSERT INTO report_cards (student_id, term_id, session_id, grand_total, subject_count, average, class_position, total_students, teacher_remark, principal_remark, next_term_begins, times_present, times_absent, is_finalized, finalized_at)
VALUES
(1, 1, 2, 220.00, 3, 73.33, 1, 2, 'Excellent performance. Keep up the good work.', 'Very proud of your achievements this term.', '2025-09-15', 86, 2, 1, NOW()),
(2, 1, 2, 198.00, 3, 66.00, 2, 2, 'Good effort this term. Focus more on mathematics.', 'You have shown improvement. Keep striving.', '2025-09-15', 84, 4, 1, NOW()),
(3, 1, 2, 201.00, 3, 67.00, 1, 1, 'Satisfactory performance. Needs to work on mathematics.', 'Keep working hard.', '2025-09-15', 83, 5, 1, NOW()),
(4, 1, 2, 283.00, 4, 70.75, 1, 1, 'Very good term overall. Physics needs more attention.', 'Well done. Keep it up.', '2025-09-15', 85, 3, 1, NOW());
