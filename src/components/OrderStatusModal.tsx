'use client';

import React from 'react';
import { X, CheckCircle, Clock, ChefHat, MapPin, Phone, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { OrderStatus } from '@/types/database';

export function OrderStatusModal() {
  const { activeOrder, setActiveOrder, updateOrderStatus } = useApp();

  if (!activeOrder) return null;

  const steps: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
    { key: 'new', label: 'Принят', icon: <Clock className="w-4 h-4" /> },
    { key: 'accepted', label: 'Готовится', icon: <ChefHat className="w-4 h-4" /> },
    { key: 'ready', label: 'Готов к выдаче!', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === activeOrder.status);

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => setActiveOrder(null)}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              Статус заказа
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              № {activeOrder.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={() => setActiveOrder(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
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
                {activeOrder.status === 'done' && 'Выдан'}
                {activeOrder.status === 'cancelled' && 'Отменен'}
              </span>
            </div>

            {/* Stepper bar */}
            <div className="grid grid-cols-3 gap-2 relative">
              {steps.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 transition-all ${
                        isCurrent
                          ? 'bg-[#111111] text-white ring-4 ring-neutral-200'
                          : isPassed
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-200 text-neutral-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <span
                      className={`text-[11px] leading-tight ${
                        isPassed ? 'font-bold text-neutral-900' : 'text-neutral-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location Info */}
          <div className="p-4 rounded-2xl border border-neutral-100 bg-white space-y-2">
            <div className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-neutral-500" />
              <span>{activeOrder.location?.name || 'Горький'}</span>
            </div>
            <p className="text-xs text-neutral-600 pl-5">
              {activeOrder.location?.address}
            </p>
            {activeOrder.location?.phone && (
              <a
                href={`tel:${activeOrder.location.phone}`}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-800 font-semibold pl-5 pt-1 hover:underline"
              >
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span>{activeOrder.location.phone}</span>
              </a>
            )}
          </div>

          {/* Order Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Состав заказа
            </h4>
            <div className="divide-y divide-neutral-100">
              {activeOrder.items?.map((it, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-neutral-800">
                      {it.quantity}x {it.item_name}
                    </span>
                    {it.options && it.options.length > 0 && (
                      <p className="text-xs text-neutral-500">
                        {it.options.map((o) => o.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-neutral-900">{it.price} ₽</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between font-bold text-base">
              <span>Сумма:</span>
              <span className="text-xl">{activeOrder.total} ₽</span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600">
              Способ оплаты:{' '}
              <span className="font-bold text-neutral-900">
                {activeOrder.payment_method === 'cash'
                  ? 'Наличными при получении'
                  : 'Банковской картой на терминале'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-white">
          <button
            onClick={() => setActiveOrder(null)}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#111111] text-white font-bold text-sm hover:bg-neutral-800 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
