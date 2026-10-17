import React, { useState } from 'react';
import { DrawingType } from '../../types/backtest';
import {
  Plus,
  MousePointer,
  TrendingUp,
  Minus,
  Maximize2,
  Square,
  ArrowUpRight,
  ArrowDownRight,
  Ruler,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Magnet,
  Type,
  Circle,
  PenTool,
  ChevronRight,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

interface ToolItem {
  id: DrawingType;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

interface ToolGroup {
  id: string;
  label: string;
  defaultTool: DrawingType;
  items: ToolItem[];
}

interface TradingViewDrawingToolbarProps {
  activeTool: DrawingType;
  onSelectTool: (tool: DrawingType) => void;
  isMagnetMode: boolean;
  onToggleMagnet: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
  isHidden: boolean;
  onToggleHide: () => void;
  onClearAll: () => void;
  drawingCount: number;
}

export const TradingViewDrawingToolbar: React.FC<TradingViewDrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  isMagnetMode,
  onToggleMagnet,
  isLocked,
  onToggleLock,
  isHidden,
  onToggleHide,
  onClearAll,
  drawingCount
}) => {
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);

  const toolGroups: ToolGroup[] = [
    {
      id: 'cursor_group',
      label: 'Cursors',
      defaultTool: 'crosshair',
      items: [
        { id: 'crosshair', label: 'Crosshair', icon: <Plus className="w-4 h-4" /> },
        { id: 'cursor', label: 'Arrow / Pointer', icon: <MousePointer className="w-4 h-4" /> }
      ]
    },
    {
      id: 'lines_group',
      label: 'Trend Lines',
      defaultTool: 'trendline',
      items: [
        { id: 'trendline', label: 'Trend Line', icon: <TrendingUp className="w-4 h-4" />, shortcut: 'Alt+T' },
        { id: 'ray', label: 'Ray', icon: <TrendingUp className="w-4 h-4 opacity-75" /> },
        { id: 'horizontal_ray', label: 'Horizontal Ray', icon: <Minus className="w-4 h-4" />, shortcut: 'Alt+J' },
        { id: 'horizontal_line', label: 'Horizontal Line', icon: <Minus className="w-4 h-4 font-black" />, shortcut: 'Alt+H' },
        { id: 'vertical_line', label: 'Vertical Line', icon: <Minus className="w-4 h-4 rotate-90" />, shortcut: 'Alt+V' }
      ]
    },
    {
      id: 'fib_group',
      label: 'Gann & Fibonacci',
      defaultTool: 'fib_retracement',
      items: [
        { id: 'fib_retracement', label: 'Fib Retracement', icon: <Activity className="w-4 h-4 text-amber-500" />, shortcut: 'Alt+F' }
      ]
    },
    {
      id: 'shapes_group',
      label: 'Geometric Shapes',
      defaultTool: 'rectangle',
      items: [
        { id: 'rectangle', label: 'Rectangle (Zone / FVG)', icon: <Square className="w-4 h-4 text-emerald-400" /> },
        { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4 text-sky-400" /> },
        { id: 'brush', label: 'Brush / Freehand', icon: <PenTool className="w-4 h-4 text-purple-400" /> }
      ]
    },
    {
      id: 'text_group',
      label: 'Annotation Tools',
      defaultTool: 'text',
      items: [
        { id: 'text', label: 'Text Note', icon: <Type className="w-4 h-4" /> },
        { id: 'price_label', label: 'Price Label', icon: <Plus className="w-4 h-4 text-indigo-400" /> }
      ]
    },
    {
      id: 'projections_group',
      label: 'Prediction & Measurement',
      defaultTool: 'long_position',
      items: [
        { id: 'long_position', label: 'Long Position', icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" /> },
        { id: 'short_position', label: 'Short Position', icon: <ArrowDownRight className="w-4 h-4 text-rose-400" /> },
        { id: 'measure', label: 'Measure (Ruler)', icon: <Ruler className="w-4 h-4 text-amber-400" />, shortcut: 'Shift+Click' }
      ]
    }
  ];

  return (
    <div
      className="flex flex-col items-center gap-1 p-1 bg-surface-card/95 backdrop-blur-md border border-border/40 dark:border-white/[0.08] rounded-xl shadow-xl z-30 select-none"
      onMouseLeave={() => setOpenFlyout(null)}
    >
      {toolGroups.map(group => {
        // Find if any item in this group is currently active
        const activeInGroup = group.items.find(item => item.id === activeTool);
        const currentItem = activeInGroup || group.items[0];
        const isGroupActive = !!activeInGroup;
        const isFlyoutOpen = openFlyout === group.id;

        return (
          <div key={group.id} className="relative group/btn">
            <div className="flex items-center">
              {/* Main Tool Button */}
              <button
                type="button"
                onClick={() => {
                  onSelectTool(currentItem.id);
                  setOpenFlyout(null);
                }}
                title={currentItem.label}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isGroupActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {currentItem.icon}
              </button>

              {/* Flyout Arrow for Sub-tools */}
              {group.items.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFlyout(isFlyoutOpen ? null : group.id);
                  }}
                  title={`More ${group.label}`}
                  className="w-2.5 h-8 flex items-center justify-center text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-r-md -ml-0.5"
                >
                  <ChevronRight className={`w-2.5 h-2.5 transition-transform ${isFlyoutOpen ? 'rotate-90' : ''}`} />
                </button>
              )}
            </div>

            {/* Sub-tools Flyout Popover Menu */}
            {isFlyoutOpen && (
              <div className="absolute left-full top-0 ml-1.5 w-48 p-1.5 rounded-xl bg-surface border border-border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50 mb-1">
                  {group.label}
                </div>
                {group.items.map(item => {
                  const isItemActive = activeTool === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTool(item.id);
                        setOpenFlyout(null);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                        isItemActive
                          ? 'bg-blue-600 text-white'
                          : 'text-foreground hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <span className={`text-[10px] font-mono ${isItemActive ? 'text-blue-200' : 'text-muted'}`}>
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Divider */}
      <div className="w-6 h-px bg-border/60 my-1" />

      {/* Magnet Mode Snapping Toggle */}
      <button
        type="button"
        onClick={onToggleMagnet}
        title={isMagnetMode ? 'Magnet Mode ON (Snaps to High/Low/Open/Close)' : 'Magnet Mode OFF'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          isMagnetMode
            ? 'bg-primary text-white shadow-md shadow-primary/30'
            : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
        }`}
      >
        <Magnet className="w-4 h-4" />
      </button>

      {/* Lock All Drawings */}
      <button
        type="button"
        onClick={onToggleLock}
        title={isLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          isLocked
            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
            : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
        }`}
      >
        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>

      {/* Hide / Unhide All Drawings */}
      <button
        type="button"
        onClick={onToggleHide}
        title={isHidden ? 'Show Drawings' : 'Hide Drawings'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          isHidden
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
            : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
        }`}
      >
        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* Clear All Drawings (Trash) */}
      <button
        type="button"
        onClick={onClearAll}
        disabled={drawingCount === 0}
        title="Remove All Drawings"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
