// Клиент для Flask REST API: все данные получаются и изменяются только через /api.
const API = "/api";
const PRIORITY = { low: "Низкий", medium: "Средний", high: "Высокий" };
let statuses = [];

async function api(path, options = {}) {
    const res = await fetch(API + path, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (res.status === 204) return null;
    const body = await res.json();
    if (!res.ok) {
        const err = new Error(body.error || "Ошибка запроса");
        err.details = body.details || {};
        throw err;
    }
    return body;
}

function el(tag, attrs = {}, text = "") {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text) node.textContent = text;
    return node;
}

async function loadDictionaries() {
    const [cats, sts] = await Promise.all([api("/categories"), api("/statuses")]);
    statuses = sts;
    const formCat = document.getElementById("formCategory");
    formCat.append(el("option", { value: "" }, "Без категории"));
    cats.forEach(c => {
        formCat.append(el("option", { value: c.id }, c.name));
        document.getElementById("fCategory").append(el("option", { value: c.id }, c.name));
    });
    sts.forEach(s => document.getElementById("fStatus").append(el("option", { value: s.code }, s.name)));
}

async function loadStats() {
    const s = await api("/stats");
    const box = document.getElementById("stats");
    box.innerHTML = "";
    [["Всего задач", s.total, ""], ["Выполнено", s.done, "done"],
     ["Активных", s.active, ""], ["Просрочено", s.overdue, "overdue"]].forEach(([label, value, cls]) => {
        const card = el("div", { class: "stat " + cls });
        card.append(el("b", {}, String(value)), el("span", {}, label));
        box.append(card);
    });
}

function query() {
    const p = new URLSearchParams();
    const [sort, order] = document.getElementById("sort").value.split(":");
    p.set("sort", sort);
    p.set("order", order);
    const q = document.getElementById("q").value.trim();
    if (q) p.set("q", q);
    [["fStatus", "status"], ["fCategory", "category_id"], ["fPriority", "priority"]].forEach(([id, key]) => {
        const v = document.getElementById(id).value;
        if (v) p.set(key, v);
    });
    return "?" + p.toString();
}

function renderTask(t) {
    const li = el("li", { class: "task" + (t.status.code === "done" ? " done" : "") });
    if (t.category) li.style.setProperty("--cat", t.category.color);

    li.append(el("span", { class: "badge " + t.priority }, PRIORITY[t.priority]));

    const info = el("div");
    info.append(el("div", { class: "title" }, t.title));
    const meta = el("div", { class: "meta" });
    meta.append((t.category ? t.category.name : "Без категории") + " · ");
    const due = el("span", t.is_overdue ? { class: "late" } : {},
        t.due_date ? "срок " + new Date(t.due_date).toLocaleDateString("ru-RU") + (t.is_overdue ? " — просрочено" : "")
                   : "без срока");
    meta.append(due);
    info.append(meta);
    li.append(info);

    const status = el("select", { "aria-label": "Статус" });
    statuses.forEach(s => {
        const o = el("option", { value: s.code }, s.name);
        if (s.code === t.status.code) o.selected = true;
        status.append(o);
    });
    status.addEventListener("change", async () => {
        await api(`/tasks/${t.id}/status`, { method: "PATCH", body: JSON.stringify({ status: status.value }) });
        refresh();
    });
    li.append(status);

    const del = el("button", { class: "del", title: "Удалить" }, "✕");
    del.addEventListener("click", async () => {
        if (!confirm(`Удалить задачу «${t.title}»?`)) return;
        await api(`/tasks/${t.id}`, { method: "DELETE" });
        refresh();
    });
    li.append(del);
    return li;
}

async function loadTasks() {
    const data = await api("/tasks" + query());
    const list = document.getElementById("tasks");
    list.innerHTML = "";
    data.items.forEach(t => list.append(renderTask(t)));
    document.getElementById("counter").textContent = `Найдено задач: ${data.total}`;
}

function refresh() {
    return Promise.all([loadTasks(), loadStats()]);
}

document.getElementById("taskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const error = document.getElementById("formError");
    form.querySelectorAll(".invalid").forEach(x => x.classList.remove("invalid"));
    error.textContent = "";
    const fd = new FormData(form);
    const payload = {
        title: fd.get("title"),
        description: fd.get("description") || null,
        category_id: fd.get("category_id") ? Number(fd.get("category_id")) : null,
        priority: fd.get("priority"),
        due_date: fd.get("due_date") || null,
    };
    try {
        await api("/tasks", { method: "POST", body: JSON.stringify(payload) });
        form.reset();
        refresh();
    } catch (err) {
        // Сообщения валидации приходят с сервера
        error.textContent = err.message + ": " + Object.values(err.details).join("; ");
        Object.keys(err.details).forEach(name => form.elements[name]?.classList.add("invalid"));
    }
});

["q", "fStatus", "fCategory", "fPriority", "sort"].forEach(id =>
    document.getElementById(id).addEventListener("input", loadTasks));

(async function init() {
    const state = document.getElementById("apiState");
    try {
        const h = await api("/health");
        state.textContent = `API работает · PostgreSQL ${h.postgres_version} · БД ${h.database}`;
        state.classList.add("ok");
        await loadDictionaries();
        await refresh();
    } catch (err) {
        state.textContent = err.message;
        state.classList.add("fail");
    }
})();
