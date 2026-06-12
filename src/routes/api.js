'use strict';
const express     = require('express');
const router      = express.Router();
const Blockchain  = require('../models/Blockchain');
const Transaction = require('../models/Transaction');
const Wallet      = require('../models/Wallet');
const { query, queryOne } = require('../config/database');
const { COIN_NAME, COIN_SYMBOL, MAX_SUPPLY } = require('../config/blockchain');

/** Extrait toujours un message d'erreur lisible */
function errMsg(e) {
  return e?.message || e?.toString() || 'Erreur inconnue';
}

// ─── GET /api/stats ────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const blockchain  = new Blockchain();
    const stats       = await blockchain.getStats();
    const history     = await blockchain.getHashrateHistory(20);
    const topMiners   = await query(`
      SELECT miner_address, COUNT(*) AS blocks_mined, SUM(reward) AS total_earned
      FROM blocks WHERE miner_address != 'GENESIS'
      GROUP BY miner_address ORDER BY blocks_mined DESC LIMIT 10
    `);
    const avgHashrate = history.length
      ? Math.round(history.reduce((s, h) => s + parseFloat(h.hashrate), 0) / history.length * 100) / 100
      : 0;
    res.json({
      success: true, stats, hashrate_history: history,
      avg_hashrate: avgHashrate, top_miners: topMiners,
      coin: { name: COIN_NAME, symbol: COIN_SYMBOL, max_supply: MAX_SUPPLY },
    });
  } catch (e) {
    console.error('[/api/stats]', errMsg(e));
    res.status(500).json({ success: false, error: errMsg(e) });
  }
});

// ─── GET /api/chain ────────────────────────────────────────────────────────
router.get('/chain', async (req, res) => {
  try {
    const blockchain = new Blockchain();
    if (req.query.block) {
      const block = await blockchain.getBlock(req.query.block);
      if (!block) return res.status(404).json({ success: false, error: 'Bloc introuvable' });
      const txs = await query('SELECT * FROM transactions WHERE block_id = ? ORDER BY created_at ASC', [block.id]);
      block.transactions = txs;
      return res.json({ success: true, block });
    }
    const page    = Math.max(1, parseInt(req.query.page || '1'));
    const perPage = Math.min(50, Math.max(5, parseInt(req.query.per_page || '10')));
    const blocks  = await blockchain.getBlocks(page, perPage);
    const row     = await queryOne('SELECT COUNT(*) AS c FROM blocks');
    const total   = parseInt(row?.c) || 0;
    res.json({
      success: true, blocks, total, page, per_page: perPage,
      valid_chain: await blockchain.isChainValid(),
    });
  } catch (e) {
    console.error('[/api/chain]', errMsg(e));
    res.status(500).json({ success: false, error: errMsg(e) });
  }
});

// ─── POST /api/mine ────────────────────────────────────────────────────────
router.post('/mine', async (req, res) => {
  try {
    const minerAddress = (req.body?.miner_address || req.query.miner_address || '').trim();
    if (!minerAddress) return res.status(400).json({ success: false, error: 'miner_address est requis' });
    await Wallet.upsert(minerAddress);
    const result = await new Blockchain().mineNextBlock(minerAddress);
    res.json({ success: true, message: 'Bloc miné avec succès !', data: result });
  } catch (e) {
    console.error('[/api/mine POST]', errMsg(e));
    res.status(500).json({ success: false, error: errMsg(e) });
  }
});

router.get('/mine', async (req, res) => {
  const minerAddress = (req.query.miner_address || '').trim();
  if (!minerAddress) return res.status(400).json({ success: false, error: 'miner_address est requis' });
  try {
    await Wallet.upsert(minerAddress);
    const result = await new Blockchain().mineNextBlock(minerAddress);
    res.json({ success: true, message: 'Bloc miné avec succès !', data: result });
  } catch (e) {
    console.error('[/api/mine GET]', errMsg(e));
    res.status(500).json({ success: false, error: errMsg(e) });
  }
});

// ─── GET|POST /api/transaction ─────────────────────────────────────────────
router.get('/transaction', async (req, res) => {
  try {
    if (req.query.mempool) {
      const txs = await Transaction.getMempool(50);
      return res.json({ success: true, mempool: txs, count: txs.length });
    }
    if (req.query.address) {
      const txs = await Transaction.getHistory(req.query.address, 50);
      return res.json({ success: true, transactions: txs, count: txs.length });
    }
    const txs = await Transaction.getRecent(30);
    res.json({ success: true, transactions: txs, count: txs.length });
  } catch (e) {
    console.error('[/api/transaction GET]', errMsg(e));
    res.status(500).json({ success: false, error: errMsg(e) });
  }
});

router.post('/transaction', async (req, res) => {
  try {
    const { MIN_FEE } = require('../config/blockchain');
    const from   = (req.body?.from_address || '').trim();
    const to     = (req.body?.to_address   || '').trim();
    const amount = parseFloat(req.body?.amount || 0);
    const fee    = Math.max(parseFloat(req.body?.fee || MIN_FEE), MIN_FEE);
    const v = await Transaction.validate(from, to, amount, fee);
    if (!v.valid) return res.status(400).json({ success: false, error: v.error });
    const tx = await Transaction.addToMempool(from, to, amount, fee);
    res.json({ success: true, transaction: tx, message: 'Transaction ajoutée au mempool' });
  } catch (e) {
    console.error('[/api/transaction POST]', errMsg(e));
    res.status(500).json({ success: false, error: errMsg(e) });
  }
});

// ─── GET|POST /api/wallet ──────────────────────────────────────────────────
router.get('/wallet', async (req, res) => {
  try {
    if (req.query.address) {
      const wallet = await Wallet.getByAddress(req.query.address);
      if (!wallet) return res.status(404).json({ success: false, error: 'Portefeuille introuvable' });
      const row = await queryOne(
        'SELECT COUNT(*) AS c FROM transactions WHERE from_address=? OR to_address=?',
        [req.query.address, req.query.address]
      );
      wallet.tx_count = parseInt(row?.c) || 0;
      return res.json({ success: true, wallet });
    }
    const wallets = await Wallet.getAll();
    res.json({ success: true, wallets, count: wallets.length });
  } catch (e) {
    console.error('[/api/wallet GET]', errMsg(e));
    res.status(500).json({ success: false, error: errMsg(e) });
  }
});

router.post('/wallet', async (req, res) => {
  try {
    const label  = (req.body?.label || 'My Wallet').trim();
    const wallet = await Wallet.create(label);
    res.json({ success: true, wallet });
  } catch (e) {
    console.error('[/api/wallet POST]', errMsg(e));
    res.status(500).json({ success: false, error: errMsg(e) });
  }
});

module.exports = router;
