const CIRCLE_WALLETS_BASE_URL = 'https://api.circle.com/v1/w3s';

export type CircleUserAction = 'createUser' | 'createWallet' | 'getWallet';

export interface CircleUser {
  id: string;
  status: string;
}

export interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  accountType: string;
  state: string;
  userId: string;
}

function getAppId(): string {
  const id = process.env.CIRCLE_APP_ID;
  if (!id) throw new Error('CIRCLE_APP_ID not configured');
  return id;
}

async function circleRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const appId = getAppId();
  const res = await fetch(`${CIRCLE_WALLETS_BASE_URL}${path}`, {
    method,
    headers: {
      'X-User-Token': appId,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Circle API error ${res.status}`);
  }

  const json = await res.json();
  return (json?.data ?? json) as T;
}

export async function createCircleUser(userId: string): Promise<CircleUser> {
  return circleRequest<CircleUser>('POST', '/users', { userId });
}

export async function createCircleWallet(userId: string, blockchains = ['ARB']): Promise<CircleWallet> {
  const data = await circleRequest<{ wallets: CircleWallet[] }>('POST', '/user/wallets', {
    userId,
    blockchains,
    accountType: 'SCA',
  });
  const wallet = data?.wallets?.[0];
  if (!wallet) throw new Error('No wallet returned from Circle');
  return wallet;
}

export async function getCircleWallet(walletId: string): Promise<CircleWallet> {
  return circleRequest<CircleWallet>('GET', `/wallets/${walletId}`);
}
