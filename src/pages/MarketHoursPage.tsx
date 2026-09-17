import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Globe, Zap, AlertCircle, Flame } from 'lucide-react';

interface MarketSession {
  name: string;
  city: string;
  openUtc: number; // Hour UTC
  closeUtc: number;
  timezone: string;
  color: string;
}

export const MarketHoursPage: React.FC = () => {
  const navigate = useNavigate();
  const [nowUtc, setNowUtc] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowUtc(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sessions: MarketSession[] = [
    { name: 'Sydney Session', city: 'Sydney, Australia', openUtc: 22, closeUtc: 7, timezone: 'AEST (UTC+10)', color: 'border-cyan-500/40 text-cyan-400' },
    { name: 'Tokyo Session', city: 'Tokyo, Japan', openUtc: 0, closeUtc: 9, timezone: 'JST (UTC+9)', color: 'border-amber-500/40 text-amber-400' },
    { name: 'London Session', city: 'London, UK', openUtc: 8, closeUtc: 16, timezone: 'BST (UTC+1)', color: 'border-primary/40 text-primary-light' },
    { name: 'New York Session', city: 'New York, USA', openUtc: 13, closeUtc: 22, timezone: 'EDT (UTC-4)', color: 'border-emerald-500/40 text-emerald-400' }
  ];

  const currentUtcHour = nowUtc.getUTCHours();
  const currentUtcMinute = nowUtc.getUTCMinutes();

  const isSessionOpen = (s: MarketSession) => {
    if (s.openUtc < s.closeUtc) {
      return currentUtcHour >= s.openUtc && currentUtcHour < s.closeUtc;
    } else {
      // Wraps around midnight (e.g. 22 to 7)
      return currentUtcHour >= s.openUtc || currentUtcHour < s.closeUtc;
    }
  };

  const isLondonNyOverlap = currentUtcHour >= 13 && currentUtcHour < 16;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-cyan-400" />
            <span>Global Market Hours & Sessions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live institutional market session tracking, liquidity overlap windows, and session volume clocks.
          </p>
        </div>

        {/* Top-Right Toggle Navigation: Hot Topics vs Market Hours */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/hot-topics')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/10 bg-[#12131a] hover:bg-white/5 text-orange-400 hover:text-orange-300 transition-all shadow-sm"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Hot Topics</span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-purple-500/40 bg-purple-500/15 text-purple-400 shadow-sm shadow-purple-500/20"
          >
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Market Hours</span>
          </button>
        </div>
      </div>

      {/* UTC Clock Banner */}
      <div className="p-6 rounded-2xl bg-surface-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Universal Time</span>
          <div className="text-3xl font-black text-white font-mono mt-1">
            {nowUtc.toUTCString().slice(17, 25)} <span className="text-sm font-normal text-slate-400">UTC</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Local Device Time: {nowUtc.toLocaleTimeString()}
          </div>
        </div>

        {/* London/NY Overlap Alert */}
        {isLondonNyOverlap ? (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
            <Zap className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
            <div>
              <strong className="block text-white">London & New York Overlap Active!</strong>
              <span>Highest liquidity and volatility window of the trading day.</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface border border-border flex items-center gap-3 text-xs text-slate-400">
            <Globe className="w-5 h-5 text-primary-light shrink-0" />
            <div>
              <strong className="block text-white">Standard Session Mode</strong>
              <span>London/NY overlap occurs daily between 13:00 - 16:00 UTC.</span>
            </div>
          </div>
        )}
      </div>

      {/* Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map(s => {
          const open = isSessionOpen(s);
          return (
            <div
              key={s.name}
              className={`premium-card p-6 space-y-4 border ${
                open ? s.color : 'border-border/60 bg-surface-card/40 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{s.name}</h3>
                  <div className="text-xs text-slate-400">{s.city}</div>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    open
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border-border'
                  }`}
                >
                  {open ? 'SESSION OPEN' : 'CLOSED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-border/80">
                <div>
                  <span className="text-slate-400 block">Trading Hours (UTC):</span>
                  <strong className="text-white font-mono">
                    {String(s.openUtc).padStart(2, '0')}:00 - {String(s.closeUtc).padStart(2, '0')}:00
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Timezone:</span>
                  <strong className="text-white font-mono">{s.timezone}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
