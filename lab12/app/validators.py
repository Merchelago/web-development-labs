"""Разбор и проверка входных данных: тело JSON, ID из адреса, параметры фильтрации."""
import re
from datetime import date

from flask import request

from .errors import HTTP_MESSAGES, ApiError, ValidationError

PRIORITIES = {"low": 1, "medium": 2, "high": 3}
PRIORITY_NAMES = {v: k for k, v in PRIORITIES.items()}
SORT_FIELDS = ("created_at", "due_date", "priority", "title")
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
MAX_INT = 2_147_483_647


def get_json_body():
    """Тело запроса как JSON-объект, иначе 400/415 с понятным сообщением."""
    if not request.get_data():
        raise ApiError(400, "Тело запроса пустое: ожидается JSON-объект")
    if not request.is_json:
        raise ApiError(415, HTTP_MESSAGES[415])
    data = request.get_json(silent=True)
    if data is None:
        raise ApiError(400, "Некорректный JSON в теле запроса")
    if not isinstance(data, dict):
        raise ApiError(400, "Тело запроса должно быть JSON-объектом")
    return data


def parse_id(value, what="ID"):
    if not re.fullmatch(r"\d{1,10}", str(value)) or not 0 < int(value) <= MAX_INT:
        raise ApiError(400, f"Некорректный {what}: ожидается положительное целое число")
    return int(value)


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def validate_task(data, status_codes, partial=False):
    """Проверить поля задачи. partial=True — проверяются только переданные поля.
    Возвращает очищенный словарь; при ошибках — ValidationError со списком полей."""
    errors, clean = {}, {}

    if "title" in data or not partial:
        title = data.get("title")
        if not isinstance(title, str) or not title.strip():
            errors["title"] = "Название обязательно и должно быть непустой строкой"
        elif len(title.strip()) > 150:
            errors["title"] = "Название не должно превышать 150 символов"
        else:
            clean["title"] = title.strip()

    if "description" in data:
        desc = data["description"]
        if desc is not None and not isinstance(desc, str):
            errors["description"] = "Описание должно быть строкой"
        elif desc is not None and len(desc) > 2000:
            errors["description"] = "Описание не должно превышать 2000 символов"
        else:
            clean["description"] = (desc or "").strip() or None  # пустая строка хранится как NULL

    if "category_id" in data:
        cid = data["category_id"]
        if cid is not None and (not _is_int(cid) or not 0 < cid <= MAX_INT):
            errors["category_id"] = "category_id должен быть положительным целым числом или null"
        else:
            clean["category_id"] = cid

    if "priority" in data:
        pr = data["priority"]
        if pr not in PRIORITIES:
            errors["priority"] = "Приоритет должен быть одним из: low, medium, high"
        else:
            clean["priority"] = PRIORITIES[pr]

    if "due_date" in data:
        due = data["due_date"]
        if due is None:
            clean["due_date"] = None
        elif not isinstance(due, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", due):
            errors["due_date"] = "Дата должна быть в формате ГГГГ-ММ-ДД"
        else:
            try:
                clean["due_date"] = date.fromisoformat(due)
            except ValueError:
                errors["due_date"] = "Такой даты не существует"

    if "status" in data:
        st = data["status"]
        if st not in status_codes:
            errors["status"] = "Статус должен быть одним из: " + ", ".join(status_codes)
        else:
            clean["status"] = st

    if errors:
        raise ValidationError(errors)
    return clean


def validate_category(data, partial=False):
    errors, clean = {}, {}
    if "name" in data or not partial:
        name = data.get("name")
        if not isinstance(name, str) or not name.strip():
            errors["name"] = "Название категории обязательно"
        elif len(name.strip()) > 50:
            errors["name"] = "Название категории не должно превышать 50 символов"
        else:
            clean["name"] = name.strip()
    if "color" in data:
        color = data["color"]
        if not isinstance(color, str) or not COLOR_RE.match(color):
            errors["color"] = "Цвет задаётся в формате #RRGGBB"
        else:
            clean["color"] = color.lower()
    if errors:
        raise ValidationError(errors)
    return clean


def parse_task_filters(args, status_codes):
    """Параметры строки запроса GET /api/tasks."""
    errors, f = {}, {}

    if args.get("status"):
        codes = [c.strip() for c in args["status"].split(",") if c.strip()]
        bad = [c for c in codes if c not in status_codes]
        if bad:
            errors["status"] = "Неизвестный статус: " + ", ".join(bad)
        f["status"] = codes
    if args.get("category_id"):
        try:
            f["category_id"] = parse_id(args["category_id"], "category_id")
        except ApiError as e:
            errors["category_id"] = e.message
    if args.get("priority"):
        if args["priority"] not in PRIORITIES:
            errors["priority"] = "Допустимые значения: low, medium, high"
        else:
            f["priority"] = PRIORITIES[args["priority"]]
    if args.get("q"):
        f["q"] = args["q"].strip()[:100]
    if args.get("overdue"):
        val = args["overdue"].lower()
        if val not in ("true", "false", "1", "0"):
            errors["overdue"] = "Допустимые значения: true, false"
        else:
            f["overdue"] = val in ("true", "1")

    sort = args.get("sort", "created_at")
    if sort not in SORT_FIELDS:
        errors["sort"] = "Сортировка возможна по полям: " + ", ".join(SORT_FIELDS)
    f["sort"] = sort
    order = args.get("order", "desc").lower()
    if order not in ("asc", "desc"):
        errors["order"] = "Допустимые значения: asc, desc"
    f["order"] = order

    for key, default, lo, hi in (("limit", 50, 1, 100), ("offset", 0, 0, 1_000_000)):
        raw = args.get(key, str(default))
        if not raw.isdigit() or not lo <= int(raw) <= hi:
            errors[key] = f"{key} должен быть целым числом от {lo} до {hi}"
        else:
            f[key] = int(raw)

    if errors:
        raise ValidationError(errors)
    return f
