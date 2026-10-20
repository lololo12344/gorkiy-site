'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Phone, AlertTriangle, X, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Location } from '@/types/database';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export function LocationModal() {
  const {
    locations,
    currentLocation,
    setCurrentLocation,
    isLocationModalOpen,
    setIsLocationModalOpen,
    cart,
  } = useApp();

  const [pendingLocation, setPendingLocation] = useState<Location | null>(null);

  // Надежная блокировка скролла
  useBodyScrollLock(isLocationModalOpen);

  // Закрытие по Escape (a11y)
  useEffect(() => {
    if (!isLocationModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingLocation) {
          setPendingLocation(null);
        } else {
          setIsLocationModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLocationModalOpen, setIsLocationModalOpen, pendingLocation]);

  if (!isLocationModalOpen) return null;

  const handleSelect = (loc: Location) => {
    if (loc.id === currentLocation.id) {
      setIsLocationModalOpen(false);
      return;
    }

    if (cart.length > 0) {
      setPendingLocation(loc);
    } else {
      setCurrentLocation(loc, false);
    }
  };

  const confirmSwitch = () => {
    if (pendingLocation) {
      setCurrentLocation(pendingLocation, true);
      setPendingLocation(null);
    }
  };

  const cancelSwitch = () => {
    setPendingLocation(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 touch-none overscroll-contain select-none"
      onClick={() => {
        if (!pendingLocation) setIsLocationModalOpen(false);
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative border border-neutral-100 touch-auto select-text overscroll-contain animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning if cart will be cleared */}
        {pendingLocation ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">
              Сменить точку?
            </h3>
            <p className="text-sm text-neutral-600 mb-6">
              В вашей корзине есть позиции для точки «{currentLocation.name}». При смене точки на «{pendingLocation.name}» корзина будет очищена.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelSwitch}
                className="flex-1 py-3 px-4 rounded-2xl border-2 border-neutral-200 font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors active:scale-95"
              >
                Отмена
              </button>
              <button
                onClick={confirmSwitch}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#111111] text-white font-semibold hover:bg-neutral-800 transition-colors active:scale-95"
              >
                Да, сменить
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-center justify-between border-b border-neutral-100">
              <div>
                <h2 id="location-modal-title" className="text-xl font-bold text-neutral-900">
                  Выберите кофейню
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Заказ приготовит бариста именно этой точки
                </p>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors active:scale-95"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Location List */}
            <div className="p-4 sm:p-6 space-y-3 max-h-[70dvh] overflow-y-auto overscroll-contain touch-pan-y">
              {locations.map((loc) => {
                const isSelected = loc.id === currentLocation.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelect(loc)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-start justify-between gap-3 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                      isSelected
                        ? 'border-[#111111] bg-neutral-50 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-neutral-900">
                          {loc.name}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#111111] text-white px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Выбрано
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{loc.address}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {loc.hours}
                        </span>
                        {loc.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            {loc.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
