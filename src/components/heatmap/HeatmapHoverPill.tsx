import React from 'react';
import { HeatmapItem } from '../../lib/heatmapDataService';
import { formatCompactNumber, formatHeatmapPrice } from '../../lib/heatmapColors';
import { Maximize2, LayoutGrid } from 'lucide-react';

interface HeatmapHoverPillProps {
  item: HeatmapItem | null;
  cursorPos?: { x: number; y: number } | null;
  floating?: boolean;
}

export const HeatmapHoverPill: React.FC<HeatmapHoverPillProps> = ({
  item,
  cursorPos,
  floating = false
}) => {
  if (!item) return null;

  const isPositive = item.change24h >= 0;
  const isNeutral = Math.abs(item.change24h) < 0.05;

  return (
    <div
      className={`transition-all duration-150 z-30 select-none ${
        floating && cursorPos
          ? 'fixed pointer-events-none'
          : 'relative inline-flex'
      }`}
      style={
        floating && cursorPos
          ? {
              left: `${Math.min(window.innerWidth - 380, cursorPos.x + 16)}px`,
              top: `${Math.min(window.innerHeight - 80, cursorPos.y + 16)}px`
            }
          : undefined
      }
    >
      <div className="flex items-center gap-6 px-5 py-2.5 rounded-xl bg-[#1e222d] border border-white/10 text-white shadow-2xl backdrop-blur-md">
        {/* Coin Logo & Display Symbol */}
        <div className="flex items-center gap-2.5">
          {item.logoUrl ? (
            <img
              src={item.logoUrl}
              alt={item.name}
              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/10"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
              {item.symbol.slice(0, 3)}
            </div>
          )}
          <span className="font-bold text-base tracking-tight text-white font-['Arial',sans-serif]">
            {item.displaySymbol}
          </span>
        </div>

        {/* Price Column */}
        <div className="flex flex-col">
          <span className="font-bold text-base text-white font-['Arial',sans-serif]">
            {formatHeatmapPrice(item.price)}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-['Arial',sans-serif]">
            PRICE
          </span>
        </div>

        {/* Market Cap Column */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-bold text-base text-white font-['Arial',sans-serif]">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatCompactNumber(item.marketCap).replace('$', '')}</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-['Arial',sans-serif]">
            MARKET CAP
          </span>
        </div>

        {/* Change 24h, % Column */}
        <div className="flex flex-col">
          <div
            className={`flex items-center gap-1.5 font-bold text-base font-['Arial',sans-serif] ${
              isNeutral
                ? 'text-slate-300'
                : isPositive
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span>
              {isPositive ? `+${item.change24h.toFixed(2)}%` : `${item.change24h.toFixed(2)}%`}
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-['Arial',sans-serif]">
            CHANGE 24H, %
          </span>
        </div>
      </div>
    </div>
  );
};
