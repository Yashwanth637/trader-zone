import React, { useState } from 'react';
import { X, Check, RotateCcw, Palette, Sliders } from 'lucide-react';
import { Button } from '../ui/Button';

export interface TerminalChartTheme {
  upColor: string;
  downColor: string;
  borderUpColor: string;
  borderDownColor: string;
  wickUpColor: string;
  wickDownColor: string;
  backgroundColor: string;
  showGrid: boolean;
}

export const DEFAULT_CHART_THEME_DARK: TerminalChartTheme = {
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  backgroundColor: '#0a0d14',
  showGrid: true
};

export const DEFAULT_CHART_THEME_LIGHT: TerminalChartTheme = {
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  backgroundColor: '#ffffff',
  showGrid: true
};

const COLOR_PRESETS = [
  { name: 'Classic TV', up: '#26a69a', down: '#ef5350' },
  { name: 'Emerald / Crimson', up: '#10b981', down: '#f43f5e' },
  { name: 'Cyan / Magenta', up: '#06b6d4', down: '#ec4899' },
  { name: 'Electric Lime / Coral', up: '#84cc16', down: '#f97316' },
  { name: 'Gold / Violet', up: '#eab308', down: '#8b5cf6' },
  { name: 'Monochrome', up: '#ffffff', down: '#475569' }
];

interface ChartSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: TerminalChartTheme;
  onSaveTheme: (newTheme: TerminalChartTheme) => void;
  isDarkAppTheme: boolean;
}

export const ChartSettingsModal: React.FC<ChartSettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSaveTheme,
  isDarkAppTheme
}) => {
  const [themeState, setThemeState] = useState<TerminalChartTheme>(currentTheme);

  if (!isOpen) return null;

  const handleApplyPreset = (up: string, down: string) => {
    setThemeState(prev => ({
      ...prev,
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down
    }));
  };

  const handleReset = () => {
    setThemeState(isDarkAppTheme ? DEFAULT_CHART_THEME_DARK : DEFAULT_CHART_THEME_LIGHT);
  };

  const handleSave = () => {
    onSaveTheme(themeState);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface-card border border-border/80 dark:border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground">Chart Settings & Candle Colors</h2>
              <p className="text-[11px] text-muted">Customize candlestick body, wick, and canvas styling</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Color Presets */}
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 block">
              Quick Color Themes
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset.up, preset.down)}
                  className="flex items-center justify-between p-2 rounded-xl border border-border/60 hover:border-primary/50 bg-surface text-left transition-all group"
                >
                  <span className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">
                    {preset.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.up }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.down }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Candle Body Colors */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-surface/50 space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>Candlestick Colors</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted font-medium mb-1.5 block">
                  Bullish (Up) Body
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeState.upColor}
                    onChange={e =>
                      setThemeState(p => ({
                        ...p,
                        upColor: e.target.value,
                        borderUpColor: e.target.value,
                        wickUpColor: e.target.value
                      }))
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={themeState.upColor}
                    onChange={e =>
                      setThemeState(p => ({
                        ...p,
                        upColor: e.target.value,
                        borderUpColor: e.target.value,
                        wickUpColor: e.target.value
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-xs font-mono text-foreground font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted font-medium mb-1.5 block">
                  Bearish (Down) Body
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeState.downColor}
                    onChange={e =>
                      setThemeState(p => ({
                        ...p,
                        downColor: e.target.value,
                        borderDownColor: e.target.value,
                        wickDownColor: e.target.value
                      }))
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={themeState.downColor}
                    onChange={e =>
                      setThemeState(p => ({
                        ...p,
                        downColor: e.target.value,
                        borderDownColor: e.target.value,
                        wickDownColor: e.target.value
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-xs font-mono text-foreground font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Custom Wicks & Borders */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div>
                <label className="text-[10px] text-muted font-medium mb-1 block">
                  Up Wick & Border
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeState.wickUpColor}
                    onChange={e =>
                      setThemeState(p => ({
                        ...p,
                        wickUpColor: e.target.value,
                        borderUpColor: e.target.value
                      }))
                    }
                    className="w-6 h-6 rounded cursor-pointer border border-border bg-transparent p-0"
                  />
                  <span className="text-[11px] font-mono text-muted">{themeState.wickUpColor}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted font-medium mb-1 block">
                  Down Wick & Border
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeState.wickDownColor}
                    onChange={e =>
                      setThemeState(p => ({
                        ...p,
                        wickDownColor: e.target.value,
                        borderDownColor: e.target.value
                      }))
                    }
                    className="w-6 h-6 rounded cursor-pointer border border-border bg-transparent p-0"
                  />
                  <span className="text-[11px] font-mono text-muted">{themeState.wickDownColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Background & Grid */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-surface/50 space-y-3">
            <h3 className="text-xs font-bold text-foreground">Canvas & Grid Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">Background Color</div>
                <div className="text-[10px] text-muted">Chart canvas background fill</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeState.backgroundColor}
                  onChange={e => setThemeState(p => ({ ...p, backgroundColor: e.target.value }))}
                  className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent p-0"
                />
                <span className="text-xs font-mono text-foreground font-bold">{themeState.backgroundColor}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div>
                <div className="text-xs font-semibold text-foreground">Grid Lines</div>
                <div className="text-[10px] text-muted">Show subtle horizontal & vertical time/price grid</div>
              </div>
              <input
                type="checkbox"
                checked={themeState.showGrid}
                onChange={e => setThemeState(p => ({ ...p, showGrid: e.target.checked }))}
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/60 bg-surface/30">
          <Button size="sm" variant="secondary" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset}>
            Reset Default
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" icon={<Check className="w-3.5 h-3.5" />} onClick={handleSave}>
              Save Colors
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
