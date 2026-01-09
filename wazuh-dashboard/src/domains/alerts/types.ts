export interface WazuhAlert {
  id: string;
  timestamp: string;
  rule: {
    level: number;
    description: string;
    id: string;
    groups: string[];
    firedtimes: number;
  };
  agent: {
    id: string;
    name: string;
    ip: string;
  };
  manager: {
    name: string;
  };
  location: string;
  // Flexible payload to handle Windows, Linux, or custom logs
  data?: {
    win?: {
      system: {
        eventID: string;
        severityValue: string;
        message: string;
        providerName: string;
      };
    };
    [key: string]: any; 
  };
}

export interface AlertStats {
  total: number;
  critical: number;
  high: number;
  agents: Set<string>;
}