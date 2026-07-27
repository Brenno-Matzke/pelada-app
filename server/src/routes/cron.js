const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');
const { sendPushToUsers } = require('../push');

const router = express.Router();
const TZ = 'America/Sao_Paulo';

// Reminders fire this many days after the pelada's date — day 1 (the day
// after) and day 4 (a second nudge later in the week) — computed off the
// actual pelada date rather than hardcoded weekdays, so it keeps working
// if the game ever moves off Sunday.
const REMINDER_OFFSET_DAYS = [1, 4];

function dateStringInTZ(date) {
  // en-CA gives YYYY-MM-DD directly, matching the "date" column format.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
}

function addDays(dateStr, days) {
  // Noon UTC (not midnight) so formatting the result in America/Sao_Paulo
  // (UTC-3) — or any realistic timezone — can never roll it back to the
  // previous calendar day.
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dateStringInTZ(dt);
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

  const isReminderDay = REMINDER_OFFSET_DAYS.some((offset) => addDays(pelada.date, offset) === today);
  if (!isReminderDay) {
    return res.json({ sent: 0, reason: 'Hoje não é um dos dias de lembrete' });
  }

  const alreadySent = await db.get(
    'SELECT id FROM payment_reminders_log WHERE pelada_id = ? AND sent_date = ?',
    pelada.id,
    today
  );
  if (alreadySent) {
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

  await db.run(
    'INSERT INTO payment_reminders_log (pelada_id, sent_date) VALUES (?, ?)',
    pelada.id,
    today
  );

  res.json({ sent: unpaid.length });
}));

module.exports = router;
