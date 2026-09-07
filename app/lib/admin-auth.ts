export function getServiceAdminKey(): string {
  return (process.env.ADMIN_KEY || '').trim();
}

/**
 * Constant-time string comparison to avoid key enumeration via response timing.
 * Returns ok:true only when the supplied key matches ADMIN_KEY exactly.
 * Callers should reject the request when ok is false — never forward a bad key.
 */
export function serviceAdmin(overrideKey?: string): { ok: boolean; adminKey: string } {
  const configured = getServiceAdminKey();
  const supplied = (overrideKey || '').trim();
  if (!configured || !supplied) {
    return { ok: false, adminKey: '' };
  }
  // Constant-time compare: accumulate a single difference counter.
  let diff = 0;
  const len = Math.max(supplied.length, configured.length);
  for (let i = 0; i < len; i++) {
    diff |= supplied.charCodeAt(i) ^ configured.charCodeAt(i);
  }
  if (diff !== 0) {
    return { ok: false, adminKey: '' };
  }
  return { ok: true, adminKey: supplied };
}
