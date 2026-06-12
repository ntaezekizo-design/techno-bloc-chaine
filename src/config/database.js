'use strict';
/**
 * Base de données SQLite embarquée via sql.js (WebAssembly)
 * Aucune compilation native — fonctionne partout (Windows, Linux, Render)
 *
 * Le fichier .db est persisté sur disque et rechargé à chaque démarrage.
 * En mémoire pendant l'exécution, sauvegardé à chaque écriture.
 */

const fs   = require('fs');
const path = require('path');

// ── Chemin du fichier SQLite ──────────────────────────────
const DB_DIR  = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data');

const DB_FILE = process.env.DB_PATH
  || path.join(DB_DIR, 'ezekizo.db');

// Crée le dossier data/ s'il n'existe pas
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// ── Instance DB (initialisée de façon asynchrone) ─────────
let db = null;

async function getDb() {
  if (db) return db;

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  // Charge le fichier existant ou crée une DB vide
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Applique le schéma (CREATE TABLE IF NOT EXISTS → idempotent)
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.run(schema);
    _save();
  }

  console.log(`  🗄️   SQLite (sql.js) : ${DB_FILE}`);
  return db;
}

/** Persiste la DB en mémoire vers le fichier disque */
function _save() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  } catch (e) {
    console.error('[DB] Erreur sauvegarde :', e.message);
  }
}

// ── Convertit les résultats sql.js en tableau d'objets ────
function _toRows(result) {
  if (!result || !result[0]) return [];
  const { columns, values } = result[0];
  return values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

// ── API : query / queryOne / run ──────────────────────────

/**
 * SELECT → retourne un tableau de lignes
 */
async function query(sql, params = []) {
  const d = await getDb();
  try {
    // sql.js utilise des paramètres nommés ou positionnels avec ?
    const stmt   = d.prepare(sql);
    const result = [];
    stmt.bind(params);
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  } catch (e) {
    throw e;
  }
}

/**
 * SELECT → retourne la première ligne ou null
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/**
 * INSERT / UPDATE / DELETE → retourne { insertId, affectedRows }
 */
async function run(sql, params = []) {
  const d = await getDb();
  try {
    d.run(sql, params);
    const insertId     = d.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] ?? null;
    const affectedRows = d.getRowsModified();
    _save(); // persistance immédiate après chaque écriture
    return { insertId, affectedRows };
  } catch (e) {
    throw e;
  }
}

// Initialise la DB au chargement du module
getDb().catch(err => console.error('[DB] Init échouée :', err.message));

module.exports = { query, queryOne, run, getDb };
