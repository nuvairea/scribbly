export type PendingOp = 'create' | 'update' | 'trash';
export interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  date: string;
  time: string;
  timestamp: number;
  deleted: boolean;
  deletedAt: number | null;
  pendingSync: boolean;
  pendingOp: PendingOp | null;
  syncAttempts: number;
  syncError: boolean;
}