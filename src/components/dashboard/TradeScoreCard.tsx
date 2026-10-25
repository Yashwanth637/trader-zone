import React from 'react';
import { RadarChart, RadarDimension } from './RadarChart';
import { TradeScoreResult } from '../../lib/scoreCalculations';

interface TradeScoreCardProps {
  scoreData: TradeScoreResult;
}

export const TradeScoreCard: React.FC<TradeScoreCardProps> = ({ scoreData }) => {
  const { overallScore, ratingLabel, ratingColor, dimensions } = scoreData;

  // Radar dimensions in exact clockwise order:
  // Win Rate (top), Risk/Reward (top-right), Consistency (bottom-right),
  // Max Drawdown (bottom), Profitability (bottom-left), Recovery (top-left)
  const radarDimensions: RadarDimension[] = [
    { key: 'winRate', name: 'Win Rate', value: dimensions.winRate },
    { key: 'riskReward', name: 'Risk/Reward', value: dimensions.riskReward },
    { key: 'consistency', name: 'Consistency', value: dimensions.consistency },
    { key: 'maxDrawdown', name: 'Max Drawdown', value: dimensions.maxDrawdown },
    { key: 'profitability', name: 'Profitability', value: dimensions.profitability },
    { key: 'recovery', name: 'Recovery', value: dimensions.recovery }
  ];

  // Clamp overall score for coordinate positioning
  const clampedScore = Math.max(0, Math.min(100, Math.round(overallScore)));

  // Thumb pin color matching the score level
  const thumbBg = clampedScore >= 70 ? '#22c55e' : clampedScore >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="premium-card p-6 flex flex-col justify-between h-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Trade Score</h2>
          <p className="text-xs text-muted mt-0.5">Your overall trading performance</p>
        </div>
      </div>

      {/* Center: 6-Axis Radar Chart */}
      <div className="py-2 flex items-center justify-center">
        <RadarChart dimensions={radarDimensions} size={300} />
      </div>

      {/* Bottom: Score Gauge (Image 1 design - no mini card, direct coordinate/flex layout) */}
      <div className="pt-4 border-t border-border/60 flex items-center gap-4 sm:gap-6">
        {/* Left: Your Trade Score & Status */}
        <div className="flex flex-col shrink-0 min-w-[125px]">
          <span className="text-xs text-muted font-medium">Your Trade Score</span>
          <span className="text-4xl font-extrabold text-foreground tracking-tight leading-none my-1">
            {overallScore}
          </span>
          <span className={`text-xs font-semibold ${ratingColor}`}>
            {ratingLabel}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-14 bg-border/80 self-center shrink-0" />

        {/* Right: Gauge Slider Bar and Scale Ticks */}
        <div className="flex-1 flex flex-col justify-center gap-2 pr-1 sm:pr-3">
          {/* Slider Bar Track with filled gradient and thumb pin */}
          <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-white/10">
            {/* Active gradient fill up to score percentage */}
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, clampedScore)}%`,
                background: 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #84cc16 75%, #22c55e 100%)',
              }}
            />

            {/* Thumb Indicator Pin */}
            <div
              className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-slate-900 dark:border-black shadow-sm transition-all duration-500"
              style={{
                left: `${Math.max(1, Math.min(99, clampedScore))}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: thumbBg,
              }}
            />
          </div>

          {/* Scale Labels: 0, 20, 40, 60, 80, 100 */}
          <div className="flex justify-between items-center text-[11px] text-muted font-mono select-none pt-1">
            <span>0</span>
            <span>20</span>
            <span>40</span>
            <span>60</span>
            <span>80</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </div>
  );
};
