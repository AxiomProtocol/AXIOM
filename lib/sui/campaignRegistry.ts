import { getSuiClient, getPackageId, getDeployerAddress } from './client';

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

function hexToUtf8(hex: string): string {
  try {
    const bytes = hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) ?? [];
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return hex;
  }
}

function parsePoolBalance(pool: unknown): bigint {
  if (typeof pool === 'string') return BigInt(pool);
  if (typeof pool === 'number') return BigInt(pool);
  if (pool && typeof pool === 'object') {
    const p = pool as { fields?: { balance?: string }; value?: string };
    if (p.value) return BigInt(p.value);
    if (p.fields?.balance) return BigInt(p.fields.balance);
  }
  return 0n;
}

function parseCampaignFields(fields: Record<string, unknown>): CampaignInfo {
  const rawLabel = (fields.label as string) ?? '';
  const label = /^[0-9a-f]+$/i.test(rawLabel) && rawLabel.length % 2 === 0
    ? hexToUtf8(rawLabel)
    : rawLabel;

  return {
    id: fields.id as string,
    label,
    merkleRoot: bufferFieldToHex(fields.merkle_root),
    amountPerClaim: BigInt((fields.amount_per_claim as string) ?? '0'),
    expiresAtEpoch: BigInt((fields.expires_at_epoch as string) ?? '0'),
    poolBalance: parsePoolBalance(fields.pool),
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

  const seenIds = new Set<string>();
  const result: CampaignRegistryEntry[] = [];
  const now = Date.now();

  // --- Primary source: suix_getOwnedObjects filtered by ClaimCampaign type ---
  // Uses the deployer address when configured; skipped when address is unknown.
  const deployerAddress = getDeployerAddress();
  if (deployerAddress) {
    try {
      const page = await client.getOwnedObjects({
        owner: deployerAddress,
        structType: campaignType,
        limit,
      });

      for (const item of page.data) {
        const objectId = item.data?.objectId;
        if (!objectId || seenIds.has(objectId)) continue;

        const content = item.data?.content;
        if (content?.dataType === 'moveObject' && content.fields) {
          const info = parseCampaignFields({
            ...(content.fields as Record<string, unknown>),
            id: objectId,
          });
          seenIds.add(objectId);
          result.push({ objectId, info, fetchedAt: now });
        } else {
          // Content not inlined — fetch separately
          try {
            const info = await fetchCampaign(objectId);
            seenIds.add(objectId);
            result.push({ objectId, info, fetchedAt: now });
          } catch {
            // Skip inaccessible object
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SuiCampaignRegistry] getOwnedObjects failed:', err);
      }
    }
  }

  // --- Secondary source: suix_queryEvents (CampaignCreated) ---
  // Always runs; adds any campaign IDs not already discovered above.
  if (result.length < limit) {
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${packageId}::claim_campaign::CampaignCreated` },
        limit,
        order: 'descending',
      });

      type SuiEvent = { parsedJson?: unknown };
      const eventIds: string[] = (events.data as SuiEvent[])
        .map((e): string | undefined => {
          const parsed = e.parsedJson as { campaign_id?: string } | null;
          return parsed?.campaign_id;
        })
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      for (const objectId of eventIds) {
        if (seenIds.has(objectId)) continue;
        try {
          const info = await fetchCampaign(objectId);
          seenIds.add(objectId);
          result.push({ objectId, info, fetchedAt: now });
        } catch {
          // Skip inaccessible campaigns
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SuiCampaignRegistry] queryEvents failed:', err);
      }
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
