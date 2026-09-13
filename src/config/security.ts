/**
 * Institutional Security Configuration
 * Restricts platform access to authorized traders holding the valid Access Key.
 */

export const TRADER_ZONE_ACCESS_KEY = 'Traderszone';

/**
 * Validates the entered access key against the master security key.
 * Trims leading and trailing whitespace; case-sensitive match.
 */
export function validateAccessKey(enteredKey: string): boolean {
  if (!enteredKey) return false;
  return enteredKey.trim() === TRADER_ZONE_ACCESS_KEY;
}
