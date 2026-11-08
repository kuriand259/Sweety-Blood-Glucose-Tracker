const express = require('express');
const cors = require('cors');
const { authRouter } = require('./routes/auth');
const { readingsRouter } = require('./routes/readings');
const { reportsRouter } = require('./routes/reports');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/readings', readingsRouter);
app.use('/api/reports', reportsRouter);

module.exports = { app };
