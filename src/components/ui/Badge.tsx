import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'buy' | 'sell' | 'win' | 'loss' | 'neutral' | 'primary' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';
  
  const variantClasses = {
    buy: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold',
    sell: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold',
    win: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold',
    loss: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold',
    neutral: 'bg-slate-800/60 text-slate-300 border border-slate-700/50',
    primary: 'bg-primary/20 text-primary-light border border-primary/30 font-medium',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium'
  };

  return (
    <span className={`inline-flex items-center rounded-md ${sizeClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};
