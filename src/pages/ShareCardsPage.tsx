import React, { useState, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/calculations';
import {
  Share2,
  Download,
  Copy,
  Sparkles,
  CheckCircle,
  TrendingUp,
  Award
} from 'lucide-react';

export const ShareCardsPage: React.FC = () => {
  const { accountTrades, profile } = useTrading();
  const cardRef = useRef<HTMLDivElement>(null);

  const [cardTheme, setCardTheme] = useState<'neon' | 'obsidian' | 'emerald' | 'purple'>('purple');
  const [aspect, setAspect] = useState<'square' | 'story' | 'banner'>('square');
  const [selectedTradeId, setSelectedTradeId] = useState<string>(accountTrades[0]?.id || '');
  const [copied, setCopied] = useState(false);

  const trade = accountTrades.find(t => t.id === selectedTradeId) || accountTrades[0];
  const isWin = trade ? trade.netPnl > 0.01 : true;

  const themes = {
    purple: 'bg-gradient-to-br from-[#1a1236] via-[#0e0a21] to-[#07050e] border-primary/40 shadow-glow-primary',
    neon: 'bg-gradient-to-br from-[#0d1f2d] via-[#05101a] to-[#02070d] border-cyan-500/40 shadow-cyan-500/20',
    obsidian: 'bg-gradient-to-br from-[#18181b] via-[#09090b] to-[#000000] border-white/20',
    emerald: 'bg-gradient-to-br from-[#062419] via-[#03140d] to-[#010a06] border-emerald-500/40 shadow-glow-success'
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Share2 className="w-6 h-6 text-primary-light" />
          <span>Social Share Card Studio</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate high-resolution performance recap graphics for Instagram, Twitter/X, and Telegram.
        </p>
      </div>

      {/* Studio Workspace: Controls (1/3) & Preview (2/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="premium-card p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Trade to Showcase</label>
            <select
              value={selectedTradeId}
              onChange={e => setSelectedTradeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-xs text-white focus:outline-none"
            >
              {accountTrades.map(t => (
                <option key={t.id} value={t.id}>
                  {t.symbol} {t.direction} ({t.netPnl >= 0 ? '+' : ''}${t.netPnl.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Graphic Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'square', label: '1:1 Square' },
                { id: 'story', label: '9:16 Story' },
                { id: 'banner', label: '16:9 Banner' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setAspect(item.id as any)}
                  className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                    aspect === item.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-card text-slate-400 border-border'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Aesthetic Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'purple', label: 'Purple Royalty' },
                { id: 'neon', label: 'Cyber Neon' },
                { id: 'emerald', label: 'Emerald Elite' },
                { id: 'obsidian', label: 'Dark Obsidian' }
              ].map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setCardTheme(theme.id as any)}
                  className={`py-2 text-xs font-bold rounded-lg border capitalize transition-all ${
                    cardTheme === theme.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-card text-slate-400 border-border'
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <Button variant="primary" className="w-full" icon={<Download className="w-4 h-4" />}>
              Download Card (PNG)
            </Button>
            <Button variant="secondary" className="w-full" icon={<Copy className="w-4 h-4" />} onClick={handleCopy}>
              {copied ? 'Copied to Clipboard!' : 'Copy Graphic'}
            </Button>
          </div>
        </div>

        {/* Card Preview Canvas */}
        <div className="md:col-span-2 flex items-center justify-center p-6 bg-surface-card/30 border border-border rounded-2xl">
          {trade && (
            <div
              ref={cardRef}
              className={`p-8 rounded-3xl border text-white transition-all shadow-2xl flex flex-col justify-between relative overflow-hidden ${themes[cardTheme]} ${
                aspect === 'square' ? 'w-[360px] h-[360px]' : aspect === 'story' ? 'w-[300px] h-[520px]' : 'w-[480px] h-[270px]'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary-light" />
                  </div>
                  <span className="font-extrabold text-sm tracking-tight">
                    Trader<span className="text-primary-light">Zone</span>
                  </span>
                </div>
                <div className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-slate-300">
                  {trade.session} Session
                </div>
              </div>

              {/* Card Center: Asset & Big P&L */}
              <div className="my-auto z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-black tracking-tight">{trade.symbol}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    trade.direction === 'BUY' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                  }`}>
                    {trade.direction}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{trade.lotSize} Lots</span>
                </div>

                <div className={`text-4xl font-black font-mono tracking-tight ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(trade.netPnl)}
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs font-mono text-slate-300">
                  <span>Pips: <strong className="text-white">{trade.pips || 0}</strong></span>
                  {trade.realizedRR && <span>R:R: <strong className="text-white">1:{trade.realizedRR}</strong></span>}
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-white/10 pt-3 z-10">
                <div className="text-[10px] text-slate-400">
                  <span>Strategy: </span>
                  <strong className="text-white">{trade.strategyName || 'Price Action'}</strong>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  traderzone.local
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
