-- Структура базы данных «Список задач» (ЛР12, вариант 1)
-- Повторный запуск пересоздаёт таблицы.

DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS statuses;
DROP TABLE IF EXISTS categories;

-- Категории — тематические группы задач
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    color       VARCHAR(7)   NOT NULL DEFAULT '#6c757d' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Статусы — справочник состояний задачи
CREATE TABLE statuses (
    id          SMALLINT    PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE,          -- машинное имя для API
    name        VARCHAR(30) NOT NULL UNIQUE,          -- название для интерфейса
    is_final    BOOLEAN     NOT NULL DEFAULT FALSE    -- задача считается завершённой
);

-- Задачи
CREATE TABLE tasks (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(150) NOT NULL CHECK (length(trim(title)) > 0),
    description   TEXT,
    category_id   INTEGER      REFERENCES categories (id) ON DELETE RESTRICT,
    status_id     SMALLINT     NOT NULL DEFAULT 1 REFERENCES statuses (id),
    priority      SMALLINT     NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3), -- 1 низкий, 2 средний, 3 высокий
    due_date      DATE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_tasks_status   ON tasks (status_id);
CREATE INDEX idx_tasks_category ON tasks (category_id);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);

-- Автоматическое обновление updated_at при любом изменении задачи
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
