# Requirements Checklist — School Management & Report Card System

Use this checklist to gather all necessary information from a school before building the system.

---

## 1. School Info & Branding

- [ ] Full school name
- [ ] School address
- [ ] Phone number(s)
- [ ] Email address(es)
- [ ] Website URL
- [ ] School logo (high-resolution image file)
- [ ] School colors / theme (primary, secondary, accent)
- [ ] School motto
- [ ] Vision statement
- [ ] Mission statement
- [ ] Any additional branding elements (stamp, signature images)

---

## 2. Academic Structure

### Classes
- [ ] List of all class levels (e.g., JSS 1, JSS 2, JSS 3, SSS 1, SSS 2, SSS 3)
- [ ] Grouping/sections (e.g., Junior Secondary, Senior Secondary, Primary, Nursery)
- [ ] Academic year naming convention (e.g., "2024/2025", "2024-2025", "2025")
- [ ] Term names (e.g., First Term, Second Term, Third Term)

### Subjects
- [ ] Which subjects are offered per class level
- [ ] Subject codes (e.g., ENG101, MTH101)
- [ ] Which teacher teaches which subject per class

---

## 3. Grading System

### Score Breakdown
- [ ] Maximum CA (Continuous Assessment) score (e.g., 30, 40, 50)
- [ ] Number of CA components and their individual max scores
  - Example: 3 tests × 10 marks each = 30
  - Example: 2 tests × 15 marks + 1 assignment × 10 = 40
- [ ] Maximum Exam score (e.g., 70, 60, 50)
- [ ] Maximum Total score (usually CA + Exam)

### Grade Boundaries
| Letter | From | To | Remark |
|--------|------|----|--------|
| A      | [  ] | [  ]| [  ]   |
| B      | [  ] | [  ]| [  ]   |
| C      | [  ] | [  ]| [  ]   |
| D      | [  ] | [  ]| [  ]   |
| E      | [  ] | [  ]| [  ]   |
| F      | [  ] | [  ]| [  ]   |

*Example: A ≥ 70 = Excellent, B ≥ 60 = Very Good, C ≥ 50 = Good, D ≥ 45 = Fair, E ≥ 40 = Pass, F < 40 = Fail*

---

## 4. Report Card Content

### Layout & Fields
- [ ] Show student photo? (Yes / No)
- [ ] Show student passport photograph on report card?
- [ ] Columns in the subject table:
  - [ ] Subject Name
  - [ ] Test 1 score
  - [ ] Test 2 score
  - [ ] Test 3 score
  - [ ] CA Total
  - [ ] Exam score
  - [ ] Total score
  - [ ] Grade
  - [ ] Position in subject
  - [ ] Remarks per subject

### Summary Section
- [ ] Show grand total?
- [ ] Show average?
- [ ] Show class position/ranking?
- [ ] Show total number of students in class?
- [ ] Show GPA or grade point average?

### Affective Domain
Which traits to rate? (A–E scale or 1–5 scale)
- [ ] Punctuality
- [ ] Attentiveness
- [ ] Neatness
- [ ] Honesty
- [ ] Politeness
- [ ] Self-control
- [ ] Other: _______________

### Psychomotor Domain
Which traits to rate?
- [ ] Handwriting
- [ ] Sports / Physical Education
- [ ] Drawing / Art
- [ ] Verbal fluency
- [ ] Craft skills
- [ ] Other: _______________

### Domain Rating Scale
| Rating | Meaning |
|--------|---------|
| A      | [  ]    |
| B      | [  ]    |
| C      | [  ]    |
| D      | [  ]    |
| E      | [  ]    |

*Example: A = Excellent, B = Very Good, C = Good, D = Fair, E = Needs Improvement*

### Remarks & Signatures
- [ ] Class teacher's remark? (Yes / No)
- [ ] Principal's / Head Teacher's remark? (Yes / No)
- [ ] Show "Next Term Begins" date?
- [ ] Signature fields (teacher, principal)
- [ ] School stamp on report card?

---

## 5. Attendance Tracking

- [ ] Track daily attendance? (Yes / No)
- [ ] Status options:
  - [ ] Present
  - [ ] Absent
  - [ ] Excused
  - [ ] Late
  - [ ] Other: _______________
- [ ] Who marks attendance? (Class teacher / Subject teacher / Admin)
- [ ] Show attendance summary on report card? (Times present, absent, excused)

---

## 6. User Roles & Access

| Role    | Needed? | Can do what? |
|---------|---------|--------------|
| Admin   | [ ]     | Full system management |
| Teacher | [ ]     | Enter results, domains, attendance for assigned subjects |
| Student | [ ]     | View own results and report cards |
| Parent  | [ ]     | View linked children's results and report cards |

- [ ] Additional roles needed? _______________
- [ ] Can teachers edit results after saving? (Yes / No / With admin approval)
- [ ] Can parents view all terms or only the current term?
- [ ] Should parents be able to download PDF report cards?
- [ ] Should students be able to download PDF report cards?

---

## 7. Existing Data (for migration)

### Student Data
- [ ] Student names, admission numbers, classes
- [ ] Gender, date of birth (optional)
- [ ] Parent/guardian names and contact info

### Teacher Data
- [ ] Teacher names, staff IDs
- [ ] Departments / subject assignments
- [ ] Contact info (email, phone)

### Academic Data
- [ ] Current session and term
- [ ] Past result data (to migrate into the system)
- [ ] Format of existing data (paper, Excel, another software?)

---

## 8. Technical Preferences

- [ ] Hosting preference: (Cloud / On-premise / Not sure)
- [ ] Preferred domain name: _______________
- [ ] Need a public-facing school website? (Yes / No)
  - [ ] Pages needed: Home, About, Academics, Admissions, Staff, News, Gallery, Contact
- [ ] Paper size for report cards: (A4 / Letter)
- [ ] Need bulk upload via Excel/CSV? (Yes / No)
- [ ] Need SMS or email notifications? (Yes / No)
  - [ ] For new results published
  - [ ] For attendance alerts
- [ ] Preferred language for the interface: (English / Other: _______________)

---

## 9. Security & Compliance

- [ ] Password policy:
  - [ ] Minimum length: _____ characters
  - [ ] Require special characters? (Yes / No)
  - [ ] Require numbers? (Yes / No)
- [ ] User creation method:
  - [ ] Admin creates all accounts
  - [ ] Self-registration with admin approval
  - [ ] Bulk import from Excel
- [ ] Data retention: How long to keep old results? (Forever / _____ years)
- [ ] Any specific data privacy requirements? _______________

---

## 10. Additional Features Wanted

- [ ] Student promotion (move students to next class at year-end)
- [ ] Audit log (track who changed what and when)
- [ ] Printable class summary sheets for teachers
- [ ] Analytics / charts (class performance, subject performance trends)
- [ ] Fee payment tracking
- [ ] Timetable management
- [ ] Exam slip generation
- [ ] Mobile app (Android/iOS)
- [ ] Other: _______________

---

## Checklist Summary

| Category | Total Items | Completed |
|----------|-------------|-----------|
| School Info & Branding | 11 | / |
| Academic Structure | 4 | / |
| Grading System | 5 | / |
| Report Card Content | 7 sections | / |
| Attendance Tracking | 4 | / |
| User Roles & Access | 7 | / |
| Existing Data | 4 | / |
| Technical Preferences | 9 | / |
| Security & Compliance | 4 | / |
| Additional Features | 9 | / |
| **Total** | **~65** | **/** |

---

> Use this document during the initial meeting with school administrators. Fill it out completely before development begins to avoid scope creep and rework.
