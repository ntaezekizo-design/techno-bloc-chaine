'use strict';

/**
 * Adaptateur de base de données universel
 * - PostgreSQL  : si DATABASE_URL commence par postgres:// (Render, Railway…)
 * - MySQL       : sinon (local ou DB_HOST/DB_USER/DB_PASS)
 *
 * L'API exposée est identique dans les deux cas :
 *   query(sql, params)    → rows[]
 *   queryOne(sql, params) → row | null
 *   run(sql, params)      → result { insertId, affectedRows }
 */

const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

// ─── PostgreSQL ──────────────────────────────────────
let pgPool;
function getPgPool() {
  if (pgPool) return pgPool;
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },  // requis sur Render
    max: 5,
  });
  return pgPool;
}

async function pgQuery(sql, params = []) {
  // pg utilise $1 $2… au lieu de ?
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const res = await getPgPool().query(pgSql, params);
  return res.rows;
}

async function pgRun(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  // Pour les INSERT, récupère l'id généré
  const returningSQL = /^\s*INSERT/i.test(pgSql)
    ? pgSql.replace(/;?\s*$/, ' RETURNING id')
    : pgSql;
  const res = await getPgPool().query(returningSQL, params);
  return {
    insertId:      res.rows[0]?.id ?? null,
    affectedRows:  res.rowCount,
  };
}

// ─── MySQL ───────────────────────────────────────────
let mysqlPool;
function getMysqlPool() {
  if (mysqlPool) return mysqlPool;
  const mysql = require('mysql2/promise');
  if (process.env.DATABASE_URL) {
    mysqlPool = mysql.createPool(process.env.DATABASE_URL + '?charset=utf8mb4&connectionLimit=5');
  } else {
    mysqlPool = mysql.createPool({
      host:               process.env.DB_HOST || 'localhost',
      port:               parseInt(process.env.DB_PORT || '3306'),
      database:           process.env.DB_NAME || 'cryptomine',
      user:               process.env.DB_USER || 'root',
      password:           process.env.DB_PASS || '',
      charset:            'utf8mb4',
      connectionLimit:    5,
      waitForConnections: true,
      queueLimit:         0,
    });
  }
  return mysqlPool;
}

async function mysqlQuery(sql, params = []) {
  const [rows] = await getMysqlPool().execute(sql, params);
  return rows;
}

async function mysqlRun(sql, params = []) {
  const [result] = await getMysqlPool().execute(sql, params);
  return result;
}

// ─── API unifiée ─────────────────────────────────────
async function query(sql, params = []) {
  return isPostgres ? pgQuery(sql, params) : mysqlQuery(sql, params);
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  return isPostgres ? pgRun(sql, params) : mysqlRun(sql, params);
}

module.exports = { query, queryOne, run };
