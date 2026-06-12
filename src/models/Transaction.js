'use strict';
const { query, queryOne, run } = require('../config/database');
const { generateTxId, MIN_FEE, COINBASE_ADDRESS } = require('../config/blockchain');

class Transaction {

  static async addToMempool(from, to, amount, fee = MIN_FEE) {
    const txid = generateTxId(from, to, amount, Date.now());
    await run(
      'INSERT INTO mempool (txid, from_address, to_address, amount, fee) VALUES (?, ?, ?, ?, ?)',
      [txid, from, to, amount, fee]
    );
    return { txid, from_address: from, to_address: to, amount, fee, status: 'pending' };
  }

  static async getMempool(limit = 10) {
    return query('SELECT * FROM mempool ORDER BY fee DESC LIMIT ?', [limit]);
  }

  static async clearFromMempool(txids) {
    if (!txids.length) return;
    const placeholders = txids.map(() => '?').join(',');
    await run(`DELETE FROM mempool WHERE txid IN (${placeholders})`, txids);
  }

  static async confirm(tx, blockId) {
    // SQLite supporte ON CONFLICT nativement
    await run(`
      INSERT INTO transactions (txid, from_address, to_address, amount, fee, block_id, status, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))
      ON CONFLICT(txid) DO UPDATE SET
        block_id     = excluded.block_id,
        status       = 'confirmed',
        confirmed_at = datetime('now')
    `, [tx.txid, tx.from_address, tx.to_address, tx.amount, tx.fee || 0, blockId]);
  }

  static async addCoinbase(minerAddress, reward, blockId) {
    const txid = generateTxId(COINBASE_ADDRESS, minerAddress, reward, Date.now());
    await run(`
      INSERT INTO transactions (txid, from_address, to_address, amount, fee, block_id, status, confirmed_at)
      VALUES (?, 'COINBASE', ?, ?, 0, ?, 'confirmed', datetime('now'))
    `, [txid, minerAddress, reward, blockId]);
  }

  static async getHistory(address, limit = 50) {
    return query(`
      SELECT t.*, b.block_index
      FROM transactions t
      LEFT JOIN blocks b ON t.block_id = b.id
      WHERE t.from_address = ? OR t.to_address = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `, [address, address, limit]);
  }

  static async getRecent(limit = 20) {
    return query(`
      SELECT t.*, b.block_index
      FROM transactions t
      LEFT JOIN blocks b ON t.block_id = b.id
      ORDER BY t.created_at DESC
      LIMIT ?
    `, [limit]);
  }

  static async getTotalCount() {
    const row = await queryOne("SELECT COUNT(*) AS c FROM transactions WHERE status='confirmed'");
    return parseInt(row?.c) || 0;
  }

  static async validate(from, to, amount, fee) {
    if (amount <= 0)   return { valid: false, error: 'Le montant doit être positif' };
    if (fee < MIN_FEE) return { valid: false, error: `Frais trop bas (min: ${MIN_FEE})` };
    if (from === to)   return { valid: false, error: 'Impossible de vous envoyer à vous-même' };

    const wallet = await queryOne('SELECT balance FROM wallets WHERE address = ?', [from]);
    if (!wallet)       return { valid: false, error: 'Portefeuille expéditeur introuvable' };
    if (parseFloat(wallet.balance) < amount + fee)
      return { valid: false, error: 'Solde insuffisant' };

    return { valid: true };
  }
}

module.exports = Transaction;
