// Автотесты REST API: node --test test/   (используется отдельная база DB_NAME_TEST)
import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { app } = await import('../src/app.js');
const { pool } = await import('../src/db/database.js');
const { initDb } = await import('../scripts/init-db.js');

before(async () => { await initDb(); });
after(async () => { await pool.end(); });

describe('GET /api/tasks', () => {
    it('возвращает все задачи с категорией и статусом', async () => {
        const res = await request(app).get('/api/tasks').expect(200);
        assert.equal(res.body.length, 12);
        assert.ok(res.body.every(t => t.status && 'category_name' in t && typeof t.is_overdue === 'boolean'));
    });

    it('ищет по названию и описанию без учёта регистра', async () => {
        const res = await request(app).get('/api/tasks').query({ search: 'react' }).expect(200);
        assert.ok(res.body.length >= 3);
        assert.ok(res.body.every(t => `${t.title} ${t.description}`.toLowerCase().includes('react')));
    });

    it('фильтрует по категории, статусу и приоритету', async () => {
        const res = await request(app).get('/api/tasks').query({ category_id: 4, status: 'new' }).expect(200);
        assert.ok(res.body.length > 0);
        assert.ok(res.body.every(t => t.category_id === 4 && t.status === 'new'));
        const high = await request(app).get('/api/tasks').query({ priority: 'high' }).expect(200);
        assert.ok(high.body.every(t => t.priority === 'high'));
    });

    it('сортирует по приоритету и по сроку', async () => {
        const res = await request(app).get('/api/tasks').query({ sort: 'priority', order: 'desc' }).expect(200);
        assert.equal(res.body[0].priority, 'high');
        assert.equal(res.body.at(-1).priority, 'low');
        const byDue = await request(app).get('/api/tasks').query({ sort: 'due_date', order: 'asc' }).expect(200);
        const dates = byDue.body.filter(t => t.due_date).map(t => Date.parse(t.due_date));
        assert.deepEqual(dates, [...dates].sort((a, b) => a - b));
        assert.equal(byDue.body.at(-1).due_date, null); // задачи без срока — в конце
    });

    it('отдаёт только просроченные задачи и согласуется со статистикой', async () => {
        const [list, stats] = await Promise.all([
            request(app).get('/api/tasks').query({ overdue: 'true' }).expect(200),
            request(app).get('/api/tasks/stats').expect(200),
        ]);
        assert.ok(list.body.every(t => t.is_overdue));
        assert.equal(list.body.length, stats.body.overdue);
    });

    it('отклоняет некорректные параметры запроса', async () => {
        const res = await request(app).get('/api/tasks').query({ sort: 'drop table', status: 'unknown' }).expect(400);
        assert.ok(res.body.details.sort && res.body.details.status);
    });
});

describe('GET /api/tasks/stats', () => {
    it('считает общее количество, выполненные, активные и просроченные', async () => {
        const { body } = await request(app).get('/api/tasks/stats').expect(200);
        assert.equal(body.total, 12);
        assert.equal(body.done, 4);
        assert.equal(body.active, 8);
        assert.equal(body.done + body.active, body.total);
        assert.equal(body.by_category.length, 4);
    });
});

describe('CRUD задачи', () => {
    let id;

    it('POST создаёт задачу (201 + Location)', async () => {
        const res = await request(app).post('/api/tasks')
            .send({ title: 'Защитить работу №11', description: 'Показать API', category_id: 1, priority: 'high', due_date: '2026-12-01T10:00:00+03:00' })
            .expect(201);
        id = res.body.id;
        assert.equal(res.headers.location, `/api/tasks/${id}`);
        assert.equal(res.body.status, 'new');
        assert.equal(res.body.category_name, 'Учеба');
    });

    it('POST с ошибками в данных → 400 с описанием полей', async () => {
        const res = await request(app).post('/api/tasks').send({ title: ' ', priority: 'urgent', due_date: 'завтра' }).expect(400);
        assert.deepEqual(Object.keys(res.body.details).sort(), ['due_date', 'priority', 'title']);
    });

    it('POST с несуществующей категорией → 400', async () => {
        const res = await request(app).post('/api/tasks').send({ title: 'Задача', category_id: 999 }).expect(400);
        assert.match(res.body.error, /Категория с id=999 не существует/);
    });

    it('POST с некорректным JSON → 400', async () => {
        await request(app).post('/api/tasks').set('Content-Type', 'application/json').send('{"title": ').expect(400);
    });

    it('GET /:id — 200, несуществующий — 404, нечисловой — 400', async () => {
        await request(app).get(`/api/tasks/${id}`).expect(200);
        const missing = await request(app).get('/api/tasks/99999').expect(404);
        assert.equal(missing.body.error, 'Задача с id=99999 не найдена');
        await request(app).get('/api/tasks/abc').expect(400);
    });

    it('PUT обновляет задачу целиком', async () => {
        const res = await request(app).put(`/api/tasks/${id}`)
            .send({ title: 'Защитить работу №11 (перенос)', category_id: 2, priority: 'medium', due_date: null }).expect(200);
        assert.equal(res.body.title, 'Защитить работу №11 (перенос)');
        assert.equal(res.body.category_name, 'Проект');
        assert.equal(res.body.due_date, null);
    });

    it('PATCH /:id/status отмечает выполнение и возвращает в работу', async () => {
        const done = await request(app).patch(`/api/tasks/${id}/status`).send({ status: 'done' }).expect(200);
        assert.equal(done.body.status, 'done');
        assert.ok(done.body.completed_at);
        const back = await request(app).patch(`/api/tasks/${id}/status`).send({ status: 'in_progress' }).expect(200);
        assert.equal(back.body.completed_at, null);
        await request(app).patch(`/api/tasks/${id}/status`).send({ status: 'archived' }).expect(400);
    });

    it('PATCH /:id меняет только переданные поля', async () => {
        const res = await request(app).patch(`/api/tasks/${id}`).send({ priority: 'low' }).expect(200);
        assert.equal(res.body.priority, 'low');
        assert.equal(res.body.title, 'Защитить работу №11 (перенос)');
    });

    it('DELETE удаляет задачу, повторное удаление — 404', async () => {
        await request(app).delete(`/api/tasks/${id}`).expect(200);
        await request(app).delete(`/api/tasks/${id}`).expect(404);
    });
});

describe('Категории и ограничения БД', () => {
    it('повтор названия категории → 409 (UNIQUE)', async () => {
        const res = await request(app).post('/api/categories').send({ name: 'Учеба' }).expect(409);
        assert.match(res.body.error, /уже существует/);
    });

    it('нельзя удалить категорию с задачами → 409, пустую — можно', async () => {
        await request(app).delete('/api/categories/1').expect(409);
        const created = await request(app).post('/api/categories').send({ name: 'Спорт', color: '#ef4444' }).expect(201);
        await request(app).delete(`/api/categories/${created.body.id}`).expect(200);
    });
});

describe('Ошибки', () => {
    it('неизвестный маршрут → 404 в формате JSON', async () => {
        const res = await request(app).get('/api/unknown').expect(404);
        assert.match(res.body.error, /Маршрут не найден/);
    });

    it('недоступная база данных → 503', async () => {
        const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5433'), { code: 'ECONNREFUSED' });
        const stub = mock.method(pool, 'query', async () => { throw err; });
        const res = await request(app).get('/api/tasks').expect(503);
        assert.equal(res.body.error, 'База данных недоступна. Повторите запрос позже.');
        stub.mock.restore();
    });
});
