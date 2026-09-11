import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/calculations';
import { EmotionalState } from '../types/trade';
import {
  ArrowLeft,
  Trash2,
  PlayCircle,
  CheckCircle,
  Zap
} from 'lucide-react';

export const TradeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accountTrades, updateTrade, deleteTrade } = useTrading();

  const trade = accountTrades.find(t => t.id === id);

  if (!trade) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Trade Not Found</h2>
        <p className="text-xs text-muted">The trade you requested does not exist or has been deleted.</p>
        <Link to="/trades">
          <Button variant="outline" size="sm">Back to Trade History</Button>
        </Link>
      </div>
    );
  }

  const [notes, setNotes] = useState(trade.notes || '');
  const [postMortem, setPostMortem] = useState(trade.postMortem || '');
  const [chartBeforeUrl, setChartBeforeUrl] = useState(trade.chartBeforeUrl || '');
  const [chartAfterUrl, setChartAfterUrl] = useState(trade.chartAfterUrl || '');
  const [emotionalState, setEmotionalState] = useState<EmotionalState>(trade.emotionalState || 'Disciplined');
  const [executionRating, setExecutionRating] = useState<number>(trade.executionRating || 4);
  const [autoSaved, setAutoSaved] = useState(false);

  // Auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      updateTrade(trade.id, {
        notes,
        postMortem,
        chartBeforeUrl: chartBeforeUrl || undefined,
        chartAfterUrl: chartAfterUrl || undefined,
        emotionalState,
        executionRating
      });
      setAutoSaved(true);
      const hideTimer = setTimeout(() => setAutoSaved(false), 1500);
      return () => clearTimeout(hideTimer);
    }, 500);

    return () => clearTimeout(timer);
  }, [notes, postMortem, chartBeforeUrl, chartAfterUrl, emotionalState, executionRating, trade.id]);

  const isWin = trade.netPnl > 0.01;
  const isLoss = trade.netPnl < -0.01;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/trades')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trades</span>
        </button>

        <div className="flex items-center gap-3">
          {autoSaved ? (
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Auto-saved
            </span>
          ) : (
            <span className="text-[11px] text-muted flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Auto-saving
            </span>
          )}

          <Link to={`/replay?tradeId=${trade.id}`}>
            <Button size="sm" variant="secondary" icon={<PlayCircle className="w-4 h-4 text-primary" />}>
              Replay Trade
            </Button>
          </Link>
          <button
            onClick={() => {
              if (confirm('Delete this trade entry?')) {
                deleteTrade(trade.id);
                navigate('/trades');
              }
            }}
            className="p-2 rounded-xl text-muted hover:text-rose-500 hover:bg-rose-500/10 border border-border"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trade Overview Banner */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
        isWin ? 'bg-emerald-500/10 border-emerald-500/30' : isLoss ? 'bg-rose-500/10 border-rose-500/30' : 'bg-surface-card border-border'
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-foreground">{trade.symbol}</span>
            <Badge variant={trade.direction === 'BUY' ? 'buy' : 'sell'}>{trade.direction}</Badge>
            <span className="text-xs font-mono text-muted">#{trade.ticket}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
            <span>Lot Size: <strong className="text-foreground font-mono">{trade.lotSize}</strong></span>
            <span>Duration: <strong className="text-foreground">{trade.durationMinutes ? `${trade.durationMinutes} mins` : 'Open'}</strong></span>
            <span>Session: <strong className="text-foreground">{trade.session}</strong></span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted font-bold uppercase">Net Profit / Loss</div>
          <div className={`text-3xl font-black font-mono ${isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-foreground'}`}>
            {formatCurrency(trade.netPnl)}
          </div>
          <div className="text-xs text-muted mt-0.5">
            Pips: <strong className="font-mono text-foreground">{trade.pips || 0}</strong>
          </div>
        </div>
      </div>

      {/* Execution and Risk Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="text-[10px] text-muted font-bold uppercase">Entry Price</div>
          <div className="text-lg font-black text-foreground font-mono mt-1">{trade.entryPrice}</div>
          <div className="text-[10px] text-muted mt-0.5">
            {new Date(trade.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="premium-card p-4">
          <div className="text-[10px] text-muted font-bold uppercase">Exit Price</div>
          <div className="text-lg font-black text-foreground font-mono mt-1">{trade.exitPrice || 'Running'}</div>
          <div className="text-[10px] text-muted mt-0.5">
            {trade.closeTime ? new Date(trade.closeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </div>
        </div>

        <div className="premium-card p-4">
          <div className="text-[10px] text-muted font-bold uppercase">Stop Loss / Risk</div>
          <div className="text-lg font-black text-rose-500 font-mono mt-1">{trade.stopLoss || 'None'}</div>
          <div className="text-[10px] text-muted mt-0.5">
            Planned R:R: <strong className="text-foreground">1:{trade.plannedRR || '-'}</strong>
          </div>
        </div>

        <div className="premium-card p-4">
          <div className="text-[10px] text-muted font-bold uppercase">Realized R:R</div>
          <div className="text-lg font-black text-primary font-mono mt-1">
            {trade.realizedRR ? `1:${trade.realizedRR}` : '-'}
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            Fees: ${((trade.commission || 0) + (trade.swap || 0)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Chart Visualizer (Before & After Screenshots) */}
      <div className="premium-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Chart Screenshot Visualizer</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Setup / Before */}
          <div>
            <span className="text-xs font-semibold text-muted mb-2 block">Before (Entry Setup)</span>
            {chartBeforeUrl ? (
              <div className="rounded-xl overflow-hidden border border-border bg-black/40 h-64 flex items-center justify-center">
                <img src={chartBeforeUrl} alt="Entry Setup" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-64 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-xs text-muted bg-surface">
                <span>No setup chart attached.</span>
              </div>
            )}
            <input
              type="url"
              value={chartBeforeUrl}
              onChange={e => setChartBeforeUrl(e.target.value)}
              placeholder="Paste Before chart URL..."
              className="mt-2 w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground focus:outline-none"
            />
          </div>

          {/* Result / After */}
          <div>
            <span className="text-xs font-semibold text-muted mb-2 block">After (Outcome & Exit)</span>
            {chartAfterUrl ? (
              <div className="rounded-xl overflow-hidden border border-border bg-black/40 h-64 flex items-center justify-center">
                <img src={chartAfterUrl} alt="Outcome Result" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-64 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-xs text-muted bg-surface">
                <span>No result chart attached.</span>
              </div>
            )}
            <input
              type="url"
              value={chartAfterUrl}
              onChange={e => setChartAfterUrl(e.target.value)}
              placeholder="Paste After chart URL..."
              className="mt-2 w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Psychology & Review Form */}
      <div className="space-y-4">
        <div className="premium-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Emotional State During Trade</label>
              <select
                value={emotionalState}
                onChange={e => setEmotionalState(e.target.value as EmotionalState)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
              >
                <option value="Disciplined">Disciplined (Executed Plan)</option>
                <option value="Calm">Calm & Patient</option>
                <option value="Confident">Confident</option>
                <option value="FOMO">FOMO (Jumped in Early)</option>
                <option value="Revenge">Revenge Mindset</option>
                <option value="Impatient">Impatient (Closed Winner Early)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Execution Rating (1-5 Stars)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setExecutionRating(star)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-bold ${
                      executionRating >= star
                        ? 'bg-amber-500/20 text-amber-500 border-amber-500/50 shadow-sm'
                        : 'bg-surface text-muted border-border'
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Entry Setup & Confluences</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why did you take this trade? What technical confluences lined up?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Post-Mortem & Lessons Learned</label>
            <textarea
              rows={3}
              value={postMortem}
              onChange={e => setPostMortem(e.target.value)}
              placeholder="What went right? What could be executed better next time?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
