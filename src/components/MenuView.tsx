'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { CategoryBar } from '@/components/CategoryBar';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { CartButton } from '@/components/CartButton';
import { CartModal } from '@/components/CartModal';
import { useApp } from '@/context/AppContext';
import { MenuItem } from '@/types/database';

export function MenuView() {
  const { categories, menuItems } = useApp();
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Мемоизированная группировка блюд по категориям для быстродействия O(N)
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      if (!map.has(item.category_id)) {
        map.set(item.category_id, []);
      }
      map.get(item.category_id)!.push(item);
    }
    for (const items of map.values()) {
      items.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [menuItems]);

  // Список категорий, у которых есть блюда
  const populatedCategories = useMemo(() => {
    return categories.filter((cat) => (itemsByCategory.get(cat.id) || []).length > 0);
  }, [categories, itemsByCategory]);

  // Инициализация первой категории
  useEffect(() => {
    if (!activeCategoryId && populatedCategories.length > 0) {
      setActiveCategoryId(populatedCategories[0].id);
    }
  }, [populatedCategories, activeCategoryId]);

  // ScrollSpy: синхронизация активной категории при скролле страницы
  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        if (populatedCategories.length === 0) return;

        const scrollY = window.scrollY || window.pageYOffset;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;

        // В самом верху страницы
        if (scrollY < 60) {
          setActiveCategoryId(populatedCategories[0].id);
          return;
        }

        // В самом низу страницы — последняя категория
        if (scrollY + clientHeight >= scrollHeight - 50) {
          setActiveCategoryId(populatedCategories[populatedCategories.length - 1].id);
          return;
        }

        // Определение видимой категории под шапкой
        const checkOffset = 150;
        let matchedId = '';

        for (const cat of populatedCategories) {
          const el = categoryRefs.current[cat.id];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= checkOffset && rect.bottom > checkOffset) {
            matchedId = cat.id;
            break;
          }
        }

        if (matchedId) {
          setActiveCategoryId(matchedId);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [populatedCategories]);

  // Клик по табу в меню
  const handleSelectCategory = useCallback((catId: string) => {
    setActiveCategoryId(catId);
    isProgrammaticScrollRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const element = categoryRefs.current[catId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Снимаем блокировку после завершения анимации плавного скролла
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 850);
  }, []);

  return (
    <div className="pb-28">
      {/* Sticky horizontal categories bar */}
      <CategoryBar
        activeCategory={activeCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* Main product catalog list grouped by category */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-6 space-y-10">
        {categories.map((category) => {
          const itemsInCategory = itemsByCategory.get(category.id) || [];

          if (itemsInCategory.length === 0) return null;

          return (
            <section
              key={category.id}
              ref={(el) => {
                categoryRefs.current[category.id] = el;
              }}
              className="scroll-mt-36"
            >
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                  {category.name}
                </h2>
                <span className="text-xs font-semibold text-neutral-400">
                  {itemsInCategory.length} позиций
                </span>
              </div>

              {/* Responsive grid: 1 col on <=350px, 2 on mobile, 3 on tablet, 4 on desktop */}
              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {itemsInCategory.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onOpenModal={(it) => setSelectedItem(it)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Modals & Floating Buttons */}
      {selectedItem && (
        <ProductModal
          key={selectedItem.id}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
      <CartButton />
      <CartModal />
    </div>
  );
}
