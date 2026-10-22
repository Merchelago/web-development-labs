"""Подключение к PostgreSQL: пул соединений, выполнение запросов, инициализация БД."""
import click
import psycopg2
from flask import current_app, g
from psycopg2 import pool
from psycopg2.extras import RealDictCursor


def _connect_params(cfg, dbname=None):
    return dict(host=cfg["DB_HOST"], port=cfg["DB_PORT"], dbname=dbname or cfg["DB_NAME"],
                user=cfg["DB_USER"], password=cfg["DB_PASSWORD"], connect_timeout=3)


def _get_pool():
    """Пул создаётся при первом запросе: приложение стартует даже без БД
    и в этом случае отвечает 503, а не падает."""
    db_pool = current_app.extensions.get("db_pool")
    if db_pool is None:
        db_pool = pool.ThreadedConnectionPool(1, 10, **_connect_params(current_app.config))
        current_app.extensions["db_pool"] = db_pool
    return db_pool


def get_db():
    """Соединение, закреплённое за текущим запросом."""
    if "db" not in g:
        g.db = _get_pool().getconn()
    return g.db


def close_db(exc=None):
    conn = g.pop("db", None)
    if conn is None:
        return
    broken = conn.closed != 0
    if not broken:
        conn.rollback()  # незафиксированные изменения (например, после ошибки) отменяются
    current_app.extensions["db_pool"].putconn(conn, close=broken)


def query_all(sql, params=None):
    with get_db().cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def query_one(sql, params=None):
    with get_db().cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def execute(sql, params=None):
    """Изменяющий запрос; фиксирует транзакцию. Возвращает строку RETURNING (если есть)
    и количество затронутых строк."""
    conn = get_db()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        row = cur.fetchone() if cur.description else None
        count = cur.rowcount
    conn.commit()
    return row, count


def init_db(cfg=None):
    """Создать таблицы (sql/schema.sql) и заполнить начальными данными (sql/seed.sql)."""
    cfg = cfg or current_app.config
    conn = psycopg2.connect(**_connect_params(cfg))
    try:
        with conn, conn.cursor() as cur:
            for name in ("schema.sql", "seed.sql"):
                cur.execute((cfg["SQL_DIR"] / name).read_text(encoding="utf-8"))
    finally:
        conn.close()


@click.command("init-db")
def init_db_command():
    """Пересоздать структуру БД и загрузить демонстрационные данные."""
    init_db()
    cfg = current_app.config
    click.echo(f"База данных {cfg['DB_NAME']} на {cfg['DB_HOST']}:{cfg['DB_PORT']} инициализирована "
               f"(schema.sql + seed.sql).")


def init_app(app):
    app.extensions["db_pool"] = None
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
