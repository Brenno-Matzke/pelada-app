const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { SKILL_LEVELS, publicUser } = require('./auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const users = await db.all('SELECT * FROM users ORDER BY name ASC');
  res.json({ users: users.map(publicUser) });
}));

router.patch('/:userId/admin', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { isAdmin } = req.body || {};
  if (typeof isAdmin !== 'boolean') return res.status(400).json({ error: 'isAdmin deve ser true ou false' });

  const target = await db.get('SELECT * FROM users WHERE id = ?', userId);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (!isAdmin) {
    const adminCount = await db.get('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1');
    if (target.is_admin && adminCount.c <= 1) {
      return res.status(409).json({ error: 'Precisa existir ao menos um admin' });
    }
  }

  await db.run('UPDATE users SET is_admin = ? WHERE id = ?', isAdmin ? 1 : 0, userId);
  const updated = await db.get('SELECT * FROM users WHERE id = ?', userId);
  res.json({ user: publicUser(updated) });
}));

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const { name, skillLevel, avatarUrl } = req.body || {};
  const updates = [];
  const params = [];

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Nome não pode ser vazio' });
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (skillLevel !== undefined) {
    if (!SKILL_LEVELS.includes(skillLevel)) return res.status(400).json({ error: 'Nível inválido' });
    updates.push('skill_level = ?');
    params.push(skillLevel);
  }
  if (avatarUrl !== undefined) {
    if (avatarUrl !== null) {
      if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Foto inválida' });
      }
      if (avatarUrl.length > 800_000) {
        return res.status(400).json({ error: 'Foto muito grande' });
      }
    }
    updates.push('avatar_url = ?');
    params.push(avatarUrl);
  }
  if (!updates.length) return res.status(400).json({ error: 'Nada para atualizar' });

  params.push(req.user.id);
  await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...params);

  const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  res.json({ user: publicUser(user) });
}));

module.exports = router;
