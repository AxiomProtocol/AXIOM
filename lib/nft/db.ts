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
      image_data        TEXT,
      animation_cid     TEXT,
      metadata_cid      TEXT,
      minted_at         TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(token_id, contract_address)
    );

    ALTER TABLE nft_tokens ADD COLUMN IF NOT EXISTS image_data TEXT;

    CREATE TABLE IF NOT EXISTS nft_balances (
      id               SERIAL PRIMARY KEY,
      token_id         INTEGER NOT NULL,
      contract_address VARCHAR(42) NOT NULL,
      holder_address   VARCHAR(42) NOT NULL,
      balance          INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(token_id, contract_address, holder_address)
    );

    CREATE TABLE IF NOT EXISTS nft_burned_txs (
      id               SERIAL PRIMARY KEY,
      tx_hash          VARCHAR(66) NOT NULL UNIQUE,
      used_by          VARCHAR(42) NOT NULL,
      token_id         INTEGER,
      contract_address VARCHAR(42),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS nft_mint_eligibility (
      id              SERIAL PRIMARY KEY,
      wallet_address  VARCHAR(42) NOT NULL,
      collection      VARCHAR(20) NOT NULL DEFAULT 'founder',
      eligible        BOOLEAN NOT NULL DEFAULT true,
      minted          BOOLEAN NOT NULL DEFAULT false,
      minted_token_id INTEGER,
      minted_tx_hash  VARCHAR(66),
      reason          TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(wallet_address, collection)
    );

    CREATE INDEX IF NOT EXISTS idx_nft_tokens_contract  ON nft_tokens(contract_address);
    CREATE INDEX IF NOT EXISTS idx_nft_tokens_owner     ON nft_tokens(owner_address);
    CREATE INDEX IF NOT EXISTS idx_nft_balances_holder  ON nft_balances(holder_address);
    CREATE INDEX IF NOT EXISTS idx_nft_balances_token   ON nft_balances(token_id, contract_address);
    CREATE INDEX IF NOT EXISTS idx_nft_burned_txs_hash  ON nft_burned_txs(tx_hash);
    CREATE INDEX IF NOT EXISTS idx_nft_eligibility_wallet ON nft_mint_eligibility(wallet_address, collection);
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
  imageData?: string;
  animationCid?: string;
  metadataCid?: string;
  mintedAt?: Date;
}) {
  const {
    tokenId, contractAddress, contractType = 'ERC721', ownerAddress,
    traitSeed, rarityTier, rarityScore, traitsJson,
    imageCid, imageData, animationCid, metadataCid, mintedAt,
  } = params;

  const result = await pool.query(`
    INSERT INTO nft_tokens (
      token_id, contract_address, contract_type, owner_address,
      trait_seed, rarity_tier, rarity_score, traits_json,
      image_cid, image_data, animation_cid, metadata_cid, minted_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
    ON CONFLICT (token_id, contract_address)
    DO UPDATE SET
      owner_address  = COALESCE(EXCLUDED.owner_address, nft_tokens.owner_address),
      trait_seed     = COALESCE(EXCLUDED.trait_seed, nft_tokens.trait_seed),
      rarity_tier    = COALESCE(EXCLUDED.rarity_tier, nft_tokens.rarity_tier),
      rarity_score   = COALESCE(EXCLUDED.rarity_score, nft_tokens.rarity_score),
      traits_json    = COALESCE(EXCLUDED.traits_json, nft_tokens.traits_json),
      image_cid      = COALESCE(EXCLUDED.image_cid, nft_tokens.image_cid),
      image_data     = COALESCE(EXCLUDED.image_data, nft_tokens.image_data),
      animation_cid  = COALESCE(EXCLUDED.animation_cid, nft_tokens.animation_cid),
      metadata_cid   = COALESCE(EXCLUDED.metadata_cid, nft_tokens.metadata_cid),
      minted_at      = COALESCE(EXCLUDED.minted_at, nft_tokens.minted_at),
      updated_at     = NOW()
    RETURNING *
  `, [tokenId, contractAddress.toLowerCase(), contractType, ownerAddress,
      traitSeed, rarityTier, rarityScore, traitsJson ? JSON.stringify(traitsJson) : null,
      imageCid, imageData, animationCid, metadataCid, mintedAt]);

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

// ── ERC-1155 balance tracking ─────────────────────────────────────────────────

export async function upsertNFTBalance(params: {
  tokenId: number;
  contractAddress: string;
  holderAddress: string;
  balanceDelta: number;
}) {
  const { tokenId, contractAddress, holderAddress, balanceDelta } = params;
  const result = await pool.query(`
    INSERT INTO nft_balances (token_id, contract_address, holder_address, balance)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (token_id, contract_address, holder_address)
    DO UPDATE SET
      balance    = nft_balances.balance + $4,
      updated_at = NOW()
    RETURNING *
  `, [tokenId, contractAddress.toLowerCase(), holderAddress.toLowerCase(), balanceDelta]);
  return result.rows[0];
}

export async function getNFTBalance(tokenId: number, contractAddress: string, holderAddress: string): Promise<number> {
  const result = await pool.query(
    'SELECT balance FROM nft_balances WHERE token_id = $1 AND contract_address = $2 AND holder_address = $3',
    [tokenId, contractAddress.toLowerCase(), holderAddress.toLowerCase()]
  );
  return result.rows[0]?.balance ?? 0;
}

export async function listHolders(tokenId: number, contractAddress: string) {
  const result = await pool.query(
    'SELECT holder_address, balance FROM nft_balances WHERE token_id = $1 AND contract_address = $2 AND balance > 0 ORDER BY balance DESC',
    [tokenId, contractAddress.toLowerCase()]
  );
  return result.rows;
}

// ── Burn tx replay prevention ─────────────────────────────────────────────────

export async function checkBurnTxUsed(txHash: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM nft_burned_txs WHERE tx_hash = $1',
    [txHash.toLowerCase()]
  );
  return result.rows.length > 0;
}

/**
 * Atomically claim a burn/fee tx hash.
 * Returns true if the claim succeeded (this request owns the hash),
 * or false if it was already claimed by a prior request.
 * This replaces the non-atomic checkBurnTxUsed + recordBurnTx pattern
 * and eliminates the TOCTOU race condition.
 */
export async function claimBurnTx(params: {
  txHash: string;
  usedBy: string;
  tokenId?: number;
  contractAddress?: string;
}): Promise<boolean> {
  const { txHash, usedBy, tokenId, contractAddress } = params;
  const result = await pool.query(`
    INSERT INTO nft_burned_txs (tx_hash, used_by, token_id, contract_address)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (tx_hash) DO NOTHING
    RETURNING id
  `, [txHash.toLowerCase(), usedBy.toLowerCase(), tokenId ?? null, contractAddress?.toLowerCase() ?? null]);
  return result.rows.length > 0;
}

/**
 * Release a previously claimed burn/fee tx hash.
 * Called when the downstream operation (mint, upgrade) fails after claiming,
 * so the user can retry with the same on-chain transaction hash.
 */
export async function releaseBurnTx(txHash: string): Promise<void> {
  await pool.query(
    'DELETE FROM nft_burned_txs WHERE tx_hash = $1',
    [txHash.toLowerCase()]
  );
}

export async function recordBurnTx(params: {
  txHash: string;
  usedBy: string;
  tokenId?: number;
  contractAddress?: string;
}) {
  const { txHash, usedBy, tokenId, contractAddress } = params;
  await pool.query(`
    INSERT INTO nft_burned_txs (tx_hash, used_by, token_id, contract_address)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (tx_hash) DO NOTHING
  `, [txHash.toLowerCase(), usedBy.toLowerCase(), tokenId ?? null, contractAddress?.toLowerCase() ?? null]);
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
    ON CONFLICT (wallet_address, collection)
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
      COUNT(*) FILTER (WHERE t.minted_at IS NOT NULL) AS minted_count,
      -- COALESCE handles both ERC-721 (owner_address) and ERC-1155 (nft_balances).
      -- Founder badges track ownership via nft_tokens.owner_address; participation/land
      -- use nft_balances. Both paths are covered by a single distinct count.
      COUNT(DISTINCT COALESCE(b.holder_address, t.owner_address)) AS unique_holders
    FROM nft_tokens t
    LEFT JOIN nft_balances b ON b.token_id = t.token_id AND b.contract_address = t.contract_address AND b.balance > 0
    WHERE t.contract_address = $1
  `, [contractAddress.toLowerCase()]);

  const rarityResult = await pool.query(`
    SELECT rarity_tier, COUNT(*) AS cnt
    FROM nft_tokens
    WHERE contract_address = $1 AND minted_at IS NOT NULL
    GROUP BY rarity_tier
  `, [contractAddress.toLowerCase()]);

  const rarityCounts: Record<string, number> = {};
  for (const row of rarityResult.rows) {
    rarityCounts[row.rarity_tier] = parseInt(row.cnt);
  }

  return {
    ...result.rows[0],
    legendary_count: rarityCounts['Legendary'] ?? 0,
    epic_count:      rarityCounts['Epic'] ?? 0,
    rare_count:      rarityCounts['Rare'] ?? 0,
    uncommon_count:  rarityCounts['Uncommon'] ?? 0,
    common_count:    rarityCounts['Common'] ?? 0,
  };
}
