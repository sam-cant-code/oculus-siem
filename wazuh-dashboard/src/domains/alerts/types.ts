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
  
  // ✅ NEW: MITRE Enrichment Field (Optional)
  // We make it optional (?) so old alerts without tags don't crash the UI
  mitre?: {
    tactic: string;
    technique_id: string;
    technique_name: string;
  };
}

export interface AlertStats {
  total: number;
  critical: number;
  high: number;
  agents: Set<string>;
}