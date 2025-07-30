import axios from 'axios';

export async function fetchCandles(instrument: string, timeframe: string) {
  const { data } = await axios.get(`/api/chart/${instrument}/${timeframe}`);
  return data; // array of candles
}

export async function fetchLivePrice(instrument: string) {
  const { data } = await axios.get(`/api/price/${instrument}`);
  return data; // { bid, ask, last }
}

export async function switchInstrument(instrument: string) {
  await axios.post('/api/switch-instrument', { instrument });
}