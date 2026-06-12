'use strict';
const bcrypt         = require('bcryptjs');
const { query, queryOne, run } = require('../config/database');

class User {

  static async create(username, email, password) {
    const exists = await queryOne(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (exists) throw new Error('Nom d\'utilisateur ou email déjà utilisé');

    const hash = await bcrypt.hash(password, 12);
    const result = await run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );
    return { id: result.insertId, username, email };
  }

  static async findByCredentials(login, password) {
    // login peut être username ou email
    const user = await queryOne(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [login, login]
    );
    if (!user) return null;
    const match = await bcrypt.compare(password, user.password_hash);
    return match ? user : null;
  }

  static async findById(id) {
    return queryOne('SELECT id, username, email, created_at FROM users WHERE id = ?', [id]);
  }
}

module.exports = User;
