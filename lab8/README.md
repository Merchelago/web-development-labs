# Практическая работа №8. Создание веб-интерфейса с использованием Bootstrap

**Студент:** Ананьев Александр Николаевич, ПГТУ
**Вариант 1:** сайт научной конференции «ВолгаТех-2026»

Одностраничный адаптивный сайт международной научно-практической конференции «Цифровые технологии и интеллектуальные системы» (демонстрационные данные). Вёрстка выполнена на Bootstrap 5.3 по графическому концепту варианта.

## Структура проекта

```
lab8/
├── index.html                       — страница конференции
├── css/style.css                    — фирменные цвета, типографика, декоративные элементы
├── js/script.js                     — инициализация tooltip и проверка форм Bootstrap
├── images/                          — фото, логотип, SVG-иллюстрации спикеров
├── files/programma-volgatech-2026.pdf — программа для скачивания
└── screenshots/                     — снимки для отчёта
```

## Использованные возможности Bootstrap

- **Сетка:** `container`, `row`, `col-lg-8` / `col-lg-4`, `row-cols-*`, адаптивные отступы `g-4 g-lg-5`.
- **Компоненты:** navbar (collapse + dropdown), scrollspy, nav-pills с tab-content, accordion, collapse, card, badge, progress, list-group, table, alert, modal, carousel, tooltip, ratio.
- **Формы:** form-floating, form-control, form-select, form-check, input-group, встроенная проверка (`needs-validation`, `invalid-feedback`).
- **Utility-классы:** отступы (`mt-*`, `p-*`, `gap-*`), flex (`d-flex`, `justify-content-*`, `align-items-*`), отображение (`d-none`, `d-sm-inline`), тени (`shadow`, `shadow-sm`), скругления (`rounded-4`), цвета (`text-bg-*`, `bg-opacity-75`), `visually-hidden`.

## Запуск

Откройте `index.html` в браузере. Bootstrap, иконки и шрифт подключаются через CDN, поэтому нужен интернет. Карта площадки — встроенная карта OpenStreetMap.

## Проверка

- Ширины 1440, 820 и 390 px: горизонтальной прокрутки нет.
- W3C Nu Html Checker: ошибок и предупреждений нет. W3C CSS Validator: ошибок нет.
- Консоль браузера: ошибок нет.

## Источники изображений

- Фото залов: Wikimedia Commons — Ifremer / Olivier Dugornay (CC BY 4.0); NASA & ESA (CC BY 4.0).
- Главный корпус ПГТУ: Wikimedia Commons, автор Alkort (CC BY 3.0).
- Иллюстрации спикеров и логотип нарисованы для проекта (SVG). Имена спикеров и программа вымышлены.
