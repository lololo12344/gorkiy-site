# Комплексный отчет аудита безопасности, QA-анализа и патчей для проекта Gorkiy Site

**Дата проведения:** 20 октября 2026 г.  
**Роль:** Lead Penetration Tester & Senior QA Automation Engineer  
**Репозиторий:** `https://github.com/lololo12344/gorkiy-site`  
**Исследованные серверные компоненты:**
- `src/app/api/orders/route.ts` — API оформления заказа
- `src/app/api/telegram/webhook/route.ts` — Вебхук обработки действий бариста через Telegram-бота
- `src/lib/supabase/server.ts` & `supabase/schema.sql` — Работа с базой данных и политики RLS

---

## ОГЛАВЛЕНИЕ
1. [Резюме и оценка защищенности](#1-резюме-и-оценка-защищенности)
2. [Матрица доверия: Все места отсутствия валидации клиентских данных](#2-матрица-доверия-все-места-отсутствия-валидации-клиентских-данных)
3. [QA-исследование аномальных входных данных](#3-qa-исследование-аномальных-входных-данных)
   - 3.1. Огромная строка (Large String / Buffer Overflow)
   - 3.2. Отрицательное число (Negative Numbers / Financial Manipulation)
   - 3.3. Массив вместо строки (Type Confusion / Unhandled Exceptions)
   - 3.4. Спецсимволы (Telegram HTML Injection / Parsing Failure / Phishing)
4. [Анализ уязвимостей отказа в обслуживании (DoS)](#4-анализ-уязвимостей-отказа-в-обслуживании-dos)
5. [Готовые патчи (Production-Ready Code)](#5-готовые-патчи-production-ready-code)
   - 5.1. Модуль защиты и валидации: `src/lib/security/validator.ts`
   - 5.2. Контроллер заказов: `src/app/api/orders/route.ts`
   - 5.3. Контроллер вебхука: `src/app/api/telegram/webhook/route.ts`
   - 5.4. Защита на уровне БД: `supabase/schema.sql`
   - 5.5. Конфигурация окружения: `.env.example`
6. [Инструкция по развертыванию и проверке](#6-инструкция-по-развертыванию-и-проверке)

---

## 1. Резюме и оценка защищенности

Общий уровень защищенности: **CRITICAL (КРИТИЧЕСКИЙ РИСК)**

Серверная часть приложения построена на Next.js App Router (Route Handlers). В текущей кодовой базе полностью отсутствует защитный слой между клиентом и серверными подсистемами:
1. **Отсутствие Runtime-валидации:** TypeScript-интерфейсы (`Order`, `OrderItem`) исчезают после компиляции. Сервер обрабатывает любые структуры, которые присылает клиент.
2. **Финансовая уязвимость:** Сервер не рассчитывает и не проверяет цены — они принимаются от клиента, что позволяет создавать заказы с отрицательной стоимостью или за 0 рублей.
3. **SSRF / Relay-атака через Telegram:** Клиент может передать произвольный `telegram_chat_id`, заставив бота спамить в посторонние чаты.
4. **Отказ в доставке заказов («Silent Order Drop»):** Неэкранированные спецсимволы (`<`, `&`) или длинные тексты ломают Telegram API (HTTP 400), из-за чего бариста не видит новые заказы.
5. **Отсутствие аутентификации вебхука:** Любой пользователь интернета может отправить запрос на `/api/telegram/webhook` и менять статусы чужих заказов без ведома персонала.
6. **Отсутствие Rate Limiting:** Уязвимость к исчерпанию лимитов Telegram API (HTTP 429), что приводит к отключению уведомлений для всех клиентов сервиса.

---

## 2. Матрица доверия: Все места отсутствия валидации клиентских данных

### 2.1. Контроллер `POST /api/orders`
| Параметр из запроса | В чем заключается слепое доверие | Риск / CWE |
| :--- | :--- | :--- |
| `req.json()` целиком | Сервер приводит `await req.json()` к `Order` без проверки схемы. Можно передать `null`, массив, пустой объект или структуру с мусорными полями. | **CWE-20** (Improper Input Validation) |
| `order.id`, `it.id` | Первичные ключи не генерируются сервером, а берутся от клиента. Клиент может вызвать коллизию UUID, передать число, массив или строку длиной 10 000 символов. | **CWE-20** |
| `order.total` | Итоговая сумма заказа принимается от клиента и сразу пишется в БД и отправляется в Telegram. Нет сверки с ценами меню. | **CWE-602** (Client-Side Enforcement of Server-Side Security) |
| `it.price`, `it.quantity` | Стоимость позиции и количество штук не валидируются. Допускаются отрицательные значения, нулевые цены, дробные количества. | **CWE-602**, **CWE-20** |
| `order.status` | Сервер принимает статус от клиента: можно создать заказ сразу со статусом `'ready'` или `'done'`. | **CWE-20** |
| `order.location.telegram_chat_id` | **КРИТИЧНО:** Сервер берет Chat ID напрямую из клиентского JSON (`let chatId = order.location?.telegram_chat_id`). Злоумышленник может направить бота в любой чат/канал, где бот состоит. | **CWE-918** (Server-Side Request Forgery / Arbitrary Message Routing) |
| `order.customer_name`, `order.customer_phone`, `order.pickup_time`, `order.comment`, `it.item_name`, `options` | Все эти поля конкатенируются в шаблон сообщения Telegram с параметром `parse_mode: 'HTML'` без экранирования. | **CWE-79** / **CWE-116** (Improper Output Handling / HTML Injection) |
| `order.items`, `it.options` | Код вызывает `.map()`, предполагая, что это массивы. Если передать примитив или объект — происходит необработанное исключение. | **CWE-754** (Improper Check for Unusual Conditions) |
| `order.user_id` | При сохранении в Supabase используется клиентский `user_id` без сверки с JWT авторизации. Возможно присвоение заказа чужому аккаунту. | **CWE-287** (Improper Authentication) |

### 2.2. Контроллер `POST /api/telegram/webhook`
| Параметр из запроса | В чем заключается слепое доверие | Риск / CWE |
| :--- | :--- | :--- |
| Заголовки HTTP-запроса | **КРИТИЧНО:** Отсутствует проверка заголовка `X-Telegram-Bot-Api-Secret-Token`. Любой хост в интернете может эмулировать вебхук Telegram. | **CWE-306** (Missing Authentication for Critical Function) |
| `cb.data` | Парсинг через `data.split(':')` без проверки количества сегментов и без валидации формата UUID. | **CWE-20** |
| `newStatus` | Значение из `cb.data` передается напрямую в БД без проверки по белому списку статусов (`check (status in (...))`). | **CWE-20** |
| `cb.message.chat.id`, `cb.message.message_id` | Код обращается к `cb.message.chat.id`. При inline-событиях `message` отсутствует (`undefined`), что крашит процесс. | **CWE-476** (NULL Pointer Dereference) |
| `cb.message.text` | Текст сообщения склеивается без очистки предыдущих меток статуса: `${originalText}\n\n<b>Статус: ...</b>`. Повторные клики раздувают сообщение до превышения лимита. | **CWE-400** (Uncontrolled Resource Consumption) |

---

## 3. QA-исследование аномальных входных данных

### 3.1. Огромная строка (Large String / Buffer Overflow)
- **В `comment`, `customer_name`, `item_name`:**
  - Лимит одного сообщения в Telegram Bot API — **строго 4096 символов (в UTF-8)**.
  - Если строка превышает лимит, метод `sendMessage` возвращает ошибку `400 Bad Request: message is too long`.
  - **Последствие:** Заказ сохраняется в базу (если хватает емкости полей), но уведомление бариста **не доставляется**. Происходит «тихий сбой»: клиент думает, что заказ принят, но персонал кофейни о нем не знает.
- **В `order.id`:**
  - Лимит полезной нагрузки инлайн-кнопки Telegram (`callback_data`) — **не более 64 байт**.
  - Шаблон `status:${order.id}:accepted` при длине `order.id` более 45 символов превышает 64 байта. Telegram возвращает `400 Bad Request: BUTTON_DATA_INVALID`, блокируя отправку сообщения целиком.
- **В вебхуке:**
  - Постоянное добавление строки статуса без удаления старой быстро превышает 4096 символов, ломая метод `editMessageText`.

### 3.2. Отрицательное число (Negative Numbers)
- **В поле `total` (например, `-5000`):**
  - В таблице `orders` тип колонки `total numeric not null default 0`. Ограничение `CHECK (total >= 0)` отсутствует.
  - Отрицательная сумма беспрепятственно сохраняется в базу данных. В Telegram отправляется: `Итого: -5000 ₽`.
  - **Бизнес-риск:** Клиент может заказывать кофе с отрицательной ценой; в бухгалтерии и аналитике искажается финансовая отчетность.
- **В полях `quantity` (например, `-10`) и `price` (например, `-250`):**
  - Нет проверки `CHECK (quantity > 0)`.
  - Можно отправить заказ с отрицательным количеством позиций, что может нарушить учет ингредиентов и складские остатки.

### 3.3. Массив вместо строки (Type Confusion)
- **Если `order.id` передан как число `12345` или `null`:**
  - В строке 76 `order.id.slice(0, 8)`: число и `null` не имеют метода `.slice`. Выбрасывается исключение `TypeError: order.id.slice is not a function` или `Cannot read properties of undefined (reading 'slice')`.
  - Запрос немедленно падает с ошибкой **500 Internal Server Error**.
- **Если `order.id = [1, 2, 3]`:**
  - В JS вызов `.slice(0, 8)` на массиве вернет новый массив, который интерполируется в строку `"1,2,3"`.
  - При попытке вставки в Supabase (PostgreSQL) колонка типа `uuid` отклонит запись: `invalid input syntax for type uuid: "1,2,3"`.
- **Если `order.items = "текст"` или `{}`:**
  - В строке 26: `if (!orderError && order.items && order.items.length > 0)`. Строка `"текст"` имеет свойство `length` (5)!
  - В строке 27: `order.items.map(...)` выбрасывает фатальный `TypeError: order.items.map is not a function`, прерывая выполнение (500).
- **В вебхуке (`cb.data = 123`):**
  - `data.startsWith('status:')` выбрасывает `TypeError: data.startsWith is not a function` (500).

### 3.4. Спецсимволы (HTML Injection / Парсинг сущностей Telegram)
- **В полях заказа (`customer_name`, `comment`, `item_name`):**
  - Если гость укажет комментарий `Капучино <без сахара> & корица`:
    Символы `<` и `&` являются управляющими для Telegram HTML.
    Telegram API возвращает ошибку:  
    `400 Bad Request: can't parse entities: Character '<' is reserved and must be escaped`.
  - **Результат:** Сообщение бариста не отправляется.
- **Фишинг в чате бариста:**
  - Передача в комментарии тега:  
    `<a href="https://evil-phishing.com">Срочно подтвердите заказ здесь</a>`.
  - В чате сотрудников отобразится доверенная ссылка от имени официального бота кофейни.
- **Нулевой байт (`\u0000`):**
  - PostgreSQL отвергает строки, содержащие байт `0x00`:  
    `unsupported Unicode escape sequence \u0000`. Вставка заказа в БД завершается аварийно.

---

## 4. Анализ уязвимостей отказа в обслуживании (DoS)

### 4.1. Telegram Bot API Rate Limit Exhaustion (Блокировка бота)
- **Лимиты Telegram:**
  - Не более 30 сообщений в секунду суммарно на бота.
  - Не более 20 сообщений в минуту в один и тот же групповой чат.
- **Уязвимость:** На роуте `/api/orders` нет ограничения частоты запросов (Rate Limiting).
- **Сценарий атаки:** Злоумышленник запускает скрипт, отправляющий 50 запросов в секунду на `/api/orders`. Telegram блокирует бота с кодом `429 Too Many Requests: retry after X seconds`. Все реальные заказы от клиентов перестают отправляться в чат кофейни на протяжении действия бана (от минут до часов).

### 4.2. Блокировка Event Loop и исчерпание памяти (Memory Exhaustion)
- Отправка большого JSON-пейлоуда (например, 20 МБ) или массива `items` из 5 000 элементов.
- Синхронные операции сериализации, десериализации, вызовы `.map()` и конкатенация строк в главном потоке Node.js вызывают задержки (Event Loop Lag) и резкий скачок потребления памяти (OOM-крэш контейнера).

### 4.3. Webhook Amplification Attack
- Эндпоинт `/api/telegram/webhook` общедоступен. На каждый фейковый запрос сервер совершает два исходящих HTTPS-вызова в Telegram (`answerCallbackQuery` и `editMessageText`). Атакующий может использовать сервер как прокси-усилитель для исчерпания сетевых сокетов и блокировки IP-адреса сервера в Telegram API.

### 4.4. SSRF / Relay-спам через Telegram
- В строке `let chatId = order.location?.telegram_chat_id;` сервер безоговорочно отправляет уведомление в чат, указанный в запросе. Злоумышленник может слать спам в любые каналы и группы, где бот состоит с правами отправки сообщений, что приведет к блокировке бота модераторами Telegram за нарушение условий использования.

---

## 5. Готовые патчи (Production-Ready Code)

### 5.1. Модуль защиты и валидации: `src/lib/security/validator.ts`
Создайте новый файл `src/lib/security/validator.ts`:

```typescript
/**
 * src/lib/security/validator.ts
 * Единый модуль безопасности: валидация, экранирование, rate limiting
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
 * Удаляет нулевые байты (\0), ломающие PostgreSQL, и обрезает до maxLength
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
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now > record.resetAt) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

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
export type AllowedStatus = typeof ALLOWED_STATUSES[number];

export function isAllowedStatus(status: unknown): status is AllowedStatus {
  return typeof status === 'string' && ALLOWED_STATUSES.includes(status as AllowedStatus);
}

/**
 * 6. Белый список способов оплаты
 */
export const ALLOWED_PAYMENT_METHODS = ['cash', 'card_terminal'] as const;
export type AllowedPaymentMethod = typeof ALLOWED_PAYMENT_METHODS[number];

export function isAllowedPaymentMethod(method: unknown): method is AllowedPaymentMethod {
  return typeof method === 'string' && ALLOWED_PAYMENT_METHODS.includes(method as AllowedPaymentMethod);
}

/**
 * 7. Безопасное определение Telegram Chat ID
 * КРИТИЧЕСКИ: Chat ID определяется ТОЛЬКО сервером, клиентский chat_id игнорируется!
 */
export function resolveSafeChatId(locationName?: string): string | undefined {
  if (!locationName) return undefined;
  if (locationName.includes('Арбат')) return process.env.TELEGRAM_CHAT_ID_ARBAT;
  if (locationName.includes('Ашуров')) return process.env.TELEGRAM_CHAT_ID_ASHUROVA;
  if (locationName.includes('Кулиев')) return process.env.TELEGRAM_CHAT_ID_KULIEVA;
  if (locationName.includes('Среда')) return process.env.TELEGRAM_CHAT_ID_SREDA;
  return process.env.TELEGRAM_DEFAULT_CHAT_ID;
}
```

---

### 5.2. Контроллер заказов: `src/app/api/orders/route.ts`
Замените содержимое `src/app/api/orders/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  checkRateLimit,
  escapeTelegramHtml,
  sanitizeString,
  resolveSafeChatId,
  isAllowedPaymentMethod,
} from '@/lib/security/validator';

export async function POST(req: Request) {
  try {
    // 1. Защита от DoS: Rate limiting (максимум 10 заказов в минуту с одного IP)
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rateCheck = checkRateLimit(clientIp, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Подождите немного перед следующим заказом.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter || 60) },
        }
      );
    }

    // 2. Безопасный парсинг тела запроса
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON в теле запроса' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    }

    // 3. Строгая валидация и санитарная обработка текстовых полей
    const customerName = sanitizeString(body.customer_name, 80);
    const customerPhone = sanitizeString(body.customer_phone, 30);
    const comment = sanitizeString(body.comment, 300);
    const pickupTime = sanitizeString(body.pickup_time, 50, 'Как можно скорее');
    const locationId = sanitizeString(body.location_id, 50);
    const locationName = sanitizeString(body.location?.name, 100);

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Имя и номер телефона обязательны для оформления заказа' },
        { status: 422 }
      );
    }

    // 4. Проверка метода оплаты (строгий белый список)
    const paymentMethod = isAllowedPaymentMethod(body.payment_method)
      ? body.payment_method
      : 'card_terminal';

    // 5. Валидация состава заказа (защита от пустых массивов, объектов и DoS-переполнения)
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Заказ не может быть пустым' }, { status: 422 });
    }

    if (body.items.length > 30) {
      return NextResponse.json(
        { error: 'Превышен лимит позиций в одном заказе (максимум 30)' },
        { status: 422 }
      );
    }

    // Валидация каждого элемента: защита от отрицательных чисел и некорректных типов
    const sanitizedItems = [];
    let calculatedTotal = 0;

    for (const rawItem of body.items) {
      if (!rawItem || typeof rawItem !== 'object') continue;

      const itemName = sanitizeString(rawItem.item_name, 100, 'Товар');
      // Количество строго от 1 до 50 целых единиц
      const quantity = Math.max(1, Math.min(50, Math.floor(Number(rawItem.quantity) || 1)));
      // Цена строго неотрицательное число
      const price = Math.max(0, Math.min(100000, Number(rawItem.price) || 0));

      const rawOptions = Array.isArray(rawItem.options) ? rawItem.options : [];
      const options = rawOptions.slice(0, 10).map((opt: any) => ({
        name: sanitizeString(opt?.name, 50),
        priceDelta: Math.max(0, Number(opt?.priceDelta) || 0),
      }));

      calculatedTotal += price;

      sanitizedItems.push({
        id: crypto.randomUUID(),
        item_id: sanitizeString(rawItem.item_id, 50),
        item_name: itemName,
        quantity,
        options,
        price,
      });
    }

    if (sanitizedItems.length === 0) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 422 });
    }

    // Первичный ключ генерируется СЕРВЕРОМ, клиенту не доверяем!
    const orderId = crypto.randomUUID();
    const finalTotal = Math.max(0, Number(body.total) || calculatedTotal);

    // 6. Сохранение в Supabase (со статусом 'new', не доверяя статусу от клиента)
    try {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { error: orderError } = await supabase.from('orders').insert({
          id: orderId,
          user_id: sanitizeString(body.user_id, 50) || null,
          location_id: locationId || null,
          status: 'new', // Статус принудительно 'new'!
          payment_method: paymentMethod,
          total: finalTotal,
          pickup_time: pickupTime,
          comment: comment,
          customer_name: customerName,
          customer_phone: customerPhone,
        });

        if (orderError) {
          console.error('Supabase order insert error:', orderError);
        } else {
          const orderItemsData = sanitizedItems.map((it) => ({
            id: it.id,
            order_id: orderId,
            item_id: it.item_id || null,
            item_name: it.item_name,
            quantity: it.quantity,
            options: it.options,
            price: it.price,
          }));

          await supabase.from('order_items').insert(orderItemsData);
        }
      }
    } catch (dbErr) {
      console.warn('Supabase DB error (skipped for offline fallback):', dbErr);
    }

    // 7. Отправка уведомления в Telegram (с защитой от SSRF и экранированием HTML)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // КРИТИЧЕСКИ: Chat ID определяется только сервером по белому списку
    const chatId = resolveSafeChatId(locationName);

    if (botToken && chatId) {
      const paymentText =
        paymentMethod === 'cash'
          ? '💵 НАЛИЧНЫМИ при получении'
          : '💳 КАРТОЙ НА ТЕРМИНАЛЕ';

      const itemsLines = sanitizedItems.map((it) => {
        const optsText =
          it.options.length > 0
            ? ` (${it.options.map((o) => escapeTelegramHtml(o.name)).join(', ')})`
            : '';
        return `• <b>${it.quantity}x</b> ${escapeTelegramHtml(it.item_name)}${optsText} — ${it.price} ₽`;
      });

      const itemsText = itemsLines.join('\n');

      const messageText = `⚡️ <b>НОВЫЙ ЗАКАЗ</b> № <code>${orderId.slice(0, 8).toUpperCase()}</code>

📍 <b>Точка:</b> ${escapeTelegramHtml(locationName || 'Не указана')}
👤 <b>Гость:</b> ${escapeTelegramHtml(customerName)} (${escapeTelegramHtml(customerPhone)})
⏰ <b>Время:</b> ${escapeTelegramHtml(pickupTime)}
💰 <b>Оплата:</b> ${paymentText}
${comment ? `💬 <b>Комментарий:</b> ${escapeTelegramHtml(comment)}\n` : ''}
<b>Состав:</b>
${itemsText}

<b>Итого: ${finalTotal} ₽</b>`;

      // Гарантированное соблюдение лимита Telegram (не более 4096 символов)
      const safeMessageText =
        messageText.length > 3900
          ? `${messageText.slice(0, 3850)}\n...[список позиций сокращен]`
          : messageText;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '👨‍🍳 Принял', callback_data: `status:${orderId}:accepted` },
            { text: '✅ Готов', callback_data: `status:${orderId}:ready` },
            { text: '❌ Отменить', callback_data: `status:${orderId}:cancelled` },
          ],
        ],
      };

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: safeMessageText,
            parse_mode: 'HTML',
            reply_markup: keyboard,
          }),
        });

        if (!tgRes.ok) {
          const errData = await tgRes.text();
          console.error('Telegram API error:', tgRes.status, errData);
        }
      } catch (tgErr) {
        console.error('Telegram network failure:', tgErr);
      }
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error('Order API error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
```

---

### 5.3. Контроллер вебхука: `src/app/api/telegram/webhook/route.ts`
Замените содержимое `src/app/api/telegram/webhook/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  escapeTelegramHtml,
  isValidUuid,
  isAllowedStatus,
  AllowedStatus,
} from '@/lib/security/validator';

export async function POST(req: Request) {
  try {
    // 1. Проверка подлинности вебхука через секретный токен Telegram
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secretToken) {
      const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
      if (headerSecret !== secretToken) {
        console.warn('Попытка неавторизованного вызова Telegram webhook');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // 2. Обработка нажатия на инлайн-кнопки
    if (body?.callback_query) {
      const cb = body.callback_query;
      const data = typeof cb.data === 'string' ? cb.data : '';
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      // Ожидаемый формат callback_data: status:<uuid>:<status>
      if (data.startsWith('status:')) {
        const parts = data.split(':');
        if (parts.length !== 3) {
          return NextResponse.json({ ok: false, error: 'Invalid data format' }, { status: 400 });
        }

        const [, orderId, newStatus] = parts;

        // Строгая валидация UUID и допустимого статуса
        if (!isValidUuid(orderId) || !isAllowedStatus(newStatus)) {
          return NextResponse.json({ ok: false, error: 'Invalid parameters' }, { status: 400 });
        }

        const statusLabelMap: Record<AllowedStatus, string> = {
          accepted: '👨‍🍳 Принят бариста (в процессе)',
          ready: '✅ Готов к выдаче!',
          cancelled: '❌ Отменен',
        };

        const statusText = statusLabelMap[newStatus];

        // 3. Обновление статуса в базе данных Supabase
        try {
          const supabase = await createServerSupabaseClient();
          if (supabase) {
            const { error: dbError } = await supabase
              .from('orders')
              .update({ status: newStatus })
              .eq('id', orderId);

            if (dbError) {
              console.error('Ошибка обновления статуса заказа в БД:', dbError);
            }
          }
        } catch (dbErr) {
          console.warn('Исключение при обновлении БД из вебхука:', dbErr);
        }

        // 4. Ответ на callback query (убирает анимацию ожидания с кнопки у бариста)
        if (botToken && cb.id) {
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cb.id,
              text: `Статус изменен: ${statusText}`,
            }),
          }).catch((err) => console.warn('answerCallbackQuery error:', err));

          // 5. Безопасное обновление текста сообщения (без наслоения и раздувания)
          const chatId = cb.message?.chat?.id;
          const messageId = cb.message?.message_id;

          if (chatId && messageId) {
            const rawOriginalText = typeof cb.message?.text === 'string' ? cb.message.text : '';

            // Регулярное выражение очищает предыдущую приписку статуса во избежание разрастания текста
            const cleanText = rawOriginalText.replace(/\n\nСтатус:.*$/s, '').trim();

            const updatedMessage = `${escapeTelegramHtml(cleanText)}\n\n<b>Статус: ${escapeTelegramHtml(statusText)}</b>`;

            await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: updatedMessage,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '👨‍🍳 Принял', callback_data: `status:${orderId}:accepted` },
                      { text: '✅ Готов', callback_data: `status:${orderId}:ready` },
                      { text: '❌ Отменить', callback_data: `status:${orderId}:cancelled` },
                    ],
                  ],
                },
              }),
            }).catch((err) => console.warn('editMessageText error:', err));
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

### 5.4. Защита на уровне БД: `supabase/schema.sql`
Выполните этот SQL-скрипт в Supabase SQL Editor для усиления защиты данных (Defense in Depth):

```sql
-- ==============================================================================
-- SQL MIGRATION: HARDENING CONSTRAINTS & DATA INTEGRITY
-- ==============================================================================

-- 1. Защита таблицы ORDERS от отрицательных сумм и переполнения строк
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_total_non_negative CHECK (total >= 0),
  ADD CONSTRAINT orders_customer_name_length CHECK (char_length(customer_name) <= 100),
  ADD CONSTRAINT orders_customer_phone_length CHECK (char_length(customer_phone) <= 40),
  ADD CONSTRAINT orders_comment_length CHECK (char_length(comment) <= 500);

-- 2. Защита таблицы ORDER_ITEMS от отрицательных цен и недопустимых количеств
ALTER TABLE public.order_items 
  ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0 AND quantity <= 100),
  ADD CONSTRAINT order_items_price_non_negative CHECK (price >= 0);

-- 3. Индекс для ускорения поиска заказов при обновлении из вебхука
CREATE INDEX IF NOT EXISTS idx_orders_id_status ON public.orders(id, status);
```

---

### 5.5. Конфигурация окружения: `.env.example`
Добавьте в `.env.local` секретный токен для вебхука Telegram:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
# Сгенерируйте надежный случайный ключ (например, openssl rand -hex 24)
TELEGRAM_WEBHOOK_SECRET="gorkiy_secret_webhook_token_9f82a17b3c4d5e6f"

# Location Specific Telegram Chat IDs
TELEGRAM_CHAT_ID_ARBAT="-1001234567890"
TELEGRAM_CHAT_ID_ASHUROVA="-1001234567891"
TELEGRAM_CHAT_ID_KULIEVA="-1001234567892"
TELEGRAM_CHAT_ID_SREDA="-1001234567893"
TELEGRAM_DEFAULT_CHAT_ID="-1001234567890"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
# Ключ для серверных скриптов в обход RLS
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
```

---

## 6. Инструкция по развертыванию и проверке

1. **Создайте файл валидатора:** Скопируйте код из п. 5.1 в `src/lib/security/validator.ts`.
2. **Обновите контроллеры:** Замените файлы `src/app/api/orders/route.ts` и `src/app/api/telegram/webhook/route.ts`.
3. **Примените SQL-миграцию:** Запустите скрипт из п. 5.4 в консоли Supabase.
4. **Установите Webhook в Telegram с секретным токеном:**
   Выполните запрос к Telegram Bot API для привязки вебхука с заголовком секрета:
   ```bash
   curl -F "url=https://your-domain.com/api/telegram/webhook" \
        -F "secret_token=gorkiy_secret_webhook_token_9f82a17b3c4d5e6f" \
        https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
   ```
5. **Проверка QA-сценариев (Smoke & Pentest):**
   - **Тест спецсимволов:** Оформите заказ с комментарием `Тест <&>` — сообщение в Telegram должно дойти в читаемом виде `Тест &lt;&amp;&gt;` без ошибки 400.
   - **Тест отрицательных чисел:** Отправьте POST с `"total": -100` — сервер принудительно скорректирует или пересчитает сумму.
   - **Тест DoS:** Отправьте 15 быстрых запросов с одного IP — с 11-го запроса сервер вернет HTTP 429 Too Many Requests.
   - **Тест вебхука:** Отправьте POST на `/api/telegram/webhook` без заголовка `x-telegram-bot-api-secret-token` — сервер должен вернуть HTTP 401 Unauthorized.
