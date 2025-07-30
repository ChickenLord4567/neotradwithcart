const axios = require('axios');
// Optionally import DB models

let currentInstrument = 'XAUUSD';
let cachedCandles = {}; // { [instrument_timeframe]: Array }

async function getCandles(instrument, timeframe) {
  // TODO: return cached or fetch from OANDA and cache/process
  // Example OANDA endpoint:
  // https://api-fxpractice.oanda.com/v3/instruments/{instrument}/candles?granularity={timeframe}
  // Use API key/header
  return cachedCandles[`${instrument}_${timeframe}`] || [];
}

async function getPrice(instrument) {
  // TODO: fetch latest price from OANDA or cache
  return { bid: 0, ask: 0, last: 0 };
}

async function switchInstrument(instrument) {
  currentInstrument = instrument;
  // TODO: restart polling with new instrument
}

module.exports = { getCandles, getPrice, switchInstrument };