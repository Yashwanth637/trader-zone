import React from 'react';
import { DrawingType } from '../../types/backtest';
import {
  MousePointer,
  TrendingUp,
  Minus,
  Square,
  ArrowUpRight,
  ArrowDownRight,
  Ruler,
  Trash2,
  Undo2
} from 'lucide-react';

interface DrawingToolbarProps {
  activeTool: DrawingType;
  onSelectTool: (tool: DrawingType) => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  canDelete: boolean;
  drawingCount: number;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  onDeleteSelected,
  onClearAll,
  canDelete,
  drawingCount
}) => {
  const tools: { id: DrawingType; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      id: 'cursor',
      label: 'Cursor',
      icon: <MousePointer className="w-4 h-4" />,
      tooltip: 'Select & Move / Delete Drawings'
    },
    {
      id: 'trendline',
      label: 'Trendline',
      icon: <TrendingUp className="w-4 h-4" />,
      tooltip: 'Trendline (Click 2 points)'
    },
    {
      id: 'horizontal_ray',
      label: 'Horizontal Ray',
      icon: <Minus className="w-4 h-4" />,
      tooltip: 'Support & Resistance Level'
    },
    {
      id: 'rectangle',
      label: 'Zone Box',
      icon: <Square className="w-4 h-4" />,
      tooltip: 'Order Block / FVG Box (Click 2 corners)'
    },
    {
      id: 'long_position',
      label: 'Long Position',
      icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />,
      tooltip: 'Long Position Risk-Reward Tool'
    },
    {
      id: 'short_position',
      label: 'Short Position',
      icon: <ArrowDownRight className="w-4 h-4 text-rose-400" />,
      tooltip: 'Short Position Risk-Reward Tool'
    },
    {
      id: 'measure',
      label: 'Measure',
      icon: <Ruler className="w-4 h-4 text-amber-400" />,
      tooltip: 'Measure Pips & Candle Range'
    }
  ];

  return (
    <div className="flex flex-col gap-1.5 p-1.5 bg-surface-card/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl z-20">
      {tools.map(tool => {
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool(tool.id)}
            title={tool.tooltip}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150 relative group ${
              isActive
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
            }`}
          >
            {tool.icon}
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {tool.label}
            </div>
          </button>
        );
      })}

      <div className="w-full h-px bg-border/80 my-1" />

      {/* Delete Selected */}
      <button
        type="button"
        disabled={!canDelete}
        onClick={onDeleteSelected}
        title="Delete Selected Drawing (Del/Backspace)"
        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors relative group ${
          canDelete
            ? 'text-rose-400 hover:bg-rose-500/15'
            : 'text-slate-600 cursor-not-allowed'
        }`}
      >
        <Trash2 className="w-4 h-4" />
        <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Delete Selected
        </div>
      </button>

      {/* Clear All */}
      {drawingCount > 0 && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Clear all ${drawingCount} drawings on this chart?`)) {
              onClearAll();
            }
          }}
          title={`Clear All Drawings (${drawingCount})`}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors relative group"
        >
          <Undo2 className="w-4 h-4" />
          <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-slate-900 border border-slate-700 text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Clear All ({drawingCount})
          </div>
        </button>
      )}
    </div>
  );
};
