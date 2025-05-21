// src/application/dto/sync-response-dto.ts
export interface SyncResponseDTO {
  success: boolean;
  message: string;
  timestamp: string;
  totalSynced: number;
  errors?: string[];
}