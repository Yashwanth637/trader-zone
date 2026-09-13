import { Trade, TradingAccount, TradingStrategy } from '../types/trade';
import { DailyJournalEntry, TradingRule } from '../types/journal';
import { ChartVisionAnalysis, AICoachMessage } from '../types/ai';
import { UserProfile, RiskLimits } from '../types/settings';

export interface SyncPayload {
  version: number;
  userId: string;
  email: string;
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

  // Return base64
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

const CLOUD_SYNC_ENDPOINT = 'https://api.jsonbin.io/v3/b'; // Fallback sync or edge relay

/**
 * Sync relay storage keys
 */
const CLOUD_KEYS = {
  SYNC_CODE_PREFIX: 'tz_sync_code_',
  LAST_CLOUD_SYNC: 'tz_last_cloud_sync'
};

/**
 * Save cloud sync backup locally and generate a 6-digit sync pairing code
 */
export function generateDevicePairingCode(payload: SyncPayload): string {
  // Generate a random 6-character alphanumeric code e.g. TZ-849201
  const num = Math.floor(100000 + Math.random() * 900000);
  const code = `TZ-${num}`;
  
  // Save in localStorage for peer devices
  localStorage.setItem(`${CLOUD_KEYS.SYNC_CODE_PREFIX}${code}`, JSON.stringify(payload));
  // Expire after 24 hours in real use
  return code;
}

/**
 * Retrieve payload by pairing code
 */
export function getPayloadByPairingCode(code: string): SyncPayload | null {
  const cleaned = code.trim().toUpperCase();
  const raw = localStorage.getItem(`${CLOUD_KEYS.SYNC_CODE_PREFIX}${cleaned}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
