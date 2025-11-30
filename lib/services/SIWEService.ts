import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';

const ARBITRUM_CHAIN_ID = 42161;

export interface SIWESession {
  authenticated: boolean;
  address: string | null;
  chainId?: number;
  authenticatedAt?: string;
}

export interface SIWESignInResult {
  success: boolean;
  address?: string;
  chainId?: number;
  error?: string;
}

class SIWEService {
  private cachedSession: SIWESession | null = null;
  private sessionCheckPromise: Promise<SIWESession> | null = null;

  async getNonce(): Promise<string> {
    const response = await fetch('/api/auth/siwe/nonce');
    if (!response.ok) {
      throw new Error('Failed to get nonce');
    }
    const data = await response.json();
    return data.nonce;
  }

  async createSiweMessage(address: string, chainId: number = ARBITRUM_CHAIN_ID): Promise<string> {
    const nonce = await this.getNonce();
    
    // Convert address to EIP-55 checksum format (required by SIWE)
    const checksumAddress = ethers.getAddress(address);
    console.log('🔐 Using checksummed address:', checksumAddress);
    
    const siweMessage = new SiweMessage({
      domain: window.location.host,
      address: checksumAddress,
      statement: 'Sign in to Axiom Smart City to verify your wallet ownership. This request will not trigger a blockchain transaction or cost any gas fees.',
      uri: window.location.origin,
      version: '1',
      chainId: chainId,
      nonce: nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
    
    return siweMessage.prepareMessage();
  }

  async signIn(
    signerOrProvider: any,
    address: string,
    chainId: number = ARBITRUM_CHAIN_ID
  ): Promise<SIWESignInResult> {
    try {
      // Convert to checksum format for consistency
      const checksumAddress = ethers.getAddress(address);
      console.log('🔐 SIWE signIn called with address:', checksumAddress, 'chainId:', chainId);
      
      const message = await this.createSiweMessage(checksumAddress, chainId);
      console.log('🔐 SIWE message created, requesting signature via personal_sign...');
      
      let signature: string;
      
      // Try using direct personal_sign RPC call (most reliable with MetaMask SDK)
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        console.log('🔐 Using direct personal_sign via window.ethereum');
        const hexMessage = ethers.hexlify(ethers.toUtf8Bytes(message));
        signature = await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [hexMessage, checksumAddress]
        });
      } else if (signerOrProvider?.signMessage) {
        // Fallback to signer if available
        console.log('🔐 Using signer.signMessage fallback');
        signature = await signerOrProvider.signMessage(message);
      } else {
        throw new Error('No signing method available');
      }
      
      console.log('🔐 Signature received:', signature?.substring(0, 20) + '...');
      
      const response = await fetch('/api/auth/siwe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Verification failed'
        };
      }
      
      this.cachedSession = {
        authenticated: true,
        address: result.address,
        chainId: result.chainId,
        authenticatedAt: new Date().toISOString()
      };
      
      return {
        success: true,
        address: result.address,
        chainId: result.chainId
      };
    } catch (error: any) {
      if (error.code === 4001 || error.message?.includes('rejected')) {
        return {
          success: false,
          error: 'Signature request was rejected. Please approve the signature to verify your wallet.'
        };
      }
      
      console.error('SIWE sign-in error:', error);
      return {
        success: false,
        error: error.message || 'Sign-in failed'
      };
    }
  }

  async getSession(forceRefresh = false): Promise<SIWESession> {
    if (!forceRefresh && this.cachedSession) {
      return this.cachedSession;
    }
    
    if (this.sessionCheckPromise) {
      return this.sessionCheckPromise;
    }
    
    this.sessionCheckPromise = (async () => {
      try {
        const response = await fetch('/api/auth/siwe/session');
        if (!response.ok) {
          throw new Error('Session check failed');
        }
        const session = await response.json();
        this.cachedSession = session;
        return session;
      } catch (error) {
        console.error('Session check error:', error);
        return { authenticated: false, address: null };
      } finally {
        this.sessionCheckPromise = null;
      }
    })();
    
    return this.sessionCheckPromise;
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/siwe/logout', {
        method: 'POST'
      });
      this.cachedSession = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.cachedSession?.authenticated ?? false;
  }

  getAuthenticatedAddress(): string | null {
    return this.cachedSession?.address ?? null;
  }

  clearCache(): void {
    this.cachedSession = null;
  }
}

export const siweService = new SIWEService();
export default SIWEService;
