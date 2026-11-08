const express = require('express');
const cors = require('cors');
const { authRouter } = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

module.exports = { app };
