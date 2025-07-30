import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';

interface ChartPanelProps {
  candles: Array<{ time: number, open: number, high: number, low: number, close: number, volume?: number }>;
  livePrice?: number;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ candles, livePrice }) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    chartRef.current = createChart(chartContainerRef.current, { width: chartContainerRef.current.offsetWidth, height: 400 });
    const candleSeries = chartRef.current.addCandlestickSeries();

    candleSeries.setData(candles);

    // Optionally overlay live price line
    if (livePrice) {
      candleSeries.createPriceLine({ price: livePrice, color: 'red', lineWidth: 2, title: 'Live Price' });
    }

    return () => chartRef.current?.remove();
  }, [candles, livePrice]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: 400 }} />;
};

export default ChartPanel;