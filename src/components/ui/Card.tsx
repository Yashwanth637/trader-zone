import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glow = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`premium-card p-5 ${glow ? 'border-primary/40 shadow-glow-primary' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
