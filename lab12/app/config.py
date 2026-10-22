"""Настройки приложения. Значения берутся из переменных окружения (файл .env)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
# Уже заданные переменные окружения имеют приоритет над .env
load_dotenv(BASE_DIR / ".env", override=False)


def _origins(value):
    return [o.strip() for o in value.split(",") if o.strip()]


class Config:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "lab12_tasks")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    PORT = int(os.getenv("PORT", "5012"))
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    CORS_ORIGINS = _origins(os.getenv("CORS_ORIGINS", "http://localhost:5173"))

    SQL_DIR = BASE_DIR / "sql"
