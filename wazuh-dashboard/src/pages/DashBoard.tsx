import React, { useMemo } from 'react';
import { useAlertStream } from '@/domains/alerts/hooks/useAlertStream';
import { useAlertsStore } from '@/domains/alerts/stores/useAlertsStore';
import { Card } from '@/components/ui/Card';
import { AlertFeed } from '@/domains/alerts/components/AlertFeed';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

// --- CONSTANTS ---
const COLORS = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#EAB308',
  low:      '#10B981',
};

// --- HELPER COMPONENT ---
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-siem-panel border border-siem-border p-2 text-xs text-white rounded shadow-xl">
        <p className="font-bold mb-1">{payload[0].name}</p>
        <p>Count: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  // 1. Connect and get data
  useAlertStream();
  const { alerts } = useAlertsStore();

  // --- 2. DATA CALCULATIONS ---

  // A. Severity Pie Chart
  const pieData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach(a => { if (counts[a.level] !== undefined) counts[a.level]++; });

    return [
      { name: 'Critical', value: counts.critical, color: COLORS.critical },
      { name: 'High',     value: counts.high,     color: COLORS.high },
      { name: 'Medium',   value: counts.medium,   color: COLORS.medium },
      { name: 'Low',      value: counts.low,      color: COLORS.low },
    ].filter(d => d.value > 0);
  }, [alerts]);

  // B. Timeline
  const lineData = useMemo(() => {
    const timeMap = new Map();
    alerts.slice(0, 100).forEach(a => {
      const time = new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      timeMap.set(time, (timeMap.get(time) || 0) + 1);
    });
    return Array.from(timeMap, ([time, count]) => ({ time, count })).reverse();
  }, [alerts]);

  // C. Top Agents
  const barData = useMemo(() => {
    const agentMap = new Map();
    alerts.forEach(a => {
      const name = a.agent.name || 'Unknown';
      agentMap.set(name, (agentMap.get(name) || 0) + 1);
    });
    return Array.from(agentMap, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [alerts]);

  return (
    <div className="p-4 h-full flex flex-col gap-4 overflow-hidden relative">
      
      {/* Decorative Borders */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-siem-accent opacity-50"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-siem-accent opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-siem-accent opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-siem-accent opacity-50"></div>

      {/* --- HEADER (Compact) --- */}
      <div className="shrink-0 flex items-center border-b border-siem-border/30 pb-2 mb-2">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="h-6 w-1 bg-siem-accent rounded-full shadow-[0_0_8px_#66fcf1]"></div>
          Security Dashboard
        </h1>
      </div>

      {/* --- CHARTS ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-56 shrink-0">
        
        {/* Severity */}
        <Card className="flex flex-col relative overflow-hidden bg-siem-panel/80 border-siem-border/40">
          <h3 className="text-siem-accent text-xs font-bold uppercase mb-1">Severity Breakdown</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={pieData} 
                innerRadius={40} 
                outerRadius={60} 
                paddingAngle={5} 
                dataKey="value" 
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="absolute bottom-2 right-2 text-[10px] space-y-1 bg-black/40 p-1.5 rounded border border-siem-border/30 backdrop-blur-sm">
            {[
                { name: 'Critical', color: COLORS.critical },
                { name: 'High', color: COLORS.high },
                { name: 'Medium', color: COLORS.medium },
                { name: 'Low', color: COLORS.low }
            ].map(item => (
                <div key={item.name} className="flex items-center gap-2 text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color, boxShadow: `0 0 5px ${item.color}` }}></div> 
                <span>{item.name}</span>
                </div>
            ))}
          </div>
        </Card>

        {/* Traffic */}
        <Card className="flex flex-col bg-siem-panel/80 border-siem-border/40">
          <h3 className="text-siem-accent text-xs font-bold uppercase mb-1">Alert Traffic</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickLine={false} />
              <YAxis stroke="#4b5563" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#66fcf1" strokeWidth={2} dot={{fill: '#66fcf1'}} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Sources */}
        <Card className="flex flex-col bg-siem-panel/80 border-siem-border/40">
          <h3 className="text-siem-accent text-xs font-bold uppercase mb-1">Top Sources</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={70} tickLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#45a29e" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* --- ALERT FEED --- */}
      <AlertFeed />
      
    </div>
  );
};