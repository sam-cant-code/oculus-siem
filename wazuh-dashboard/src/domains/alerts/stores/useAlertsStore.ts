import { create } from 'zustand';
import type { WazuhAlert, AlertStats } from '../types'; // <--- Added "type"

interface AlertsState {
  alerts: WazuhAlert[];
  isConnected: boolean;
  stats: AlertStats;
  
  // Actions
  addAlert: (alert: WazuhAlert) => void;
  setConnectionStatus: (status: boolean) => void;
  clearAlerts: () => void;
}

const MAX_ALERTS = 500;

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  isConnected: false,
  stats: {
    total: 0,
    critical: 0,
    high: 0,
    agents: new Set(),
  },

  addAlert: (newAlert) => set((state) => {
    // 1. Calculate Stats (lightweight math)
    const level = newAlert.rule.level;
    const newStats = {
      total: state.stats.total + 1,
      critical: state.stats.critical + (level >= 12 ? 1 : 0),
      high: state.stats.high + (level >= 7 && level < 12 ? 1 : 0),
      agents: new Set(state.stats.agents).add(newAlert.agent.name),
    };

    // 2. Add to list with buffer limit
    // We add to the front [new, ...old] so the newest is always top
    const updatedAlerts = [newAlert, ...state.alerts].slice(0, MAX_ALERTS);

    return {
      alerts: updatedAlerts,
      stats: newStats,
    };
  }),

  setConnectionStatus: (status) => set({ isConnected: status }),
  
  clearAlerts: () => set({ 
    alerts: [], 
    stats: { total: 0, critical: 0, high: 0, agents: new Set() } 
  }),
}));