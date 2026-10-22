-- Начальные данные. Даты задаются относительно текущего дня,
-- чтобы в любой день были и просроченные, и будущие задачи.

INSERT INTO statuses (id, code, name, is_final) VALUES
    (1, 'new',         'Новая',     FALSE),
    (2, 'in_progress', 'В работе',  FALSE),
    (3, 'done',        'Выполнена', TRUE);

INSERT INTO categories (name, color) VALUES
    ('Учёба',    '#0d6efd'),
    ('Работа',   '#6f42c1'),
    ('Дом',      '#198754'),
    ('Здоровье', '#dc3545'),
    ('Покупки',  '#fd7e14');

INSERT INTO tasks (title, description, category_id, status_id, priority, due_date, created_at, completed_at) VALUES
    ('Сдать отчёт по ЛР11',            'Node.js + PostgreSQL, вариант 1',              1, 3, 3, CURRENT_DATE - 2,  now() - interval '9 days', now() - interval '3 days'),
    ('Сделать ЛР12 на Flask',          'REST API для списка задач, тесты pytest',     1, 2, 3, CURRENT_DATE + 2,  now() - interval '2 days', NULL),
    ('Подготовиться к защите ЛР по HTTP', 'Повторить заголовки кэширования',          1, 1, 2, CURRENT_DATE + 5,  now() - interval '1 day',  NULL),
    ('Прочитать главу про индексы',    'PostgreSQL: B-tree, EXPLAIN ANALYZE',          1, 1, 1, CURRENT_DATE + 10, now() - interval '6 hours', NULL),
    ('Оплатить интернет',              NULL,                                           3, 1, 3, CURRENT_DATE - 1,  now() - interval '5 days', NULL),
    ('Разобрать балкон',               'Вынести старые коробки',                       3, 1, 1, CURRENT_DATE + 14, now() - interval '4 days', NULL),
    ('Записаться к стоматологу',       'Плановый осмотр',                              4, 2, 2, CURRENT_DATE - 3,  now() - interval '8 days', NULL),
    ('Пробежка 5 км',                  'Парк у набережной',                            4, 3, 1, CURRENT_DATE - 1,  now() - interval '3 days', now() - interval '1 day'),
    ('Купить продукты на неделю',      'Овощи, крупы, молоко',                         5, 1, 2, CURRENT_DATE,      now() - interval '12 hours', NULL),
    ('Подарок сестре на день рождения', NULL,                                          5, 2, 2, CURRENT_DATE + 7,  now() - interval '2 days', NULL),
    ('Обновить резюме',                'Добавить проекты по веб-разработке',           2, 1, 2, NULL,              now() - interval '7 days', NULL),
    ('Созвон с командой проекта',      'Обсудить API и макеты',                        2, 3, 3, CURRENT_DATE - 4,  now() - interval '6 days', now() - interval '4 days');
