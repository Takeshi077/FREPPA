# FREPPA Group of Schools – School Management Portal
## PowerPoint Presentation Content

---

## Slide 1: Title Slide
**Title:** FREPPA Group of Schools – School Management Portal
**Subtitle:** A Digital Solution for Modern School Administration
**Bottom line:** Presented by [Your Name] | [Date]

---

## Slide 2: The Problem

Traditional School Management Issues:
- Paper-based records – easily lost, damaged, or misfiled
- Results manually calculated – slow and error-prone
- No central communication between admin, teachers, students, and parents
- Difficult to track academic history across terms and sessions
- No audit trail for grade changes

---

## Slide 3: What is FREPPA?

- A full-stack web application for managing a group of schools
- Combines a public school website (8 pages) with a secure role-based dashboard
- Built for four user roles: Admin, Teacher, Student, and Parent
- Core mission: digitize academic records and make them accessible to the right people in real time

---

## Slide 4: Who Uses It?

| Role    | What They Can Do                                                      |
| ------- | --------------------------------------------------------------------- |
| Admin   | Manage users, classes, subjects, terms; promote students; view audit logs |
| Teacher | Enter & edit results, upload grades via Excel, view assigned subjects & students |
| Student | View profile, check academic results with grade colors, print results |
| Parent  | Select any linked child, view their profile and academic performance  |

---

## Slide 5: How It Works – Architecture

```
        Browser (Website + Dashboards)
                 ↕  HTTPS
          Express.js API Server
          (Node.js + JavaScript)
                 ↕
          MySQL Database
          (10 tables)
```

- **Frontend:** HTML, Tailwind CSS, JavaScript
- **Backend:** Node.js + Express.js
- **Database:** MySQL 8
- **Authentication:** JWT tokens (expire after 24 hours)
- **Password Security:** bcrypt hashing

---

## Slide 6: Key Features

- **Online Result Management** – Teachers enter 3 test scores + exam; CA, total, and grade (A–F) calculated automatically
- **Bulk Upload** – Upload results for an entire class at once via Excel/CSV
- **Role-Based Access** – Each user sees only what they're authorized to see
- **Audit Log** – Every grade change is tracked (who, what, when, from where)
- **Student Promotion** – Admin can promote all students to the next class in one click
- **Print-Friendly Reports** – Students and parents can print formatted result sheets

---

## Slide 7: Grading System

| Grade | Score Range | Meaning     |
| ----- | ----------- | ----------- |
| A     | 70–100      | Excellent   |
| B     | 60–69       | Very Good   |
| C     | 50–59       | Good        |
| D     | 45–49       | Fair        |
| E     | 40–44       | Pass        |
| F     | Below 40    | Fail        |

Scoring: 3 Continuous Assessments (10 marks each) + 1 Exam (70 marks) = **100 total**

---

## Slide 8: Public School Website

8 pages anyone can visit:
- **Home** – Hero slider, features, testimonials
- **About Us** – School history, mission, vision, leadership
- **Academics** – Curriculum and subjects overview
- **Admissions** – Process, requirements, online inquiry form
- **Staff** – Teacher directory
- **News & Events** – School announcements
- **Gallery** – Photo gallery
- **Contact** – Contact form with email integration & Google Maps

---

## Slide 9: Tech Stack

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Frontend   | HTML5, Tailwind CSS, Vanilla JavaScript, Font Awesome |
| Backend    | Node.js, Express.js                                  |
| Database   | MySQL 8 with parameterized queries (SQL injection safe) |
| Auth       | JSON Web Tokens (JWT) + bcrypt password hashing      |
| File Upload | Multer + xlsx for Excel/CSV parsing                 |
| Deployment | Railway (cloud hosting)                              |

---

## Slide 10: Database Design

10 interconnected tables:
- `users`, `students`, `teachers`, `classes`, `subjects`
- `sessions`, `terms`, `results`, `result_audit_log`, `contact_inquiries`
- Foreign keys enforce data integrity
- Unique constraints prevent duplicate results

---

## Slide 11: Security Highlights

- **Role-Based Access Control** – Four distinct permission levels
- **SQL Injection Prevention** – Parameterized prepared statements
- **Password Security** – bcrypt with 10 salt rounds
- **JWT Authentication** – Tokens verify identity on every request
- **Full Audit Trail** – All grade changes logged with IP address and timestamp
- **Data Isolation** – Teachers see only their subjects; students see only their results

---

## Slide 12: Demo Credentials

All accounts use password: **`password123`**

| Role    | Email                       |
| ------- | --------------------------- |
| Admin   | admin@freppa.edu            |
| Teacher | emily.brown@freppa.edu      |
| Student | student1@freppa.edu         |
| Parent  | parent1@freppa.edu          |

---

## Slide 13: Future Enhancements (Ideas)

- SMS/email notifications for new results
- Timetable and attendance modules
- Mobile app version
- Payment/invoice management for school fees
- Real-time chat between teachers and parents

---

## Slide 14: Thank You

**Questions?**

- Project hosted at: [Your deployment URL here]
- Built with: Node.js, Express, MySQL, Tailwind CSS
