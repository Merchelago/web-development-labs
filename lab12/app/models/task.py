"""Модель задачи: SQL-выборка и преобразование строки БД в JSON-ответ."""
from ..validators import PRIORITY_NAMES

SELECT_TASKS = """
    SELECT t.id, t.title, t.description, t.priority, t.due_date,
           t.created_at, t.updated_at, t.completed_at,
           c.id AS category_id, c.name AS category_name, c.color AS category_color,
           s.code AS status_code, s.name AS status_name, s.is_final,
           COALESCE(t.due_date < CURRENT_DATE AND NOT s.is_final, FALSE) AS is_overdue,
           count(*) OVER () AS total_count
    FROM tasks t
    JOIN statuses s ON s.id = t.status_id
    LEFT JOIN categories c ON c.id = t.category_id
"""

# Белый список колонок сортировки — в ORDER BY нельзя передавать параметр запроса напрямую
SORT_COLUMNS = {
    "created_at": "t.created_at",
    "due_date": "t.due_date",
    "priority": "t.priority",
    "title": "t.title",
}


def task_to_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "category": None if row["category_id"] is None else {
            "id": row["category_id"], "name": row["category_name"], "color": row["category_color"],
        },
        "status": {"code": row["status_code"], "name": row["status_name"]},
        "priority": PRIORITY_NAMES[row["priority"]],
        "due_date": row["due_date"],
        "is_overdue": row["is_overdue"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "completed_at": row["completed_at"],
    }
