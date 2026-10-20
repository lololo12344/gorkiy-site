'use client';

import React from 'react';
import { UtensilsCrossed, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#f0f0f0] pb-[env(safe-area-inset-bottom,0.25rem)]">
      <div className="grid grid-cols-2 min-h-[3.5rem] py-1.5 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
            activeTab === 'menu' ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-600'
          }`}
          aria-label="Вкладка Меню"
        >
          <UtensilsCrossed className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold tracking-wide">Меню</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
            activeTab === 'profile' ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-600'
          }`}
          aria-label="Вкладка Профиль"
        >
          <User className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold tracking-wide">Профиль</span>
        </button>
      </div>
    </nav>
  );
}
