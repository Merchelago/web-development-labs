-- Схема базы данных «Список задач» (практическая работа 11, вариант 1)
-- Запуск: psql -h localhost -p 5433 -U postgres -d lab11_tasks -f sql/schema.sql

DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS statuses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Категории: тематические группы задач
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    color       VARCHAR(7)  NOT NULL DEFAULT '#2f80ed' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Статусы: справочник состояний задачи
CREATE TABLE statuses (
    id        SMALLINT PRIMARY KEY,
    code      VARCHAR(20) NOT NULL UNIQUE,   -- машинное имя для API
    name      VARCHAR(30) NOT NULL UNIQUE,   -- название для интерфейса
    is_final  BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Задачи
CREATE TABLE tasks (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(200) NOT NULL CHECK (char_length(btrim(title)) >= 3),
    description   TEXT         NOT NULL DEFAULT '',
    category_id   INTEGER      REFERENCES categories (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status_id     SMALLINT     NOT NULL DEFAULT 1 REFERENCES statuses (id),
    priority      VARCHAR(10)  NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date      TIMESTAMPTZ,
    assignee      VARCHAR(80),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_tasks_category ON tasks (category_id);
CREATE INDEX idx_tasks_status   ON tasks (status_id);
CREATE INDEX idx_tasks_due      ON tasks (due_date);

COMMENT ON TABLE tasks IS 'Персональные задачи пользователя';
COMMENT ON COLUMN tasks.priority IS 'low — низкий, medium — средний, high — высокий';
COMMENT ON COLUMN tasks.completed_at IS 'Заполняется при переводе задачи в статус «Выполнена»';
