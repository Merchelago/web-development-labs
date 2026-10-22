"""Статистика по задачам: /api/stats."""
from flask import Blueprint

from ..services.task_service import get_stats

bp = Blueprint("stats", __name__, url_prefix="/api/stats")


@bp.get("")
def stats():
    return get_stats()
