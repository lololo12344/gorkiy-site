'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { MenuItem } from '@/types/database';
import { useApp } from '@/context/AppContext';

interface ProductCardProps {
  item: MenuItem;
  onOpenModal: (item: MenuItem) => void;
}

export function ProductCard({ item, onOpenModal }: ProductCardProps) {
  const { currentLocation, locationItemSettings } = useApp();

  // Check if item is available at current location
  const setting = locationItemSettings.find(
    (s) => s.location_id === currentLocation.id && s.item_id === item.id
  );
  const isAvailable = setting ? setting.is_available : item.is_active;
  const effectivePrice = setting?.price_override ?? item.base_price;

  return (
    <div
      onClick={() => isAvailable && onOpenModal(item)}
      className={`group bg-white rounded-2xl border border-neutral-100 p-3 flex flex-col justify-between transition-all duration-200 ${
        isAvailable
          ? 'hover:border-neutral-300 hover:shadow-xs cursor-pointer'
          : 'opacity-50 cursor-not-allowed'
      }`}
    >
      <div>
        {/* Photo */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 mb-3">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">
              Нет фото
            </div>
          )}
          {!isAvailable && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center p-2 text-center">
              <span className="text-xs font-semibold text-neutral-800 bg-white px-2 py-1 rounded-md shadow-xs">
                Стоп-лист
              </span>
            </div>
          )}
        </div>

        {/* Title and description */}
        <h3 className="font-bold text-sm sm:text-base text-neutral-900 leading-snug line-clamp-2 mb-1">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-3">
            {item.description}
          </p>
        )}
      </div>

      {/* Price and Add button */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-neutral-50">
        <div>
          <span className="font-extrabold text-base sm:text-lg text-neutral-900">
            {effectivePrice} ₽
          </span>
        </div>

        <button
          disabled={!isAvailable}
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable) onOpenModal(item);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            isAvailable
              ? 'bg-neutral-100 text-neutral-900 hover:bg-[#111111] hover:text-white active:scale-95'
              : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
          }`}
          aria-label={`Выбрать ${item.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
