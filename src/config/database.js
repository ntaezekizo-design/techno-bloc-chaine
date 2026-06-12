'use strict';
const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (pool) return pool;

  // Support DATABASE_URL (Render, Railway, PlanetScale style)
  if (process.env.DATABASE_URL) {
    pool = mysql.createPool(process.env.DATABASE_URL + '?charset=utf8mb4&connectionLimit=5');
  } else {
    pool = mysql.createPool({
      host:            process.env.DB_HOST     || 'localhost',
      port:            parseInt(process.env.DB_PORT || '3306'),
      database:        process.env.DB_NAME     || 'cryptomine',
      user:            process.env.DB_USER     || 'root',
      password:        process.env.DB_PASS     || '',
      charset:         'utf8mb4',
      connectionLimit: 5,
      waitForConnections: true,
      queueLimit:      0,
    });
  }
  return pool;
}

/** Run a query and return rows */
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

/** Run a query and return first row or null */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/** Run an INSERT/UPDATE/DELETE and return result info */
async function run(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

module.exports = { query, queryOne, run, getPool };
