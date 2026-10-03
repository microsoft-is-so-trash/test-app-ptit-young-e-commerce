/** Số khoá "đã đọc" tối đa giữ trên máy; khoá cũ nhất bị bỏ trước. */
export const READ_KEYS_LIMIT = 100;

export function readStorageKey(userId: string): string {
  return `eco_oil.notifications_read.${userId}`;
}

export function parseReadKeys(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

export function addReadKeys(existing: ReadonlyArray<string>, keys: ReadonlyArray<string>): string[] {
  const merged = [...existing.filter((key) => !keys.includes(key)), ...keys.filter((key, index) => keys.indexOf(key) === index)];
  return merged.slice(-READ_KEYS_LIMIT);
}
