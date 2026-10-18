'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  MapPin,
  Clock,
  Phone,
  Send,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  INITIAL_LOCATIONS,
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_OPTION_GROUPS
} from '@/lib/data/initialData';
import { Location, Category, MenuItem, OptionGroup, Order } from '@/types/database';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin view state
  const [activeTab, setActiveTab] = useState<'general' | string>('general');
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(INITIAL_OPTION_GROUPS);

  // Per-location stop-list: Record<locationId, Set<itemId>>
  const [stopList, setStopList] = useState<Record<string, string[]>>({});
  // Per-location price overrides: Record<locationId, Record<itemId, number>>
  const [priceOverrides, setPriceOverrides] = useState<Record<string, Record<string, number>>>({});

  // Form states
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin12345' || password === 'admin' || password === 'gorkiy') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Неверный пароль администратора');
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // Category management
  const addCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      sort_order: categories.length + 1,
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCatName('');
    showFeedback('Категория добавлена');
  };

  const deleteCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    showFeedback('Категория удалена');
  };

  // Item management
  const toggleItemActive = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, is_active: !it.is_active } : it))
    );
    showFeedback('Видимость позиции изменена');
  };

  const deleteItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((it) => it.id !== itemId));
    showFeedback('Позиция удалена');
  };

  const saveEditingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setMenuItems((prev) => {
      const exists = prev.some((it) => it.id === editingItem.id);
      if (exists) {
        return prev.map((it) => (it.id === editingItem.id ? editingItem : it));
      }
      return [editingItem, ...prev];
    });

    setEditingItem(null);
    showFeedback('Позиция сохранена');
  };

  // Location stop-list toggle
  const toggleLocationStopItem = (locationId: string, itemId: string) => {
    setStopList((prev) => {
      const current = prev[locationId] || [];
      const isStopped = current.includes(itemId);
      const next = isStopped ? current.filter((id) => id !== itemId) : [...current, itemId];
      return { ...prev, [locationId]: next };
    });
    showFeedback('Стоп-лист обновлен');
  };

  // Location price override
  const handlePriceOverrideChange = (locationId: string, itemId: string, price: number) => {
    setPriceOverrides((prev) => ({
      ...prev,
      [locationId]: {
        ...(prev[locationId] || {}),
        [itemId]: price,
      },
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-xl border border-neutral-200">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-neutral-900">Админка «Горький»</h1>
            <p className="text-xs text-neutral-500 mt-1">Вход для владельца и управляющего</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
                {loginError}
              </div>
            )}
            <input
              type="password"
              placeholder="Пароль администратора"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm focus:border-[#111111] focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#111111] text-white font-bold text-sm hover:bg-neutral-800 transition-colors"
            >
              Войти
            </button>
            <div className="text-center pt-2">
              <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-700">
                ← Вернуться на сайт
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const selectedLocation = locations.find((l) => l.id === activeTab);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              title="На сайт"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-base sm:text-lg">Панель управления</h1>
          </div>

          {feedbackMsg && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-in fade-in">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs font-semibold text-neutral-500 hover:text-red-600 transition-colors"
          >
            Выйти
          </button>
        </div>

        {/* View Switcher: General Menu vs Location A/B/C/D */}
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto no-scrollbar flex items-center gap-2 py-2 border-t border-neutral-100">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'general'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
            }`}
          >
            Общее меню
          </button>

          {locations.map((loc) => {
            const isActive = activeTab === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setActiveTab(loc.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                }`}
              >
                {loc.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        {activeTab === 'general' ? (
          /* =========================================================================
             GENERAL MENU VIEW (Stage 6)
             ========================================================================= */
          <div className="space-y-8">
            {/* Categories Management */}
            <section className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-2xs">
              <h2 className="font-bold text-lg mb-4">Категории меню</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 text-xs sm:text-sm font-medium"
                  >
                    <span>{c.name}</span>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="text-neutral-400 hover:text-red-600"
                      title="Удалить категорию"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Новая категория..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:outline-none focus:border-[#111111]"
                />
                <button
                  onClick={addCategory}
                  className="px-4 py-2 rounded-xl bg-[#111111] text-white text-xs sm:text-sm font-bold hover:bg-neutral-800 transition-colors"
                >
                  Добавить
                </button>
              </div>
            </section>

            {/* Menu Items Management */}
            <section className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-2xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-lg">Позиции меню</h2>
                  <p className="text-xs text-neutral-500">
                    Всего {menuItems.length} позиций в каталоге
                  </p>
                </div>
                <button
                  onClick={() =>
                    setEditingItem({
                      id: crypto.randomUUID(),
                      category_id: categories[0]?.id || '',
                      name: '',
                      description: '',
                      base_price: 300,
                      image_url: '',
                      is_active: true,
                      sort_order: menuItems.length + 1,
                    })
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111111] text-white text-xs sm:text-sm font-bold hover:bg-neutral-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить позицию</span>
                </button>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-400 text-xs">
                      <th className="pb-3 font-semibold">Фото</th>
                      <th className="pb-3 font-semibold">Название</th>
                      <th className="pb-3 font-semibold">Категория</th>
                      <th className="pb-3 font-semibold">Цена</th>
                      <th className="pb-3 font-semibold">Статус</th>
                      <th className="pb-3 font-semibold text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {menuItems.map((item) => {
                      const cat = categories.find((c) => c.id === item.category_id);
                      return (
                        <tr key={item.id} className="hover:bg-neutral-50/50">
                          <td className="py-2.5 pr-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">
                                  —
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 font-semibold text-neutral-900">
                            {item.name}
                          </td>
                          <td className="py-2.5 pr-3 text-neutral-500 text-xs">
                            {cat?.name || '—'}
                          </td>
                          <td className="py-2.5 pr-3 font-bold text-neutral-900">
                            {item.base_price} ₽
                          </td>
                          <td className="py-2.5 pr-3">
                            <button
                              onClick={() => toggleItemActive(item.id)}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                                item.is_active
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-neutral-200 text-neutral-600'
                              }`}
                            >
                              {item.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{item.is_active ? 'Активен' : 'Скрыт'}</span>
                            </button>
                          </td>
                          <td className="py-2.5 text-right space-x-1">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-200"
                              title="Редактировать"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-neutral-200"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          /* =========================================================================
             LOCATION SETTINGS VIEW (Stage 7)
             ========================================================================= */
          selectedLocation && (
            <div className="space-y-8">
              {/* Point info card */}
              <section className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg text-neutral-900">
                      {selectedLocation.name}
                    </h2>
                    <p className="text-xs text-neutral-500">{selectedLocation.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-500">Прием заказов:</span>
                    <button
                      onClick={() => {
                        setLocations((prev) =>
                          prev.map((l) =>
                            l.id === selectedLocation.id
                              ? { ...l, is_accepting_orders: !l.is_accepting_orders }
                              : l
                          )
                        );
                        showFeedback('Статус приема заказов изменен');
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        selectedLocation.is_accepting_orders
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {selectedLocation.is_accepting_orders ? 'Включен' : 'Приостановлен'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Telegram Chat ID для заказов этой точки
                    </label>
                    <input
                      type="text"
                      placeholder="-100xxxxxxxxxx"
                      value={selectedLocation.telegram_chat_id || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocations((prev) =>
                          prev.map((l) =>
                            l.id === selectedLocation.id
                              ? { ...l, telegram_chat_id: val }
                              : l
                          )
                        );
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Часы работы
                    </label>
                    <input
                      type="text"
                      value={selectedLocation.hours}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocations((prev) =>
                          prev.map((l) =>
                            l.id === selectedLocation.id ? { ...l, hours: val } : l
                          )
                        );
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300"
                    />
                  </div>
                </div>
              </section>

              {/* Stop-list & Price Override for this location */}
              <section className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-2xs">
                <h3 className="font-bold text-lg mb-2">Стоп-лист и цены для этой точки</h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Вы можете временно скрыть позицию для этой кофейни или установить специальную цену.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-400 text-xs">
                        <th className="pb-3 font-semibold">Позиция</th>
                        <th className="pb-3 font-semibold">Общая цена</th>
                        <th className="pb-3 font-semibold">Своя цена точки (₽)</th>
                        <th className="pb-3 font-semibold text-right">Наличие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {menuItems.map((item) => {
                        const isStopped = (stopList[selectedLocation.id] || []).includes(item.id);
                        const customPrice = priceOverrides[selectedLocation.id]?.[item.id];
                        return (
                          <tr key={item.id} className="hover:bg-neutral-50/50">
                            <td className="py-2.5 font-semibold text-neutral-900">
                              {item.name}
                            </td>
                            <td className="py-2.5 text-neutral-500">{item.base_price} ₽</td>
                            <td className="py-2.5">
                              <input
                                type="number"
                                placeholder={String(item.base_price)}
                                value={customPrice ?? ''}
                                onChange={(e) =>
                                  handlePriceOverrideChange(
                                    selectedLocation.id,
                                    item.id,
                                    parseFloat(e.target.value) || item.base_price
                                  )
                                }
                                className="w-24 px-2 py-1 text-xs rounded-lg border border-neutral-300"
                              />
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() =>
                                  toggleLocationStopItem(selectedLocation.id, item.id)
                                }
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                  isStopped
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {isStopped ? 'В стоп-листе' : 'Доступно'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )
        )}
      </main>

      {/* Item Edit Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">
              {editingItem.name ? 'Редактировать позицию' : 'Новая позиция'}
            </h3>

            <form onSubmit={saveEditingItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Категория
                </label>
                <select
                  value={editingItem.category_id}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, category_id: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  value={editingItem.base_price}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      base_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  URL фотографии
                </label>
                <input
                  type="text"
                  placeholder="/menu/item_xxx.jpg"
                  value={editingItem.image_url}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, image_url: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Описание
                </label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold hover:bg-neutral-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#111111] text-white text-sm font-bold hover:bg-neutral-800"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
