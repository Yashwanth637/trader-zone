import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import {
  Flame,
  Award,
  Target,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Settings,
  Calendar,
  ExternalLink,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  calculateProgressTracker,
  ProgressRuleConfig,
  DEFAULT_PROGRESS_CONFIG,
  getTradeDate
} from '../lib/progressTrackerAnalytics';
import { ProgressCalendarCard } from '../components/progress/ProgressCalendarCard';
import { CurrentRulesTableCard } from '../components/progress/CurrentRulesTableCard';

const STORAGE_KEY_CONFIG = 'progress_tracker_rule_config';

export const ProgressTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const { accountTrades, journalEntries, activeAccountId, accounts, saveJournalEntry, getJournalEntryForDate } = useTrading();

  // Rule settings configuration
  const [config, setConfig] = useState<ProgressRuleConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_PROGRESS_CONFIG;
    } catch {
      return DEFAULT_PROGRESS_CONFIG;
    }
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editStartTime, setEditStartTime] = useState(config.startTime);
  const [editMaxRisk, setEditMaxRisk] = useState(String(config.maxRiskUsd));
  const [editMaxLoss, setEditMaxLoss] = useState(String(config.maxDailyLossUsd));

  // Determine initial date: either today, or latest trade date if today has no trades
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    dates.add(todayStr);
    accountTrades.forEach(t => {
      const d = getTradeDate(t);
      if (d) dates.add(d);
    });
    journalEntries.forEach(j => {
      if (j.date) dates.add(j.date);
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [accountTrades, journalEntries, todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Re-sync selectedDate if current selection is empty
  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Compute analytics
  const trackerData = useMemo(() => {
    return calculateProgressTracker(
      selectedDate || todayStr,
      accountTrades,
      journalEntries,
      config
    );
  }, [selectedDate, todayStr, accountTrades, journalEntries, config]);

  // Date formatted as "Daily Checklist, Sep 4"
  const formattedHeaderDate = useMemo(() => {
    if (!selectedDate) return 'Daily Checklist';
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      return `Daily Checklist, ${monthShort} ${day}`;
    } catch {
      return `Daily Checklist, ${selectedDate}`;
    }
  }, [selectedDate]);

  // Handle previous / next date
  const currentIndex = availableDates.indexOf(selectedDate);
  const canGoNewer = currentIndex > 0;
  const canGoOlder = currentIndex < availableDates.length - 1;

  const handlePrevDay = () => {
    if (canGoOlder) {
      setSelectedDate(availableDates[currentIndex + 1]);
    }
  };

  const handleNextDay = () => {
    if (canGoNewer) {
      setSelectedDate(availableDates[currentIndex - 1]);
    }
  };

  // Manual rule toggle override for selected day
  const handleToggleRule = (ruleId: string, currentPassed: boolean) => {
    const existingEntry = getJournalEntryForDate(selectedDate) || {
      date: selectedDate,
      accountId: activeAccountId === 'all' ? (accounts[0]?.id || 'default') : activeAccountId,
      reflectionNotes: '',
      mood: 'Disciplined' as const,
      rating: 3,
      rulesFollowed: {},
    };

    const updatedRules = {
      ...(existingEntry.rulesFollowed || {}),
      [ruleId]: !currentPassed,
    };

    saveJournalEntry({
      ...existingEntry,
      rulesFollowed: updatedRules,
    });
  };

  // Save updated config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: ProgressRuleConfig = {
      startTime: editStartTime.trim() || '09:30',
      maxRiskUsd: Number(editMaxRisk) || 100,
      maxDailyLossUsd: Number(editMaxLoss) || 500,
    };
    setConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    } catch (err) {
      console.error('Failed to save progress rule config', err);
    }
    setSettingsOpen(false);
  };

  // Circular gauge calculations
  const periodScore = trackerData.currentPeriodScore;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, periodScore)) / 100) * circumference;

  // Score color helper
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-[#ef4444]';
  };

  const getProgressBgClass = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-[#ef4444]';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Progress Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build discipline and track your rule consistency
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Date Navigator */}
          <div className="flex items-center bg-card border border-border/50 rounded-xl p-1 shadow-sm">
            <button
              onClick={handlePrevDay}
              disabled={!canGoOlder}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
              title="Previous Active Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2.5 text-xs font-semibold text-foreground font-mono">
              {selectedDate === todayStr ? 'Today' : selectedDate}
            </div>
            <button
              onClick={handleNextDay}
              disabled={!canGoNewer}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
              title="Next Active Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={<SlidersHorizontal className="w-4 h-4 text-muted-foreground" />}
            onClick={() => {
              setEditStartTime(config.startTime);
              setEditMaxRisk(String(config.maxRiskUsd));
              setEditMaxLoss(String(config.maxDailyLossUsd));
              setSettingsOpen(true);
            }}
          >
            Configure Limits
          </Button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Current Streak */}
        <div className="bg-[#12131a] dark:bg-[#12131a] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20 shrink-0" />
            <span>Current Streak</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl md:text-5xl font-extrabold text-foreground font-mono tracking-tight">
              {trackerData.currentStreak}
            </span>
            <span className="text-lg md:text-xl font-medium text-muted-foreground">
              days {trackerData.currentStreak > 0 ? '🔥' : '😊'}
            </span>
          </div>
        </div>

        {/* Card 2: Current Period Score */}
        <div className="bg-[#12131a] dark:bg-[#12131a] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Award className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Current Period Score</span>
          </div>

          <div className="mt-2 flex items-center justify-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-zinc-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Active Purple Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-purple-500 transition-all duration-700 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl md:text-3xl font-black font-mono ${getScoreColorClass(periodScore)}`}>
                  {periodScore}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Today's Progress */}
        <div className="bg-[#12131a] dark:bg-[#12131a] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Target className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Today's Progress</span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
                {trackerData.todayStats.rulesPassed}
              </span>
              <span className="text-xl md:text-2xl font-bold text-muted-foreground/60">
                / {trackerData.todayStats.totalRules}
              </span>
            </div>

            {/* Horizontal Progress Bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBgClass(trackerData.todayStats.complianceScore)}`}
                style={{
                  width: `${(trackerData.todayStats.rulesPassed / trackerData.todayStats.totalRules) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Area: Daily Checklist & Today Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Daily Checklist & Calendar Card (approx 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Daily Checklist Card */}
          <div className="bg-[#12131a] dark:bg-[#12131a] border border-white/5 rounded-2xl p-6 shadow-sm">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
              <h2 className="text-lg md:text-xl font-bold text-foreground">
                {formattedHeaderDate}
              </h2>

              <button
                onClick={() => navigate(`/day-view?date=${selectedDate}`)}
                className="px-4 py-1.5 bg-[#6366f1] hover:bg-[#5254db] text-white text-xs md:text-sm font-medium rounded-xl shadow-md transition-colors active:scale-95 flex items-center gap-1.5"
              >
                <span>View this day</span>
              </button>
            </div>

            {/* Section Subtitle */}
            <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
              AUTOMATED RULES ({trackerData.selectedDayAudit.totalRules})
            </div>

            {/* Rules List */}
            <div className="mt-4 space-y-1">
              {trackerData.selectedDayAudit.rules.map((rule) => {
                return (
                  <div
                    key={rule.id}
                    onClick={() => handleToggleRule(rule.id, rule.isPassed)}
                    className="group flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer"
                    title="Click to toggle rule status for this date"
                  >
                    {/* Left: Checkmark + Rule Title + Status */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="shrink-0 transition-transform group-active:scale-90">
                        {rule.isPassed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/10" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-600 group-hover:text-zinc-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground group-hover:text-white transition-colors truncate">
                          {rule.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {rule.statusLabel}
                        </div>
                      </div>
                    </div>

                    {/* Right: Period Ratio */}
                    <div className="text-xs font-mono text-muted-foreground/70 shrink-0 ml-4">
                      {rule.ratioString}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar Card (Image 1) */}
          <ProgressCalendarCard
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            trades={accountTrades}
            journalEntries={journalEntries}
            config={config}
          />
        </div>

        {/* Right Column: Today Summary (approx 4 cols) */}
        <div className="lg:col-span-4 bg-[#12131a] dark:bg-[#12131a] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-6">
            Today
          </h2>

          <div className="space-y-6">
            {/* Compliance Score */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Compliance Score
              </div>
              <div className={`text-4xl md:text-5xl font-extrabold font-mono ${getScoreColorClass(trackerData.todayStats.complianceScore)}`}>
                {trackerData.todayStats.complianceScore}%
              </div>
            </div>

            {/* Rules Followed */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Rules Followed
              </div>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-3xl md:text-4xl font-extrabold text-foreground">
                  {trackerData.todayStats.rulesPassed}
                </span>
                <span className="text-xl font-bold text-muted-foreground/60">
                  / {trackerData.todayStats.totalRules}
                </span>
              </div>
            </div>

            {/* Current Streak */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Current Streak
              </div>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-3xl md:text-4xl font-extrabold text-foreground">
                  {trackerData.todayStats.currentStreak}
                </span>
                <span className="text-xl font-medium text-muted-foreground/70">
                  days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Rules Performance Table Card (Image 2) */}
      <CurrentRulesTableCard
        ruleSummaries={trackerData.ruleSummaries}
        onEditRules={() => {
          setEditStartTime(config.startTime);
          setEditMaxRisk(String(config.maxRiskUsd));
          setEditMaxLoss(String(config.maxDailyLossUsd));
          setSettingsOpen(true);
        }}
      />

      {/* Rule Limit Configuration Modal */}
      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configure Automated Rule Limits"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Start Trading By (Local Time)
            </label>
            <input
              type="time"
              value={editStartTime}
              onChange={(e) => setEditStartTime(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              required
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Earliest trade of the day must open on or before this time.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Max Risk Per Trade (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={editMaxRisk}
                onChange={(e) => setEditMaxRisk(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Triggers compliance breach if any trade exceeds this dollar risk.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Max Daily Loss Limit (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={editMaxLoss}
                onChange={(e) => setEditMaxLoss(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Daily net PnL loss must not exceed this amount.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setEditStartTime(DEFAULT_PROGRESS_CONFIG.startTime);
                setEditMaxRisk(String(DEFAULT_PROGRESS_CONFIG.maxRiskUsd));
                setEditMaxLoss(String(DEFAULT_PROGRESS_CONFIG.maxDailyLossUsd));
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Defaults
            </button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default ProgressTrackerPage;
