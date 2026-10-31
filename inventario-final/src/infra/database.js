const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'inventario_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,
  connectTimeout: 10000,
  decimalNumbers: false,
  timezone: 'Z',
  charset: 'utf8mb4',
  enableKeepAlive: true
};

class MysqlUnitOfWork {
  constructor(pool) { this.pool = pool; }

  async execute(operation) {
    const connection = await this.pool.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      if (transactionStarted) {
        try { await connection.rollback(); }
        catch (rollbackError) { console.error('Rollback fallido:', rollbackError.message); }
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

function createDatabase() {
  const pool = mysql.createPool(config);
  return { pool, unitOfWork: new MysqlUnitOfWork(pool) };
}

module.exports = { config, createDatabase, MysqlUnitOfWork };
