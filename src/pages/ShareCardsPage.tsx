import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatSignedPnl } from '../lib/calculations';
import {
  Share2,
  Download,
  Sparkles,
  Check,
  CheckCircle2,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

export const ShareCardsPage: React.FC = () => {
  const { accountTrades } = useTrading();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const cardRef = useRef<HTMLDivElement>(null);

  const [cardTheme, setCardTheme] = useState<'purple' | 'neon' | 'emerald' | 'obsidian'>('purple');
  const [aspect, setAspect] = useState<'square' | 'story' | 'banner'>('square');
  const [selectedTradeId, setSelectedTradeId] = useState<string>(accountTrades[0]?.id || '');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [sharing, setSharing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const trade = accountTrades.find(t => t.id === selectedTradeId) || accountTrades[0];
  const isWin = trade ? trade.netPnl >= 0 : true;

  // Adaptive Card Themes: Changes automatically based on Light vs Dark Mode
  const themes = {
    purple: {
      light: 'bg-gradient-to-br from-white via-purple-50/70 to-violet-100/80 border-purple-200 text-slate-900 shadow-xl shadow-purple-500/10',
      dark: 'bg-gradient-to-br from-[#1a1236] via-[#0e0a21] to-[#07050e] border-primary/40 text-white shadow-glow-primary'
    },
    neon: {
      light: 'bg-gradient-to-br from-white via-sky-50/70 to-cyan-100/80 border-sky-200 text-slate-900 shadow-xl shadow-sky-500/10',
      dark: 'bg-gradient-to-br from-[#0d1f2d] via-[#05101a] to-[#02070d] border-cyan-500/40 text-white shadow-cyan-500/20'
    },
    emerald: {
      light: 'bg-gradient-to-br from-white via-emerald-50/70 to-teal-100/80 border-emerald-200 text-slate-900 shadow-xl shadow-emerald-500/10',
      dark: 'bg-gradient-to-br from-[#062419] via-[#03140d] to-[#010a06] border-emerald-500/40 text-white shadow-glow-success'
    },
    obsidian: {
      light: 'bg-white border-slate-300 text-slate-900 shadow-xl shadow-slate-900/5',
      dark: 'bg-gradient-to-br from-[#18181b] via-[#09090b] to-[#000000] border-white/20 text-white'
    }
  };

  const currentThemeClasses = isLight ? themes[cardTheme].light : themes[cardTheme].dark;

  /**
   * Generates a high-resolution canvas with 3x retina scaling for crisp social sharing.
   * For JPEG, applies an explicit background color to prevent transparent corners from turning solid black.
   */
  const renderCardToCanvas = async (format?: 'png' | 'jpeg'): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;

    // For JPEG export, transparent corners of rounded elements turn black without a background.
    // For PNG, keeping null preserves natural transparent boundary or smooth background.
    const bgColor = format === 'jpeg'
      ? (isLight ? '#ffffff' : '#0b0b0e')
      : null;

    return await html2canvas(cardRef.current, {
      scale: 3, // 3x HD resolution (e.g. 1080x1080px for standard 1:1)
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgColor,
      logging: false,
      imageTimeout: 0,
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.querySelector('[data-share-card="true"]');
        if (clonedCard instanceof HTMLElement) {
          clonedCard.style.transition = 'none';
          clonedCard.style.transform = 'none';
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
      const dataUrl = canvas.toDataURL(mimeType, 0.95);

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

      // 1. Check if native Web Share API with files is supported (Safari/iOS/Android/macOS)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Trader Zone - ${trade?.symbol} Trade Recap`,
          text: `Check out my ${trade?.symbol} ${trade?.direction} trade (${trade ? formatCurrency(trade.netPnl) : ''}) on Trader Zone!`,
          files: [file]
        });
        setStatusMessage('Shared successfully!');
      } else if (navigator.clipboard && window.ClipboardItem) {
        // 2. Fallback: Copy the high-res PNG image directly to clipboard
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
        // If user cancelled, don't show error
        setStatusMessage('Copying to clipboard...');
        try {
          const canvas = await renderCardToCanvas();
          if (canvas) {
            canvas.toBlob(async b => {
              if (b && navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]);
                setStatusMessage('Graphic copied to clipboard!');
              }
            }, 'image/png');
          }
        } catch {
          // ignore
        }
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
          Generate high-resolution performance recap graphics for Instagram, Twitter/X, and Telegram.
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
              className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              {accountTrades.map(t => (
                <option key={t.id} value={t.id}>
                  {t.symbol} {t.direction} ({formatSignedPnl(t.netPnl)})
                </option>
              ))}
            </select>
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
              <label className="text-xs font-semibold text-foreground">Aesthetic Theme</label>
              <span className="text-[10px] text-muted font-medium">
                {isLight ? 'Light Adaptive' : 'Dark Adaptive'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'purple', label: isLight ? 'Royal Lavender' : 'Purple Royalty' },
                { id: 'neon', label: isLight ? 'Cyan Sky' : 'Cyber Neon' },
                { id: 'emerald', label: isLight ? 'Mint Elite' : 'Emerald Elite' },
                { id: 'obsidian', label: isLight ? 'Minimal White' : 'Dark Obsidian' }
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

            {/* Share Option (Replacing Copy Graphic) */}
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
        <div className="md:col-span-2 flex items-center justify-center p-6 bg-surface-card/40 border border-border rounded-2xl min-h-[420px]">
          {trade ? (
            <div
              ref={cardRef}
              data-share-card="true"
              className={`p-7 sm:p-8 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden ${currentThemeClasses} ${
                aspect === 'square' ? 'w-[360px] h-[360px]' : aspect === 'story' ? 'w-[300px] h-[520px]' : 'w-[480px] h-[270px]'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-sm ${
                    isLight ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/[0.12] border border-white/10 text-primary-light'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm tracking-tight">
                    <span>Trader</span>
                    <span className="text-primary">Zone</span>
                  </span>
                </div>
                <div className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                  isLight ? 'bg-slate-100 border border-slate-200 text-slate-700' : 'bg-white/[0.10] border border-white/10 text-slate-300'
                }`}>
                  {trade.session} Session
                </div>
              </div>

              {/* Card Center: Asset & Big P&L */}
              <div className="my-auto z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {trade.symbol}
                  </span>
                  <span className={`inline-flex items-center justify-center leading-none h-5 px-2 rounded-md font-black text-[10px] shrink-0 select-none ${
                    trade.direction === 'BUY'
                      ? isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                  }`}>
                    {trade.direction}
                  </span>
                  <span className={`text-xs font-mono font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {trade.lotSize} Lots
                  </span>
                </div>

                <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight my-1 ${
                  isWin
                    ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                    : isLight ? 'text-rose-600' : 'text-rose-400'
                }`}>
                  {formatCurrency(trade.netPnl)}
                </div>

                <div className={`flex items-center gap-3.5 mt-2.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  <span>Pips: <strong className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{trade.pips || 0}</strong></span>
                  {trade.realizedRR && (
                    <span>R:R: <strong className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>1:{trade.realizedRR}</strong></span>
                  )}
                  {trade.returnPercentage !== undefined && (
                    <span>Return: <strong className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{trade.returnPercentage >= 0 ? '+' : ''}{trade.returnPercentage.toFixed(2)}%</strong></span>
                  )}
                </div>
              </div>

              {/* Card Divider & Footer */}
              <div className="mt-auto z-10 w-full">
                <div className={`w-full h-[1px] mb-2.5 ${isLight ? 'bg-slate-200/90' : 'bg-white/10'}`} />
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] flex items-center gap-1 min-w-0 flex-1 truncate">
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Strategy:</span>
                    <strong className={`truncate font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {trade.strategyName || 'Price Action'}
                    </strong>
                  </div>
                  <div className={`text-[10px] font-semibold shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
                    traderzone.live
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
