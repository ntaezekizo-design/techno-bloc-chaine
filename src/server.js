'use strict';
require('dotenv').config();

const express = require('express');
const path    = require('path');
const morgan  = require('morgan');
const session = require('express-session');

const { injectUser } = require('./middleware/auth');

const app   = express();
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

// ─── View engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// HTTP request logger
app.use(morgan(isDev ? 'dev' : 'combined'));

// ─── Sessions ────────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'ezekizo-dev-secret-change-in-prod',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   !isDev, // HTTPS only in prod
    httpOnly: true,
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
}));

// ─── Security headers ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // CORS for API
  res.setHeader('Access-Control-Allow-Origin', isDev ? '*' : (process.env.ALLOWED_ORIGIN || '*'));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Inject authenticated user into all views ─────────────────────────────────
app.use(injectUser);

// ─── Pass env info to every view ─────────────────────────────────────────────
app.locals.isDev   = isDev;
app.locals.nodeEnv = process.env.NODE_ENV || 'development';

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/',    require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/',    require('./routes/pages'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status:  'ok',
  service: 'EZEKIZO',
  env:     process.env.NODE_ENV || 'development',
  time:    new Date().toISOString(),
}));

// ─── Debug route ──────────────────────────────────────────────────────────────
app.get('/api/debug', async (req, res) => {
  const { getDb } = require('./config/database');
  let dbStatus = 'erreur';
  let dbError  = null;
  try {
    const db = await getDb();
    db.exec('SELECT 1');
    dbStatus = 'connecté ✅';
  } catch (e) {
    dbError = e?.message || String(e);
  }
  res.json({
    env:       process.env.NODE_ENV,
    db_engine: 'SQLite (sql.js)',
    db_status: dbStatus,
    db_error:  dbError,
    node:      process.version,
    uptime:    Math.round(process.uptime()) + 's',
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).render('404', {
      pageTitle:    'Page introuvable',
      pageSubtitle: '',
      pageActive:   '',
    });
  }
  res.status(404).json({ error: 'Not found' });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const msg = err?.message || err?.toString() || 'Unknown error';
  if (isDev) console.error(err.stack);
  else console.error('[ERROR]', msg);
  res.status(500).json({ error: isDev ? msg : 'Internal server error' });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log('');
  console.log('  ⬡  EZEKIZO Blockchain');
  console.log(`  🚀  http://localhost:${PORT}`);
  console.log(`  ⚙️   Environnement : ${env.toUpperCase()}`);
  if (isDev) console.log('  👁️   Mode DEV — rechargement auto actif');
  console.log('  ✅  Base de données SQLite prête');
  console.log('');
});

module.exports = app;
