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

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="premium-card p-6 flex flex-col justify-between h-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Trade Score</h2>
          <p className="text-xs text-muted mt-0.5">Your overall trading performance</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-black font-mono tracking-tight ${ratingColor}`}>
            {overallScore}
          </div>
          <div className={`text-xs font-semibold ${ratingColor}`}>
            {ratingLabel}
          </div>
        </div>
      </div>

      {/* Center: 6-Axis Radar Chart */}
      <div className="py-2 flex items-center justify-center">
        <RadarChart dimensions={radarDimensions} size={310} />
      </div>

      {/* Bottom: 2x3 Metric Grid */}
      <div className="grid grid-cols-3 gap-y-4 gap-x-2 pt-4 border-t border-border/60 text-center">
        <div>
          <div className={`text-xl font-mono font-bold ${getScoreColor(dimensions.winRate)}`}>
            {dimensions.winRate}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Win Rate</div>
        </div>

        <div>
          <div className={`text-xl font-mono font-bold ${getScoreColor(dimensions.riskReward)}`}>
            {dimensions.riskReward}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Risk/Reward</div>
        </div>

        <div>
          <div className={`text-xl font-mono font-bold ${getScoreColor(dimensions.consistency)}`}>
            {dimensions.consistency}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Consistency</div>
        </div>

        <div>
          <div className={`text-xl font-mono font-bold ${getScoreColor(dimensions.maxDrawdown)}`}>
            {dimensions.maxDrawdown}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Max Drawdown</div>
        </div>

        <div>
          <div className={`text-xl font-mono font-bold ${getScoreColor(dimensions.profitability)}`}>
            {dimensions.profitability}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Profitability</div>
        </div>

        <div>
          <div className={`text-xl font-mono font-bold ${getScoreColor(dimensions.recovery)}`}>
            {dimensions.recovery}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Recovery</div>
        </div>
      </div>
    </div>
  );
};
