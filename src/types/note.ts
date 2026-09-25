export type PendingOp = 'create' | 'update' | 'delete' | undefined;

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
  pendingSync: PendingOp;
  syncError: boolean;
}