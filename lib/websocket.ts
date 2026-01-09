import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

interface WSClient extends WebSocket {
  userId?: string;
  address?: string;
  isAlive?: boolean;
  channels?: Set<string>;
}

interface WSMessage {
  type: string;
  channel?: string;
  data?: any;
  timestamp?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private channels: Map<string, Set<WSClient>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  
  initialize(server: HttpServer) {
    if (this.wss) return;
    
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });
    
    this.wss.on('connection', (ws: WSClient, request) => {
      ws.isAlive = true;
      ws.channels = new Set();
      
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      ws.on('message', (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });
      
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
      this.send(ws, {
        type: 'connected',
        data: { message: 'Connected to Axiom real-time updates' }
      });
    });
    
    this.heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws: WSClient) => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    
    console.log('WebSocket server initialized');
  }
  
  private handleMessage(ws: WSClient, message: WSMessage) {
    switch (message.type) {
      case 'register':
        if (message.data?.address) {
          ws.address = message.data.address;
          ws.userId = message.data.userId;
          this.clients.set(message.data.address, ws);
          console.log(`WebSocket client registered: ${message.data.address}`);
        }
        break;
        
      case 'subscribe':
        if (message.channel) {
          this.subscribeToChannel(ws, message.channel);
          this.send(ws, {
            type: 'subscribed',
            channel: message.channel
          });
        }
        break;
        
      case 'unsubscribe':
        if (message.channel) {
          this.unsubscribeFromChannel(ws, message.channel);
        }
        break;
        
      case 'ping':
        this.send(ws, { type: 'pong' });
        break;
    }
  }
  
  private handleDisconnect(ws: WSClient) {
    if (ws.address) {
      this.clients.delete(ws.address);
    }
    
    ws.channels?.forEach(channel => {
      this.channels.get(channel)?.delete(ws);
    });
    
    console.log('WebSocket client disconnected');
  }
  
  private subscribeToChannel(ws: WSClient, channel: string) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(ws);
    ws.channels?.add(channel);
  }
  
  private unsubscribeFromChannel(ws: WSClient, channel: string) {
    this.channels.get(channel)?.delete(ws);
    ws.channels?.delete(channel);
  }
  
  private send(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  sendToUser(address: string, message: WSMessage) {
    const client = this.clients.get(address);
    if (client) {
      this.send(client, message);
    }
  }
  
  sendToChannel(channel: string, message: WSMessage) {
    const subscribers = this.channels.get(channel);
    if (subscribers) {
      subscribers.forEach(client => {
        this.send(client, { ...message, channel });
      });
    }
  }
  
  broadcast(message: WSMessage) {
    this.wss?.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.send(client, message);
      }
    });
  }
  
  getConnectedCount(): number {
    return this.wss?.clients.size || 0;
  }
  
  getChannelSubscribers(channel: string): number {
    return this.channels.get(channel)?.size || 0;
  }
  
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss?.close();
  }
}

export const wsManager = new WebSocketManager();

export const WSChannels = {
  GOVERNANCE: 'governance',
  TREASURY: 'treasury',
  TRAINING: 'training',
  NOTIFICATIONS: 'notifications',
  LEADERBOARD: 'leaderboard',
  LAND: 'land'
};

export function notifyUser(address: string, notification: {
  type: string;
  title: string;
  message: string;
  data?: any;
}) {
  wsManager.sendToUser(address, {
    type: 'notification',
    data: notification
  });
}

export function notifyChannel(channel: string, event: {
  type: string;
  data: any;
}) {
  wsManager.sendToChannel(channel, {
    type: 'channel_event',
    data: event
  });
}

export function broadcastUpdate(update: {
  type: string;
  data: any;
}) {
  wsManager.broadcast({
    type: 'broadcast',
    data: update
  });
}
