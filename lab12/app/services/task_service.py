"""Бизнес-логика задач: SQL-запросы к PostgreSQL."""
from ..db.database import execute, query_all, query_one
from ..errors import NotFoundError, ValidationError
from ..models.task import SELECT_TASKS, SORT_COLUMNS, task_to_dict
from .status_service import status_map


def _ensure_category(category_id):
    if category_id is not None and not query_one("SELECT 1 FROM categories WHERE id = %s", (category_id,)):
        raise ValidationError({"category_id": f"Категория с id={category_id} не существует"})


def list_tasks(f):
    where, params = [], []
    if f.get("status"):
        where.append("s.code = ANY(%s)")
        params.append(f["status"])
    if "category_id" in f:
        where.append("t.category_id = %s")
        params.append(f["category_id"])
    if "priority" in f:
        where.append("t.priority = %s")
        params.append(f["priority"])
    if f.get("q"):
        where.append("t.title ILIKE %s")
        params.append(f"%{f['q']}%")
    if "overdue" in f:
        cond = "COALESCE(t.due_date < CURRENT_DATE AND NOT s.is_final, FALSE)"
        where.append(cond if f["overdue"] else f"NOT {cond}")

    sql = SELECT_TASKS
    if where:
        sql += " WHERE " + " AND ".join(where)
    direction = "ASC" if f["order"] == "asc" else "DESC"
    sql += f" ORDER BY {SORT_COLUMNS[f['sort']]} {direction} NULLS LAST, t.id LIMIT %s OFFSET %s"
    rows = query_all(sql, params + [f["limit"], f["offset"]])
    return {
        "items": [task_to_dict(r) for r in rows],
        "total": rows[0]["total_count"] if rows else 0,
        "limit": f["limit"],
        "offset": f["offset"],
    }


def get_task(task_id):
    row = query_one(SELECT_TASKS + " WHERE t.id = %s", (task_id,))
    if row is None:
        raise NotFoundError(f"Задача с id={task_id} не найдена")
    return task_to_dict(row)


def create_task(data):
    _ensure_category(data.get("category_id"))
    status = status_map()[data.get("status", "new")]
    row, _ = execute(
        """INSERT INTO tasks (title, description, category_id, status_id, priority, due_date, completed_at)
           VALUES (%s, %s, %s, %s, %s, %s, CASE WHEN %s THEN now() END)
           RETURNING id""",
        (data["title"], data.get("description"), data.get("category_id"), status["id"],
         data.get("priority", 2), data.get("due_date"), status["is_final"]),
    )
    return get_task(row["id"])


def update_task(task_id, data):
    """PUT — полная замена редактируемых полей; статус меняется, только если передан."""
    _ensure_category(data.get("category_id"))
    sets = ["title = %s", "description = %s", "category_id = %s", "priority = %s", "due_date = %s"]
    params = [data["title"], data.get("description"), data.get("category_id"),
              data.get("priority", 2), data.get("due_date")]
    if "status" in data:
        status = status_map()[data["status"]]
        sets += ["status_id = %s",
                 "completed_at = CASE WHEN %s THEN COALESCE(completed_at, now()) END"]
        params += [status["id"], status["is_final"]]
    row, _ = execute(f"UPDATE tasks SET {', '.join(sets)} WHERE id = %s RETURNING id", params + [task_id])
    if row is None:
        raise NotFoundError(f"Задача с id={task_id} не найдена")
    return get_task(task_id)


def set_status(task_id, code):
    """Отметка о выполнении или возврат задачи в активное состояние."""
    status = status_map()[code]
    row, _ = execute(
        """UPDATE tasks
           SET status_id = %s,
               completed_at = CASE WHEN %s THEN COALESCE(completed_at, now()) END
           WHERE id = %s RETURNING id""",
        (status["id"], status["is_final"], task_id),
    )
    if row is None:
        raise NotFoundError(f"Задача с id={task_id} не найдена")
    return get_task(task_id)


def delete_task(task_id):
    row, _ = execute("DELETE FROM tasks WHERE id = %s RETURNING id", (task_id,))
    if row is None:
        raise NotFoundError(f"Задача с id={task_id} не найдена")


def get_stats():
    totals = query_one("""
        SELECT count(*) AS total,
               count(*) FILTER (WHERE s.is_final) AS done,
               count(*) FILTER (WHERE NOT s.is_final) AS active,
               count(*) FILTER (WHERE NOT s.is_final AND t.due_date < CURRENT_DATE) AS overdue,
               count(*) FILTER (WHERE NOT s.is_final AND t.due_date = CURRENT_DATE) AS due_today
        FROM tasks t JOIN statuses s ON s.id = t.status_id
    """)
    by_status = query_all("""
        SELECT s.code, s.name, count(t.id) AS count
        FROM statuses s LEFT JOIN tasks t ON t.status_id = s.id
        GROUP BY s.id ORDER BY s.id
    """)
    by_category = query_all("""
        SELECT c.id, COALESCE(c.name, 'Без категории') AS name, count(*) AS count
        FROM tasks t LEFT JOIN categories c ON c.id = t.category_id
        GROUP BY c.id, c.name ORDER BY count DESC, name
    """)
    by_priority = {p: 0 for p in ("low", "medium", "high")}
    for r in query_all("SELECT priority, count(*) AS count FROM tasks GROUP BY priority"):
        by_priority[{1: "low", 2: "medium", 3: "high"}[r["priority"]]] = r["count"]
    total = totals["total"]
    return {
        **totals,
        "completion_rate": round(totals["done"] * 100 / total, 1) if total else 0.0,
        "by_status": by_status,
        "by_category": by_category,
        "by_priority": by_priority,
    }
