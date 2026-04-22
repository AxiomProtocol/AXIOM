import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';

const ARBITRUM_CHAIN_ID = 42161;
const NONCE_RETRY_CONFIG = {
  maxRetries: 4,
  baseDelayMs: 1000,
  maxDelayMs: 8000
};

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
  private signingInProgress: boolean = false;
  private signingStartTime: number = 0;
  private readonly SIGNING_TIMEOUT_MS = 60000;

  resetSigningState(): void {
    console.log('[SIWEService] Manually resetting signing state');
    this.signingInProgress = false;
    this.signingStartTime = 0;
  }

  private isSigningStale(): boolean {
    if (!this.signingInProgress) return false;
    const elapsed = Date.now() - this.signingStartTime;
    return elapsed > this.SIGNING_TIMEOUT_MS;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoff(attempt: number): number {
    const delay = NONCE_RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, NONCE_RETRY_CONFIG.maxDelayMs);
  }

  async getNonce(): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= NONCE_RETRY_CONFIG.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffMs = this.calculateBackoff(attempt - 1);
          console.log(`[SIWEService] Retry attempt ${attempt}/${NONCE_RETRY_CONFIG.maxRetries}, waiting ${backoffMs}ms...`);
          await this.delay(backoffMs);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch('/api/auth/siwe/nonce', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[SIWEService] Nonce request failed:', {
            status: response.status,
            error: errorData.error,
            code: errorData.code,
            details: errorData.details,
            requestId: errorData.requestId
          });
          throw new Error(errorData.details || errorData.error || `Nonce request failed (${response.status})`);
        }
        
        const data = await response.json();
        console.log('[SIWEService] Nonce received successfully' + (attempt > 0 ? ` (after ${attempt} retries)` : ''));
        return data.nonce;
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.name === 'AbortError' || 
                           error.message?.includes('network') ||
                           error.message?.includes('fetch') ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('500') ||
                           error.message?.includes('503') ||
                           error.message?.includes('unavailable');
        
        if (!isRetryable || attempt === NONCE_RETRY_CONFIG.maxRetries) {
          console.error(`[SIWEService] getNonce failed after ${attempt + 1} attempts:`, error.message);
          break;
        }
        
        console.warn(`[SIWEService] Nonce request failed (attempt ${attempt + 1}), will retry:`, error.message);
      }
    }
    
    throw new Error(`Failed to get nonce after ${NONCE_RETRY_CONFIG.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  async createSiweMessage(address: string, chainId: number = ARBITRUM_CHAIN_ID): Promise<string> {
    const nonce = await this.getNonce();
    
    // Convert address to EIP-55 checksum format (required by SIWE)
    const checksumAddress = ethers.getAddress(address);
    console.log('🔐 Using checksummed address:', checksumAddress);
    
    const siweMessage = new SiweMessage({
      domain: window.location.host,
      address: checksumAddress,
      statement: 'Sign in to Axiom Protocol to verify your wallet ownership. This request will not trigger a blockchain transaction or cost any gas fees.',
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
    // Check if previous signing request is stale (over 60 seconds)
    if (this.signingInProgress && this.isSigningStale()) {
      console.log('[SIWEService] Previous signing request was stale, resetting...');
      this.resetSigningState();
    }
    
    // Prevent duplicate signing requests (MetaMask throws "already pending" error)
    if (this.signingInProgress) {
      console.log('⚠️ SIWE signing already in progress, skipping duplicate request');
      return {
        success: false,
        error: 'Signing already in progress. Please wait for the current request to complete.'
      };
    }
    this.signingInProgress = true;
    this.signingStartTime = Date.now();
    
    try {
      // Convert to checksum format for consistency
      const checksumAddress = ethers.getAddress(address);
      console.log('🔐 SIWE signIn called with address:', checksumAddress, 'chainId:', chainId);
      
      const message = await this.createSiweMessage(checksumAddress, chainId);
      console.log('🔐 SIWE message created, requesting signature...');
      
      let signature: string;
      
      if (signerOrProvider?.signMessage) {
        console.log('🔐 Using signer.signMessage (cross-wallet compatible)');
        signature = await signerOrProvider.signMessage(message);
      } else if (typeof window !== 'undefined' && (window as any).ethereum) {
        console.log('🔐 Using direct personal_sign via window.ethereum');
        signature = await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [message, checksumAddress]
        });
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
        this.signingInProgress = false;
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
      
      this.signingInProgress = false;
      return {
        success: true,
        address: result.address,
        chainId: result.chainId
      };
    } catch (error: any) {
      this.signingInProgress = false;
      
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
