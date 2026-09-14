require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

function parseMysqlUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodedDatabase(parsed.pathname),
  };
}

function decodedDatabase(pathname) {
  try {
    return decodeURIComponent(pathname.replace(/^\//, ''));
  } catch {
    return pathname.replace(/^\//, '');
  }
}

function buildConnectionConfig() {
  const rawUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || null;

  let conn;
  if (rawUrl) {
    conn = parseMysqlUrl(rawUrl);
  } else {
    conn = {
      host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
      user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'freppa_school',
      port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT, 10) || 3306,
    };
  }

  // TiDB Cloud Serverless requires TLS. Also opt-in via DB_SSL=true for
  // any other managed MySQL service.
  const sslEnabled =
    typeof conn.host === 'string' &&
    (conn.host.endsWith('.tidbcloud.com') ||
      process.env.DB_SSL === 'true' ||
      process.env.MYSQL_SSL === 'true');

  if (sslEnabled) {
    conn.ssl = {};
  }

  return conn;
}

module.exports = { buildConnectionConfig, parseMysqlUrl };