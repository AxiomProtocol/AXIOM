import WebSocket from 'ws';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const WS_URL = `wss://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

export type TxStatus = 'pending' | 'mined' | 'dropped' | 'unknown';

export interface TxStatusEvent {
  status: TxStatus;
  txHash: string;
  blockNumber?: number;
  blockHash?: string;
  timestamp: string;
}

export type StatusCallback = (event: TxStatusEvent) => void;

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECTS = 5;

interface SubscriptionEntry {
  txHash: string;
  callback: StatusCallback;
  subId?: string;
  resolved: boolean;
}

export class AlchemyWsClient {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, SubscriptionEntry> = new Map();
  private reconnectCount = 0;
  private msgId = 1;
  private connected = false;

  constructor(private wsUrl: string = WS_URL) {}

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        this.connected = true;
        this.reconnectCount = 0;
        for (const [key, entry] of this.subscriptions.entries()) {
          if (!entry.subId && !entry.resolved) {
            this.subscribeToTx(key);
          }
        }
        resolve();
      });

      this.ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.handleMessage(msg);
        } catch { /* ignore parse errors */ }
      });

      this.ws.on('error', (err) => {
        console.error('[AlchemyWsClient] WebSocket error:', err.message);
        reject(err);
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.maybeReconnect();
      });
    });
  }

  private maybeReconnect() {
    if (this.reconnectCount >= MAX_RECONNECTS) return;
    if (this.subscriptions.size === 0) return;
    this.reconnectCount++;
    setTimeout(() => this.connect().catch(() => {}), RECONNECT_DELAY_MS * this.reconnectCount);
  }

  private nextId() { return this.msgId++; }

  private subscribeToTx(txHash: string) {
    if (!this.ws || !this.connected) return;
    const id = this.nextId();
    this.ws.send(JSON.stringify({
      id,
      jsonrpc: '2.0',
      method: 'eth_subscribe',
      params: ['alchemy_minedTransactions', { hashesOnly: false }],
    }));
  }

  private handleMessage(msg: Record<string, unknown>) {
    if (msg.method === 'eth_subscription') {
      const params = msg.params as { subscription?: string; result?: Record<string, unknown> } | undefined;
      if (!params?.result) return;
      const result = params.result;

      const txHash = (result.hash as string | undefined)?.toLowerCase();
      if (!txHash) return;

      for (const [key, entry] of this.subscriptions.entries()) {
        if (entry.txHash.toLowerCase() === txHash && !entry.resolved) {
          entry.resolved = true;
          entry.callback({
            status: 'mined',
            txHash: entry.txHash,
            blockNumber: result.blockNumber ? parseInt(result.blockNumber as string, 16) : undefined,
            blockHash: result.blockHash as string | undefined,
            timestamp: new Date().toISOString(),
          });
          this.subscriptions.delete(key);
        }
      }
    }

    if (msg.id && msg.result && typeof msg.result === 'string') {
      for (const [, entry] of this.subscriptions.entries()) {
        if (!entry.subId) entry.subId = msg.result;
      }
    }
  }

  async watchTransaction(txHash: string, callback: StatusCallback): Promise<void> {
    const key = txHash.toLowerCase();
    this.subscriptions.set(key, { txHash, callback, resolved: false });

    callback({ status: 'pending', txHash, timestamp: new Date().toISOString() });

    if (!this.connected) {
      await this.connect();
    } else {
      this.subscribeToTx(txHash);
    }
  }

  disconnect() {
    this.subscriptions.clear();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

let sharedClient: AlchemyWsClient | null = null;

export function getSharedWsClient(): AlchemyWsClient {
  if (!sharedClient) {
    sharedClient = new AlchemyWsClient();
  }
  return sharedClient;
}
