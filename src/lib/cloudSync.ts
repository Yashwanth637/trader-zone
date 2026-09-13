import { Trade, TradingAccount, TradingStrategy } from '../types/trade';
import { DailyJournalEntry, TradingRule } from '../types/journal';
import { ChartVisionAnalysis, AICoachMessage } from '../types/ai';
import { UserProfile, RiskLimits } from '../types/settings';
import { User } from '../types/auth';

export interface SyncPayload {
  version: number;
  userId: string;
  email: string;
  username?: string;
  timestamp: string;
  trades: Trade[];
  accounts: TradingAccount[];
  activeAccountId: string;
  strategies: TradingStrategy[];
  rules: TradingRule[];
  journalEntries: DailyJournalEntry[];
  chartVision: ChartVisionAnalysis[];
  coachMessages: AICoachMessage[];
  profile: UserProfile;
  riskLimits: RiskLimits;
}

export interface CloudUserRecord {
  user: User;
  passwordHash: string;
  encryptedVault?: string;
  lastUpdated: string;
}

/**
 * SHA-256 password hasher via Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive AES-GCM key from password string
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('trader_zone_salt_v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt journal payload string with AES-GCM
 */
export async function encryptJournalData(jsonStr: string, secretKey: string): Promise<string> {
  const key = await deriveKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(jsonStr)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt journal payload base64 string with AES-GCM
 */
export async function decryptJournalData(base64Str: string, secretKey: string): Promise<string> {
  const key = await deriveKey(secretKey);
  const binaryStr = atob(base64Str);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

// Storage keys
const CLOUD_KEYS = {
  ENDPOINT: 'tz_cloud_sync_endpoint',
  LOCAL_CLOUD_CACHE: 'tz_cloud_user_cache_'
};

/**
 * Get configured cloud database endpoint or null
 */
export function getCloudEndpoint(): string | null {
  return localStorage.getItem(CLOUD_KEYS.ENDPOINT) || null;
}

export function setCloudEndpoint(url: string | null): void {
  if (!url) {
    localStorage.removeItem(CLOUD_KEYS.ENDPOINT);
  } else {
    localStorage.setItem(CLOUD_KEYS.ENDPOINT, url.trim());
  }
}

/**
 * Normalize username or email identifier for key lookup
 */
export function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase().replace(/[^a-z0-9_@.-]/g, '_');
}

/**
 * Synchronize user account and journal state to the cloud vault
 */
export async function saveUserToCloud(
  user: User,
  passwordHash: string,
  payload: SyncPayload
): Promise<{ success: boolean; error?: string }> {
  const key = normalizeIdentifier(user.email);
  const usernameKey = user.username ? normalizeIdentifier(user.username) : null;
  const now = new Date().toISOString();

  const record: CloudUserRecord = {
    user,
    passwordHash,
    encryptedVault: JSON.stringify(payload),
    lastUpdated: now
  };

  // 1. Always save in local persistent cloud cache
  try {
    localStorage.setItem(`${CLOUD_KEYS.LOCAL_CLOUD_CACHE}${key}`, JSON.stringify(record));
    if (usernameKey) {
      localStorage.setItem(`${CLOUD_KEYS.LOCAL_CLOUD_CACHE}${usernameKey}`, JSON.stringify(record));
    }
  } catch (e) {
    console.warn('Local cloud cache write error:', e);
  }

  // 2. Push to remote cloud endpoint if configured
  const endpoint = getCloudEndpoint();
  if (endpoint) {
    try {
      const url = `${endpoint.replace(/\/$/, '')}/accounts/${encodeURIComponent(key)}.json`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (!res.ok) {
        throw new Error(`Cloud server returned ${res.status}`);
      }
    } catch (e: any) {
      console.warn('Cloud sync push warning:', e);
      // Non-fatal if offline
    }
  }

  return { success: true };
}

/**
 * Fetch and authenticate user account from cloud vault
 */
export async function fetchUserFromCloud(
  identifier: string,
  passwordHash: string
): Promise<{ success: boolean; user?: User; payload?: SyncPayload; error?: string }> {
  const key = normalizeIdentifier(identifier);

  // 1. Try remote cloud endpoint if configured
  const endpoint = getCloudEndpoint();
  if (endpoint) {
    try {
      const url = `${endpoint.replace(/\/$/, '')}/accounts/${encodeURIComponent(key)}.json`;
      const res = await fetch(url);
      if (res.ok) {
        const record: CloudUserRecord = await res.json();
        if (record && record.user && record.passwordHash) {
          if (record.passwordHash !== passwordHash) {
            return { success: false, error: 'Incorrect password for this account.' };
          }
          let payload: SyncPayload | undefined = undefined;
          if (record.encryptedVault) {
            try {
              payload = JSON.parse(record.encryptedVault);
            } catch {
              // ignore
            }
          }
          return { success: true, user: record.user, payload };
        }
      }
    } catch (e) {
      console.warn('Remote cloud fetch error, falling back to local registry:', e);
    }
  }

  // 2. Check local device cache
  const cachedRaw = localStorage.getItem(`${CLOUD_KEYS.LOCAL_CLOUD_CACHE}${key}`);
  if (cachedRaw) {
    try {
      const record: CloudUserRecord = JSON.parse(cachedRaw);
      if (record.passwordHash !== passwordHash) {
        return { success: false, error: 'Incorrect password.' };
      }
      let payload: SyncPayload | undefined = undefined;
      if (record.encryptedVault) {
        try {
          payload = JSON.parse(record.encryptedVault);
        } catch {}
      }
      return { success: true, user: record.user, payload };
    } catch {
      // ignore
    }
  }

  return { success: false, error: 'Account not found. Please create an account or verify spelling.' };
}
