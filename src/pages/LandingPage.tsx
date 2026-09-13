import React from 'react';
import { Link } from 'react-router-dom';
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
  PlayCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI Behavioral Scoring',
      desc: 'Real-time detection of revenge sizing, overtrading, and premature exits before they cost you capital.'
    },
    {
      icon: Layers,
      title: 'Broker Sync & CSV Import',
      desc: 'Seamlessly link your MetaTrader 4/5 statements, Exness, Vantage, XM, or standard CSV files.'
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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="font-extrabold text-xl tracking-tight">
            <span className="text-white">Trader</span>
            <span className="text-primary-light ml-0.5">Zone</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-slate-300 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link to="/journal" className="hover:text-white transition-colors">Journal Preview</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
          >
            Sign In
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
              Open Journal
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trader Zone AI 2.0 is Live</span>
          </div>

          <h1 className="text-4xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
            The AI-Powered <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-primary-light">
              Trading Journal
            </span>
          </h1>

          <p className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Track, analyze, and dramatically elevate your trading performance. Auto-sync your broker, unlock AI chart vision, detect behavioral leaks, and master your discipline.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/dashboard">
              <Button size="lg" variant="primary" icon={<ArrowRight className="w-5 h-5" />}>
                Launch Trader Zone Free
              </Button>
            </Link>
            <Link to="/ai-2">
              <Button size="lg" variant="secondary" icon={<Brain className="w-5 h-5 text-primary-light" />}>
                Try AI Chart Vision
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Private Offline-First</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero Subscription Fees</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>GitHub Deployable</span>
            </div>
          </div>
        </div>

        {/* Floating App Preview */}
        <div className="max-w-5xl mx-auto mt-16 rounded-2xl border border-border-glow bg-surface shadow-2xl p-4 md:p-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs text-slate-400 font-mono">Trader Zone Dashboard</span>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live Demo Mode
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-surface-card border border-border">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Net P&L</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">+$4,850.00</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">+4.85% Account Return</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-border">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Win Rate</div>
              <div className="text-xl font-black text-white font-mono mt-1">71.4%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">5 Wins / 2 Losses</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-border">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Profit Factor</div>
              <div className="text-xl font-black text-primary-light font-mono mt-1">2.95</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Institutional Edge</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-border">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Max Drawdown</div>
              <div className="text-xl font-black text-slate-300 font-mono mt-1">1.58%</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Well within limits</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 border-t border-border/80 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
              A comprehensive trading workstation engineered for serious discretionary and systematic traders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="premium-card p-6 flex flex-col justify-between">
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
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-14">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-primary/30 mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Configure Your Account</h3>
              <p className="text-xs text-slate-400">
                Create your profile, set initial balance, base currency, and define your strict risk rules.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-primary/30 mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Log or Sync Trades</h3>
              <p className="text-xs text-slate-400">
                Log trades with auto-calculated pips and P&L, or import your MT4/MT5 CSV statement in seconds.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-primary/30 mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Analyzes Performance</h3>
              <p className="text-xs text-slate-400">
                Discover your edge, eliminate emotional mistakes, and follow AI daily guidance to profitability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Matrix */}
      <section id="pricing" className="py-20 px-6 border-t border-border/80">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
              Personal Ownership
            </h2>
            <p className="text-sm text-slate-400">
              No hidden fees, no subscriptions. Fully unlocked for your personal use.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="premium-card p-8 border-primary/40 shadow-glow-primary relative">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary-light mb-4">
                PERSONAL EDITION
              </div>
              <div className="text-4xl font-black text-white mb-2">
                $0 <span className="text-base font-normal text-slate-400">/ forever</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                100% full access to all features, analytics, calendar, AI modules, and exports.
              </p>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited trade logging & calendar journal</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Complete Performance Analytics suite</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> AI Chart Vision & AI Trading Coach</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Candlestick Trade Replay Simulator</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Social Share Card Studio</li>
              </ul>
              <Link to="/dashboard">
                <Button variant="primary" className="w-full">
                  Launch Free Now
                </Button>
              </Link>
            </div>

            <div className="premium-card p-8 relative opacity-80">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 mb-4">
                COMMERCIAL / TEAMS
              </div>
              <div className="text-4xl font-black text-slate-500 mb-2">
                $49 <span className="text-base font-normal text-slate-600">/ month</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                For proprietary trading firms and hedge funds requiring multi-seat cloud syncing.
              </p>
              <ul className="space-y-3 text-xs text-slate-400 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-600" /> Multi-trader organization dashboard</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-600" /> Real-time risk officer alerts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-600" /> Custom API broker direct webhooks</li>
              </ul>
              <Button variant="secondary" disabled className="w-full">
                Contact Enterprise
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
          {' '}· Personal Trading Journal Platform
        </p>
        <p>© 2026 Trader Zone. Built for personal use & GitHub hosting.</p>
      </footer>
    </div>
  );
};
