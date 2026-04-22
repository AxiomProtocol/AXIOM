import { getIntegrationConfig } from './config';

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function liveRequest(path: string, method: string, body?: any): Promise<any> {
  const cfg = getIntegrationConfig();
  const response = await fetch(`${cfg.bitgoApiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.bitgoAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || json?.message || `BitGo API error (${response.status})`);
  }
  return json;
}

export async function bitgoCreateWallet(coin = 'teth'): Promise<{
  walletId: string;
  coin: string;
  receiveAddress: string;
  confirmedBalanceStr: string;
  spendableBalanceStr: string;
}> {
  const cfg = getIntegrationConfig();

  if (cfg.mode === 'live') {
    const out = await liveRequest(`/${coin}/wallet/generate`, 'POST', {
      label: `axiom-${Date.now()}`,
      passphrase: process.env.BITGO_WALLET_PASSPHRASE || 'axiom-placeholder-passphrase',
    });

    return {
      walletId: out?.id || randomId('bitgo_wallet'),
      coin,
      receiveAddress: out?.receiveAddress?.address || '0x0000000000000000000000000000000000000000',
      confirmedBalanceStr: String(out?.balanceString || '0'),
      spendableBalanceStr: String(out?.spendableBalanceString || '0'),
    };
  }

  const n = Math.random().toString(16).slice(2, 42).padEnd(40, '0');
  return {
    walletId: randomId('bitgo_wallet'),
    coin,
    receiveAddress: `0x${n.slice(0, 40)}`,
    confirmedBalanceStr: '0',
    spendableBalanceStr: '0',
  };
}

export async function bitgoSend(params: {
  walletId: string;
  coin: string;
  toAddress: string;
  amount: string;
}): Promise<{ txId: string; txHash: string; state: string }> {
  const cfg = getIntegrationConfig();

  if (cfg.mode === 'live') {
    const out = await liveRequest(`/${params.coin}/wallet/${params.walletId}/sendcoins`, 'POST', {
      address: params.toAddress,
      amount: params.amount,
      walletPassphrase: process.env.BITGO_WALLET_PASSPHRASE || 'axiom-placeholder-passphrase',
    });

    return {
      txId: out?.transfer?.id || randomId('bitgo_tx'),
      txHash: out?.transfer?.txid || randomId('0x'),
      state: out?.transfer?.state || 'pendingApproval',
    };
  }

  return {
    txId: randomId('bitgo_tx'),
    txHash: `0x${Math.random().toString(16).slice(2).padEnd(64, '0').slice(0, 64)}`,
    state: 'pendingApproval',
  };
}

export async function bitgoGetWallet(walletId: string, coin: string): Promise<{ confirmedBalanceStr: string; spendableBalanceStr: string } | null> {
  const cfg = getIntegrationConfig();
  if (cfg.mode === 'live') {
    try {
      const out = await liveRequest(`/${coin}/wallet/${walletId}`, 'GET');
      return {
        confirmedBalanceStr: String(out?.balanceString ?? out?.balance ?? '0'),
        spendableBalanceStr: String(out?.spendableBalanceString ?? out?.spendableBalance ?? '0'),
      };
    } catch {
      return null;
    }
  }
  return null;
}
