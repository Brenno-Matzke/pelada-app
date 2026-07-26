const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');
const { sendPushToAll } = require('../push');

const router = express.Router();

const SKILL_WEIGHT = { Iniciante: 1, 'Intermediário': 2, 'Avançado': 3, Profissional: 4 };
const TEAM_SIZE = 6;

function initial(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

async function getCurrentPelada() {
  return db.get('SELECT * FROM peladas ORDER BY id LIMIT 1');
}

async function getRows(peladaId) {
  return db.all(
    `SELECT pp.id, pp.status, pp.paid, pp.team_number AS teamNumber, pp.joined_at AS joinedAt,
            u.id AS userId, u.name, u.skill_level AS skillLevel, u.avatar_url AS avatarUrl
     FROM pelada_players pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.pelada_id = ?
     ORDER BY pp.joined_at ASC, pp.id ASC`,
    peladaId
  );
}

/** Move the earliest waitlist row into a confirmed slot. Returns the promoted row, if any. */
async function promoteNextWaitlisted(peladaId) {
  const next = await db.get(
    `SELECT * FROM pelada_players WHERE pelada_id = ? AND status = 'waitlist' ORDER BY joined_at ASC, id ASC LIMIT 1`,
    peladaId
  );
  if (next) {
    await db.run(`UPDATE pelada_players SET status = 'confirmed' WHERE id = ?`, next.id);
  }
  return next;
}

async function serializeState(peladaId, requestingUserId) {
  const pelada = await db.get('SELECT * FROM peladas WHERE id = ?', peladaId);
  const rows = await getRows(peladaId);
  const confirmedRows = rows.filter((r) => r.status === 'confirmed');
  const waitlistRows = rows.filter((r) => r.status === 'waitlist');

  const perPerson = confirmedRows.length ? pelada.total_value / confirmedRows.length : 0;

  const confirmed = confirmedRows.map((r) => ({
    id: r.userId,
    name: r.name,
    initial: initial(r.name),
    avatarUrl: r.avatarUrl || null,
    skillLevel: r.skillLevel,
    levelLabel: `(${r.skillLevel})`,
    paid: !!r.paid,
    isMe: r.userId === requestingUserId,
    oweLabel: r.paid ? 'Em dia' : `Deve R$ ${perPerson.toFixed(2).replace('.', ',')}`,
    teamNumber: r.teamNumber,
  }));

  const waitlist = waitlistRows.map((r) => ({
    id: r.userId,
    name: r.name,
    initial: initial(r.name),
    avatarUrl: r.avatarUrl || null,
    skillLevel: r.skillLevel,
    isMe: r.userId === requestingUserId,
  }));

  const teamCount = Math.max(1, Math.ceil(pelada.capacity / TEAM_SIZE));
  const teams = Array.from({ length: teamCount }, (_, i) => i + 1).map((num) => {
    const members = confirmed.filter((p) => p.teamNumber === num);
    return { number: num, label: `Time ${num}`, members, countLabel: `${members.length}/${TEAM_SIZE}` };
  });

  const me = rows.find((r) => r.userId === requestingUserId) || null;

  return {
    pelada: {
      id: pelada.id,
      date: pelada.date,
      startTime: pelada.start_time,
      endTime: pelada.end_time,
      totalValue: pelada.total_value,
      listaAberta: !!pelada.lista_aberta,
      capacity: pelada.capacity,
    },
    confirmed,
    waitlist,
    teams,
    confirmedCount: confirmed.length,
    paidCount: confirmed.filter((p) => p.paid).length,
    perPerson: Number(perPerson.toFixed(2)),
    me: me ? { status: me.status, paid: !!me.paid, teamNumber: me.teamNumber } : null,
  };
}

router.get('/current', requireAuth, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  res.json(await serializeState(pelada.id, req.user.id));
}));

router.patch('/current', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const { date, startTime, endTime, totalValue, listaAberta } = req.body || {};
  const updates = [];
  const params = [];

  if (date !== undefined) { updates.push('date = ?'); params.push(date); }
  if (startTime !== undefined) { updates.push('start_time = ?'); params.push(startTime); }
  if (endTime !== undefined) { updates.push('end_time = ?'); params.push(endTime); }
  if (totalValue !== undefined) {
    const v = Number(totalValue);
    if (Number.isNaN(v) || v < 0) return res.status(400).json({ error: 'Valor total inválido' });
    updates.push('total_value = ?'); params.push(v);
  }
  const listaAbertaChanged = listaAberta !== undefined && !!pelada.lista_aberta !== !!listaAberta;
  if (listaAberta !== undefined) { updates.push('lista_aberta = ?'); params.push(listaAberta ? 1 : 0); }

  if (updates.length) {
    params.push(pelada.id);
    await db.run(`UPDATE peladas SET ${updates.join(', ')} WHERE id = ?`, ...params);
  }

  if (listaAbertaChanged) {
    sendPushToAll(
      listaAberta
        ? { title: 'Lista aberta!', body: 'Confirme sua presença pra próxima pelada.', url: '/lista' }
        : { title: 'Lista fechada', body: 'A lista de presença fechou. Confira quem ficou confirmado!', url: '/lista' }
    ).catch((e) => console.error('[push] falha ao notificar abertura/fechamento:', e.message));
  }

  res.json(await serializeState(pelada.id, req.user.id));
}));

router.post('/current/confirm', requireAuth, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const existing = await db.get(
    'SELECT * FROM pelada_players WHERE pelada_id = ? AND user_id = ?',
    pelada.id,
    req.user.id
  );
  if (existing) return res.status(409).json({ error: 'Você já está na lista' });
  if (!pelada.lista_aberta) return res.status(403).json({ error: 'Lista fechada pelo admin' });

  const countRow = await db.get(
    `SELECT COUNT(*) AS c FROM pelada_players WHERE pelada_id = ? AND status = 'confirmed'`,
    pelada.id
  );
  const status = countRow.c < pelada.capacity ? 'confirmed' : 'waitlist';

  await db.run(
    'INSERT INTO pelada_players (pelada_id, user_id, status) VALUES (?, ?, ?)',
    pelada.id,
    req.user.id,
    status
  );

  res.status(201).json(await serializeState(pelada.id, req.user.id));
}));

router.post('/current/cancel', requireAuth, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const existing = await db.get(
    'SELECT * FROM pelada_players WHERE pelada_id = ? AND user_id = ?',
    pelada.id,
    req.user.id
  );
  if (!existing) return res.status(404).json({ error: 'Você não está na lista' });

  await db.run('DELETE FROM pelada_players WHERE id = ?', existing.id);
  if (existing.status === 'confirmed') await promoteNextWaitlisted(pelada.id);

  res.json(await serializeState(pelada.id, req.user.id));
}));

router.patch('/current/paid', requireAuth, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const existing = await db.get(
    'SELECT * FROM pelada_players WHERE pelada_id = ? AND user_id = ?',
    pelada.id,
    req.user.id
  );
  if (!existing) return res.status(404).json({ error: 'Você não está na lista' });

  await db.run('UPDATE pelada_players SET paid = ? WHERE id = ?', existing.paid ? 0 : 1, existing.id);
  res.json(await serializeState(pelada.id, req.user.id));
}));

router.delete('/current/players/:userId', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const userId = Number(req.params.userId);
  const existing = await db.get(
    'SELECT * FROM pelada_players WHERE pelada_id = ? AND user_id = ?',
    pelada.id,
    userId
  );
  if (!existing) return res.status(404).json({ error: 'Jogador não está na lista' });

  await db.run('DELETE FROM pelada_players WHERE id = ?', existing.id);
  if (existing.status === 'confirmed') await promoteNextWaitlisted(pelada.id);

  res.json(await serializeState(pelada.id, req.user.id));
}));

router.patch('/current/players/:userId/paid', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const userId = Number(req.params.userId);
  const existing = await db.get(
    'SELECT * FROM pelada_players WHERE pelada_id = ? AND user_id = ?',
    pelada.id,
    userId
  );
  if (!existing) return res.status(404).json({ error: 'Jogador não está na lista' });

  await db.run('UPDATE pelada_players SET paid = ? WHERE id = ?', existing.paid ? 0 : 1, existing.id);
  res.json(await serializeState(pelada.id, req.user.id));
}));

router.post('/current/waitlist/:userId/promote', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const userId = Number(req.params.userId);
  const existing = await db.get(
    `SELECT * FROM pelada_players WHERE pelada_id = ? AND user_id = ? AND status = 'waitlist'`,
    pelada.id,
    userId
  );
  if (!existing) return res.status(404).json({ error: 'Jogador não está na lista de espera' });

  const countRow = await db.get(
    `SELECT COUNT(*) AS c FROM pelada_players WHERE pelada_id = ? AND status = 'confirmed'`,
    pelada.id
  );
  if (countRow.c >= pelada.capacity) {
    return res.status(409).json({ error: 'Lista de confirmados está cheia' });
  }

  await db.run(`UPDATE pelada_players SET status = 'confirmed' WHERE id = ?`, existing.id);
  res.json(await serializeState(pelada.id, req.user.id));
}));

router.post('/current/teams/generate', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const confirmedRows = await db.all(
    `SELECT pp.id, u.skill_level AS skillLevel FROM pelada_players pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.pelada_id = ? AND pp.status = 'confirmed'`,
    pelada.id
  );

  // Shuffle, then sort by skill weight descending, then snake-distribute
  // across teams so higher-skill players don't stack on one team.
  const shuffled = [...confirmedRows].sort(() => Math.random() - 0.5);
  shuffled.sort((a, b) => (SKILL_WEIGHT[b.skillLevel] || 2) - (SKILL_WEIGHT[a.skillLevel] || 2));

  const teamCount = Math.max(1, Math.ceil(pelada.capacity / TEAM_SIZE));
  const teamSizes = Array.from({ length: teamCount }, () => 0);
  const order = [];
  for (let i = 0; i < teamCount; i++) order.push(i + 1);
  for (let i = teamCount - 1; i >= 0; i--) order.push(i + 1);

  const assignment = new Map();
  let oi = 0;
  shuffled.forEach((row) => {
    let tries = 0;
    let team = order[oi % order.length];
    while (teamSizes[team - 1] >= TEAM_SIZE && tries < order.length) {
      oi++;
      team = order[oi % order.length];
      tries++;
    }
    if (teamSizes[team - 1] < TEAM_SIZE) {
      assignment.set(row.id, team);
      teamSizes[team - 1]++;
    }
    oi++;
  });

  await db.run('UPDATE pelada_players SET team_number = NULL WHERE pelada_id = ?', pelada.id);
  for (const [rowId, team] of assignment) {
    await db.run('UPDATE pelada_players SET team_number = ? WHERE id = ?', team, rowId);
  }

  res.json(await serializeState(pelada.id, req.user.id));
}));

router.patch('/current/teams', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const { userId, teamNumber } = req.body || {};
  const existing = await db.get(
    `SELECT * FROM pelada_players WHERE pelada_id = ? AND user_id = ? AND status = 'confirmed'`,
    pelada.id,
    Number(userId)
  );
  if (!existing) return res.status(404).json({ error: 'Jogador não está confirmado' });

  if (teamNumber === null) {
    await db.run('UPDATE pelada_players SET team_number = NULL WHERE id = ?', existing.id);
    return res.json(await serializeState(pelada.id, req.user.id));
  }

  const teamCount = Math.max(1, Math.ceil(pelada.capacity / TEAM_SIZE));
  if (!Number.isInteger(teamNumber) || teamNumber < 1 || teamNumber > teamCount) {
    return res.status(400).json({ error: 'Time inválido' });
  }
  const teamCurrent = await db.get(
    `SELECT COUNT(*) AS c FROM pelada_players WHERE pelada_id = ? AND team_number = ?`,
    pelada.id,
    teamNumber
  );
  if (teamCurrent.c >= TEAM_SIZE) return res.status(409).json({ error: 'Time já está cheio' });

  await db.run('UPDATE pelada_players SET team_number = ? WHERE id = ?', teamNumber, existing.id);
  res.json(await serializeState(pelada.id, req.user.id));
}));

router.post('/current/teams/clear', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  await db.run('UPDATE pelada_players SET team_number = NULL WHERE pelada_id = ?', pelada.id);
  res.json(await serializeState(pelada.id, req.user.id));
}));

router.post('/current/teams/:teamNumber/clear', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pelada = await getCurrentPelada();
  const teamNumber = Number(req.params.teamNumber);
  await db.run(
    'UPDATE pelada_players SET team_number = NULL WHERE pelada_id = ? AND team_number = ?',
    pelada.id,
    teamNumber
  );
  res.json(await serializeState(pelada.id, req.user.id));
}));

module.exports = router;
