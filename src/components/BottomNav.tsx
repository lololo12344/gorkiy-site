'use client';

import React from 'react';
import { UtensilsCrossed, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#f0f0f0] safe-bottom pb-1">
      <div className="grid grid-cols-2 h-14 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'menu' ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-600'
          }`}
          aria-label="Вкладка Меню"
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[11px] font-semibold tracking-wide">Меню</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'profile' ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-600'
          }`}
          aria-label="Вкладка Профиль"
        >
          <User className="w-5 h-5" />
          <span className="text-[11px] font-semibold tracking-wide">Профиль</span>
        </button>
      </div>
    </nav>
  );
}
