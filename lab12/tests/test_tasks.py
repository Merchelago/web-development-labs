"""Тесты REST API задач."""
from datetime import date, timedelta

NEW_TASK = {"title": "Написать тесты", "description": "pytest + Flask test client",
            "category_id": 1, "priority": "high", "due_date": "2030-01-15"}


def test_list_tasks_returns_seed_data(client):
    r = client.get("/api/tasks")
    assert r.status_code == 200
    body = r.get_json()
    assert body["total"] == 12
    assert len(body["items"]) == 12
    first = body["items"][0]
    assert set(first) >= {"id", "title", "category", "status", "priority", "due_date", "is_overdue"}


def test_get_task_by_id(client):
    r = client.get("/api/tasks/1")
    assert r.status_code == 200
    assert r.get_json()["title"] == "Сдать отчёт по ЛР11"


def test_get_missing_task_returns_404(client):
    r = client.get("/api/tasks/9999")
    assert r.status_code == 404
    assert r.get_json() == {"error": "Задача с id=9999 не найдена"}


def test_invalid_id_returns_400(client):
    r = client.get("/api/tasks/abc")
    assert r.status_code == 400
    assert "Некорректный ID" in r.get_json()["error"]


def test_create_task(client):
    r = client.post("/api/tasks", json=NEW_TASK)
    assert r.status_code == 201
    task = r.get_json()
    assert task["id"] == 13
    assert task["status"]["code"] == "new"
    assert task["category"]["name"] == "Учёба"
    assert task["priority"] == "high"
    assert client.get("/api/tasks").get_json()["total"] == 13


def test_create_task_validation_errors(client):
    r = client.post("/api/tasks", json={"title": "  ", "priority": "urgent", "due_date": "2026-02-30"})
    assert r.status_code == 400
    details = r.get_json()["details"]
    assert set(details) == {"title", "priority", "due_date"}


def test_create_task_unknown_category(client):
    r = client.post("/api/tasks", json={"title": "Задача", "category_id": 99})
    assert r.status_code == 400
    assert r.get_json()["details"]["category_id"] == "Категория с id=99 не существует"


def test_malformed_json_returns_400(client):
    r = client.post("/api/tasks", data='{"title": "без кавычки}', content_type="application/json")
    assert r.status_code == 400
    assert r.get_json()["error"] == "Некорректный JSON в теле запроса"


def test_wrong_content_type_returns_415(client):
    r = client.post("/api/tasks", data="title=test", content_type="application/x-www-form-urlencoded")
    assert r.status_code == 415


def test_update_task(client):
    r = client.put("/api/tasks/3", json={"title": "Подготовиться к защите ЛР2", "priority": "high",
                                         "category_id": 1, "due_date": "2030-05-01", "status": "in_progress"})
    assert r.status_code == 200
    task = r.get_json()
    assert task["title"] == "Подготовиться к защите ЛР2"
    assert task["status"]["code"] == "in_progress"
    assert task["updated_at"] >= task["created_at"]


def test_update_missing_task_returns_404(client):
    r = client.put("/api/tasks/500", json={"title": "Нет такой"})
    assert r.status_code == 404


def test_change_status_done_and_back(client):
    r = client.patch("/api/tasks/2/status", json={"status": "done"})
    assert r.status_code == 200
    assert r.get_json()["completed_at"] is not None
    r = client.patch("/api/tasks/2/status", json={"status": "new"})
    assert r.get_json()["status"]["code"] == "new"
    assert r.get_json()["completed_at"] is None


def test_change_status_requires_valid_status(client):
    assert client.patch("/api/tasks/2/status", json={}).status_code == 400
    assert client.patch("/api/tasks/2/status", json={"status": "archived"}).status_code == 400


def test_delete_task(client):
    assert client.delete("/api/tasks/5").status_code == 204
    assert client.get("/api/tasks/5").status_code == 404
    assert client.delete("/api/tasks/5").status_code == 404


def test_filter_by_status(client):
    items = client.get("/api/tasks?status=done").get_json()["items"]
    assert len(items) == 3
    assert all(t["status"]["code"] == "done" for t in items)


def test_filter_unknown_status_returns_400(client):
    r = client.get("/api/tasks?status=lost")
    assert r.status_code == 400


def test_search_and_category_filter(client):
    items = client.get("/api/tasks?q=лр&category_id=1").get_json()["items"]
    assert {t["id"] for t in items} == {1, 2, 3}


def test_sort_by_priority_desc(client):
    items = client.get("/api/tasks?sort=priority&order=desc").get_json()["items"]
    levels = [{"low": 1, "medium": 2, "high": 3}[t["priority"]] for t in items]
    assert levels == sorted(levels, reverse=True)


def test_sort_by_due_date_puts_nulls_last(client):
    items = client.get("/api/tasks?sort=due_date&order=asc").get_json()["items"]
    assert items[-1]["due_date"] is None
    dates = [t["due_date"] for t in items if t["due_date"]]
    assert dates == sorted(dates)


def test_overdue_filter(client):
    items = client.get("/api/tasks?overdue=true").get_json()["items"]
    assert {t["title"] for t in items} == {"Оплатить интернет", "Записаться к стоматологу"}
    assert all(t["is_overdue"] for t in items)
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    assert any(t["due_date"] == yesterday for t in items)


def test_unknown_route_and_method(client):
    assert client.get("/api/unknown").status_code == 404
    r = client.patch("/api/tasks")
    assert r.status_code == 405
    assert "error" in r.get_json()
