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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
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
pool.getConnection()
  .then(conn => {
    conn.release();
    console.log('✓ Database connected successfully');
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
