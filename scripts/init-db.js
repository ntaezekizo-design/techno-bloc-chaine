'use strict';
/**
 * Initialisation de la base de données
 * Exécuté automatiquement au build sur Render : npm install && node scripts/init-db.js
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgres   = DATABASE_URL.toLowerCase().includes('postgres');

async function init() {
  console.log('\n⬡  EZEKIZO — Init base de données');
  console.log(`   Moteur : ${isPostgres ? 'PostgreSQL (Render)' : 'MySQL (local)'}\n`);

  if (!isPostgres && !process.env.DB_HOST && !process.env.DB_NAME) {
    console.log('⚠️  Aucune config DB trouvée — init ignorée (mode sans DB)');
    return;
  }

  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const fullSql    = fs.readFileSync(schemaPath, 'utf8');

  if (isPostgres) {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');

    // Découpe le SQL en statements individuels et les exécute un par un
    // (le driver pg n'accepte pas plusieurs statements d'un coup)
    const statements = fullSql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err) {
        // Ignore "already exists" et "duplicate" — idempotent
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.warn(`⚠️  ${err.message.split('\n')[0]}`);
        }
      }
    }

    await client.end();
    console.log('✅ Schéma PostgreSQL appliqué\n');

  } else {
    const mysql = require('mysql2/promise');
    const conn  = await mysql.createConnection({
      host:               process.env.DB_HOST || 'localhost',
      port:               parseInt(process.env.DB_PORT || '3306'),
      database:           process.env.DB_NAME || 'cryptomine',
      user:               process.env.DB_USER || 'root',
      password:           process.env.DB_PASS || '',
      multipleStatements: true,
      connectTimeout:     15000,
    });
    console.log('✅ Connecté à MySQL');
    await conn.query(fullSql);
    await conn.end();
    console.log('✅ Schéma MySQL appliqué\n');
  }

  console.log('🚀 Base de données prête\n');
}

init().catch(err => {
  console.error('❌ init-db échoué :', err.message);
  // Ne pas bloquer le déploiement si la DB n'est pas encore prête
  process.exit(0);
});
