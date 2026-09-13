import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StoredUserAccount, SyncStatus } from '../types/auth';
import { getActiveUser, setActiveUser, Storage } from '../lib/storage';
import { hashPassword, generateDevicePairingCode, getPayloadByPairingCode, SyncPayload } from '../lib/cloudSync';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  syncStatus: SyncStatus;
  lastSynced: string | null;
  registeredUsers: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  continueAsGuest: () => void;
  switchUser: (userId: string) => void;
  syncCloud: () => Promise<{ success: boolean; pairingCode?: string; error?: string }>;
  linkDeviceWithCode: (code: string) => Promise<{ success: boolean; error?: string }>;
}

const USERS_REGISTRY_KEY = 'tz_users_registry_v1';
const LAST_SYNCED_KEY = 'tz_last_cloud_sync_timestamp';

function getStoredRegistry(): StoredUserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRegistry(accounts: StoredUserAccount[]): void {
  try {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save user registry:', e);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getActiveUser());
  const [isGuest, setIsGuest] = useState<boolean>(() => !getActiveUser());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<string | null>(() => localStorage.getItem(LAST_SYNCED_KEY));
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => 
    getStoredRegistry().map(a => a.user)
  );

  useEffect(() => {
    setActiveUser(user);
    if (user) {
      setIsGuest(false);
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const hashed = await hashPassword(password);
    const registry = getStoredRegistry();
    const found = registry.find(a => a.user.email.toLowerCase() === cleanEmail);

    if (!found) {
      return { success: false, error: 'No account found with this email. Please check spelling or create an account.' };
    }

    if (found.passwordHash !== hashed) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    // Update last login
    const updatedUser: User = {
      ...found.user,
      lastLoginAt: new Date().toISOString()
    };
    found.user = updatedUser;
    saveRegistry(registry);

    // Set active user and load user-specific storage
    setUser(updatedUser);
    setIsGuest(false);
    return { success: true };
  };

  const signup = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const registry = getStoredRegistry();
    const exists = registry.some(a => a.user.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { success: false, error: 'An account with this email already exists. Please log in.' };
    }

    const hashed = await hashPassword(password);
    const displayName = name?.trim() || cleanEmail.split('@')[0] || 'Trader';
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      email: cleanEmail,
      name: displayName,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    const updatedRegistry: StoredUserAccount[] = [
      ...registry,
      { user: newUser, passwordHash: hashed }
    ];
    saveRegistry(updatedRegistry);
    setRegisteredUsers(updatedRegistry.map(a => a.user));

    // Migrate any previous trades to this user so they don't start blank
    Storage.migrateToUser(newUser.id);

    setUser(newUser);
    setIsGuest(false);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setIsGuest(true);
    setActiveUser(null);
  };

  const continueAsGuest = () => {
    setUser(null);
    setIsGuest(true);
    setActiveUser(null);
  };

  const switchUser = (userId: string) => {
    const registry = getStoredRegistry();
    const target = registry.find(a => a.user.id === userId);
    if (target) {
      setUser(target.user);
      setIsGuest(false);
    }
  };

  const syncCloud = async (): Promise<{ success: boolean; pairingCode?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to sync your data.' };
    }

    setSyncStatus('syncing');

    try {
      const payload: SyncPayload = {
        version: 2,
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
        trades: Storage.getTrades(),
        accounts: Storage.getAccounts(),
        activeAccountId: Storage.getActiveAccountId(),
        strategies: Storage.getStrategies(),
        rules: Storage.getRules(),
        journalEntries: Storage.getJournalEntries(),
        chartVision: Storage.getChartVision(),
        coachMessages: Storage.getCoachMessages(),
        profile: Storage.getProfile(),
        riskLimits: Storage.getRiskLimits()
      };

      const code = generateDevicePairingCode(payload);
      const nowIso = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, nowIso);
      setLastSynced(nowIso);
      setSyncStatus('synced');

      return { success: true, pairingCode: code };
    } catch (e: any) {
      setSyncStatus('error');
      return { success: false, error: e.message || 'Cloud sync failed.' };
    }
  };

  const linkDeviceWithCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = getPayloadByPairingCode(code);
      if (!payload) {
        return { success: false, error: 'Invalid or expired sync code. Please check the code and try again.' };
      }

      // Check if user exists or log them in
      const registry = getStoredRegistry();
      let targetUser = registry.find(a => a.user.email.toLowerCase() === payload.email.toLowerCase())?.user;

      if (!targetUser) {
        targetUser = {
          id: payload.userId,
          email: payload.email,
          name: payload.profile?.name || payload.email.split('@')[0],
          createdAt: payload.timestamp,
          lastLoginAt: new Date().toISOString()
        };
        const updated = [...registry, { user: targetUser, passwordHash: 'paired_device' }];
        saveRegistry(updated);
        setRegisteredUsers(updated.map(a => a.user));
      }

      setUser(targetUser);
      setActiveUser(targetUser);

      // Restore payload data
      if (payload.trades) Storage.saveTrades(payload.trades);
      if (payload.accounts) Storage.saveAccounts(payload.accounts);
      if (payload.activeAccountId) Storage.saveActiveAccountId(payload.activeAccountId);
      if (payload.strategies) Storage.saveStrategies(payload.strategies);
      if (payload.rules) Storage.saveRules(payload.rules);
      if (payload.journalEntries) Storage.saveJournalEntries(payload.journalEntries);
      if (payload.chartVision) Storage.saveChartVision(payload.chartVision);
      if (payload.coachMessages) Storage.saveCoachMessages(payload.coachMessages);
      if (payload.profile) Storage.saveProfile(payload.profile);
      if (payload.riskLimits) Storage.saveRiskLimits(payload.riskLimits);

      const nowIso = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, nowIso);
      setLastSynced(nowIso);
      setSyncStatus('synced');

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to restore device sync data.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isGuest,
        syncStatus,
        lastSynced,
        registeredUsers,
        login,
        signup,
        logout,
        continueAsGuest,
        switchUser,
        syncCloud,
        linkDeviceWithCode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
