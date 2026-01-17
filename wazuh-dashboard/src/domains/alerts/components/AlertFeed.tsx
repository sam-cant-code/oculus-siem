import React, { useMemo } from 'react';
import { useAlertsStore } from '@/domains/alerts/stores/useAlertsStore';
import { AlertRow } from './AlertRow';
import { Activity, FilterX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SeverityFilter } from './SeverityFilter';

export const AlertFeed = () => {
  const { alerts, visibleSeverities } = useAlertsStore();

  // Derived state: Filter alerts based on visibility toggles
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => visibleSeverities[alert.level]);
  }, [alerts, visibleSeverities]);

  return (
    <Card className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Header with Filter */}
      <div className="p-3 border-b border-siem-border bg-slate-900/50 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
            <Activity size={16} className="text-siem-accent" />
            Real-time Feed
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Showing: {filteredAlerts.length} / {alerts.length}
          </span>
        </div>
        
        {/* Filter Controls embedded in header */}
        <SeverityFilter />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {alerts.length === 0 ? (
          // Case 1: No alerts at all (waiting for WebSocket)
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
            <Activity size={32} className="animate-pulse opacity-50" />
            <p className="text-sm">Waiting for incoming events...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          // Case 2: Alerts exist but are hidden by filters
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
            <FilterX size={32} className="opacity-50" />
            <p className="text-sm">All alerts hidden by filters</p>
          </div>
        ) : (
          // Case 3: Show filtered list
          filteredAlerts.map((alert, idx) => (
            <AlertRow key={`${alert.id}-${idx}`} alert={alert} />
          ))
        )}
      </div>
    </Card>
  );
};