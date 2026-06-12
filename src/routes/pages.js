'use strict';
const express      = require('express');
const router       = express.Router();
const Blockchain   = require('../models/Blockchain');
const Wallet       = require('../models/Wallet');
const { requireAuth }    = require('../middleware/auth');
const { INITIAL_DIFFICULTY } = require('../config/blockchain');

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  res.render('index', {
    pageTitle:    'Tableau de bord',
    pageSubtitle: 'Aperçu en direct du réseau EZEKIZO',
    pageActive:   'index',
  });
});

// ─── Mine ─────────────────────────────────────────────────────────────────────
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const [wallets, stats] = await Promise.all([
      Wallet.getByUser(userId),
      new Blockchain().getStats(),
    ]);
    const difficulty = parseInt(stats.difficulty) || INITIAL_DIFFICULTY;
    res.render('mine', {
      pageTitle:    'Minage',
      pageSubtitle: 'Minez EZEKIZO (EZK) avec le Proof-of-Work',
      pageActive:   'mine',
      wallets,
      difficulty,
    });
  } catch (e) {
    res.render('mine', {
      pageTitle:    'Minage',
      pageSubtitle: '',
      pageActive:   'mine',
      wallets:      [],
      difficulty:   INITIAL_DIFFICULTY,
    });
  }
});

// ─── Wallets ──────────────────────────────────────────────────────────────────
router.get('/wallet', requireAuth, async (req, res) => {
  try {
    const userId  = req.session.userId;
    const wallets = await Wallet.getByUser(userId);
    res.render('wallet', {
      pageTitle:    'Mes Portefeuilles',
      pageSubtitle: 'Gérer vos portefeuilles EZEKIZO',
      pageActive:   'wallet',
      wallets,
    });
  } catch (e) {
    res.render('wallet', {
      pageTitle:    'Mes Portefeuilles',
      pageSubtitle: '',
      pageActive:   'wallet',
      wallets:      [],
    });
  }
});

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const userId      = req.session.userId;
    const wallets     = await Wallet.getByUser(userId);
    const fromAddress = req.query.from    || '';
    const viewAddress = req.query.address || '';
    res.render('transactions', {
      pageTitle:    'Transactions',
      pageSubtitle: "Envoyer de l'EZK et consulter l'historique",
      pageActive:   'transactions',
      wallets,
      fromAddress,
      viewAddress,
    });
  } catch (e) {
    res.render('transactions', {
      pageTitle:    'Transactions',
      pageSubtitle: '',
      pageActive:   'transactions',
      wallets:      [],
      fromAddress:  '',
      viewAddress:  '',
    });
  }
});

// ─── Explorer (public — no auth required) ─────────────────────────────────────
router.get('/explorer', (req, res) => {
  res.render('explorer', {
    pageTitle:    'Explorateur de Blocs',
    pageSubtitle: "Visualisez et explorez l'intégralité de la blockchain",
    pageActive:   'explorer',
  });
});

// ─── Network stats (public) ───────────────────────────────────────────────────
router.get('/network', (req, res) => {
  res.render('network', {
    pageTitle:    'Statistiques Réseau',
    pageSubtitle: 'Performances de minage et état du réseau',
    pageActive:   'network',
  });
});

module.exports = router;
