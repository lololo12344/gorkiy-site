'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, CreditCard, Banknote, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Order, PaymentMethod } from '@/types/database';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface CheckoutModalProps {
  onClose: () => void;
}

export function CheckoutModal({ onClose }: CheckoutModalProps) {
  const {
    cart,
    cartTotal,
    currentLocation,
    addOrder,
    profile,
    setIsCartOpen,
  } = useApp();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [pickupTime, setPickupTime] = useState('Как можно скорее (~15-20 мин)');
  const [customTime, setCustomTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_terminal');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Надежная блокировка фонового скролла
  useBodyScrollLock(true);

  // Закрытие по Escape (a11y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isSubmitting]);

  // Очистка / отмена сетевого запроса исключительно при полном размонтировании модалки
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setError('Пожалуйста, укажите ваше имя');
      return;
    }
    if (!phone.trim()) {
      setError('Пожалуйста, укажите ваш номер телефона');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const finalPickupTime = customTime.trim() ? customTime : pickupTime;
    const newOrder: Order = {
      id: crypto.randomUUID(),
      user_id: profile?.id || null,
      location_id: currentLocation.id,
      status: 'new',
      payment_method: paymentMethod,
      total: cartTotal,
      pickup_time: finalPickupTime,
      comment: comment.trim(),
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      created_at: new Date().toISOString(),
      location: currentLocation,
      items: cart.map((ci) => ({
        id: crypto.randomUUID(),
        order_id: '',
        item_id: ci.item.id,
        item_name: ci.item.name,
        quantity: ci.quantity,
        options: ci.selectedOptions,
        price: ci.totalPrice,
      })),
    };

    abortControllerRef.current = new AbortController();

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      // Отправляем на сервер, не блокируя клиент при статическом экспорте или сбое сети
      const response = await fetch(`${basePath}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
        signal: abortControllerRef.current.signal,
      }).catch((fetchErr) => {
        console.warn('Серверная синхронизация недоступна (статика/оффлайн):', fetchErr);
        return null;
      });

      if (response && !response.ok) {
        const errData = await response.json().catch(() => null);
        console.warn('Сервер вернул ошибку при сохранении заказа:', response.status, errData);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.warn('Ошибка отправки заказа на сервер:', err);
    } finally {
      // Заказ гарантированно сохраняется локально, корзина очищается, открывается окно статуса заказа
      addOrder(newOrder);
      setIsCartOpen(false);
      onClose();
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 touch-none overscroll-contain select-none"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[92dvh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300 touch-auto select-text overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 id="checkout-modal-title" className="text-xl font-bold text-neutral-900">
              Оформление заказа
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              <span>{currentLocation.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50 active:scale-95"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto overscroll-contain flex-1 p-5 sm:p-6 space-y-5 touch-pan-y">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Contact details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Контактные данные
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Ваше имя *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к вам обращаться?"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-base sm:text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Телефон *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-base sm:text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Pickup time */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Время готовности
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Как можно скорее (~15-20 мин)', 'Ко времени'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPickupTime(t)}
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors active:scale-95 ${
                    pickupTime === t
                      ? 'border-[#111111] bg-neutral-50 shadow-2xs font-semibold text-neutral-900'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t}</span>
                  </div>
                  {pickupTime === t && <CheckCircle2 className="w-4 h-4 text-neutral-900" />}
                </button>
              ))}
            </div>

            {pickupTime === 'Ко времени' && (
              <div className="pt-1">
                <input
                  type="time"
                  required
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-base sm:text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Способ оплаты при получении
            </h3>
            <div className="space-y-2">
              {[
                {
                  id: 'card_terminal',
                  label: 'Банковской картой',
                  desc: 'Через терминал бариста в кофейне',
                  icon: <CreditCard className="w-4 h-4 text-neutral-700" />,
                },
                {
                  id: 'cash',
                  label: 'Наличными',
                  desc: 'Оплата наличными при получении',
                  icon: <Banknote className="w-4 h-4 text-neutral-700" />,
                },
              ].map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-start justify-between transition-colors active:scale-95 ${
                    paymentMethod === pm.id
                      ? 'border-[#111111] bg-neutral-50 shadow-2xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-neutral-100 rounded-lg shrink-0 mt-0.5">
                      {pm.icon}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-neutral-900">
                        {pm.label}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {pm.desc}
                      </div>
                    </div>
                  </div>
                  {paymentMethod === pm.id && (
                    <CheckCircle2 className="w-4 h-4 text-neutral-900 mt-1 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700">
              Комментарий к заказу (необязательно)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Пожелания по температуре, сахару или упаковке..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-base sm:text-sm focus:outline-none focus:border-neutral-900 transition-colors resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-5 rounded-2xl bg-[#111111] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Отправляем заказ...</span>
                </>
              ) : (
                <span>Подтвердить заказ на {cartTotal} ₽</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
