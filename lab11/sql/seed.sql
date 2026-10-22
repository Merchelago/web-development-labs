-- Демонстрационные данные. Сроки задаются относительно текущей даты, поэтому данные всегда «свежие».
-- Запуск: psql -h localhost -p 5433 -U postgres -d lab11_tasks -f sql/seed.sql

INSERT INTO statuses (id, code, name, is_final) VALUES
    (1, 'new',         'Новая',     FALSE),
    (2, 'in_progress', 'В работе',  FALSE),
    (3, 'done',        'Выполнена', TRUE);

INSERT INTO categories (name, color) VALUES
    ('Учеба',      '#2f80ed'),
    ('Проект',     '#22a861'),
    ('Личное',     '#8b5cf6'),
    ('Разработка', '#f59e0b');

INSERT INTO tasks (title, description, category_id, status_id, priority, due_date, assignee, created_at, completed_at) VALUES
    ('Подготовить презентацию',        'Тема: React компоненты',              1, 2, 'high',   date_trunc('day', now()) + interval '14 hours',          'Ананьев А.',  now() - interval '3 days', NULL),
    ('Изучить React компоненты',       'Практическая работа №10',             1, 3, 'medium', date_trunc('day', now()) + interval '12 hours',          'Ананьев А.',  now() - interval '5 days', now() - interval '2 hours'),
    ('Спроектировать базу данных',     'Таблицы tasks, categories, statuses', 2, 3, 'high',   date_trunc('day', now()) - interval '1 day' + interval '18 hours', 'Ананьев А.', now() - interval '4 days', now() - interval '1 day'),
    ('Реализовать REST API',           'CRUD, фильтры и статистика',          4, 2, 'high',   date_trunc('day', now()) + interval '1 day 10 hours',    'Ананьев А.',  now() - interval '2 days', NULL),
    ('Подключить React-клиент',        'Запросы fetch к /api/tasks',          4, 1, 'medium', date_trunc('day', now()) + interval '2 days 16 hours',   'Ананьев А.',  now() - interval '1 day',  NULL),
    ('Написать автотесты API',         'node:test + supertest',               4, 1, 'medium', date_trunc('day', now()) + interval '3 days 12 hours',   'Анна С.',     now() - interval '1 day',  NULL),
    ('Прочитать документацию pg',      'Пул соединений и параметризованные запросы', 3, 1, 'low', date_trunc('day', now()) + interval '5 days 19 hours', NULL, now() - interval '6 hours', NULL),
    ('Подготовиться к экзамену',       'Повторить основные темы',             1, 1, 'high',   date_trunc('day', now()) - interval '2 days' + interval '16 hours', 'Мария К.', now() - interval '7 days', NULL),
    ('Сдать отчёт по работе №10',      'React-компоненты TaskFlow',           1, 2, 'medium', date_trunc('day', now()) - interval '1 day' + interval '20 hours', 'Ананьев А.', now() - interval '6 days', NULL),
    ('Настроить переменные окружения', 'Файл .env и dotenv',                  4, 3, 'low',    date_trunc('day', now()) - interval '3 days' + interval '11 hours', 'Ананьев А.', now() - interval '8 days', now() - interval '3 days'),
    ('Купить продукты на неделю',      'Список в заметках',                   3, 3, 'low',    date_trunc('day', now()) - interval '1 day' + interval '19 hours', NULL, now() - interval '2 days', now() - interval '20 hours'),
    ('Оформить README проекта',        'Инструкция по запуску',               2, 1, 'low',    NULL, 'Ананьев А.', now() - interval '3 hours', NULL);
