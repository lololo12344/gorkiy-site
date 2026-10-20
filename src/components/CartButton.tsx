'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function CartButton() {
  const { cartCount, cartTotal, setIsCartOpen, activeTab } = useApp();

  if (cartCount === 0 || activeTab !== 'menu') return null;

  return (
    <div className="fixed bottom-18 md:bottom-6 left-0 right-0 z-35 px-4 pointer-events-none flex justify-center">
      <button
        onClick={() => setIsCartOpen(true)}
        className="pointer-events-auto max-w-md w-full bg-[#111111] text-white py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-xl hover:bg-neutral-800 active:scale-98 transition-all animate-in slide-in-from-bottom duration-300"
        aria-label="Открыть корзину"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">
            {cartCount}
          </div>
          <span className="font-bold text-sm sm:text-base">Корзина</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base sm:text-lg">{cartTotal} ₽</span>
          <ShoppingBag className="w-5 h-5 text-white/80" />
        </div>
      </button>
    </div>
  );
}
