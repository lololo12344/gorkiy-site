# ПОЛНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ: ИСПРАВЛЕНИЕ ВЕРСТКИ HTML & CSS (GORKIY-SITE)

## 0. Общая информация и стек проекта
- **Фреймворк:** Next.js 16.4.2 (App Router), React 19.3.0.
- **Стилизация:** Tailwind CSS v4 (`@tailwindcss/turbopack`, `@import "tailwindcss"`).
- **Иконки:** Lucide React.
- **Шрифты:** Manrope (Google Fonts via `next/font/google`).
- **Целевая аудитория и устройства:** Мобильные телефоны (от 320px до 430px), планшеты и десктопы. Пользователи с включенным увеличением системного шрифта (WCAG 1.4.4 Text Resize 200% и WCAG 1.4.10 Reflow 320px).

---

## 1. Проблемы адаптивности на экранах 320px и при 200% увеличении шрифта

### 1.1. Каталог меню: переполнение двухколоночной сетки на 320px
* **Файлы:**
  - `src/components/MenuView.tsx` (строка 66)
  - `src/components/ProductCard.tsx` (строки 23–91)
* **Диагностика:**
  В `MenuView.tsx` задан безусловный `grid-cols-2` для всех мобильных экранов:
  ```tsx
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
  ```
  При ширине вьюпорта 320px за вычетом боковых отступов `px-4` (32px) и зазора сетки `gap-3` (12px) ширина карточки:
  $$\frac{320 - 32 - 12}{2} = 138\text{ px}$$
  Внутри карточки задан паддинг `p-3` (24px по горизонтали). Чистая ширина под контент: $138 - 24 = 114\text{ px}$.
  В подвале карточки:
  - Кнопка добавления (`button` с иконкой `Plus`) имеет фиксированные размеры `w-9 h-9` (36px).
  - На блок цены остается: $114 - 36 = 78\text{ px}$.
  - При стандартном шрифте 16px четырехзначная цена (например, «1 250 ₽») едва помещается в 78px.
  - При увеличении системного шрифта в 2 раза (до 32px) надпись «1 250 ₽» требует не менее 120px. В результате цена наползает на кнопку, текст ломается на несколько строк, высота карточек перекашивается, а контент вываливается за границу `ProductCard`.
  - Заголовок `h3` с `line-clamp-2` при шрифте 200% вмещает всего 2–3 слова, обрезая критическую информацию о блюде/напитке.
* **Пошаговое исправление:**
  1. В `src/components/MenuView.tsx` на экранах уже 360px переключать сетку в 1 колонку:
     ```tsx
     // Строка 66 в src/components/MenuView.tsx
     // Было:
     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">

     // Стало:
     <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
     ```
  2. В `src/components/ProductCard.tsx` сделать футер адаптивным к переносу элементов:
     ```tsx
     // Строки 67-89 в src/components/ProductCard.tsx
     // Было:
     <div className="flex items-center justify-between pt-2 mt-auto border-t border-neutral-50">
       <div>
         <span className="font-extrabold text-base sm:text-lg text-neutral-900">
           {effectivePrice} ₽
         </span>
       </div>
       <button
         disabled={!isAvailable}
         onClick={(e) => {
           e.stopPropagation();
           if (isAvailable) onOpenModal(item);
         }}
         className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
           isAvailable
             ? 'bg-neutral-100 text-neutral-900 hover:bg-[#111111] hover:text-white active:scale-95'
             : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
         }`}
         aria-label={`Выбрать ${item.name}`}
       >
         <Plus className="w-4 h-4" />
       </button>
     </div>

     // Стало:
     <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 mt-auto border-t border-neutral-50">
       <div className="min-w-0 flex-1">
         <span className="font-extrabold text-sm min-[360px]:text-base sm:text-lg text-neutral-900 break-words">
           {effectivePrice} ₽
         </span>
       </div>
       <button
         disabled={!isAvailable}
         onClick={(e) => {
           e.stopPropagation();
           if (isAvailable) onOpenModal(item);
         }}
         className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all ${
           isAvailable
             ? 'bg-neutral-100 text-neutral-900 hover:bg-[#111111] hover:text-white active:scale-95'
             : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
         }`}
         aria-label={`Выбрать ${item.name}`}
       >
         <Plus className="w-4 h-4" />
       </button>
     </div>
     ```

---

### 1.2. Шапка: фиксированная высота `h-16` и пиксельное ограничение `max-w-[130px]`
* **Файл:** `src/components/Header.tsx` (строки 18–46)
* **Диагностика:**
  - `Header` содержит контейнер с жестко заданной высотой `h-16` (64px). При увеличении системного шрифта в 2 раза кнопка выбора локации и логотип увеличиваются по высоте и выпадают за границы хедера, перекрывая контент каталога.
  - Название выбранной точки внутри кнопки ограничено классом `max-w-[130px]` (строка 42). На экране 320px при двукратном масштабе шрифта в 130 пикселей помещается всего 4–5 букв («Горьк...»), полностью лишая пользователя информации о выбранной кофейне.
  - На экранах шириной 320px суммарная ширина логотипа (~90px), отступов `px-4` (32px), кнопки точки с пином и шевроном (~185px) и `gap-3` (12px) составляет 319px — это вызывает горизонтальное сплющивание элементов и деформацию векторных SVG-иконок.
* **Пошаговое исправление в `src/components/Header.tsx`:**
  ```tsx
  // Было (строки 18-46):
  <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#f0f0f0]">
    <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
      <button
        onClick={() => setActiveTab('menu')}
        className="flex items-center hover:opacity-85 transition-opacity focus:outline-none"
        title="ГОРЬКИЙ"
        aria-label="На главную"
      >
        <img
          src={getAssetUrl('/logo.png')}
          alt="ГОРЬКИЙ"
          className="h-7 sm:h-8 md:h-9 w-auto object-contain block"
        />
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50/80 hover:bg-neutral-100 text-xs sm:text-sm font-medium text-neutral-800 transition-colors"
          title="Выбрать точку"
        >
          <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-[190px]">
            {currentLocation.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        </button>

  // Стало:
  <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#f0f0f0]">
    <div className="max-w-4xl mx-auto px-3 sm:px-4 min-h-16 py-2 flex items-center justify-between gap-2">
      <button
        onClick={() => setActiveTab('menu')}
        className="flex items-center shrink-0 hover:opacity-85 transition-opacity focus:outline-none"
        title="ГОРЬКИЙ"
        aria-label="На главную"
      >
        <img
          src={getAssetUrl('/logo.png')}
          alt="ГОРЬКИЙ"
          className="h-6 min-[360px]:h-7 sm:h-8 md:h-9 w-auto object-contain block"
        />
      </button>

      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 min-[360px]:px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50/80 hover:bg-neutral-100 text-xs sm:text-sm font-medium text-neutral-800 transition-colors min-w-0"
          title="Выбрать точку"
        >
          <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="truncate max-w-[15ch] min-[360px]:max-w-[20ch] sm:max-w-[28ch]">
            {currentLocation.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        </button>
  ```

---

### 1.3. Нижняя навигация: жесткая высота `h-14` и неработающий класс `safe-bottom`
* **Файл:** `src/components/BottomNav.tsx` (строки 11–36)
* **Диагностика:**
  - Контейнер ограничен жесткой высотой `h-14` (56px). При увеличении системного шрифта в 2 раза иконки (20px) и увеличенные подписи не помещаются по высоте и обрезаются.
  - Текст кнопок задан фиксированным размером в пикселях `text-[11px]`.
  - Класс `safe-bottom` в проекте отсутствует (не объявлен ни в одном CSS-файле). В результате на устройствах iPhone без физической кнопки «Домой» нижняя навигация визуально и физически перекрывается системной домашней полоской (Home Indicator), препятствуя нажатиям.
* **Пошаговое исправление в `src/components/BottomNav.tsx`:**
  ```tsx
  // Было:
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#f0f0f0] safe-bottom pb-1">
    <div className="grid grid-cols-2 h-14 max-w-md mx-auto">
      <button
        onClick={() => setActiveTab('menu')}
        className={`flex flex-col items-center justify-center gap-1 transition-colors ${
          activeTab === 'menu' ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-600'
        }`}
        aria-label="Вкладка Меню"
      >
        <UtensilsCrossed className="w-5 h-5" />
        <span className="text-[11px] font-semibold tracking-wide">Меню</span>
      </button>

      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center justify-center gap-1 transition-colors ${
          activeTab === 'profile' ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-600'
        }`}
        aria-label="Вкладка Профиль"
      >
        <User className="w-5 h-5" />
        <span className="text-[11px] font-semibold tracking-wide">Профиль</span>
      </button>
    </div>
  </nav>

  // Стало:
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#f0f0f0] pb-[env(safe-area-inset-bottom,0.25rem)]">
    <div className="grid grid-cols-2 min-h-[3.5rem] py-1.5 max-w-md mx-auto">
      <button
        onClick={() => setActiveTab('menu')}
        className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
          activeTab === 'menu' ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-600'
        }`}
        aria-label="Вкладка Меню"
      >
        <UtensilsCrossed className="w-5 h-5 shrink-0" />
        <span className="text-xs font-semibold tracking-wide">Меню</span>
      </button>

      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
          activeTab === 'profile' ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-600'
        }`}
        aria-label="Вкладка Профиль"
      >
        <User className="w-5 h-5 shrink-0" />
        <span className="text-xs font-semibold tracking-wide">Профиль</span>
      </button>
    </div>
  </nav>
  ```

---

### 1.4. Модалка товара: футер с кнопкой добавления и счетчиком
* **Файл:** `src/components/ProductModal.tsx` (строки 235–266)
* **Диагностика:**
  В футере модалки счетчик и кнопка «В корзину» размещены в одну строку с жестким `flex items-center gap-4`. На экране 320px ширина модалки за вычетом паддингов составляет 288px. Счетчик с кнопками `w-9` (36px) и цифрой занимает 120px. Кнопке добавления остается $288 - 120 - 16\ (\text{gap}) = 152\text{ px}$.
  Внутри кнопки:
  ```tsx
  <button className="... flex items-center justify-between">
    <span>В корзину</span>
    <span>{totalPrice} ₽</span>
  </button>
  ```
  При системном зуме текста 200% надписи «В корзину» и «1 250 ₽» суммарно требуют от 230px ширины. Они накладываются друг на друга либо выходят за правую границу экрана.
* **Пошаговое исправление в `src/components/ProductModal.tsx`:**
  ```tsx
  // Было (строки 235-266):
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
      <span className="w-6 text-center font-bold text-sm text-neutral-900">
        {quantity}
      </span>
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

  // Стало:
  <div className="p-3.5 sm:p-5 border-t border-neutral-100 bg-white flex flex-col min-[380px]:flex-row items-stretch min-[380px]:items-center gap-3">
    <div className="flex items-center justify-center gap-2 bg-neutral-100 rounded-2xl p-1 shrink-0 self-center min-[380px]:self-auto">
      <button
        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        disabled={quantity <= 1}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        aria-label="Уменьшить"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="min-w-[1.75rem] text-center font-bold text-sm text-neutral-900 px-1">
        {quantity}
      </span>
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
      className="flex-1 py-3.5 px-4 rounded-2xl bg-[#111111] text-white font-bold text-sm sm:text-base flex items-center justify-between gap-2 hover:bg-neutral-800 active:scale-98 transition-all shadow-md"
    >
      <span className="truncate">В корзину</span>
      <span className="shrink-0">{totalPrice} ₽</span>
    </button>
  </div>
  ```

---

### 1.5. Модалка корзины: сжатие элементов на 320px
* **Файл:** `src/components/CartModal.tsx` (строки 65–135)
* **Диагностика:**
  - Контейнер списка позиций корзины имеет паддинг `p-6` (48px по горизонтали). На экране 320px внутренняя ширина составляет 272px.
  - В карточке позиции фото занимает `w-16 h-16` (64px), блок счетчика с кнопками — 96px, отступы — 12px. Суммарно: 172px.
  - На название блюда, список добавок и цену остается всего 64px. При наличии класса `truncate` название напитка («Капучино») сокращается до одной буквы `К...`.
  - В блоке счетчика ширина цифры зажата в `w-5` (20px). При увеличении системного шрифта в 2 раза двузначные числа («10») не помещаются в 20px и обрезаются.
* **Пошаговое исправление в `src/components/CartModal.tsx`:**
  ```tsx
  // Было (строки 65-135):
  <div className="p-6 overflow-y-auto flex-1 space-y-4">
    {cart.map((cartItem) => (
      <div
        key={cartItem.cartItemId}
        className="flex items-center gap-3 p-3 rounded-2xl border border-neutral-100 bg-neutral-50/50"
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
          ...
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-neutral-900 truncate">
            {cartItem.item.name}
          </h4>
          ...
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl p-1 shrink-0">
          <button ... className="w-7 h-7 ...">...</button>
          <span className="w-5 text-center text-xs font-bold text-neutral-800">
            {cartItem.quantity}
          </span>
          <button ... className="w-7 h-7 ...">...</button>
        </div>
      </div>
    ))}
  </div>

  // Стало:
  <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-3 sm:space-y-4">
    {cart.map((cartItem) => (
      <div
        key={cartItem.cartItemId}
        className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border border-neutral-100 bg-neutral-50/50"
      >
        <div className="w-12 h-12 min-[360px]:w-16 min-[360px]:h-16 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
          {cartItem.item.image_url ? (
            <img
              src={getAssetUrl(cartItem.item.image_url)}
              alt={cartItem.item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
              Кофе
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-xs min-[360px]:text-sm text-neutral-900 truncate">
            {cartItem.item.name}
          </h4>
          {cartItem.selectedOptions.length > 0 && (
            <p className="text-[11px] text-neutral-500 truncate mt-0.5">
              {cartItem.selectedOptions.map((o) => o.name).join(', ')}
            </p>
          )}
          <div className="font-extrabold text-xs min-[360px]:text-sm text-neutral-900 mt-1">
            {cartItem.totalPrice} ₽
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl p-0.5 min-[360px]:p-1 shrink-0">
          <button
            onClick={() => updateCartQuantity(cartItem.cartItemId, -1)}
            className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
            aria-label="Уменьшить количество"
          >
            {cartItem.quantity === 1 ? (
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
          </button>
          <span className="min-w-[1.25rem] text-center text-xs font-bold text-neutral-800 px-0.5">
            {cartItem.quantity}
          </span>
          <button
            onClick={() => updateCartQuantity(cartItem.cartItemId, 1)}
            className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
            aria-label="Увеличить количество"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    ))}
  </div>
  ```

---

### 1.6. Строки часов и телефонов кофеен: отсутствие `flex-wrap`
* **Файлы:**
  - `src/components/LocationModal.tsx` (строка 131)
  - `src/components/ProfileView.tsx` (строка 228)
* **Диагностика:**
  В карточке кофейни часы работы и телефон объединены во flex-контейнер без права переноса:
  ```tsx
  <div className="flex items-center gap-4 text-xs text-neutral-500 pt-0.5">
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
  ```
  Строка часов («08:00 - 23:00» с иконкой) занимает ~90px, телефон («+7 (924) 539-28-03») — ~130px, зазор `gap-4` — 16px. Итого: 236px.
  Внутри модалки на экране 320px полезная ширина карточки составляет всего 208px. Блок гарантированно распирает карточку вбок и вызывает горизонтальный скролл страницы.
* **Пошаговое исправление:**
  Заменить класс `flex items-center gap-4` в обоих файлах на:
  ```tsx
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 pt-0.5">
  ```

---

## 2. Война специфичности (Specificity Wars) и неиспользуемый CSS

### 2.1. Конфликт каскадных слоев Tailwind v4 и неиспользуемых правил в `globals.css`
* **Файл:** `src/app/globals.css` (строки 28–56)
* **Диагностика:**
  В файле стилей присутствуют правила:
  ```css
  .btn-gorkiy-primary {
    background-color: #111111;
    color: #ffffff;
    border-radius: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  .btn-gorkiy-outline { ... }
  ```
  1. **Мертвый код:** Ни один компонент в проекте не использует эти классы. Везде применены длинные перечисления утилитных классов Tailwind.
  2. **Архитектурный конфликт с Tailwind v4:** В Tailwind CSS v4 директива `@import "tailwindcss";` автоматически помещает сгенерированные утилиты в `@layer utilities`. Любые селекторы, написанные в корне CSS без указания `@layer`, по стандарту CSS Cascade Layers считаются **unlayered** (нестилизованными в слои). Спецификация CSS гласит: **unlayered styles всегда перебивают стили из слоев `@layer`**, независимо от селекторной специфичности. Если назначить класс `.btn-gorkiy-primary` на кнопку и попытаться изменить фон через `className="btn-gorkiy-primary bg-neutral-800"`, фоновый цвет не изменится, пока разработчик не поставит форсированный флаг `!bg-neutral-800` (`!important`).
* **Пошаговое исправление в `src/app/globals.css`:**
  Обернуть кастомные классы в `@layer components`:
  ```css
  @import "tailwindcss";

  :root {
    --background: #ffffff;
    --foreground: #111111;
    --secondary: #666666;
    --border: #e5e5e5;
    --card: #f9f9f9;
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-manrope), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Скрытие системного скроллбара */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Базовые кнопки в каскадном слое components */
  @layer components {
    .btn-gorkiy-primary {
      background-color: #111111;
      color: #ffffff;
      border-radius: 1rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .btn-gorkiy-primary:hover {
      background-color: #262626;
    }
    .btn-gorkiy-primary:active {
      transform: scale(0.98);
    }

    .btn-gorkiy-outline {
      background-color: #ffffff;
      color: #111111;
      border: 2px solid #111111;
      border-radius: 1rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .btn-gorkiy-outline:hover {
      background-color: #f5f5f5;
    }
    .btn-gorkiy-outline:active {
      transform: scale(0.98);
    }
  }
  ```

---

## 3. Проблемы с `z-index` и Stacking Context

### 3.1. Хаос уровней z-index и двойное наложение бэкдропов
* **Файлы:**
  - `src/components/Header.tsx` (`z-40`)
  - `src/components/BottomNav.tsx` (`z-40`)
  - `src/components/CategoryBar.tsx` (`z-30`)
  - `src/components/CartButton.tsx` (`z-30`)
  - `src/components/ProductModal.tsx` (`z-50`)
  - `src/components/CartModal.tsx` (`z-50`)
  - `src/components/LocationModal.tsx` (`z-50`)
  - `src/components/CheckoutModal.tsx` (`z-60`)
  - `src/components/OrderStatusModal.tsx` (`z-60`)
* **Диагностика:**
  1. `LocationModal` (`z-50`), `CartModal` (`z-50`) и `ProductModal` (`z-50`) имеют одинаковый z-индекс. При открытии выбора точки из хедера при открытой корзине порядок наложения случаен и зависит от расположения в DOM-дереве.
  2. `CheckoutModal` вызывается прямо внутри `CartModal.tsx` (строка 169). В результате активны одновременно два полупрозрачных оверлея с классом `backdrop-blur-xs` и `bg-black/60`. Это приводит к двойному затемнению экрана (до 85%) и вызывает падение FPS и артефакты рендеринга на мобильных GPU (iOS WebKit).
  3. Классы `backdrop-blur-md` на `Header` и `BottomNav` принудительно создают новый stacking context. Любые выпадающие меню внутри них не могут подняться выше своего родителя без выноса в React Portal.
* **Пошаговое исправление:**
  1. Установить системную шкалу z-index:
     - `Header`, `BottomNav`, `CategoryBar`: `z-30`
     - Плавающая кнопка корзины (`CartButton`): `z-35`
     - Модальные окна первого уровня (`ProductModal`, `CartModal`, `LocationModal`): `z-50`
     - Вложенные диалоги подтверждения (`CheckoutModal`, `OrderStatusModal`): `z-60`
  2. В `CartModal.tsx` при открытии чекаута скрывать бэкдроп родительской модалки:
     ```tsx
     // В CartModal.tsx
     const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

     // На оверлее CartModal (строка 28):
     className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-200 ${
       isCheckoutOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
     }`}
     ```

---

## 4. Мобильные формы: предотвращение автозума на iOS Safari

* **Файлы:**
  - `src/components/CheckoutModal.tsx` (строки 137, 145, 236)
  - `src/components/ProfileView.tsx` (строки 127, 136)
  - `src/app/admin/page.tsx` (все инпуты и textarea)
  - `src/app/layout.tsx` (экспорт viewport)
* **Диагностика:**
  Во всех полях ввода в проекте задан размер шрифта `text-sm` (14px).
  В браузере Apple Safari на устройствах iOS при фокусе на `<input>`, `<select>` или `<textarea>` с размером шрифта менее 16px (`1rem` / `text-base`) активируется **принудительный автоматический зум страницы**. Страница увеличивается, ломает мобильную сетку сайта и после закрытия клавиатуры не возвращается в исходное состояние, оставляя интерфейс со сдвигом вправо.
* **Пошаговое исправление:**
  1. Заменить во всех полях ввода `text-sm` на `text-base sm:text-sm`:
     ```tsx
     // В src/components/CheckoutModal.tsx:
     <input
       type="text"
       placeholder="Ваше имя"
       value={name}
       onChange={(e) => setName(e.target.value)}
       required
       className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-base sm:text-sm"
     />
     <input
       type="tel"
       placeholder="Телефон для связи (+7 ...)"
       value={phone}
       onChange={(e) => setPhone(e.target.value)}
       required
       className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-base sm:text-sm"
     />
     <textarea
       placeholder="Например: без корицы, сахар отдельно..."
       value={comment}
       onChange={(e) => setComment(e.target.value)}
       rows={2}
       className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#111111] focus:outline-none text-base sm:text-sm resize-none"
     />
     ```
  2. Аналогично в `src/components/ProfileView.tsx` (строки 127, 136) и `src/app/admin/page.tsx`.
  3. В `src/app/layout.tsx` добавить экспорт `viewport`:
     ```tsx
     import type { Metadata, Viewport } from "next";

     export const viewport: Viewport = {
       width: "device-width",
       initialScale: 1,
       maximumScale: 5,
     };
     ```

---

## 5. Использование фиксированных `px` вместо `rem / % / ch`

1. **Микрошрифты `text-[10px]` и `text-[11px]`:**
   - Встречаются в `BottomNav.tsx`, `CheckoutModal.tsx`, `LocationModal.tsx`, `OrderStatusModal.tsx`, `ProfileView.tsx`, `admin/page.tsx`.
   - Запрещены стандартами доступности WCAG (минимальный рекомендуемый размер — 12px / 0.75rem). Текст в пикселях игнорирует настройки масштабирования шрифтов браузера.
   - **Решение:** Заменить все `text-[10px]` и `text-[11px]` на `text-xs` (`0.75rem`).
2. **Фиксированные высоты контейнеров:**
   - `Header.tsx`: `h-16` (64px) $\to$ заменить на `min-h-16 h-auto py-2`.
   - `BottomNav.tsx`: `h-14` (56px) $\to$ заменить на `min-h-[3.5rem] py-1.5`.
   - `CategoryBar.tsx`: класс `sticky top-16` опирается на то, что высота хедера всегда строго 64px. Если хедер растягивается, sticky-панель заезжает под шапку.
3. **Фиксированные пиксельные ограничения ширины:**
   - `Header.tsx`: `max-w-[130px]` $\to$ заменить на `max-w-[16ch] min-[360px]:max-w-[22ch]`.
   - `ProductModal.tsx` и `CartModal.tsx`: `w-5`, `w-6` (ширина счетчиков) $\to$ заменить на `min-w-[1.75rem] px-1`.

---

## 6. Проблемы со скроллом и переполнением (Overflow)

### 6.1. Утечка скролла под модальными окнами (Scroll Chaining)
* **Файлы:**
  - `src/components/ProductModal.tsx`
  - `src/components/CartModal.tsx`
  - `src/components/CheckoutModal.tsx`
  - `src/components/LocationModal.tsx`
  - `src/components/OrderStatusModal.tsx`
* **Диагностика:**
  Ни в одном модальном окне нет блокировки фонового скролла `document.body`. Когда пользователь на мобильном прокручивает модалку до верхней или нижней точки, браузер передает импульс скролла родительской странице. Происходит дергание шапки, сдвиг фиксированных элементов и эффект резинки (overscroll bounce).
* **Пошаговое исправление:**
  1. Во все модалки добавить хук блокировки скролла:
     ```tsx
     React.useEffect(() => {
       const originalOverflow = document.body.style.overflow;
       document.body.style.overflow = 'hidden';
       return () => {
         document.body.style.overflow = originalOverflow;
       };
     }, []);
     ```
  2. На все скролл-контейнеры модалок (`overflow-y-auto`) добавить класс `overscroll-contain`:
     ```tsx
     <div className="overflow-y-auto overscroll-contain flex-1 ...">
     ```

### 6.2. Отсутствие визуальных подсказок скролла в `.no-scrollbar`
* **Файл:** `src/components/CategoryBar.tsx` (строки 14–35)
* **Диагностика:**
  Скрытие скроллбара (`no-scrollbar`) на устройствах без тачскрина скрывает факт того, что категории продолжаются за правым краем экрана.
* **Пошаговое исправление:**
  Добавить полупрозрачные градиентные маски по краям контейнера:
  ```tsx
  <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-100 py-2.5 px-3 sm:px-4">
    <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
      {categories.map((cat) => {
        const isActive = cat.id === activeCategory;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`shrink-0 px-3.5 py-1.5 min-[360px]:px-4 min-[360px]:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              isActive
                ? 'bg-[#111111] text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  </div>
  ```

### 6.3. Рассинхронизация скролла категорий меню
* **Файл:** `src/components/MenuView.tsx` (строки 21–29, 54)
* **Диагностика:**
  В функции `handleSelectCategory` захардкожен сдвиг `yOffset = -120`, а в секциях прописан класс `scroll-mt-32` (128px). При масштабировании шрифта x2 или росте высоты шапки заголовок категории оказывается перекрыт полосой категорий.
* **Пошаговое исправление:**
  Использовать нативный метод `scrollIntoView`:
  ```tsx
  const handleSelectCategory = (catId: string) => {
    setActiveCategoryId(catId);
    const element = categoryRefs.current[catId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  ```
  И в секции категории (строка 54):
  ```tsx
  <section
    key={category.id}
    ref={(el) => {
      categoryRefs.current[category.id] = el;
    }}
    className="scroll-mt-36"
  >
  ```

---

## 7. Чек-лист приемочного тестирования после правок

1. **Тестирование 320px (Chrome DevTools Mobile Responsive):**
   - [ ] Открыть сайт на ширине 320px. Убедиться, что отсутствует горизонтальная полоса прокрутки (`document.documentElement.scrollWidth === 320`).
   - [ ] В каталоге карточки меню корректно отображаются в одну колонку (или адаптируются без наплыва цен).
   - [ ] Шапка и название кофейни не вызывают распирания экрана.
2. **Тестирование увеличения шрифта (200% Text Zoom / OS Accessibility Text Scaling):**
   - [ ] В браузере выставить масштаб только текста 200%.
   - [ ] Проверить, что ни одна кнопка, цена («1 250 ₽») или бейдж не обрезаются.
   - [ ] Нижняя панель навигации увеличивается по высоте и не накладывает текст на иконки.
3. **Тестирование форм на мобильных (iOS Safari):**
   - [ ] Кликнуть на поле «Ваше имя» в модалке оформления заказа на iPhone. Страница **не должна зумироваться**.
4. **Тестирование модальных окон и скролла:**
   - [ ] Открыть модалку товара и модалку корзины. Фоновая страница под модалкой не скроллится при прокрутке до упора.
   - [ ] Открыть оформление заказа: наложение двух бэкдропов отсутствует, экран не темнеет до полной черноты.
5. **Тестирование специфичности CSS:**
   - [ ] Запустить `npm run build` — сборка проходит без предупреждений каскада.
   - [ ] Классы `.btn-gorkiy-*` изолированы в `@layer components`.
