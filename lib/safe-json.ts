/**
 * Safe JSON parser - returns null on error instead of throwing
 */
export function safeJsonParse<T = any>(text: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}
