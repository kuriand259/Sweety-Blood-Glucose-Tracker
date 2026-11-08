const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  parseCreateReading,
  parseUpdateReading,
  parseOptionalDateQuery,
  parsePaginationQuery,
} = require('../validation/reading');
const {
  listReadings,
  createReading,
  updateReading,
  deleteReading,
} = require('../services/readings');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const dateParsed = parseOptionalDateQuery(req.query.date);
  if (dateParsed.error) {
    return res.status(400).json({ error: dateParsed.error });
  }

  const paginationParsed = parsePaginationQuery(req.query);
  if (paginationParsed.error) {
    return res.status(400).json({ error: paginationParsed.error });
  }

  try {
    const result = await listReadings(req.user.id, {
      date: dateParsed.data,
      page: paginationParsed.data.page,
      limit: paginationParsed.data.limit,
    });
    return res.json(result);
  } catch (err) {
    console.error('List readings failed:', err);
    return res.status(500).json({ error: 'Unable to load readings.' });
  }
});

router.post('/', async (req, res) => {
  const parsed = parseCreateReading(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const result = await createReading(req.user.id, parsed.data);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(201).json({ reading: result.reading });
  } catch (err) {
    console.error('Create reading failed:', err);
    return res.status(500).json({ error: 'Unable to create reading.' });
  }
});

router.put('/:id', async (req, res) => {
  const parsed = parseUpdateReading(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const result = await updateReading(req.user.id, req.params.id, parsed.data);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({ reading: result.reading });
  } catch (err) {
    console.error('Update reading failed:', err);
    return res.status(500).json({ error: 'Unable to update reading.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteReading(req.user.id, req.params.id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Delete reading failed:', err);
    return res.status(500).json({ error: 'Unable to delete reading.' });
  }
});

module.exports = { readingsRouter: router };
