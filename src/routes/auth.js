'use strict';
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');

// ─── GET /login ──────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/');
  res.render('login', {
    pageTitle:    'Connexion',
    pageSubtitle: 'Accédez à votre espace EZEKIZO',
    pageActive:   'login',
    error:        null,
  });
});

// ─── POST /login ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.render('login', {
      pageTitle: 'Connexion', pageSubtitle: '', pageActive: 'login',
      error: 'Veuillez remplir tous les champs.',
    });
  }
  try {
    const user = await User.findByCredentials(login.trim(), password);
    if (!user) {
      return res.render('login', {
        pageTitle: 'Connexion', pageSubtitle: '', pageActive: 'login',
        error: 'Identifiants incorrects. Réessayez.',
      });
    }
    req.session.userId   = user.id;
    req.session.username = user.username;
    res.redirect('/');
  } catch (e) {
    console.error('[/login POST]', e.message);
    res.render('login', {
      pageTitle: 'Connexion', pageSubtitle: '', pageActive: 'login',
      error: 'Erreur serveur. Réessayez.',
    });
  }
});

// ─── GET /register ───────────────────────────────────────────────────────────
router.get('/register', (req, res) => {
  if (req.session?.userId) return res.redirect('/');
  res.render('register', {
    pageTitle:    'Créer un compte',
    pageSubtitle: 'Rejoignez le réseau EZEKIZO',
    pageActive:   'register',
    error:        null,
    values:       {},
  });
});

// ─── POST /register ──────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password, confirm } = req.body || {};
  const values = { username, email };

  if (!username || !email || !password || !confirm) {
    return res.render('register', {
      pageTitle: 'Créer un compte', pageSubtitle: '', pageActive: 'register',
      error: 'Tous les champs sont obligatoires.', values,
    });
  }
  if (password !== confirm) {
    return res.render('register', {
      pageTitle: 'Créer un compte', pageSubtitle: '', pageActive: 'register',
      error: 'Les mots de passe ne correspondent pas.', values,
    });
  }
  if (password.length < 8) {
    return res.render('register', {
      pageTitle: 'Créer un compte', pageSubtitle: '', pageActive: 'register',
      error: 'Le mot de passe doit contenir au moins 8 caractères.', values,
    });
  }
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.render('register', {
      pageTitle: 'Créer un compte', pageSubtitle: '', pageActive: 'register',
      error: 'Adresse email invalide.', values,
    });
  }

  try {
    const user = await User.create(username.trim(), email.trim().toLowerCase(), password);
    req.session.userId   = user.id;
    req.session.username = user.username;
    res.redirect('/');
  } catch (e) {
    res.render('register', {
      pageTitle: 'Créer un compte', pageSubtitle: '', pageActive: 'register',
      error: e.message || 'Erreur lors de la création du compte.',
      values,
    });
  }
});

// ─── GET /logout ─────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
