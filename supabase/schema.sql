-- ==============================================================================
-- GORKIY COFFEE DB SCHEMA (SPEC.md Stages 1.1, 1.2, 1.3)
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. LOCATIONS (Точки)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  phone text,
  hours text default '08:00 - 22:00',
  telegram_chat_id text,
  is_accepting_orders boolean default true,
  created_at timestamptz default now()
);

-- 2. PROFILES (Профили пользователей)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  telegram_chat_id text,
  favorite_location_id uuid references public.locations(id) on delete set null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- 3. CATEGORIES (Категории меню)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 4. MENU ITEMS (Позиции меню)
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text default '',
  base_price numeric not null default 0,
  image_url text default '',
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 5. OPTION GROUPS (Группы опций: Молоко, Объем, Сироп)
create table if not exists public.option_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_required boolean default false,
  min_select int default 0,
  max_select int default 1,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 6. OPTIONS (Конкретные варианты: Овсяное, Кокосовое, 350 мл)
create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.option_groups(id) on delete cascade,
  name text not null,
  price_delta numeric not null default 0,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 7. MENU ITEM <-> OPTION GROUPS RELATIONS
create table if not exists public.menu_item_option_groups (
  item_id uuid references public.menu_items(id) on delete cascade,
  group_id uuid references public.option_groups(id) on delete cascade,
  primary key (item_id, group_id)
);

-- 8. LOCATION ITEM SETTINGS (Стоп-лист и переопределение цен точки)
create table if not exists public.location_item_settings (
  location_id uuid references public.locations(id) on delete cascade,
  item_id uuid references public.menu_items(id) on delete cascade,
  is_available boolean default true,
  price_override numeric default null,
  primary key (location_id, item_id)
);

-- 9. LOCATION OPTION SETTINGS (Стоп-лист опций точки)
create table if not exists public.location_option_settings (
  location_id uuid references public.locations(id) on delete cascade,
  option_id uuid references public.options(id) on delete cascade,
  is_available boolean default true,
  primary key (location_id, option_id)
);

-- 10. ORDERS (Заказы)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  location_id uuid references public.locations(id) on delete restrict,
  status text not null check (status in ('new', 'accepted', 'ready', 'done', 'cancelled')) default 'new',
  payment_method text not null check (payment_method in ('cash', 'card_terminal')),
  total numeric not null default 0 check (total >= 0),
  pickup_time text,
  comment text default '' check (char_length(comment) <= 500),
  customer_name text check (char_length(customer_name) <= 100),
  customer_phone text check (char_length(customer_phone) <= 40),
  created_at timestamptz default now()
);

-- 11. ORDER ITEMS (Состав заказа)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  quantity int not null default 1 check (quantity > 0 and quantity <= 100),
  options jsonb default '[]'::jsonb,
  price numeric not null check (price >= 0)
);

-- Индекс для быстрого поиска заказов и обновления статуса
create index if not exists idx_orders_id_status on public.orders(id, status);

-- ==============================================================================
-- AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.locations enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.menu_item_option_groups enable row level security;
alter table public.location_item_settings enable row level security;
alter table public.location_option_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$ language sql security definer;

-- Public read for locations, categories, menu_items, options, location settings
create policy "Public can view locations" on public.locations for select using (true);
create policy "Admins can manage locations" on public.locations for all using (public.is_admin());

create policy "Public can view categories" on public.categories for select using (true);
create policy "Admins can manage categories" on public.categories for all using (public.is_admin());

create policy "Public can view menu_items" on public.menu_items for select using (true);
create policy "Admins can manage menu_items" on public.menu_items for all using (public.is_admin());

create policy "Public can view option_groups" on public.option_groups for select using (true);
create policy "Admins can manage option_groups" on public.option_groups for all using (public.is_admin());

create policy "Public can view options" on public.options for select using (true);
create policy "Admins can manage options" on public.options for all using (public.is_admin());

create policy "Public can view menu_item_option_groups" on public.menu_item_option_groups for select using (true);
create policy "Admins can manage menu_item_option_groups" on public.menu_item_option_groups for all using (public.is_admin());

create policy "Public can view location_item_settings" on public.location_item_settings for select using (true);
create policy "Admins can manage location_item_settings" on public.location_item_settings for all using (public.is_admin());

create policy "Public can view location_option_settings" on public.location_option_settings for select using (true);
create policy "Admins can manage location_option_settings" on public.location_option_settings for all using (public.is_admin());

-- Profiles: users can see & edit their own profile; admins can see all
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id or public.is_admin());
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id or public.is_admin());

-- Orders: public can create orders, users see ONLY their own (authenticated), admins see all
create policy "Anyone can insert orders" on public.orders for insert with check (true);
create policy "Users can view own orders" on public.orders for select using (
  (auth.uid() is not null and auth.uid() = user_id) or public.is_admin()
);
create policy "Admins can update orders" on public.orders for update using (public.is_admin());

-- Order items: insertable by anyone, selectable only by order owner or admin
create policy "Anyone can insert order items" on public.order_items for insert with check (true);
create policy "Users can view own order items" on public.order_items for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and ((auth.uid() is not null and auth.uid() = o.user_id) or public.is_admin())
  )
);
