/**
 * src/lib/security/validator.ts
 * Единый модуль безопасности: валидация, экранирование, rate limiting и санитизация
 */

/**
 * 1. Безопасное экранирование спецсимволов для Telegram HTML
 * Предотвращает ошибки 400 Bad Request: can't parse entities и HTML-инъекции
 */
export function escapeTelegramHtml(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 2. Очистка и обрезка строк (санитизация)
 * Удаляет нулевые байты (\0), ломающие PostgreSQL, и обрезает строку до maxLength
 */
export function sanitizeString(val: unknown, maxLength: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const clean = val.replace(/\0/g, '').trim();
  return clean.slice(0, maxLength);
}

/**
 * 3. Валидация формата UUID v4
 */
export function isValidUuid(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * 4. In-Memory Rate Limiter (Token Bucket / Sliding Window)
 * Защищает роуты от DoS и спам-флуда без необходимости поднимать Redis
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();

// Фоновая очистка устаревших IP каждые 5 минут во избежание утечек памяти
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRequestMap.entries()) {
      if (now > record.resetAt) {
        ipRequestMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  if (timer.unref) {
    timer.unref();
  }
}

export function checkRateLimit(
  ip: string,
  limit = 10,
  windowMs = 60 * 1000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = ipRequestMap.get(ip);

  if (!record || now > record.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}

/**
 * 5. Белый список статусов заказа для вебхука
 */
export const ALLOWED_STATUSES = ['accepted', 'ready', 'cancelled'] as const;
export type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export function isAllowedStatus(status: unknown): status is AllowedStatus {
  return typeof status === 'string' && ALLOWED_STATUSES.includes(status as AllowedStatus);
}

/**
 * 6. Белый список способов оплаты
 */
export const ALLOWED_PAYMENT_METHODS = ['cash', 'card_terminal'] as const;
export type AllowedPaymentMethod = (typeof ALLOWED_PAYMENT_METHODS)[number];

export function isAllowedPaymentMethod(method: unknown): method is AllowedPaymentMethod {
  return typeof method === 'string' && ALLOWED_PAYMENT_METHODS.includes(method as AllowedPaymentMethod);
}

/**
 * 7. Безопасное определение Telegram Chat ID
 * КРИТИЧЕСКИ: Chat ID определяется ТОЛЬКО сервером, клиентский chat_id игнорируется!
 */
export function resolveSafeChatId(locationName?: string): string | undefined {
  if (!locationName) return process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (locationName.includes('Арбат')) return process.env.TELEGRAM_CHAT_ID_ARBAT || process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (locationName.includes('Ашуров')) return process.env.TELEGRAM_CHAT_ID_ASHUROVA || process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (locationName.includes('Кулиев')) return process.env.TELEGRAM_CHAT_ID_KULIEVA || process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (locationName.includes('Среда')) return process.env.TELEGRAM_CHAT_ID_SREDA || process.env.TELEGRAM_DEFAULT_CHAT_ID;
  return process.env.TELEGRAM_DEFAULT_CHAT_ID;
}
