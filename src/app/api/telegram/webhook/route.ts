import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check for callback query from inline buttons
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data as string; // format: "status:<orderId>:<newStatus>"
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (data && data.startsWith('status:')) {
        const [, orderId, newStatus] = data.split(':');

        const statusLabelMap: Record<string, string> = {
          accepted: '👨‍🍳 Принят бариста (в процессе)',
          ready: '✅ Готов к выдаче!',
          cancelled: '❌ Отменен',
        };

        const statusText = statusLabelMap[newStatus] || newStatus;

        // 1. Update in Supabase if configured
        try {
          const supabase = await createServerSupabaseClient();
          if (supabase) {
            await supabase
              .from('orders')
              .update({ status: newStatus })
              .eq('id', orderId);
          }
        } catch (e) {
          console.warn('Failed to update DB from webhook:', e);
        }

        // 2. Answer callback query
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cb.id,
              text: `Статус изменен: ${statusText}`,
            }),
          });

          // 3. Edit message to append the updated status
          const originalText = cb.message?.text || '';
          const updatedMessage = `${originalText}\n\n<b>Статус: ${statusText}</b>`;

          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cb.message.chat.id,
              message_id: cb.message.message_id,
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
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
