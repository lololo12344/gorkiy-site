'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

interface CategoryBarProps {
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryBar({ activeCategory, onSelectCategory }: CategoryBarProps) {
  const { categories } = useApp();

  return (
    <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-100 py-2.5 px-4">
      <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
