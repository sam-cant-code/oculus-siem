import React from 'react';
import { useAlertsStore } from '@/domains/alerts/stores/useAlertsStore';
import { Badge } from '@/components/ui/Badge';
import { Check, X } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-500/10 text-red-400 border-red-500/50' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/50' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50' },
  low: { label: 'Low', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' },
} as const;

export const SeverityFilter = () => {
  const { visibleSeverities, toggleSeverityVisibility, stats, alerts } = useAlertsStore();

  // Calculate live counts for the buttons
  const counts = React.useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => {
      if (c[a.level] !== undefined) c[a.level]++;
    });
    return c;
  }, [alerts]);

  return (
    <div className="flex flex-wrap gap-2 items-center p-2 bg-black/20 rounded-lg border border-siem-border/30">
      <span className="text-xs font-bold text-slate-500 uppercase mr-2">Filters:</span>
      
      {(Object.keys(SEVERITY_CONFIG) as Array<keyof typeof SEVERITY_CONFIG>).map((level) => {
        const isActive = visibleSeverities[level];
        const config = SEVERITY_CONFIG[level];

        return (
          <button
            key={level}
            onClick={() => toggleSeverityVisibility(level)}
            className={`
              flex items-center gap-2 px-2 py-1 rounded border text-xs font-medium transition-all
              ${isActive ? config.color : 'bg-slate-900/50 text-slate-600 border-slate-700 opacity-60'}
              hover:opacity-100
            `}
          >
            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${isActive ? 'bg-current' : 'bg-slate-600'}`}>
              {isActive ? (
                <Check size={8} className="text-black" strokeWidth={4} />
              ) : (
                <X size={8} className="text-slate-900" strokeWidth={4} />
              )}
            </div>
            <span>{config.label}</span>
            <span className="bg-black/30 px-1.5 rounded text-[10px] min-w-[20px] text-center">
              {counts[level]}
            </span>
          </button>
        );
      })}
    </div>
  );
};