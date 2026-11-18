/**
 * The user's own Anthropic API key, kept only in this browser's localStorage.
 * Deliberately NOT stored in IndexedDB so it never ends up in JSON/CSV exports.
 */
const KEY = 'anabolic-anthropic-key';

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setApiKey(value: string) {
  try {
    localStorage.setItem(KEY, value.trim());
  } catch {
    /* storage blocked — the Settings screen reports this */
  }
}

export function clearApiKey() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const looksLikeApiKey = (v: string) => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(v.trim());
