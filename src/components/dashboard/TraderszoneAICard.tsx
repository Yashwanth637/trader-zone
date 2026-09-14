import React, { useState } from 'react';
import { RadarChart, RadarDimension } from './RadarChart';
import { TradeScoreResult, generateAITips } from '../../lib/scoreCalculations';
import {
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  TrendingDown,
  Shield,
  Heart,
  Info,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';

interface TraderszoneAICardProps {
  scoreData: TradeScoreResult;
}

export const TraderszoneAICard: React.FC<TraderszoneAICardProps> = ({ scoreData }) => {
  const { overallScore, ratingLabel, dimensions, dimensionList } = scoreData;
  const tips = generateAITips(dimensions);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const radarDimensions: RadarDimension[] = [
    { key: 'winRate', name: 'Win Rate', value: dimensions.winRate },
    { key: 'riskReward', name: 'Risk/Reward', value: dimensions.riskReward },
    { key: 'consistency', name: 'Consistency', value: dimensions.consistency },
    { key: 'maxDrawdown', name: 'Max Drawdown', value: dimensions.maxDrawdown },
    { key: 'profitability', name: 'Profitability', value: dimensions.profitability },
    { key: 'recovery', name: 'Recovery', value: dimensions.recovery }
  ];

  // Specific bar styles matching Image 4
  const barConfig: Record<string, { icon: React.ReactNode; barColor: string; textColor: string }> = {
    winRate: {
      icon: <TrendingUp className="w-3.5 h-3.5 text-amber-400" />,
      barColor: 'bg-amber-500',
      textColor: 'text-amber-400'
    },
    riskReward: {
      icon: <Target className="w-3.5 h-3.5 text-emerald-400" />,
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-400'
    },
    consistency: {
      icon: <Zap className="w-3.5 h-3.5 text-sky-400" />,
      barColor: 'bg-sky-500',
      textColor: 'text-sky-400'
    },
    maxDrawdown: {
      icon: <TrendingDown className="w-3.5 h-3.5 text-rose-400" />,
      barColor: 'bg-rose-500',
      textColor: 'text-rose-400'
    },
    profitability: {
      icon: <Shield className="w-3.5 h-3.5 text-cyan-400" />,
      barColor: 'bg-cyan-500',
      textColor: 'text-cyan-400'
    },
    recovery: {
      icon: <Heart className="w-3.5 h-3.5 text-emerald-400" />,
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-400'
    }
  };

  return (
    <div className="premium-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span>Traderszone AI</span>
            </h2>
            <p className="text-xs text-muted font-medium mt-0.5">
              AI-Powered Performance Rating
            </p>
          </div>
        </div>

        {/* Big Score on Top-Right */}
        <div className="text-right">
          <div className="text-4xl md:text-5xl font-black font-mono tracking-tight text-sky-400">
            {overallScore}
          </div>
          <div className="text-xs font-bold text-sky-400 mt-0.5">
            {ratingLabel}
          </div>
          <div className="text-[10px] text-muted font-medium">
            out of 100
          </div>
        </div>
      </div>

      {/* Main Body Grid: Radar Chart (Left) & Breakdown + Tips (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-2">
        {/* Left: 6-Axis Radar Chart */}
        <div className="flex items-center justify-center p-2">
          <RadarChart dimensions={radarDimensions} size={330} />
        </div>

        {/* Right: Score Breakdown & AI Improvement Tips */}
        <div className="space-y-5">
          {/* Subheading */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <Target className="w-4 h-4 text-primary" />
            <span>Score Breakdown</span>
          </div>

          {/* 6 Dimension Progress Bars */}
          <div className="space-y-3.5">
            {dimensionList.map(dim => {
              const cfg = barConfig[dim.key] || {
                icon: <Target className="w-3.5 h-3.5 text-primary" />,
                barColor: 'bg-primary',
                textColor: 'text-primary'
              };

              return (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {cfg.icon}
                      <span className="font-semibold text-foreground">{dim.name}</span>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onMouseEnter={() => setActiveTooltip(dim.key)}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={() => setActiveTooltip(activeTooltip === dim.key ? null : dim.key)}
                          className="text-muted hover:text-foreground transition-colors p-0.5"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                        {activeTooltip === dim.key && (
                          <div className="absolute left-6 bottom-0 z-30 w-48 p-2 text-[10px] leading-relaxed bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700">
                            {dim.info}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className={`font-mono font-bold ${cfg.textColor}`}>
                      {dim.score}
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, dim.score)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${cfg.barColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Improvement Tips Subcard */}
          <div className="p-4 rounded-xl bg-black/5 dark:bg-black/40 border border-border/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>AI Improvement Tips</span>
            </div>

            <div className="space-y-2 text-xs text-foreground/90 font-medium">
              {tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="shrink-0 text-sm leading-tight">
                    {tip.icon === 'bulb' && '💡'}
                    {tip.icon === 'chart' && '📈'}
                    {tip.icon === 'check' && '✅'}
                  </span>
                  <span className="leading-snug text-muted dark:text-slate-300">
                    {tip.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
