const mysql = require('mysql2/promise');
(async () => {
  try {
    const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'brainnitro@7', database: 'freppa_school' });
    const [t] = await c.query('SHOW TABLES');
    console.log('Tables:', t.length);
    t.forEach(r => console.log(' -', Object.values(r)[0]));
    await c.end();
  } catch (e) {
    console.log('ERROR: ' + e.message);
  }
})();
