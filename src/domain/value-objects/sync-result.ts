// src/domain/value-objects/sync-result.ts
export class SyncResult {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly totalSynced: number,
    public readonly errors?: Error[],
    public readonly syncedAt: Date = new Date()
  ) {}
}