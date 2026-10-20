import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
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

        // 3. Обновление статуса в базе данных Supabase (с сервисным ключом в обход RLS)
        try {
          const supabase = createAdminSupabaseClient() || (await createServerSupabaseClient());
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
            const cleanText = rawOriginalText.replace(/\n\n(?:<b>)?Статус:[\s\S]*$/, '').trim();

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
