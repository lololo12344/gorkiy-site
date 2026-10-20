'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Minus, Plus, Check } from 'lucide-react';
import { MenuItem, SelectedOption } from '@/types/database';
import { useApp } from '@/context/AppContext';
import { getAssetUrl } from '@/lib/utils/asset';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ProductModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export function ProductModal({ item, onClose }: ProductModalProps) {
  const { optionGroups, categories, addToCart, currentLocation, priceOverrides } = useApp();
  const [quantity, setQuantity] = useState(1);

  // Намертво блокируем фоновый скролл (в т.ч. на iOS Safari)
  useBodyScrollLock(!!item);

  // Available option groups for this item
  const relevantOptionGroups = useMemo(() => {
    if (!item) return [];

    // 1. Если рецепт фиксирован или явно задан пустой список опций
    if (item.is_recipe_fixed || (Array.isArray(item.allowed_option_group_ids) && item.allowed_option_group_ids.length === 0)) {
      return [];
    }

    // 2. Если в админ-панели индивидуально настроен белый список опций для этой позиции
    if (Array.isArray(item.allowed_option_group_ids) && item.allowed_option_group_ids.length > 0) {
      return optionGroups
        .filter((group) => item.allowed_option_group_ids!.includes(group.id))
        .sort((a, b) => a.sort_order - b.sort_order);
    }

    // 3. Стандартная привязка по категориям (для обратной совместимости)
    const cat = categories.find((c) => c.id === item.category_id);
    const isDrinkCat = cat && ['Классические напитки', 'Авторские напитки', 'Холодные напитки', 'Чаи'].includes(cat.name);

    return optionGroups.filter((group) => {
      if (group.category_ids && group.category_ids.length > 0) {
        return group.category_ids.includes(item.category_id);
      }
      return isDrinkCat;
    });
  }, [item, categories, optionGroups]);

  // Compute default volume/size options
  const defaultOptions = useMemo(() => {
    const defaults: Record<string, SelectedOption[]> = {};
    if (item && relevantOptionGroups.length > 0) {
      const volumeGroup = relevantOptionGroups.find((g) =>
        g.name.toLowerCase().includes('объем') || g.name.toLowerCase().includes('размер')
      );
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
  }, [item, relevantOptionGroups]);

  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, SelectedOption[]>>(defaultOptions);

  // Сброс модификаторов и количества при смене выбранного товара
  useEffect(() => {
    if (item) {
      setQuantity(1);
      setSelectedOptionsMap(defaultOptions);
    }
  }, [item?.id, defaultOptions]);

  // Закрытие по Escape (a11y)
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  const basePrice = priceOverrides[currentLocation.id]?.[item.id] ?? item.base_price;

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 touch-none overscroll-contain select-none"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md max-h-[88dvh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300 touch-auto select-text overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain flex-1 touch-pan-y">
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
              <h2
                id="product-modal-title"
                className="text-xl sm:text-2xl font-bold text-neutral-900 leading-tight"
              >
                {item.name}
              </h2>
              {item.description && (
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  {item.description}
                </p>
              )}

              {item.is_recipe_fixed && (
                <div className="mt-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-xs text-neutral-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0" />
                  <span className="font-medium">Фиксированный рецепт: подается в классическом виде без модификаторов</span>
                </div>
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
                    <span className="text-xs text-neutral-400 font-medium">
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
                          className={`w-full p-3 rounded-xl border text-sm font-medium flex items-center justify-between transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
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
        <div className="p-3.5 sm:p-5 border-t border-neutral-100 bg-white flex flex-col min-[380px]:flex-row items-stretch min-[380px]:items-center gap-3">
          <div className="flex items-center justify-center gap-2 bg-neutral-100 rounded-2xl p-1 shrink-0 self-center min-[380px]:self-auto">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 hover:bg-white active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:active:scale-100 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900"
              aria-label="Уменьшить"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="min-w-[1.75rem] text-center font-bold text-sm text-neutral-900 px-1 select-none">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 hover:bg-white active:scale-95 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900"
              aria-label="Увеличить"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-[#111111] text-white font-bold text-sm sm:text-base flex items-center justify-between gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          >
            <span className="truncate">В корзину</span>
            <span className="shrink-0 font-extrabold">{totalPrice} ₽</span>
          </button>
        </div>
      </div>
    </div>
  );
}
