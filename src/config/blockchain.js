'use strict';
const crypto = require('crypto');

const COIN_NAME          = 'EZEKIZO';
const COIN_SYMBOL        = 'EZK';
const BLOCK_REWARD       = 50.0;
const MAX_SUPPLY         = 21_000_000.0;
const INITIAL_DIFFICULTY = 4;
const MAX_DIFFICULTY     = 8;
const TARGET_BLOCK_TIME  = 60;   // seconds
const HALVING_INTERVAL   = 210_000;
const MIN_FEE            = 0.001;
const COINBASE_ADDRESS   = 'COINBASE';

/** Calculate block reward with halving */
function getBlockReward(height) {
  const halvings = Math.floor(height / HALVING_INTERVAL);
  if (halvings >= 64) return 0;
  return BLOCK_REWARD / Math.pow(2, halvings);
}

/** Format EZK amount */
function formatEzk(amount) {
  return parseFloat(amount).toFixed(8) + ' ' + COIN_SYMBOL;
}

/** Generate a unique transaction ID */
function generateTxId(from, to, amount, timestamp) {
  const data = from + to + amount + timestamp + Math.random().toString();
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  COIN_NAME, COIN_SYMBOL, BLOCK_REWARD, MAX_SUPPLY,
  INITIAL_DIFFICULTY, MAX_DIFFICULTY, TARGET_BLOCK_TIME,
  HALVING_INTERVAL, MIN_FEE, COINBASE_ADDRESS,
  getBlockReward, formatEzk, generateTxId,
};
