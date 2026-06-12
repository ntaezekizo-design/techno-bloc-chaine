'use strict';
const crypto = require('crypto');
const { getBlockReward, INITIAL_DIFFICULTY } = require('../config/blockchain');

class Block {
  constructor(index, previousHash, transactions = [], difficulty = INITIAL_DIFFICULTY, minerAddress = 'GENESIS') {
    this.index        = index;
    this.previousHash = previousHash;
    this.timestamp    = Math.floor(Date.now() / 1000);
    this.transactions = transactions;
    this.nonce        = 0;
    this.difficulty   = difficulty;
    this.minerAddress = minerAddress;
    this.reward       = getBlockReward(index);
    this.merkleRoot   = this._computeMerkleRoot();
    this.hash         = this.calculateHash();
  }

  calculateHash() {
    const data = String(this.index)
      + this.previousHash
      + String(this.timestamp)
      + this.merkleRoot
      + String(this.nonce)
      + String(this.difficulty)
      + this.minerAddress;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  _computeMerkleRoot() {
    if (!this.transactions || this.transactions.length === 0) {
      return '0'.repeat(64);
    }
    let txids = this.transactions.map(tx =>
      tx.txid || crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex')
    );
    while (txids.length > 1) {
      const newLevel = [];
      for (let i = 0; i < txids.length; i += 2) {
        const left  = txids[i];
        const right = txids[i + 1] || txids[i];
        newLevel.push(crypto.createHash('sha256').update(left + right).digest('hex'));
      }
      txids = newLevel;
    }
    return txids[0];
  }

  /** Proof-of-Work: increment nonce until hash has N leading zeros. Returns elapsed ms. */
  mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);
    const start  = Date.now();
    this.difficulty = difficulty;
    this.nonce      = 0;

    while (true) {
      this.hash = this.calculateHash();
      if (this.hash.startsWith(target)) break;
      this.nonce++;
    }
    return Date.now() - start;
  }

  isValid() {
    const target = '0'.repeat(this.difficulty);
    return this.hash.startsWith(target) && this.hash === this.calculateHash();
  }

  toObject() {
    return {
      index:         this.index,
      hash:          this.hash,
      previous_hash: this.previousHash,
      merkle_root:   this.merkleRoot,
      nonce:         this.nonce,
      difficulty:    this.difficulty,
      miner_address: this.minerAddress,
      reward:        this.reward,
      tx_count:      this.transactions.length,
      timestamp:     this.timestamp,
    };
  }
}

module.exports = Block;
