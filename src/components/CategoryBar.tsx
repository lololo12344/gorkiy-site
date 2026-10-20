'use client';

import React, { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

interface CategoryBarProps {
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryBar({ activeCategory, onSelectCategory }: CategoryBarProps) {
  const { categories } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Автоматически плавно центрируем активную категорию при изменении activeCategory
  useEffect(() => {
    if (!activeCategory) return;
    const activeBtn = buttonRefs.current[activeCategory];
    const container = scrollContainerRef.current;

    if (activeBtn && container) {
      const btnLeft = activeBtn.offsetLeft;
      const btnWidth = activeBtn.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScrollLeft = btnLeft - containerWidth / 2 + btnWidth / 2;

      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }
  }, [activeCategory]);

  return (
    <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-100 py-2.5 px-3 sm:px-4">
      <div
        ref={scrollContainerRef}
        className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x"
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              ref={(el) => {
                buttonRefs.current[cat.id] = el;
              }}
              onClick={() => onSelectCategory(cat.id)}
              className={`shrink-0 px-3.5 py-1.5 min-[360px]:px-4 min-[360px]:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
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
