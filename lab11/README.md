# Практическая работа 11. Backend на Node.js с PostgreSQL

- **Студент:** Ананьев Александр Николаевич, ПГТУ
- **Вариант 1:** «Список задач» — REST API для управления персональными задачами

**Стек:** Node.js 22, Express 5, PostgreSQL 17 (драйвер `pg`), dotenv; тесты — `node:test` + supertest; клиент — React (Vite) из практической работы 10.

## Структура

```
lab11/
├── src/
│   ├── app.js                  # Express-приложение: middleware, маршруты, обработка ошибок
│   ├── server.js               # запуск HTTP-сервера, корректное завершение
│   ├── config.js               # параметры из переменных окружения (.env)
│   ├── db/database.js          # пул соединений pg, параметризованные запросы, транзакции
│   ├── controllers/            # tasksController.js, categoriesController.js
│   ├── routes/                 # tasksRoutes.js, categoriesRoutes.js
│   ├── middleware/             # validate.js (валидация), errorHandler.js (JSON-ошибки)
│   └── utils/httpError.js
├── sql/schema.sql, sql/seed.sql
├── scripts/init-db.js          # создание таблиц + демо-данные
├── scripts/pretty.js           # форматирование ответов curl в консоли
├── requests/*.json             # тела запросов для ручного тестирования
├── test/api.test.js            # 20 автотестов API
└── client/                     # React-клиент, подключённый к API
```

## База данных

`categories (id, name UNIQUE, color)` ← `tasks (…, category_id FK, status_id FK, priority CHECK, due_date, created_at, completed_at)` → `statuses (id, code, name)`

## REST API

| Метод | Адрес | Назначение |
|---|---|---|
| GET | `/api/tasks?search=&category_id=&status=&priority=&overdue=&due=&sort=&order=` | список задач с поиском, фильтрами и сортировкой (created_at, due_date, priority, title) |
| GET | `/api/tasks/stats` | статистика: всего, выполнено, активных, просроченных, по категориям и приоритетам |
| GET | `/api/tasks/:id` | одна задача |
| POST | `/api/tasks` | создание (201 + Location) |
| PUT | `/api/tasks/:id` | полное обновление |
| PATCH | `/api/tasks/:id` | частичное обновление |
| PATCH | `/api/tasks/:id/status` | смена статуса `new` / `in_progress` / `done` |
| DELETE | `/api/tasks/:id` | удаление |
| GET, POST, PUT, DELETE | `/api/categories[/:id]` | категории (удаление занятой категории → 409) |
| GET | `/api/statuses` | справочник статусов |
| GET | `/api/health` | проверка сервера и соединения с БД |

Ошибки возвращаются в формате `{ "error": "…", "details": { "поле": "…" } }` с кодами 400, 404, 409, 503, 500.

## Запуск

```bash
# 1. База данных
createdb -U postgres lab11_tasks           # и lab11_tasks_test для тестов
cp .env.example .env                       # указать пароль и порт PostgreSQL
npm install
npm run db:init                            # schema.sql + seed.sql
# (то же вручную: psql -U postgres -d lab11_tasks -f sql/schema.sql -f sql/seed.sql)

# 2. API
npm start                                  # http://localhost:3011/api
npm test                                   # автотесты на базе DB_NAME_TEST

# 3. React-клиент
cd client
npm install
npm run dev                                # http://localhost:5311 (запросы /api проксируются на :3011)
```
