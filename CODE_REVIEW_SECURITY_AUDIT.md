# Полный отчет код-ревью и аудит безопасности (AppSec)
**Проект:** https://github.com/lololo12344/gorkiy-site  
**Роль:** Senior Full-Stack Архитектор & Специалист по кибербезопасности (AppSec)  
**Статус готовности к продакшену:** **0% (КАТЕГОРИЧЕСКИ НЕ ГОТОВ)**

---

## 📌 Краткое резюме

Текущий репозиторий представляет собой ранний визуальный прототип, в котором бэкенд и админка сымитированы через браузерный `localStorage`. Проект содержит критические уязвимости безопасности (утечка PII всех клиентов через Supabase RLS, хардкод паролей администратора в открытом виде), архитектурные дефекты (админка сохраняет изменения только в браузере вошедшего администратора) и фатальные ошибки CI/CD (роуты API физически вырезаются при деплое на GitHub Pages, делая сайт неспособным принять ни один заказ).

### ТОП-3 первоочередные задачи:
1. **Устранить критическую утечку персональных данных в Supabase RLS:** переписать политики `orders` и `order_items`, полностью убрав условие `auth.uid() is null`, позволяющее анонимам выкачивать чужие заказы.
2. **Перейти с GitHub Pages на Node/Serverless хостинг (Vercel/Railway) и восстановить API:** прекратить удаление папки `src/app/api` при сборке, реализовать серверный пересчет цен и защитить вебхук Telegram секретным токеном.
3. **Убрать `localStorage` и подключить реальную базу данных в админке:** удалить захардкоженные пароли из клиентского бандла, настроить проверку сессий на сервере и выполнять мутации каталога через запросы к базе данных.

---

## ВЕКТОР 1: Безопасность (Security)

### **[УРОВЕНЬ КРИТИЧНОСТИ: CRITICAL] — Публичная утечка персональных данных (PII) и базы заказов через брешь в RLS**
* **Где:** `supabase/schema.sql`, строки 200–209:
  ```sql
  create policy "Users can view their orders" on public.orders for select using (
    auth.uid() = user_id or public.is_admin() or auth.uid() is null
  );
  create policy "Anyone can view order items" on public.order_items for select using (true);
  ```
* **В чем суть и риск:**
  Условие `or auth.uid() is null` истинно для абсолютно любого анонимного запроса (когда заголовок авторизации отсутствует). Это позволяет любому пользователю интернета с публичным ключом `NEXT_PUBLIC_SUPABASE_ANON_KEY` выполнить `supabase.from('orders').select('*')` и слить полную базу заказов: имена клиентов, номера телефонов, адреса кофеен, комментарии и историю покупок. Это прямое нарушение 152-ФЗ / GDPR и критическая утечка PII.
* **Исправление:**
  ```sql
  -- Удаляем уязвимые политики
  drop policy if exists "Users can view their orders" on public.orders;
  drop policy if exists "Anyone can view order items" on public.order_items;

  -- Чтение заказов разрешено только авторизованному владельцу или администратору
  create policy "Users can view own orders" on public.orders
    for select using (
      (auth.uid() is not null and auth.uid() = user_id) or public.is_admin()
    );

  -- Чтение состава заказа только если у пользователя есть доступ к самому заказу
  create policy "Users can view own order items" on public.order_items
    for select using (
      exists (
        select 1 from public.orders o
        where o.id = order_items.order_id
          and ((auth.uid() is not null and auth.uid() = o.user_id) or public.is_admin())
      )
    );
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: CRITICAL] — Хардкод паролей администратора в клиентском бандле и коммит `.env.local` в git**
* **Где:** `src/app/admin/page.tsx`, строки 94–102:
  ```ts
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin12345' || password === 'admin' || password === 'gorkiy') {
      setIsAuthenticated(true);
  ```
  и файл `.env.local`, строка 14 (`ADMIN_PASSWORD=admin12345`), отслеживаемый git.
* **В чем суть и риск:**
  1. Пароли администратора зашиты в открытом виде в клиентский JavaScript-код. Любой посетитель может открыть вкладку Sources в браузере или найти их в бандле.
  2. Файл `.env.local` с боевыми переменными и паролем `ADMIN_PASSWORD=admin12345` закомичен в публичный репозиторий.
  3. Состояние авторизации держится на обычном клиентском `useState(false)`. Злоумышленник может открыть React DevTools или ввести команду в консоли и выставить `isAuthenticated = true` без ввода пароля.
* **Исправление:**
  1. Немедленно выполнить `git rm --cached .env.local`, сменить пароли/ключи и добавить `.env.local` в `.gitignore`.
  2. Проверку роли перенести на сервер (Next.js Middleware + Supabase Auth):
  ```ts
  // src/middleware.ts
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';
  import { createServerClient } from '@supabase/ssr';

  export async function middleware(req: NextRequest) {
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const res = NextResponse.next();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => req.cookies.getAll(),
            setAll: (cookies) => cookies.forEach((c) => res.cookies.set(c)),
          },
        }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      return res;
    }
  }

  export const config = {
    matcher: ['/admin/:path*'],
  };
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: CRITICAL] — Незащищенный Telegram Webhook (подделка статусов заказов и IDOR)**
* **Где:** `src/app/api/telegram/webhook/route.ts`, строки 4–16:
  ```ts
  export async function POST(req: Request) {
    try {
      const body = await req.json();
      if (body.callback_query) {
        const cb = body.callback_query;
        const data = cb.data as string;
        const [, orderId, newStatus] = data.split(':');
  ```
* **В чем суть и риск:**
  Эндпоинт `/api/telegram/webhook` публичен и не проверяет подлинность запроса от Telegram (`X-Telegram-Bot-Api-Secret-Token`). Любой внешний пользователь может отправить POST-запрос с произвольным `orderId` и `newStatus: 'cancelled'` или `ready`, самовольно меняя статус любых заказов в системе или парализуя работу кофеен.
* **Исправление:**
  ```ts
  // src/app/api/telegram/webhook/route.ts
  import { NextResponse } from 'next/server';
  import { createAdminSupabaseClient } from '@/lib/supabase/admin';

  const TELEGRAM_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
  const ALLOWED_STATUSES = new Set(['accepted', 'ready', 'cancelled']);

  export async function POST(req: Request) {
    const tokenHeader = req.headers.get('x-telegram-bot-api-secret-token');
    if (!TELEGRAM_SECRET || tokenHeader !== TELEGRAM_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (body.callback_query?.data?.startsWith('status:')) {
      const parts = body.callback_query.data.split(':');
      if (parts.length !== 3) return NextResponse.json({ ok: false }, { status: 400 });
      
      const [, orderId, newStatus] = parts;
      if (!ALLOWED_STATUSES.has(newStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const supabaseAdmin = createAdminSupabaseClient();
      await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', orderId);
      // логика ответа на callback_query...
    }
    return NextResponse.json({ ok: true });
  }
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: HIGH] — Подмена цен и состава заказа на клиенте (Price Tampering / Parameter Tampering)**
* **Где:** `src/app/api/orders/route.ts`, строки 7, 19, и `src/components/CheckoutModal.tsx`, строки 47–70:
  ```ts
  const order: Order = await req.json();
  ...
  total: order.total, // Сервер слепо доверяет переданной сумме!
  ```
* **В чем суть и риск:**
  Клиент сам рассчитывает сумму и передает поля `total`, `price` за каждую позицию и `id`. Злоумышленник может отправить запрос с `total: 1` или отрицательной суммой на заказ. Сервер без проверки запишет эти данные в базу и отправит бариста в Telegram чек на 1 рубль.
* **Исправление:**
  ```ts
  // src/app/api/orders/route.ts
  // Серверная валидация и пересчет цен
  const { data: dbItems, error: itemsError } = await supabaseAdmin
    .from('menu_items')
    .select('id, base_price, is_active')
    .in('id', rawItems.map((i: any) => i.item_id));

  if (itemsError || !dbItems) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }

  let verifiedTotal = 0;
  for (const item of rawItems) {
    const dbItem = dbItems.find((d) => d.id === item.item_id);
    if (!dbItem || !dbItem.is_active) {
      return NextResponse.json({ error: `Товар недоступен: ${item.item_id}` }, { status: 400 });
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      return NextResponse.json({ error: 'Некорректное количество товара' }, { status: 400 });
    }
    // Пересчет надбавок за опции из БД...
    verifiedTotal += dbItem.base_price * item.quantity;
  }
  // В базу пишется verifiedTotal!
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: HIGH] — Инъекция неэкранированного HTML в Telegram API (HTML Injection / DoS)**
* **Где:** `src/app/api/orders/route.ts`, строки 76–86:
  ```ts
  const messageText = `⚡️ <b>НОВЫЙ ЗАКАЗ</b> ...
  👤 <b>Гость:</b> ${order.customer_name} (${order.customer_phone})
  💬 <b>Комментарий:</b> ${order.comment}
  ...`;
  // отправляется с parse_mode: 'HTML'
  ```
* **В чем суть и риск:**
  Пользовательский ввод не санируется перед вставкой в шаблон сообщения Telegram с `parse_mode: 'HTML'`. Если пользователь введет в комментарии символ `<`, незакрытый тег или смайл `<3`, Telegram вернет ошибку `400 Bad Request: can't parse entities`. Сообщение упадет, и бариста вообще не получит заказ. Кроме того, злоумышленник может внедрять фишинговые ссылки `<a href="...">` в чат персонала.
* **Исправление:**
  ```ts
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const safeCustomerName = escapeHtml(order.customer_name || 'Гость');
  const safePhone = escapeHtml(order.customer_phone || '');
  const safeComment = order.comment ? escapeHtml(order.comment) : '';
  ```

---

## ВЕКТОР 2: Логика и обработка ошибок (Logic & Edge Cases)

### **[УРОВЕНЬ КРИТИЧНОСТИ: CRITICAL] — Уничтожение API-роутов при сборке в GitHub Actions**
* **Где:** `.github/workflows/deploy.yml`, строки 30–33, и `next.config.ts`, строки 3–6:
  ```yaml
  - name: Prepare for static export
    run: |
      if [ -d "src/app/api" ]; then mv src/app/api ./api_backup; fi
  ```
* **В чем суть и риск:**
  В CI/CD перед сборкой папка `src/app/api` физически переименовывается в `api_backup`, чтобы заставить Next.js собраться в статический HTML для GitHub Pages (`output: "export"`). В собранном продакшене роутов `/api/orders` и `/api/telegram/webhook` просто НЕТ (они отдают 404). Ни один заказ не может быть создан или отправлен в Telegram.
* **Исправление:**
  1. Отказаться от развертывания fullstack Next.js приложения на GitHub Pages как чисто статического сайта.
  2. Развернуть приложение на платформе с поддержкой Node.js/Edge Runtime (Vercel, Railway, VPS, Render) и удалить хак с `mv src/app/api` из workflow:
  ```yaml
  # .github/workflows/deploy.yml
  - name: Install dependencies
    run: npm ci
  - name: Build Next.js
    run: npm run build
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: HIGH] — Иллюзия оформления заказа: Fire-and-forget fetch и сокрытие сбоев сети**
* **Где:** `src/components/CheckoutModal.tsx`, строки 72–87:
  ```ts
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
  setIsSubmitting(false);
  onClose();
  ```
* **В чем суть и риск:**
  Вызов `fetch` не ожидает ответа (`await` отсутствует), ошибки глушатся. UI оптимистично рапортует клиенту, что заказ принят. Клиент приходит в кофейню, но бариста ничего не получал, а в БД запись отсутствует.
* **Исправление:**
  ```ts
  // src/components/CheckoutModal.tsx
  try {
    setIsSubmitting(true);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const response = await fetch(`${basePath}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Ошибка при отправке заказа в кофейню');
    }

    addOrder(newOrder);
    onClose();
    setIsCartOpen(false);
  } catch (err: any) {
    setError(err.message || 'Сбой сети. Попробуйте еще раз.');
  } finally {
    setIsSubmitting(false);
  }
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: HIGH] — Невозможность обновления статуса заказа из Telegram из-за использования Anon Key**
* **Где:** `src/app/api/telegram/webhook/route.ts`, строки 26–36, и `src/lib/supabase/server.ts`, строки 5–10:
  ```ts
  const supabase = await createServerSupabaseClient(); // использует ANON key
  if (supabase) {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  }
  ```
* **В чем суть и риск:**
  В политиках RLS (`schema.sql` L205) обновлять `orders` разрешено только админам (`public.is_admin()`). Запрос из вебхука Telegram не содержит сессии админа и выполняется с анонимным ключом. База отклоняет обновление, но из-за отсутствия проверки возвращаемого `{ error }` ошибка тихо игнорируется. Статус заказа в БД никогда не обновляется.
* **Исправление:**
  Создать клиента с сервисным ключом (`SUPABASE_SERVICE_ROLE_KEY`):
  ```ts
  // src/lib/supabase/admin.ts
  import { createClient } from '@supabase/supabase-js';

  export function createAdminSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error('Supabase admin credentials are missing');
    }
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: MEDIUM] — Отсутствие синхронизации статуса заказа на клиенте (Dead State)**
* **Где:** `src/components/OrderStatusModal.tsx`, строки 8–20:
* **В чем суть и риск:**
  В модальном окне статуса заказа отображается индикатор шагов, но клиент никак не отслеживает изменения статуса со стороны бариста. Статус навсегда зависает в положении «Принят» (new), пока пользователь вручную не очистит кеш.
* **Исправление:**
  Подключить Supabase Realtime подписку на изменение конкретного заказа:
  ```ts
  useEffect(() => {
    if (!activeOrder?.id) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`order-${activeOrder.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrder.id}` },
        (payload) => {
          if (payload.new && (payload.new as any).status) {
            updateOrderStatus(activeOrder.id, (payload.new as any).status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);
  ```

---

## ВЕКТОР 3: Производительность (Performance & Web Vitals)

### **[УРОВЕНЬ КРИТИЧНОСТИ: HIGH] — Каскадные ререндеры всего дерева из-за монолитного немемоизированного Context Value**
* **Где:** `src/context/AppContext.tsx`, строки 328–373:
  ```tsx
  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        locations,
        // ... еще 25 параметров без useMemo
      }}
    >
  ```
* **В чем суть и риск:**
  Объект `value` создается заново на каждый тик рендера. Любое локальное действие (открытие модалки, ввод символа в форму, добавление блюда) меняет ссылку на контекст и инициирует полный принудительный ререндер абсолютно всех компонентов: `Header`, `MenuView`, сотен карточек `ProductCard`, `BottomNav`. На мобильных устройствах интерфейс лагает и пропускает кадры анимации (INP > 500ms).
* **Исправление:**
  Мемоизировать значение контекста и разделить состояние на независимые домены (`CatalogContext`, `CartContext`, `UIStateContext`):
  ```tsx
  const contextValue = useMemo(
    () => ({
      cart,
      cartTotal,
      cartCount,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
    }),
    [cart, cartTotal, cartCount]
  );
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: MEDIUM] — Использование неоптимизированных `<img>` без размеров (Высокий LCP и CLS)**
* **Где:** `src/components/ProductCard.tsx`, строки 34–40, и `src/components/Header.tsx`, строки 27–31:
  ```tsx
  <img
    src={getAssetUrl(item.image_url)}
    alt={item.name}
    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
    loading="lazy"
  />
  ```
* **В чем суть и риск:**
  Не используются возможности `next/image`. Отсутствуют фиксированные атрибуты `width`/`height` или `sizes`. Браузер не знает пропорций картинок до их загрузки, что приводит к резким сдвигам верстки (высокий Cumulative Layout Shift — CLS) и отсутствию сжатия изображений в AVIF/WebP для мобильных сетей.
* **Исправление:**
  ```tsx
  import Image from 'next/image';

  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 mb-3">
    {item.image_url ? (
      <Image
        src={item.image_url}
        alt={item.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    ) : null}
  </div>
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: MEDIUM] — Квадратичная сложность $O(N \times M)$ сортировки и фильтрации каталога на каждом кадре**
* **Где:** `src/components/MenuView.tsx`, строки 41–46:
  ```tsx
  {categories.map((category) => {
    const itemsInCategory = menuItems
      .filter((item) => item.category_id === category.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  ```
* **В чем суть и риск:**
  Внутри цикла рендера категорий на каждый ререндер выполняется фильтрация и сортировка всего массива `menuItems`. Это блокирует основной поток при переключении табов и скролле.
* **Исправление:**
  ```tsx
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      if (!map.has(item.category_id)) map.set(item.category_id, []);
      map.get(item.category_id)!.push(item);
    }
    for (const items of map.values()) {
      items.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [menuItems]);
  ```

---

## ВЕКТОР 4: Верстка, UI/UX и Доступность (Frontend & a11y)

### **[УРОВЕНЬ КРИТИЧНОСТИ: HIGH] — Полное отсутствие доступности и Focus Trap в модалках (a11y)**
* **Где:** `src/components/CartModal.tsx`, `src/components/ProductModal.tsx`, `src/components/CheckoutModal.tsx`, `src/components/LocationModal.tsx`.
* **В чем суть и риск:**
  1. Модальные окна сверстаны как обычные `div` без семантических ролей `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
  2. Нет перехвата фокуса (Focus Trap): пользователь при навигации с клавиатуры (Tab) перемещается по элементам страницы под модалкой.
  3. Отсутствует закрытие по клавише `Escape`.
  4. Не блокируется прокрутка подложки (`overflow: hidden` для `body`), что на мобильных устройствах вызывает паразитный скролл фонового каталога сквозь модалку (Scroll Bleeding).
* **Исправление:**
  ```tsx
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex ..."
    >
      <h2 id="modal-title" className="sr-only">Корзина</h2>
      ...
    </div>
  );
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: LOW] — Устаревший API `window.pageYOffset` и хрупкий хардкод оффсета скролла**
* **Где:** `src/components/MenuView.tsx`, строки 25–28:
  ```ts
  const yOffset = -120;
  const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
  window.scrollTo({ top: y, behavior: 'smooth' });
  ```
* **В чем суть и риск:**
  Свойство `window.pageYOffset` объявлено устаревшим в стандартах W3C. Фиксированный оффсет `-120` ломается при изменении высоты шапки на разных девайсах.
* **Исправление:**
  Использовать стандартный CSS `scroll-margin-top` и нативный `scrollIntoView`:
  ```ts
  // в JSX секции категории: className="scroll-mt-36"
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  ```

---

## ВЕКТОР 5: Архитектура и чистота кода (Clean Code)

### **[УРОВЕНЬ КРИТИЧНОСТИ: CRITICAL] — Архитектурный нонсенс: сохранение настроек админки только в личный LocalStorage**
* **Где:** `src/context/AppContext.tsx`, строки 149–184:
  ```ts
  useEffect(() => {
    try {
      localStorage.setItem('gorkiy_menu_items', JSON.stringify(menuItems));
    } catch {}
  }, [menuItems]);
  ```
* **В чем суть и риск:**
  Администратор, заходя в `/admin`, меняет цены, позиции или ставит товары в стоп-лист, но изменения сохраняются **только в `localStorage` его собственного браузера**. Клиенты и другие сотрудники этих изменений никогда не увидят. Админ-панель не связана с базой данных на запись и является декорацией.
* **Исправление:**
  Все мутации должны быть Server Actions или API-роутами, отправляющими реальные SQL-запросы в Supabase с проверкой прав администратора:
  ```ts
  // src/actions/admin.ts
  'use server';

  import { createServerSupabaseClient } from '@/lib/supabase/server';

  export async function updateMenuItemPrice(itemId: string, newPrice: number) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    // Проверка прав...
    const { error } = await supabase
      .from('menu_items')
      .update({ base_price: newPrice })
      .eq('id', itemId);

    if (error) throw new Error(error.message);
  }
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: HIGH] — Хрупкая бизнес-логика на хардкоженных русских строках**
* **Где:** `src/components/ProductModal.tsx`, строки 21–30:
  ```ts
  const cat = categories.find((c) => c.id === item.category_id);
  const isDrinkCat = cat && ['Классические напитки', 'Авторские напитки', 'Холодные напитки', 'Чаи'].includes(cat.name);

  return optionGroups.filter((group) => {
    if (group.category_ids && group.category_ids.length > 0) {
      return group.category_ids.includes(item.category_id);
    }
    return isDrinkCat;
  });
  ```
* **В чем суть и риск:**
  Логика отображения добавок (сиропы, молоко, объем) привязана к буквальным русским строкам названий категорий. Если админ создаст категорию «Кофе», «Сезонные напитки» или опечатается («Чай» вместо «Чаи»), опции напитков перестанут отображаться в интерфейсе.
* **Исправление:**
  Привязать опции к типу товара или связующей таблице по ID сущностей:
  ```ts
  return optionGroups.filter((group) => 
    group.category_ids?.includes(item.category_id) || 
    cat?.type === 'drink'
  );
  ```

---

### **[УРОВЕНЬ КРИТИЧНОСТИ: HIGH] — God-компонент на 1786 строк в `admin/page.tsx`**
* **Где:** `src/app/admin/page.tsx` (1786 строк).
* **В чем суть и риск:**
  Один гигантский файл объединяет в себе форму входа, управление товарами, категориями, группами опций, стоп-листами для 4 точек, модальные окна, драг-н-дроп и экспорт бекапов. Код грубо нарушает принцип единой ответственности (SRP), не поддается юнит-тестированию и вызывает ререндер всего экрана при каждом нажатии клавиши в инпутах.
* **Исправление:**
  Разбить на изолированные модули:
  - `src/features/admin/components/CategoryList.tsx`
  - `src/features/admin/components/MenuItemEditor.tsx`
  - `src/features/admin/components/StopListManager.tsx`
  - `src/features/admin/components/OptionGroupEditor.tsx`
