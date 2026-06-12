'use strict';
require('dotenv').config();

const express = require('express');
const path    = require('path');
const morgan  = require('morgan');

const app     = express();
const isDev   = (process.env.NODE_ENV || 'development') !== 'production';

// ─── View engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// HTTP request logger — verbose in dev, compact in prod
app.use(morgan(isDev ? 'dev' : 'combined'));

// ─── Security headers (basic, no extra dependency) ───────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // CORS (API access)
  res.setHeader('Access-Control-Allow-Origin', isDev ? '*' : (process.env.ALLOWED_ORIGIN || '*'));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Pass env info to every view (app.locals = accessible dans tous les EJS) ─
app.locals.isDev   = isDev;
app.locals.nodeEnv = process.env.NODE_ENV || 'development';

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/api'));
app.use('/',    require('./routes/pages'));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status:  'ok',
  service: 'EZEKIZO',
  env:     process.env.NODE_ENV || 'development',
  time:    new Date().toISOString(),
}));

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (isDev) console.error(err.stack);
  res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log('');
  console.log('  ⬡  EZEKIZO Blockchain');
  console.log(`  🚀  http://localhost:${PORT}`);
  console.log(`  ⚙️   Environnement : ${env.toUpperCase()}`);
  console.log(`  🗄️   DB Host        : ${process.env.DB_HOST || process.env.DATABASE_URL ? '(DATABASE_URL)' : 'localhost'}`);
  if (isDev) {
    console.log('  👁️   Mode DEV actif — rechargement automatique activé');
  }
  console.log('');
});

module.exports = app;
