import React, { useState, useEffect, useRef } from 'react';
import { TerminalProChart } from '../components/terminal/TerminalProChart';
import { PineEditorPanel } from '../components/terminal/PineEditorPanel';
import {
  ChartSettingsModal,
  TerminalChartTheme,
  DEFAULT_CHART_THEME_DARK,
  DEFAULT_CHART_THEME_LIGHT
} from '../components/terminal/ChartSettingsModal';
import { QuickCalculatorModal } from '../components/common/QuickCalculatorModal';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fetchRealHistoricalCandles, TIMEFRAMES } from '../lib/backtestDataService';
import { executePineScript, IndicatorExecutionResult } from '../lib/pineScriptEngine';
import { subscribeLiveKlineFeed, getBarCountdown, LiveKlineTick } from '../lib/liveMarketStreamService';
import { BacktestCandle } from '../types/backtest';
import {
  Calculator,
  Maximize2,
  Minimize2,
  Palette,
  Terminal,
  Layers,
  Sparkles,
  Clock,
  Radio
} from 'lucide-react';

export const TerminalPage: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  // Active Symbol & Timeframe
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('15m');

  // Modals & Dock State
  const [calcOpen, setCalcOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPineEditorOpen, setIsPineEditorOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Real Market Candles & Live Streaming
  const [candles, setCandles] = useState<BacktestCandle[]>([]);
  const candlesRef = useRef<BacktestCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveTick, setLiveTick] = useState<LiveKlineTick | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [barCountdown, setBarCountdown] = useState(() => getBarCountdown('15m'));

  // Active Pine Script Indicator
  const [activeIndicator, setActiveIndicator] = useState<IndicatorExecutionResult | null>(null);
  const activeScriptKey = `tz_active_pinescript_${user?.id || 'guest'}`;

  // Custom Candle & Canvas Colors (Persisted per user account)
  const colorsKey = `tz_chart_colors_${user?.id || 'guest'}`;
  const [chartColors, setChartColors] = useState<TerminalChartTheme>(() => {
    try {
      const saved = localStorage.getItem(colorsKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return isDark ? DEFAULT_CHART_THEME_DARK : DEFAULT_CHART_THEME_LIGHT;
  });

  // Only set initial default if user hasn't saved a custom theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem(colorsKey);
      if (!saved) {
        setChartColors(isDark ? DEFAULT_CHART_THEME_DARK : DEFAULT_CHART_THEME_LIGHT);
      }
    } catch {}
  }, [isDark, colorsKey]);

  // Lock outer window scroll to prevent entire page scrolling
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // Fetch real market candles for Pro Terminal
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchRealHistoricalCandles(symbol, timeframe, 1000).then(({ candles: fetched }) => {
      if (!isCancelled) {
        setCandles(fetched);
        candlesRef.current = fetched;
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [symbol, timeframe]);

  // Keep active timeframe countdown ticking every second
  useEffect(() => {
    setBarCountdown(getBarCountdown(timeframe));
    const interval = setInterval(() => {
      setBarCountdown(getBarCountdown(timeframe));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  // Real-time Live Market Kline Streaming Subscription
  useEffect(() => {
    if (candles.length === 0) return;
    const lastCandle = candles[candles.length - 1];
    setCurrentPrice(lastCandle.close);

    const unsubscribe = subscribeLiveKlineFeed(
      symbol,
      timeframe,
      (tick: LiveKlineTick) => {
        setLiveTick(tick);
        setCurrentPrice(tick.close);

        // When a candle closes, update internal dataset ref for indicators without triggering full React re-renders
        if (tick.isClosed) {
          const idx = candlesRef.current.findIndex(c => c.time === tick.time);
          const closedCandle: BacktestCandle = {
            time: tick.time,
            open: tick.open,
            high: tick.high,
            low: tick.low,
            close: tick.close,
            volume: tick.volume
          };
          if (idx >= 0) {
            candlesRef.current[idx] = closedCandle;
          } else {
            candlesRef.current.push(closedCandle);
          }
        }
      },
      lastCandle
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, timeframe, candles.length > 0 ? candles[0].time : 0]);

  // Restore Active Indicator from User Account Storage
  useEffect(() => {
    if (candles.length === 0) return;
    try {
      const savedCode = localStorage.getItem(activeScriptKey);
      if (savedCode) {
        const res = executePineScript(savedCode, candles);
        if (res.success) {
          setActiveIndicator(res);
        }
      }
    } catch {}
  }, [candles, activeScriptKey]);

  // Pine Script Execution Handler
  const handleApplyScriptToChart = (code: string) => {
    const dataset = candlesRef.current.length > 0 ? candlesRef.current : candles;
    const result = executePineScript(code, dataset);
    if (result.success) {
      setActiveIndicator(result);
      try {
        localStorage.setItem(activeScriptKey, code);
      } catch {}
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleRemoveIndicator = () => {
    setActiveIndicator(null);
    try {
      localStorage.removeItem(activeScriptKey);
    } catch {}
  };

  const handleSaveTheme = (newTheme: TerminalChartTheme) => {
    setChartColors(newTheme);
    try {
      localStorage.setItem(colorsKey, JSON.stringify(newTheme));
    } catch (e) {
      console.error('Failed to save chart colors:', e);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`h-full flex-1 flex flex-col overflow-hidden select-none min-h-0 bg-background ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 bg-background h-screen w-screen' : ''
      }`}
      style={{ overscrollBehavior: 'contain' }}
      onWheel={(e) => {
        // Prevent outer window scrolling
        e.stopPropagation();
      }}
    >
      {/* Top Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between shrink-0 px-2 py-1.5 gap-2 border-b border-border/40 bg-surface/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground tracking-tight flex items-center gap-1.5">
              <span>Institutional Web Terminal</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase">
                Pro
              </span>
            </h1>
            <p className="text-[10px] text-muted hidden sm:block">
              Custom Pine Script, Persistent Drawings & Institutional Execution
            </p>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Asset Selector */}
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-surface-card border border-border text-xs text-foreground font-bold focus:outline-none cursor-pointer"
          >
            <option value="BTCUSDT">BTC / USDT (Bitcoin)</option>
            <option value="ETHUSDT">ETH / USDT (Ethereum)</option>
            <option value="XAUUSD">XAU / USD (Gold)</option>
            <option value="SOLUSDT">SOL / USDT (Solana)</option>
            <option value="EURUSDT">EUR / USD (Euro)</option>
            <option value="XRPUSDT">XRP / USDT (Ripple)</option>
            <option value="BNBUSDT">BNB / USDT (Binance)</option>
          </select>

          {/* Timeframe Selector */}
          <div className="hidden sm:flex items-center bg-surface p-0.5 rounded-xl border border-border/60">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                type="button"
                onClick={() => setTimeframe(tf.value)}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  timeframe === tf.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart Colors & Settings Button */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-muted hover:text-foreground transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Change Candle Colors & Settings"
          >
            <Palette className="w-3.5 h-3.5 text-primary" />
            <span className="hidden lg:inline text-[11px]">Colors</span>
          </button>

          {/* Position Size Calculator */}
          <Button
            size="sm"
            variant="secondary"
            icon={<Calculator className="w-3.5 h-3.5" />}
            onClick={() => setCalcOpen(true)}
          >
            Calc
          </Button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-muted hover:text-foreground transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Chart Workspace - Guaranteed 100% Sizing with Native Wheel Event Handling */}
      <div
        className="flex-1 w-full relative min-h-0 overflow-hidden"
        style={{ overscrollBehavior: 'contain' }}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 w-full h-full">
          <TerminalProChart
            symbol={symbol}
            timeframe={timeframe}
            theme={theme}
            chartColors={chartColors}
            activeIndicator={activeIndicator}
            userId={user?.id}
            candles={candles}
            loading={loading}
            liveTick={liveTick}
            currentPrice={currentPrice}
            countdown={barCountdown.formatted}
            countdownPercent={barCountdown.progressPercent}
          />
        </div>
      </div>

      {/* Bottom Dock: Pine Script Editor & Custom Indicators Panel */}
      <PineEditorPanel
        isOpen={isPineEditorOpen}
        onToggle={() => setIsPineEditorOpen(!isPineEditorOpen)}
        userId={user?.id}
        onApplyScriptToChart={handleApplyScriptToChart}
        onRemoveActiveIndicator={handleRemoveIndicator}
        hasActiveIndicator={!!activeIndicator}
        activeIndicatorName={activeIndicator?.name}
      />

      {/* Chart Settings & Candle Colors Modal */}
      {settingsOpen && (
        <ChartSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          currentTheme={chartColors}
          onSaveTheme={handleSaveTheme}
          isDarkAppTheme={isDark}
        />
      )}

      {/* Position Calculator Modal */}
      {calcOpen && <QuickCalculatorModal isOpen={calcOpen} onClose={() => setCalcOpen(false)} />}
    </div>
  );
};


