// Logique pure de limitation des tentatives de connexion (testable sans base).
export const THROTTLE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const THROTTLE_MAX_FAILURES = 5;

export interface ThrottleRow {
  failures: number;
  windowStart: Date;
}

function windowActive(row: ThrottleRow, now: Date): boolean {
  return now.getTime() - row.windowStart.getTime() < THROTTLE_WINDOW_MS;
}

export function isLocked(row: ThrottleRow | null, now: Date): boolean {
  return !!row && windowActive(row, now) && row.failures >= THROTTLE_MAX_FAILURES;
}

export function nextAfterFailure(row: ThrottleRow | null, now: Date): ThrottleRow {
  if (!row || !windowActive(row, now)) return { failures: 1, windowStart: now };
  return { failures: row.failures + 1, windowStart: row.windowStart };
}

export function minutesLeft(row: ThrottleRow, now: Date): number {
  const ms = THROTTLE_WINDOW_MS - (now.getTime() - row.windowStart.getTime());
  return Math.max(1, Math.ceil(ms / 60000));
}
