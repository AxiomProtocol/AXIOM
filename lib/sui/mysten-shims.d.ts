// =============================================================================
// @mysten/sui subpath module shims
//
// TypeScript's moduleResolution:node cannot resolve subpath exports (.d.mts)
// from @mysten/sui v2. These local declare module stubs make the import paths
// resolvable while skipLibCheck:true means the actual library types are not
// deeply re-checked.
//
// Only the symbols used by lib/sui/client.ts are declared here.
// =============================================================================

declare module '@mysten/sui/client' {
  export interface SuiClientOptions {
    url: string;
  }

  export interface SuiEventFilter {
    MoveEventType?: string;
    [key: string]: unknown;
  }

  export interface SuiEvent {
    id: { txDigest: string; eventSeq: string };
    type: string;
    parsedJson?: Record<string, unknown>;
    timestampMs?: string;
    [key: string]: unknown;
  }

  export interface PaginatedSuiEvents {
    data: SuiEvent[];
    nextCursor?: { txDigest: string; eventSeq: string } | null;
    hasNextPage: boolean;
  }

  export interface SuiObjectData {
    objectId: string;
    version: string;
    digest: string;
    content?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface SuiObjectResponse {
    data?: SuiObjectData;
    error?: { code: string };
  }

  export class SuiClient {
    constructor(options: SuiClientOptions);

    queryEvents(params: {
      query: SuiEventFilter;
      limit?: number;
      cursor?: { txDigest: string; eventSeq: string } | null;
      descending_order?: boolean;
    }): Promise<PaginatedSuiEvents>;

    getObject(params: {
      id: string;
      options?: { showContent?: boolean; showOwner?: boolean };
    }): Promise<SuiObjectResponse>;
  }

  export function getFullnodeUrl(
    network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  ): string;
}
