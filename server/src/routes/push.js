const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

router.post('/subscribe', requireAuth, asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Inscrição de notificação inválida' });
  }

  const existing = await db.get('SELECT id FROM push_subscriptions WHERE endpoint = ?', endpoint);
  if (existing) {
    await db.run(
      'UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ? WHERE id = ?',
      req.user.id,
      keys.p256dh,
      keys.auth,
      existing.id
    );
  } else {
    await db.run(
      'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
      req.user.id,
      endpoint,
      keys.p256dh,
      keys.auth
    );
  }

  res.status(201).json({ ok: true });
}));

router.post('/unsubscribe', requireAuth, asyncHandler(async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint é obrigatório' });

  await db.run('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', endpoint, req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
