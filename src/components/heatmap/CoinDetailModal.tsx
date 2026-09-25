import React from 'react';
import { HeatmapItem } from '../../lib/heatmapDataService';
import { formatCompactNumber, formatHeatmapPrice } from '../../lib/heatmapColors';
import { X, TrendingUp, TrendingDown, ExternalLink, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CoinDetailModalProps {
  item: HeatmapItem | null;
  onClose: () => void;
}

export const CoinDetailModal: React.FC<CoinDetailModalProps> = ({ item, onClose }) => {
  const navigate = useNavigate();
  if (!item) return null;

  const isPositive = item.change24h >= 0;

  const handleOpenInBacktest = () => {
    onClose();
    // Navigate to Strategy & Backtest Studio with this asset
    navigate('/strategy');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none">
      <div
        className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface-hover/30">
          <div className="flex items-center gap-3">
            {item.logoUrl ? (
              <img
                src={item.logoUrl}
                alt={item.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                {item.symbol.slice(0, 3)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground font-['Arial',sans-serif]">
                  {item.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-muted-foreground font-bold">
                  #{item.rank}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {item.category}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-['Arial',sans-serif]">
                {item.displaySymbol}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price & Stats Grid */}
        <div className="p-6 space-y-6">
          {/* Main Price Card */}
          <div className="flex items-baseline justify-between p-4 rounded-xl bg-surface-hover/50 border border-border/40">
            <div>
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                Live Price
              </span>
              <div className="text-2xl font-extrabold text-foreground font-['Arial',sans-serif]">
                ${formatHeatmapPrice(item.price)}
              </div>
            </div>

            <div
              className={`flex items-center gap-1 font-bold text-base px-2.5 py-1 rounded-lg ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isPositive ? `+${item.change24h.toFixed(2)}%` : `${item.change24h.toFixed(2)}%`}</span>
            </div>
          </div>

          {/* 4-Column Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface-hover/30 border border-border/30">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase block mb-1">
                Market Cap
              </span>
              <span className="text-base font-bold text-foreground font-['Arial',sans-serif]">
                {formatCompactNumber(item.marketCap)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface-hover/30 border border-border/30">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase block mb-1">
                24h Volume
              </span>
              <span className="text-base font-bold text-foreground font-['Arial',sans-serif]">
                {formatCompactNumber(item.volume24h)}
              </span>
            </div>

            {item.high24h !== undefined && (
              <div className="p-3 rounded-xl bg-surface-hover/30 border border-border/30">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase block mb-1">
                  24h High
                </span>
                <span className="text-base font-bold text-foreground font-['Arial',sans-serif]">
                  ${formatHeatmapPrice(item.high24h)}
                </span>
              </div>
            )}

            {item.low24h !== undefined && (
              <div className="p-3 rounded-xl bg-surface-hover/30 border border-border/30">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase block mb-1">
                  24h Low
                </span>
                <span className="text-base font-bold text-foreground font-['Arial',sans-serif]">
                  ${formatHeatmapPrice(item.low24h)}
                </span>
              </div>
            )}
          </div>

          {/* Multi-Timeframe Performance */}
          {(item.change1h !== undefined || item.change7d !== undefined) && (
            <div className="p-3.5 rounded-xl bg-surface-hover/30 border border-border/30">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-2">
                Multi-Timeframe Returns
              </span>
              <div className="flex items-center justify-between text-xs font-['Arial',sans-serif]">
                {item.change1h !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px]">1 Hour</span>
                    <span className={`font-bold ${item.change1h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.change1h >= 0 ? `+${item.change1h.toFixed(2)}%` : `${item.change1h.toFixed(2)}%`}
                    </span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px]">24 Hours</span>
                  <span className={`font-bold ${item.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.change24h >= 0 ? `+${item.change24h.toFixed(2)}%` : `${item.change24h.toFixed(2)}%`}
                  </span>
                </div>
                {item.change7d !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px]">7 Days</span>
                    <span className={`font-bold ${item.change7d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.change7d >= 0 ? `+${item.change7d.toFixed(2)}%` : `${item.change7d.toFixed(2)}%`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button: Backtest & Strategy Studio */}
          <button
            onClick={handleOpenInBacktest}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Open in Strategy & Backtest Studio</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
};
