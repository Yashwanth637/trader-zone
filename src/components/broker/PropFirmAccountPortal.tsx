import React, { useState, useMemo } from 'react';
import { TradingAccount, Trade, PropStage } from '../../types/trade';
import { calculatePropStageMetrics, PropStageMetrics, FUNDED_ROOM_RULES } from '../../lib/propFirmRules';
import { formatCurrency, sortTradesDescending } from '../../lib/calculations';
import { Button } from '../ui/Button';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Lock,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  Zap,
  Target
} from 'lucide-react';

interface PropFirmAccountPortalProps {
  account: TradingAccount;
  trades: Trade[];
  onAdvanceStage: (accountId: string) => void;
  onBack: () => void;
  isActive: boolean;
  onSetActive: () => void;
}

export const PropFirmAccountPortal: React.FC<PropFirmAccountPortalProps> = ({
  account,
  trades,
  onAdvanceStage,
  onBack,
  isActive,
  onSetActive
}) => {
  const activeStage: PropStage = account.propFirmData?.currentStage || 'stage1';
  const [selectedStage, setSelectedStage] = useState<PropStage>(activeStage);

  // Synchronize with active stage if changed
  React.useEffect(() => {
    setSelectedStage(activeStage);
  }, [activeStage]);

  // Calculate metrics for active and selected stage
  const activeStageMetrics: PropStageMetrics = useMemo(() => {
    return calculatePropStageMetrics(account, trades, activeStage);
  }, [account, trades, activeStage]);

  const selectedStageMetrics: PropStageMetrics = useMemo(() => {
    return calculatePropStageMetrics(account, trades, selectedStage);
  }, [account, trades, selectedStage]);

  // Determine locked state for each tab
  const getTabStatus = (stage: PropStage): 'LOCKED' | 'ACTIVE' | 'PASSED' => {
    if (stage === 'stage1') {
      return activeStage === 'stage1' ? 'ACTIVE' : 'PASSED';
    }
    if (stage === 'stage2') {
      if (activeStage === 'stage1') return 'LOCKED';
      return activeStage === 'stage2' ? 'ACTIVE' : 'PASSED';
    }
    // funded
    if (activeStage === 'stage1' || activeStage === 'stage2') return 'LOCKED';
    return 'ACTIVE';
  };

  const isSelectedStageLocked = getTabStatus(selectedStage) === 'LOCKED';

  // Trades filtered for selected stage
  const stageTrades = useMemo(() => {
    const raw = trades.filter(t => {
      if (t.accountId !== account.id) return false;
      const tStage = t.propStage || 'stage1';
      return tStage === selectedStage;
    });
    return sortTradesDescending(raw);
  }, [trades, account.id, selectedStage]);

  // SVG Circular Ring Helper (Exact Image 3 style)
  const renderCircleProgress = (
    percent: number,
    centerTextLine1: string,
    centerTextLine2?: string,
    color: string = '#10b981'
  ) => {
    const radius = 26;
    const strokeWidth = 3.5;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-border/60 dark:text-white/[0.08]"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-black leading-tight text-foreground font-mono">
            {centerTextLine1}
          </span>
          {centerTextLine2 && (
            <span className="text-[9px] font-semibold text-muted leading-tight">
              {centerTextLine2}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none">
      {/* Top Navigation & Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Broker Hub</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-400" />
              <span>{account.name}</span>
            </h1>
            {isActive ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary text-white font-bold flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE ACCOUNT
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={onSetActive}>
                Set as Active
              </Button>
            )}
          </div>
          <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{account.broker}</span>
            <span>•</span>
            <span>2-Step Evaluation Program</span>
            <span>•</span>
            <span>Base Valuation: <strong className="text-foreground font-mono">{formatCurrency(account.initialBalance)}</strong></span>
            <span>•</span>
            <span>Currency: <strong className="text-foreground">{account.currency || 'USD'}</strong></span>
          </div>
        </div>

        {/* Current Active Stage Badge */}
        <div className="flex items-center gap-2">
          <div className="p-3 rounded-2xl bg-surface border border-border/80 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-muted">Current Active Phase</div>
              <div className="text-xs font-black text-foreground uppercase tracking-wide">
                {activeStage === 'stage1' ? 'Stage 1 (Phase 1)' : activeStage === 'stage2' ? 'Stage 2 (Phase 2)' : 'Funded Stage'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Stage Tab Navigation Bar (Requirement 2 & 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1.5 rounded-2xl bg-surface border border-border/80 shadow-sm">
        {/* Tab 1: Stage 1 */}
        <button
          type="button"
          onClick={() => setSelectedStage('stage1')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
            selectedStage === 'stage1'
              ? 'bg-surface-card border-primary text-foreground shadow-md ring-1 ring-primary/40'
              : 'border-transparent text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">Stage 1: Phase 1</span>
              {getTabStatus('stage1') === 'PASSED' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  PASSED
                </span>
              )}
              {getTabStatus('stage1') === 'ACTIVE' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted">
              8% Profit Target · Min 5 Days
            </div>
          </div>
          {getTabStatus('stage1') === 'PASSED' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Target className="w-5 h-5 text-purple-400 shrink-0" />
          )}
        </button>

        {/* Tab 2: Stage 2 */}
        <button
          type="button"
          onClick={() => setSelectedStage('stage2')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
            selectedStage === 'stage2'
              ? 'bg-surface-card border-primary text-foreground shadow-md ring-1 ring-primary/40'
              : 'border-transparent text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">Stage 2: Phase 2</span>
              {getTabStatus('stage2') === 'PASSED' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  PASSED
                </span>
              )}
              {getTabStatus('stage2') === 'ACTIVE' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  ACTIVE
                </span>
              )}
              {getTabStatus('stage2') === 'LOCKED' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted/15 text-muted border border-border">
                  LOCKED
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted">
              5% Profit Target · Min 5 Days
            </div>
          </div>
          {getTabStatus('stage2') === 'PASSED' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : getTabStatus('stage2') === 'ACTIVE' ? (
            <Target className="w-5 h-5 text-purple-400 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-muted shrink-0" />
          )}
        </button>

        {/* Tab 3: Funded Stage */}
        <button
          type="button"
          onClick={() => setSelectedStage('funded')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
            selectedStage === 'funded'
              ? 'bg-surface-card border-emerald-500 text-foreground shadow-md ring-1 ring-emerald-500/40'
              : 'border-transparent text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">Funded Stage</span>
              {getTabStatus('funded') === 'ACTIVE' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  FUNDED
                </span>
              )}
              {getTabStatus('funded') === 'LOCKED' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted/15 text-muted border border-border">
                  LOCKED
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted">
              Profit Split & Payouts · 6% Max DD
            </div>
          </div>
          {getTabStatus('funded') === 'ACTIVE' ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-muted shrink-0" />
          )}
        </button>
      </div>

      {/* =========================================================================
          VIEW A: LOCKED STAGE GATE SCREEN (Requirement 4)
         ========================================================================= */}
      {isSelectedStageLocked ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-surface border border-border/80 text-center space-y-6 shadow-md animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {activeStage === 'stage1' ? 'Stage 1 is not completed yet' : 'Stage 2 is not completed yet'}
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              Until and unless your current evaluation phase ({activeStage === 'stage1' ? 'Stage 1' : 'Stage 2'}) is fully passed, the next stage remains locked. Review your remaining requirements below:
            </p>
          </div>

          {/* Incomplete Requirements Checklist Card */}
          <div className="max-w-xl mx-auto rounded-2xl bg-surface-card border border-border p-5 text-left space-y-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted pb-2 border-b border-border flex items-center justify-between">
              <span>{activeStage === 'stage1' ? 'Stage 1 Objectives Status' : 'Stage 2 Objectives Status'}</span>
              <span className="text-primary font-mono">{activeStageMetrics.rule.name}</span>
            </div>

            {/* Checklist item 1: Profit Target */}
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <span>Profit Target:</span>
                  <span className="font-mono text-primary">{activeStageMetrics.rule.profitTargetPercent}% ({formatCurrency(activeStageMetrics.targetAmount || 0)})</span>
                </div>
                <div className="text-[11px] text-muted">
                  Achieved: {formatCurrency(activeStageMetrics.realizedPnl)} ({activeStageMetrics.targetDonePercent.toFixed(1)}%) ·{' '}
                  <strong className={activeStageMetrics.isTargetAchieved ? 'text-emerald-400' : 'text-amber-400'}>
                    {activeStageMetrics.isTargetAchieved ? 'Target Reached' : `${formatCurrency(activeStageMetrics.targetRemaining)} to go`}
                  </strong>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                activeStageMetrics.isTargetAchieved
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted/15 text-muted border border-border'
              }`}>
                {activeStageMetrics.isTargetAchieved ? 'Complete' : 'In progress'}
              </span>
            </div>

            {/* Checklist item 2: Minimum Trading Days */}
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <span>Minimum Trading Days:</span>
                  <span className="font-mono">{activeStageMetrics.minTradingDays} Days</span>
                </div>
                <div className="text-[11px] text-muted">
                  Completed: {activeStageMetrics.qualifyingDaysCount} / {activeStageMetrics.minTradingDays} days (moves $\ge$ 0.25%) ·{' '}
                  <strong className={activeStageMetrics.isTradingDaysAchieved ? 'text-emerald-400' : 'text-amber-400'}>
                    {activeStageMetrics.isTradingDaysAchieved ? 'Satisfied' : `${activeStageMetrics.minTradingDays - activeStageMetrics.qualifyingDaysCount} day(s) remaining`}
                  </strong>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                activeStageMetrics.isTradingDaysAchieved
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted/15 text-muted border border-border'
              }`}>
                {activeStageMetrics.isTradingDaysAchieved ? 'Complete' : 'In progress'}
              </span>
            </div>

            {/* Checklist item 3: Maximum Total Drawdown */}
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <span>Max Total Loss:</span>
                  <span className="font-mono">{activeStageMetrics.rule.maxTotalLossPercent}% ({formatCurrency(activeStageMetrics.maxTotalLossAmount)})</span>
                </div>
                <div className="text-[11px] text-muted">
                  Current Drawdown: {formatCurrency(activeStageMetrics.totalDrawdown)} · Buffer: {formatCurrency(activeStageMetrics.maxLossRemaining)}
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                activeStageMetrics.isMaxLossBreached
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {activeStageMetrics.isMaxLossBreached ? 'Breached' : 'On track'}
              </span>
            </div>
          </div>

          <div>
            <Button
              variant="primary"
              onClick={() => setSelectedStage(activeStage)}
              className="font-bold"
            >
              Return to Current {activeStage === 'stage1' ? 'Stage 1' : 'Stage 2'}
            </Button>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW B: UNLOCKED STAGE DASHBOARD & TRADE EXECUTION AUDIT (Requirement 2 & 4)
           ========================================================================= */
        <div className="space-y-6">
          {/* Advancement Banner: If Current Stage is 100% Passed */}
          {selectedStage === activeStage && selectedStageMetrics.isPassed && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-purple-600/20 to-primary/20 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    🎉 Congratulations! You have passed {selectedStageMetrics.rule.name}!
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    All profit target and minimum trading day objectives have been satisfied with zero breaches.
                  </p>
                </div>
              </div>

              {activeStage !== 'funded' && (
                <Button
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-600/25 shrink-0"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => onAdvanceStage(account.id)}
                >
                  Advance to {activeStage === 'stage1' ? 'Stage 2 (Phase 2)' : 'Funded Stage'}
                </Button>
              )}
            </div>
          )}

          {/* Past Stage Notice if inspecting historical stage */}
          {selectedStage !== activeStage && (
            <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Viewing historical completed audit for <strong className="text-foreground">{selectedStageMetrics.rule.name}</strong>.
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedStage(activeStage)}>
                Switch to Current Stage ({activeStage.toUpperCase()})
              </Button>
            </div>
          )}

          {/* 5 Circular Objectives Tracker Cards (Exact Image 3 Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Profit Target */}
            <div className="p-4 rounded-2xl bg-surface border border-border/80 flex items-center gap-3.5 shadow-sm">
              {renderCircleProgress(
                selectedStage === 'funded' ? 100 : selectedStageMetrics.targetDonePercent,
                selectedStage === 'funded' ? '—' : `${Math.round(selectedStageMetrics.targetDonePercent)}%`,
                selectedStage === 'funded' ? 'payout' : 'done',
                selectedStageMetrics.isTargetAchieved ? '#10b981' : '#6366f1'
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-muted">Profit target</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedStage === 'funded' || selectedStageMetrics.isTargetAchieved
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-muted/15 text-muted border border-border'
                    }`}
                  >
                    {selectedStage === 'funded' ? 'Active' : selectedStageMetrics.isTargetAchieved ? 'Complete' : 'In progress'}
                  </span>
                </div>
                <div className="text-sm font-black text-foreground truncate font-mono">
                  {selectedStage === 'funded'
                    ? `${formatCurrency(selectedStageMetrics.realizedPnl)} net`
                    : selectedStageMetrics.targetRemaining <= 0
                    ? 'Goal Reached!'
                    : `${formatCurrency(selectedStageMetrics.targetRemaining)} to go`}
                </div>
                <div className="text-[11px] text-muted truncate">
                  {selectedStage === 'funded'
                    ? 'Profit split / payouts'
                    : `${formatCurrency(selectedStageMetrics.realizedPnl)} of ${formatCurrency(selectedStageMetrics.targetAmount || 0)} (${selectedStageMetrics.rule.profitTargetPercent}%)`}
                </div>
              </div>
            </div>

            {/* Card 2: Trading Days */}
            <div className="p-4 rounded-2xl bg-surface border border-border/80 flex items-center gap-3.5 shadow-sm">
              {renderCircleProgress(
                (selectedStageMetrics.qualifyingDaysCount / selectedStageMetrics.minTradingDays) * 100,
                `${selectedStageMetrics.qualifyingDaysCount}/${selectedStageMetrics.minTradingDays}`,
                'days',
                '#10b981'
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-muted">Trading days</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedStageMetrics.isTradingDaysAchieved
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-muted/15 text-muted border border-border'
                    }`}
                  >
                    {selectedStageMetrics.isTradingDaysAchieved ? 'Complete' : 'In progress'}
                  </span>
                </div>
                <div className="text-sm font-black text-foreground truncate font-mono">
                  {selectedStageMetrics.isTradingDaysAchieved
                    ? 'Complete'
                    : `${selectedStageMetrics.minTradingDays - selectedStageMetrics.qualifyingDaysCount} Days Left`}
                </div>
                <div className="text-[11px] text-muted truncate">
                  Minimum {selectedStageMetrics.minTradingDays} trading days
                </div>
              </div>
            </div>

            {/* Card 3: Max Loss */}
            <div className="p-4 rounded-2xl bg-surface border border-border/80 flex items-center gap-3.5 shadow-sm">
              {renderCircleProgress(
                selectedStageMetrics.maxLossUsedPercent,
                `${Math.round(selectedStageMetrics.maxLossUsedPercent)}%`,
                'used',
                selectedStageMetrics.isMaxLossBreached ? '#f43f5e' : selectedStageMetrics.maxLossUsedPercent > 60 ? '#f59e0b' : '#94a3b8'
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-muted">Max loss</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedStageMetrics.isMaxLossBreached
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-muted/15 text-muted border border-border'
                    }`}
                  >
                    {selectedStageMetrics.isMaxLossBreached ? 'Breached' : 'On track'}
                  </span>
                </div>
                <div className="text-sm font-black text-foreground truncate font-mono">
                  {formatCurrency(selectedStageMetrics.maxLossRemaining)} left
                </div>
                <div className="text-[11px] text-muted truncate">
                  of {formatCurrency(selectedStageMetrics.maxTotalLossAmount)} ({selectedStageMetrics.rule.maxTotalLossPercent}%) on equity
                </div>
              </div>
            </div>

            {/* Card 4: Daily Loss */}
            <div className="p-4 rounded-2xl bg-surface border border-border/80 flex items-center gap-3.5 shadow-sm">
              {renderCircleProgress(
                selectedStageMetrics.dailyLossUsedPercent,
                `${Math.round(selectedStageMetrics.dailyLossUsedPercent)}%`,
                'used',
                selectedStageMetrics.isDailyLossBreached ? '#f43f5e' : selectedStageMetrics.dailyLossUsedPercent > 60 ? '#f59e0b' : '#94a3b8'
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-muted">Daily loss</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedStageMetrics.isDailyLossBreached
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-muted/15 text-muted border border-border'
                    }`}
                  >
                    {selectedStageMetrics.isDailyLossBreached ? 'Breached' : 'On track'}
                  </span>
                </div>
                <div className="text-sm font-black text-foreground truncate font-mono">
                  {formatCurrency(selectedStageMetrics.dailyLossRemaining)} left today
                </div>
                <div className="text-[11px] text-muted truncate">
                  of {formatCurrency(selectedStageMetrics.maxDailyLossAmount)} ({selectedStageMetrics.rule.maxDailyLossPercent}%) from start equity
                </div>
              </div>
            </div>

            {/* Card 5: Sub-1-min Trades */}
            <div className="p-4 rounded-2xl bg-surface border border-border/80 flex items-center gap-3.5 shadow-sm">
              {renderCircleProgress(
                (selectedStageMetrics.sub1MinTradesPercent / 10) * 100,
                `${selectedStageMetrics.sub1MinTradesPercent}%`,
                'of 10%',
                selectedStageMetrics.isSub1MinCompliant ? '#94a3b8' : '#f43f5e'
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-muted">Sub-1-min trades</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedStageMetrics.isSub1MinCompliant
                        ? 'bg-muted/15 text-muted border border-border'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {selectedStageMetrics.isSub1MinCompliant ? 'On track' : 'Breached'}
                  </span>
                </div>
                <div className="text-sm font-black text-foreground truncate font-mono">
                  {selectedStageMetrics.isSub1MinCompliant ? 'Within cap' : 'Over limit'}
                </div>
                <div className="text-[11px] text-muted truncate">
                  {selectedStageMetrics.sub1MinTradesPercent}% of trades · max 10%
                </div>
              </div>
            </div>
          </div>

          {/* Rules & Limitations Table (Exact Image 2 & Image 4/5) */}
          <div className="premium-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Trading Objectives & Rule Specifications</span>
              </h3>
              <span className="text-xs font-mono font-bold text-muted">
                {account.broker} · {selectedStageMetrics.rule.name}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted uppercase tracking-wider font-semibold">
                    <th className="pb-2.5">Rule / Parameter</th>
                    <th className="pb-2.5">Objective Value</th>
                    <th className="pb-2.5">Live Account Standing</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2.5 font-bold text-foreground">Virtual Balance</td>
                    <td className="py-2.5 font-mono">{formatCurrency(account.initialBalance)}</td>
                    <td className="py-2.5 font-mono font-bold text-foreground">{formatCurrency(selectedStageMetrics.currentBalance)}</td>
                    <td className="py-2.5 text-right text-emerald-400 font-bold">Active</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-foreground">Profit Target</td>
                    <td className="py-2.5 font-mono">
                      {selectedStageMetrics.rule.profitTargetPercent ? `${selectedStageMetrics.rule.profitTargetPercent}% (${formatCurrency(selectedStageMetrics.targetAmount || 0)})` : '— (No Target)'}
                    </td>
                    <td className="py-2.5 font-mono">
                      {formatCurrency(selectedStageMetrics.realizedPnl)} ({selectedStageMetrics.pnlPercent.toFixed(2)}%)
                    </td>
                    <td className="py-2.5 text-right font-bold">
                      <span className={selectedStageMetrics.isTargetAchieved ? 'text-emerald-400' : 'text-amber-400'}>
                        {selectedStageMetrics.isTargetAchieved ? 'Goal Passed' : `${formatCurrency(selectedStageMetrics.targetRemaining)} to go`}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-foreground">Max Daily Loss</td>
                    <td className="py-2.5 font-mono">{selectedStageMetrics.rule.maxDailyLossPercent}% ({formatCurrency(selectedStageMetrics.maxDailyLossAmount)})</td>
                    <td className="py-2.5 font-mono">{formatCurrency(selectedStageMetrics.todayLoss)} today</td>
                    <td className="py-2.5 text-right font-bold">
                      <span className={selectedStageMetrics.isDailyLossBreached ? 'text-rose-400' : 'text-emerald-400'}>
                        {selectedStageMetrics.isDailyLossBreached ? 'Breached' : 'Compliant'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-foreground">Max Total Loss (Drawdown)</td>
                    <td className="py-2.5 font-mono">{selectedStageMetrics.rule.maxTotalLossPercent}% ({formatCurrency(selectedStageMetrics.maxTotalLossAmount)})</td>
                    <td className="py-2.5 font-mono">{formatCurrency(selectedStageMetrics.totalDrawdown)} used</td>
                    <td className="py-2.5 text-right font-bold">
                      <span className={selectedStageMetrics.isMaxLossBreached ? 'text-rose-400' : 'text-emerald-400'}>
                        {selectedStageMetrics.isMaxLossBreached ? 'Breached' : `${formatCurrency(selectedStageMetrics.maxLossRemaining)} buffer`}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-foreground">Min Trading Days</td>
                    <td className="py-2.5 font-mono">{selectedStageMetrics.rule.minTradingDays} Days (balance moves $\ge$ 0.25%)</td>
                    <td className="py-2.5 font-mono">{selectedStageMetrics.qualifyingDaysCount} Days completed</td>
                    <td className="py-2.5 text-right font-bold">
                      <span className={selectedStageMetrics.isTradingDaysAchieved ? 'text-emerald-400' : 'text-amber-400'}>
                        {selectedStageMetrics.isTradingDaysAchieved ? 'Completed' : `${selectedStageMetrics.minTradingDays - selectedStageMetrics.qualifyingDaysCount} remaining`}
                      </span>
                    </td>
                  </tr>
                  {selectedStage === 'funded' && (
                    <>
                      <tr>
                        <td className="py-2.5 font-bold text-foreground">Consistency Rule</td>
                        <td className="py-2.5 font-mono">{selectedStageMetrics.rule.consistencyRulePercent}%</td>
                        <td className="py-2.5 font-mono">Max 15% single-day profit cap</td>
                        <td className="py-2.5 text-right text-emerald-400 font-bold">Compliant</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-foreground">Max Risk Per Trade</td>
                        <td className="py-2.5 font-mono">{selectedStageMetrics.rule.maxRiskPerTradePercent}% per trade</td>
                        <td className="py-2.5 font-mono">Aggregated same-asset per day</td>
                        <td className="py-2.5 text-right text-emerald-400 font-bold">Compliant</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td className="py-2.5 font-bold text-foreground">Trading Period</td>
                    <td className="py-2.5 font-mono">Unlimited</td>
                    <td className="py-2.5 font-mono">No time constraints</td>
                    <td className="py-2.5 text-right text-emerald-400 font-bold">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-foreground">Max Leverage</td>
                    <td className="py-2.5 font-mono" colSpan={2}>{selectedStageMetrics.rule.leverage}</td>
                    <td className="py-2.5 text-right text-muted font-bold">Standard</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Stage Trade Execution History (Requirement 4) */}
          <div className="premium-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  {selectedStageMetrics.rule.name} · Trade Executions
                </h3>
                <p className="text-xs text-muted">
                  Past trades executed and recorded specifically during {selectedStageMetrics.rule.name}.
                </p>
              </div>
              <div className="text-xs text-muted font-mono">
                {stageTrades.length} Trade{stageTrades.length === 1 ? '' : 's'}
              </div>
            </div>

            {stageTrades.length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface/50 border border-border text-center space-y-2">
                <Clock className="w-8 h-8 text-muted mx-auto" />
                <p className="text-xs font-semibold text-foreground">
                  No trades recorded under {selectedStageMetrics.rule.name} yet
                </p>
                <p className="text-[11px] text-muted max-w-md mx-auto">
                  When you log trades or import CSVs while this account is active, your trades will automatically bind to this evaluation phase.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase tracking-wider font-semibold">
                      <th className="pb-2.5">Date</th>
                      <th className="pb-2.5">Symbol</th>
                      <th className="pb-2.5">Side</th>
                      <th className="pb-2.5">Lots</th>
                      <th className="pb-2.5">Entry</th>
                      <th className="pb-2.5">Exit</th>
                      <th className="pb-2.5">Net P&L</th>
                      <th className="pb-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stageTrades.map(t => {
                      const isWin = t.netPnl > 0;
                      return (
                        <tr key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 text-muted font-mono">
                            {t.closeTime ? new Date(t.closeTime).toLocaleDateString() : 'Open'}
                          </td>
                          <td className="py-2.5 font-bold text-foreground">{t.symbol}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              t.direction === 'BUY'
                                ? 'bg-blue-500/15 text-blue-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono">{t.lotSize}</td>
                          <td className="py-2.5 font-mono">{t.entryPrice}</td>
                          <td className="py-2.5 font-mono">{t.exitPrice || '—'}</td>
                          <td className={`py-2.5 font-mono font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}{formatCurrency(t.netPnl)}
                          </td>
                          <td className="py-2.5 text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isWin
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {isWin ? 'WIN' : 'LOSS'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
