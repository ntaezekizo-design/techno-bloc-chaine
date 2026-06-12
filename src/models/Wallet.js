'use strict';
const crypto = require('crypto');
const { query, queryOne, run } = require('../config/database');

class Wallet {
  static generateAddress() {
    const entropy   = crypto.randomBytes(32);
    const publicKey = crypto.createHash('sha256')
      .update(entropy.toString('hex') + Date.now() + Math.random())
      .digest('hex');
    const checksum = publicKey.substring(0, 8);
    return 'MINE' + publicKey.substring(0, 52).toUpperCase() + checksum;
  }

  /**
   * Create a new wallet, optionally linked to a user account.
   * @param {string} label
   * @param {number|null} userId
   */
  static async create(label = 'My Wallet', userId = null) {
    const address = Wallet.generateAddress();
    const pubKey  = crypto.createHash('sha256').update(address + Date.now()).digest('hex');
    const result  = await run(
      'INSERT INTO wallets (address, public_key, label, balance, user_id) VALUES (?, ?, ?, 0, ?)',
      [address, pubKey, label, userId]
    );
    return { id: result.insertId, address, public_key: pubKey, label, balance: 0, user_id: userId };
  }

  /** All wallets (admin / explorer view) */
  static async getAll() {
    return query('SELECT id, address, label, balance, created_at FROM wallets ORDER BY balance DESC');
  }

  /** Wallets belonging to a specific user */
  static async getByUser(userId) {
    return query(
      'SELECT id, address, label, balance, created_at FROM wallets WHERE user_id = ? ORDER BY balance DESC',
      [userId]
    );
  }

  static async getByAddress(address) {
    return queryOne('SELECT * FROM wallets WHERE address = ?', [address]);
  }

  static async updateBalance(address, delta) {
    await run('UPDATE wallets SET balance = balance + ? WHERE address = ?', [delta, address]);
  }

  static async getBalance(address) {
    const row = await queryOne('SELECT balance FROM wallets WHERE address = ?', [address]);
    return row ? parseFloat(row.balance) : 0;
  }

  static async getTopWallets(limit = 10) {
    return query('SELECT address, label, balance FROM wallets ORDER BY balance DESC LIMIT ?', [limit]);
  }

  /** Used when a miner address arrives from the API — create only if not already present */
  static async upsert(address) {
    await run(
      "INSERT OR IGNORE INTO wallets (address, public_key, label) VALUES (?, ?, 'Miner Wallet')",
      [address, crypto.createHash('sha256').update(address).digest('hex')]
    );
  }
}

module.exports = Wallet;
