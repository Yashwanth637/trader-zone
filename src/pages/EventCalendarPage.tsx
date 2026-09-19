import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  Search,
  Flame,
  FolderOpen,
  Folder,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import {
  EconomicEvent,
  ImpactLevel,
  CURRENCY_METADATA,
  generateMonthlyCalendar,
  fetchLiveForexFactoryCalendar,
  mergeCalendarData
} from '../lib/eventCalendarService';
import { EventDetailModal } from '../components/calendar/EventDetailModal';

type TimeHorizon = 'this_week' | 'month' | 'next_week' | 'today';

// Authentic Forex Factory Jagged Factory Icon (matching Image 3)
const ForexFactoryIcon: React.FC<{ impact: ImpactLevel; className?: string }> = ({
  impact,
  className = 'w-4 h-4'
}) => {
  const colorMap = {
    High: 'fill-red-500 text-red-500 drop-shadow-[0_1px_2px_rgba(239,68,68,0.3)]',
    Medium: 'fill-orange-500 text-orange-500 drop-shadow-[0_1px_2px_rgba(249,115,22,0.3)]',
    Low: 'fill-yellow-400 text-yellow-400',
    Holiday: 'fill-slate-400 text-slate-400'
  };

  return (
    <svg viewBox="0 0 16 11" className={`${className} ${colorMap[impact]} shrink-0 inline-block`}>
      <polygon points="1,10 1,4 4,6 4,2 8,5 8,1 12,4 12,1 15,1 15,10" />
    </svg>
  );
};

export const EventCalendarPage: React.FC = () => {
  const navigate = useNavigate();

  // Current real-time clock
  const [nowUtc, setNowUtc] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowUtc(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Selected Year & Month (Defaults to current date)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth()); // 0-based

  // Horizon tab: 'this_week' (Default as in Image 2) | 'month' | 'next_week' | 'today'
  const [horizon, setHorizon] = useState<TimeHorizon>('this_week');

  // Filters
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  
  // 4-Tier News Intensity Multi-Select Filter (Image 3: High and Holiday checked by default)
  const [selectedImpacts, setSelectedImpacts] = useState<Set<ImpactLevel>>(
    new Set(['High', 'Holiday'])
  );

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Events state
  const [monthlyEvents, setMonthlyEvents] = useState<EconomicEvent[]>(() =>
    generateMonthlyCalendar(new Date().getFullYear(), new Date().getMonth())
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncText, setLastSyncText] = useState<string>('Forex Factory feed synchronized');

  // Modal state
  const [selectedModalEvent, setSelectedModalEvent] = useState<EconomicEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Load calendar when year or month changes
  useEffect(() => {
    const generated = generateMonthlyCalendar(selectedYear, selectedMonth);
    setMonthlyEvents(generated);

    // Also fetch live official Forex Factory overlay if current month
    const currentDate = new Date();
    if (selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth()) {
      syncLiveForexFactory(generated);
    }
  }, [selectedYear, selectedMonth]);

  // Synchronize with Forex Factory live bundled feed
  const syncLiveForexFactory = async (baseEvents?: EconomicEvent[]) => {
    setIsRefreshing(true);
    try {
      const liveData = await fetchLiveForexFactoryCalendar();
      const base = baseEvents || monthlyEvents;
      const merged = mergeCalendarData(base, liveData);
      setMonthlyEvents(merged);
      setLastSyncText(`Forex Factory Synced (${liveData.length} events)`);
    } catch (err) {
      console.warn('Sync failed, using macroeconomic baseline', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleImpact = (impact: ImpactLevel) => {
    setSelectedImpacts(prev => {
      const next = new Set(prev);
      if (next.has(impact)) {
        if (next.size > 1) next.delete(impact);
      } else {
        next.add(impact);
      }
      return next;
    });
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const monthLabel = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }, [selectedYear, selectedMonth]);

  // Calculate week ranges in Indian Standard Time (IST, UTC +5:30)
  const weekRanges = useMemo(() => {
    const getIstYMD = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const now = new Date();
    const todayStr = getIstYMD(now);

    const dayName = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDay = dayMap[dayName] ?? now.getDay();

    const sunThisWeek = new Date(now);
    sunThisWeek.setDate(now.getDate() - currentDay);

    const satThisWeek = new Date(sunThisWeek);
    satThisWeek.setDate(sunThisWeek.getDate() + 6);

    const sunNextWeek = new Date(satThisWeek);
    sunNextWeek.setDate(satThisWeek.getDate() + 1);

    const satNextWeek = new Date(sunNextWeek);
    satNextWeek.setDate(sunNextWeek.getDate() + 6);

    return {
      todayStr,
      thisWeekStart: getIstYMD(sunThisWeek),
      thisWeekEnd: getIstYMD(satThisWeek),
      nextWeekStart: getIstYMD(sunNextWeek),
      nextWeekEnd: getIstYMD(satNextWeek)
    };
  }, [nowUtc]);

  // Filter events by Intensity (Image 3), Currency, Search query, and Horizon
  const filteredEvents = useMemo(() => {
    return monthlyEvents.filter(evt => {
      // 1. 4-Tier Intensity filter
      if (!selectedImpacts.has(evt.impact)) {
        return false;
      }

      // 2. Currency filter
      if (selectedCurrency !== 'ALL' && evt.country !== selectedCurrency) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(q);
        const matchesCountry = evt.country.toLowerCase().includes(q);
        const matchesSpecs = evt.specs.measures.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCountry && !matchesSpecs) return false;
      }

      // 4. Horizon filter
      if (horizon === 'today') {
        return evt.date === weekRanges.todayStr;
      }
      if (horizon === 'this_week') {
        return evt.date >= weekRanges.thisWeekStart && evt.date <= weekRanges.thisWeekEnd;
      }
      if (horizon === 'next_week') {
        return evt.date >= weekRanges.nextWeekStart && evt.date <= weekRanges.nextWeekEnd;
      }

      // 'month': full month data
      return true;
    });
  }, [monthlyEvents, selectedImpacts, selectedCurrency, searchQuery, horizon, weekRanges]);

  // Group events by day string (e.g. "2026-09-16")
  const groupedEvents = useMemo(() => {
    const groups: { [dateStr: string]: EconomicEvent[] } = {};
    filteredEvents.forEach(evt => {
      if (!groups[evt.date]) groups[evt.date] = [];
      groups[evt.date].push(evt);
    });
    return groups;
  }, [filteredEvents]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEvents).sort();
  }, [groupedEvents]);

  // Find next upcoming catalyst for banner
  const upcomingEvent = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const futureHigh = monthlyEvents.filter(e => e.impact === 'High' && e.date >= todayStr);
    return futureHigh.length > 0 ? futureHigh[0] : null;
  }, [monthlyEvents]);

  const handleOpenFolder = (evt: EconomicEvent) => {
    setSelectedModalEvent(evt);
    setIsModalOpen(true);
  };

  const currencies = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Page Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Forex Factory Macro Protocol</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-red-500" />
            <span>Economic Event Calendar</span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted mt-1 font-mono flex-wrap">
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {nowUtc.toLocaleTimeString('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })} IST (UTC +5:30)
            </span>
            <span className="hidden sm:inline text-muted">•</span>
            <span className="text-xs text-muted">100% Authentic Forex Factory Economic Data</span>
          </div>
        </div>

        {/* Top-Right Toggle Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/hot-topics')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-border bg-surface hover:bg-black/5 dark:hover:bg-white/5 text-orange-500 transition-all shadow-sm"
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Hot Topics</span>
          </button>

          <button
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-red-500/40 bg-red-500/15 text-red-500 dark:text-red-400 shadow-sm shadow-red-500/20"
          >
            <CalendarIcon className="w-4 h-4 text-red-500" />
            <span>Event Calendar</span>
          </button>

          <button
            onClick={() => navigate('/market-hours')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-border bg-surface hover:bg-black/5 dark:hover:bg-white/5 text-cyan-500 transition-all shadow-sm"
          >
            <Clock className="w-4 h-4 text-cyan-500" />
            <span>Market Hours</span>
          </button>
        </div>
      </div>

      {/* Featured Upcoming High-Impact Catalyst Banner */}
      {upcomingEvent && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-surface-card border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-red-500/5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  Next Market Catalyst
                </span>
                <span className="text-xs font-bold font-mono text-muted">
                  {upcomingEvent.date} @ {upcomingEvent.time} IST (UTC +5:30)
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-foreground mt-0.5 flex items-center gap-2">
                <span>{CURRENCY_METADATA[upcomingEvent.country]?.flag || '🌐'}</span>
                <span>{upcomingEvent.country} {upcomingEvent.title}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {upcomingEvent.forecast && upcomingEvent.forecast !== '-' && (
              <div className="hidden lg:flex flex-col text-right text-xs">
                <span className="text-muted">Consensus Forecast</span>
                <span className="font-mono font-bold text-foreground text-sm">{upcomingEvent.forecast}</span>
              </div>
            )}
            <button
              onClick={() => handleOpenFolder(upcomingEvent)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-500/30 transition-all hover:scale-105"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Specs</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Filter & Navigation Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-border space-y-4">
        {/* Row 1: Month Switcher + Horizon Tabs + Intensity Checkboxes (Image 3) + Sync */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-1 border border-border">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-1 font-black text-foreground text-sm sm:text-base min-w-[140px] text-center">
                {monthLabel}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedYear(new Date().getFullYear());
                setSelectedMonth(new Date().getMonth());
              }}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Current Month
            </button>
          </div>

          {/* Horizon Switcher (This Week / Whole Month / Next Week / Today) */}
          <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-border overflow-x-auto">
            <button
              onClick={() => setHorizon('this_week')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                horizon === 'this_week'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setHorizon('month')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                horizon === 'month'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Whole Month
            </button>
            <button
              onClick={() => setHorizon('next_week')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                horizon === 'next_week'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Next Week
            </button>
            <button
              onClick={() => setHorizon('today')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                horizon === 'today'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Today
            </button>
          </div>

          {/* Forex Factory 4-Tier Intensity Checkbox Bar (Replicating Image 3) */}
          <div className="flex items-center gap-3.5 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-border flex-wrap">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider hidden sm:inline">
              Impact:
            </span>

            {/* Red (High) */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none group">
              <input
                type="checkbox"
                checked={selectedImpacts.has('High')}
                onChange={() => toggleImpact('High')}
                className="w-3.5 h-3.5 rounded text-red-500 focus:ring-0 cursor-pointer accent-red-500"
              />
              <ForexFactoryIcon impact="High" className="w-3.5 h-3.5" />
              <span className="text-foreground text-[11px]">High</span>
            </label>

            {/* Orange (Medium) */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none group">
              <input
                type="checkbox"
                checked={selectedImpacts.has('Medium')}
                onChange={() => toggleImpact('Medium')}
                className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-0 cursor-pointer accent-orange-500"
              />
              <ForexFactoryIcon impact="Medium" className="w-3.5 h-3.5" />
              <span className="text-foreground text-[11px]">Medium</span>
            </label>

            {/* Yellow (Low) */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none group">
              <input
                type="checkbox"
                checked={selectedImpacts.has('Low')}
                onChange={() => toggleImpact('Low')}
                className="w-3.5 h-3.5 rounded text-yellow-500 focus:ring-0 cursor-pointer accent-yellow-400"
              />
              <ForexFactoryIcon impact="Low" className="w-3.5 h-3.5" />
              <span className="text-foreground text-[11px]">Low</span>
            </label>

            {/* Grey (Holiday / Non-Economic) */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none group">
              <input
                type="checkbox"
                checked={selectedImpacts.has('Holiday')}
                onChange={() => toggleImpact('Holiday')}
                className="w-3.5 h-3.5 rounded text-slate-400 focus:ring-0 cursor-pointer accent-slate-400"
              />
              <ForexFactoryIcon impact="Holiday" className="w-3.5 h-3.5" />
              <span className="text-foreground text-[11px]">Holiday</span>
            </label>
          </div>

          {/* Sync Button */}
          <div className="flex items-center gap-3 self-end xl:self-auto">
            <span className="text-[11px] text-muted hidden 2xl:inline">{lastSyncText}</span>
            <button
              onClick={() => syncLiveForexFactory()}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Forex Factory'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Currency Selector + Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-border">
          {/* Currency Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {currencies.map(curr => {
              const meta = CURRENCY_METADATA[curr];
              const isSelected = selectedCurrency === curr;
              return (
                <button
                  key={curr}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-primary/15 text-primary border border-primary/30 font-extrabold shadow-sm'
                      : 'text-muted hover:text-foreground bg-black/5 dark:bg-white/5 border border-transparent'
                  }`}
                >
                  {meta && <span>{meta.flag}</span>}
                  <span>{curr}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Events (CPI, FOMC, Rate...)"
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Forex Factory Calendar Table (Matching Images 1 & 2) */}
      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-card border border-border space-y-3">
            <CalendarIcon className="w-10 h-10 text-muted mx-auto" />
            <div className="text-base font-bold text-foreground">No events match your current filters</div>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Try enabling more intensity tiers (High, Medium, Low, Holiday) or switching to "Whole Month".
            </p>
            <button
              onClick={() => {
                setSelectedCurrency('ALL');
                setSearchQuery('');
                setHorizon('this_week');
                setSelectedImpacts(new Set(['High', 'Medium', 'Low', 'Holiday']));
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              Show All Events
            </button>
          </div>
        ) : (
          sortedDates.map(dateStr => {
            const dayEvents = groupedEvents[dateStr];
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dayHeader = dateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric'
            });

            const isToday = dateStr === weekRanges.todayStr;

            return (
              <div
                key={dateStr}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isToday
                    ? 'border-primary/40 bg-surface-card shadow-lg shadow-primary/5'
                    : 'border-border bg-surface-card'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between ${
                    isToday
                      ? 'bg-primary/10 border-primary/20 text-primary-light font-bold'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-border text-foreground font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className={`w-4 h-4 ${isToday ? 'text-primary' : 'text-muted'}`} />
                    <span className="text-sm tracking-tight">{dayHeader}</span>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary text-white">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {dayEvents.length} {dayEvents.length === 1 ? 'Event' : 'Events'}
                  </div>
                </div>

                {/* Day Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 text-[10px] uppercase font-bold text-muted bg-black/[0.01] dark:bg-white/[0.01]">
                        <th className="py-2.5 px-4 w-28">Time (IST)</th>
                        <th className="py-2.5 px-3 w-20">Currency</th>
                        <th className="py-2.5 px-2 w-14 text-center">Impact</th>
                        <th className="py-2.5 px-2 w-12 text-center">Detail</th>
                        <th className="py-2.5 px-4">Event</th>
                        <th className="py-2.5 px-4 w-28 text-right font-mono">Actual</th>
                        <th className="py-2.5 px-4 w-28 text-right font-mono">Forecast</th>
                        <th className="py-2.5 px-4 w-28 text-right font-mono">Previous</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {dayEvents.map((evt, idx) => {
                        const currencyMeta = CURRENCY_METADATA[evt.country] || { flag: '🌐' };

                        // Timeslot Grouping matching Image 2: Only show time for the first event in that timeslot
                        const isFirstOfTime = idx === 0 || dayEvents[idx - 1].time !== evt.time;
                        const displayTime = isFirstOfTime ? evt.time : '';

                        return (
                          <tr
                            key={evt.id}
                            className="hover:bg-black/5 dark:hover:bg-white/[0.03] transition-colors group"
                          >
                            {/* Time (IST) - Cleaned matching Image 2 */}
                            <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                              {displayTime ? (
                                <span className="text-foreground font-semibold">{displayTime}</span>
                              ) : (
                                <span className="opacity-0 select-none">-</span>
                              )}
                            </td>

                            {/* Currency */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-sm">{currencyMeta.flag}</span>
                                <span className="text-foreground">{evt.country}</span>
                              </div>
                            </td>

                            {/* Authentic Forex Factory Jagged Impact Icon (Image 3) */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <span
                                className="inline-flex items-center justify-center p-1"
                                title={`${evt.impact} Impact`}
                              >
                                <ForexFactoryIcon impact={evt.impact} className="w-4 h-4" />
                              </span>
                            </td>

                            {/* Detail Folder Icon Button (Opens Image 4 Specs Box) */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleOpenFolder(evt)}
                                className="p-1 rounded-md text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors group/btn"
                                title="Click to view authentic Forex Factory Specs & Notes"
                              >
                                <FolderOpen className="w-4 h-4 transition-transform group-hover/btn:scale-115 text-amber-500" />
                              </button>
                            </td>

                            {/* Event Title */}
                            <td className="py-3 px-4 font-medium text-foreground">
                              <button
                                onClick={() => handleOpenFolder(evt)}
                                className="text-left hover:text-primary transition-colors focus:outline-none font-semibold"
                              >
                                {evt.title}
                              </button>
                            </td>

                            {/* Actual */}
                            <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                              {evt.actual ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs ${
                                    evt.outcome === 'beat'
                                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                      : evt.outcome === 'miss'
                                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                      : 'text-foreground'
                                  }`}
                                >
                                  {evt.actual}
                                </span>
                              ) : (
                                <span className="text-muted text-xs">-</span>
                              )}
                            </td>

                            {/* Forecast */}
                            <td className="py-3 px-4 text-right font-mono text-muted text-xs whitespace-nowrap">
                              {evt.forecast}
                            </td>

                            {/* Previous */}
                            <td className="py-3 px-4 text-right font-mono text-muted text-xs whitespace-nowrap">
                              {evt.previous}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Folder Details Modal (Image 4 Specs Box) */}
      <EventDetailModal
        isOpen={isModalOpen}
        event={selectedModalEvent}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedModalEvent(null);
        }}
      />
    </div>
  );
};
