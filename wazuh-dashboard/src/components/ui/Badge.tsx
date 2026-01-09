import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'critical' | 'warning' | 'success' | 'outline';
}

export const Badge = ({ children, variant = 'default' }: BadgeProps) => {
  const styles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    outline: 'border-slate-700 text-slate-400 bg-transparent',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};