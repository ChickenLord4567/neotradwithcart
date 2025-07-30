const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D'];
export default function TimeframeSelector({ selected, onChange }: { selected:string, onChange:(tf:string)=>void }) {
  return (
    <select value={selected} onChange={e=>onChange(e.target.value)}>
      {TIMEFRAMES.map(tf=><option key={tf} value={tf}>{tf}</option>)}
    </select>
  );
}