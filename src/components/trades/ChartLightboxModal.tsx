import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Download,
  Image as ImageIcon
} from 'lucide-react';

export interface ChartLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  beforeUrl?: string;
  afterUrl?: string;
  initialTab?: 'before' | 'after';
}

export const ChartLightboxModal: React.FC<ChartLightboxModalProps> = ({
  isOpen,
  onClose,
  title = 'Chart Screenshot Visualizer',
  subtitle,
  beforeUrl,
  afterUrl,
  initialTab = 'before'
}) => {
  // Determine which tab to start on based on availability
  const hasBefore = Boolean(beforeUrl);
  const hasAfter = Boolean(afterUrl);

  const getValidTab = (preferred: 'before' | 'after'): 'before' | 'after' => {
    if (preferred === 'after' && hasAfter) return 'after';
    if (preferred === 'before' && hasBefore) return 'before';
    return hasAfter ? 'after' : 'before';
  };

  const [activeTab, setActiveTab] = useState<'before' | 'after'>(() => getValidTab(initialTab));
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  // Pan / Drag State when zoomed
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset tab and zoom when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(getValidTab(initialTab));
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setImageLoading(true);
      setImageError(false);
    }
  }, [isOpen, initialTab, beforeUrl, afterUrl]);

  const currentUrl = activeTab === 'before' ? beforeUrl : afterUrl;

  // Handle ESC key and left/right arrows
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasBefore && activeTab === 'after') {
        setActiveTab('before');
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (e.key === 'ArrowRight' && hasAfter && activeTab === 'before') {
        setActiveTab('after');
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(z => Math.max(0.75, +(z - 0.25).toFixed(2)));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, activeTab, hasBefore, hasAfter]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(0.75, +(z - 0.25).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCopyUrl = () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!currentUrl) return;
    const a = document.createElement('a');
    a.href = currentUrl;
    a.download = `chart_${activeTab}_${Date.now()}.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || zoom > 1) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom(z => Math.max(0.75, Math.min(3, +(z + delta).toFixed(2))));
    }
  };

  // Mouse drag handlers for panning zoomed image
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click toggles between 1x and 1.8x
  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(1.8);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-150"
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/[0.08] bg-slate-900/90 text-white z-20 shrink-0">
        {/* Left: Title & Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white tracking-tight truncate flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 uppercase">
                {activeTab === 'before' ? 'Before (Setup)' : 'After (Outcome)'}
              </span>
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center: Before / After Tab Switcher */}
        {hasBefore && hasAfter && (
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('before');
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setImageLoading(true);
                setImageError(false);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'before'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Before (Setup)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('after');
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setImageLoading(true);
                setImageError(false);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'after'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>After (Outcome)</span>
            </button>
          </div>
        )}

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-950/80 rounded-xl border border-white/10 p-0.5 text-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.75}
              title="Zoom Out (-)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom (0)"
              className="px-2 py-1 text-[11px] font-mono font-bold text-slate-300 hover:text-white"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              title="Zoom In (+)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {zoom !== 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset Zoom & Pan"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-0.5 border-l border-white/10"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Copy URL */}
          {currentUrl && (
            <button
              type="button"
              onClick={handleCopyUrl}
              title="Copy Image URL"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}

          {/* Download */}
          {currentUrl && (
            <button
              type="button"
              onClick={handleDownload}
              title="Download Screenshot"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition-colors hidden sm:block"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Open Original Link in New Tab */}
          {currentUrl && (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Original Image / TradingView in New Tab"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close Lightbox (Esc)"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Full-Size Image Container */}
      <div
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
      >
        {/* Navigation Arrows for Previous/Next Tab */}
        {hasBefore && hasAfter && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(activeTab === 'before' ? 'after' : 'before');
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Switch Screenshot (Left Arrow)"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/15 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(activeTab === 'after' ? 'before' : 'after');
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Switch Screenshot (Right Arrow)"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/15 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Current Image or Fallback */}
        {currentUrl ? (
          <div
            className="relative flex items-center justify-center transition-transform duration-75 ease-out select-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            {imageLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 z-10">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs text-slate-400 font-semibold">Loading High-Res Chart...</span>
              </div>
            )}

            {imageError ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-rose-500/30 text-center max-w-md space-y-3">
                <div className="text-rose-400 font-bold text-sm">Failed to Load Image</div>
                <p className="text-xs text-slate-400">
                  The image could not be loaded directly from the provided URL. You can still open it in a new tab.
                </p>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open URL Directly</span>
                </a>
              </div>
            ) : (
              <img
                src={currentUrl}
                alt={`${title} - ${activeTab}`}
                draggable={false}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                className="max-h-[85vh] max-w-[92vw] w-auto h-auto object-contain rounded-xl shadow-2xl border border-white/[0.08]"
              />
            )}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-dashed border-white/20 text-center max-w-sm space-y-2">
            <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <div className="text-white font-bold text-sm">No Chart Screenshot Attached</div>
            <p className="text-xs text-slate-400">
              No {activeTab} chart URL was saved for this trade.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Hint Footer */}
      <div className="px-5 py-2.5 border-t border-white/[0.08] bg-slate-900/90 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span>Double-click or Scroll wheel to zoom</span>
          {zoom > 1 && <span>Click and drag to pan around chart</span>}
          {hasBefore && hasAfter && <span className="hidden sm:inline">Use Left/Right arrows to toggle Before & After</span>}
        </div>
        <div className="font-mono text-slate-500 text-[10px]">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">Esc</kbd> to exit
        </div>
      </div>
    </div>
  );
};
