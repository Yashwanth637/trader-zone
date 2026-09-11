import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  ShieldCheck,
  Flame,
  Award,
  Plus,
  CheckCircle2,
  Lock,
  Trophy,
  Zap,
  Target
} from 'lucide-react';

export const ProgressPage: React.FC = () => {
  const { rules, toggleRule, addRule, journalEntries } = useTrading();
  const [newRuleModal, setNewRuleModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleCategory, setRuleCategory] = useState<'Risk' | 'Execution' | 'Psychology' | 'Time'>('Risk');

  // Calculate overall discipline score from journal entries
  let totalChecks = 0;
  let passedChecks = 0;
  journalEntries.forEach(j => {
    if (j.rulesFollowed) {
      Object.values(j.rulesFollowed).forEach(passed => {
        totalChecks++;
        if (passed) passedChecks++;
      });
    }
  });

  const disciplineScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 85;

  const milestones = [
    { id: 'm1', title: 'First Trade Logged', desc: 'Successfully entered your first trade in the journal.', unlocked: true, icon: Target },
    { id: 'm2', title: '5-Day Discipline Streak', desc: 'Maintained 100% rule adherence for 5 trading sessions.', unlocked: true, icon: Flame },
    { id: 'm3', title: 'Risk Master', desc: 'Zero trades executed without an immediate hard stop loss.', unlocked: true, icon: ShieldCheck },
    { id: 'm4', title: '1:3 R:R Sniper', desc: 'Captured a full 1:3.0+ risk to reward setup.', unlocked: true, icon: Trophy },
    { id: 'm5', title: '100 Trades Logged', desc: 'Built a statistically valid sample of execution data.', unlocked: false, icon: Zap }
  ];

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    addRule({
      name: ruleName,
      description: ruleDesc,
      category: ruleCategory,
      enabled: true
    });
    setRuleName('');
    setRuleDesc('');
    setNewRuleModal(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
            <span>Discipline Tracker & Trading Rules</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Build unshakeable consistency by monitoring rule adherence, streak milestones, and behavioral scores.
          </p>
        </div>

        <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setNewRuleModal(true)}>
          Add Custom Rule
        </Button>
      </div>

      {/* Top Banner: Discipline Score & Streak */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="premium-card p-6 border-teal-500/30 bg-teal-500/5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7 text-teal-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Discipline Score</div>
            <div className="text-3xl font-black text-white font-mono mt-0.5">{disciplineScore}%</div>
            <div className="text-[10px] text-teal-400 mt-0.5">Calculated from Daily Reviews</div>
          </div>
        </div>

        <div className="premium-card p-6 border-amber-500/30 bg-amber-500/5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Flame className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Current Discipline Streak</div>
            <div className="text-3xl font-black text-amber-400 font-mono mt-0.5">5 Days</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Consecutive rule compliance</div>
          </div>
        </div>

        <div className="premium-card p-6 border-primary/30 bg-primary/5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <Trophy className="w-7 h-7 text-primary-light" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Active Rules Enforced</div>
            <div className="text-3xl font-black text-white font-mono mt-0.5">
              {rules.filter(r => r.enabled).length} / {rules.length}
            </div>
            <div className="text-[10px] text-primary-light mt-0.5">Risk & execution guardrails</div>
          </div>
        </div>
      </div>

      {/* Rules Catalog */}
      <div className="premium-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Trading Guardrails & Daily Rules</h3>
        <p className="text-xs text-slate-400">
          Toggle rules on or off to adjust your daily discipline checklist.
        </p>

        <div className="divide-y divide-border/60">
          {rules.map(rule => (
            <div key={rule.id} className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{rule.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-slate-400">
                    {rule.category}
                  </span>
                  {rule.isAutomated && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary-light border border-primary/30">
                      Auto-Audited
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{rule.description}</p>
              </div>

              <button
                onClick={() => toggleRule(rule.id)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  rule.enabled ? 'bg-primary' : 'bg-surface-card border border-border'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    rule.enabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Trader Milestones & Badges */}
      <div className="premium-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Trader Milestones & Achievements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {milestones.map(m => (
            <div
              key={m.id}
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                m.unlocked
                  ? 'bg-surface-card border-border text-white'
                  : 'bg-surface-card/30 border-border/40 text-slate-500 opacity-60'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                m.unlocked ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-surface border-border text-slate-600'
              }`}>
                {m.unlocked ? <m.icon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold">{m.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Rule Modal */}
      {newRuleModal && (
        <Modal isOpen={newRuleModal} onClose={() => setNewRuleModal(false)} title="Create New Trading Rule" maxWidth="md">
          <form onSubmit={handleAddRule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rule Name</label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder="e.g. No trades inside 15m of CPI news"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={ruleCategory}
                onChange={e => setRuleCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
              >
                <option value="Risk">Risk Management</option>
                <option value="Execution">Execution & Entry</option>
                <option value="Psychology">Psychology & Discipline</option>
                <option value="Time">Time & Session</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Description</label>
              <textarea
                rows={2}
                value={ruleDesc}
                onChange={e => setRuleDesc(e.target.value)}
                placeholder="Why this rule protects your capital..."
                className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setNewRuleModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Add Rule</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
