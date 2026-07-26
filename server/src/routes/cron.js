const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');
const { sendPushToUsers } = require('../push');

const router = express.Router();
const TZ = 'America/Sao_Paulo';

function dateStringInTZ(date) {
  // en-CA gives YYYY-MM-DD directly, matching the "date" column format.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
}

function requireCronSecret(req, res, next) {
  const provided = req.query.secret || req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

router.get('/payment-reminders', requireCronSecret, asyncHandler(async (req, res) => {
  const pelada = await db.get('SELECT * FROM peladas ORDER BY id LIMIT 1');
  const today = dateStringInTZ(new Date());
  const yesterday = dateStringInTZ(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (pelada.date !== yesterday) {
    return res.json({ sent: 0, reason: 'A pelada não foi ontem' });
  }
  if (pelada.payment_reminder_sent_date === today) {
    return res.json({ sent: 0, reason: 'Lembrete já enviado hoje' });
  }

  const unpaid = await db.all(
    `SELECT u.id FROM pelada_players pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.pelada_id = ? AND pp.status = 'confirmed' AND pp.paid = 0`,
    pelada.id
  );

  await sendPushToUsers(unpaid.map((u) => u.id), {
    title: 'Lembrete de pagamento',
    body: 'Não esquece de pagar a pelada de domingo!',
    url: '/pagamento',
  });

  await db.run('UPDATE peladas SET payment_reminder_sent_date = ? WHERE id = ?', today, pelada.id);

  res.json({ sent: unpaid.length });
}));

module.exports = router;
