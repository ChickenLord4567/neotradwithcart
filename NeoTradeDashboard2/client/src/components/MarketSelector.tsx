import React from 'react';

const MARKETS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];

interface MarketSelectorProps {
  selected: string;
  onChange: (market: string) => void;
}

export default function MarketSelector({ selected, onChange }: MarketSelectorProps) {
  return (
    <select value={selected} onChange={e => onChange(e.target.value)}>
      {MARKETS.map(mkt => <option key={mkt} value={mkt}>{mkt}</option>)}
    </select>
  );
}