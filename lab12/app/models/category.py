"""Модель категории."""

SELECT_CATEGORIES = """
    SELECT c.id, c.name, c.color, c.created_at, count(t.id) AS tasks_count
    FROM categories c
    LEFT JOIN tasks t ON t.category_id = c.id
"""


def category_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "color": row["color"],
        "tasks_count": row["tasks_count"],
        "created_at": row["created_at"],
    }
