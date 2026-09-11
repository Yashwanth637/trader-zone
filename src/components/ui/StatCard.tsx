import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconBg?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  trend,
  icon,
  iconBg = 'bg-primary/10 text-primary-light border-primary/20'
}) => {
  return (
    <div className="premium-card p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-black tracking-tight text-white">{value}</div>
        {subValue && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-xs font-medium ${
                trend === 'positive'
                  ? 'text-emerald-400'
                  : trend === 'negative'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {subValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
