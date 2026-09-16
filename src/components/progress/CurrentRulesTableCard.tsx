import React from 'react';
import { SquarePen } from 'lucide-react';
import { RulePerformanceSummary } from '../../lib/progressTrackerAnalytics';

interface CurrentRulesTableCardProps {
  ruleSummaries: RulePerformanceSummary[];
  onEditRules: () => void;
}

export const CurrentRulesTableCard: React.FC<CurrentRulesTableCardProps> = ({
  ruleSummaries,
  onEditRules,
}) => {
  return (
    <div className="bg-[#12131a] dark:bg-[#12131a] border border-white/5 rounded-2xl p-6 shadow-sm">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-lg md:text-xl font-bold text-foreground">
          Current Rules
        </h3>

        <button
          onClick={onEditRules}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-medium text-foreground transition-all shadow-sm active:scale-95"
        >
          <SquarePen className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Edit rules</span>
        </button>
      </div>

      {/* Rules Table */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              <th className="py-3 px-3">RULE</th>
              <th className="py-3 px-3">CONDITION</th>
              <th className="py-3 px-3">RULE STREAK</th>
              <th className="py-3 px-3">AVG PERFORMANCE</th>
              <th className="py-3 px-3 text-right">FOLLOW RATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03] text-sm">
            {ruleSummaries.map((rule) => {
              const isPositive = rule.avgPerformance !== null && rule.avgPerformance > 0;
              const isNegative = rule.avgPerformance !== null && rule.avgPerformance < 0;

              return (
                <tr
                  key={rule.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  {/* RULE */}
                  <td className="py-4 px-3 font-medium text-foreground group-hover:text-white transition-colors">
                    {rule.name}
                  </td>

                  {/* CONDITION */}
                  <td className="py-4 px-3 text-zinc-400 font-mono">
                    {rule.condition}
                  </td>

                  {/* RULE STREAK */}
                  <td className="py-4 px-3 text-zinc-300 font-mono">
                    {rule.ruleStreak}
                  </td>

                  {/* AVG PERFORMANCE */}
                  <td className="py-4 px-3 font-mono font-medium">
                    {rule.avgPerformance === null ? (
                      <span className="text-zinc-600">—</span>
                    ) : (
                      <span
                        className={
                          isPositive
                            ? 'text-emerald-400'
                            : isNegative
                            ? 'text-red-400'
                            : 'text-zinc-400'
                        }
                      >
                        {rule.avgPerformanceFormatted}
                      </span>
                    )}
                  </td>

                  {/* FOLLOW RATE */}
                  <td className={`py-4 px-3 text-right font-bold font-mono ${rule.followRateColor}`}>
                    {rule.followRateFormatted}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default CurrentRulesTableCard;
