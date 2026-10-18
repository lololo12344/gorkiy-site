'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  currentLocation: Location;
  setCurrentLocation: (location: Location, force?: boolean) => boolean;
  categories: Category[];
  menuItems: MenuItem[];
  optionGroups: OptionGroup[];
  locationItemSettings: LocationItemSetting[];
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number, options: SelectedOption[]) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'menu' | 'profile'>('menu');
  const [locations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [currentLocation, setCurrentLocationState] = useState<Location>(INITIAL_LOCATIONS[0]);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [optionGroups] = useState<OptionGroup[]>(INITIAL_OPTION_GROUPS);
  const [locationItemSettings] = useState<LocationItemSetting[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<MenuItem | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const savedLocationId = localStorage.getItem('gorkiy_selected_location');
      if (savedLocationId) {
        const found = locations.find((l) => l.id === savedLocationId);
        if (found) setCurrentLocationState(found);
      } else {
        // First visit -> open location selector
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
      console.warn('LocalStorage error:', e);
    }
  }, [locations]);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gorkiy_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Sync orders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gorkiy_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // If Supabase is connected, optionally fetch items and realtime updates
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

  const setCurrentLocation = (newLoc: Location, force = false): boolean => {
    if (newLoc.id === currentLocation.id) {
      setIsLocationModalOpen(false);
      return true;
    }

    if (cart.length > 0 && !force) {
      // Trigger warning in UI
      return false;
    }

    if (cart.length > 0 && force) {
      setCart([]);
    }

    setCurrentLocationState(newLoc);
    localStorage.setItem('gorkiy_selected_location', newLoc.id);
    setIsLocationModalOpen(false);
    return true;
  };

  const addToCart = (item: MenuItem, quantity: number, options: SelectedOption[]) => {
    // Determine effective price
    const optionsDelta = options.reduce((sum, opt) => sum + opt.priceDelta, 0);
    const unitPrice = item.base_price + optionsDelta;
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
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
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
        .filter((ci) => ci.quantity > 0);
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setActiveOrder(order);
    clearCart();
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    if (activeOrder && activeOrder.id === orderId) {
      setActiveOrder((prev) => (prev ? { ...prev, status } : null));
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        locations,
        currentLocation,
        setCurrentLocation,
        categories,
        menuItems,
        optionGroups,
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
