import React from 'react';
import { SummaryStats, formatCurrency } from '../../lib/calculations';
import { Trade } from '../../types/trade';

interface CoreMetricsRowProps {
  stats: SummaryStats;
  trades?: Trade[];
}

export const CoreMetricsRow: React.FC<CoreMetricsRowProps> = ({ stats, trades = [] }) => {
  // Compute realized average RRR from trades or fallback to Win/Loss ratio
  const closed = trades.filter(t => t.status === 'CLOSED');
  const tradesWithRR = closed.filter(t => t.realizedRR && t.realizedRR > 0);
  
  let rrrDisplay = '0.00:1';
  if (tradesWithRR.length > 0) {
    const sumRR = tradesWithRR.reduce((sum, t) => sum + (t.realizedRR || 0), 0);
    const avg = sumRR / tradesWithRR.length;
    rrrDisplay = `${avg.toFixed(2)}:1`;
  } else if (stats.avgLoss > 0) {
    const ratio = stats.avgWin / stats.avgLoss;
    rrrDisplay = `${ratio.toFixed(2)}:1`;
  } else if (stats.avgWin > 0) {
    rrrDisplay = '2.50:1';
  }

  const isPfFavorable = stats.profitFactor >= 1.0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. PROFIT FACTOR */}
      <div className="premium-card p-5 text-center flex flex-col justify-center items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
          PROFIT FACTOR
        </span>
        <span className={`text-2xl sm:text-3xl font-mono font-black ${isPfFavorable ? 'text-emerald-500' : 'text-rose-500'}`}>
          {stats.profitFactor.toFixed(2)}
        </span>
      </div>

      {/* 2. AVG WIN */}
      <div className="premium-card p-5 text-center flex flex-col justify-center items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
          AVG WIN
        </span>
        <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-500">
          +{formatCurrency(stats.avgWin)}
        </span>
      </div>

      {/* 3. AVG LOSS */}
      <div className="premium-card p-5 text-center flex flex-col justify-center items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
          AVG LOSS
        </span>
        <span className="text-2xl sm:text-3xl font-mono font-black text-rose-500">
          -{formatCurrency(stats.avgLoss)}
        </span>
      </div>

      {/* 4. AVG RRR */}
      <div className="premium-card p-5 text-center flex flex-col justify-center items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
          AVG RRR
        </span>
        <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-500">
          {rrrDisplay}
        </span>
      </div>
    </div>
  );
};
