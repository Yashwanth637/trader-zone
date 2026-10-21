import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatSignedPnl } from '../lib/calculations';
import { Trade } from '../types/trade';
import {
  Share2,
  Download,
  Sparkles,
  CheckCircle2,
  Layers,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

export const ShareCardsPage: React.FC = () => {
  const { accountTrades } = useTrading();
  const { theme } = useTheme();
  const isAppLight = theme === 'light';
  const cardRef = useRef<HTMLDivElement>(null);

  const [cardTheme, setCardTheme] = useState<'purple' | 'neon' | 'emerald' | 'obsidian'>('purple');
  const [cardAppearance, setCardAppearance] = useState<'auto' | 'dark' | 'light'>('auto');
  const [aspect, setAspect] = useState<'square' | 'story' | 'banner'>('square');
  const [selectedTradeId, setSelectedTradeId] = useState<string>(accountTrades[0]?.id || '');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [sharing, setSharing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const trade = accountTrades.find(t => t.id === selectedTradeId) || accountTrades[0];
  const isWin = trade ? trade.netPnl >= 0 : true;

  // Determine whether card is in light or dark aesthetic
  const isCardLight = cardAppearance === 'auto' ? isAppLight : cardAppearance === 'light';

  // High-contrast, vibrant themes for both Light and Dark rendering
  const themeStyles = {
    purple: {
      light: {
        container: 'bg-[#faf9ff] border-[#d8d3f8] text-slate-900 shadow-xl shadow-purple-500/10',
        cardBg: '#faf9ff',
        badge: 'bg-purple-100 border-purple-200 text-purple-800',
        statsLabel: 'text-purple-700/80',
        statsValue: 'text-slate-900',
        divider: 'bg-purple-200/70',
        watermark: 'text-purple-900/[0.04]',
        brandTag: 'text-purple-700',
        accentGlow: 'rgba(147, 51, 234, 0.08)'
      },
      dark: {
        container: 'bg-gradient-to-br from-[#160f30] via-[#0d091e] to-[#06040e] border-purple-500/35 text-white shadow-glow-primary',
        cardBg: '#0d091e',
        badge: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
        statsLabel: 'text-purple-400',
        statsValue: 'text-white',
        divider: 'bg-white/10',
        watermark: 'text-white/[0.04]',
        brandTag: 'text-purple-400',
        accentGlow: 'rgba(168, 85, 247, 0.25)'
      }
    },
    neon: {
      light: {
        container: 'bg-[#f4fbff] border-[#bfe4fc] text-slate-900 shadow-xl shadow-sky-500/10',
        cardBg: '#f4fbff',
        badge: 'bg-sky-100 border-sky-200 text-sky-800',
        statsLabel: 'text-sky-700/80',
        statsValue: 'text-slate-900',
        divider: 'bg-sky-200/70',
        watermark: 'text-sky-900/[0.04]',
        brandTag: 'text-sky-700',
        accentGlow: 'rgba(14, 165, 233, 0.08)'
      },
      dark: {
        container: 'bg-gradient-to-br from-[#061828] via-[#030e17] to-[#01050a] border-cyan-500/40 text-white shadow-cyan-500/20',
        cardBg: '#030e17',
        badge: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300',
        statsLabel: 'text-cyan-400',
        statsValue: 'text-white',
        divider: 'bg-white/10',
        watermark: 'text-white/[0.04]',
        brandTag: 'text-cyan-400',
        accentGlow: 'rgba(6, 182, 212, 0.25)'
      }
    },
    emerald: {
      light: {
        container: 'bg-[#f4fbf7] border-[#bfead2] text-slate-900 shadow-xl shadow-emerald-500/10',
        cardBg: '#f4fbf7',
        badge: 'bg-emerald-100 border-emerald-200 text-emerald-800',
        statsLabel: 'text-emerald-700/80',
        statsValue: 'text-slate-900',
        divider: 'bg-emerald-200/70',
        watermark: 'text-emerald-900/[0.04]',
        brandTag: 'text-emerald-700',
        accentGlow: 'rgba(16, 185, 129, 0.08)'
      },
      dark: {
        container: 'bg-gradient-to-br from-[#041a12] via-[#020e09] to-[#010604] border-emerald-500/40 text-white shadow-glow-success',
        cardBg: '#020e09',
        badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
        statsLabel: 'text-emerald-400',
        statsValue: 'text-white',
        divider: 'bg-white/10',
        watermark: 'text-white/[0.04]',
        brandTag: 'text-emerald-400',
        accentGlow: 'rgba(16, 185, 129, 0.25)'
      }
    },
    obsidian: {
      light: {
        container: 'bg-[#ffffff] border-slate-300 text-slate-900 shadow-xl shadow-slate-900/5',
        cardBg: '#ffffff',
        badge: 'bg-slate-100 border-slate-200 text-slate-800',
        statsLabel: 'text-slate-500',
        statsValue: 'text-slate-900',
        divider: 'bg-slate-200',
        watermark: 'text-slate-900/[0.04]',
        brandTag: 'text-slate-700',
        accentGlow: 'rgba(0, 0, 0, 0.04)'
      },
      dark: {
        container: 'bg-gradient-to-br from-[#18181b] via-[#0d0d0f] to-[#050507] border-white/20 text-white',
        cardBg: '#0d0d0f',
        badge: 'bg-white/10 border-white/15 text-slate-200',
        statsLabel: 'text-slate-400',
        statsValue: 'text-white',
        divider: 'bg-white/10',
        watermark: 'text-white/[0.04]',
        brandTag: 'text-slate-300',
        accentGlow: 'rgba(255, 255, 255, 0.08)'
      }
    }
  };

  const currentTheme = isCardLight ? themeStyles[cardTheme].light : themeStyles[cardTheme].dark;

  // Format price with appropriate decimal precision
  const formatPrice = (price?: number, symbol?: string) => {
    if (price === undefined || price === null || isNaN(price)) return 'Market';
    const sym = (symbol || '').toUpperCase();
    if (sym.includes('JPY')) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price >= 10) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    }
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 5 });
  };

  // Format trade duration
  const formatDuration = (t: Trade) => {
    if (t.durationMinutes && t.durationMinutes > 0) {
      if (t.durationMinutes < 60) return `${t.durationMinutes}m`;
      const hours = Math.floor(t.durationMinutes / 60);
      const mins = t.durationMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    if (t.openTime && t.closeTime) {
      const diffMs = new Date(t.closeTime).getTime() - new Date(t.openTime).getTime();
      const diffMins = Math.max(1, Math.round(diffMs / 60000));
      if (diffMins < 60) return `${diffMins}m`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return 'Intraday';
  };

  // Format trade date
  const formatTradeDate = (timeStr?: string) => {
    if (!timeStr) return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) throw new Error();
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Recent Trade';
    }
  };

  // Format asset class badge
  const getAssetBadge = (t: Trade) => {
    const sym = t.symbol.toUpperCase();
    if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('XAUT')) return 'GOLD';
    if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL') || sym.includes('XRP') || sym.includes('BNB') || sym.includes('DOGE')) return 'CRYPTO';
    if (sym.includes('EUR') || sym.includes('GBP') || sym.includes('JPY') || sym.includes('AUD')) return 'FOREX';
    if (sym.includes('WTI') || sym.includes('OIL')) return 'OIL';
    return t.assetClass || 'ASSET';
  };

  // Calculate return % or pips badge
  const getReturnBadge = (t: Trade) => {
    if (t.returnPercentage !== undefined && t.returnPercentage !== null && !isNaN(t.returnPercentage)) {
      return `${t.returnPercentage >= 0 ? '+' : ''}${t.returnPercentage.toFixed(2)}% ROI`;
    }
    if (t.pips !== undefined && t.pips !== null && t.pips !== 0) {
      return `${t.pips > 0 ? '+' : ''}${t.pips} PIPS`;
    }
    if (t.entryPrice && t.lotSize && t.netPnl !== 0) {
      const notional = t.entryPrice * t.lotSize;
      const pct = (t.netPnl / notional) * 100;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% ROI`;
    }
    return t.netPnl >= 0 ? '+WIN' : '-LOSS';
  };

  // Get Risk/Reward
  const getRiskReward = (t: Trade) => {
    if (t.realizedRR && t.realizedRR > 0) return `1 : ${t.realizedRR}`;
    if (t.plannedRR && t.plannedRR > 0) return `1 : ${t.plannedRR}`;
    if (t.pips && Math.abs(t.pips) > 0) {
      return t.netPnl >= 0 ? '1 : 2.0' : '1 : 1.0';
    }
    return '1 : 2.0';
  };

  /**
   * Generates a high-resolution canvas with 3x retina scaling for crisp social sharing.
   */
  const renderCardToCanvas = async (format?: 'png' | 'jpeg'): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;

    // 1. Await all fonts to ensure custom font glyphs (Arial, Inter, JetBrains) are 100% loaded
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // Fallback gracefully
      }
    }

    const el = cardRef.current;
    // Brief layout settle
    await new Promise(r => setTimeout(r, 60));

    const width = el.offsetWidth;
    const height = el.offsetHeight;

    const bgColor = format === 'jpeg' ? (isCardLight ? '#ffffff' : currentTheme.cardBg) : null;

    return await html2canvas(el, {
      scale: 3, // 3x HD resolution (e.g. 1620x930px for banner)
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgColor,
      logging: false,
      imageTimeout: 0,
      scrollX: 0,
      scrollY: 0,
      width: width,
      height: height,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.querySelector('[data-share-card="true"]');
        if (clonedCard instanceof HTMLElement) {
          clonedCard.style.transition = 'none';
          clonedCard.style.transform = 'none';
          clonedCard.style.boxShadow = 'none';
          clonedCard.style.width = `${width}px`;
          clonedCard.style.height = `${height}px`;
          clonedCard.style.maxWidth = `${width}px`;
          clonedCard.style.maxHeight = `${height}px`;

          // Ensure no nested truncation or line-height clipping in html2canvas
          const allTextNodes = clonedCard.querySelectorAll('.font-mono, [data-stat-text="true"], [data-stat-label="true"]');
          allTextNodes.forEach(node => {
            if (node instanceof HTMLElement) {
              node.style.overflow = 'visible';
              node.style.textOverflow = 'clip';
              if (!node.style.lineHeight || node.style.lineHeight === 'normal') {
                node.style.lineHeight = '1.35';
              }
            }
          });
        }
      }
    });
  };

  const handleDownload = async (format: 'png' | 'jpeg') => {
    setDownloading(true);
    setStatusMessage(null);
    try {
      const canvas = await renderCardToCanvas(format);
      if (!canvas) return;

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const dataUrl = canvas.toDataURL(mimeType, 0.98);

      const link = document.createElement('a');
      link.download = `traderzone-${trade?.symbol || 'recap'}-${Date.now()}.${ext}`;
      link.href = dataUrl;
      link.click();

      setStatusMessage(`Saved high-resolution ${format.toUpperCase()}!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      setStatusMessage('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    setStatusMessage(null);
    try {
      const canvas = await renderCardToCanvas('png');
      if (!canvas) return;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(b => resolve(b), 'image/png', 1.0);
      });

      if (!blob) throw new Error('Failed to generate image blob');

      const fileName = `traderzone-${trade?.symbol || 'recap'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 1. Check if native Web Share API with files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Trader Zone - ${trade?.symbol} Trade Recap`,
          text: `Check out my ${trade?.symbol} ${trade?.direction} trade (${trade ? formatCurrency(trade.netPnl) : ''}) on Trader Zone!`,
          files: [file]
        });
        setStatusMessage('Shared successfully!');
      } else if (navigator.clipboard && window.ClipboardItem) {
        // 2. Fallback: Copy high-res PNG image directly to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setStatusMessage('Graphic copied to clipboard! Ready to paste & share.');
      } else {
        // 3. Fallback: trigger download
        handleDownload('png');
      }
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        setStatusMessage('Graphic copied to clipboard!');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
          <Share2 className="w-6 h-6 text-primary" />
          <span>Social Share Card Studio</span>
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Export verified, institutional performance cards for Instagram, Twitter/X, Telegram, and Discord.
        </p>
      </div>

      {/* Studio Workspace: Controls (1/3) & Preview (2/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-5 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Select Trade to Showcase</label>
            <select
              value={selectedTradeId}
              onChange={e => setSelectedTradeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-xs text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {accountTrades.map(t => (
                <option key={t.id} value={t.id}>
                  {t.symbol} {t.direction} ({formatSignedPnl(t.netPnl)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Card Appearance</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-card border border-border rounded-xl">
              {[
                { id: 'auto', label: 'Match App', icon: Monitor },
                { id: 'dark', label: 'Dark Card', icon: Moon },
                { id: 'light', label: 'Light Card', icon: Sun }
              ].map(mode => {
                const Icon = mode.icon;
                const active = cardAppearance === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setCardAppearance(mode.id as any)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      active
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Graphic Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'square', label: '1:1 Square' },
                { id: 'story', label: '9:16 Story' },
                { id: 'banner', label: '16:9 Banner' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setAspect(item.id as any)}
                  className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                    aspect === item.id
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-card text-muted hover:text-foreground border-border'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">Color Palette</label>
              <span className="text-[10px] text-muted font-medium">
                {isCardLight ? 'Light Adaptive' : 'Dark Adaptive'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'purple', label: 'Royal Amethyst' },
                { id: 'neon', label: 'Cyber Cyan' },
                { id: 'emerald', label: 'Emerald Alpha' },
                { id: 'obsidian', label: isCardLight ? 'Executive White' : 'Carbon Obsidian' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setCardTheme(t.id as any)}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border capitalize transition-all truncate text-center ${
                    cardTheme === t.id
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-card text-muted hover:text-foreground border-border'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Download & Share Actions */}
          <div className="pt-3 border-t border-border space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Export High-Resolution Graphic
            </div>

            {/* Direct PNG & JPEG Download Options */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                className="w-full text-xs justify-center py-2.5 font-bold"
                icon={<Download className="w-4 h-4" />}
                onClick={() => handleDownload('png')}
                disabled={downloading || sharing}
              >
                PNG (HD)
              </Button>
              <Button
                variant="secondary"
                className="w-full text-xs justify-center py-2.5 font-bold"
                icon={<ImageIcon className="w-4 h-4" />}
                onClick={() => handleDownload('jpeg')}
                disabled={downloading || sharing}
              >
                JPEG (HD)
              </Button>
            </div>

            {/* Share Option */}
            <Button
              variant="outline"
              className="w-full text-xs justify-center py-2.5 font-bold border-primary/30 hover:bg-primary/10 text-primary"
              icon={<Share2 className="w-4 h-4" />}
              onClick={handleShare}
              disabled={downloading || sharing}
            >
              {sharing ? 'Preparing...' : 'Share Card'}
            </Button>

            {statusMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{statusMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Preview Canvas */}
        <div className="md:col-span-2 flex items-center justify-center p-6 bg-surface-card/40 border border-border rounded-2xl min-h-[460px] overflow-auto">
          {trade ? (
            <div
              ref={cardRef}
              data-share-card="true"
              className={`rounded-[28px] border transition-all relative overflow-hidden select-none ${currentTheme.container} ${
                aspect === 'square'
                  ? 'w-[440px] h-[440px]'
                  : aspect === 'story'
                  ? 'w-[360px] h-[640px]'
                  : 'w-[560px] h-[315px]'
              }`}
              style={{
                backgroundColor: currentTheme.cardBg
              }}
            >
              {/* Candlestick Watermark Background (Zero-empty-void assurance) */}
              <div
                className={`absolute pointer-events-none select-none ${currentTheme.watermark} ${
                  aspect === 'banner'
                    ? 'right-4 bottom-10'
                    : aspect === 'square'
                    ? 'right-4 bottom-12'
                    : 'right-3 bottom-14'
                }`}
              >
                <svg width="190" height="130" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="25" y="35" width="12" height="55" rx="2" fill="currentColor" />
                  <line x1="31" y1="18" x2="31" y2="105" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="65" y="50" width="12" height="40" rx="2" fill="currentColor" />
                  <line x1="71" y1="28" x2="71" y2="115" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="105" y="25" width="12" height="65" rx="2" fill="currentColor" />
                  <line x1="111" y1="12" x2="111" y2="110" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="145" y="45" width="12" height="45" rx="2" fill="currentColor" />
                  <line x1="151" y1="22" x2="151" y2="120" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="180" y="20" width="12" height="60" rx="2" fill="currentColor" />
                  <line x1="186" y1="8" x2="186" y2="98" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </div>

              {/* CARD HEADER (Top Coordinates - Clean Typography, No Mini Cards) */}
              <div
                className={`absolute left-6 right-6 flex items-center justify-between z-10 ${
                  aspect === 'banner' ? 'top-5' : aspect === 'square' ? 'top-6' : 'top-7'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm tracking-tight">
                      <span>Trader</span>
                      <span className="text-primary">Zone</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 tracking-wide">
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>VERIFIED</span>
                    </span>
                  </div>
                </div>

                <div className={`text-[11px] font-bold uppercase tracking-wider ${isCardLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  <span>{trade.session} Session</span> <span className="opacity-40">·</span> <span>{formatTradeDate(trade.openTime)}</span>
                </div>
              </div>

              {/* FORMAT 1: BANNER (16:9) COORDINATE LAYOUT */}
              {aspect === 'banner' && (
                <>
                  {/* Left Column Hero (Coordinates: top 76px, left 24px, width 230px, bottom 56px) */}
                  <div className="absolute top-[76px] left-6 w-[230px] bottom-[56px] flex flex-col justify-between z-10">
                    <div>
                      {/* Symbol Row */}
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black tracking-tight ${isCardLight ? 'text-slate-900' : 'text-white'}`}>
                          {trade.symbol}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 leading-none h-5 px-2 rounded-md font-black text-[10px] select-none ${
                            trade.direction === 'BUY'
                              ? isCardLight
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/40'
                              : isCardLight
                              ? 'bg-rose-500 text-white'
                              : 'bg-rose-500/25 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {trade.direction === 'BUY' ? (
                            <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                          ) : (
                            <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                          )}
                          <span>{trade.direction}</span>
                        </span>
                        <span className={`text-xs font-mono font-bold ${isCardLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {trade.lotSize}L
                        </span>
                      </div>

                      {/* Net P&L Hero */}
                      <div
                        className={`text-[40px] font-black font-mono tracking-tight leading-none mt-2.5 ${
                          isWin
                            ? isCardLight ? 'text-emerald-600' : 'text-emerald-400'
                            : isCardLight ? 'text-rose-600' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(trade.netPnl)}
                      </div>

                      {/* Return Badge (Clean typography, no mini-card) */}
                      <div
                        className={`text-xs font-mono font-bold mt-2 flex items-center gap-1 ${
                          isWin
                            ? isCardLight ? 'text-emerald-600' : 'text-emerald-400'
                            : isCardLight ? 'text-rose-600' : 'text-rose-400'
                        }`}
                      >
                        <span>{getReturnBadge(trade)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Coordinate Divider Line */}
                  <div className={`absolute top-[76px] bottom-[56px] left-[265px] w-[1px] ${currentTheme.divider}`} />

                  {/* Right Column Stats (Coordinates: top 76px, left 290px, right 24px, bottom 56px - NO MINI CARDS) */}
                  <div className="absolute top-[76px] left-[290px] right-6 bottom-[56px] flex flex-col justify-center z-10">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {/* Entry Price */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Entry Price
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          ${formatPrice(trade.entryPrice, trade.symbol)}
                        </div>
                      </div>

                      {/* Exit Price */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Exit Price
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          {trade.exitPrice ? `$${formatPrice(trade.exitPrice, trade.symbol)}` : 'Market'}
                        </div>
                      </div>

                      {/* Risk : Reward */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Risk : Reward
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          {getRiskReward(trade)}
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Duration
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          {formatDuration(trade)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* FORMAT 2: SQUARE (1:1) COORDINATE LAYOUT */}
              {aspect === 'square' && (
                <>
                  {/* Hero (Coordinates: top 76px, left 24px, right 24px) */}
                  <div className="absolute top-[76px] left-6 right-6 z-10">
                    {/* Symbol Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black tracking-tight ${isCardLight ? 'text-slate-900' : 'text-white'}`}>
                          {trade.symbol}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isCardLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {getAssetBadge(trade)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 leading-none h-6 px-2.5 rounded-lg font-black text-[11px] shadow-sm select-none ${
                            trade.direction === 'BUY'
                              ? isCardLight
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                              : isCardLight
                              ? 'bg-rose-500 text-white'
                              : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                          }`}
                        >
                          {trade.direction === 'BUY' ? (
                            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                          <span>{trade.direction}</span>
                        </span>
                        <span className={`text-xs font-mono font-bold ${isCardLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {trade.lotSize} Lots
                        </span>
                      </div>
                    </div>

                    {/* Net P&L Hero + Return Info */}
                    <div className="flex items-baseline justify-between gap-2 mt-2">
                      <div
                        className={`text-[44px] font-black font-mono tracking-tight leading-none ${
                          isWin
                            ? isCardLight ? 'text-emerald-600' : 'text-emerald-400'
                            : isCardLight ? 'text-rose-600' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(trade.netPnl)}
                      </div>
                      <div
                        className={`text-xs font-mono font-bold ${
                          isWin
                            ? isCardLight ? 'text-emerald-600' : 'text-emerald-400'
                            : isCardLight ? 'text-rose-600' : 'text-rose-400'
                        }`}
                      >
                        <span>{getReturnBadge(trade)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Coordinate Divider Line */}
                  <div className={`absolute top-[188px] left-6 right-6 h-[1px] ${currentTheme.divider}`} />

                  {/* Stats Grid (Coordinates: top 208px, left 24px, right 24px - NO MINI CARDS) */}
                  <div className="absolute top-[208px] left-6 right-6 z-10">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      {/* Entry Price */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Entry Price
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-base font-mono font-bold leading-normal ${currentTheme.statsValue}`}
                        >
                          ${formatPrice(trade.entryPrice, trade.symbol)}
                        </div>
                      </div>

                      {/* Exit Price */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Exit Price
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-base font-mono font-bold leading-normal ${currentTheme.statsValue}`}
                        >
                          {trade.exitPrice ? `$${formatPrice(trade.exitPrice, trade.symbol)}` : 'Closed @ Market'}
                        </div>
                      </div>

                      {/* Risk : Reward */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Risk : Reward
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-base font-mono font-bold leading-normal ${currentTheme.statsValue}`}
                        >
                          {getRiskReward(trade)}
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Duration
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-base font-mono font-bold leading-normal ${currentTheme.statsValue}`}
                        >
                          {formatDuration(trade)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* FORMAT 3: STORY (9:16) COORDINATE LAYOUT */}
              {aspect === 'story' && (
                <>
                  {/* Hero (Coordinates: top 82px, left 24px, right 24px) */}
                  <div className="absolute top-[82px] left-6 right-6 z-10">
                    {/* Symbol Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black tracking-tight ${isCardLight ? 'text-slate-900' : 'text-white'}`}>
                          {trade.symbol}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isCardLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {getAssetBadge(trade)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 leading-none h-6 px-2.5 rounded-lg font-black text-[11px] shadow-sm select-none ${
                            trade.direction === 'BUY'
                              ? isCardLight
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                              : isCardLight
                              ? 'bg-rose-500 text-white'
                              : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                          }`}
                        >
                          {trade.direction === 'BUY' ? (
                            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                          <span>{trade.direction}</span>
                        </span>
                        <span className={`text-xs font-mono font-bold ${isCardLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {trade.lotSize} Lots
                        </span>
                      </div>
                    </div>

                    {/* Net P&L Hero */}
                    <div
                      className={`text-[46px] font-black font-mono tracking-tight leading-none mt-3 ${
                        isWin
                          ? isCardLight ? 'text-emerald-600' : 'text-emerald-400'
                          : isCardLight ? 'text-rose-600' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(trade.netPnl)}
                    </div>

                    {/* Return Info */}
                    <div
                      className={`text-sm font-mono font-bold mt-2 flex items-center gap-1 ${
                        isWin
                          ? isCardLight ? 'text-emerald-600' : 'text-emerald-400'
                          : isCardLight ? 'text-rose-600' : 'text-rose-400'
                      }`}
                    >
                      <span>{getReturnBadge(trade)}</span>
                    </div>
                  </div>

                  {/* Horizontal Coordinate Divider Line */}
                  <div className={`absolute top-[210px] left-6 right-6 h-[1px] ${currentTheme.divider}`} />

                  {/* Stats Grid (Coordinates: top 230px, left 24px, right 24px - NO MINI CARDS) */}
                  <div className="absolute top-[230px] left-6 right-6 z-10">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {/* Entry Price */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Entry Price
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          ${formatPrice(trade.entryPrice, trade.symbol)}
                        </div>
                      </div>

                      {/* Exit Price */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Exit Price
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          {trade.exitPrice ? `$${formatPrice(trade.exitPrice, trade.symbol)}` : 'Market'}
                        </div>
                      </div>

                      {/* Risk : Reward */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Risk : Reward
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          {getRiskReward(trade)}
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Duration
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          {formatDuration(trade)}
                        </div>
                      </div>

                      {/* Net Pips */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Net Pips
                        </div>
                        <div
                          data-stat-text="true"
                          className={`text-sm font-mono font-bold ${currentTheme.statsValue}`}
                        >
                          {trade.pips || 0} Pips
                        </div>
                      </div>

                      {/* Execution Score */}
                      <div>
                        <div
                          data-stat-label="true"
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${currentTheme.statsLabel}`}
                        >
                          Execution
                        </div>
                        <div
                          data-stat-text="true"
                          className="text-sm font-bold text-emerald-500"
                        >
                          ★★★★★ Elite
                        </div>
                      </div>
                    </div>

                    {/* Setup Tags */}
                    {trade.setupTags && trade.setupTags.length > 0 && (
                      <div className="pt-4 flex flex-wrap gap-1.5">
                        {trade.setupTags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className={`text-[10px] font-bold tracking-wide ${currentTheme.statsLabel}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* CARD FOOTER (Bottom Coordinates) */}
              <div
                className={`absolute left-6 right-6 z-10 ${
                  aspect === 'banner' ? 'bottom-4' : aspect === 'square' ? 'bottom-5' : 'bottom-6'
                }`}
              >
                <div className={`w-full h-[1px] mb-2.5 ${currentTheme.divider}`} />
                <div className="flex items-center justify-between gap-2 text-[10.5px] leading-normal">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={isCardLight ? 'text-slate-500' : 'text-slate-400'}>Strategy:</span>
                    <strong className={`font-bold ${isCardLight ? 'text-slate-900' : 'text-white'}`}>
                      {trade.strategyName || 'Price Action'}
                    </strong>
                  </div>
                  <div className={`font-bold tracking-normal flex items-center gap-1 shrink-0 ${currentTheme.brandTag}`}>
                    <span>traderzone.live</span>
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted text-xs">
              <Layers className="w-8 h-8 mx-auto mb-2 text-muted" />
              <span>No trades available to generate a share card.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
