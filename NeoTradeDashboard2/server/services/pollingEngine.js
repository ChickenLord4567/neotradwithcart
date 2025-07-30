const cron = require('node-cron');
const { fetchCandlesFromOanda, saveToDB } = require('./oandaService');

let pollIntervalSeconds = 5;

function startPolling(instrument, timeframe) {
  cron.schedule(`*/${pollIntervalSeconds} * * * * *`, async () => {
    const candles = await fetchCandlesFromOanda(instrument, timeframe);
    await saveToDB(candles, instrument, timeframe);
  });
}

module.exports = { startPolling };