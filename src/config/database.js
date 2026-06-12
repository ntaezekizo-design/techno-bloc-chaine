'use strict';
/**
 * Adaptateur DB universel — PostgreSQL (Render) ou MySQL (local)
 * API identique dans les deux cas : query / queryOne / run
 */

const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

// ════════════════════════════════════════════
//  POSTGRESQL
// ════════════════════════════════════════════
let pgPool;

function getPgPool() {
  if (pgPool) return pgPool;
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  pgPool.on('error', err => console.error('[PG] Connexion perdue:', err.message));
  return pgPool;
}

/** Convertit les ? en $1 $2 … pour pg */
function toPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function pgQuery(sql, params = []) {
  const res = await getPgPool().query(toPlaceholders(sql), params);
  return res.rows;
}

async function pgRun(sql, params = []) {
  let pgSql = toPlaceholders(sql);
  // Ajoute RETURNING id sur les INSERT pour récupérer l'id généré
  if (/^\s*INSERT/i.test(pgSql)) {
    pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
  }
  const res = await getPgPool().query(pgSql, params);
  return {
    insertId:     res.rows[0]?.id ?? null,
    affectedRows: res.rowCount,
  };
}

// ════════════════════════════════════════════
//  MYSQL
// ════════════════════════════════════════════
let mysqlPool;

function getMysqlPool() {
  if (mysqlPool) return mysqlPool;
  const mysql = require('mysql2/promise');
  mysqlPool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT || '3306'),
    database:           process.env.DB_NAME     || 'cryptomine',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASS     || '',
    charset:            'utf8mb4',
    connectionLimit:    5,
    waitForConnections: true,
  });
  return mysqlPool;
}

async function mysqlQuery(sql, params = []) {
  const [rows] = await getMysqlPool().execute(sql, params);
  return rows;
}

async function mysqlRun(sql, params = []) {
  const [result] = await getMysqlPool().execute(sql, params);
  return result; // { insertId, affectedRows }
}

// ════════════════════════════════════════════
//  API UNIFIÉE
// ════════════════════════════════════════════
async function query(sql, params = []) {
  return isPostgres ? pgQuery(sql, params) : mysqlQuery(sql, params);
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

async function run(sql, params = []) {
  return isPostgres ? pgRun(sql, params) : mysqlRun(sql, params);
}

module.exports = { query, queryOne, run, isPostgres };
