'use strict';

/**
 * requireAuth — middleware that protects page routes.
 * Redirects unauthenticated users to /login.
 */
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

/**
 * requireAuthApi — middleware for API routes.
 * Returns 401 JSON instead of redirecting.
 */
function requireAuthApi(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ success: false, error: 'Non authentifié. Veuillez vous connecter.' });
}

/**
 * injectUser — middleware that adds `res.locals.user` to every view.
 * Safe to use on all routes (sets null if not logged in).
 */
async function injectUser(req, res, next) {
  if (req.session?.userId) {
    res.locals.user = {
      id:       req.session.userId,
      username: req.session.username,
    };
  } else {
    res.locals.user = null;
  }
  next();
}

module.exports = { requireAuth, requireAuthApi, injectUser };
