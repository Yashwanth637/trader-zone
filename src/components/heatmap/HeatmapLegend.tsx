import React from 'react';
import { HEATMAP_COLOR_STOPS } from '../../lib/heatmapColors';
import { useTheme } from '../../context/ThemeContext';

export const HeatmapLegend: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col gap-1 select-none">
      {/* Percentage numbers */}
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-400 font-['Arial',sans-serif] px-0.5">
        {HEATMAP_COLOR_STOPS.map(stop => (
          <span key={stop.percent} className="min-w-[28px] text-center">
            {stop.percent > 0 ? `+${stop.percent}%` : `${stop.percent}%`}
          </span>
        ))}
      </div>

      {/* Segmented Color Bar */}
      <div className="flex h-2.5 w-64 rounded-full overflow-hidden shadow-inner ring-1 ring-black/10 dark:ring-white/10">
        {HEATMAP_COLOR_STOPS.map(stop => (
          <div
            key={stop.percent}
            className="flex-1 transition-colors"
            style={{ backgroundColor: isDark ? stop.bgDark : stop.bgLight }}
            title={`${stop.percent > 0 ? '+' : ''}${stop.percent}%`}
          />
        ))}
      </div>
    </div>
  );
};
