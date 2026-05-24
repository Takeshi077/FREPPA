# FREPPA GROUP OF SCHOOLS - Backend Setup Guide

## Prerequisites

- Node.js 18+ (or 20+)
- MySQL 8.x
- npm

## Step 1: Database Setup

1. Open MySQL (e.g., via command line, MySQL Workbench, or XAMPP phpMyAdmin)

2. Run the schema file to create the database and tables:

   ```
   mysql -u root -p < backend/schema.sql
   ```

3. Run the seed file to populate demo data:

   ```
   mysql -u root -p < backend/seed.sql
   ```

   **Demo credentials (password for all: `password123`):**

   | Role    | Email                       |
   |---------|-----------------------------|
   | Admin   | admin@freppa.edu            |
   | Teacher | emily.brown@freppa.edu      |
   | Student | student1@freppa.edu         |
   | Parent  | parent1@freppa.edu          |

## Step 2: Configure Environment

1. Copy the `.env` file to the project root (or edit the existing one):

   ```
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=freppa_school
   DB_PORT=3306

   # JWT Configuration
   JWT_SECRET=your-super-secret-key-change-this
   JWT_EXPIRES_IN=24h

   # Server Configuration
   PORT=3000
   ```

2. Edit `DB_PASSWORD` to match your MySQL root password.

## Step 3: Install Dependencies

From the project root directory:

```
cd backend
npm install
```

## Step 4: Start the Backend Server

```
npm start
```

The server will start on `http://localhost:3000` and will:
- Serve the existing static frontend files from the `app/` folder
- Expose the API at `http://localhost:3000/api/...`

## Step 5: Access the Site

- **Static site**: `http://localhost:3000/index.html`
- **Login**: `http://localhost:3000/login.html`
- **Teacher dashboard**: Login with a teacher account, then visit `teacher-dashboard.html`
- **Student dashboard**: Login with a student account, then visit `student-dashboard.html`
- **Admin dashboard**: Login with the admin account, then visit `admin-dashboard.html`

Alternatively, keep your existing `http-server` running on port 8099 for the static pages, and the backend will serve the dashboard pages on port 3000.

## API Endpoints

### Authentication
| Method | Path              | Description      |
|--------|-------------------|------------------|
| POST   | /api/auth/login   | Login            |
| GET    | /api/auth/verify  | Verify JWT token |

### Teacher (requires `teacher` role)
| Method | Path                                      | Description              |
|--------|-------------------------------------------|--------------------------|
| GET    | /api/teacher/subjects                     | My assigned subjects     |
| GET    | /api/teacher/subject/:id/students         | Students for a subject   |
| POST   | /api/teacher/result/update                | Create/update result     |
| POST   | /api/teacher/result/bulk-upload           | Upload Excel/CSV         |

### Student (requires `student` role)
| Method | Path                     | Description              |
|--------|--------------------------|--------------------------|
| GET    | /api/student/profile     | My profile               |
| GET    | /api/student/results     | My results (filterable)  |

### Parent (requires `parent` role)
| Method | Path                              | Description               |
|--------|-----------------------------------|---------------------------|
| GET    | /api/parent/children              | My children list          |
| GET    | /api/parent/child/:id/results     | Child's results           |

### Admin (requires `admin` role)
| Method | Path                              | Description               |
|--------|-----------------------------------|---------------------------|
| GET    | /api/admin/users                  | List users                |
| POST   | /api/admin/users                  | Create user               |
| PUT    | /api/admin/users/:id/toggle-status| Activate/deactivate user  |
| GET    | /api/admin/teachers               | List teachers             |
| GET    | /api/admin/students               | List students             |
| GET    | /api/admin/classes                | List classes              |
| POST   | /api/admin/classes                | Create class              |
| GET    | /api/admin/subjects               | List subjects             |
| POST   | /api/admin/subjects               | Create subject            |
| PUT    | /api/admin/subjects/assign-teacher| Assign teacher to subject |
| GET    | /api/admin/terms                  | List terms                |
| PUT    | /api/admin/terms/set-current      | Set current term          |
| POST   | /api/admin/terms                  | Create term               |
| GET    | /api/admin/sessions               | List sessions             |
| PUT    | /api/admin/sessions/set-current   | Set current session       |
| POST   | /api/admin/sessions               | Create session            |
| POST   | /api/admin/students/promote       | Promote students          |
| GET    | /api/admin/audit-log              | View audit log            |

## Folder Structure

```
FREPPA/
├── .env                          # Environment variables
├── SETUP.md                      # This file
├── backend/
│   ├── package.json
│   ├── server.js                 # Express app entry point
│   ├── config/
│   │   └── db.js                 # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── controllers/
│   │   ├── authController.js     # Login + token verification
│   │   ├── teacherController.js  # Teacher CRUD + bulk upload
│   │   ├── studentController.js  # Student profile + results
│   │   └── adminController.js    # Admin management functions
│   ├── routes/
│   │   ├── auth.js               # Auth routes
│   │   ├── teacher.js            # Teacher routes
│   │   ├── student.js            # Student routes
│   │   ├── parent.js             # Parent routes
│   │   └── admin.js              # Admin routes
│   ├── schema.sql                # Database schema
│   ├── seed.sql                  # Demo data
│   └── uploads/                  # Bulk upload temp files
├── app/
│   ├── index.html                # (unchanged)
│   ├── about.html                # (unchanged + auth nav)
│   ├── academics.html            # (unchanged + auth nav)
│   ├── admissions.html           # (unchanged + auth nav)
│   ├── staff.html                # (unchanged + auth nav)
│   ├── news.html                 # (unchanged + auth nav)
│   ├── gallery.html              # (unchanged + auth nav)
│   ├── contact.html              # (unchanged + auth nav)
│   ├── login.html                # NEW - Login page
│   ├── teacher-dashboard.html    # NEW - Teacher dashboard
│   ├── student-dashboard.html    # NEW - Student/Parent dashboard
│   ├── admin-dashboard.html      # NEW - Admin dashboard
│   ├── style.css                 # (unchanged)
│   ├── script.js                 # (unchanged)
│   └── js/
│       ├── dashboard.js          # Shared dashboard utilities
│       └── auth-nav.js           # Auth-aware nav for static pages
└── (image files)                 # (unchanged)
```

## Security Notes

- Passwords are hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 24 hours
- All authenticated endpoints require a valid JWT in the `Authorization: Bearer <token>` header
- Teachers can only update results for subjects assigned to them
- Students can only view their own results
- Parents can only view results for their linked children
- All result changes are logged in `result_audit_log` with teacher ID, old/new data, and IP address
- SQL injection is prevented via parameterized queries (mysql2 prepared statements)
