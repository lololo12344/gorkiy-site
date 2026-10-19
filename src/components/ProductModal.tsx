'use client';

import React, { useState, useMemo } from 'react';
import { X, Minus, Plus, Check } from 'lucide-react';
import { MenuItem, SelectedOption } from '@/types/database';
import { useApp } from '@/context/AppContext';
import { getAssetUrl } from '@/lib/utils/asset';

interface ProductModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export function ProductModal({ item, onClose }: ProductModalProps) {
  const { optionGroups, categories, addToCart, currentLocation, locationItemSettings } = useApp();
  const [quantity, setQuantity] = useState(1);

  // Check if item belongs to drink categories
  const isDrink = useMemo(() => {
    if (!item) return false;
    const cat = categories.find((c) => c.id === item.category_id);
    if (!cat) return false;
    return ['Классические напитки', 'Авторские напитки', 'Холодные напитки'].includes(cat.name);
  }, [item, categories]);

  // Available option groups for this item
  const relevantOptionGroups = useMemo(() => {
    if (!isDrink) return [];
    return optionGroups;
  }, [isDrink, optionGroups]);

  // Selected options state: Record<groupId, OptionItem[]>
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, SelectedOption[]>>(() => {
    // Default selection for required groups (like Volume)
    const defaults: Record<string, SelectedOption[]> = {};
    if (isDrink && optionGroups.length > 0) {
      const volumeGroup = optionGroups.find((g) => g.name === 'Объем');
      if (volumeGroup && volumeGroup.options && volumeGroup.options[0]) {
        const firstOpt = volumeGroup.options[0];
        defaults[volumeGroup.id] = [
          {
            groupId: volumeGroup.id,
            groupName: volumeGroup.name,
            optionId: firstOpt.id,
            name: firstOpt.name,
            priceDelta: firstOpt.price_delta,
          },
        ];
      }
    }
    return defaults;
  });

  if (!item) return null;

  const setting = locationItemSettings.find(
    (s) => s.location_id === currentLocation.id && s.item_id === item.id
  );
  const basePrice = setting?.price_override ?? item.base_price;

  const handleToggleOption = (
    group: (typeof optionGroups)[0],
    option: NonNullable<(typeof optionGroups)[0]['options']>[0]
  ) => {
    setSelectedOptionsMap((prev) => {
      const currentList = prev[group.id] || [];
      const isAlreadySelected = currentList.some((o) => o.optionId === option.id);

      if (group.max_select === 1) {
        // Single-select
        if (isAlreadySelected && !group.is_required) {
          // unselect if not required
          const next = { ...prev };
          delete next[group.id];
          return next;
        }
        return {
          ...prev,
          [group.id]: [
            {
              groupId: group.id,
              groupName: group.name,
              optionId: option.id,
              name: option.name,
              priceDelta: option.price_delta,
            },
          ],
        };
      } else {
        // Multi-select
        if (isAlreadySelected) {
          return {
            ...prev,
            [group.id]: currentList.filter((o) => o.optionId !== option.id),
          };
        } else {
          if (currentList.length >= group.max_select) {
            return prev; // reached limit
          }
          return {
            ...prev,
            [group.id]: [
              ...currentList,
              {
                groupId: group.id,
                groupName: group.name,
                optionId: option.id,
                name: option.name,
                priceDelta: option.price_delta,
              },
            ],
          };
        }
      }
    });
  };

  // Flatten selected options
  const flatSelectedOptions: SelectedOption[] = Object.values(selectedOptionsMap).flat();

  // Calculate unit price & total
  const optionsDelta = flatSelectedOptions.reduce((sum, opt) => sum + opt.priceDelta, 0);
  const unitPrice = basePrice + optionsDelta;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    addToCart(item, quantity, flatSelectedOptions);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md max-h-[88vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {/* Large image */}
          <div className="relative aspect-4/3 w-full bg-neutral-100">
            {item.image_url ? (
              <img
                src={getAssetUrl(item.image_url)}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                Нет фото
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Title, description & base price */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 leading-tight">
                {item.name}
              </h2>
              {item.description && (
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>

            {/* Option groups */}
            {relevantOptionGroups.map((group) => {
              const selectedList = selectedOptionsMap[group.id] || [];
              return (
                <div key={group.id} className="pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-neutral-900">
                      {group.name}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {group.is_required
                        ? 'Обязательно'
                        : group.max_select > 1
                        ? `до ${group.max_select}`
                        : 'опционально'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.options?.map((opt) => {
                      const isSelected = selectedList.some((o) => o.optionId === opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleOption(group, opt)}
                          className={`w-full p-3 rounded-xl border text-sm font-medium flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-[#111111] bg-neutral-50 shadow-2xs'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                                isSelected
                                  ? 'bg-[#111111] border-[#111111] text-white'
                                  : 'border-neutral-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-neutral-800">{opt.name}</span>
                          </div>

                          {opt.price_delta > 0 && (
                            <span className="text-xs font-semibold text-neutral-600">
                              +{opt.price_delta} ₽
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions: quantity & add button */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-white flex items-center gap-4">
          <div className="flex items-center gap-2 bg-neutral-100 rounded-2xl p-1 shrink-0">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Уменьшить"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-bold text-sm text-neutral-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 hover:bg-white transition-colors"
              aria-label="Увеличить"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-[#111111] text-white font-bold text-sm sm:text-base flex items-center justify-between hover:bg-neutral-800 active:scale-98 transition-all shadow-md"
          >
            <span>В корзину</span>
            <span>{totalPrice} ₽</span>
          </button>
        </div>
      </div>
    </div>
  );
}
