const { query } = require('../db/pool');
const { HttpError, asyncHandler, notFound } = require('../utils/http');
const { validate } = require('../utils/validate');

const TYPES = ['workshop', 'warehouse', 'territory', 'other'];
const BASE = `
  SELECT f.id, f.name, f.type, f.description, f.location, f.responsible_id, e.full_name AS responsible_name,
         (SELECT count(*) FROM cameras c WHERE c.facility_id = f.id) AS cameras_total,
         (SELECT count(*) FROM cameras c WHERE c.facility_id = f.id AND c.status = 'online') AS cameras_online,
         (SELECT count(*) FROM employees x WHERE x.facility_id = f.id AND x.is_active) AS employees,
         (SELECT count(*) FROM violations v WHERE v.facility_id = f.id AND v.detected_at > now() - interval '30 days') AS violations_30d,
         (SELECT count(*) FROM violations v WHERE v.facility_id = f.id AND v.status IN ('new', 'in_progress')) AS open_violations,
         (SELECT count(*) FROM tasks t WHERE t.facility_id = f.id AND t.status <> 'done') AS open_tasks
  FROM facilities f LEFT JOIN employees e ON e.id = f.responsible_id`;

const list = asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    where = 'WHERE f.name ILIKE $1 OR f.description ILIKE $1 OR f.location ILIKE $1';
  }
  const { rows } = await query(`${BASE} ${where} ORDER BY f.id`, params);
  res.json(rows);
});

// GET /api/objects/:id — объект со связанными камерами, нарушениями и задачами
const get = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query(`${BASE} WHERE f.id = $1`, [id]);
  if (!rows[0]) throw notFound('Объект');
  const [cameras, violations, tasks] = await Promise.all([
    query(`SELECT c.id, c.name, c.location, c.status, m.file_path AS frame FROM cameras c
           LEFT JOIN media m ON m.id = c.frame_id WHERE c.facility_id = $1 ORDER BY c.id`, [id]),
    query(`SELECT v.id, v.detected_at, v.severity, v.status, t.name AS type_name, t.color
           FROM violations v JOIN violation_types t ON t.id = v.type_id
           WHERE v.facility_id = $1 ORDER BY v.detected_at DESC LIMIT 10`, [id]),
    query(`SELECT t.id, t.title, t.status, t.priority, t.due_date, e.full_name AS assignee_name
           FROM tasks t JOIN employees e ON e.id = t.assignee_id
           WHERE t.facility_id = $1 ORDER BY t.status = 'done', t.due_date LIMIT 10`, [id]),
  ]);
  res.json({ ...rows[0], cameras: cameras.rows, violations: violations.rows, tasks: tasks.rows });
});

function read(body, partial) {
  return validate(body)
    .string('name', 'Название', { required: !partial, max: 100 })
    .oneOf('type', 'Тип объекта', TYPES, { required: !partial })
    .string('description', 'Описание', { max: 2000 })
    .string('location', 'Местоположение', { max: 200 })
    .int('responsible_id', 'Ответственный', { min: 1 })
    .check();
}
const FIELDS = ['name', 'type', 'description', 'location', 'responsible_id'];

const create = asyncHandler(async (req, res) => {
  const d = read(req.body, false);
  const { rows } = await query(
    'INSERT INTO facilities (name, type, description, location, responsible_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    FIELDS.map((k) => d[k] ?? null),
  );
  const created = await query(`${BASE} WHERE f.id = $1`, [rows[0].id]);
  res.status(201).json(created.rows[0]);
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const d = read(req.body, true);
  const keys = FIELDS.filter((k) => req.body[k] !== undefined);
  if (!keys.length) throw new HttpError(400, 'Нет данных для изменения');
  if (keys.includes('name') && !d.name) throw new HttpError(400, 'Название объекта не может быть пустым');
  const { rowCount } = await query(
    `UPDATE facilities SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`,
    [id, ...keys.map((k) => d[k])],
  );
  if (!rowCount) throw notFound('Объект');
  const { rows } = await query(`${BASE} WHERE f.id = $1`, [id]);
  res.json(rows[0]);
});

const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const used = await query('SELECT (SELECT count(*) FROM violations WHERE facility_id = $1) AS v', [id]);
  if (used.rows[0].v > 0) throw new HttpError(409, 'По объекту зарегистрированы нарушения — удаление невозможно');
  const { rowCount } = await query('DELETE FROM facilities WHERE id = $1', [id]);
  if (!rowCount) throw notFound('Объект');
  res.status(204).end();
});

module.exports = { list, get, create, update, remove };
