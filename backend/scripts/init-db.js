const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { buildConnectionConfig } = require('../config/connection');

function stripComments(sql) {
  return sql
    .replace(/--[^\n]*/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function splitStatements(sql) {
  return stripComments(sql)
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runSqlFile(conn, filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Drop "CREATE DATABASE ..." / "USE ..." — the connection already targets
  // the configured database (required on TiDB Cloud Serverless).
  content = content.replace(/CREATE\s+DATABASE[^;]+;/gi, '');
  content = content.replace(/^\s*USE\s+`?[A-Za-z0-9_.-]+`?;?([\r\n]+)?/gim, '');

  const statements = splitStatements(content);
  for (const stmt of statements) {
    await conn.query(stmt);
  }
  console.log(`  ${path.basename(filePath)}: ${statements.length} statements executed.`);
}

async function main() {
  const config = buildConnectionConfig();

  if (!config.database) {
    console.error('No database configured. Set DB_NAME (or DATABASE_URL).');
    process.exit(1);
  }

  console.log(`Connecting to ${config.host}:${config.port}/${config.database} ...`);
  const conn = await mysql.createConnection(config);

  await runSqlFile(conn, path.join(__dirname, '..', 'schema.sql'));
  await runSqlFile(conn, path.join(__dirname, '..', 'seed.sql'));

  await conn.end();
  console.log('\nDatabase initialized. Demo logins (password: password123):');
  console.log('  admin@freppa.edu   - admin');
  console.log('  emily.brown@freppa.edu - teacher');
  console.log('  student1@freppa.edu  - student');
  console.log('  parent1@freppa.edu   - parent');
}

main().catch((err) => {
  console.error('Initialization failed:', err.message);
  process.exit(1);
});