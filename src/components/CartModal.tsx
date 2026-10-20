'use client';

import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Trash2, MapPin, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CheckoutModal } from '@/components/CheckoutModal';
import { getAssetUrl } from '@/lib/utils/asset';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export function CartModal() {
  const {
    cart,
    cartTotal,
    currentLocation,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    isCartOpen,
    setIsCartOpen,
  } = useApp();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Надежная блокировка фонового скролла при открытой корзине
  useBodyScrollLock(isCartOpen);

  // Закрытие по Escape
  useEffect(() => {
    if (!isCartOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCheckoutOpen) setIsCartOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, isCheckoutOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-modal-title"
        className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-200 touch-none overscroll-contain select-none ${
          isCheckoutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => setIsCartOpen(false)}
      >
        <div
          className="bg-white w-full sm:max-w-lg max-h-[88dvh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300 touch-auto select-text overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 id="cart-modal-title" className="text-xl font-bold text-neutral-900">
                Корзина
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span>{currentLocation.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-neutral-400 hover:text-red-500 font-medium px-2 py-1 transition-colors active:scale-95"
                >
                  Очистить
                </button>
              )}
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors active:scale-95"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart items list */}
          <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-6 divide-y divide-neutral-100 touch-pan-y">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-neutral-400">
                <p className="text-base font-semibold">Ваша корзина пуста</p>
                <p className="text-xs mt-1 text-neutral-500">
                  Выберите вкусный кофе или десерт в меню
                </p>
              </div>
            ) : (
              cart.map((cartItem) => (
                <div
                  key={cartItem.cartItemId}
                  className="py-3 sm:py-4 first:pt-0 last:pb-0 flex items-center gap-3 sm:gap-4"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-100 overflow-hidden shrink-0">
                    {cartItem.item.image_url ? (
                      <img
                        src={getAssetUrl(cartItem.item.image_url)}
                        alt={cartItem.item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">
                        Нет фото
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-neutral-900 truncate">
                      {cartItem.item.name}
                    </h4>

                    {cartItem.selectedOptions.length > 0 && (
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {cartItem.selectedOptions.map((o) => o.name).join(', ')}
                      </p>
                    )}

                    <div className="font-extrabold text-xs min-[360px]:text-sm text-neutral-900 mt-1">
                      {cartItem.totalPrice} ₽
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl p-0.5 min-[360px]:p-1 shrink-0">
                    <button
                      onClick={() => updateCartQuantity(cartItem.cartItemId, -1)}
                      className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors active:scale-95"
                      aria-label="Уменьшить количество"
                    >
                      {cartItem.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="min-w-[1.25rem] text-center text-xs font-bold text-neutral-800 px-0.5 select-none">
                      {cartItem.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(cartItem.cartItemId, 1)}
                      className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors active:scale-95"
                      aria-label="Увеличить количество"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note & action */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-neutral-100 bg-white space-y-3 sm:space-y-4">
              <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600">
                <span className="font-semibold block text-neutral-800 mb-0.5">
                  Оплата только на месте при получении
                </span>
                Наличными или банковской картой через терминал бариста.
              </div>

              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-neutral-600">Итого:</span>
                <span className="font-extrabold text-2xl text-neutral-900">
                  {cartTotal} ₽
                </span>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-4 px-5 rounded-2xl bg-[#111111] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                <span>Оформить заказ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </>
  );
}
