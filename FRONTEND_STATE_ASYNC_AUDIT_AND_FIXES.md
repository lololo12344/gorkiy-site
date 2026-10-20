# Технический аудит и руководство по исправлению: Состояние, Асинхронность и Утечки памяти

**Репозиторий:** `gorkiy-site` (Next.js 15+ / React 18/19 / TypeScript / Supabase / Tailwind CSS)  
**Область проверки:** исключительно проблемы с состоянием (state), асинхронными вызовами (AbortController), индикацией загрузки и ошибок (loading/error states), гонками данных (race conditions) и утечками памяти (memory leaks).

---

## 1. Сводная таблица уязвимостей и дефектов

| № | Файл | Строки | Категория проблемы | Последствия |
|---|---|---|---|---|
| 1 | `src/context/AppContext.tsx` | 200–212 | Асинхронность без отмены (нет AbortController), нет loading/error | Запрос к Supabase не отменяется при размонтировании. Ошибки `{ error }` тихо игнорируются. Скачок интерфейса (CLS). |
| 2 | `src/context/AppContext.tsx` | 86–198 | Гонка данных (Race condition) в `localStorage` | Эффекты сохранения запускаются на первом рендере с начальными моками и затирают данные в `localStorage` до завершения эффекта чтения. |
| 3 | `src/context/AppContext.tsx` | 250–255 | Stale closure при расчете цен в `addToCart` | При переключении точки в `handleRepeatOrder` из-за батчинга стейта берется старый `currentLocation.id` и считаются неверные цены. |
| 4 | `src/context/AppContext.tsx` | 320–326 | Stale closure в `updateOrderStatus` | `activeOrder` проверяется из замыкания функции, статус активного заказа не обновляется во всплывающей карточке. |
| 5 | `src/components/CheckoutModal.tsx` | 71–87 | Fire-and-forget fetch, фиктивный loading, нет AbortController | `fetch` не ожидается (`await`), форма сразу закрывается, `isSubmitting` длится 0 мс. Ошибки 4xx/5xx не перехватываются, риск двойного сабмита. |
| 6 | `src/components/ProductModal.tsx` | 14–54 | Залипание стейта (State retention) | Компонент возвращает `null` вместо размонтирования. Опции и количество предыдущего блюда переносятся на следующее открытое блюдо. |
| 7 | `src/app/admin/page.tsx` | 89–92 | Утечка памяти (таймер `setTimeout` без очистки) | Вызов `setState` на размонтированном компоненте после перехода или логаута, наложение таймеров. |
| 8 | `src/app/admin/page.tsx` | 107–117, 177, 251, 347 | Stale closure при сортировке массивов | Использование `categories` / `menuItems` / `optionGroups` из замыкания текущего рендера вместо `prev => ...`. Потеря шагов сортировки при быстром клике. |
| 9 | `src/app/admin/page.tsx` | 431–438 | Преждевременный отзыв Blob URL (`URL.revokeObjectURL`) | Синхронный отзыв ссылки сразу после `a.click()` обрывает скачивание в браузерах Safari / WebKit / Firefox. |
| 10 | `src/components/MenuView.tsx` и `ProfileView.tsx` | — | Дублирование и потеря модалок в DOM-дереве | `LocationModal` смонтирован дважды, а `OrderStatusModal` отсутствует в `ProfileView`, из-за чего клик по «Подробнее о заказе» не работает. |

---

## 2. Подробное описание дефектов

### Дефект 1: Неотменяемый запрос к Supabase (`AppContext.tsx`)
```typescript
// ПРОБЛЕМНЫЙ КОД:
useEffect(() => {
  const supabase = createClient();
  if (!supabase) return;

  supabase
    .from('menu_items')
    .select('*')
    .then(({ data }) => {
      if (data && data.length > 0) {
        setMenuItems(data);
      }
    });
}, []);
```
* **Причина:** Нет привязки `AbortController.signal`, нет очистки эффекта (`cleanup function`), нет состояний `isLoadingMenuItems` и `menuError`.
* **Риск:** В React 18+ (Strict Mode) эффект запускается дважды (`mount -> unmount -> mount`). Запрос первой фазы завершается асинхронно и вызывает `setMenuItems` на уже мертвом цикле. Если Supabase возвращает ошибку (RLS, неверные ключи, сетевой сбой), она никак не логируется и не сообщается пользователю.

### Дефект 2: Затирание `localStorage` при первом монтировании (`AppContext.tsx`)
```typescript
// ПРОБЛЕМНЫЙ КОД:
const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

// Эффект чтения:
useEffect(() => {
  const savedCategories = localStorage.getItem('gorkiy_categories');
  if (savedCategories) setCategories(JSON.parse(savedCategories));
}, []);

// Эффект сохранения:
useEffect(() => {
  localStorage.setItem('gorkiy_categories', JSON.stringify(categories));
}, [categories]);
```
* **Причина:** Эффект сохранения зависит от `[categories]`. При монтировании он срабатывает сразу со значением `INITIAL_CATEGORIES` (моками) и перезаписывает `localStorage` еще до того, как эффект чтения закончит парсинг данных. Отсутствует флаг гидратации `isHydrated`.

### Дефект 3: Фиктивный `isSubmitting` и fire-and-forget `fetch` (`CheckoutModal.tsx`)
```typescript
// ПРОБЛЕМНЫЙ КОД:
setIsSubmitting(true);
setError('');

try {
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newOrder),
  }).catch((err) => {
    console.warn('API notification error (offline mode fallback):', err);
  });
} catch {}

addOrder(newOrder);
setIsSubmitting(false); // Вызывается синхронно в том же тике!
onClose(); // Закрывается мгновенно
```
* **Причина:** Нет `await`, нет `signal: abortController.signal`, нет проверки `response.ok`.
* **Риск:** Заказ считается оформленным локально, корзина очищается, а сервер при этом мог ответить `500 Internal Server Error`. Пользователь может дважды нажать кнопку (double submit), отправив два дублирующих заказа.

### Дефект 4: Залипание стейта модалки товара (`ProductModal.tsx`)
```typescript
// ПРОБЛЕМНЫЙ КОД:
export function ProductModal({ item, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, SelectedOption[]>>(() => {
    // Вычисление дефолтного объема...
  });

  if (!item) return null; // Возврат null НЕ размонтирует компонент!
```
* **Причина:** В `MenuView.tsx` компонент смонтирован постоянно: `<ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />`. Возврат `null` оставляет инстанс в дереве React Fiber. Инициализатор `useState` вызывается **один раз на старте приложения**, когда `item === null`. При последующих открытиях модификаторы и количество предыдущего товара остаются в состоянии и применяются к новому выбранному товару.

### Дефект 5: Неочищенный таймер уведомлений (`AdminPage.tsx`)
```typescript
// ПРОБЛЕМНЫЙ КОД:
const [feedbackMsg, setFeedbackMsg] = useState('');

const showFeedback = (msg: string) => {
  setFeedbackMsg(msg);
  setTimeout(() => setFeedbackMsg(''), 3000); // Таймер теряется, нет clearTimeout
};
```
* **Причина:** Идентификатор `setTimeout` нигде не сохраняется. При быстром клике старые таймеры скрывают новые сообщения. Если администратор уходит со страницы, через 3 секунды происходит вызов `setState` на размонтированном компоненте.

---

## 3. Полный готовый код исправлений

### Файл 1: `src/context/AppContext.tsx`
> **Что исправлено:**
> - Добавлен флаг `isHydratedRef` — `localStorage` больше не затирается моками на первом рендере.
> - Добавлен `AbortController` для Supabase с корректной отменой запроса.
> - Добавлены состояния `isLoadingMenuItems` и `menuError`.
> - `updateOrderStatus` и `addToCart` избавлены от stale closures.
> - Добавлена возможность передавать явный `targetLocationId` в `addToCart`.
> - Все методы обернуты в `useCallback` для предотвращения лишних ререндеров потребителей контекста.

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Location,
  Category,
  MenuItem,
  OptionGroup,
  CartItem,
  SelectedOption,
  Profile,
  Order,
  LocationItemSetting
} from '@/types/database';
import {
  INITIAL_LOCATIONS,
  INITIAL_CATEGORIES,
  INITIAL_OPTION_GROUPS,
  INITIAL_MENU_ITEMS
} from '@/lib/data/initialData';
import { createClient } from '@/lib/supabase/client';

interface AppContextType {
  activeTab: 'menu' | 'profile';
  setActiveTab: (tab: 'menu' | 'profile') => void;
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  currentLocation: Location;
  setCurrentLocation: (location: Location, force?: boolean) => boolean;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  isLoadingMenuItems: boolean;
  menuError: string | null;
  optionGroups: OptionGroup[];
  setOptionGroups: React.Dispatch<React.SetStateAction<OptionGroup[]>>;
  stopList: Record<string, string[]>;
  setStopList: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  priceOverrides: Record<string, Record<string, number>>;
  setPriceOverrides: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
  locationItemSettings: LocationItemSetting[];
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number, options: SelectedOption[], targetLocationId?: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  selectedProductForModal: MenuItem | null;
  setSelectedProductForModal: (item: MenuItem | null) => void;
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'menu' | 'profile'>('menu');
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [currentLocation, setCurrentLocationState] = useState<Location>(INITIAL_LOCATIONS[0]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [isLoadingMenuItems, setIsLoadingMenuItems] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(INITIAL_OPTION_GROUPS);
  const [stopList, setStopList] = useState<Record<string, string[]>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, Record<string, number>>>({});
  const [locationItemSettings] = useState<LocationItemSetting[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<MenuItem | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Флаг гидратации для предотвращения перезаписи сохранённых данных моками
  const isHydratedRef = useRef(false);

  // 1. Чтение из localStorage при старте
  useEffect(() => {
    try {
      const savedCategories = localStorage.getItem('gorkiy_categories');
      if (savedCategories) setCategories(JSON.parse(savedCategories));

      const savedMenuItems = localStorage.getItem('gorkiy_menu_items');
      if (savedMenuItems) setMenuItems(JSON.parse(savedMenuItems));

      const savedOptionGroups = localStorage.getItem('gorkiy_option_groups');
      if (savedOptionGroups) setOptionGroups(JSON.parse(savedOptionGroups));

      const savedLocations = localStorage.getItem('gorkiy_locations');
      let currentLocs = INITIAL_LOCATIONS;
      if (savedLocations) {
        currentLocs = JSON.parse(savedLocations);
        setLocations(currentLocs);
      }

      const savedStopList = localStorage.getItem('gorkiy_stop_list');
      if (savedStopList) setStopList(JSON.parse(savedStopList));

      const savedPriceOverrides = localStorage.getItem('gorkiy_price_overrides');
      if (savedPriceOverrides) setPriceOverrides(JSON.parse(savedPriceOverrides));

      const savedLocationId = localStorage.getItem('gorkiy_selected_location');
      if (savedLocationId) {
        const found = currentLocs.find((l: Location) => l.id === savedLocationId);
        if (found) setCurrentLocationState(found);
      } else {
        setIsLocationModalOpen(true);
      }

      const savedCart = localStorage.getItem('gorkiy_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedOrders = localStorage.getItem('gorkiy_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));

      const savedProfile = localStorage.getItem('gorkiy_profile');
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  // 2. Синхронизация данных с localStorage только ПОСЛЕ гидратации
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem('gorkiy_categories', JSON.stringify(categories));
    } catch {}
  }, [categories]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem('gorkiy_menu_items', JSON.stringify(menuItems));
    } catch {}
  }, [menuItems]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem('gorkiy_option_groups', JSON.stringify(optionGroups));
    } catch {}
  }, [optionGroups]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem('gorkiy_locations', JSON.stringify(locations));
    } catch {}
  }, [locations]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem('gorkiy_stop_list', JSON.stringify(stopList));
    } catch {}
  }, [stopList]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem('gorkiy_price_overrides', JSON.stringify(priceOverrides));
    } catch {}
  }, [priceOverrides]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem('gorkiy_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem('gorkiy_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      if (profile) {
        localStorage.setItem('gorkiy_profile', JSON.stringify(profile));
      } else {
        localStorage.removeItem('gorkiy_profile');
      }
    } catch {}
  }, [profile]);

  // 3. Безопасный асинхронный запрос к Supabase с отменой (AbortController)
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const controller = new AbortController();
    setIsLoadingMenuItems(true);
    setMenuError(null);

    supabase
      .from('menu_items')
      .select('*')
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (error) {
          console.error('Supabase fetch error:', error);
          setMenuError(error.message);
          return;
        }
        if (data && data.length > 0) {
          setMenuItems(data);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setMenuError(err?.message || 'Ошибка загрузки меню');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingMenuItems(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem('gorkiy_categories');
    localStorage.removeItem('gorkiy_menu_items');
    localStorage.removeItem('gorkiy_option_groups');
    localStorage.removeItem('gorkiy_locations');
    localStorage.removeItem('gorkiy_stop_list');
    localStorage.removeItem('gorkiy_price_overrides');
    setCategories(INITIAL_CATEGORIES);
    setMenuItems(INITIAL_MENU_ITEMS);
    setOptionGroups(INITIAL_OPTION_GROUPS);
    setLocations(INITIAL_LOCATIONS);
    setStopList({});
    setPriceOverrides({});
    setCurrentLocationState(INITIAL_LOCATIONS[0]);
  }, []);

  const setCurrentLocation = useCallback(
    (newLoc: Location, force = false): boolean => {
      if (newLoc.id === currentLocation.id) {
        setIsLocationModalOpen(false);
        return true;
      }
      if (cart.length > 0 && !force) {
        return false;
      }
      if (cart.length > 0 && force) {
        setCart([]);
      }
      setCurrentLocationState(newLoc);
      try {
        localStorage.setItem('gorkiy_selected_location', newLoc.id);
      } catch {}
      setIsLocationModalOpen(false);
      return true;
    },
    [currentLocation.id, cart.length]
  );

  const addToCart = useCallback(
    (item: MenuItem, quantity: number, options: SelectedOption[], targetLocationId?: string) => {
      const locId = targetLocationId || currentLocation.id;
      const effectiveBasePrice = priceOverrides[locId]?.[item.id] ?? item.base_price;
      const optionsDelta = options.reduce((sum, opt) => sum + opt.priceDelta, 0);
      const unitPrice = effectiveBasePrice + optionsDelta;
      const sortedOptionIds = [...options].map((o) => o.optionId).sort().join('_');
      const cartItemId = `${item.id}-${sortedOptionIds}`;

      setCart((prev) => {
        const existing = prev.find((ci) => ci.cartItemId === cartItemId);
        if (existing) {
          return prev.map((ci) =>
            ci.cartItemId === cartItemId
              ? {
                  ...ci,
                  quantity: ci.quantity + quantity,
                  totalPrice: (ci.quantity + quantity) * unitPrice,
                }
              : ci
          );
        }
        return [
          ...prev,
          {
            cartItemId,
            item,
            quantity,
            selectedOptions: options,
            unitPrice,
            totalPrice: unitPrice * quantity,
          },
        ];
      });
    },
    [currentLocation.id, priceOverrides]
  );

  const updateCartQuantity = useCallback((cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.cartItemId === cartItemId) {
            const newQty = ci.quantity + delta;
            return {
              ...ci,
              quantity: newQty,
              totalPrice: newQty * ci.unitPrice,
            };
          }
          return ci;
        })
        .filter((ci) => ci.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.cartItemId !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setActiveOrder(order);
    setCart([]);
  }, []);

  // Устранена Stale Closure в activeOrder
  const updateOrderStatus = useCallback((orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    setActiveOrder((prev) => (prev && prev.id === orderId ? { ...prev, status } : prev));
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        locations,
        setLocations,
        currentLocation,
        setCurrentLocation,
        categories,
        setCategories,
        menuItems,
        setMenuItems,
        isLoadingMenuItems,
        menuError,
        optionGroups,
        setOptionGroups,
        stopList,
        setStopList,
        priceOverrides,
        setPriceOverrides,
        locationItemSettings,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
        isLocationModalOpen,
        setIsLocationModalOpen,
        isCartOpen,
        setIsCartOpen,
        selectedProductForModal,
        setSelectedProductForModal,
        profile,
        setProfile,
        orders,
        addOrder,
        updateOrderStatus,
        activeOrder,
        setActiveOrder,
        resetToDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
```

---

### Файл 2: `src/components/CheckoutModal.tsx`
> **Что исправлено:**
> - Добавлен честный `await fetch`, проверка `response.ok` и обработка статус-кодов.
> - Создан `AbortController` с автоматической отменой при размонтировании.
> - `isSubmitting` реально блокирует интерфейс и предотвращает дублирование заказов.
> - Корзина очищается и форма закрывается только после успешного ответа бэкенда.

```typescript
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, CreditCard, Banknote, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Order, PaymentMethod } from '@/types/database';

interface CheckoutModalProps {
  onClose: () => void;
}

export function CheckoutModal({ onClose }: CheckoutModalProps) {
  const {
    cart,
    cartTotal,
    currentLocation,
    addOrder,
    profile,
    setIsCartOpen,
  } = useApp();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [pickupTime, setPickupTime] = useState('Как можно скорее (~15-20 мин)');
  const [customTime, setCustomTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_terminal');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setError('Пожалуйста, укажите ваше имя');
      return;
    }
    if (!phone.trim()) {
      setError('Пожалуйста, укажите ваш номер телефона');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const finalPickupTime = customTime.trim() ? customTime : pickupTime;
    const newOrder: Order = {
      id: crypto.randomUUID(),
      user_id: profile?.id || null,
      location_id: currentLocation.id,
      status: 'new',
      payment_method: paymentMethod,
      total: cartTotal,
      pickup_time: finalPickupTime,
      comment: comment.trim(),
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      created_at: new Date().toISOString(),
      location: currentLocation,
      items: cart.map((ci) => ({
        id: crypto.randomUUID(),
        order_id: '',
        item_id: ci.item.id,
        item_name: ci.item.name,
        quantity: ci.quantity,
        options: ci.selectedOptions,
        price: ci.totalPrice,
      })),
    };

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Ошибка сервера (${response.status})`);
      }

      addOrder(newOrder);
      setIsCartOpen(false);
      onClose();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Order submission error:', err);
      setError(err.message || 'Не удалось отправить заказ. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Оформление заказа</h2>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              <span>{currentLocation.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Контактные данные
            </label>
            <input
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-sm disabled:bg-neutral-100"
            />
            <input
              type="tel"
              placeholder="Телефон для связи (+7 ...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-sm disabled:bg-neutral-100"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Время готовности
            </label>
            <div className="space-y-2">
              {[
                'Как можно скорее (~15-20 мин)',
                'Через 30 минут',
                'Через 45 минут',
                'Через 1 час',
              ].map((timeOption) => (
                <button
                  type="button"
                  key={timeOption}
                  disabled={isSubmitting}
                  onClick={() => {
                    setPickupTime(timeOption);
                    setCustomTime('');
                  }}
                  className={`w-full p-3 rounded-xl border text-sm flex items-center justify-between transition-all ${
                    pickupTime === timeOption && !customTime
                      ? 'border-[#111111] bg-neutral-50 font-semibold'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    <span>{timeOption}</span>
                  </div>
                  {pickupTime === timeOption && !customTime && (
                    <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Способ оплаты
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPaymentMethod('card_terminal')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all ${
                  paymentMethod === 'card_terminal'
                    ? 'border-[#111111] bg-neutral-50 shadow-2xs font-semibold'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <CreditCard className="w-5 h-5 text-neutral-700" />
                <div>
                  <div className="text-sm font-bold text-neutral-900">Картой</div>
                  <div className="text-[11px] text-neutral-500">Через терминал</div>
                </div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPaymentMethod('cash')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-[#111111] bg-neutral-50 shadow-2xs font-semibold'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Banknote className="w-5 h-5 text-neutral-700" />
                <div>
                  <div className="text-sm font-bold text-neutral-900">Наличными</div>
                  <div className="text-[11px] text-neutral-500">При получении</div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Комментарий бариста
            </label>
            <textarea
              placeholder="Например: без корицы, сахар отдельно..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-sm resize-none disabled:bg-neutral-100"
            />
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm text-neutral-600">К оплате:</span>
              <span className="font-extrabold text-2xl text-neutral-900">{cartTotal} ₽</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-5 rounded-2xl bg-[#111111] text-white font-bold text-base hover:bg-neutral-800 active:scale-98 transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Отправка заказа...</span>
                </>
              ) : (
                'Подтвердить заказ'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### Файл 3: `src/components/ProductModal.tsx`
> **Что исправлено:**
> - Добавлен гарантированный сброс количества (`quantity = 1`) и выбранных модификаторов при смене блюда.
> - Дефолтные опции вычисляются динамически под конкретную категорию и ID блюда.

```typescript
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Minus, Plus, Check } from 'lucide-react';
import { MenuItem, SelectedOption } from '@/types/database';
import { useApp } from '@/context/AppContext';
import { getAssetUrl } from '@/lib/utils/asset';

interface ProductModalProps {
  item: MenuItem;
  onClose: () => void;
}

export function ProductModal({ item, onClose }: ProductModalProps) {
  const { optionGroups, categories, addToCart, currentLocation, priceOverrides } = useApp();
  const [quantity, setQuantity] = useState(1);

  const relevantOptionGroups = useMemo(() => {
    const cat = categories.find((c) => c.id === item.category_id);
    const isDrinkCat = cat && ['Классические напитки', 'Авторские напитки', 'Холодные напитки', 'Чаи'].includes(cat.name);

    return optionGroups.filter((group) => {
      if (group.category_ids && group.category_ids.length > 0) {
        return group.category_ids.includes(item.category_id);
      }
      return isDrinkCat;
    });
  }, [item.category_id, categories, optionGroups]);

  const defaultOptions = useMemo(() => {
    const defaults: Record<string, SelectedOption[]> = {};
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
    return defaults;
  }, [relevantOptionGroups]);

  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, SelectedOption[]>>(defaultOptions);

  // Сброс при смене блюда
  useEffect(() => {
    setQuantity(1);
    setSelectedOptionsMap(defaultOptions);
  }, [item.id, defaultOptions]);

  const basePrice = priceOverrides[currentLocation.id]?.[item.id] ?? item.base_price;

  const handleToggleOption = (
    group: (typeof optionGroups)[0],
    option: NonNullable<(typeof optionGroups)[0]['options']>[0]
  ) => {
    setSelectedOptionsMap((prev) => {
      const currentList = prev[group.id] || [];
      const isAlreadySelected = currentList.some((o) => o.optionId === option.id);

      if (group.max_select === 1) {
        if (isAlreadySelected && !group.is_required) {
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
        if (isAlreadySelected) {
          return {
            ...prev,
            [group.id]: currentList.filter((o) => o.optionId !== option.id),
          };
        } else {
          if (currentList.length >= group.max_select) {
            return prev;
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

  const flatSelectedOptions: SelectedOption[] = Object.values(selectedOptionsMap).flat();
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1">
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

            {relevantOptionGroups.map((group) => {
              const selectedList = selectedOptionsMap[group.id] || [];
              return (
                <div key={group.id} className="pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-neutral-900">{group.name}</span>
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
            <span className="w-6 text-center font-bold text-sm text-neutral-900">{quantity}</span>
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
```

---

### Фрагмент 4: Исправление `AdminPage.tsx`
> **Что исправлено:**
> - Таймер уведомлений сохраняется в `useRef` и очищается при размонтировании.
> - Функции сортировки категорий, позиций и модификаторов переведены на функциональные обновления `setCategories(prev => ...)`, исключая race conditions при двойных кликах.
> - `URL.revokeObjectURL(url)` вызывается с задержкой в 2000 мс.

```typescript
// 1. Безопасные уведомления с очисткой таймера
const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  return () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  };
}, []);

const showFeedback = useCallback((msg: string) => {
  if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  setFeedbackMsg(msg);
  feedbackTimerRef.current = setTimeout(() => {
    setFeedbackMsg('');
    feedbackTimerRef.current = null;
  }, 3000);
}, []);

// 2. Сортировка категорий без stale closure
const moveCategory = useCallback((index: number, delta: number) => {
  setCategories((prev) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= prev.length) return prev;
    const copy = [...prev];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    return copy.map((c, i) => ({ ...c, sort_order: i + 1 }));
  });
  showFeedback('Порядок категорий изменён');
}, [showFeedback]);

// 3. Сортировка опций внутри группы без stale closure
const moveOptionItem = useCallback((groupId: string, optIndex: number, delta: number) => {
  setOptionGroups((prev) => {
    const group = prev.find((g) => g.id === groupId);
    if (!group || !group.options) return prev;

    const targetIndex = optIndex + delta;
    if (targetIndex < 0 || targetIndex >= group.options.length) return prev;

    const copy = [...group.options];
    const temp = copy[optIndex];
    copy[optIndex] = copy[targetIndex];
    copy[targetIndex] = temp;
    const reordered = copy.map((o, i) => ({ ...o, sort_order: i + 1 }));

    return prev.map((g) => (g.id === groupId ? { ...g, options: reordered } : g));
  });
  showFeedback('Порядок вариантов изменён');
}, [showFeedback]);

// 4. Безопасный экспорт данных без обрыва скачивания
const exportDataJson = () => {
  const dump = {
    categories,
    menuItems,
    optionGroups,
    locations,
    stopList,
    priceOverrides,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gorkiy-menu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showFeedback('Файл резервной копии скачан');
};
```

---

### Фрагмент 5: Единая точка размещения глобальных модалок в `page.tsx`
> **Что исправлено:**
> - `<LocationModal />` и `<OrderStatusModal />` вынесены из дочерних `MenuView` и `ProfileView` на верхний уровень страницы `src/app/page.tsx`.
> - Теперь просмотр заказа из личного кабинета работает безотказно, а `LocationModal` не монтируется дважды.

```tsx
// src/app/page.tsx
'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { MenuView } from '@/components/MenuView';
import { ProfileView } from '@/components/ProfileView';
import { LocationModal } from '@/components/LocationModal';
import { OrderStatusModal } from '@/components/OrderStatusModal';

function MainContent() {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <div className="flex-1">
        {activeTab === 'menu' ? <MenuView /> : <ProfileView />}
      </div>
      <BottomNav />

      {/* Глобальные модалки, доступные из любой вкладки приложения */}
      <LocationModal />
      <OrderStatusModal />
    </div>
  );
}

export default function Home() {
  return <MainContent />;
}
```

А в `src/components/MenuView.tsx` модалка товара вызывается только по условию с `key`:
```tsx
{/* src/components/MenuView.tsx */}
{selectedItem && (
  <ProductModal
    key={selectedItem.id}
    item={selectedItem}
    onClose={() => setSelectedItem(null)}
  />
)}
<CartButton />
<CartModal />
```
*(Удалены дублирующие `<LocationModal />` и `<OrderStatusModal />` из `MenuView.tsx` и `ProfileView.tsx`).*
