import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { analyzeChartImage } from '../lib/visionEngine';
import { generateCoachResponse } from '../lib/coachEngine';
import {
  Sparkles,
  Brain,
  Upload,
  Send,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  ShieldAlert,
  Trash2,
  Zap,
  Target
} from 'lucide-react';

export const AIPage: React.FC = () => {
  const {
    chartVision,
    addVisionAnalysis,
    deleteVisionAnalysis,
    coachMessages,
    addCoachMessage,
    accountTrades,
    behavioralAlerts
  } = useTrading();

  const [activeTab, setActiveTab] = useState<'vision' | 'coach' | 'patterns'>('vision');

  // Vision state
  const [chartUrl, setChartUrl] = useState('');
  const [visionSymbol, setVisionSymbol] = useState('XAUUSD');
  const [visionTimeframe, setVisionTimeframe] = useState('15m');
  const [visionBias, setVisionBias] = useState<'BUY' | 'SELL' | 'NEUTRAL'>('BUY');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(chartVision[0] || null);

  // Coach Chat state
  const [inputMsg, setInputMsg] = useState('');

  const handleRunVision = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    const imgToUse = chartUrl.trim() || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80';

    setTimeout(() => {
      const result = analyzeChartImage(imgToUse, visionSymbol, visionTimeframe, visionBias);
      addVisionAnalysis(result);
      setSelectedAnalysis(result);
      setIsAnalyzing(false);
      setChartUrl('');
    }, 1200);
  };

  const handleSendCoachMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    addCoachMessage({ sender: 'user', text: userText });
    setInputMsg('');

    setTimeout(() => {
      const reply = generateCoachResponse(userText, accountTrades);
      addCoachMessage({ sender: 'coach', text: reply });
    }, 600);
  };

  const handleQuickPrompt = (prompt: string) => {
    addCoachMessage({ sender: 'user', text: prompt });
    setTimeout(() => {
      const reply = generateCoachResponse(prompt, accountTrades);
      addCoachMessage({ sender: 'coach', text: reply });
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="ai2-title-gradient font-black">Trader Zone AI 2.0</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
              Neural Engine
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional Chart Vision, conversational psychology coach, and behavioral leak detector.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-border rounded-xl">
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'vision' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chart Vision
          </button>
          <button
            onClick={() => setActiveTab('coach')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'coach' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            AI Coach
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'patterns' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Behavioral Patterns ({behavioralAlerts.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CHART VISION */}
      {activeTab === 'vision' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input Form & History */}
          <div className="space-y-6">
            <div className="premium-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="w-4 h-4 text-primary-light" />
                <span>Upload Chart Screenshot</span>
              </div>

              <form onSubmit={handleRunVision} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Chart Image URL</label>
                  <input
                    type="url"
                    value={chartUrl}
                    onChange={e => setChartUrl(e.target.value)}
                    placeholder="Paste image link (or leave blank for sample chart)..."
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Asset / Pair</label>
                    <input
                      type="text"
                      value={visionSymbol}
                      onChange={e => setVisionSymbol(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Timeframe</label>
                    <select
                      value={visionTimeframe}
                      onChange={e => setVisionTimeframe(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface-card border border-border text-white text-xs focus:outline-none"
                    >
                      <option value="5m">5m (Scalp)</option>
                      <option value="15m">15m (Day Trade)</option>
                      <option value="1h">1h (Intraday)</option>
                      <option value="4h">4h (Swing)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Directional Bias</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['BUY', 'SELL', 'NEUTRAL'] as const).map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setVisionBias(b)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          visionBias === b
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface-card text-slate-400 border-border'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isAnalyzing}
                  icon={<Zap className="w-4 h-4 text-amber-300" />}
                >
                  {isAnalyzing ? 'Scanning Market Structure...' : 'Analyze Chart with Vision'}
                </Button>
              </form>
            </div>

            {/* Analysis History List */}
            <div className="premium-card p-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Saved Analyses History
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {chartVision.map(v => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedAnalysis(v)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedAnalysis?.id === v.id
                        ? 'bg-primary/20 border-primary/40 text-white'
                        : 'bg-surface-card border-border text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{v.symbol} ({v.timeframe})</span>
                        <Badge variant={v.direction === 'BUY' ? 'buy' : 'sell'} size="sm">
                          {v.direction}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-400">{v.marketStructure}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {v.confidenceScore}%
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteVisionAnalysis(v.id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 2 Cols: Detailed Vision Result Card */}
          <div className="lg:col-span-2 premium-card p-6 space-y-6">
            {selectedAnalysis ? (
              <>
                {/* Result Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary-light" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">{selectedAnalysis.symbol}</h2>
                        <Badge variant={selectedAnalysis.direction === 'BUY' ? 'buy' : 'sell'}>
                          {selectedAnalysis.direction}
                        </Badge>
                        <span className="text-xs font-mono text-slate-400">{selectedAnalysis.timeframe}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Structure: <strong className="text-primary-light">{selectedAnalysis.marketStructure}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Confidence</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {selectedAnalysis.confidenceScore}%
                    </div>
                  </div>
                </div>

                {/* Chart Image Display */}
                <div className="w-full h-64 rounded-xl overflow-hidden border border-border bg-black/50 relative">
                  <img
                    src={selectedAnalysis.chartImageUrl}
                    alt="Analyzed Chart"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono font-bold text-white">
                    R:R 1:{selectedAnalysis.tradePlan.riskRewardRatio}
                  </div>
                </div>

                {/* Trade Execution Plan */}
                <div className="p-5 rounded-2xl bg-surface-card border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Recommended Trade Plan
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      {selectedAnalysis.tradePlan.action}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Entry Level</div>
                      <div className="text-base font-black text-white font-mono mt-1">
                        {selectedAnalysis.tradePlan.recommendedEntry}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Invalidation (SL)</div>
                      <div className="text-base font-black text-rose-400 font-mono mt-1">
                        {selectedAnalysis.tradePlan.stopLoss}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Target (TP)</div>
                      <div className="text-base font-black text-emerald-400 font-mono mt-1">
                        {selectedAnalysis.tradePlan.takeProfit}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-surface/60 p-3.5 rounded-xl border border-border">
                    {selectedAnalysis.tradePlan.summary}
                  </p>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500">
                Upload a chart screenshot to see AI analysis.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI COACH CHAT */}
      {activeTab === 'coach' && (
        <div className="premium-card p-6 max-w-4xl mx-auto space-y-5 h-[650px] flex flex-col justify-between">
          {/* Quick Prompts */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 border-b border-border">
            {[
              "Diagnose my recent trading leaks",
              "Am I revenge trading or overtrading?",
              "Should I be aggressive or defensive today?",
              "Break down my edge on Gold & EURUSD"
            ].map(p => (
              <button
                key={p}
                onClick={() => handleQuickPrompt(p)}
                className="px-3 py-1.5 rounded-xl bg-surface-card border border-border hover:border-primary/40 text-xs text-slate-300 hover:text-white whitespace-nowrap transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {coachMessages.map(m => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'coach' && (
                  <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-primary-light" />
                  </div>
                )}
                <div
                  className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary text-white font-medium rounded-tr-none'
                      : 'bg-surface-card border border-border text-slate-200 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendCoachMsg} className="flex items-center gap-2 shrink-0 pt-2 border-t border-border">
            <input
              type="text"
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="Ask your AI Trading Coach anything about your trades, mindset, or rules..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface-card border border-border text-white text-xs focus:border-primary focus:outline-none"
            />
            <Button type="submit" variant="primary" icon={<Send className="w-4 h-4" />}>
              Send
            </Button>
          </form>
        </div>
      )}

      {/* TAB 3: BEHAVIORAL PATTERN ALERTS */}
      {activeTab === 'patterns' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {behavioralAlerts.length === 0 ? (
            <div className="premium-card p-12 text-center text-xs text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">No Destructive Habits Detected!</div>
              <p>You are executing within proper risk limits and showing sound emotional discipline.</p>
            </div>
          ) : (
            behavioralAlerts.map(alert => (
              <div
                key={alert.id}
                className="premium-card p-6 border-amber-500/30 bg-amber-500/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                    {alert.severity} Risk
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {alert.description}
                </p>

                <div className="p-3 rounded-xl bg-surface border border-border text-xs text-primary-light">
                  <strong>Recommended Remedy:</strong> {alert.recommendedAction}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
