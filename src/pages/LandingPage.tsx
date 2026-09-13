import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Brain,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Zap,
  BarChart3,
  PlayCircle,
  KeyRound,
  Eye,
  Check,
  Flame,
  LineChart
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLaunch = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const features = [
    {
      icon: Brain,
      title: 'AI Behavioral Scoring',
      desc: 'Real-time detection of revenge sizing, overtrading, and premature exits before they cost you capital.'
    },
    {
      icon: Layers,
      title: 'Delta India & Broker Sync',
      desc: 'Direct API sync with Delta Exchange India and instant MT4/MT5 CSV import with automated lot scaling.'
    },
    {
      icon: Calendar,
      title: 'Calendar Journal & Heatmaps',
      desc: 'Interactive monthly calendar displaying daily P&L badges, win rates, and psychological reflections.'
    },
    {
      icon: BarChart3,
      title: 'Institutional Analytics',
      desc: 'In-depth drawdown curves, session heatmaps (London, NY, Asian), asset breakdown, and expectancy calculations.'
    },
    {
      icon: PlayCircle,
      title: 'Trade Replay Simulator',
      desc: 'Relive every trade candle-by-candle on interactive charts to pinpoint execution mistakes.'
    },
    {
      icon: Sparkles,
      title: 'AI Chart Vision 2.0',
      desc: 'Upload chart screenshots to automatically identify market structure, order blocks, and high-probability trade plans.'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-slate-100 selection:bg-primary selection:text-white">
      {/* Navigation Header */}
      <nav className="border-b border-border/80 bg-surface/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="font-extrabold text-xl tracking-tight">
            <span className="text-white">Trader</span>
            <span className="text-primary-light ml-0.5">Zone</span>
          </div>
        </div>

        {/* Smooth Scroll Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-300 font-medium">
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('journal-preview')}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-primary-light font-semibold"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Journal Preview</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Pricing
          </button>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/40 text-primary-light text-xs font-bold hover:bg-primary/30 transition-all"
            >
              <span>Dashboard ({user.name})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
              >
                Sign In
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={handleLaunch}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Open Journal
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-xs font-semibold mb-6">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Access Key Gated · Institutional Grade 2.0</span>
          </div>

          <h1 className="text-4xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
            The AI-Powered <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-primary-light">
              Trading Journal
            </span>
          </h1>

          <p className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Track, analyze, and dramatically elevate your trading performance. Auto-sync with Delta Exchange India, unlock AI chart vision, detect behavioral tilt, and master your discipline.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="primary" onClick={handleLaunch} icon={<ArrowRight className="w-5 h-5" />}>
              {user ? 'Launch Trader Zone' : 'Sign In with Access Key'}
            </Button>
            <button
              onClick={() => scrollToSection('journal-preview')}
              className="px-6 py-3 rounded-2xl bg-surface border border-border hover:border-primary/50 text-white text-sm font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-primary" />
              <span>Explore Example Overview</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Multi-Device (MacBook & Phone)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Access Key Protected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Private Encrypted Vault</span>
            </div>
          </div>
        </div>

        {/* Floating App Preview */}
        <div className="max-w-5xl mx-auto mt-16 rounded-2xl border border-border bg-surface shadow-2xl p-4 md:p-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs text-slate-400 font-mono">Institutional Terminal & Journal</span>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Account Overview</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <div className="p-4 rounded-xl bg-surface-card border border-border">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Net P&L</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">+₹84,500.00</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">+8.45% Return</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-border">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Win Rate</div>
              <div className="text-xl font-black text-white font-mono mt-1">73.3%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">11 Wins / 4 Losses</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-border">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Profit Factor</div>
              <div className="text-xl font-black text-primary-light font-mono mt-1">3.12</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Institutional Edge</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-border">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Default Asset</div>
              <div className="text-xl font-black text-amber-300 font-mono mt-1">XAU/USD</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Gold Terminal</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 border-t border-border/80 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary-light mb-3">
              PLATFORM ARSENAL
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Everything You Need in One Workstation
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
              Engineered for discretionary crypto, forex, and futures traders who demand institutional discipline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="premium-card p-6 flex flex-col justify-between hover:border-primary/40 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary-light mb-5">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-border/80 bg-surface/40">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 mb-3">
            SEAMLESS WORKFLOW
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-14">
            How Trader Zone Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-2xl bg-surface border border-border">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-primary/30 mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-white mb-2">Access Key Verification</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your institutional Access Key (<strong>Traderszone</strong>) to unlock registration and log in with your email or username on any MacBook or phone.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-primary/30 mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-white mb-2">Sync Delta India or CSV</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Directly sync closed trades from Delta Exchange India via HMAC-SHA256 API or upload order history CSVs with automated lot scaling (quantity / 1,000).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-primary/30 mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-white mb-2">AI Analyzes Your Edge</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calendar heatmaps automatically highlight your daily P&L, while AI behavioral scoring pinpoints tilt, revenge sizing, and adherence to rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: On-Page Journal Preview & Interactive Example Showcase */}
      <section id="journal-preview" className="py-20 px-6 border-t border-border/80 relative">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
              <Eye className="w-3.5 h-3.5" />
              <span>LIVE JOURNAL SHOWCASE</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Inside Your Trading Journal
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
              Here is a concrete overview of how your daily performance, calendar reflections, and trade logs appear inside Trader Zone.
            </p>
          </div>

          {/* Example Item 1: Calendar Journal Heatmap Preview */}
          <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
                  Example Component 1
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Monthly Calendar & Daily P&L Heatmap
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block">Week Net Result</span>
                <span className="text-lg font-black text-emerald-400 font-mono">+₹72,400.00</span>
              </div>
            </div>

            {/* Mock Calendar Week Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between h-28">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span>Mon, Sep 08</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-center">
                  <div className="text-base font-black text-emerald-400 font-mono">+₹18,400</div>
                  <div className="text-[10px] text-emerald-300">2 Wins / 0 Loss</div>
                </div>
                <div className="text-[9px] text-muted text-center">XAU/USD Gold Scalps</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between h-28">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span>Tue, Sep 09</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-center">
                  <div className="text-base font-black text-emerald-400 font-mono">+₹32,500</div>
                  <div className="text-[10px] text-emerald-300">3 Wins / 0 Loss</div>
                </div>
                <div className="text-[9px] text-muted text-center">Order Block Reversal</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between h-28">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span>Wed, Sep 10</span>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                </div>
                <div className="text-center">
                  <div className="text-base font-black text-rose-400 font-mono">-₹8,200</div>
                  <div className="text-[10px] text-rose-300">0 Win / 1 Loss</div>
                </div>
                <div className="text-[9px] text-muted text-center">Controlled SL Hit</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between h-28">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span>Thu, Sep 11</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-center">
                  <div className="text-base font-black text-emerald-400 font-mono">+₹15,200</div>
                  <div className="text-[10px] text-emerald-300">2 Wins / 1 Loss</div>
                </div>
                <div className="text-[9px] text-muted text-center">BTC/USDT Breakout</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between h-28 col-span-2 sm:col-span-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span>Fri, Sep 12</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-center">
                  <div className="text-base font-black text-emerald-400 font-mono">+₹14,500</div>
                  <div className="text-[10px] text-emerald-300">1 Win / 0 Loss</div>
                </div>
                <div className="text-[9px] text-muted text-center">XAU/USD Trend Ride</div>
              </div>
            </div>
          </div>

          {/* Example Item 2: Institutional Trade Execution Log Table */}
          <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
                  Example Component 2
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-purple-400" />
                  Institutional Trade Log & Scaled Contract Execution
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-card border border-border text-muted font-mono hidden sm:inline">
                Format: DD-MM-YYYY · Lots / 1000
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Entry</th>
                    <th className="py-2.5 px-3">Exit</th>
                    <th className="py-2.5 px-3">Net P&L</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300">12-09-2026</td>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      XAU/USD
                    </td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">BUY</span></td>
                    <td className="py-3 px-3 font-mono">0.05 Lots</td>
                    <td className="py-3 px-3 font-mono">2,510.40</td>
                    <td className="py-3 px-3 font-mono">2,524.80</td>
                    <td className="py-3 px-3 font-black text-emerald-400 font-mono">+₹14,400.00</td>
                    <td className="py-3 px-3"><span className="text-[10px] text-emerald-400 font-semibold">Target Hit (3.2 R)</span></td>
                  </tr>

                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300">11-09-2026</td>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      BTC/USDT
                    </td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-bold">SELL</span></td>
                    <td className="py-3 px-3 font-mono">0.10 Lots</td>
                    <td className="py-3 px-3 font-mono">58,400.00</td>
                    <td className="py-3 px-3 font-mono">57,370.00</td>
                    <td className="py-3 px-3 font-black text-emerald-400 font-mono">+₹10,300.00</td>
                    <td className="py-3 px-3"><span className="text-[10px] text-emerald-400 font-semibold">FVG Retrace Exit</span></td>
                  </tr>

                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300">10-09-2026</td>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      EUR/USD
                    </td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">BUY</span></td>
                    <td className="py-3 px-3 font-mono">1.00 Lot</td>
                    <td className="py-3 px-3 font-mono">1.10450</td>
                    <td className="py-3 px-3 font-mono">1.10368</td>
                    <td className="py-3 px-3 font-black text-rose-400 font-mono">-₹8,200.00</td>
                    <td className="py-3 px-3"><span className="text-[10px] text-rose-400 font-semibold">Stop Loss Respected</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Example Item 3: AI Behavioral Coach Insights */}
          <div className="p-6 rounded-3xl bg-surface-card border border-primary/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary-light flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary-light uppercase tracking-wider">
                    AI Discipline Coach Score
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    94 / 100 Elite
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  "Outstanding emotional discipline this week. Sizing remained mathematically consistent following Wednesday's controlled loss. Zero revenge sizing was detected."
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleLaunch}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Your Journal
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Matrix */}
      <section id="pricing" className="py-20 px-6 border-t border-border/80 bg-surface/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 mb-3">
              ACCESS & PRICING
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
              Personal Trader Ownership
            </h2>
            <p className="text-sm text-slate-400">
              No hidden fees, no recurring subscriptions. Unlocked with your Access Key.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="premium-card p-8 border-primary/40 shadow-glow-primary relative">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary-light mb-4">
                PERSONAL EDITION (UNLOCKED)
              </div>
              <div className="text-4xl font-black text-white mb-2">
                $0 <span className="text-base font-normal text-slate-400">/ forever</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                100% full access to all features, analytics, calendar, AI modules, and Delta India sync.
              </p>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited trade logging & calendar journal</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Delta Exchange India direct API sync</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Cross-device sync between MacBook and phone</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> AI Chart Vision & Behavioral Coach</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Institutional Web Terminal (Default XAU/USD)</li>
              </ul>
              <Button variant="primary" className="w-full" onClick={handleLaunch}>
                {user ? 'Open Journal Now' : 'Enter With Access Key'}
              </Button>
            </div>

            <div className="premium-card p-8 relative opacity-80">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 mb-4">
                COMMERCIAL / PRO FIRMS
              </div>
              <div className="text-4xl font-black text-slate-500 mb-2">
                $49 <span className="text-base font-normal text-slate-600">/ month</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                For proprietary trading firms and hedge funds requiring multi-seat risk officer monitoring.
              </p>
              <ul className="space-y-3 text-xs text-slate-400 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-600" /> Multi-trader organization dashboard</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-600" /> Real-time risk officer alerts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-600" /> Custom API broker direct webhooks</li>
              </ul>
              <Button variant="secondary" disabled className="w-full">
                Enterprise Managed
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border/80 text-center text-xs text-slate-500">
        <p className="mb-2">
          <span className="text-white font-bold">Trader</span>
          <span className="text-primary-light font-bold">Zone</span>
          {' '}· Personal Institutional Trading Journal
        </p>
        <p>© 2026 Trader Zone. Access Key Protected.</p>
      </footer>
    </div>
  );
};
