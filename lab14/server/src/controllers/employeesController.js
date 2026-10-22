const { query } = require('../db/pool');
const { HttpError, asyncHandler, notFound } = require('../utils/http');
const { validate } = require('../utils/validate');

const BASE = `
  SELECT e.id, e.full_name, e.position, e.department, e.facility_id, f.name AS facility_name,
         e.phone, e.email, e.is_active, e.hired_at,
         (SELECT count(*) FROM violations v WHERE v.employee_id = e.id AND v.detected_at > now() - interval '30 days') AS violations_30d,
         (SELECT count(*) FROM tasks t WHERE t.assignee_id = e.id AND t.status <> 'done') AS open_tasks
  FROM employees e LEFT JOIN facilities f ON f.id = e.facility_id`;

const list = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', `$${params.length}`)); };
  if (req.query.search) add('(e.full_name ILIKE ? OR e.position ILIKE ? OR e.department ILIKE ?)', `%${req.query.search}%`);
  if (req.query.facility_id) add('e.facility_id = ?', Number(req.query.facility_id));
  if (req.query.active === '1') where.push('e.is_active');
  if (req.query.active === '0') where.push('NOT e.is_active');
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [items, total] = await Promise.all([
    query(`${BASE} ${whereSql} ORDER BY e.full_name LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params),
    query(`SELECT count(*) FROM employees e ${whereSql}`, params),
  ]);
  res.json({ items: items.rows, total: total.rows[0].count, page, limit });
});

const get = asyncHandler(async (req, res) => {
  const { rows } = await query(`${BASE} WHERE e.id = $1`, [Number(req.params.id)]);
  if (!rows[0]) throw notFound('Сотрудник');
  res.json(rows[0]);
});

function readEmployee(body, partial = false) {
  return validate(body)
    .string('full_name', 'ФИО', { required: !partial, max: 150 })
    .string('position', 'Должность', { required: !partial, max: 100 })
    .string('department', 'Подразделение', { required: !partial, max: 100 })
    .int('facility_id', 'Объект', { min: 1 })
    .string('phone', 'Телефон', { max: 30 })
    .email('email', 'Email')
    .bool('is_active')
    .check();
}

const FIELDS = ['full_name', 'position', 'department', 'facility_id', 'phone', 'email', 'is_active'];

const create = asyncHandler(async (req, res) => {
  const d = readEmployee(req.body);
  if (d.full_name && d.full_name.split(/\s+/).length < 2) throw new HttpError(400, 'Укажите фамилию и имя сотрудника');
  const { rows } = await query(
    `INSERT INTO employees (full_name, position, department, facility_id, phone, email, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE)) RETURNING id`,
    FIELDS.map((k) => d[k] ?? null),
  );
  const created = await query(`${BASE} WHERE e.id = $1`, [rows[0].id]);
  res.status(201).json(created.rows[0]);
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const d = readEmployee(req.body, true);
  const keys = FIELDS.filter((k) => req.body[k] !== undefined);
  if (!keys.length) throw new HttpError(400, 'Нет данных для изменения');
  for (const k of ['full_name', 'position', 'department']) if (keys.includes(k) && !d[k]) throw new HttpError(400, 'Обязательные поля не могут быть пустыми');
  const { rowCount } = await query(
    `UPDATE employees SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`,
    [id, ...keys.map((k) => d[k])],
  );
  if (!rowCount) throw notFound('Сотрудник');
  const { rows } = await query(`${BASE} WHERE e.id = $1`, [id]);
  res.json(rows[0]);
});

const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const used = await query('SELECT count(*) FROM tasks WHERE assignee_id = $1', [id]);
  if (used.rows[0].count > 0) {
    throw new HttpError(409, 'У сотрудника есть задачи — удаление невозможно. Сделайте сотрудника неактивным.');
  }
  const { rowCount } = await query('DELETE FROM employees WHERE id = $1', [id]);
  if (!rowCount) throw notFound('Сотрудник');
  res.status(204).end();
});

module.exports = { list, get, create, update, remove };
