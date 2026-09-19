import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Flame,
  FolderOpen,
  Folder,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  ExternalLink,
  Sparkles,
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

type TimeHorizon = 'month' | 'this_week' | 'next_week' | 'today';

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

  // Horizon tab: 'this_week' (Default as requested) | 'month' | 'next_week' | 'today'
  const [horizon, setHorizon] = useState<TimeHorizon>('this_week');

  // Filters
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [highImpactOnly, setHighImpactOnly] = useState<boolean>(true); // DEFAULT ONLY HIGH IMPACT as requested
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Events state
  const [monthlyEvents, setMonthlyEvents] = useState<EconomicEvent[]>(() =>
    generateMonthlyCalendar(new Date().getFullYear(), new Date().getMonth())
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncText, setLastSyncText] = useState<string>('Live feed synchronized');

  // Modal state
  const [selectedModalEvent, setSelectedModalEvent] = useState<EconomicEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Load calendar when year or month changes
  useEffect(() => {
    const generated = generateMonthlyCalendar(selectedYear, selectedMonth);
    setMonthlyEvents(generated);

    // Also fetch live overlay if current month
    const currentDate = new Date();
    if (selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth()) {
      syncLiveForexFactory(generated);
    }
  }, [selectedYear, selectedMonth]);

  // Synchronize with Forex Factory live feed
  const syncLiveForexFactory = async (baseEvents?: EconomicEvent[]) => {
    setIsRefreshing(true);
    try {
      const liveData = await fetchLiveForexFactoryCalendar();
      const base = baseEvents || monthlyEvents;
      const merged = mergeCalendarData(base, liveData);
      setMonthlyEvents(merged);
      setLastSyncText(`Updated ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.warn('Sync failed, using macroeconomic baseline', err);
    } finally {
      setIsRefreshing(false);
    }
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

  // Calculate week ranges for 'this_week' and 'next_week' in Indian Standard Time (IST, UTC +5:30)
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

  // Filter events
  const filteredEvents = useMemo(() => {
    return monthlyEvents.filter(evt => {
      // 1. High Impact filter
      if (highImpactOnly && evt.impact !== 'High') {
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
  }, [monthlyEvents, highImpactOnly, selectedCurrency, searchQuery, horizon, weekRanges]);

  // Group events by day string (e.g. "2026-09-18")
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

  // Find next upcoming high-impact event for the banner
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
            <span>High-Impact Event Calendar</span>
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
            <span className="text-xs text-muted">Tier-1 Forex Factory Macro Economic Calendar</span>
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

      {/* Featured Upcoming High-Impact Banner */}
      {upcomingEvent && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-surface-card border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-red-500/5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  Next High-Impact Catalyst
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
            <div className="hidden lg:flex flex-col text-right text-xs">
              <span className="text-muted">Consensus Forecast</span>
              <span className="font-mono font-bold text-foreground text-sm">{upcomingEvent.forecast}</span>
            </div>
            <button
              onClick={() => handleOpenFolder(upcomingEvent)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-500/30 transition-all hover:scale-105"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Folder Specs</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Filter & Navigation Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-border space-y-4">
        {/* Month Switcher + Horizon Tabs + Refresh */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          {/* Horizon Switcher (All Month / This Week / Next Week / Today) */}
          <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-border overflow-x-auto">
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

          {/* Sync Button */}
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <span className="text-[11px] text-muted hidden sm:inline">{lastSyncText}</span>
            <button
              onClick={() => syncLiveForexFactory()}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live Feed'}</span>
            </button>
          </div>
        </div>

        {/* Second Row: Currency Selector + Search Bar + Impact Filter */}
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

          {/* Search & High Impact Toggle */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search CPI, NFP, GDP..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* High Impact Only Toggle */}
            <button
              onClick={() => setHighImpactOnly(!highImpactOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                highImpactOnly
                  ? 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30'
                  : 'bg-black/5 dark:bg-white/5 text-muted border-border'
              }`}
              title="Show only High Impact economic releases"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>High Impact Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forex Factory Calendar Table */}
      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-card border border-border space-y-3">
            <CalendarIcon className="w-10 h-10 text-muted mx-auto" />
            <div className="text-base font-bold text-foreground">No events match your current filter</div>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Try switching to "Whole Month", resetting the currency filter to ALL, or clearing your search term.
            </p>
            <button
              onClick={() => {
                setSelectedCurrency('ALL');
                setSearchQuery('');
                setHorizon('month');
                setHighImpactOnly(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              Reset Filters
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
                      {dayEvents.map(evt => {
                        const currencyMeta = CURRENCY_METADATA[evt.country] || { flag: '🌐' };

                        return (
                          <tr
                            key={evt.id}
                            className="hover:bg-black/5 dark:hover:bg-white/[0.03] transition-colors group"
                          >
                            {/* Time (IST) */}
                            <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                              <span className="text-foreground font-semibold">{evt.time}</span>
                            </td>

                            {/* Currency */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-sm">{currencyMeta.flag}</span>
                                <span className="text-foreground">{evt.country}</span>
                              </div>
                            </td>

                            {/* Impact Icon (Signature Forex Factory Red Folder Badge) */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded ${
                                  evt.impact === 'High'
                                    ? 'bg-red-500/20 text-red-500 border border-red-500/40 shadow-xs'
                                    : evt.impact === 'Medium'
                                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                                    : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/40'
                                }`}
                                title={`${evt.impact} Impact`}
                              >
                                <Folder className="w-3.5 h-3.5 fill-current" />
                              </span>
                            </td>

                            {/* Detail Folder Button (Interactive, replicates FF folder icon) */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleOpenFolder(evt)}
                                className="p-1 rounded-md text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors group/btn"
                                title="Click to view full event specifications, why traders care, and expected volatility"
                              >
                                <FolderOpen className="w-4 h-4 transition-transform group-hover/btn:scale-115 text-slate-400 hover:text-red-400" />
                              </button>
                            </td>

                            {/* Event Title */}
                            <td className="py-3 px-4 font-medium text-foreground">
                              <button
                                onClick={() => handleOpenFolder(evt)}
                                className="text-left hover:text-primary transition-colors focus:outline-none"
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

      {/* Interactive Folder Details Modal */}
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
