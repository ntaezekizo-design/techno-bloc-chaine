'use strict';
/**
 * Script d'initialisation de la base de données
 * Exécute le schéma SQL sur PostgreSQL (Render) ou MySQL (local)
 *
 * Usage :
 *   node scripts/init-db.js
 *   npm run init-db
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
const sql        = fs.readFileSync(schemaPath, 'utf8');
const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

async function init() {
  console.log(`\n⬡  EZEKIZO — Initialisation de la base de données`);
  console.log(`   Moteur  : ${isPostgres ? 'PostgreSQL' : 'MySQL'}`);
  console.log(`   Schéma  : ${schemaPath}\n`);

  if (isPostgres) {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');
    await client.query(sql);
    console.log('✅ Schéma appliqué avec succès');
    await client.end();
  } else {
    const mysql = require('mysql2/promise');
    const conn  = await mysql.createConnection({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'cryptomine',
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      multipleStatements: true,
    });
    console.log('✅ Connecté à MySQL');
    await conn.query(sql);
    console.log('✅ Schéma appliqué avec succès');
    await conn.end();
  }

  console.log('\n🚀 Base de données prête. Lance : npm start\n');
}

init().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
