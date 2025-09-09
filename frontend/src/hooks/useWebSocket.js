import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const useWebSocket = (onMessage = null) => {
  const { user, isAdmin, isSuperuser } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setConnectionStatus('error');
      return;
    }

    if (!isAdmin && !isSuperuser) {
      return;
    }

    // Prevent multiple connection attempts
    if (isConnecting || (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN))) {
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');

    const wsUrl = `ws://127.0.0.1:8000/ws/notifications/?token=${token}`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setConnectionStatus('connected');
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        
        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connection_established') {
            if (data.user_type === 'admin' || data.user_type === 'superuser') {
              setConnectionStatus('connected');
              toast.success('Real-time notifications connected!', {
                duration: 3000,
                icon: '🔔',
              });
            }
            return;
          }

          if (data.type === 'notification' || data.type === 'notification_message') {
            
            // Call the provided callback with the notification data
            if (onMessage && typeof onMessage === 'function') {
              const notification = {
                id: data.notification_id,
                title: data.title || 'New Notification',
                message: data.message,
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                read: false,
                type: data.notification_type || 'general',
                farm_name: data.farm_name,
                user_name: data.user_name,
                isStored: true
              };
              
              onMessage(notification);
              
              // Show toast notification
              toast.success(data.title || 'New notification received!', {
                duration: 4000,
                icon: '🔔',
              });
            }
          }
        } catch (error) {
          console.error('WebSocket: Error parsing message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setConnectionStatus('disconnected');
        setIsConnecting(false);

        // Only attempt reconnection for unexpected closures and if user is still admin
        const shouldReconnect = event.code !== 1000 && event.code < 4000 && 
                                reconnectAttemptsRef.current < maxReconnectAttempts &&
                                (isAdmin || isSuperuser);
        
        if (shouldReconnect) {
          const timeout = Math.min(Math.pow(2, reconnectAttemptsRef.current) * 2000, 30000); // Max 30 second delay
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isAdmin || isSuperuser) { // Double check user still has permission
              reconnectAttemptsRef.current++;
              connect();
            }
          }, timeout);
        } else {
          setConnectionStatus('error');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket: Error:', error);
        setConnectionStatus('error');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('WebSocket: Failed to create connection:', error);
      setConnectionStatus('error');
      setIsConnecting(false);
    }
  }, [isAdmin, isSuperuser]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    
    setConnectionStatus('disconnected');
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      if (isAdmin || isSuperuser) {
        connect();
      }
    }, 3000); // 3 second delay for manual reconnect
  }, [connect, disconnect, isAdmin, isSuperuser]);

  useEffect(() => {
    let timeoutId;
    
    if (user && (isAdmin || isSuperuser)) {
      // Delay initial connection to prevent rapid reconnections
      timeoutId = setTimeout(connect, 500);
    } else {
      disconnect();
    }

    return () => {
      clearTimeout(timeoutId);
      disconnect();
    };
  }, [user?.id, isAdmin, isSuperuser]); // Only depend on user ID, not full user object

  return {
    connectionStatus,
    isConnecting,
    connect,
    disconnect,
    reconnect
  };
};

export default useWebSocket;