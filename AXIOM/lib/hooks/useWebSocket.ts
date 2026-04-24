import { useEffect, useRef, useState, useCallback } from 'react';

interface WSMessage {
  type: string;
  channel?: string;
  data?: any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  address?: string | null;
  userId?: string | null;
  autoConnect?: boolean;
  onMessage?: (message: WSMessage) => void;
  onNotification?: (notification: any) => void;
}

interface WebSocketState {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  connectionError: string | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { address, userId, autoConnect = true, onMessage, onNotification } = options;
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    connectionError: null
  });
  
  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true, connectionError: null }));
        reconnectAttempts.current = 0;
        
        if (address || userId) {
          wsRef.current?.send(JSON.stringify({
            type: 'register',
            data: { address, userId }
          }));
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));
          
          onMessage?.(message);
          
          if (message.type === 'notification' && message.data) {
            onNotification?.(message.data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false }));
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, connectionError: 'Connection error' }));
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState(prev => ({ ...prev, connectionError: 'Failed to connect' }));
    }
  }, [address, userId, onMessage, onNotification]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttempts.current = maxReconnectAttempts;
    wsRef.current?.close();
  }, []);
  
  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  const subscribe = useCallback((channel: string) => {
    send({ type: 'subscribe', channel });
  }, [send]);
  
  const unsubscribe = useCallback((channel: string) => {
    send({ type: 'unsubscribe', channel });
  }, [send]);
  
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);
  
  useEffect(() => {
    if (state.isConnected && (address || userId)) {
      send({
        type: 'register',
        data: { address, userId }
      });
    }
  }, [address, userId, state.isConnected, send]);
  
  return {
    ...state,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe
  };
}

export function useNotifications(address?: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const handleNotification = useCallback((notification: any) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
  }, []);
  
  const { isConnected, subscribe } = useWebSocket({
    address,
    autoConnect: !!address,
    onNotification: handleNotification
  });
  
  useEffect(() => {
    if (isConnected) {
      subscribe('notifications');
    }
  }, [isConnected, subscribe]);
  
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);
  
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);
  
  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    setNotifications,
    setUnreadCount
  };
}

export default useWebSocket;
