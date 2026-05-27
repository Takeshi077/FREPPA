const mysql = require('mysql2/promise');
(async () => {
  try {
    const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'brainnitro@7' });
    const [d] = await c.query("SHOW DATABASES LIKE 'freppa_school'");
    console.log(d.length > 0 ? 'DB_EXISTS' : 'DB_MISSING');
    await c.end();
  } catch (e) {
    console.log('DB_ERROR: ' + e.message);
  }
})();
