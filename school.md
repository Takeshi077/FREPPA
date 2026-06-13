# FREPPA Group of Schools — Report Card System Design

> A complete design for handling students' test & exam records and generating professional report cards, built on the existing FREPPA School Management Portal.

---

## 1. Current System Overview

FREPPA already has:

- **10 MySQL tables**: `users`, `students`, `teachers`, `classes`, `subjects`, `sessions`, `terms`, `results`, `result_audit_log`, `contact_inquiries`
- **Role-based dashboards**: Admin, Teacher, Student, Parent (static HTML + JS)
- **Backend API**: Node.js/Express with JWT auth, raw SQL via `mysql2/promise`
- **Result management**: Teachers enter test1/test2/test3 (each /10) + exam (/70); total, grade (A–F), and CA are computed automatically
- **Bulk upload**: Excel/CSV import for results
- **Audit trail**: Every grade change logged with teacher, IP, old/new data
- **Student promotion**: Admin promotes students to next class

### Grading Scale (already implemented)

| Grade | Score Range | Meaning |
|-------|-------------|---------|
| A     | 70–100      | Excellent |
| B     | 60–69       | Very Good |
| C     | 50–59       | Good |
| D     | 45–49       | Fair |
| E     | 40–44       | Pass |
| F     | Below 40    | Fail |

**Formula:** `CA = test1 + test2 + test3 (max 30) + Exam (max 70) = Total (max 100)`

### What's Missing (Gaps)

- No report card generation (PDF or otherwise)
- No psychomotor/affective domain tracking
- No student ranking/position calculation
- No teacher/principal remarks storage
- No attendance tracking per student per term
- Schema.sql is out of sync (missing `test1`, `test2`, `test3` columns that the app code uses)

---

## 2. Database Schema Changes

### 2.1 Fix `results` Table

Add the missing columns that the application code already expects:

```sql
ALTER TABLE results
  ADD COLUMN test1 DECIMAL(5,2) DEFAULT 0.00 AFTER session_id,
  ADD COLUMN test2 DECIMAL(5,2) DEFAULT 0.00 AFTER test1,
  ADD COLUMN test3 DECIMAL(5,2) DEFAULT 0.00 AFTER test2;
```

Updated schema.sql for `results`:

```sql
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
    grade CHAR(2) DEFAULT NULL,
    remarks TEXT DEFAULT NULL,
    updated_by_teacher_id INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_result (student_id, subject_id, term_id, session_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by_teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 New Table: `result_domains` — Affective & Psychomotor

Tracks non-academic domains rated A–E per student per term per session.

```sql
CREATE TABLE result_domains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    term_id INT NOT NULL,
    session_id INT NOT NULL,

    -- Affective Domain (A = Excellent ... E = Poor)
    punctuality CHAR(1) DEFAULT NULL,
    attentiveness CHAR(1) DEFAULT NULL,
    neatness CHAR(1) DEFAULT NULL,
    honesty CHAR(1) DEFAULT NULL,
    politeness CHAR(1) DEFAULT NULL,
    self_control CHAR(1) DEFAULT NULL,

    -- Psychomotor Domain
    handwriting CHAR(1) DEFAULT NULL,
    sports CHAR(1) DEFAULT NULL,
    drawing CHAR(1) DEFAULT NULL,
    verbal_fluency CHAR(1) DEFAULT NULL,
    craft_skills CHAR(1) DEFAULT NULL,

    -- Cognitive Skills
    thinking_ability CHAR(1) DEFAULT NULL,
    social_skills CHAR(1) DEFAULT NULL,

    UNIQUE KEY unique_domain (student_id, term_id, session_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.3 New Table: `report_cards` — Generated Report Metadata

Stores computed data and remarks for finalized report cards.

```sql
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
```

### 2.4 New Table: `attendance` — Daily Attendance Tracking

```sql
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    term_id INT NOT NULL,
    session_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'excused') NOT NULL DEFAULT 'present',
    recorded_by INT NOT NULL,  -- teacher_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attendance (student_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES teachers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Backend API — New Endpoints

### 3.1 Teacher Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| **POST** | `/api/teacher/result/domains` | Save affective & psychomotor scores for a student |
| **GET** | `/api/teacher/result/domains?student_id=&term_id=&session_id=` | Get domain scores |
| **POST** | `/api/teacher/attendance/save` | Save daily attendance (batch per class) |
| **GET** | `/api/teacher/attendance?class_id=&date=&term_id=&session_id=` | Get attendance for a class on a date |

### 3.2 Report Card Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/api/student/report-card?term_id=&session_id=` | Get full report card data as JSON (includes results, domains, position, remarks) |
| **GET** | `/api/student/report-card/pdf?term_id=&session_id=` | Download report card as PDF |
| **GET** | `/api/student/report-card/history` | List all available report cards (past terms/sessions) |

### 3.3 Admin Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/api/admin/class/positions?class_id=&term_id=&session_id=` | Compute and return class ranking |
| **POST** | `/api/admin/report-cards/finalize` | Finalize report cards for a class/term/session |
| **GET** | `/api/admin/report-cards?class_id=&term_id=&session_id=` | List all report cards for a class |
| **POST** | `/api/admin/report-cards/regenerate` | Regenerate report card data for a student |
| **GET** | `/api/admin/attendance/summary?class_id=&term_id=&session_id=` | Attendance summary per student |
| **POST** | `/api/admin/attendance/export` | Export attendance as Excel/CSV |

---

## 4. Core Logic — Position & Ranking

Students are ranked within their **class** by **grand total** (sum of total_score across all subjects) for a given term and session.

### SQL for class positions

```sql
SELECT
    s.id AS student_id,
    u.full_name,
    s.admission_number,
    ROUND(SUM(r.total_score), 2) AS grand_total,
    COUNT(r.subject_id) AS subjects_taken,
    ROUND(AVG(r.total_score), 2) AS average,
    RANK() OVER (ORDER BY SUM(r.total_score) DESC) AS position
FROM results r
JOIN students s ON r.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE s.class_id = ? AND r.term_id = ? AND r.session_id = ?
GROUP BY s.id, u.full_name, s.admission_number
ORDER BY grand_total DESC;
```

### Controller logic (JavaScript)

```javascript
async function getReportCard(req, res) {
  const { student_id, term_id, session_id } = req.query;

  // 1. Fetch all results for the student
  const [results] = await db.query(`
    SELECT sub.subject_name, sub.subject_code,
           r.test1, r.test2, r.test3, r.ca_score, r.exam_score,
           r.total_score, r.grade, r.remarks
    FROM results r
    JOIN subjects sub ON r.subject_id = sub.id
    WHERE r.student_id = ? AND r.term_id = ? AND r.session_id = ?
    ORDER BY sub.subject_name
  `, [student_id, term_id, session_id]);

  // 2. Fetch domain scores
  const [domains] = await db.query(`
    SELECT * FROM result_domains
    WHERE student_id = ? AND term_id = ? AND session_id = ?
  `, [student_id, term_id, session_id]);

  // 3. Compute position within class
  const [student] = await db.query(
    `SELECT class_id FROM students WHERE id = ?`, [student_id]
  );
  const [rankings] = await db.query(`
    SELECT id, RANK() OVER (ORDER BY grand_total DESC) AS position
    FROM (
      SELECT s.id, SUM(r.total_score) AS grand_total
      FROM results r
      JOIN students s ON r.student_id = s.id
      WHERE s.class_id = ? AND r.term_id = ? AND r.session_id = ?
      GROUP BY s.id
    ) ranked
    WHERE id = ?
  `, [student[0].class_id, term_id, session_id, student_id]);

  const total_students = await db.query(`
    SELECT COUNT(DISTINCT s.id) AS count
    FROM results r
    JOIN students s ON r.student_id = s.id
    WHERE s.class_id = ? AND r.term_id = ? AND r.session_id = ?
  `, [student[0].class_id, term_id, session_id]);

  // 4. Calculate summary
  const grandTotal = results.reduce((sum, r) => sum + parseFloat(r.total_score || 0), 0);
  const average = results.length > 0 ? (grandTotal / results.length) : 0;

  // 5. Fetch existing report card data (remarks, next_term, attendance)
  const [report] = await db.query(`
    SELECT * FROM report_cards
    WHERE student_id = ? AND term_id = ? AND session_id = ?
  `, [student_id, term_id, session_id]);

  res.json({
    results,
    domains: domains[0] || null,
    summary: {
      grand_total: grandTotal.toFixed(2),
      subject_count: results.length,
      average: average.toFixed(2),
      position: rankings[0]?.position || null,
      total_students: total_students[0]?.count || 0,
    },
    report_meta: report || null,
  });
}
```

---

## 5. Report Card Layout

The report card is a professional printed document with this structure:

```
┌──────────────────────────────────────────────────────────────────┐
│                     FREPPA GROUP OF SCHOOLS                       │
│          [School Address, Phone, Email, Website]                  │
│                          REPORT CARD                              │
│                                                                   │
│  Term: First Term           Session: 2025/2026                    │
├──────────────────────────────────────────────────────────────────┤
│  STUDENT INFORMATION                                             │
│  ───────────────────────────────────────────────────────────────  │
│  Name:  John Doe              Admission No:  FRP/2025/001        │
│  Class: JSS 1                 Gender:       Male                 │
│  No. in Class: 35             Position:     3rd                  │
├──────────────────────────────────────────────────────────────────┤
│  ACADEMIC PERFORMANCE                                            │
│  ───────────────────────────────────────────────────────────────  │
│  S/N  SUBJECT          CA(30)  EXAM(70)  TOTAL  GRADE  POSITION  │
│  ───────────────────────────────────────────────────────────────  │
│   1   English Language    25       55       80     A      1/35   │
│   2   Mathematics         28       60       88     A      1/35   │
│   3   Basic Science       20       45       65     B      5/35   │
│   4   Social Studies      18       40       58     C      8/35   │
│   5   Agricultural Sci    22       50       72     A      2/35   │
│  ───────────────────────────────────────────────────────────────  │
│      GRAND TOTAL: 363/500   AVERAGE: 72.60    POSITION: 3/35     │
├──────────────────────────────────────────────────────────────────┤
│  AFFECTIVE DOMAIN                                                │
│  ───────────────────────────────────────────────────────────────  │
│  Punctuality:    A  │  Attentiveness:  B  │  Neatness:    A     │
│  Honesty:        A  │  Politeness:     B  │  Self Control: B    │
│                                                                   │
│  PSYCHOMOTOR DOMAIN                                              │
│  ───────────────────────────────────────────────────────────────  │
│  Handwriting:    B  │  Sports:         A  │  Drawing:     B     │
│  Verbal Fluency: B  │  Craft Skills:   B  │                       │
├──────────────────────────────────────────────────────────────────┤
│  ATTENDANCE                                                      │
│  ───────────────────────────────────────────────────────────────  │
│  Times Present:  85    Times Absent:  3    Times Excused:  2     │
├──────────────────────────────────────────────────────────────────┤
│  CLASS TEACHER'S REMARKS:                                        │
│  ______________________________________________________________  │
│  ______________________________________________________________  │
│  Signature: ___________________  Date: ________________          │
│                                                                   │
│  PRINCIPAL'S REMARKS:                                            │
│  ______________________________________________________________  │
│  ______________________________________________________________  │
│  Signature: ___________________  Date: ________________          │
│                                                                   │
│  NEXT TERM BEGINS: Monday, 15th September 2025                   │
│                                                                   │
│  ───────────────────────────────────────────────────────────────  │
│  School Stamp                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. PDF Generation

Add `puppeteer` to `backend/package.json`:

```json
{
  "dependencies": {
    "puppeteer": "^22.0.0"
  }
}
```

### PDF Generation Flow

```
User clicks "Download Report Card"
  → GET /api/student/report-card/pdf?term_id=1&session_id=2
  → Backend queries all data (results, domains, position, attendance, remarks)
  → Renders an HTML template (EJS or string interpolation)
  → Launches Puppeteer headless browser
  → page.setContent(html), page.pdf({ format: 'A4' })
  → Returns PDF buffer with Content-Type: application/pdf
```

### Controller Sketch

```javascript
const puppeteer = require('puppeteer');

async function downloadReportCardPDF(req, res) {
  const { term_id, session_id } = req.query;
  const student_id = req.user.studentId;

  // Fetch all report card data (same as JSON endpoint above)
  const data = await buildReportCardData(student_id, term_id, session_id);

  // Render HTML template
  const html = renderReportCardHTML(data);

  // Generate PDF
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } });
  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report-card-${data.student.admission_number}-term${term_id}.pdf`);
  res.send(pdf);
}
```

### Alternative (lighter): `pdfkit`

If Puppeteer is too heavy:

```javascript
const PDFDocument = require('pdfkit');

function generatePDF(data, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=report-card.pdf');
  doc.pipe(res);

  // School header
  doc.fontSize(18).font('Helvetica-Bold').text('FREPPA GROUP OF SCHOOLS', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('123 Education Road, Lagos State, Nigeria', { align: 'center' });
  doc.moveDown();

  // Title
  doc.fontSize(14).font('Helvetica-Bold').text('REPORT CARD', { align: 'center' });
  doc.moveDown();

  // Student info
  doc.fontSize(11).font('Helvetica-Bold').text(`Student: ${data.student.name}`);
  doc.font('Helvetica').text(`Class: ${data.student.class}  |  Term: ${data.term}  |  Session: ${data.session}`);
  doc.moveDown();

  // Table headers
  // ... build table rows manually with doc.rect(), doc.text(), etc.

  doc.end();
}
```

---

## 7. Frontend — New / Updated Pages

### 7.1 Report Card Page (`app/report-card.html`)

A dedicated page (or modal) showing:

- School header with logo
- Student info card
- Full subject table with domain ratings
- Summary (grand total, average, position)
- Teacher & Principal remarks
- Print & Download PDF buttons
- Back to dashboard link

### 7.2 Student Dashboard Updates

Add to `app/student-dashboard.html`:

- A **"View Report Card"** button for each completed term
- A **"Download PDF"** button that triggers the PDF endpoint
- A **term/session selector** that switches between available report cards
- A **history section** showing all past reports

### 7.3 Teacher Dashboard Updates

Add to `app/teacher-dashboard.html`:

- A **"Domains" tab/section** where teachers can rate students on affective & psychomotor traits (A–E dropdowns per student)
- An **"Attendance" tab** with a date picker and class roster (present/absent/excused buttons)
- A **"Finalize Reports" button** (admin only) to lock report cards

### 7.4 Admin Dashboard Updates

Add to `app/admin-dashboard.html`:

- A **"Report Cards" section** to:
  - View all finalized/awaiting reports per class
  - Bulk finalize reports
  - Regenerate individual reports
  - Export class results as Excel
- An **"Attendance Report" section** with summary per student per term

---

## 8. Grading & Domain Rating Legend

### Academic Grades (existing, unchanged)

| Score Range | Grade | Remark |
|-------------|-------|--------|
| 70 – 100    | A     | Excellent |
| 60 – 69     | B     | Very Good |
| 50 – 59     | C     | Good |
| 45 – 49     | D     | Fair |
| 40 – 44     | E     | Pass |
| 0 – 39      | F     | Fail |

### Domain Ratings (new)

| Letter | Meaning |
|--------|---------|
| A      | Excellent |
| B      | Very Good |
| C      | Good |
| D      | Fair |
| E      | Needs Improvement |

---

## 9. Implementation Order

| Phase | What | Details |
|-------|------|---------|
| **1** | Fix schema.sql | Add `test1`, `test2`, `test3` columns; update the CREATE TABLE for `results` |
| **2** | Create new tables | `result_domains`, `report_cards`, `attendance` |
| **3** | Backend: Domains endpoints | `POST/GET /api/teacher/result/domains` |
| **4** | Backend: Position logic | Ranking query + controller utility |
| **5** | Backend: Report card JSON endpoint | `GET /api/student/report-card` |
| **6** | Backend: Attendance | Save + summary endpoints |
| **7** | Frontend: Teacher domains UI | A–E rating per student per subject |
| **8** | Frontend: Report card page | Dedicated HTML page with full layout |
| **9** | PDF generation | Add Puppeteer, build PDF endpoint |
| **10** | Frontend: Print/PDF buttons | Wire up student & parent dashboards |
| **11** | Admin: Finalize & manage reports | Bulk finalize, regenerate, export |
| **12** | Attendance tracking UI | Teacher marks daily attendance; admin views summaries |

---

## 10. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF library | **Puppeteer** (primary) or **PDFKit** (lightweight fallback) | Puppeteer gives pixel-perfect HTML→PDF; PDFKit is lighter for simple layouts |
| Report rendering | **Server-side HTML template** converted to PDF | Avoids client-side dependencies; works for print too |
| Position storage | **Calculated live** from results table, stored in `report_cards` on finalize | Live = always up-to-date; stored = snapshot for finalized reports |
| Domain ratings | **Separate table** (`result_domains`) rather than JSON column | Queryable, indexable, easier to validate per column |
| Attendance | **Per-date rows** rather than aggregated | Supports daily tracking; aggregation done via SQL at report time |
| Report finalization | **is_finalized flag** prevents edits after principal approval | Ensures report integrity once printed |
