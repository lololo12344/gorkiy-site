'use client';

import React, { useState, useRef } from 'react';
import { CategoryBar } from '@/components/CategoryBar';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { CartButton } from '@/components/CartButton';
import { CartModal } from '@/components/CartModal';
import { LocationModal } from '@/components/LocationModal';
import { OrderStatusModal } from '@/components/OrderStatusModal';
import { useApp } from '@/context/AppContext';
import { MenuItem } from '@/types/database';

export function MenuView() {
  const { categories, menuItems } = useApp();
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id || '');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const handleSelectCategory = (catId: string) => {
    setActiveCategoryId(catId);
    const element = categoryRefs.current[catId];
    if (element) {
      const yOffset = -120; // account for fixed header + sticky category bar
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="pb-28">
      {/* Sticky horizontal categories */}
      <CategoryBar
        activeCategory={activeCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* Main product catalog list grouped by category */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-10">
        {categories.map((category) => {
          const itemsInCategory = menuItems
            .filter((item) => item.category_id === category.id)
            .sort((a, b) => a.sort_order - b.sort_order);

          if (itemsInCategory.length === 0) return null;

          return (
            <section
              key={category.id}
              ref={(el) => {
                categoryRefs.current[category.id] = el;
              }}
              className="scroll-mt-32"
            >
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                  {category.name}
                </h2>
                <span className="text-xs font-semibold text-neutral-400">
                  {itemsInCategory.length} позиций
                </span>
              </div>

              {/* Responsive grid: 2 cols on mobile, 3 on tablet, 4 on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <CartButton />
      <CartModal />
      <LocationModal />
      <OrderStatusModal />
    </div>
  );
}
