-- ============================================================
--  EZEKIZO CryptoMine — Schéma universel (MySQL + PostgreSQL)
--  • MySQL local   : mysql -u root -p cryptomine < schema.sql
--  • PostgreSQL    : psql $DATABASE_URL < schema.sql
-- ============================================================

-- ─── blockchain_stats ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS blockchain_stats (
  id                  INT             NOT NULL DEFAULT 1,
  total_supply        DECIMAL(20,8)   NOT NULL DEFAULT 0,
  difficulty          INT             NOT NULL DEFAULT 4,
  block_reward        DECIMAL(20,8)   NOT NULL DEFAULT 50,
  total_blocks        INT             NOT NULL DEFAULT 0,
  total_transactions  INT             NOT NULL DEFAULT 0,
  last_block_time     TIMESTAMP       NULL,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

INSERT INTO blockchain_stats (id, total_supply, difficulty, block_reward, total_blocks, total_transactions)
VALUES (1, 0, 4, 50, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ─── blocks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id              SERIAL          PRIMARY KEY,
  block_index     INT             NOT NULL UNIQUE,
  hash            VARCHAR(64)     NOT NULL,
  previous_hash   VARCHAR(64)     NOT NULL,
  merkle_root     VARCHAR(64)     NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  nonce           BIGINT          NOT NULL DEFAULT 0,
  difficulty      INT             NOT NULL DEFAULT 4,
  miner_address   VARCHAR(64)     NOT NULL DEFAULT 'GENESIS',
  reward          DECIMAL(20,8)   NOT NULL DEFAULT 0,
  tx_count        INT             NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocks_hash        ON blocks(hash);
CREATE INDEX IF NOT EXISTS idx_blocks_block_index ON blocks(block_index);

-- Bloc Genesis
INSERT INTO blocks (block_index, hash, previous_hash, merkle_root, nonce, difficulty, miner_address, reward, tx_count)
VALUES (
  0,
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000',
  0, 4, 'GENESIS', 0, 0
)
ON CONFLICT (block_index) DO NOTHING;

-- ─── wallets ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id          SERIAL        PRIMARY KEY,
  address     VARCHAR(64)   NOT NULL UNIQUE,
  public_key  TEXT          NOT NULL,
  label       VARCHAR(100)  NOT NULL DEFAULT 'My Wallet',
  balance     DECIMAL(20,8) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);

-- ─── transactions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL        PRIMARY KEY,
  txid          VARCHAR(64)   NOT NULL UNIQUE,
  from_address  VARCHAR(64)   NOT NULL DEFAULT 'COINBASE',
  to_address    VARCHAR(64)   NOT NULL,
  amount        DECIMAL(20,8) NOT NULL,
  fee           DECIMAL(20,8) NOT NULL DEFAULT 0,
  block_id      INT           NULL,
  status        VARCHAR(10)   NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at  TIMESTAMP     NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_txid   ON transactions(txid);
CREATE INDEX IF NOT EXISTS idx_tx_from   ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_to     ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

-- ─── mempool ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mempool (
  id            SERIAL        PRIMARY KEY,
  txid          VARCHAR(64)   NOT NULL UNIQUE,
  from_address  VARCHAR(64)   NOT NULL,
  to_address    VARCHAR(64)   NOT NULL,
  amount        DECIMAL(20,8) NOT NULL,
  fee           DECIMAL(20,8) NOT NULL DEFAULT 0.001,
  data          TEXT          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mempool_fee ON mempool(fee);

-- ─── mining_sessions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS mining_sessions (
  id               SERIAL        PRIMARY KEY,
  miner_address    VARCHAR(64)   NOT NULL,
  block_id         INT           NULL,
  hashes_computed  BIGINT        NOT NULL DEFAULT 0,
  duration_ms      INT           NOT NULL DEFAULT 0,
  hashrate         DECIMAL(20,2) NOT NULL DEFAULT 0,
  success          SMALLINT      NOT NULL DEFAULT 0,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
