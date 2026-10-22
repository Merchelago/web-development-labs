"""Тесты категорий, статусов, статистики и обработки ошибок БД."""
from app import create_app


def test_list_categories(client):
    r = client.get("/api/categories")
    assert r.status_code == 200
    names = [c["name"] for c in r.get_json()]
    assert names == sorted(names)
    assert "Учёба" in names


def test_create_category_and_duplicate(client):
    r = client.post("/api/categories", json={"name": "Хобби", "color": "#20C997"})
    assert r.status_code == 201
    assert r.get_json()["color"] == "#20c997"
    dup = client.post("/api/categories", json={"name": "Хобби"})
    assert dup.status_code == 409  # UNIQUE (name)


def test_delete_category_in_use_returns_409(client):
    r = client.delete("/api/categories/1")
    assert r.status_code == 409  # на категорию ссылаются задачи (ON DELETE RESTRICT)
    assert client.get("/api/categories/1").status_code == 200


def test_delete_empty_category(client):
    cat = client.post("/api/categories", json={"name": "Временная"}).get_json()
    assert client.delete(f"/api/categories/{cat['id']}").status_code == 204


def test_statuses(client):
    codes = [s["code"] for s in client.get("/api/statuses").get_json()]
    assert codes == ["new", "in_progress", "done"]


def test_stats(client):
    s = client.get("/api/stats").get_json()
    assert s["total"] == 12
    assert s["done"] == 3
    assert s["active"] == 9
    assert s["overdue"] == 2
    assert s["completion_rate"] == 25.0
    assert sum(x["count"] for x in s["by_status"]) == 12


def test_stats_change_after_completing_task(client):
    client.patch("/api/tasks/5/status", json={"status": "done"})
    s = client.get("/api/stats").get_json()
    assert s["done"] == 4
    assert s["overdue"] == 1


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_database_unavailable_returns_503(app):
    broken = create_app({"DB_NAME": app.config["DB_NAME"], "DB_PORT": 5999})
    r = broken.test_client().get("/api/tasks")
    assert r.status_code == 503
    assert r.get_json() == {"error": "База данных недоступна, повторите запрос позже"}
