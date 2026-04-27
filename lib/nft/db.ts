import { pool } from '../db';

// ── Table creation ────────────────────────────────────────────────────────────

export async function ensureNFTTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nft_tokens (
      id                SERIAL PRIMARY KEY,
      token_id          INTEGER NOT NULL,
      contract_address  VARCHAR(42) NOT NULL,
      contract_type     VARCHAR(20) NOT NULL DEFAULT 'ERC721',
      owner_address     VARCHAR(42),
      trait_seed        VARCHAR(66),
      rarity_tier       VARCHAR(20),
      rarity_score      INTEGER,
      traits_json       JSONB,
      image_cid         TEXT,
      animation_cid     TEXT,
      metadata_cid      TEXT,
      minted_at         TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(token_id, contract_address)
    );

    CREATE TABLE IF NOT EXISTS nft_mint_eligibility (
      id              SERIAL PRIMARY KEY,
      wallet_address  VARCHAR(42) NOT NULL UNIQUE,
      collection      VARCHAR(20) NOT NULL DEFAULT 'founder',
      eligible        BOOLEAN NOT NULL DEFAULT true,
      minted          BOOLEAN NOT NULL DEFAULT false,
      minted_token_id INTEGER,
      minted_tx_hash  VARCHAR(66),
      reason          TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_nft_tokens_contract ON nft_tokens(contract_address);
    CREATE INDEX IF NOT EXISTS idx_nft_tokens_owner    ON nft_tokens(owner_address);
    CREATE INDEX IF NOT EXISTS idx_nft_eligibility_wallet ON nft_mint_eligibility(wallet_address);
  `);
}

// ── Token CRUD ────────────────────────────────────────────────────────────────

export async function upsertNFTToken(params: {
  tokenId: number;
  contractAddress: string;
  contractType?: string;
  ownerAddress?: string;
  traitSeed?: string;
  rarityTier?: string;
  rarityScore?: number;
  traitsJson?: object;
  imageCid?: string;
  animationCid?: string;
  metadataCid?: string;
  mintedAt?: Date;
}) {
  const {
    tokenId, contractAddress, contractType = 'ERC721', ownerAddress,
    traitSeed, rarityTier, rarityScore, traitsJson,
    imageCid, animationCid, metadataCid, mintedAt,
  } = params;

  const result = await pool.query(`
    INSERT INTO nft_tokens (
      token_id, contract_address, contract_type, owner_address,
      trait_seed, rarity_tier, rarity_score, traits_json,
      image_cid, animation_cid, metadata_cid, minted_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
    ON CONFLICT (token_id, contract_address)
    DO UPDATE SET
      owner_address  = COALESCE(EXCLUDED.owner_address, nft_tokens.owner_address),
      trait_seed     = COALESCE(EXCLUDED.trait_seed, nft_tokens.trait_seed),
      rarity_tier    = COALESCE(EXCLUDED.rarity_tier, nft_tokens.rarity_tier),
      rarity_score   = COALESCE(EXCLUDED.rarity_score, nft_tokens.rarity_score),
      traits_json    = COALESCE(EXCLUDED.traits_json, nft_tokens.traits_json),
      image_cid      = COALESCE(EXCLUDED.image_cid, nft_tokens.image_cid),
      animation_cid  = COALESCE(EXCLUDED.animation_cid, nft_tokens.animation_cid),
      metadata_cid   = COALESCE(EXCLUDED.metadata_cid, nft_tokens.metadata_cid),
      minted_at      = COALESCE(EXCLUDED.minted_at, nft_tokens.minted_at),
      updated_at     = NOW()
    RETURNING *
  `, [tokenId, contractAddress.toLowerCase(), contractType, ownerAddress,
      traitSeed, rarityTier, rarityScore, traitsJson ? JSON.stringify(traitsJson) : null,
      imageCid, animationCid, metadataCid, mintedAt]);

  return result.rows[0];
}

export async function getNFTToken(tokenId: number, contractAddress: string) {
  const result = await pool.query(
    'SELECT * FROM nft_tokens WHERE token_id = $1 AND contract_address = $2',
    [tokenId, contractAddress.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

export async function listNFTTokens(contractAddress: string, limit = 50, offset = 0) {
  const result = await pool.query(
    'SELECT * FROM nft_tokens WHERE contract_address = $1 ORDER BY token_id ASC LIMIT $2 OFFSET $3',
    [contractAddress.toLowerCase(), limit, offset]
  );
  return result.rows;
}

// ── Eligibility CRUD ──────────────────────────────────────────────────────────

export async function getEligibility(walletAddress: string, collection = 'founder') {
  const result = await pool.query(
    'SELECT * FROM nft_mint_eligibility WHERE wallet_address = $1 AND collection = $2',
    [walletAddress.toLowerCase(), collection]
  );
  return result.rows[0] ?? null;
}

export async function upsertEligibility(params: {
  walletAddress: string;
  collection?: string;
  eligible?: boolean;
  minted?: boolean;
  mintedTokenId?: number;
  mintedTxHash?: string;
  reason?: string;
}) {
  const {
    walletAddress, collection = 'founder', eligible = true,
    minted, mintedTokenId, mintedTxHash, reason,
  } = params;

  const result = await pool.query(`
    INSERT INTO nft_mint_eligibility (wallet_address, collection, eligible, minted, minted_token_id, minted_tx_hash, reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (wallet_address)
    DO UPDATE SET
      eligible        = COALESCE(EXCLUDED.eligible, nft_mint_eligibility.eligible),
      minted          = COALESCE(EXCLUDED.minted, nft_mint_eligibility.minted),
      minted_token_id = COALESCE(EXCLUDED.minted_token_id, nft_mint_eligibility.minted_token_id),
      minted_tx_hash  = COALESCE(EXCLUDED.minted_tx_hash, nft_mint_eligibility.minted_tx_hash),
      reason          = COALESCE(EXCLUDED.reason, nft_mint_eligibility.reason),
      updated_at      = NOW()
    RETURNING *
  `, [walletAddress.toLowerCase(), collection, eligible, minted ?? false, mintedTokenId, mintedTxHash, reason]);

  return result.rows[0];
}

export async function getCollectionStats(contractAddress: string) {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE minted_at IS NOT NULL) AS minted_count,
      COUNT(DISTINCT owner_address) AS unique_holders,
      COUNT(*) FILTER (WHERE rarity_tier = 'Legendary') AS legendary_count,
      COUNT(*) FILTER (WHERE rarity_tier = 'Epic')      AS epic_count,
      COUNT(*) FILTER (WHERE rarity_tier = 'Rare')      AS rare_count,
      COUNT(*) FILTER (WHERE rarity_tier = 'Uncommon')  AS uncommon_count,
      COUNT(*) FILTER (WHERE rarity_tier = 'Common')    AS common_count
    FROM nft_tokens
    WHERE contract_address = $1
  `, [contractAddress.toLowerCase()]);
  return result.rows[0];
}
