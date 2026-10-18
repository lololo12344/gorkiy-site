'use client';

import React, { useState } from 'react';
import { X, Clock, CreditCard, Banknote, MapPin, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Order, PaymentMethod } from '@/types/database';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    try {
      // Send order to API / Telegram notification endpoint if available
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      }).catch((err) => {
        console.warn('API notification error (offline mode fallback):', err);
      });
    } catch {}

    // Add order to state
    addOrder(newOrder);
    setIsSubmitting(false);
    onClose();
    setIsCartOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              Оформление заказа
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              <span>{currentLocation.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Contact Details */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Контактные данные
            </label>
            <input
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-sm"
            />
            <input
              type="tel"
              placeholder="Телефон для связи (+7 ...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-sm"
            />
          </div>

          {/* Pickup Time */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Время готовности
            </label>
            <div className="space-y-2">
              {[
                'Как можно скорее (~15-20 мин)',
                'Через 30 минут',
                'Через 45 минут',
                'Через 1 час',
              ].map((timeOption) => (
                <button
                  type="button"
                  key={timeOption}
                  onClick={() => {
                    setPickupTime(timeOption);
                    setCustomTime('');
                  }}
                  className={`w-full p-3 rounded-xl border text-sm flex items-center justify-between transition-all ${
                    pickupTime === timeOption && !customTime
                      ? 'border-[#111111] bg-neutral-50 font-semibold'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    <span>{timeOption}</span>
                  </div>
                  {pickupTime === timeOption && !customTime && (
                    <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method strictly on spot */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Способ оплаты (на месте при получении)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card_terminal')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all ${
                  paymentMethod === 'card_terminal'
                    ? 'border-[#111111] bg-neutral-50 shadow-2xs font-semibold'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <CreditCard className="w-5 h-5 text-neutral-700" />
                <div>
                  <div className="text-sm font-bold text-neutral-900">Картой</div>
                  <div className="text-[11px] text-neutral-500">Через терминал</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-[#111111] bg-neutral-50 shadow-2xs font-semibold'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Banknote className="w-5 h-5 text-neutral-700" />
                <div>
                  <div className="text-sm font-bold text-neutral-900">Наличными</div>
                  <div className="text-[11px] text-neutral-500">При получении</div>
                </div>
              </button>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Комментарий бариста (опционально)
            </label>
            <textarea
              placeholder="Например: без корицы, сахар отдельно..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-sm resize-none"
            />
          </div>

          {/* Order Summary & Submit Button */}
          <div className="pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm text-neutral-600">К оплате:</span>
              <span className="font-extrabold text-2xl text-neutral-900">
                {cartTotal} ₽
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-5 rounded-2xl bg-[#111111] text-white font-bold text-base hover:bg-neutral-800 active:scale-98 transition-all shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Отправляем заказ...' : 'Подтвердить заказ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
