import { create } from 'zustand';
import type { NormalizedAlert, AlertStats } from '@/domains/alerts/types';

interface AlertsState {
  alerts: NormalizedAlert[];
  isConnected: boolean;
  stats: AlertStats;
  
  // Filtering State
  visibleSeverities: Record<'low' | 'medium' | 'high' | 'critical', boolean>;

  // Actions
  addAlert: (alert: NormalizedAlert) => void;
  setConnectionStatus: (status: boolean) => void;
  toggleSeverityVisibility: (level: 'low' | 'medium' | 'high' | 'critical') => void;
  clearAlerts: () => void;
  loadHistory: () => Promise<void>; // ✅ New Action
}

// ✅ Increased limit to allow scrolling back further
const MAX_ALERTS = 2000;

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  isConnected: false,
  
  stats: {
    total: 0,
    critical: 0,
    high: 0,
    agents: new Set(),
  },

  // Default all filters to visible
  visibleSeverities: {
    critical: true,
    high: true,
    medium: true,
    low: true,
  },

  addAlert: (newAlert) => set((state) => {
    // 1. Calculate Stats
    const isCritical = newAlert.level === 'critical';
    const isHigh = newAlert.level === 'high';
    const agentName = newAlert.agent.name || 'Unknown';

    const newStats = {
      total: state.stats.total + 1,
      critical: state.stats.critical + (isCritical ? 1 : 0),
      high: state.stats.high + (isHigh ? 1 : 0),
      agents: new Set(state.stats.agents).add(agentName),
    };

    // 2. Add to list with buffer limit
    // Newest alerts are prepended to the top
    const updatedAlerts = [newAlert, ...state.alerts].slice(0, MAX_ALERTS);

    return {
      alerts: updatedAlerts,
      stats: newStats,
    };
  }),

  setConnectionStatus: (status) => set({ isConnected: status }),

  toggleSeverityVisibility: (level) => set((state) => ({
    visibleSeverities: {
      ...state.visibleSeverities,
      [level]: !state.visibleSeverities[level],
    }
  })),
  
  clearAlerts: () => set({ 
    alerts: [], 
    stats: { total: 0, critical: 0, high: 0, agents: new Set() } 
  }),

  // ✅ New Action: Fetch older alerts from backend
  loadHistory: async () => {
    const currentAlerts = get().alerts;
    const offset = currentAlerts.length;
    // Assuming backend is running on 9001
    const API_URL = 'http://localhost:9001'; 

    try {
      // Fetch next 50 records
      const res = await fetch(`${API_URL}/alerts/history?limit=50&offset=${offset}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      
      const history = await res.json() as NormalizedAlert[];
      
      if (history.length > 0) {
        set((state) => {
          // Calculate stats for the new batch
          const addedCritical = history.filter(a => a.level === 'critical').length;
          const addedHigh = history.filter(a => a.level === 'high').length;
          
          const updatedAgents = new Set(state.stats.agents);
          history.forEach(a => {
             if (a.agent.name) updatedAgents.add(a.agent.name);
          });

          return {
            // Append history to the BOTTOM of the list
            alerts: [...state.alerts, ...history], 
            stats: {
              ...state.stats,
              total: state.stats.total + history.length,
              critical: state.stats.critical + addedCritical,
              high: state.stats.high + addedHigh,
              agents: updatedAgents
            }
          };
        });
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  },
}));