"""Бизнес-логика категорий."""
from ..db.database import execute, query_all, query_one
from ..errors import NotFoundError
from ..models.category import SELECT_CATEGORIES, category_to_dict

GROUP_BY = " GROUP BY c.id"


def list_categories():
    return [category_to_dict(r) for r in query_all(SELECT_CATEGORIES + GROUP_BY + " ORDER BY c.name")]


def get_category(category_id):
    row = query_one(SELECT_CATEGORIES + " WHERE c.id = %s" + GROUP_BY, (category_id,))
    if row is None:
        raise NotFoundError(f"Категория с id={category_id} не найдена")
    return category_to_dict(row)


def create_category(data):
    row, _ = execute("INSERT INTO categories (name, color) VALUES (%s, COALESCE(%s, '#6c757d')) RETURNING id",
                     (data["name"], data.get("color")))
    return get_category(row["id"])


def update_category(category_id, data):
    row, _ = execute("UPDATE categories SET name = %s, color = COALESCE(%s, color) WHERE id = %s RETURNING id",
                     (data["name"], data.get("color"), category_id))
    if row is None:
        raise NotFoundError(f"Категория с id={category_id} не найдена")
    return get_category(category_id)


def delete_category(category_id):
    # Если на категорию ссылаются задачи, PostgreSQL отклонит удаление (ON DELETE RESTRICT) → 409
    row, _ = execute("DELETE FROM categories WHERE id = %s RETURNING id", (category_id,))
    if row is None:
        raise NotFoundError(f"Категория с id={category_id} не найдена")
