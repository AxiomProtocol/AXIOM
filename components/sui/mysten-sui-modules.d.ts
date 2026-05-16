declare module '@mysten/sui/transactions' {
  type TransactionArgument = unknown;

  export class Transaction {
    setSender(address: string): void;
    setGasBudget(budget: number): void;
    object(id: string): TransactionArgument;
    pure(bytes: Uint8Array): TransactionArgument;
    moveCall(params: {
      target: string;
      arguments?: TransactionArgument[];
      typeArguments?: string[];
    }): TransactionArgument;
    toJSON(): Promise<string>;
  }
}

declare module '@mysten/sui/bcs' {
  interface BcsTypeInstance<_T> {
    serialize(value: unknown): { toBytes(): Uint8Array };
  }
  interface BcsRoot {
    u8(): BcsTypeInstance<number>;
    u16(): BcsTypeInstance<number>;
    u32(): BcsTypeInstance<number>;
    u64(): BcsTypeInstance<bigint>;
    u128(): BcsTypeInstance<bigint>;
    u256(): BcsTypeInstance<bigint>;
    bool(): BcsTypeInstance<boolean>;
    string(): BcsTypeInstance<string>;
    bytes(size: number): BcsTypeInstance<Uint8Array>;
    vector<T>(inner: BcsTypeInstance<T>): BcsTypeInstance<T[]>;
    option<T>(inner: BcsTypeInstance<T>): BcsTypeInstance<T | null>;
    tuple<T extends unknown[]>(types: { [K in keyof T]: BcsTypeInstance<T[K]> }): BcsTypeInstance<T>;
  }
  export const bcs: BcsRoot;
}
