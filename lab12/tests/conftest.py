"""Фикстуры: отдельная тестовая БД, которая пересоздаётся перед каждым тестом."""
import psycopg2
import pytest

from app import create_app
from app.config import Config
from app.db.database import init_db

TEST_DB = Config.DB_NAME + "_test"


def _ensure_test_database():
    conn = psycopg2.connect(host=Config.DB_HOST, port=Config.DB_PORT, dbname="postgres",
                            user=Config.DB_USER, password=Config.DB_PASSWORD)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB,))
        if cur.fetchone() is None:
            cur.execute(f'CREATE DATABASE "{TEST_DB}"')
    conn.close()


@pytest.fixture(scope="session")
def app():
    _ensure_test_database()
    return create_app({"DB_NAME": TEST_DB, "TESTING": True})


@pytest.fixture(autouse=True)
def fresh_db(app):
    init_db(app.config)


@pytest.fixture
def client(app):
    return app.test_client()
