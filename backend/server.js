const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const parentRoutes = require('./routes/parent');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/report');
const attendanceRoutes = require('./routes/attendance');
const quizRoutes = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 3000;

const defaultOrigins = [
  'https://freppa-production.up.railway.app',
  'http://freppa.schportal.net',
  'https://freppa.schportal.net',
  'http://localhost:3000',
  'http://localhost:3999'
];
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const loggedBlockedOrigins = new Set();

function isAllowedOrigin(origin) {
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true;
    if (hostname === 'up.railway.app' || hostname.endsWith('.up.railway.app')) return true;
    if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) return true;
    if (hostname === 'freppa.schportal.net') return true;

    return false;
  } catch (err) {
    return false;
  }
}

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === 'null') return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);

    if (!loggedBlockedOrigins.has(origin)) {
      loggedBlockedOrigins.add(origin);
      console.warn(`Blocked CORS origin: ${origin}`);
    }
    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'app')));

app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FREPPA API is running.' });
});

// Catch-all: serve index.html for any non-API route that isn't a static file
// This ensures direct navigation to /login.html etc. works on mobile browsers
app.get('*', (req, res, next) => {
  // Don't handle API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  // Try to serve the file from the app directory
  const filePath = path.join(__dirname, '..', 'app', req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      // If file not found, serve index.html
      res.sendFile(path.join(__dirname, '..', 'app', 'index.html'));
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

// Test database connection before starting
const pool = require('./config/db');
const ensureSchema = require('./config/ensureSchema');
pool.getConnection()
  .then(async conn => {
    conn.release();
    console.log('✓ Database connected successfully');
    try {
      await ensureSchema();
    } catch (err) {
      console.error('✗ Schema upgrade failed:', err.message);
    }
    startServer();
  })
  .catch(err => {
    console.error('✗ Database connection failed:', err.message);
    console.log('  Starting server anyway - API calls will fail until DB is available.');
    startServer();
  });

function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let ip = 'localhost';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ip = net.address;
          break;
        }
      }
    }
    console.log(`\nFREPPA backend server running on:`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${ip}:${PORT}`);
    console.log(`\nOpen the network URL on your phone to access on mobile.`);
    console.log(`Serving static files from: ${path.join(__dirname, '..', 'app')}`);
  });
}
