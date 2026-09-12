import React, { useState } from 'react';
import { TradingViewWidget } from '../components/charts/TradingViewWidget';
import { QuickCalculatorModal } from '../components/common/QuickCalculatorModal';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { Tv, Calculator, Maximize2 } from 'lucide-react';

export const TerminalPage: React.FC = () => {
  const { theme } = useTheme();
  const [symbol, setSymbol] = useState('FX:EURUSD');
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Institutional Web Terminal</h1>
            <p className="text-[11px] text-slate-400">Live multi-asset charting powered by TradingView</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-card border border-border text-xs text-white font-bold focus:outline-none"
          >
            <option value="FX:EURUSD">EUR / USD (Forex)</option>
            <option value="FX:GBPUSD">GBP / USD (Forex)</option>
            <option value="OANDA:XAUUSD">XAU / USD (Gold)</option>
            <option value="BINANCE:BTCUSDT">BTC / USDT (Crypto)</option>
            <option value="FOREXCOM:SPXUSD">S&P 500 Index</option>
            <option value="TVC:US30">US30 (Dow Jones)</option>
          </select>

          <Button size="sm" variant="secondary" icon={<Calculator className="w-4 h-4" />} onClick={() => setCalcOpen(true)}>
            Lot Size Calc
          </Button>
        </div>
      </div>

      {/* Embedded Chart Full Height */}
      <div className="flex-1 w-full relative">
        <TradingViewWidget symbol={symbol} theme={theme} />
      </div>

      {/* Position Calculator Modal */}
      {calcOpen && <QuickCalculatorModal isOpen={calcOpen} onClose={() => setCalcOpen(false)} />}
    </div>
  );
};
