export const MAX_LOGIN_FAILURES = 5;
export const LOCKOUT_MINUTES = 15;

export function isAccountLocked(lockedUntil: Date | null | undefined, now = new Date()) {
  return Boolean(lockedUntil && lockedUntil > now);
}

export function failedLoginUpdate(currentFailures: number, now = new Date()) {
  const failedLoginAttempts = currentFailures + 1;
  return {
    failedLoginAttempts,
    lockedUntil:
      failedLoginAttempts >= MAX_LOGIN_FAILURES
        ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000)
        : null,
  };
}
