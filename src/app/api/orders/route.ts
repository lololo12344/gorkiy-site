import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
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

    if (sanitizedItems.length === 0 || calculatedTotal <= 0) {
      return NextResponse.json({ error: 'Корзина пуста или содержит некорректную сумму' }, { status: 422 });
    }

    // Первичный ключ генерируется СЕРВЕРОМ, клиенту не доверяем!
    const orderId = crypto.randomUUID();
    const finalTotal = Math.max(0, Number(body.total) || calculatedTotal);

    // 6. Сохранение в Supabase (со статусом 'new', не доверяя статусу от клиента)
    try {
      const supabase = createAdminSupabaseClient() || (await createServerSupabaseClient());
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
            ? ` (${it.options.map((o: { name: string; priceDelta: number }) => escapeTelegramHtml(o.name)).join(', ')})`
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

      // Соблюдение лимита Telegram (не более 4096 символов)
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
