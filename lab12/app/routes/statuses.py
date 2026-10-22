"""Справочник статусов: /api/statuses."""
from flask import Blueprint

from ..services.status_service import list_statuses

bp = Blueprint("statuses", __name__, url_prefix="/api/statuses")


@bp.get("")
def statuses():
    return list_statuses()
