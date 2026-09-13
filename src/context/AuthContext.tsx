import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StoredUserAccount, SyncStatus } from '../types/auth';
import { getActiveUser, setActiveUser, Storage } from '../lib/storage';
import { validateAccessKey } from '../config/security';
import {
  hashPassword,
  saveUserToCloud,
  fetchUserFromCloud,
  SyncPayload
} from '../lib/cloudSync';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  syncStatus: SyncStatus;
  lastSynced: string | null;
  registeredUsers: User[];
  login: (identifier: string, password: string, accessKey: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, accessKey: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (userId: string) => void;
  syncCloud: () => Promise<{ success: boolean; error?: string }>;
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<string | null>(() => localStorage.getItem(LAST_SYNCED_KEY));
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() =>
    getStoredRegistry().map(a => a.user)
  );

  useEffect(() => {
    setActiveUser(user);
  }, [user]);

  const login = async (
    identifier: string,
    password: string,
    accessKey: string
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Validate Access Key first
    if (!validateAccessKey(accessKey)) {
      return {
        success: false,
        error: 'Invalid Access Key. Access is strictly restricted to authorized traders.'
      };
    }

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId || !password) {
      return { success: false, error: 'Username/email and password are required.' };
    }

    const hashed = await hashPassword(password);
    const registry = getStoredRegistry();

    // 2. Check local registry first
    const found = registry.find(
      a => a.user.email.toLowerCase() === cleanId ||
           (a.user.username && a.user.username.toLowerCase() === cleanId)
    );

    if (found) {
      if (found.passwordHash !== hashed) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      const updatedUser: User = {
        ...found.user,
        lastLoginAt: new Date().toISOString()
      };
      found.user = updatedUser;
      saveRegistry(registry);

      setUser(updatedUser);
      return { success: true };
    }

    // 3. If not in local registry (e.g. Logging in from phone for the first time), query Cloud Vault
    setSyncStatus('syncing');
    const cloudRes = await fetchUserFromCloud(cleanId, hashed);
    setSyncStatus('idle');

    if (cloudRes.success && cloudRes.user) {
      const restoredUser: User = {
        ...cloudRes.user,
        lastLoginAt: new Date().toISOString()
      };

      // Save user to this device's registry
      const updatedRegistry: StoredUserAccount[] = [
        ...registry,
        { user: restoredUser, passwordHash: hashed }
      ];
      saveRegistry(updatedRegistry);
      setRegisteredUsers(updatedRegistry.map(a => a.user));

      // Restore payload data onto this device
      if (cloudRes.payload) {
        const p = cloudRes.payload;
        if (p.trades) Storage.saveTrades(p.trades);
        if (p.accounts) Storage.saveAccounts(p.accounts);
        if (p.activeAccountId) Storage.saveActiveAccountId(p.activeAccountId);
        if (p.strategies) Storage.saveStrategies(p.strategies);
        if (p.rules) Storage.saveRules(p.rules);
        if (p.journalEntries) Storage.saveJournalEntries(p.journalEntries);
        if (p.chartVision) Storage.saveChartVision(p.chartVision);
        if (p.coachMessages) Storage.saveCoachMessages(p.coachMessages);
        if (p.profile) Storage.saveProfile(p.profile);
        if (p.riskLimits) Storage.saveRiskLimits(p.riskLimits);
      }

      setUser(restoredUser);
      return { success: true };
    }

    return {
      success: false,
      error: cloudRes.error || 'No account found with this username or email. Please check spelling or create an account.'
    };
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    accessKey: string,
    username?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Validate Access Key
    if (!validateAccessKey(accessKey)) {
      return {
        success: false,
        error: 'Invalid Access Key. Access is strictly restricted to authorized traders.'
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username?.trim().toLowerCase() || cleanEmail.split('@')[0];

    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const registry = getStoredRegistry();
    const exists = registry.some(
      a => a.user.email.toLowerCase() === cleanEmail ||
           (a.user.username && a.user.username.toLowerCase() === cleanUsername)
    );
    if (exists) {
      return { success: false, error: 'An account with this email or username already exists. Please log in.' };
    }

    const hashed = await hashPassword(password);
    const displayName = name?.trim() || cleanUsername || 'Trader';
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      email: cleanEmail,
      username: cleanUsername,
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

    // Migrate existing local trades to this user ID
    Storage.migrateToUser(newUser.id);

    // Prepare initial cloud sync payload
    const initialPayload: SyncPayload = {
      version: 2,
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
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

    // Save user to cloud vault so they can log in from other devices immediately
    saveUserToCloud(newUser, hashed, initialPayload).catch(console.error);

    setUser(newUser);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setActiveUser(null);
  };

  const switchUser = (userId: string) => {
    const registry = getStoredRegistry();
    const target = registry.find(a => a.user.id === userId);
    if (target) {
      setUser(target.user);
    }
  };

  const syncCloud = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to sync your data.' };
    }

    setSyncStatus('syncing');

    try {
      const registry = getStoredRegistry();
      const account = registry.find(a => a.user.id === user.id);
      const passwordHash = account ? account.passwordHash : '';

      const payload: SyncPayload = {
        version: 2,
        userId: user.id,
        email: user.email,
        username: user.username,
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

      await saveUserToCloud(user, passwordHash, payload);
      const nowIso = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, nowIso);
      setLastSynced(nowIso);
      setSyncStatus('synced');

      return { success: true };
    } catch (e: any) {
      setSyncStatus('error');
      return { success: false, error: e.message || 'Cloud sync failed.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        syncStatus,
        lastSynced,
        registeredUsers,
        login,
        signup,
        logout,
        switchUser,
        syncCloud
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
