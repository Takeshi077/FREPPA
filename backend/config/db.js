const mysql = require('mysql2/promise');
const { buildConnectionConfig } = require('./connection');

const pool = mysql.createPool({
  ...buildConnectionConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;