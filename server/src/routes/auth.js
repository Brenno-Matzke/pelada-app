const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../email');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

const SKILL_LEVELS = ['Iniciante', 'Intermediário', 'Avançado', 'Profissional'];
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    skillLevel: user.skill_level,
    isAdmin: !!user.is_admin,
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
  }

  const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'E-mail já cadastrado' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const userCount = await db.get('SELECT COUNT(*) AS c FROM users');
  const isFirstUser = userCount.c === 0;

  const info = await db.run(
    'INSERT INTO users (name, email, password_hash, skill_level, is_admin) VALUES (?, ?, ?, ?, ?)',
    name.trim(),
    email.toLowerCase().trim(),
    passwordHash,
    'Intermediário',
    isFirstUser ? 1 : 0
  );

  const user = await db.get('SELECT * FROM users WHERE id = ?', info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

  const user = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos' });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

  const user = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase().trim());
  // Always respond 200 even if the e-mail doesn't exist, so this endpoint
  // can't be used to enumerate registered accounts.
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    await db.run(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      user.id,
      hashToken(token),
      expiresAt
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/redefinir-senha?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  res.json({ ok: true });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });

  const row = await db.get(
    'SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used = 0',
    hashToken(token)
  );
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Link inválido ou expirado. Peça um novo.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', passwordHash, row.user_id);
  await db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', row.id);

  res.json({ ok: true });
}));

module.exports = { router, SKILL_LEVELS, publicUser };
