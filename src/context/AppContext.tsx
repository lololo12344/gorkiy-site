'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

  // Флаг гидратации для предотвращения перезаписи сохранённых данных моками на старте
  const isHydratedRef = useRef(false);

  // 1. Чтение из localStorage при старте
  useEffect(() => {
    try {
      const savedCategories = localStorage.getItem('gorkiy_categories');
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }

      const savedMenuItems = localStorage.getItem('gorkiy_menu_items');
      if (savedMenuItems) {
        setMenuItems(JSON.parse(savedMenuItems));
      }

      const savedOptionGroups = localStorage.getItem('gorkiy_option_groups');
      if (savedOptionGroups) {
        setOptionGroups(JSON.parse(savedOptionGroups));
      }

      const savedLocations = localStorage.getItem('gorkiy_locations');
      let currentLocs = INITIAL_LOCATIONS;
      if (savedLocations) {
        currentLocs = JSON.parse(savedLocations);
        setLocations(currentLocs);
      }

      const savedStopList = localStorage.getItem('gorkiy_stop_list');
      if (savedStopList) {
        setStopList(JSON.parse(savedStopList));
      }

      const savedPriceOverrides = localStorage.getItem('gorkiy_price_overrides');
      if (savedPriceOverrides) {
        setPriceOverrides(JSON.parse(savedPriceOverrides));
      }

      const savedLocationId = localStorage.getItem('gorkiy_selected_location');
      if (savedLocationId) {
        const found = currentLocs.find((l: Location) => l.id === savedLocationId);
        if (found) setCurrentLocationState(found);
      } else {
        setIsLocationModalOpen(true);
      }

      const savedCart = localStorage.getItem('gorkiy_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      const savedOrders = localStorage.getItem('gorkiy_orders');
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }

      const savedProfile = localStorage.getItem('gorkiy_profile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  // 2. Синхронизация данных с localStorage только ПОСЛЕ завершения гидратации
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

    async function fetchMenuItems() {
      try {
        const { data, error } = await supabase!
          .from('menu_items')
          .select('*')
          .abortSignal(controller.signal);

        if (controller.signal.aborted) return;

        if (error) {
          console.error('Supabase fetch error:', error);
          setMenuError(error.message);
          return;
        }

        if (data && data.length > 0) {
          setMenuItems(data);
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setMenuError(err?.message || 'Ошибка загрузки меню');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingMenuItems(false);
        }
      }
    }

    fetchMenuItems();

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

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

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

  const contextValue = useMemo<AppContextType>(
    () => ({
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
    }),
    [
      activeTab,
      locations,
      currentLocation,
      setCurrentLocation,
      categories,
      menuItems,
      isLoadingMenuItems,
      menuError,
      optionGroups,
      stopList,
      priceOverrides,
      locationItemSettings,
      cart,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      cartTotal,
      cartCount,
      isLocationModalOpen,
      isCartOpen,
      selectedProductForModal,
      profile,
      orders,
      addOrder,
      updateOrderStatus,
      activeOrder,
      resetToDefaults,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
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
