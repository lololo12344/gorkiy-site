import { Location, Category, MenuItem, OptionGroup } from '@/types/database';

export const INITIAL_LOCATIONS: Location[] = [
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Горький на Арбате",
    "address": "г. Нальчик, ул. Кабардинская, 4А",
    "phone": "+7 (930) 450-00-03",
    "hours": "08:00 - 23:00",
    "telegram_chat_id": null,
    "is_accepting_orders": true
  },
  {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Горький на Ашурова",
    "address": "г. Нальчик, ул. Ашурова, 1Б",
    "phone": "+7 (964) 380-00-07",
    "hours": "08:00 - 23:00",
    "telegram_chat_id": null,
    "is_accepting_orders": true
  },
  {
    "id": "33333333-3333-3333-3333-333333333333",
    "name": "Горький на Кулиева",
    "address": "г. Нальчик, пр. Кулиева, 2В",
    "phone": "+7 (906) 730-00-02",
    "hours": "08:00 - 23:00",
    "telegram_chat_id": null,
    "is_accepting_orders": true
  },
  {
    "id": "44444444-4444-4444-4444-444444444444",
    "name": "Горький в ТЦ Среда",
    "address": "г. Нальчик, ул. Чернышевского, 177, ТЦ Среда, 4 этаж",
    "phone": "+7 (924) 539-28-03",
    "hours": "10:00 - 22:00",
    "telegram_chat_id": null,
    "is_accepting_orders": true
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    "id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Завтраки",
    "sort_order": 1
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000002",
    "name": "Каши",
    "sort_order": 2
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Сэндвичи и брускетты",
    "sort_order": 3
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000004",
    "name": "Салаты",
    "sort_order": 4
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000005",
    "name": "Супы",
    "sort_order": 5
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000006",
    "name": "Горячие блюда",
    "sort_order": 6
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Классические напитки",
    "sort_order": 7
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000008",
    "name": "Авторские напитки",
    "sort_order": 8
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000009",
    "name": "Чаи",
    "sort_order": 9
  },
  {
    "id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Холодные напитки",
    "sort_order": 10
  }
];

export const INITIAL_OPTION_GROUPS: OptionGroup[] = [
  {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "name": "Объем",
    "is_required": true,
    "min_select": 1,
    "max_select": 1,
    "sort_order": 1,
    "options": [
      {
        "id": "bbbbbbbb-0001-0000-0000-000000000001",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "name": "Стандарт (250 мл)",
        "price_delta": 0,
        "sort_order": 1
      },
      {
        "id": "bbbbbbbb-0001-0000-0000-000000000002",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "name": "Большой (350 мл)",
        "price_delta": 50,
        "sort_order": 2
      },
      {
        "id": "bbbbbbbb-0001-0000-0000-000000000003",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "name": "Гранде (450 мл)",
        "price_delta": 90,
        "sort_order": 3
      }
    ]
  },
  {
    "id": "aaaaaaaa-0000-0000-0000-000000000002",
    "name": "Молоко",
    "is_required": false,
    "min_select": 0,
    "max_select": 1,
    "sort_order": 2,
    "options": [
      {
        "id": "bbbbbbbb-0002-0000-0000-000000000001",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000002",
        "name": "Кокосовое молоко",
        "price_delta": 70,
        "sort_order": 1
      },
      {
        "id": "bbbbbbbb-0002-0000-0000-000000000002",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000002",
        "name": "Овсяное молоко",
        "price_delta": 70,
        "sort_order": 2
      },
      {
        "id": "bbbbbbbb-0002-0000-0000-000000000003",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000002",
        "name": "Миндальное молоко",
        "price_delta": 80,
        "sort_order": 3
      },
      {
        "id": "bbbbbbbb-0002-0000-0000-000000000004",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000002",
        "name": "Банановое молоко",
        "price_delta": 80,
        "sort_order": 4
      }
    ]
  },
  {
    "id": "aaaaaaaa-0000-0000-0000-000000000003",
    "name": "Сироп",
    "is_required": false,
    "min_select": 0,
    "max_select": 2,
    "sort_order": 3,
    "options": [
      {
        "id": "bbbbbbbb-0003-0000-0000-000000000001",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000003",
        "name": "Ванильный",
        "price_delta": 40,
        "sort_order": 1
      },
      {
        "id": "bbbbbbbb-0003-0000-0000-000000000002",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000003",
        "name": "Карамельный",
        "price_delta": 40,
        "sort_order": 2
      },
      {
        "id": "bbbbbbbb-0003-0000-0000-000000000003",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000003",
        "name": "Соленая карамель",
        "price_delta": 40,
        "sort_order": 3
      },
      {
        "id": "bbbbbbbb-0003-0000-0000-000000000004",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000003",
        "name": "Лавандовый",
        "price_delta": 40,
        "sort_order": 4
      },
      {
        "id": "bbbbbbbb-0003-0000-0000-000000000005",
        "group_id": "aaaaaaaa-0000-0000-0000-000000000003",
        "name": "Кокосовый",
        "price_delta": 40,
        "sort_order": 5
      }
    ]
  }
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    "id": "dddddddd-0000-0000-0000-000000000001",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Панкейки",
    "description": "",
    "base_price": 390,
    "image_url": "/menu/item_794043781622.jpg",
    "is_active": true,
    "sort_order": 1
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000002",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Кесадилья классическая",
    "description": "",
    "base_price": 320,
    "image_url": "/menu/item_779612658292.jpg",
    "is_active": true,
    "sort_order": 2
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000003",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Сэндвич с курицей на булочке Бриошь",
    "description": "",
    "base_price": 390,
    "image_url": "/menu/item_444690205702.jpg",
    "is_active": true,
    "sort_order": 3
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000004",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Бриошь «Сливочная»",
    "description": "",
    "base_price": 490,
    "image_url": "/menu/item_777990351472.jpg",
    "is_active": true,
    "sort_order": 4
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000005",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Бриошь карамелизированная с мороженым и фисташкой",
    "description": "",
    "base_price": 370,
    "image_url": "/menu/item_459905530792.jpg",
    "is_active": true,
    "sort_order": 5
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000006",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Брускетта Бриошь с лососем и авокадо",
    "description": "",
    "base_price": 580,
    "image_url": "/menu/item_913570207712.jpg",
    "is_active": true,
    "sort_order": 6
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000007",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Ассорти мини брускетт",
    "description": "",
    "base_price": 370,
    "image_url": "/menu/item_701866354552.jpg",
    "is_active": true,
    "sort_order": 7
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000008",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Завтрак «у Бабушки»",
    "description": "",
    "base_price": 380,
    "image_url": "/menu/item_392783581822.jpg",
    "is_active": true,
    "sort_order": 8
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000009",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Авторский Шеф завтрак",
    "description": "",
    "base_price": 710,
    "image_url": "/menu/item_629782806282.jpg",
    "is_active": true,
    "sort_order": 9
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000000a",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Завтрак с охотничьими колбасками и овощами",
    "description": "",
    "base_price": 660,
    "image_url": "/menu/item_235420930852.jpg",
    "is_active": true,
    "sort_order": 10
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000000b",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Омлет с норвежским лососем шеф-посола и страчателлой",
    "description": "",
    "base_price": 570,
    "image_url": "/menu/item_110452934362.jpg",
    "is_active": true,
    "sort_order": 11
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000000c",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Шакшука по-арабски",
    "description": "",
    "base_price": 390,
    "image_url": "/menu/item_338582271222.jpg",
    "is_active": true,
    "sort_order": 12
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000000d",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Сырники со сметаной, пряным черничным джемом и цедрой",
    "description": "",
    "base_price": 390,
    "image_url": "/menu/item_721797581772.jpg",
    "is_active": true,
    "sort_order": 13
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000000e",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Гречка с грибами и яйцом пашот",
    "description": "",
    "base_price": 320,
    "image_url": "/menu/item_476131714912.jpg",
    "is_active": true,
    "sort_order": 14
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000000f",
    "category_id": "cccccccc-0000-0000-0000-000000000001",
    "name": "Блины со сливочным муссом, бананом и шоколадом",
    "description": "",
    "base_price": 360,
    "image_url": "/menu/item_399293300002.jpg",
    "is_active": true,
    "sort_order": 15
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000010",
    "category_id": "cccccccc-0000-0000-0000-000000000004",
    "name": "Цезарь с авторским соусом с курицей",
    "description": "",
    "base_price": 520,
    "image_url": "/menu/item_214441037572.jpg",
    "is_active": true,
    "sort_order": 16
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000011",
    "category_id": "cccccccc-0000-0000-0000-000000000002",
    "name": "Каша овсяная на кокосовом молоке с ягодами",
    "description": "",
    "base_price": 260,
    "image_url": "/menu/item_763317488192.jpg",
    "is_active": true,
    "sort_order": 17
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000012",
    "category_id": "cccccccc-0000-0000-0000-000000000002",
    "name": "Каша рисовая с бананом в карамели",
    "description": "",
    "base_price": 250,
    "image_url": "/menu/item_474548501412.jpg",
    "is_active": true,
    "sort_order": 18
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000013",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Горячая брускетта с курицей",
    "description": "",
    "base_price": 390,
    "image_url": "/menu/item_500162628162.jpg",
    "is_active": true,
    "sort_order": 19
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000014",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Скрэмбл с креветкой на тосте",
    "description": "",
    "base_price": 510,
    "image_url": "/menu/item_821020392942.jpg",
    "is_active": true,
    "sort_order": 20
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000015",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Сэндвич с лососем",
    "description": "",
    "base_price": 460,
    "image_url": "/menu/item_349703323672.jpg",
    "is_active": true,
    "sort_order": 21
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000016",
    "category_id": "cccccccc-0000-0000-0000-000000000003",
    "name": "Сэндвич с курицей",
    "description": "",
    "base_price": 380,
    "image_url": "/menu/item_923779062542.jpg",
    "is_active": true,
    "sort_order": 22
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000017",
    "category_id": "cccccccc-0000-0000-0000-000000000006",
    "name": "Паста с куриным филе и грибами",
    "description": "",
    "base_price": 530,
    "image_url": "/menu/item_561547856172.jpg",
    "is_active": true,
    "sort_order": 23
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000018",
    "category_id": "cccccccc-0000-0000-0000-000000000005",
    "name": "Том ям",
    "description": "",
    "base_price": 590,
    "image_url": "/menu/item_403205368512.jpg",
    "is_active": true,
    "sort_order": 24
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000019",
    "category_id": "cccccccc-0000-0000-0000-000000000005",
    "name": "Чечевичный суп",
    "description": "",
    "base_price": 280,
    "image_url": "/menu/item_107833935652.jpg",
    "is_active": true,
    "sort_order": 25
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000001a",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Эспрессо",
    "description": "Классический насыщенный эспрессо. Подается без добавок и модификаторов.",
    "base_price": 220,
    "image_url": "/menu/item_675680498442.jpg",
    "is_active": true,
    "sort_order": 26,
    "is_recipe_fixed": true,
    "allowed_option_group_ids": []
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000001b",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Small Double",
    "description": "",
    "base_price": 220,
    "image_url": "/menu/item_363661119172.jpg",
    "is_active": true,
    "sort_order": 27
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000001c",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Американо",
    "description": "",
    "base_price": 220,
    "image_url": "/menu/item_234146354952.jpg",
    "is_active": true,
    "sort_order": 28
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000001d",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Фильтр кофе",
    "description": "",
    "base_price": 220,
    "image_url": "/menu/item_146073541462.jpg",
    "is_active": true,
    "sort_order": 29
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000001e",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Капучино",
    "description": "",
    "base_price": 240,
    "image_url": "/menu/item_474555381172.jpg",
    "is_active": true,
    "sort_order": 30
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000001f",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Флэт уайт",
    "description": "",
    "base_price": 250,
    "image_url": "/menu/item_287998397422.jpg",
    "is_active": true,
    "sort_order": 31
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000020",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Латте",
    "description": "",
    "base_price": 280,
    "image_url": "/menu/item_506243028802.jpg",
    "is_active": true,
    "sort_order": 32
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000021",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Раф",
    "description": "",
    "base_price": 290,
    "image_url": "/menu/item_165895117752.jpg",
    "is_active": true,
    "sort_order": 33
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000022",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Hario V60",
    "description": "",
    "base_price": 240,
    "image_url": "/menu/item_647131004872.jpg",
    "is_active": true,
    "sort_order": 34
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000023",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Горячий шоколад",
    "description": "",
    "base_price": 250,
    "image_url": "/menu/item_714879311962.jpg",
    "is_active": true,
    "sort_order": 35
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000024",
    "category_id": "cccccccc-0000-0000-0000-000000000007",
    "name": "Какао",
    "description": "",
    "base_price": 240,
    "image_url": "/menu/item_667160863232.jpg",
    "is_active": true,
    "sort_order": 36
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000025",
    "category_id": "cccccccc-0000-0000-0000-000000000008",
    "name": "Раф малина",
    "description": "",
    "base_price": 350,
    "image_url": "/menu/item_104591498632.jpg",
    "is_active": true,
    "sort_order": 37
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000026",
    "category_id": "cccccccc-0000-0000-0000-000000000008",
    "name": "Капучино дыня-карамель",
    "description": "",
    "base_price": 330,
    "image_url": "/menu/item_533407055492.jpg",
    "is_active": true,
    "sort_order": 38
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000027",
    "category_id": "cccccccc-0000-0000-0000-000000000009",
    "name": "Чай облепиховый",
    "description": "",
    "base_price": 290,
    "image_url": "/menu/item_354700967662.jpg",
    "is_active": true,
    "sort_order": 39
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000028",
    "category_id": "cccccccc-0000-0000-0000-000000000009",
    "name": "Чай имбирный",
    "description": "",
    "base_price": 290,
    "image_url": "/menu/item_286807896562.jpg",
    "is_active": true,
    "sort_order": 40
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000029",
    "category_id": "cccccccc-0000-0000-0000-000000000009",
    "name": "Листовая классика",
    "description": "",
    "base_price": 200,
    "image_url": "/menu/item_694593952712.jpg",
    "is_active": true,
    "sort_order": 41
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000002a",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Айс-латте",
    "description": "",
    "base_price": 280,
    "image_url": "/menu/item_566400129942.jpg",
    "is_active": true,
    "sort_order": 42
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000002b",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Эспрессо-тоник",
    "description": "",
    "base_price": 270,
    "image_url": "/menu/item_851216648802.jpg",
    "is_active": true,
    "sort_order": 43
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000002c",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Бамбл",
    "description": "",
    "base_price": 280,
    "image_url": "/menu/item_400980497842.jpg",
    "is_active": true,
    "sort_order": 44
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000002d",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Cold Brew",
    "description": "",
    "base_price": 330,
    "image_url": "/menu/item_216387484372.jpg",
    "is_active": true,
    "sort_order": 45
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000002e",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Лимонад манго-маракуйя",
    "description": "",
    "base_price": 330,
    "image_url": "/menu/item_456953913542.jpg",
    "is_active": true,
    "sort_order": 46
  },
  {
    "id": "dddddddd-0000-0000-0000-00000000002f",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Смузи ягодный",
    "description": "",
    "base_price": 350,
    "image_url": "/menu/item_585267418922.jpg",
    "is_active": true,
    "sort_order": 47
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000030",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Милкшейк Oreo",
    "description": "",
    "base_price": 360,
    "image_url": "/menu/item_287882240172.jpg",
    "is_active": true,
    "sort_order": 48
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000031",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Милкшейк банан-карамель",
    "description": "",
    "base_price": 360,
    "image_url": "/menu/item_292366743462.jpg",
    "is_active": true,
    "sort_order": 49
  },
  {
    "id": "dddddddd-0000-0000-0000-000000000032",
    "category_id": "cccccccc-0000-0000-0000-000000000010",
    "name": "Милкшейк шоколад",
    "description": "",
    "base_price": 260,
    "image_url": "/menu/item_415080762202.jpg",
    "is_active": true,
    "sort_order": 50
  }
];
