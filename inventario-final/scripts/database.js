const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const action = process.argv[2];
  if (!['init', 'seed'].includes(action)) {
    console.error('Uso: npm run db:init | npm run db:seed');
    process.exitCode = 1;
    return;
  }
  const filename = action === 'init' ? 'schema.sql' : 'seed.sql';
  const sql = await fs.readFile(path.join(__dirname, '../db', filename), 'utf8');
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true
  });
  try {
    await conn.query(sql);
    console.log(`${filename} aplicado correctamente.`);
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error('No fue posible preparar la base de datos:', error.message);
  process.exitCode = 1;
});
