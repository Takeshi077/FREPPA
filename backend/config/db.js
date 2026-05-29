const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || null;

let pool;
if (dbUrl) {
  // Parse Railway-style DATABASE_URL: mysql://user:password@host:port/database
  pool = mysql.createPool(dbUrl);
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'freppa_school',
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

module.exports = pool;
