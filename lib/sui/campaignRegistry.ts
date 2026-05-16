import { getSuiClient, getPackageId } from './client';

export interface CampaignInfo {
  id: string;
  label: string;
  merkleRoot: string;
  amountPerClaim: bigint;
  expiresAtEpoch: bigint;
  poolBalance: bigint;
  isActive: boolean;
  isClosed: boolean;
}

export interface CampaignRegistryEntry {
  objectId: string;
  info: CampaignInfo;
  fetchedAt: number;
}

const CAMPAIGN_TYPE_SUFFIX = '::claim_campaign::ClaimCampaign';

function parseCampaignFields(fields: Record<string, unknown>): CampaignInfo {
  return {
    id: fields.id as string,
    label: (fields.label as string) ?? '',
    merkleRoot: bufferFieldToHex(fields.merkle_root),
    amountPerClaim: BigInt((fields.amount_per_claim as string) ?? '0'),
    expiresAtEpoch: BigInt((fields.expires_at_epoch as string) ?? '0'),
    poolBalance: BigInt((fields.pool as { fields?: { balance?: string } })?.fields?.balance ?? '0'),
    isActive: Boolean(fields.is_active),
    isClosed: Boolean(fields.is_closed),
  };
}

function bufferFieldToHex(field: unknown): string {
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    return field.map((b: number) => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

export async function fetchCampaign(objectId: string): Promise<CampaignInfo> {
  const client = getSuiClient();
  const obj = await client.getObject({
    id: objectId,
    options: { showContent: true, showType: true },
  });

  if (!obj.data?.content || obj.data.content.dataType !== 'moveObject') {
    throw new Error(`Object ${objectId} is not a Move object`);
  }

  const fields = obj.data.content.fields as Record<string, unknown>;
  return parseCampaignFields({ ...fields, id: objectId });
}

export async function fetchActiveCampaigns(limit = 20): Promise<CampaignRegistryEntry[]> {
  const client = getSuiClient();
  const packageId = getPackageId();
  const campaignType = `${packageId}${CAMPAIGN_TYPE_SUFFIX}`;

  const result: CampaignRegistryEntry[] = [];

  try {
    const objects = await client.queryEvents({
      query: { MoveEventType: `${packageId}::claim_campaign::CampaignCreated` },
      limit,
      order: 'descending',
    });

    type SuiEvent = { parsedJson?: unknown };
    const campaignIds: string[] = (objects.data as SuiEvent[])
      .map((e): string | undefined => {
        const parsed = e.parsedJson as { campaign_id?: string } | null;
        return parsed?.campaign_id;
      })
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const deduped = [...new Set(campaignIds)];

    for (const objectId of deduped) {
      try {
        const info = await fetchCampaign(objectId);
        result.push({ objectId, info, fetchedAt: Date.now() });
      } catch {
        // Skip inaccessible campaigns
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SuiCampaignRegistry] fetchActiveCampaigns failed:', err);
    }
  }

  return result;
}

export async function checkClaimStatus(
  campaignId: string,
  address: string,
): Promise<boolean> {
  const client = getSuiClient();
  const normalized = address.replace(/^0x/, '').padStart(64, '0');

  try {
    const obj = await client.getObject({
      id: campaignId,
      options: { showContent: true },
    });

    if (!obj.data?.content || obj.data.content.dataType !== 'moveObject') {
      return false;
    }

    const fields = obj.data.content.fields as Record<string, unknown>;
    const claimedTable = fields.claimed as { fields?: { id?: { id?: string } } } | undefined;
    const tableId = claimedTable?.fields?.id?.id;

    if (!tableId) return false;

    const entry = await client.getDynamicFieldObject({
      parentId: tableId,
      name: { type: 'address', value: `0x${normalized}` },
    });

    return Boolean(entry.data);
  } catch {
    return false;
  }
}
