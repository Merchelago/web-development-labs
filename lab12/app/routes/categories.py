"""REST API категорий: /api/categories."""
from flask import Blueprint

from ..services import category_service
from ..validators import get_json_body, parse_id, validate_category

bp = Blueprint("categories", __name__, url_prefix="/api/categories")


@bp.get("")
def list_categories():
    return category_service.list_categories()


@bp.get("/<category_id>")
def get_category(category_id):
    return category_service.get_category(parse_id(category_id))


@bp.post("")
def create_category():
    return category_service.create_category(validate_category(get_json_body())), 201


@bp.put("/<category_id>")
def update_category(category_id):
    category_id = parse_id(category_id)
    return category_service.update_category(category_id, validate_category(get_json_body()))


@bp.delete("/<category_id>")
def delete_category(category_id):
    category_service.delete_category(parse_id(category_id))
    return "", 204
