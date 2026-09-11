import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/calculations';
import { TradingStrategy } from '../types/trade';
import {
  Layers,
  Plus,
  CheckCircle2,
  TrendingUp,
  Percent,
  Trash2,
  Edit2
} from 'lucide-react';

export const StrategiesPage: React.FC = () => {
  const { strategies, addStrategy, updateStrategy, deleteStrategy, accountTrades } = useTrading();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStrat, setEditingStrat] = useState<TradingStrategy | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timeframe, setTimeframe] = useState('15m');
  const [assetClass, setAssetClass] = useState('Forex / Gold');
  const [rulesText, setRulesText] = useState('');

  const handleOpenCreate = () => {
    setEditingStrat(null);
    setName('');
    setDescription('');
    setTimeframe('15m');
    setAssetClass('Forex / Gold');
    setRulesText('');
    setModalOpen(true);
  };

  const handleOpenEdit = (strat: TradingStrategy) => {
    setEditingStrat(strat);
    setName(strat.name);
    setDescription(strat.description);
    setTimeframe(strat.timeframe);
    setAssetClass(strat.assetClass);
    setRulesText(strat.rules.join('\n'));
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const rules = rulesText.split('\n').map(r => r.trim()).filter(Boolean);

    if (editingStrat) {
      updateStrategy(editingStrat.id, {
        name,
        description,
        timeframe,
        assetClass,
        rules
      });
    } else {
      addStrategy({
        name,
        description,
        timeframe,
        assetClass,
        rules,
        winRate: 0,
        totalTrades: 0,
        netPnl: 0,
        color: '#8b5cf6'
      });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-primary-light" />
            <span>Trading Strategies & Playbooks</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Codify your edge, enforce entry rules, and compare setups to find your highest-yielding strategies.
          </p>
        </div>

        <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Create New Strategy
        </Button>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map(strat => {
          // Calculate stats for this strategy dynamically from account trades
          const stratTrades = accountTrades.filter(t => t.strategyId === strat.id || t.strategyName === strat.name);
          const closed = stratTrades.filter(t => t.status === 'CLOSED');
          const wins = closed.filter(t => t.netPnl > 0.01).length;
          const winRate = closed.length > 0 ? (wins / closed.length) * 100 : (strat.winRate || 0);
          const pnl = closed.length > 0 ? closed.reduce((sum, t) => sum + t.netPnl, 0) : (strat.netPnl || 0);

          return (
            <div key={strat.id} className="premium-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">{strat.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(strat)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Edit Strategy"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete strategy "${strat.name}"?`)) {
                          deleteStrategy(strat.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400"
                      title="Delete Strategy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-4 leading-relaxed">{strat.description}</p>

                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-4">
                  <span className="px-2 py-0.5 rounded bg-surface border border-border">{strat.timeframe}</span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-border">{strat.assetClass}</span>
                </div>

                {/* Rules Checklist */}
                <div className="space-y-1.5 mb-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Entry Rules</span>
                  {strat.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-light shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Footer */}
              <div className="pt-4 border-t border-border/80 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Win Rate</div>
                  <div className="font-mono font-bold text-white text-sm">{winRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Trades</div>
                  <div className="font-mono font-bold text-slate-300 text-sm">{closed.length || strat.totalTrades || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Net Return</div>
                  <div className={`font-mono font-bold text-sm ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(pnl)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingStrat ? 'Edit Strategy' : 'Create Trading Strategy'}
          maxWidth="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Strategy Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. ICT Silver Bullet, Asian Range Breakout"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Overview / Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Core premise of the setup..."
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Timeframe</label>
                <input
                  type="text"
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                  placeholder="e.g. 5m / 15m"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Class</label>
                <input
                  type="text"
                  value={assetClass}
                  onChange={e => setAssetClass(e.target.value)}
                  placeholder="e.g. Forex / Gold"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Entry Rules & Checklist (One per line)
              </label>
              <textarea
                rows={5}
                value={rulesText}
                onChange={e => setRulesText(e.target.value)}
                placeholder="1. Wait for liquidity sweep&#10;2. Displacement candle breaks structure&#10;3. Enter at 50% FVG tap&#10;4. Target opposing pool 1:2 RR"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white font-mono text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">{editingStrat ? 'Save Changes' : 'Create Strategy'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
