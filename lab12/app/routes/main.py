"""Служебные маршруты: клиентская страница, описание API, проверка подключения к БД."""
from flask import Blueprint, current_app

from ..db.database import query_one

bp = Blueprint("main", __name__)

ENDPOINTS = [
    ("GET", "/api/health", "проверка работы сервера и подключения к PostgreSQL"),
    ("GET", "/api/tasks", "список задач (фильтры: status, category_id, priority, q, overdue; sort, order, limit, offset)"),
    ("GET", "/api/tasks/<id>", "задача по ID"),
    ("POST", "/api/tasks", "создание задачи"),
    ("PUT", "/api/tasks/<id>", "изменение задачи"),
    ("PATCH", "/api/tasks/<id>/status", "смена статуса задачи"),
    ("DELETE", "/api/tasks/<id>", "удаление задачи"),
    ("GET", "/api/categories", "список категорий"),
    ("GET", "/api/categories/<id>", "категория по ID"),
    ("POST", "/api/categories", "создание категории"),
    ("PUT", "/api/categories/<id>", "изменение категории"),
    ("DELETE", "/api/categories/<id>", "удаление категории"),
    ("GET", "/api/statuses", "справочник статусов"),
    ("GET", "/api/stats", "статистика: всего, выполнено, активных, просроченных"),
]


@bp.get("/")
def index():
    return current_app.send_static_file("index.html")


@bp.get("/api")
def api_index():
    return {
        "name": "Список задач — Flask REST API",
        "endpoints": [{"method": m, "path": p, "description": d} for m, p, d in ENDPOINTS],
    }


@bp.get("/api/health")
def health():
    row = query_one("SELECT current_database() AS db, now() AS server_time, "
                    "split_part(version(), ' ', 2) AS version")
    return {"status": "ok", "database": row["db"], "postgres_version": row["version"],
            "server_time": row["server_time"]}
