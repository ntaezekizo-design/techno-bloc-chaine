'use strict';
const { query, queryOne, run } = require('../config/database');const { INITIAL_DIFFICULTY, MAX_DIFFICULTY, TARGET_BLOCK_TIME, COINBASE_ADDRESS } = require('../config/blockchain');
const Block       = require('./Block');
const Transaction = require('./Transaction');
const Wallet      = require('./Wallet');

class Blockchain {

  async getLatestBlock() {
    return queryOne('SELECT * FROM blocks ORDER BY block_index DESC LIMIT 1');
  }

  async getDifficulty() {
    const stats = await this.getStats();
    return parseInt(stats.difficulty) || INITIAL_DIFFICULTY;
  }

  async adjustDifficulty(currentHeight) {
    const currentDiff = await this.getDifficulty();
    if (currentHeight < 10 || currentHeight % 10 !== 0) return currentDiff;

    // SQLite : strftime('%s', ...) retourne les secondes Unix
    const row = await queryOne(`
      SELECT MIN(strftime('%s', created_at)) AS first_time,
             MAX(strftime('%s', created_at)) AS last_time
      FROM blocks WHERE block_index > ? AND block_index <= ?
    `, [currentHeight - 10, currentHeight]);
    if (!row || !row.first_time || !row.last_time) return currentDiff;

    const elapsed    = parseFloat(row.last_time) - parseFloat(row.first_time);
    const targetTime = TARGET_BLOCK_TIME * 10;
    const ratio      = elapsed / Math.max(targetTime, 1);

    let newDiff = currentDiff;
    if (ratio < 0.5 && currentDiff < MAX_DIFFICULTY) newDiff = Math.min(currentDiff + 1, MAX_DIFFICULTY);
    else if (ratio > 2.0 && currentDiff > 1)         newDiff = Math.max(currentDiff - 1, 1);

    if (newDiff !== currentDiff) {
      await run('UPDATE blockchain_stats SET difficulty = ? WHERE id = 1', [newDiff]);
    }
    return newDiff;
  }

  async mineNextBlock(minerAddress) {
    const latest   = await this.getLatestBlock();
    const prevHash = latest ? latest.hash : '0'.repeat(64);
    const newIndex = latest ? parseInt(latest.block_index) + 1 : 1;

    const difficulty = await this.adjustDifficulty(newIndex);
    const pendingTxs = await Transaction.getMempool(10);

    const block      = new Block(newIndex, prevHash, pendingTxs, difficulty, minerAddress);
    const durationMs = block.mineBlock(difficulty);
    const hashesEst  = block.nonce + 1;
    const hashrate   = durationMs > 0 ? Math.round((hashesEst / durationMs) * 1000 * 100) / 100 : 0;

    // Persister le bloc
    const blockResult = await run(
      `INSERT INTO blocks (block_index, hash, previous_hash, merkle_root, nonce, difficulty, miner_address, reward, tx_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [block.index, block.hash, block.previousHash, block.merkleRoot,
       block.nonce, block.difficulty, block.minerAddress, block.reward, pendingTxs.length]
    );
    const blockId = blockResult.insertId;

    // Confirmer les tx du mempool
    const txids = [];
    for (const tx of pendingTxs) {
      await Transaction.confirm(tx, blockId);
      if (tx.from_address !== COINBASE_ADDRESS) {
        await Wallet.updateBalance(tx.from_address, -(parseFloat(tx.amount) + parseFloat(tx.fee)));
        await Wallet.updateBalance(tx.to_address, parseFloat(tx.amount));
      }
      txids.push(tx.txid);
    }
    if (txids.length > 0) await Transaction.clearFromMempool(txids);

    // Récompense du mineur
    if (block.reward > 0) {
      await Transaction.addCoinbase(minerAddress, block.reward, blockId);
      await Wallet.updateBalance(minerAddress, block.reward);
    }

    // Mettre à jour les stats globales
    await run(
      `UPDATE blockchain_stats
       SET total_blocks = total_blocks + 1,
           total_supply = total_supply + ?,
           total_transactions = total_transactions + ?,
           last_block_time = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [block.reward, pendingTxs.length + 1]
    );

    // Journaliser la session de minage
    await run(
      `INSERT INTO mining_sessions (miner_address, block_id, hashes_computed, duration_ms, hashrate, success)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [minerAddress, blockId, hashesEst, durationMs, hashrate]
    );

    return {
      block:       block.toObject(),
      block_id:    blockId,
      duration_ms: durationMs,
      hashes:      hashesEst,
      hashrate,
      tx_included: pendingTxs.length,
      reward:      block.reward,
    };
  }

  async getBlocks(page = 1, perPage = 10) {
    const offset = (page - 1) * perPage;
    return query('SELECT * FROM blocks ORDER BY block_index DESC LIMIT ? OFFSET ?', [perPage, offset]);
  }

  async getBlock(q) {
    if (/^\d+$/.test(q)) {
      return queryOne('SELECT * FROM blocks WHERE block_index = ?', [q]);
    }
    return queryOne('SELECT * FROM blocks WHERE hash = ?', [q]);
  }

  async getStats() {
    const stats = await queryOne('SELECT * FROM blockchain_stats WHERE id = 1') || {};

    // COUNT(*) retourne un string en PostgreSQL → toujours parseInt
    const walletsRow = await queryOne('SELECT COUNT(*) AS c FROM wallets');
    const mempoolRow = await queryOne('SELECT COUNT(*) AS c FROM mempool');

    stats.total_wallets  = parseInt(walletsRow?.c ?? 0) || 0;
    stats.mempool_count  = parseInt(mempoolRow?.c ?? 0) || 0;

    const supply = parseFloat(stats.total_supply) || 0;
    const maxSup = require('../config/blockchain').MAX_SUPPLY;
    stats.circulation_pct = maxSup > 0
      ? Math.round((supply / maxSup) * 100 * 10000) / 10000
      : 0;

    return stats;
  }

  async isChainValid() {
    const blocks = await query('SELECT * FROM blocks ORDER BY block_index ASC');
    for (let i = 1; i < blocks.length; i++) {
      const cur  = blocks[i];
      const prev = blocks[i - 1];
      if (cur.previous_hash !== prev.hash) return false;
      if (!cur.hash.startsWith('0'.repeat(parseInt(cur.difficulty)))) return false;
    }
    return true;
  }

  async getHashrateHistory(n = 20) {
    const rows = await query(
      `SELECT ms.hashrate, ms.duration_ms, b.block_index, b.created_at
       FROM mining_sessions ms
       JOIN blocks b ON ms.block_id = b.id
       WHERE ms.success = 1
       ORDER BY b.block_index DESC
       LIMIT ?`,
      [n]
    );
    return rows.reverse();
  }
}

module.exports = Blockchain;
