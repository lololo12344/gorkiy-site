'use client';

import React from 'react';
import Image from 'next/image';
import { MapPin, ChevronDown, UtensilsCrossed, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getAssetUrl } from '@/lib/utils/asset';

export function Header() {
  const {
    activeTab,
    setActiveTab,
    currentLocation,
    setIsLocationModalOpen,
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#f0f0f0]">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo strictly from public/logo.png */}
        <button
          onClick={() => setActiveTab('menu')}
          className="flex items-center hover:opacity-85 transition-opacity focus:outline-none"
          title="ГОРЬКИЙ"
          aria-label="На главную"
        >
          <img
            src={getAssetUrl('/logo.png')}
            alt="ГОРЬКИЙ"
            className="h-7 sm:h-8 md:h-9 w-auto object-contain block"
          />
        </button>

        {/* Location selector pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50/80 hover:bg-neutral-100 text-xs sm:text-sm font-medium text-neutral-800 transition-colors"
            title="Выбрать точку"
          >
            <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[190px]">
              {currentLocation.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </button>

          {/* Desktop Tab Switcher */}
          <nav className="hidden md:flex items-center gap-1 pl-2 border-l border-neutral-200">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'menu'
                  ? 'bg-[#111111] text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Меню</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#111111] text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Профиль</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
