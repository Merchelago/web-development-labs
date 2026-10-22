from ..db.database import query_all


def list_statuses():
    return query_all("SELECT id, code, name, is_final FROM statuses ORDER BY id")


def status_map():
    """{код статуса: строка статуса} — для проверки и перевода кода в id."""
    return {s["code"]: s for s in list_statuses()}
