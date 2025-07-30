const express = require('express');
const router = express.Router();
const { getCandles, getPrice, switchInstrument } = require('../services/oandaService');

router.get('/chart/:instrument/:timeframe', async (req, res) => {
  const data = await getCandles(req.params.instrument, req.params.timeframe);
  res.json(data);
});

router.get('/price/:instrument', async (req, res) => {
  const data = await getPrice(req.params.instrument);
  res.json(data);
});

router.post('/switch-instrument', async (req, res) => {
  await switchInstrument(req.body.instrument);
  res.json({ success: true });
});

module.exports = router;