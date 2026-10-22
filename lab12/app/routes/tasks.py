"""REST API задач: /api/tasks."""
from flask import Blueprint, request

from ..errors import ValidationError
from ..services import task_service
from ..services.status_service import status_map
from ..validators import get_json_body, parse_id, parse_task_filters, validate_task

bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")


@bp.get("")
def list_tasks():
    """Список задач: фильтры status, category_id, priority, q, overdue; сортировка sort/order; limit/offset."""
    filters = parse_task_filters(request.args, list(status_map()))
    return task_service.list_tasks(filters)


@bp.get("/<task_id>")
def get_task(task_id):
    return task_service.get_task(parse_id(task_id))


@bp.post("")
def create_task():
    data = validate_task(get_json_body(), list(status_map()))
    return task_service.create_task(data), 201


@bp.put("/<task_id>")
def update_task(task_id):
    task_id = parse_id(task_id)
    data = validate_task(get_json_body(), list(status_map()))
    return task_service.update_task(task_id, data)


@bp.patch("/<task_id>/status")
def change_status(task_id):
    """Сменить статус: {"status": "done"} — выполнена, {"status": "new"} — вернуть в работу."""
    task_id = parse_id(task_id)
    body = get_json_body()
    if "status" not in body:
        raise ValidationError({"status": "Поле status обязательно"})
    data = validate_task(body, list(status_map()), partial=True)
    return task_service.set_status(task_id, data["status"])


@bp.delete("/<task_id>")
def delete_task(task_id):
    task_service.delete_task(parse_id(task_id))
    return "", 204
