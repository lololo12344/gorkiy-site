'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  RotateCcw,
  User,
  LogOut,
  ChevronRight,
  Heart,
  MessageSquare
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { LocationModal } from '@/components/LocationModal';

export function ProfileView() {
  const {
    profile,
    setProfile,
    orders,
    locations,
    addToCart,
    menuItems,
    setIsCartOpen,
    setActiveTab,
    setCurrentLocation,
    setActiveOrder,
  } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newProfile = {
      id: crypto.randomUUID(),
      name: nameInput.trim() || 'Гость',
      phone: phoneInput.trim() || '+7 (999) 000-00-00',
      is_admin: false,
    };
    setProfile(newProfile);
    localStorage.setItem('gorkiy_profile', JSON.stringify(newProfile));
  };

  const handleLogout = () => {
    setProfile(null);
    localStorage.removeItem('gorkiy_profile');
  };

  const handleRepeatOrder = (order: (typeof orders)[0]) => {
    // Switch to order location if different
    if (order.location_id) {
      const loc = locations.find((l) => l.id === order.location_id);
      if (loc) setCurrentLocation(loc, true);
    }

    // Add items back to cart
    order.items?.forEach((it) => {
      const menuItem = menuItems.find((m) => m.id === it.item_id);
      if (menuItem) {
        addToCart(menuItem, it.quantity, it.options || []);
      }
    });

    setIsCartOpen(true);
    setActiveTab('menu');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 pb-32 space-y-8 animate-in fade-in duration-200">
      {/* 1. User Header / Auth */}
      {profile ? (
        <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xl">
              {profile.name ? profile.name[0].toUpperCase() : 'G'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{profile.name}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{profile.phone}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-neutral-200 text-neutral-500 hover:text-red-600 hover:bg-white transition-colors"
            title="Выйти"
            aria-label="Выйти"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
          <div className="flex gap-2 mb-6 p-1 bg-neutral-200/60 rounded-2xl">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                authMode === 'login' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                authMode === 'register' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Ваше имя"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-sm focus:border-[#111111] focus:outline-none"
              />
            )}
            <input
              type="tel"
              placeholder="Номер телефона (+7 ...)"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-sm focus:border-[#111111] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-[#111111] text-white font-bold text-sm hover:bg-neutral-800 transition-colors"
            >
              {authMode === 'login' ? 'Войти по номеру' : 'Зарегистрироваться'}
            </button>
          </form>
        </div>
      )}

      {/* 2. Order History */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-neutral-900">История заказов</h3>

        {orders.length === 0 ? (
          <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-100 text-neutral-400 text-xs">
            У вас пока нет заказов
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-2xl border border-neutral-100 bg-white shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">
                      {ord.location?.name || 'Горький'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 font-semibold text-neutral-700">
                      {ord.status === 'new' && 'Принят'}
                      {ord.status === 'accepted' && 'Готовится'}
                      {ord.status === 'ready' && 'Готов'}
                      {ord.status === 'done' && 'Выдан'}
                      {ord.status === 'cancelled' && 'Отменен'}
                    </span>
                  </div>
                  <span className="font-extrabold text-base text-neutral-900">
                    {ord.total} ₽
                  </span>
                </div>

                <div className="text-xs text-neutral-500">
                  {ord.items?.map((it) => `${it.quantity}x ${it.item_name}`).join(', ')}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-50 text-xs">
                  <button
                    onClick={() => setActiveOrder(ord)}
                    className="text-neutral-500 hover:text-neutral-900 font-semibold"
                  >
                    Подробнее о заказе
                  </button>

                  <button
                    onClick={() => handleRepeatOrder(ord)}
                    className="flex items-center gap-1 font-bold text-[#111111] hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Повторить</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Coffee Points List with Route Buttons */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-neutral-900">Наши кофейни</h3>
        <div className="space-y-3">
          {locations.map((loc) => {
            const yandexMapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(
              loc.address
            )}`;
            return (
              <div
                key={loc.id}
                className="p-5 rounded-2xl border border-neutral-100 bg-white space-y-3"
              >
                <div>
                  <h4 className="font-bold text-base text-neutral-900">{loc.name}</h4>
                  <p className="text-xs text-neutral-600 mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                    <span>{loc.address}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    {loc.hours}
                  </span>
                  {loc.phone && (
                    <a
                      href={`tel:${loc.phone}`}
                      className="flex items-center gap-1 text-neutral-800 hover:underline font-medium"
                    >
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      {loc.phone}
                    </a>
                  )}
                </div>

                <div className="pt-2">
                  <a
                    href={yandexMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Маршрут в Яндекс.Картах</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Team Link & Footer */}
      <footer className="pt-6 border-t border-neutral-200 text-center space-y-3">
        <div>
          <a
            href="https://wa.me/79889334233"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <span>Хочу в команду</span>
            <span className="text-[10px] text-neutral-400">(WhatsApp +7 988 933-42-33)</span>
          </a>
        </div>
        <p className="text-[11px] text-neutral-400 uppercase tracking-widest font-semibold">
          © GORKIY COFFEE {new Date().getFullYear()}
        </p>
      </footer>

      <LocationModal />
    </div>
  );
}
