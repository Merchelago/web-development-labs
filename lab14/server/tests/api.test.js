// Интеграционные тесты REST API (сервер должен быть запущен): npm test
// Используются встроенные node:test и fetch (Node.js 18+).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const API = process.env.API_URL || 'http://localhost:3014/api';
let admin;
let worker;
const created = { violation: null, task: null };

async function call(method, url, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch { /* CSV или пустой ответ */ }
  return { status: res.status, data, headers: res.headers };
}
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).data.token;

before(async () => {
  admin = await login('admin@safevision.ru', 'admin123');
  worker = await login('smirnov@safevision.ru', 'worker123');
});

after(async () => {
  if (created.task) await call('DELETE', `/tasks/${created.task}`, { token: admin });
  if (created.violation) await call('DELETE', `/violations/${created.violation}`, { token: admin });
});

test('сервер и база данных доступны', async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.db, 'ok');
});

test('неверный пароль — 401, без токена — 401', async () => {
  assert.equal((await call('POST', '/auth/login', { body: { email: 'admin@safevision.ru', password: 'wrong' } })).status, 401);
  assert.equal((await call('GET', '/violations')).status, 401);
});

test('сводные показатели считаются на сервере (только для администратора)', async () => {
  const r = await call('GET', '/dashboard?period=today', { token: admin });
  assert.equal(r.status, 200);
  for (const k of ['employees', 'ppeCompliance', 'violations', 'cameras']) assert.equal(typeof r.data.kpi[k].value, 'number');
  assert.equal((await call('GET', '/dashboard', { token: worker })).status, 403);
});

test('валидация: нарушение без типа и объекта отклоняется с кодом 400', async () => {
  const r = await call('POST', '/violations', { token: worker, body: { description: 'тест' } });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /Тип нарушения/);
  assert.ok(r.data.details.length >= 2);
});

test('сотрудник регистрирует нарушение, администратор получает уведомление', async () => {
  const r = await call('POST', '/violations', { token: worker, body: { type_id: 2, facility_id: 4, description: 'Автотест: нет жилета' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.source, 'mobile');
  assert.equal(r.data.status, 'new');
  created.violation = r.data.id;
  const n = await call('GET', '/notifications', { token: admin });
  assert.ok(n.data.items.some((x) => x.link === `/admin/incidents/${created.violation}`));
});

test('задача: создание, права сотрудника, выполнение и устранение нарушения', async () => {
  const t = await call('POST', '/tasks', { token: admin, body: { title: 'Автотест: выдать жилет', assignee_id: 3, violation_id: created.violation, priority: 'high' } });
  assert.equal(t.status, 201);
  created.task = t.data.id;
  const mine = await call('GET', '/tasks?mine=1', { token: worker });
  assert.ok(mine.data.some((x) => x.id === created.task));
  assert.equal((await call('PATCH', `/tasks/${created.task}`, { token: worker, body: { title: 'чужое поле' } })).status, 403);
  assert.equal((await call('PATCH', `/tasks/${created.task}`, { token: worker, body: { status: 'done' } })).status, 400);
  const done = await call('PATCH', `/tasks/${created.task}`, { token: worker, body: { status: 'done', result: 'Жилет выдан' } });
  assert.equal(done.status, 200);
  assert.equal(done.data.status, 'done');
  const v = await call('GET', `/violations/${created.violation}`, { token: admin });
  assert.equal(v.data.status, 'resolved');
});

test('несуществующий объект — 404, некорректный период — 400', async () => {
  assert.equal((await call('GET', '/objects/99999', { token: admin })).status, 404);
  assert.equal((await call('GET', '/statistics?period=abc', { token: admin })).status, 400);
});

test('экспорт журнала нарушений в CSV', async () => {
  const res = await fetch(`${API}/reports/export?kind=violations&period=7d`, { headers: { Authorization: `Bearer ${admin}` } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);          // BOM для корректного открытия в Excel
  assert.ok(bytes.subarray(3).toString('utf8').startsWith('№;Дата и время;Тип нарушения'));
});
