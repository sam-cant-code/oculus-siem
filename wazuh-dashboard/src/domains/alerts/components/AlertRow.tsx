import React, { useState } from 'react';
import type { NormalizedAlert } from '@/domains/alerts/types';
import { ChevronDown, ChevronRight, Monitor, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

// Helper for color coding levels
const getLevelStyle = (level: number) => {
  if (level >= 12) return 'border-l-red-500 text-red-400 bg-red-500/5';
  if (level >= 7) return 'border-l-orange-500 text-orange-400 bg-orange-500/5';
  if (level >= 4) return 'border-l-yellow-500 text-yellow-400 bg-yellow-500/5';
  return 'border-l-blue-500 text-blue-400 bg-blue-500/5';
};

export const AlertRow = ({ alert }: { alert: NormalizedAlert }) => {
  const [isOpen, setIsOpen] = useState(false);
  // UPDATED: Uses alert.severity
  const rowStyle = getLevelStyle(alert.severity);

  return (
    <div className="border-b border-siem-border hover:bg-slate-900/50 transition-colors group">
      {/* --- Summary Line --- */}
      <div 
        className={`flex items-center p-3 cursor-pointer border-l-4 ${rowStyle}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="mr-3 text-slate-500">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        
        <div className="w-24 text-xs font-mono text-slate-500 shrink-0">
          {new Date(alert.timestamp).toLocaleTimeString([], { hour12: false })}
        </div>

        <div className="w-40 flex items-center text-xs font-medium text-slate-300 shrink-0 gap-2">
          <Monitor size={14} className="text-slate-600" />
          <span className="truncate">{alert.agent.name || 'Unknown'}</span>
        </div>

        <div className="flex-1 text-sm text-slate-200 truncate pr-4">
          {/* UPDATED: Uses alert.title */}
          {alert.title}
        </div>

        {/* UPDATED: Uses alert.severity */}
        <Badge variant={alert.severity >= 12 ? 'critical' : 'outline'}>
          Lvl {alert.severity}
        </Badge>
      </div>

      {/* --- Expanded Details --- */}
      {isOpen && (
        <div className="bg-black/30 border-t border-siem-border p-4 pl-12 grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm animate-in slide-in-from-top-1 duration-200">
          
          {/* Metadata Column */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="text-slate-500 font-bold uppercase tracking-wider">Metadata</h4>
            <div className="grid grid-cols-[80px_1fr] gap-y-2 text-slate-400">
              {/* UPDATED: Uses category instead of rule.groups */}
              <span>Category:</span> <span>{alert.category}</span>
              {/* UPDATED: Uses agent.ip instead of location */}
              <span>IP Addr:</span> <span className="break-all">{alert.agent.ip || 'N/A'}</span>
              <span>Source:</span> <span className="text-slate-200">{alert.source}</span>
            </div>
          </div>

          {/* Payload Column */}
          <div className="space-y-3">
            <h4 className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
              <Terminal size={14} /> Full Log
            </h4>
            <div className="bg-slate-950 p-3 rounded border border-siem-border overflow-x-auto max-h-60">
              <pre className="text-xs font-mono text-slate-300">
                {/* Normalized alerts might not have 'data', showing full object for debug */}
                {JSON.stringify(alert, null, 2)}
              </pre>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};