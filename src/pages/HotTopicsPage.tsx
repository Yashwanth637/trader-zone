import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import {
  Flame,
  Clock,
  RefreshCw,
  Eye,
  Activity,
  Radio,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import {
  MarketTicker,
  RawHeadline,
  MarketIntelligenceCard,
  getActiveMarketSessions,
  getInitialMarketTickers,
  getInitialHeadlines,
  fetchLiveMarketTickers,
  applyLiveMicroTick,
  fetchLiveNewsHeadlines,
  generateDynamicCardsFromLiveNews,
  generateSparklineSvgPath
} from '../lib/hotTopicsService';

export const HotTopicsPage: React.FC = () => {
  const navigate = useNavigate();
  const { accountTrades } = useTrading();

  // Extract unique symbols the user trades most
  const userSymbols = useMemo(() => {
    const set = new Set<string>();
    accountTrades.forEach(t => {
      if (t.symbol) set.add(t.symbol.toUpperCase());
    });
    // Default pairs if none logged yet
    if (set.size === 0) {
      set.add('XAUUSD');
      set.add('BTCUSD');
      set.add('EURUSD');
    }
    return Array.from(set);
  }, [accountTrades]);

  // Live UTC Clock
  const [nowUtc, setNowUtc] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowUtc(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const utcTimeString = useMemo(() => {
    return nowUtc.toUTCString().slice(17, 25) + ' UTC';
  }, [nowUtc]);

  const activeSessions = useMemo(() => {
    return getActiveMarketSessions(nowUtc.getUTCHours());
  }, [nowUtc]);

  // Live Market Tickers & Headlines state (pre-seeded with initial market cache so animation starts instantly)
  const [tickers, setTickers] = useState<MarketTicker[]>(() => getInitialMarketTickers());
  const [headlines, setHeadlines] = useState<RawHeadline[]>(() => getInitialHeadlines());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedText, setLastRefreshedText] = useState('intel just now');
  const tickersRef = useRef<MarketTicker[]>([]);
  tickersRef.current = tickers;

  // Dynamically synthesized cards from real news & live prices
  const { topStory, gridCards } = useMemo(() => {
    return generateDynamicCardsFromLiveNews(headlines, tickers, userSymbols);
  }, [headlines, tickers, userSymbols]);

  // Count items on user's radar
  const radarCount = useMemo(() => {
    let count = 0;
    if (topStory.isUserMarket) count++;
    gridCards.forEach(c => {
      if (c.isUserMarket) count++;
    });
    return count;
  }, [topStory, gridCards]);

  // Full refresh from live APIs
  const loadLiveMarketData = async () => {
    setIsRefreshing(true);
    try {
      const [newTickers, newHeadlines] = await Promise.all([
        fetchLiveMarketTickers(),
        fetchLiveNewsHeadlines()
      ]);
      setTickers(newTickers);
      setHeadlines(newHeadlines);
      setLastRefreshedText('intel just now');
    } catch (err) {
      console.error('Failed to refresh market data', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadLiveMarketData();
  }, []);

  // Continuous live micro-tick engine (every 2.5 seconds, jitter active live prices)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (tickersRef.current.length > 0) {
        setTickers(prev => applyLiveMicroTick(prev));
      }
    }, 2500);
    return () => clearInterval(tickInterval);
  }, []);

  // Periodic network polling for fresh mark prices (every 12 seconds)
  useEffect(() => {
    const networkPoll = setInterval(async () => {
      try {
        const freshTickers = await fetchLiveMarketTickers();
        setTickers(freshTickers);
      } catch (err) {
        console.warn('Silent price poll failed', err);
      }
    }, 12000);
    return () => clearInterval(networkPoll);
  }, []);

  // Periodic news feed polling (every 45 seconds)
  useEffect(() => {
    const newsPoll = setInterval(async () => {
      try {
        const freshNews = await fetchLiveNewsHeadlines();
        if (freshNews.length > 0) {
          setHeadlines(freshNews);
          setLastRefreshedText('intel just now');
        }
      } catch (err) {
        console.warn('Silent news poll failed', err);
      }
    }, 45000);
    return () => clearInterval(newsPoll);
  }, []);

  // Duplicate tickers array for seamless infinite escalator loop
  const escalatorTickers = useMemo(() => {
    if (tickers.length === 0) return [];
    return [...tickers, ...tickers];
  }, [tickers]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Dynamic Keyframes for Continuous Escalator Marquee */}
      <style>{`
        @keyframes tickerEscalator {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-escalator {
          display: flex;
          width: max-content;
          animation: tickerEscalator 42s linear infinite;
          will-change: transform;
        }
      `}</style>

      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/10">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Hot Topics
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400 mt-0.5">
              What's moving markets right now, matched to your symbols.
            </p>
          </div>
        </div>

        {/* Top-Right Toggle Navigation: Hot Topics vs Market Hours */}
        <div className="flex items-center gap-2.5">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-sm shadow-orange-500/20"
          >
            <Flame className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            <span>Hot Topics</span>
          </button>

          <button
            onClick={() => navigate('/market-hours')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#12131a] hover:bg-black/5 dark:hover:bg-white/5 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-all shadow-sm cursor-pointer"
          >
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Market Hours</span>
          </button>
        </div>
      </div>

      {/* Live Market Ticker Tape: Continuous Infinite Escalator Loop (Image 1) */}
      <div className="bg-white dark:bg-[#12131a] border border-zinc-200 dark:border-white/5 rounded-2xl p-2.5 relative overflow-hidden shadow-sm group">
        {/* Left & Right Smooth Edge Fade Masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-[#12131a] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-[#12131a] to-transparent z-10" />

        {/* Continuous Looping Track */}
        <div className="animate-escalator py-1">
          {escalatorTickers.map((ticker, idx) => {
            const pathData = generateSparklineSvgPath(ticker.sparkline, 55, 18);
            const isGold = ticker.symbol.includes('XAU');

            return (
              <div
                key={`${ticker.symbol}-${idx}`}
                className="flex items-center gap-3 shrink-0 select-none px-5 py-0.5 hover:bg-black/5 dark:hover:bg-white/[0.03] rounded-xl transition-colors cursor-default"
                title={`${ticker.name} - Live: ${ticker.formattedPrice} (${ticker.changePercent >= 0 ? '+' : ''}${ticker.changePercent}%)`}
              >
                {/* Mini Sparkline Chart */}
                <svg className="w-14 h-5 overflow-visible" viewBox="0 0 55 18">
                  <path
                    d={pathData}
                    fill="none"
                    stroke={ticker.isPositive ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Symbol Identifier */}
                <div className="flex items-center gap-1">
                  {isGold && (
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-black mr-0.5">
                      @
                    </span>
                  )}
                  <span className={`text-xs font-bold font-mono tracking-tight ${isGold ? 'text-amber-600 dark:text-amber-300' : 'text-zinc-800 dark:text-zinc-200'}`}>
                    {ticker.displaySymbol}
                  </span>
                </div>

                {/* Live Real-Time Price */}
                <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white transition-all duration-300">
                  {ticker.formattedPrice}
                </span>

                {/* 24h Percentage Change */}
                <div className={`flex items-center text-xs font-mono font-semibold transition-colors duration-300 ${
                  ticker.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  <span>{ticker.isPositive ? '▲' : '▼'}</span>
                  <span>{Math.abs(ticker.changePercent).toFixed(2)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Intelligence Desk Live Status Bar (Image 1) */}
      <div className="bg-white dark:bg-[#12131a] border border-zinc-200 dark:border-white/5 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Left: Desk Live Status & UTC Clock & Session Badges */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400">
              DESK LIVE
            </span>
            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 ml-1">
              {utcTimeString}
            </span>
          </div>

          {/* Session Chips: SYD, TOK, LON, NY */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-white/10">
            {activeSessions.map(session => (
              <div
                key={session.code}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all ${
                  session.isOpen
                    ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center gap-1'
                    : 'text-zinc-500 dark:text-zinc-600 bg-black/[0.04] dark:bg-white/[0.02]'
                }`}
                title={`${session.name} ${session.isOpen ? 'Open' : 'Closed'}`}
              >
                <span>{session.code}</span>
                {session.isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Sentiment Pulse & Impact Tags */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <Activity className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            {/* Split Bull/Bear Bar */}
            <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex overflow-hidden">
              <div className="w-[66%] bg-emerald-500 h-full" />
              <div className="w-[34%] bg-rose-500 h-full" />
            </div>
            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
              4 bull / 2 bear
            </span>
          </div>

          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono tracking-wider">
            4 HIGH-IMPACT
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 font-mono tracking-wider">
            <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{radarCount} ON YOUR RADAR</span>
          </div>
        </div>

        {/* Right: Intel Age & Refresh Button */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-zinc-500 dark:text-zinc-400">{lastRefreshedText}</span>
          <button
            onClick={loadLiveMarketData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500 dark:text-orange-400' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Live Wire · Raw Headlines Card (Image 1) */}
      <div className="bg-white dark:bg-[#12131a] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span className="text-xs font-bold tracking-widest text-zinc-800 dark:text-zinc-300 uppercase font-mono">
              LIVE WIRE · RAW HEADLINES
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {headlines.length} LIVE · SCROLL FOR MORE
          </span>
        </div>

        {/* Headlines Scrollable Feed */}
        <div className="mt-4 divide-y divide-zinc-100 dark:divide-white/[0.03] max-h-56 overflow-y-auto pr-2 custom-scrollbar">
          {headlines.map(headline => (
            <div
              key={headline.id}
              className="py-3 flex items-start gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] px-2 rounded-xl transition-colors group cursor-default"
            >
              <div className={`text-[11px] font-bold font-mono tracking-wider w-28 shrink-0 mt-0.5 ${headline.sourceColor || 'text-zinc-500 dark:text-zinc-400'}`}>
                {headline.source}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm text-zinc-800 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                  {headline.title}
                </p>
              </div>

              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500 shrink-0 mt-0.5">
                {headline.timeAgo}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Featured Breaking Top Story Hero Card (Image 2 Top) */}
      <div className="bg-white dark:bg-[#12131a] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Content */}
          <div className="flex-1 space-y-3.5">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold font-mono">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                ((•)) TOP STORY
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 tracking-wider">
                HIGH
              </span>
              <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg tracking-wider ${
                topStory.sentiment === 'BULLISH'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}>
                {topStory.sentiment === 'BULLISH' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {topStory.sentiment}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 tracking-wider">
                {topStory.timeBadge}
              </span>
              {topStory.isUserMarket && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 tracking-wider">
                  <Target className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                  YOUR MARKET
                </span>
              )}
            </div>

            {/* Headline */}
            <h2 className="text-xl md:text-3xl font-black text-foreground tracking-tight leading-snug">
              {topStory.title}
            </h2>

            {/* Narrative Body */}
            <p className="text-sm md:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed max-w-4xl">
              {topStory.description}
            </p>

            {/* Watch Advisory Callout */}
            {topStory.watchCallout && (
              <div className="flex items-start gap-2 pt-1 text-xs md:text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold font-mono shrink-0 uppercase tracking-wide">
                  <Eye className="w-3.5 h-3.5" />
                  <span>WATCH</span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {topStory.watchCallout}
                </span>
              </div>
            )}

            {/* Impacted Asset Pills */}
            <div className="flex items-center gap-2 pt-2">
              {topStory.affectedSymbols.map(sym => (
                <span
                  key={sym}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300"
                >
                  {sym}
                </span>
              ))}
            </div>
          </div>

          {/* Right Heat Gauge & Live Asset Widget */}
          <div className="shrink-0 flex lg:flex-col items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-white/5 lg:pl-8">
            <div className="text-right">
              <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 dark:text-zinc-500 uppercase">
                HEAT
              </div>
              <div className="text-4xl md:text-5xl font-black font-mono text-orange-500 dark:text-orange-400">
                {topStory.heat}
              </div>
              {/* Heat bar */}
              <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-1.5 overflow-hidden ml-auto">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${topStory.heat}%` }} />
              </div>
            </div>

            {/* Live Asset Card */}
            {topStory.relatedAsset && (
              <div className="bg-zinc-50 dark:bg-[#181922] border border-zinc-200 dark:border-white/5 rounded-xl p-3 w-40">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-800 dark:text-zinc-300">{topStory.relatedAsset.symbol}</span>
                  <span className={`font-semibold ${topStory.relatedAsset.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {topStory.relatedAsset.changeText}
                  </span>
                </div>
                <div className="text-lg font-black font-mono text-zinc-900 dark:text-white mt-1">
                  {topStory.relatedAsset.price}
                </div>
                {topStory.relatedAsset.sparkline && (
                  <svg className="w-full h-7 mt-1.5" viewBox="0 0 55 18">
                    <path
                      d={generateSparklineSvgPath(topStory.relatedAsset.sparkline, 55, 18)}
                      fill="none"
                      stroke={topStory.relatedAsset.isPositive ? '#10b981' : '#f43f5e'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic 2x2 Categorized Intelligence News Cards Grid (Image 2 Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {gridCards.map((card) => {
          return (
            <div
              key={card.id}
              className="bg-white dark:bg-[#12131a] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm hover:border-zinc-300 dark:hover:border-white/10 transition-colors"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500/80 via-rose-500/50 to-transparent" />

              <div>
                {/* Meta Badges Header */}
                <div className="flex flex-wrap items-center gap-2 mb-3.5 text-xs font-mono font-bold">
                  <span className="text-zinc-600 dark:text-zinc-400 font-bold">{card.heat}°</span>

                  {card.isUserMarket && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px]">
                      <Target className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                      YOUR MARKET
                    </span>
                  )}

                  <span className={`px-2 py-0.5 rounded-lg text-[11px] ${
                    card.impactLevel === 'HIGH'
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400'
                  }`}>
                    {card.impactLevel}
                  </span>

                  <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] ${
                    card.sentiment === 'BULLISH'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}>
                    {card.sentiment === 'BULLISH' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {card.sentiment}
                  </span>

                  <span className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 text-[11px]">
                    {card.timeBadge}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight leading-snug">
                  {card.title}
                </h3>

                {/* Narrative Description */}
                <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mt-2.5">
                  {card.description}
                </p>

                {/* Highlight Tags */}
                {card.highlightTags && card.highlightTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {card.highlightTags.map(tag => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-300 text-xs font-mono font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Watch Advisory */}
                {card.watchCallout && (
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-white/5 flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Eye className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {card.watchCallout}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer: Tags & Live Asset Performance */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-zinc-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  {card.affectedSymbols.map(sym => (
                    <span
                      key={sym}
                      className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 font-semibold"
                    >
                      {sym}
                    </span>
                  ))}
                </div>

                {card.relatedAsset && (
                  <div className={`text-xs font-mono font-bold ${
                    card.relatedAsset.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {card.relatedAsset.changeText}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default HotTopicsPage;
