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
}));