export interface NormalizedAlert {
  id: string;
  timestamp: string;
  source: string;
  agent: {
    name: string | null;
    ip: string | null;
  };
  severity: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
}

export interface AlertStats {
  total: number;
  critical: number;
  high: number;
  agents: Set<string>;
}