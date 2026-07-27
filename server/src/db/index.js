const path = require('path');
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, '..', '..', 'pelada.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });

async function migrate() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      skill_level TEXT NOT NULL DEFAULT 'Intermediário',
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS peladas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT '18:00',
      end_time TEXT NOT NULL DEFAULT '20:00',
      total_value REAL NOT NULL DEFAULT 200,
      lista_aberta INTEGER NOT NULL DEFAULT 1,
      capacity INTEGER NOT NULL DEFAULT 18
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS pelada_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pelada_id INTEGER NOT NULL REFERENCES peladas(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'confirmed',
      paid INTEGER NOT NULL DEFAULT 0,
      team_number INTEGER,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(pelada_id, user_id)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // One row per reminder actually sent for a pelada — supports multiple
  // reminder days (e.g. +1 and +4 after the game) without ever double
  // sending the same one, even if the cron endpoint gets hit twice.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS payment_reminders_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pelada_id INTEGER NOT NULL REFERENCES peladas(id) ON DELETE CASCADE,
      sent_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(pelada_id, sent_date)
    )
  `);

  // Columns added after the initial release — ALTER TABLE ... ADD COLUMN has
  // no IF NOT EXISTS in SQLite, so add them inside a try/catch that swallows
  // only the "already exists" case (existing deployed DBs vs. fresh ones).
  const lateColumns = [
    ['users', 'avatar_url TEXT'],
    ['peladas', 'payment_reminder_sent_date TEXT'],
    ['peladas', 'cancelada INTEGER NOT NULL DEFAULT 0'],
  ];
  for (const [table, def] of lateColumns) {
    try {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${def}`);
    } catch (e) {
      if (!/duplicate column/i.test(e.message || '')) throw e;
    }
  }

  // Ensure there is always a single "current" pelada that the whole app
  // points at, matching the prototype's single-upcoming-session model.
  const current = await client.execute('SELECT id FROM peladas ORDER BY id LIMIT 1');
  if (current.rows.length === 0) {
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
    await client.execute({
      sql: 'INSERT INTO peladas (date, start_time, end_time, total_value, lista_aberta, capacity) VALUES (?, ?, ?, ?, 1, 18)',
      args: [nextSunday.toISOString().slice(0, 10), '18:00', '20:00', 200],
    });
  }
}

// Thin wrapper matching the shape the routes use: get()/all() return rows,
// run() returns { lastInsertRowid, changes }. Keeps route code close to
// plain SQL instead of hand-rolling libsql's `execute({sql, args})` everywhere.
const db = {
  ready: migrate(),
  async get(sql, ...args) {
    const res = await client.execute({ sql, args });
    return res.rows[0];
  },
  async all(sql, ...args) {
    const res = await client.execute({ sql, args });
    return res.rows;
  },
  async run(sql, ...args) {
    const res = await client.execute({ sql, args });
    return { lastInsertRowid: Number(res.lastInsertRowid), changes: res.rowsAffected };
  },
};

module.exports = db;
