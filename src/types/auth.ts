export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
  avatar?: string;
}

export interface StoredUserAccount {
  user: User;
  passwordHash: string;
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface CloudSyncState {
  status: SyncStatus;
  lastSynced: string | null;
  error?: string;
  deviceCount?: number;
}
