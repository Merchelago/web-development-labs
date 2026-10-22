# SafeVision — система контроля промышленной безопасности

Практическая работа №14 «Разработка полностекового web-приложения (FullStack)», вариант 1.
Выполнил: Ананьев Александр Николаевич, ПГТУ.

Fullstack-приложение для мониторинга соблюдения требований промышленной безопасности: регистрация нарушений,
контроль СИЗ по камерам (демонстрационные результаты распознавания), задачи по устранению, уведомления, аналитика и отчёты.

| Часть | Технологии | Каталог |
|---|---|---|
| Клиент: веб-версия администратора (`/admin`) и мобильная версия сотрудника (`/m`) | React 18, React Router, Bootstrap 5, Bootstrap Icons, Chart.js, Vite | `client/` |
| Сервер: REST API | Node.js, Express, pg, bcryptjs, jsonwebtoken, multer, dotenv | `server/` |
| База данных | PostgreSQL 17 | `server/sql/schema.sql`, `server/sql/seed.sql` |

## Запуск

Требуется Node.js 18+ и PostgreSQL.

```bash
# 1. База данных
psql -U postgres -c "CREATE DATABASE lab14_safevision;"

# 2. Сервер (порт 3014)
cd server
copy .env.example .env        # указать параметры подключения к PostgreSQL и JWT_SECRET
npm install
npm run db:init               # таблицы + демонстрационные данные
npm start

# 3. Клиент (порт 5314, запросы /api проксируются на сервер)
cd ../client
npm install
npm run dev
```

Открыть http://localhost:5314.

| Роль | Email | Пароль | Интерфейс |
|---|---|---|---|
| Администратор (руководитель) | admin@safevision.ru | admin123 | веб-версия `/admin` (и мобильная `/m`) |
| Сотрудник (слесарь-ремонтник) | smirnov@safevision.ru | worker123 | мобильная версия `/m` |
| Инженер по охране труда | ivanova@safevision.ru | safety123 | мобильная версия `/m` |

Мобильную версию удобно смотреть в режиме эмуляции устройства в DevTools (ширина 360–430 px).

## Тесты

При запущенном сервере: `cd server && npm test` — интеграционные тесты API (node:test).

## Основные эндпоинты API

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/api/auth/login` | вход, выдача JWT |
| GET | `/api/dashboard?period=today\|7d\|30d` | ключевые показатели |
| GET | `/api/statistics`, `/api/statistics/me` | аналитика (общая и личная) |
| GET/POST/PATCH/DELETE | `/api/violations` (синоним `/api/events`) | журнал нарушений, регистрация (с фото), смена статуса |
| POST | `/api/violations/:id/comments` | комментарий к нарушению |
| GET/POST/PATCH/DELETE | `/api/tasks` | задачи по устранению |
| GET/POST/PUT/DELETE | `/api/objects` | производственные объекты |
| GET/POST/PUT/DELETE | `/api/employees` | сотрудники |
| GET/PATCH | `/api/cameras`, `POST /api/cameras/:id/snapshot` | камеры, разметка кадра, снимок |
| GET/PATCH | `/api/notifications`, `/api/notifications/:id/read` | уведомления |
| POST | `/api/ppe-checks` | проверка СИЗ инспектором |
| GET | `/api/training` | обучающие материалы |
| GET | `/api/reports/summary`, `/api/reports/export?kind=…` | отчёт и выгрузка CSV |

## Учебные упрощения

Реальное подключение к видеокамерам и модель компьютерного зрения не используются: кадры камер — подготовленные
иллюстрации, а результаты распознавания (рамки «Каска», «Жилет», «Нет каски!» и т. д.) хранятся в таблице `detections`.
Все остальные операции (нарушения, задачи, уведомления, сотрудники, объекты, отчёты) выполняются через REST API
и сохраняются в PostgreSQL.
