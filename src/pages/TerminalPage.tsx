import React, { useState, useEffect, useRef } from 'react';
import { TradingViewWidget } from '../components/charts/TradingViewWidget';
import { QuickCalculatorModal } from '../components/common/QuickCalculatorModal';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { Tv, Calculator, Maximize2, Minimize2 } from 'lucide-react';

export const TerminalPage: React.FC = () => {
  const { theme } = useTheme();
  const [symbol, setSymbol] = useState('OANDA:XAUUSD');
  const [calcOpen, setCalcOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent entire page from scrolling when zooming or navigating inside the terminal
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
      className={`space-y-2 h-full flex flex-col overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 bg-background' : ''
      }`}
      style={{ overscrollBehavior: 'contain' }}
      onWheel={(e) => {
        // Stop mouse wheel bubbling to prevent window/page scrolling
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-1 py-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight">Institutional Web Terminal</h1>
            <p className="text-[10px] text-muted hidden sm:block">Live multi-asset charting powered by TradingView</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-card border border-border text-xs text-foreground font-bold focus:outline-none"
          >
            <option value="OANDA:XAUUSD">XAU / USD (Gold)</option>
            <option value="FX:EURUSD">EUR / USD (Forex)</option>
            <option value="FX:GBPUSD">GBP / USD (Forex)</option>
            <option value="BINANCE:BTCUSDT">BTC / USDT (Crypto)</option>
            <option value="BINANCE:ETHUSDT">ETH / USDT (Crypto)</option>
            <option value="BINANCE:SOLUSDT">SOL / USDT (Crypto)</option>
            <option value="FOREXCOM:SPXUSD">S&P 500 Index</option>
            <option value="TVC:US30">US30 (Dow Jones)</option>
          </select>

          <Button size="sm" variant="secondary" icon={<Calculator className="w-3.5 h-3.5" />} onClick={() => setCalcOpen(true)}>
            Lot Calc
          </Button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-muted hover:text-foreground transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Embedded Chart Full Height with Guaranteed Wheel Containment */}
      <div
        className="flex-1 w-full relative min-h-0 overflow-hidden"
        style={{ overscrollBehavior: 'contain' }}
        onWheel={(e) => e.stopPropagation()}
      >
        <TradingViewWidget symbol={symbol} theme={theme} className="w-full h-full" />
      </div>

      {/* Position Calculator Modal */}
      {calcOpen && <QuickCalculatorModal isOpen={calcOpen} onClose={() => setCalcOpen(false)} />}
    </div>
  );
};

