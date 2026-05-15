import 'server-only';
import { getSuiClient } from '../client';

// =============================================================================
// Campaign State Poller — Phase 9 Monitoring
//
// Reads ClaimCampaign shared object state from Sui RPC.
// Used by operator dashboard and health endpoints to track live campaign state.
// =============================================================================

export interface CampaignOnChainState {
  objectId: string;
  version: string;
  digest: string;
  isActive: boolean | null;
  isClosed: boolean | null;
  poolValueRaw: string | null;
  amountPerClaim: string | null;
  merkleRoot: string | null;
  fetchedAt: string;
  error?: string;
}

/**
 * Fetch live campaign state from the Sui RPC.
 * Reads the ClaimCampaign shared object by its object ID.
 */
export async function pollCampaignState(
  campaignObjectId: string,
): Promise<CampaignOnChainState> {
  const client = getSuiClient();
  const fetchedAt = new Date().toISOString();

  try {
    const response = await client.getObject({
      id: campaignObjectId,
      options: { showContent: true, showOwner: true },
    });

    if (response.error) {
      return {
        objectId: campaignObjectId,
        version: '',
        digest: '',
        isActive: null,
        isClosed: null,
        poolValueRaw: null,
        amountPerClaim: null,
        merkleRoot: null,
        fetchedAt,
        error: `RPC error: ${response.error.code}`,
      };
    }

    const data = response.data!;
    const content = data.content as Record<string, unknown> | undefined;
    const fields = (content?.fields as Record<string, unknown>) ?? {};

    return {
      objectId: data.objectId,
      version: data.version,
      digest: data.digest,
      isActive: typeof fields.is_active === 'boolean' ? fields.is_active : null,
      isClosed: typeof fields.is_closed === 'boolean' ? fields.is_closed : null,
      poolValueRaw: fields.pool != null ? String(fields.pool) : null,
      amountPerClaim: fields.amount_per_claim != null ? String(fields.amount_per_claim) : null,
      merkleRoot: fields.merkle_root != null ? String(fields.merkle_root) : null,
      fetchedAt,
    };
  } catch (err) {
    return {
      objectId: campaignObjectId,
      version: '',
      digest: '',
      isActive: null,
      isClosed: null,
      poolValueRaw: null,
      amountPerClaim: null,
      merkleRoot: null,
      fetchedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Derive a human-readable campaign health label from on-chain state.
 */
export function campaignHealthLabel(
  state: CampaignOnChainState,
): 'HEALTHY' | 'PAUSED' | 'CLOSED' | 'UNKNOWN' | 'ERROR' {
  if (state.error) return 'ERROR';
  if (state.isActive === null) return 'UNKNOWN';
  if (state.isClosed) return 'CLOSED';
  if (!state.isActive) return 'PAUSED';
  return 'HEALTHY';
}
