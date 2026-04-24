import { useEffect, useRef } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { arbitrum } from '@reown/appkit/networks';
import { useAppKit } from '@reown/appkit/react';
import { wagmiAdapter, projectId, networks } from '../../lib/web3/wagmiConfig';
import { setAppKitFunctions } from '../../lib/web3/appKitModal';

let appKitCreated = false;

if (typeof window !== 'undefined' && projectId && !appKitCreated) {
  appKitCreated = true;
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    defaultNetwork: arbitrum,
    metadata: {
      name: 'Axiom Protocol',
      description: 'Sovereign Digital-Physical Economy',
      url: window.location.origin,
      icons: ['/favicon.ico'],
    },
    features: {
      analytics: false,
      swaps: false,
      onramp: false,
    },
    themeMode: 'light',
  });
}

export default function AppKitInitializer() {
  const registered = useRef(false);

  let appKit: ReturnType<typeof useAppKit> | null = null;
  try {
    appKit = useAppKit();
  } catch {
    appKit = null;
  }

  useEffect(() => {
    if (appKit && !registered.current) {
      registered.current = true;
      setAppKitFunctions(
        (opts?: any) => appKit!.open(opts),
        () => appKit!.close()
      );
    }
  }, [appKit]);

  return null;
}
