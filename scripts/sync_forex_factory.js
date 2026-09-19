/**
 * Synchronizes the Forex Factory Economic Calendar feed from FairEconomy CDN
 * and saves it into public/data/forex_factory_calendar.json
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'forex_factory_calendar.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`[Forex Factory Sync] Fetching calendar feed from ${TARGET_URL}...`);

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  }
};

const req = https.get(TARGET_URL, options, (res) => {
  if (res.statusCode !== 200) {
    console.warn(`[Forex Factory Sync] Warning: Server responded with HTTP ${res.statusCode}`);
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('[Forex Factory Sync] Existing bundled calendar data will be preserved.');
      process.exit(0);
    } else {
      console.error('[Forex Factory Sync] No existing bundled calendar found.');
      process.exit(1);
    }
    return;
  }

  let rawData = '';
  res.on('data', (chunk) => {
    rawData += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        console.log(`[Forex Factory Sync] Successfully synchronized ${parsed.length} events to ${OUTPUT_FILE}`);
      } else {
        console.warn('[Forex Factory Sync] Data was not a non-empty array, preserving existing.');
      }
    } catch (e) {
      console.error('[Forex Factory Sync] Error parsing JSON:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.warn('[Forex Factory Sync] Network request error:', e.message);
  if (fs.existsSync(OUTPUT_FILE)) {
    console.log('[Forex Factory Sync] Preserving existing bundled calendar data.');
    process.exit(0);
  }
});
