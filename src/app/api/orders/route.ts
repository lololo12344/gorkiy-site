import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Order } from '@/types/database';

export async function POST(req: Request) {
  try {
    const order: Order = await req.json();

    // 1. Try saving to Supabase if configured
    try {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { error: orderError } = await supabase.from('orders').insert({
          id: order.id,
          user_id: order.user_id,
          location_id: order.location_id,
          status: order.status,
          payment_method: order.payment_method,
          total: order.total,
          pickup_time: order.pickup_time,
          comment: order.comment,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
        });

        if (!orderError && order.items && order.items.length > 0) {
          const orderItemsData = order.items.map((it) => ({
            id: it.id,
            order_id: order.id,
            item_id: it.item_id,
            item_name: it.item_name,
            quantity: it.quantity,
            options: it.options,
            price: it.price,
          }));
          await supabase.from('order_items').insert(orderItemsData);
        }
      }
    } catch (dbErr) {
      console.warn('Supabase order insert error (skipped):', dbErr);
    }

    // 2. Telegram notification to barista
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Map location to chat_id from env or order location
    let chatId = order.location?.telegram_chat_id;
    if (!chatId) {
      if (order.location?.name?.includes('Арбат')) {
        chatId = process.env.TELEGRAM_CHAT_ID_ARBAT;
      } else if (order.location?.name?.includes('Ашуров')) {
        chatId = process.env.TELEGRAM_CHAT_ID_ASHUROVA;
      } else if (order.location?.name?.includes('Кулиев')) {
        chatId = process.env.TELEGRAM_CHAT_ID_KULIEVA;
      } else if (order.location?.name?.includes('Среда')) {
        chatId = process.env.TELEGRAM_CHAT_ID_SREDA;
      }
    }

    if (botToken && chatId) {
      const paymentText =
        order.payment_method === 'cash'
          ? '💵 НАЛИЧНЫМИ при получении'
          : '💳 КАРТОЙ НА ТЕРМИНАЛЕ';

      const itemsText = order.items
        ?.map((it) => {
          const opts =
            it.options && it.options.length > 0
              ? ` (${it.options.map((o) => o.name).join(', ')})`
              : '';
          return `• <b>${it.quantity}x</b> ${it.item_name}${opts} — ${it.price} ₽`;
        })
        .join('\n');

      const messageText = `⚡️ <b>НОВЫЙ ЗАКАЗ</b> № <code>${order.id.slice(0, 8).toUpperCase()}</code>

📍 <b>Точка:</b> ${order.location?.name}
👤 <b>Гость:</b> ${order.customer_name} (${order.customer_phone})
⏰ <b>Время:</b> ${order.pickup_time}
💰 <b>Оплата:</b> ${paymentText}
${order.comment ? `💬 <b>Комментарий:</b> ${order.comment}\n` : ''}
<b>Состав:</b>
${itemsText}

<b>Итого: ${order.total} ₽</b>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '👨‍🍳 Принял', callback_data: `status:${order.id}:accepted` },
            { text: '✅ Готов', callback_data: `status:${order.id}:ready` },
            { text: '❌ Отменить', callback_data: `status:${order.id}:cancelled` },
          ],
        ],
      };

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        }),
      });
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error: any) {
    console.error('Order API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
