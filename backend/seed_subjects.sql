-- =============================================
-- FULL SUBJECT LIST (all 6 secondary classes)
-- =============================================
-- Safe to run more than once. subjects.subject_code is UNIQUE, so
-- INSERT IGNORE skips anything that already exists and never duplicates
-- or overwrites your current rows.
--
--   mysql -u root -p freppa_school < backend/seed_subjects.sql
--
-- Class ids and teacher ids are resolved by name, not hardcoded, so this
-- works no matter what order your classes were created in.
--
-- 'NONE' in the staff column means no teacher is assigned yet. Assign one
-- later from the admin dashboard (Subjects -> Assign Teacher).
-- =============================================

INSERT IGNORE INTO subjects (subject_name, subject_code, class_id, teacher_id)
SELECT t.subject_name, t.subject_code, c.id, tr.id
FROM (
  -- ---------- JSS 1 ----------
  SELECT 'English Language' AS subject_name, 'ENG101' AS subject_code, 'JSS 1' AS class_name, 'FRP/TCH/003' AS staff_id
  UNION ALL SELECT 'Mathematics',              'MTH101', 'JSS 1', 'FRP/TCH/004'
  UNION ALL SELECT 'Basic Science',            'SCI101', 'JSS 1', 'FRP/TCH/005'
  UNION ALL SELECT 'Civic Education',          'CIV101', 'JSS 1', 'NONE'
  UNION ALL SELECT 'Computer Studies',         'ICT101', 'JSS 1', 'NONE'
  UNION ALL SELECT 'Arts & Culture',           'ART101', 'JSS 1', 'NONE'
  UNION ALL SELECT 'Religious Studies',        'REL101', 'JSS 1', 'NONE'
  UNION ALL SELECT 'French',                   'FRE101', 'JSS 1', 'NONE'

  -- ---------- JSS 2 ----------
  UNION ALL SELECT 'English Language',         'ENG102', 'JSS 2', 'FRP/TCH/003'
  UNION ALL SELECT 'Mathematics',              'MTH102', 'JSS 2', 'FRP/TCH/004'
  UNION ALL SELECT 'Basic Science',            'SCI102', 'JSS 2', 'FRP/TCH/005'
  UNION ALL SELECT 'Civic Education',          'CIV102', 'JSS 2', 'NONE'
  UNION ALL SELECT 'Computer Studies',         'ICT102', 'JSS 2', 'NONE'
  UNION ALL SELECT 'Arts & Culture',           'ART102', 'JSS 2', 'NONE'
  UNION ALL SELECT 'Religious Studies',        'REL102', 'JSS 2', 'NONE'
  UNION ALL SELECT 'French',                   'FRE102', 'JSS 2', 'NONE'

  -- ---------- JSS 3 ----------
  UNION ALL SELECT 'English Language',         'ENG103', 'JSS 3', 'FRP/TCH/003'
  UNION ALL SELECT 'Mathematics',              'MTH103', 'JSS 3', 'FRP/TCH/004'
  UNION ALL SELECT 'Basic Science',            'SCI103', 'JSS 3', 'FRP/TCH/005'
  UNION ALL SELECT 'Civic Education',          'CIV103', 'JSS 3', 'NONE'
  UNION ALL SELECT 'Computer Studies',         'ICT103', 'JSS 3', 'NONE'
  UNION ALL SELECT 'Arts & Culture',           'ART103', 'JSS 3', 'NONE'
  UNION ALL SELECT 'Religious Studies',        'REL103', 'JSS 3', 'NONE'
  UNION ALL SELECT 'French',                   'FRE103', 'JSS 3', 'NONE'

  -- ---------- SSS 1 ----------
  UNION ALL SELECT 'English Language',         'ENG201', 'SSS 1', 'FRP/TCH/003'
  UNION ALL SELECT 'Mathematics',              'MTH201', 'SSS 1', 'FRP/TCH/004'
  UNION ALL SELECT 'Physics',                  'PHY201', 'SSS 1', 'FRP/TCH/005'
  UNION ALL SELECT 'Chemistry',                'CHM201', 'SSS 1', 'FRP/TCH/005'
  UNION ALL SELECT 'Biology',                  'BIO201', 'SSS 1', 'FRP/TCH/005'
  UNION ALL SELECT 'Computer Studies',         'ICT201', 'SSS 1', 'NONE'
  UNION ALL SELECT 'Civic Education',          'CIV201', 'SSS 1', 'NONE'
  UNION ALL SELECT 'Literature-in-English',    'LIT201', 'SSS 1', 'FRP/TCH/003'
  UNION ALL SELECT 'Government',               'GOV201', 'SSS 1', 'NONE'
  UNION ALL SELECT 'Economics',                'ECO201', 'SSS 1', 'NONE'

  -- ---------- SSS 2 ----------
  UNION ALL SELECT 'English Language',         'ENG202', 'SSS 2', 'FRP/TCH/003'
  UNION ALL SELECT 'Mathematics',              'MTH202', 'SSS 2', 'FRP/TCH/004'
  UNION ALL SELECT 'Physics',                  'PHY202', 'SSS 2', 'FRP/TCH/005'
  UNION ALL SELECT 'Chemistry',                'CHM202', 'SSS 2', 'FRP/TCH/005'
  UNION ALL SELECT 'Biology',                  'BIO202', 'SSS 2', 'FRP/TCH/005'
  UNION ALL SELECT 'Computer Studies',         'ICT202', 'SSS 2', 'NONE'
  UNION ALL SELECT 'Civic Education',          'CIV202', 'SSS 2', 'NONE'
  UNION ALL SELECT 'Literature-in-English',    'LIT202', 'SSS 2', 'FRP/TCH/003'
  UNION ALL SELECT 'Government',               'GOV202', 'SSS 2', 'NONE'
  UNION ALL SELECT 'Economics',                'ECO202', 'SSS 2', 'NONE'

  -- ---------- SSS 3 ----------
  UNION ALL SELECT 'English Language',         'ENG203', 'SSS 3', 'FRP/TCH/003'
  UNION ALL SELECT 'Mathematics',              'MTH203', 'SSS 3', 'FRP/TCH/004'
  UNION ALL SELECT 'Physics',                  'PHY203', 'SSS 3', 'FRP/TCH/005'
  UNION ALL SELECT 'Chemistry',                'CHM203', 'SSS 3', 'FRP/TCH/005'
  UNION ALL SELECT 'Biology',                  'BIO203', 'SSS 3', 'FRP/TCH/005'
  UNION ALL SELECT 'Computer Studies',         'ICT203', 'SSS 3', 'NONE'
  UNION ALL SELECT 'Civic Education',          'CIV203', 'SSS 3', 'NONE'
  UNION ALL SELECT 'Literature-in-English',    'LIT203', 'SSS 3', 'FRP/TCH/003'
  UNION ALL SELECT 'Government',               'GOV203', 'SSS 3', 'NONE'
  UNION ALL SELECT 'Economics',                'ECO203', 'SSS 3', 'NONE'
) t
JOIN classes c ON c.class_name = t.class_name
LEFT JOIN teachers tr ON tr.staff_id = t.staff_id;
