# ЛР12. Flask REST API «Список задач»

Практическая работа 12 «Разработка backend-приложения на Python Flask с использованием PostgreSQL», вариант 1.
Выполнил: Ананьев Александр Николаевич, ПГТУ.

Серверное приложение хранит задачи, категории и статусы в PostgreSQL и предоставляет REST API в формате JSON:
CRUD задач и категорий, смена статуса, поиск, фильтрация, сортировка и статистика. По адресу `/` открывается
простая клиентская страница, которая работает только через API.

## Технологии

Python 3.13, Flask 3.1, psycopg2 (пул соединений), PostgreSQL 17, python-dotenv, flask-cors, pytest.

## Структура

```text
lab12/
├── app/
│   ├── __init__.py          # фабрика приложения, JSON-провайдер, CORS
│   ├── config.py            # настройки из переменных окружения
│   ├── errors.py            # единый формат ошибок, обработчики HTTP и PostgreSQL
│   ├── validators.py        # проверка JSON, ID и параметров фильтрации
│   ├── db/database.py       # пул соединений, запросы, команда init-db
│   ├── models/              # SQL-выборки и преобразование строк в JSON
│   ├── services/            # бизнес-логика (SQL-запросы)
│   ├── routes/              # Blueprint'ы: tasks, categories, statuses, stats, main
│   └── static/              # клиентская страница (HTML, CSS, JS)
├── sql/schema.sql           # таблицы, ключи, ограничения, индексы, триггер
├── sql/seed.sql             # демонстрационные данные
├── requests/                # тела запросов для curl
├── tests/                   # автотесты pytest (отдельная БД *_test)
├── .env.example             # пример настроек
├── requirements.txt
├── pytest.ini
└── run.py                   # точка входа
```

## Запуск

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt

copy .env.example .env            # указать параметры своего PostgreSQL
psql -U postgres -c "CREATE DATABASE lab12_tasks"
flask --app run init-db           # создать таблицы и загрузить демо-данные

python run.py                     # http://127.0.0.1:5012
pytest -v                         # тесты (создают БД lab12_tasks_test)
```

## REST API

| Метод | Адрес | Назначение |
|---|---|---|
| GET | `/api/health` | проверка сервера и подключения к БД |
| GET | `/api/tasks` | список задач: `status`, `category_id`, `priority`, `q`, `overdue`, `sort` (`created_at`, `due_date`, `priority`, `title`), `order`, `limit`, `offset` |
| GET | `/api/tasks/<id>` | задача по ID |
| POST | `/api/tasks` | создание задачи |
| PUT | `/api/tasks/<id>` | изменение задачи |
| PATCH | `/api/tasks/<id>/status` | смена статуса (`new`, `in_progress`, `done`) |
| DELETE | `/api/tasks/<id>` | удаление задачи |
| GET, POST | `/api/categories` | список / создание категорий |
| GET, PUT, DELETE | `/api/categories/<id>` | категория по ID / изменение / удаление |
| GET | `/api/statuses` | справочник статусов |
| GET | `/api/stats` | статистика: всего, выполнено, активных, просроченных |

Пример создания задачи:

```bash
curl -X POST http://127.0.0.1:5012/api/tasks -H "Content-Type: application/json" -d @requests/create_task.json
```

Ошибки возвращаются с соответствующим HTTP-статусом (400, 404, 405, 409, 415, 503, 500) в виде
`{"error": "...", "details": {...}}`.
