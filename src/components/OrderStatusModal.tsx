'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, Clock, ChefHat, MapPin, Phone } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { OrderStatus } from '@/types/database';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export function OrderStatusModal() {
  const { activeOrder, setActiveOrder } = useApp();

  // Надежная блокировка фонового скролла
  useBodyScrollLock(!!activeOrder);

  // Закрытие по Escape (a11y)
  useEffect(() => {
    if (!activeOrder) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeOrder, setActiveOrder]);

  if (!activeOrder) return null;

  const steps: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
    { key: 'new', label: 'Принят', icon: <Clock className="w-4 h-4" /> },
    { key: 'accepted', label: 'Готовится', icon: <ChefHat className="w-4 h-4" /> },
    { key: 'ready', label: 'Готов к выдаче!', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === activeOrder.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-status-modal-title"
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 touch-none overscroll-contain select-none"
      onClick={() => setActiveOrder(null)}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[90dvh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300 touch-auto select-text overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 id="order-status-modal-title" className="text-xl font-bold text-neutral-900">
              Статус заказа
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              № {activeOrder.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={() => setActiveOrder(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors active:scale-95"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-5 sm:space-y-6 touch-pan-y">
          {/* Status Tracker */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Текущий статус
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#111111] text-white">
                {activeOrder.status === 'new' && 'Ожидает бариста'}
                {activeOrder.status === 'accepted' && 'Бариста готовит'}
                {activeOrder.status === 'ready' && 'Ожидает вас на стойке!'}
              </span>
            </div>

            {/* Stepper bar */}
            <div className="relative flex items-center justify-between pt-2 pb-1">
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-neutral-200 z-0" />
              <div
                className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-[#111111] z-0 transition-all duration-500"
                style={{
                  width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 80}%`,
                }}
              />

              {steps.map((s, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={s.key} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isPassed
                          ? 'bg-[#111111] text-white shadow-sm'
                          : 'bg-white border-2 border-neutral-300 text-neutral-400'
                      } ${isCurrent ? 'ring-4 ring-neutral-200 scale-105' : ''}`}
                    >
                      {s.icon}
                    </div>
                    <span
                      className={`text-[11px] mt-2 font-medium ${
                        isPassed ? 'text-neutral-900 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location info */}
          {activeOrder.location && (
            <div className="p-4 rounded-2xl border border-neutral-100 bg-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" />
                <span>Где забрать заказ</span>
              </div>
              <div className="text-sm font-bold text-neutral-900">
                {activeOrder.location.name}
              </div>
              <div className="text-xs text-neutral-500">
                {activeOrder.location.address}
              </div>
              {activeOrder.location.phone && (
                <a
                  href={`tel:${activeOrder.location.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-800 font-medium pt-1 hover:underline"
                >
                  <Phone className="w-3 h-3 text-neutral-500" />
                  <span>{activeOrder.location.phone}</span>
                </a>
              )}
            </div>
          )}

          {/* Order Details */}
          {activeOrder.items && activeOrder.items.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Состав заказа
              </div>
              <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
                {activeOrder.items.map((it) => (
                  <div key={it.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-neutral-800">
                        {it.quantity} × {it.item_name}
                      </div>
                      {it.options && it.options.length > 0 && (
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {it.options.map((o) => o.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-neutral-900 shrink-0 ml-3">
                      {it.price} ₽
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

            <div className="flex items-center justify-between text-sm font-extrabold text-neutral-900 pt-1">
              <span>Итого:</span>
              <span>{activeOrder.total} ₽</span>
            </div>
          </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-white">
          <button
            onClick={() => setActiveOrder(null)}
            className="w-full py-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-sm transition-colors active:scale-95"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
