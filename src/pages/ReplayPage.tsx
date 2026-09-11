import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  FastForward,
  PlayCircle,
  Eye
} from 'lucide-react';

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const ReplayPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tradeIdParam = searchParams.get('tradeId');
  const { accountTrades } = useTrading();

  const [symbol, setSymbol] = useState('XAUUSD');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentIndex, setCurrentIndex] = useState(15);

  // Generate realistic candlestick sample stream
  const [candles, setCandles] = useState<Candle[]>(() => {
    let price = 2500.0;
    const list: Candle[] = [];
    for (let i = 0; i < 40; i++) {
      const delta = (Math.random() - 0.48) * 6;
      const open = price;
      const close = parseFloat((open + delta).toFixed(2));
      const high = parseFloat((Math.max(open, close) + Math.random() * 3).toFixed(2));
      const low = parseFloat((Math.min(open, close) - Math.random() * 3).toFixed(2));
      list.push({
        time: `10:${String(i * 15).padStart(2, '0')}`,
        open,
        high,
        low,
        close
      });
      price = close;
    }
    return list;
  });

  // Timer loop for auto play
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= candles.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, candles.length]);

  const visibleCandles = candles.slice(0, currentIndex + 1);
  const currentCandle = visibleCandles[visibleCandles.length - 1];

  // SVG dimensions
  const width = 800;
  const height = 340;
  const paddingX = 40;
  const paddingY = 30;

  const minPrice = Math.min(...visibleCandles.map(c => c.low)) * 0.998;
  const maxPrice = Math.max(...visibleCandles.map(c => c.high)) * 1.002;
  const priceRange = maxPrice - minPrice || 1;

  const getY = (val: number) => height - paddingY - ((val - minPrice) / priceRange) * (height - paddingY * 2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <PlayCircle className="w-6 h-6 text-primary-light" />
            <span>Candle-by-Candle Trade Replay</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Step through price bar by bar to test your setups, review execution, and analyze missed entries.
          </p>
        </div>

        {/* Symbol Selector */}
        <div className="flex items-center gap-3">
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-surface-card border border-border text-xs text-white font-bold focus:outline-none"
          >
            <option value="XAUUSD">XAUUSD (Gold 15m)</option>
            <option value="EURUSD">EURUSD (Euro 15m)</option>
            <option value="BTCUSD">BTCUSD (Bitcoin 15m)</option>
            <option value="US30">US30 (Dow Jones 15m)</option>
          </select>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="premium-card p-5 space-y-4">
        {/* Canvas Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-white font-mono">{symbol}</span>
            <span className="text-xs font-mono text-slate-400">
              Close: <strong className="text-white">${currentCandle?.close}</strong>
            </span>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Candle: {currentIndex + 1} / {candles.length}
          </div>
        </div>

        {/* SVG Candlestick Chart */}
        <div className="w-full relative bg-[#07050e] rounded-xl p-2 border border-border/60">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-80 overflow-visible">
            {/* Horizontal Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingY + ratio * (height - paddingY * 2);
              const p = maxPrice - ratio * priceRange;
              return (
                <g key={i}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <text x={width - paddingX + 8} y={y + 3} fill="#64748b" fontSize="10" className="font-mono">
                    ${p.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Candlesticks */}
            {visibleCandles.map((c, i) => {
              const candleWidth = Math.max((width - paddingX * 2) / candles.length - 4, 6);
              const x = paddingX + i * ((width - paddingX * 2) / candles.length) + candleWidth / 2;
              const isGreen = c.close >= c.open;
              const openY = getY(c.open);
              const closeY = getY(c.close);
              const highY = getY(c.high);
              const lowY = getY(c.low);
              const bodyY = Math.min(openY, closeY);
              const bodyHeight = Math.max(Math.abs(closeY - openY), 2);

              return (
                <g key={i} className="transition-all duration-150">
                  {/* Wick */}
                  <line
                    x1={x + candleWidth / 2}
                    y1={highY}
                    x2={x + candleWidth / 2}
                    y2={lowY}
                    stroke={isGreen ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.5"
                  />
                  {/* Body */}
                  <rect
                    x={x}
                    y={bodyY}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={isGreen ? '#10b981' : '#f43f5e'}
                    rx="1"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Player Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Play/Pause & Step */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? 'Pause (Space)' : 'Play Replay'}
            </Button>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(prev + 1, candles.length - 1))}
              disabled={currentIndex >= candles.length - 1}
              className="p-2 rounded-xl bg-surface-card border border-border text-slate-300 hover:text-white disabled:opacity-40"
              title="Next Candle"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(5);
              }}
              className="p-2 rounded-xl bg-surface-card border border-border text-slate-300 hover:text-white"
              title="Reset Replay"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-surface-card border border-border p-1 rounded-xl">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  speed === s ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
