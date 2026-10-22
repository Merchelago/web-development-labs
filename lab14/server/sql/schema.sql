-- SafeVision — система контроля промышленной безопасности
-- Схема базы данных PostgreSQL

DROP TABLE IF EXISTS violation_comments, detections, notifications, tasks, ppe_checks,
    violations, violation_types, cameras, training_materials, users, media, employees, facilities CASCADE;

-- Производственные объекты и зоны (цеха, склады, территория)
CREATE TABLE facilities (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    type            VARCHAR(20)  NOT NULL CHECK (type IN ('workshop', 'warehouse', 'territory', 'other')),
    description     TEXT,
    location        VARCHAR(200),
    responsible_id  INTEGER,                 -- FK добавляется после создания employees
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Сотрудники предприятия
CREATE TABLE employees (
    id           SERIAL PRIMARY KEY,
    full_name    VARCHAR(150) NOT NULL,
    position     VARCHAR(100) NOT NULL,
    department   VARCHAR(100) NOT NULL,
    facility_id  INTEGER REFERENCES facilities (id) ON DELETE SET NULL,
    phone        VARCHAR(30),
    email        VARCHAR(120),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    hired_at     DATE         NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE facilities
    ADD CONSTRAINT facilities_responsible_fk FOREIGN KEY (responsible_id) REFERENCES employees (id) ON DELETE SET NULL;

-- Пользователи системы и их роли (пароль хранится только в виде bcrypt-хеша)
CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    email          VARCHAR(120) NOT NULL UNIQUE,
    password_hash  VARCHAR(100) NOT NULL,
    role           VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'employee')),
    employee_id    INTEGER UNIQUE REFERENCES employees (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Фотографии, кадры камер и другие медиафайлы
CREATE TABLE media (
    id             SERIAL PRIMARY KEY,
    file_path      VARCHAR(255) NOT NULL,          -- путь относительно сервера: /media/... или /uploads/...
    original_name  VARCHAR(255),
    mime_type      VARCHAR(60)  NOT NULL,
    size_bytes     INTEGER      NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
    kind           VARCHAR(20)  NOT NULL CHECK (kind IN ('frame', 'photo', 'snapshot', 'training')),
    uploaded_by    INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Камеры видеонаблюдения
CREATE TABLE cameras (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    facility_id  INTEGER      NOT NULL REFERENCES facilities (id) ON DELETE CASCADE,
    location     VARCHAR(200),
    status       VARCHAR(10)  NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline')),
    resolution   VARCHAR(20)  NOT NULL DEFAULT '1920x1080',
    frame_id     INTEGER REFERENCES media (id) ON DELETE SET NULL,   -- текущий (демонстрационный) кадр
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Категории нарушений
CREATE TABLE violation_types (
    id     SERIAL PRIMARY KEY,
    code   VARCHAR(30)  NOT NULL UNIQUE,
    name   VARCHAR(100) NOT NULL,
    color  VARCHAR(7)   NOT NULL DEFAULT '#6b7280'
);

-- Зарегистрированные нарушения
CREATE TABLE violations (
    id           SERIAL PRIMARY KEY,
    type_id      INTEGER      NOT NULL REFERENCES violation_types (id),
    facility_id  INTEGER      NOT NULL REFERENCES facilities (id) ON DELETE CASCADE,
    camera_id    INTEGER REFERENCES cameras (id) ON DELETE SET NULL,
    employee_id  INTEGER REFERENCES employees (id) ON DELETE SET NULL,   -- нарушитель (если установлен)
    reported_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,       -- кто зарегистрировал вручную
    source       VARCHAR(10)  NOT NULL DEFAULT 'camera' CHECK (source IN ('camera', 'mobile', 'manual')),
    detected_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    severity     VARCHAR(10)  NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description  TEXT,
    media_id     INTEGER REFERENCES media (id) ON DELETE SET NULL,
    status       VARCHAR(15)  NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX violations_detected_idx ON violations (detected_at);
CREATE INDEX violations_status_idx ON violations (status);

-- Комментарии к нарушениям
CREATE TABLE violation_comments (
    id            SERIAL PRIMARY KEY,
    violation_id  INTEGER     NOT NULL REFERENCES violations (id) ON DELETE CASCADE,
    user_id       INTEGER REFERENCES users (id) ON DELETE SET NULL,
    text          TEXT        NOT NULL CHECK (length(trim(text)) > 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Результаты распознавания (рамки на кадре камеры), координаты — доли от размера кадра
CREATE TABLE detections (
    id            SERIAL PRIMARY KEY,
    camera_id     INTEGER      NOT NULL REFERENCES cameras (id) ON DELETE CASCADE,
    label         VARCHAR(30)  NOT NULL,
    is_violation  BOOLEAN      NOT NULL DEFAULT FALSE,
    confidence    NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    x NUMERIC(5,4) NOT NULL, y NUMERIC(5,4) NOT NULL, w NUMERIC(5,4) NOT NULL, h NUMERIC(5,4) NOT NULL,
    violation_id  INTEGER REFERENCES violations (id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Проверки соблюдения требований к СИЗ (автоматические по камерам и ручные инспекторские)
CREATE TABLE ppe_checks (
    id             SERIAL PRIMARY KEY,
    facility_id    INTEGER     NOT NULL REFERENCES facilities (id) ON DELETE CASCADE,
    camera_id      INTEGER REFERENCES cameras (id) ON DELETE SET NULL,
    employee_id    INTEGER REFERENCES employees (id) ON DELETE SET NULL,
    inspector_id   INTEGER REFERENCES users (id) ON DELETE SET NULL,
    source         VARCHAR(10) NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'inspector')),
    has_helmet     BOOLEAN     NOT NULL DEFAULT TRUE,
    has_vest       BOOLEAN     NOT NULL DEFAULT TRUE,
    has_glasses    BOOLEAN     NOT NULL DEFAULT TRUE,
    has_violation  BOOLEAN     NOT NULL DEFAULT FALSE,
    checked_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ppe_checks_checked_idx ON ppe_checks (checked_at);

-- Задачи по устранению нарушений и плановые мероприятия
CREATE TABLE tasks (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    assignee_id   INTEGER      NOT NULL REFERENCES employees (id),
    created_by    INTEGER REFERENCES users (id) ON DELETE SET NULL,
    violation_id  INTEGER REFERENCES violations (id) ON DELETE SET NULL,
    facility_id   INTEGER REFERENCES facilities (id) ON DELETE SET NULL,
    priority      VARCHAR(10)  NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date      DATE,
    status        VARCHAR(15)  NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
    result        TEXT,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Уведомления пользователей
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category    VARCHAR(10)  NOT NULL DEFAULT 'system' CHECK (category IN ('important', 'system')),
    type        VARCHAR(15)  NOT NULL CHECK (type IN ('violation', 'task', 'status', 'instruction', 'inspection')),
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    link        VARCHAR(200),
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, is_read);

-- Инструкции и обучающие материалы по охране труда
CREATE TABLE training_materials (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    kind          VARCHAR(10)  NOT NULL CHECK (kind IN ('video', 'document')),
    topic         VARCHAR(50)  NOT NULL,
    duration_sec  INTEGER CHECK (duration_sec > 0),
    file_size_kb  INTEGER CHECK (file_size_kb > 0),
    image_id      INTEGER REFERENCES media (id) ON DELETE SET NULL,
    content       TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK ((kind = 'video' AND duration_sec IS NOT NULL) OR (kind = 'document' AND file_size_kb IS NOT NULL))
);
