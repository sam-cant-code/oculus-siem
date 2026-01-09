import React from 'react';
import type { WazuhAlert } from '../types';
import { AlertRow } from './AlertRow';
import { Activity } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

export const AlertFeed = ({ alerts }: { alerts: WazuhAlert[] }) => {
  return (
    <Card className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="p-3 border-b border-siem-border bg-slate-900/50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-300 text-sm">Real-time Feed</h3>
        <span className="text-xs text-slate-500 font-mono">Buffer: {alerts.length}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
            <Activity size={32} className="animate-pulse opacity-50" />
            <p className="text-sm">Waiting for incoming events...</p>
          </div>
        ) : (
          alerts.map((alert, idx) => (
            // Using idx as fallback key if IDs duplicate during testing
            <AlertRow key={`${alert.id}-${idx}`} alert={alert} />
          ))
        )}
      </div>
    </Card>
  );
};