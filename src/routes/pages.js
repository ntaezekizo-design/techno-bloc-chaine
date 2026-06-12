'use strict';
const express    = require('express');
const router     = express.Router();
const Blockchain = require('../models/Blockchain');
const Wallet     = require('../models/Wallet');
const { INITIAL_DIFFICULTY } = require('../config/blockchain');

router.get('/', async (req, res) => {
  res.render('index', { pageTitle: 'Tableau de bord', pageSubtitle: 'Aperçu en direct du réseau EZEKIZO', pageActive: 'index' });
});

router.get('/mine', async (req, res) => {
  try {
    const [wallets, blockchain] = await Promise.all([Wallet.getAll(), new Blockchain().getStats()]);
    const difficulty = parseInt(blockchain.difficulty) || INITIAL_DIFFICULTY;
    res.render('mine', { pageTitle: 'Minage', pageSubtitle: 'Minez EZEKIZO (EZK) avec le Proof-of-Work', pageActive: 'mine', wallets, difficulty });
  } catch (e) {
    res.render('mine', { pageTitle: 'Minage', pageSubtitle: '', pageActive: 'mine', wallets: [], difficulty: INITIAL_DIFFICULTY });
  }
});

router.get('/wallet', async (req, res) => {
  try {
    const wallets = await Wallet.getAll();
    res.render('wallet', { pageTitle: 'Portefeuilles', pageSubtitle: 'Gérer vos portefeuilles EZEKIZO', pageActive: 'wallet', wallets });
  } catch (e) {
    res.render('wallet', { pageTitle: 'Portefeuilles', pageSubtitle: '', pageActive: 'wallet', wallets: [] });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const wallets     = await Wallet.getAll();
    const fromAddress = req.query.from    || '';
    const viewAddress = req.query.address || '';
    res.render('transactions', { pageTitle: 'Transactions', pageSubtitle: "Envoyer de l'EZK et consulter l'historique", pageActive: 'transactions', wallets, fromAddress, viewAddress });
  } catch (e) {
    res.render('transactions', { pageTitle: 'Transactions', pageSubtitle: '', pageActive: 'transactions', wallets: [], fromAddress: '', viewAddress: '' });
  }
});

router.get('/explorer', (req, res) => {
  res.render('explorer', { pageTitle: 'Explorateur de Blocs', pageSubtitle: "Visualisez et explorez l'intégralité de la blockchain", pageActive: 'explorer' });
});

router.get('/network', (req, res) => {
  res.render('network', { pageTitle: 'Statistiques Réseau', pageSubtitle: 'Performances de minage et état du réseau', pageActive: 'network' });
});

module.exports = router;
