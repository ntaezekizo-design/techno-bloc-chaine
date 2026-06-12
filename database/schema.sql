-- ============================================================
--  EZEKIZO CryptoMine — Schéma SQLite
--  Exécuté automatiquement au démarrage du serveur
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─── blockchain_stats ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS blockchain_stats (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  total_supply        REAL    NOT NULL DEFAULT 0,
  difficulty          INTEGER NOT NULL DEFAULT 4,
  block_reward        REAL    NOT NULL DEFAULT 50,
  total_blocks        INTEGER NOT NULL DEFAULT 0,
  total_transactions  INTEGER NOT NULL DEFAULT 0,
  last_block_time     TEXT    NULL,
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO blockchain_stats
  (id, total_supply, difficulty, block_reward, total_blocks, total_transactions)
VALUES (1, 0, 4, 50, 0, 0);

-- ─── blocks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  block_index    INTEGER NOT NULL UNIQUE,
  hash           TEXT    NOT NULL,
  previous_hash  TEXT    NOT NULL,
  merkle_root    TEXT    NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  nonce          INTEGER NOT NULL DEFAULT 0,
  difficulty     INTEGER NOT NULL DEFAULT 4,
  miner_address  TEXT    NOT NULL DEFAULT 'GENESIS',
  reward         REAL    NOT NULL DEFAULT 0,
  tx_count       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blocks_hash        ON blocks(hash);
CREATE INDEX IF NOT EXISTS idx_blocks_block_index ON blocks(block_index);

-- Bloc Genesis
INSERT OR IGNORE INTO blocks
  (block_index, hash, previous_hash, merkle_root, nonce, difficulty, miner_address, reward, tx_count)
VALUES (
  0,
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000',
  0, 4, 'GENESIS', 0, 0
);

-- ─── wallets ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  address    TEXT    NOT NULL UNIQUE,
  public_key TEXT    NOT NULL,
  label      TEXT    NOT NULL DEFAULT 'My Wallet',
  balance    REAL    NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);

-- ─── transactions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  txid          TEXT    NOT NULL UNIQUE,
  from_address  TEXT    NOT NULL DEFAULT 'COINBASE',
  to_address    TEXT    NOT NULL,
  amount        REAL    NOT NULL,
  fee           REAL    NOT NULL DEFAULT 0,
  block_id      INTEGER NULL,
  status        TEXT    NOT NULL DEFAULT 'pending',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  confirmed_at  TEXT    NULL,
  FOREIGN KEY (block_id) REFERENCES blocks(id)
);

CREATE INDEX IF NOT EXISTS idx_tx_txid   ON transactions(txid);
CREATE INDEX IF NOT EXISTS idx_tx_from   ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_to     ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

-- ─── mempool ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mempool (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  txid          TEXT    NOT NULL UNIQUE,
  from_address  TEXT    NOT NULL,
  to_address    TEXT    NOT NULL,
  amount        REAL    NOT NULL,
  fee           REAL    NOT NULL DEFAULT 0.001,
  data          TEXT    NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mempool_fee ON mempool(fee);

-- ─── mining_sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS mining_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  miner_address    TEXT    NOT NULL,
  block_id         INTEGER NULL,
  hashes_computed  INTEGER NOT NULL DEFAULT 0,
  duration_ms      INTEGER NOT NULL DEFAULT 0,
  hashrate         REAL    NOT NULL DEFAULT 0,
  success          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (block_id) REFERENCES blocks(id)
);
