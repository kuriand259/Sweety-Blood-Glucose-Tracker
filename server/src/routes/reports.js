const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { parseDateQuery } = require('../validation/reading');
const {
  dailyReport,
  monthToDateReport,
  monthlyReport,
} = require('../services/reports');

const router = express.Router();

router.use(requireAuth);

async function handleReport(req, res, builder) {
  const parsed = parseDateQuery(req.query.date);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const report = await builder(req.user.id, parsed.data);
    return res.json({ report });
  } catch (err) {
    console.error('Report failed:', err);
    return res.status(500).json({ error: 'Unable to load report.' });
  }
}

router.get('/daily', (req, res) => handleReport(req, res, dailyReport));
router.get('/month-to-date', (req, res) =>
  handleReport(req, res, monthToDateReport)
);
router.get('/monthly', (req, res) => handleReport(req, res, monthlyReport));

module.exports = { reportsRouter: router };
