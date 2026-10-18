'use client';

import React, { useState } from 'react';
import { X, Minus, Plus, Trash2, MapPin, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CheckoutModal } from '@/components/CheckoutModal';

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

  if (!isCartOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={() => setIsCartOpen(false)}
      >
        <div
          className="bg-white w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Корзина</h2>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span>{currentLocation.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-neutral-400 hover:text-red-500 font-medium px-2 py-1 transition-colors"
                >
                  Очистить
                </button>
              )}
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart items list */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <p className="font-semibold text-base">Корзина пуста</p>
                <p className="text-xs">Выберите любимый напиток или блюдо в меню</p>
              </div>
            ) : (
              cart.map((cartItem) => (
                <div
                  key={cartItem.cartItemId}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-neutral-100 bg-neutral-50/50"
                >
                  {/* Photo */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
                    {cartItem.item.image_url ? (
                      <img
                        src={cartItem.item.image_url}
                        alt={cartItem.item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                        Кофе
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-neutral-900 truncate">
                      {cartItem.item.name}
                    </h4>

                    {cartItem.selectedOptions.length > 0 && (
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {cartItem.selectedOptions.map((o) => o.name).join(', ')}
                      </p>
                    )}

                    <div className="font-extrabold text-sm text-neutral-900 mt-1">
                      {cartItem.totalPrice} ₽
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => updateCartQuantity(cartItem.cartItemId, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
                      aria-label="Уменьшить количество"
                    >
                      {cartItem.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-neutral-800">
                      {cartItem.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(cartItem.cartItemId, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
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
            <div className="p-5 border-t border-neutral-100 bg-white space-y-4">
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
                className="w-full py-4 px-5 rounded-2xl bg-[#111111] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-98 transition-all shadow-md"
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
