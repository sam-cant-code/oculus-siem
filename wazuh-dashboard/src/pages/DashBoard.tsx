import React, { useEffect, useState, useMemo } from 'react';
import { useAlertStream } from '@/domains/alerts/hooks/useAlertStream';
import { useAlertsStore } from '@/domains/alerts/stores/useAlertsStore';
import { Card } from '@/components/ui/Card';
import { Activity, ShieldCheck, WifiOff } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

// --- COMPONENTS ---

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono text-xl md:text-2xl text-siem-accent tracking-widest bg-black/20 px-4 py-2 rounded border border-siem-border/30 shadow-[0_0_10px_rgba(102,252,241,0.1)]">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase()}
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-siem-panel border border-siem-border p-2 text-xs text-white rounded shadow-xl">
        <p>{`${payload[0].name || 'Value'} : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  // 1. Connect to WebSocket
  useAlertStream();
  const { alerts, stats, isConnected } = useAlertsStore();

  // --- 2. DYNAMIC DATA CALCULATION ---

  // A. Severity Pie Chart
  const pieData = [
    { name: 'Low', value: stats.total - (stats.critical + stats.high), color: '#10B981' }, 
    { name: 'Medium', value: stats.high, color: '#FBBF24' },
    { name: 'Critical', value: stats.critical, color: '#EF4444' },
  ].filter(d => d.value > 0);

  // B. Timeline (Group alerts by minute)
  const lineData = useMemo(() => {
    const timeMap = new Map();
    alerts.slice(0, 50).forEach(a => {
      const time = new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      timeMap.set(time, (timeMap.get(time) || 0) + 1);
    });
    return Array.from(timeMap, ([time, count]) => ({ time, count })).reverse();
  }, [alerts]);

  // C. Top Agents (Count by agent name)
  const barData = useMemo(() => {
    const agentMap = new Map();
    alerts.forEach(a => {
      const name = a.agent.name || 'Unknown';
      agentMap.set(name, (agentMap.get(name) || 0) + 1);
    });
    return Array.from(agentMap, ([name, alerts]) => ({ name, alerts })).slice(0, 5);
  }, [alerts]);


  return (
    <div className="p-4 h-full flex flex-col gap-4 overflow-hidden relative">
      
      {/* Decorative Borders */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-siem-accent opacity-50"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-siem-accent opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-siem-accent opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-siem-accent opacity-50"></div>

      {/* --- TOP ROW --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="h-8 w-1 bg-siem-accent rounded-full shadow-[0_0_8px_#66fcf1]"></div>
          Security Dashboard
        </h1>

        <div className={`flex-1 mx-4 h-12 rounded-lg flex items-center px-4 gap-3 border ${
          isConnected 
            ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' 
            : 'bg-red-900/30 border-red-500/50 text-red-400'
        } shadow-lg transition-all`}>
          {isConnected ? <ShieldCheck size={24} /> : <WifiOff size={24} />}
          <span className="font-bold text-lg tracking-wide uppercase">
            System Status: {isConnected ? 'Healthy' : 'Disconnected'}
          </span>
        </div>

        <DigitalClock />
      </div>

      {/* --- MIDDLE ROW: CHARTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-64 shrink-0">
        
        {/* Severity Breakdown Card */}
        <Card className="flex flex-col relative overflow-hidden bg-siem-panel/80 border-siem-border/40">
          <h3 className="text-siem-accent text-sm font-bold uppercase mb-2">Severity Breakdown</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={pieData} 
                innerRadius={50} 
                outerRadius={70} 
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

          <div className="absolute bottom-3 right-3 text-xs space-y-1 bg-black/40 p-2 rounded border border-siem-border/30 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full shadow-[0_0_5px_#10B981]" style={{ background: '#10B981' }}></div> 
              <span>Low</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full shadow-[0_0_5px_#FBBF24]" style={{ background: '#FBBF24' }}></div> 
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full shadow-[0_0_5px_#EF4444]" style={{ background: '#EF4444' }}></div> 
              <span>Critical</span>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="flex flex-col bg-siem-panel/80 border-siem-border/40">
          <h3 className="text-siem-accent text-sm font-bold uppercase mb-2">Alert Traffic</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickLine={false} />
              <YAxis stroke="#4b5563" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#66fcf1" strokeWidth={2} dot={{fill: '#66fcf1'}} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Agents */}
        <Card className="flex flex-col bg-siem-panel/80 border-siem-border/40">
          <h3 className="text-siem-accent text-sm font-bold uppercase mb-2">Top Sources</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={80} tickLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
              <Bar dataKey="alerts" fill="#45a29e" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* --- BOTTOM ROW: TABLE --- */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-siem-panel/80 border-siem-border/40 shadow-2xl">
        <div className="p-3 border-b border-siem-border/30 bg-black/20 flex justify-between items-center">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Activity size={16} className="text-siem-accent" /> Live Alerts Feed
          </h3>
          <span className="text-xs text-siem-border font-mono">Count: {alerts.length}</span>
        </div>
        
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-black/40 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-1">Lvl</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-5">Description</div>
          <div className="col-span-2">IP</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
              <Activity size={48} className="animate-pulse mb-2" />
              <p>Waiting for data stream...</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div key={`${alert.id}-${idx}`} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-siem-border/10 hover:bg-white/5 transition-colors text-xs items-center font-mono">
                <div className="col-span-2 text-gray-400">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
                <div className="col-span-1">
                  {/* UPDATED: Uses alert.severity instead of alert.rule.level */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    alert.severity >= 12 ? 'border-red-500 text-red-400 bg-red-500/10' :
                    alert.severity >= 7 ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' :
                    'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="col-span-2 text-siem-accent truncate">
                   {/* UPDATED: Handles null agent name */}
                   {alert.agent.name || 'Unknown'}
                </div>
                <div className="col-span-5 text-gray-300 truncate">
                  {/* UPDATED: Uses alert.title instead of alert.rule.description */}
                  {alert.title}
                </div>
                <div className="col-span-2 text-gray-500 truncate">
                  {/* UPDATED: Uses agent.ip instead of location */}
                  {alert.agent.ip || 'N/A'}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};