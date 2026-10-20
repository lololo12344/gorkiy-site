export type Location = {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  telegram_chat_id?: string | null;
  is_accepting_orders: boolean;
  created_at?: string;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  allowed_option_group_ids?: string[];
  is_recipe_fixed?: boolean;
};

export type OptionGroup = {
  id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  category_ids?: string[];
  options?: OptionItem[];
};

export type OptionItem = {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
};

export type LocationItemSetting = {
  location_id: string;
  item_id: string;
  is_available: boolean;
  price_override: number | null;
};

export type LocationOptionSetting = {
  location_id: string;
  option_id: string;
  is_available: boolean;
};

export type OrderStatus = 'new' | 'accepted' | 'ready' | 'done' | 'cancelled';
export type PaymentMethod = 'cash' | 'card_terminal';

export type SelectedOption = {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  priceDelta: number;
};

export type CartItem = {
  cartItemId: string; // unique per item + options combo
  item: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[];
  unitPrice: number;
  totalPrice: number;
};

export type Order = {
  id: string;
  user_id: string | null;
  location_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  total: number;
  pickup_time: string;
  comment: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  items?: OrderItem[];
  location?: Location;
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  options: SelectedOption[];
  price: number;
};

export type Profile = {
  id: string;
  name: string;
  phone: string;
  telegram_chat_id?: string | null;
  favorite_location_id?: string | null;
  is_admin: boolean;
  created_at?: string;
};
