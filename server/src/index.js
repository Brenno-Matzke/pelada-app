require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db');
const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const peladasRouter = require('./routes/peladas');
const pushRouter = require('./routes/push');
const cronRouter = require('./routes/cron');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(
  cors(
    allowedOrigins.length
      ? { origin: allowedOrigins }
      : undefined // no ALLOWED_ORIGINS set (local dev) — allow any origin
  )
);
app.use(express.json({ limit: '1mb' })); // room for a compressed profile-photo data URL

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/peladas', peladasRouter);
app.use('/api/push', pushRouter);
app.use('/api/cron', cronRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3001;
db.ready
  .then(() => {
    app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Falha ao migrar/conectar o banco:', err);
    process.exit(1);
  });
