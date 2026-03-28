import { useEffect, useRef } from 'react';
import { useAlertsStore } from '@/domains/alerts/stores/useAlertsStore';
import type { NormalizedAlert } from '@/domains/alerts/types';

// Ensure this matches your backend port
const WS_URL = import.meta.env.VITE_WEBSOCKET_URL

export const useAlertStream = () => {
  const { addAlert, setConnectionStatus } = useAlertsStore();
  
  // Refs to keep track of the socket and reconnection logic
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    const connect = () => {
      // Prevent multiple connections
      if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      console.log('🔌 Connecting to SIEM Backend...');
      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => {
        console.log('✅ SIEM Socket Connected');
        setConnectionStatus(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NormalizedAlert;
          // Validate it is a normalized message from our backend
          if (data && data.source === 'wazuh') {
            addAlert(data);
          }
        } catch (err) {
          console.error('Failed to parse alert:', err);
        }
      };

      socket.onclose = () => {
        console.log('⚠️ Disconnected. Retrying in 3s...');
        setConnectionStatus(false);
        ws.current = null;
        
        // Clear any existing timeout before setting a new one
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = window.setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('Socket Error:', err);
        socket.close();
      };
    };

    connect();

    // Cleanup function: Only runs when the component truly unmounts
    return () => {
      if (ws.current) {
        // Prevent auto-reconnect if we are intentionally closing
        clearTimeout(reconnectTimeout.current);
        ws.current.close();
        ws.current = null;
      }
    };
  }, [addAlert, setConnectionStatus]);
};