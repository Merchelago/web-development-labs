const { query, transaction } = require('../db/pool');
const { HttpError, asyncHandler, notFound } = require('../utils/http');
const { validate, pick } = require('../utils/validate');
const { notifyUsers, adminIds } = require('../utils/notify');
const { isAdmin } = require('../middleware/auth');

const STATUSES = ['new', 'in_progress', 'resolved', 'closed'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUS_RU = { new: 'Новое', in_progress: 'В обработке', resolved: 'Устранено', closed: 'Закрыто' };

const BASE = `
  SELECT v.id, v.detected_at, v.severity, v.status, v.description, v.source, v.created_at, v.updated_at,
         v.type_id, t.code AS type_code, t.name AS type_name, t.color,
         v.facility_id, f.name AS facility_name, v.camera_id, c.name AS camera_name,
         v.employee_id, e.full_name AS employee_name, v.reported_by, ru.email AS reported_by_email,
         re.full_name AS reported_by_name, m.file_path AS image
  FROM violations v
  JOIN violation_types t ON t.id = v.type_id
  JOIN facilities f ON f.id = v.facility_id
  LEFT JOIN cameras c ON c.id = v.camera_id
  LEFT JOIN employees e ON e.id = v.employee_id
  LEFT JOIN users ru ON ru.id = v.reported_by
  LEFT JOIN employees re ON re.id = ru.employee_id
  LEFT JOIN media m ON m.id = v.media_id`;

// GET /api/violations — журнал с поиском, фильтрами и постраничным выводом
const list = asyncHandler(async (req, res) => {
  const q = req.query;
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };
  if (q.search) {
    params.push(`%${q.search}%`, String(q.search).replace('#', '').trim());
    const a = params.length - 1;
    where.push(`(v.description ILIKE $${a} OR t.name ILIKE $${a} OR f.name ILIKE $${a} OR c.name ILIKE $${a}
                 OR e.full_name ILIKE $${a} OR CAST(v.id AS text) = $${a + 1})`);
  }
  if (q.type) add('t.code = ?', q.type);
  if (q.facility_id) add('v.facility_id = ?', Number(q.facility_id));
  if (q.camera_id) add('v.camera_id = ?', Number(q.camera_id));
  if (q.severity) add('v.severity = ?', q.severity);
  if (q.status) add('v.status = ?', q.status);
  if (q.from) add('v.detected_at >= ?::date', q.from);
  if (q.to) add("v.detected_at < ?::date + interval '1 day'", q.to);
  if (!isAdmin(req) && q.mine) add('v.reported_by = ?', req.user.id);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Number(q.limit) || 20, 200);
  const page = Math.max(Number(q.page) || 1, 1);
  const [items, total] = await Promise.all([
    query(`${BASE} ${whereSql} ORDER BY v.detected_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params),
    query(`SELECT count(*) FROM violations v JOIN violation_types t ON t.id = v.type_id
           JOIN facilities f ON f.id = v.facility_id LEFT JOIN cameras c ON c.id = v.camera_id
           LEFT JOIN employees e ON e.id = v.employee_id ${whereSql}`, params),
  ]);
  res.json({ items: items.rows, total: total.rows[0].count, page, limit });
});

// GET /api/violations/:id — карточка инцидента
const get = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query(`${BASE} WHERE v.id = $1`, [id]);
  if (!rows[0]) throw notFound('Нарушение');
  const [comments, tasks, detections] = await Promise.all([
    query(`SELECT vc.id, vc.text, vc.created_at, u.email, e.full_name AS author
           FROM violation_comments vc LEFT JOIN users u ON u.id = vc.user_id LEFT JOIN employees e ON e.id = u.employee_id
           WHERE vc.violation_id = $1 ORDER BY vc.created_at`, [id]),
    query(`SELECT t.id, t.title, t.status, t.priority, t.due_date, e.full_name AS assignee_name
           FROM tasks t JOIN employees e ON e.id = t.assignee_id WHERE t.violation_id = $1 ORDER BY t.created_at`, [id]),
    query('SELECT id, label, is_violation, confidence, x, y, w, h FROM detections WHERE violation_id = $1', [id]),
  ]);
  res.json({ ...rows[0], comments: comments.rows, tasks: tasks.rows, detections: detections.rows });
});

// POST /api/violations — регистрация нарушения (мобильная форма или вручную администратором), фото — multipart
const create = asyncHandler(async (req, res) => {
  const data = validate(req.body)
    .int('type_id', 'Тип нарушения', { required: true, min: 1 })
    .int('facility_id', 'Объект / зона', { required: true, min: 1 })
    .int('camera_id', 'Камера', { min: 1 })
    .int('employee_id', 'Нарушитель', { min: 1 })
    .oneOf('severity', 'Уровень опасности', SEVERITIES)
    .string('description', 'Комментарий', { max: 2000 })
    .check();
  if (data.camera_id) {
    const cam = await query('SELECT facility_id FROM cameras WHERE id = $1', [data.camera_id]);
    if (!cam.rows[0]) throw new HttpError(400, 'Указанная камера не существует');
    if (cam.rows[0].facility_id !== data.facility_id) throw new HttpError(400, 'Камера не относится к выбранному объекту');
  }
  const type = await query('SELECT code, name FROM violation_types WHERE id = $1', [data.type_id]);
  if (!type.rows[0]) throw new HttpError(400, 'Неизвестный тип нарушения');
  const fac = await query('SELECT name FROM facilities WHERE id = $1', [data.facility_id]);
  if (!fac.rows[0]) throw new HttpError(400, 'Указанный объект не существует');

  const defaultSeverity = { no_helmet: 'high', danger_zone: 'critical', no_vest: 'medium', no_glasses: 'medium' };
  const created = await transaction(async (db) => {
    let mediaId = null;
    if (req.file) {
      const m = await db.query(
        `INSERT INTO media (file_path, original_name, mime_type, size_bytes, kind, uploaded_by)
         VALUES ($1, $2, $3, $4, 'photo', $5) RETURNING id`,
        [`/uploads/${req.file.filename}`, req.file.originalname, req.file.mimetype, req.file.size, req.user.id],
      );
      mediaId = m.rows[0].id;
    }
    const { rows } = await db.query(
      `INSERT INTO violations (type_id, facility_id, camera_id, employee_id, reported_by, source, severity, description, media_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [data.type_id, data.facility_id, data.camera_id, data.employee_id, req.user.id,
        isAdmin(req) ? 'manual' : 'mobile', data.severity || defaultSeverity[type.rows[0].code] || 'low',
        data.description, mediaId],
    );
    const id = rows[0].id;
    await notifyUsers(db, await adminIds(db), {
      category: 'important', type: 'violation', title: 'Новое нарушение',
      message: `${fac.rows[0].name} — ${type.rows[0].name.toLowerCase()}${data.description ? `: ${data.description}` : ''}`,
      link: `/admin/incidents/${id}`,
    });
    return id;
  });
  const { rows } = await query(`${BASE} WHERE v.id = $1`, [created]);
  res.status(201).json(rows[0]);
});

// PATCH /api/violations/:id — смена статуса / уровня опасности (только администратор)
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = validate(req.body)
    .oneOf('status', 'Статус', STATUSES)
    .oneOf('severity', 'Уровень опасности', SEVERITIES)
    .string('description', 'Описание', { max: 2000 })
    .int('employee_id', 'Нарушитель', { min: 1 })
    .check();
  const fields = pick(data, ['status', 'severity', 'description', 'employee_id']);
  for (const k of Object.keys(fields)) if (req.body[k] === undefined) delete fields[k];
  if (!Object.keys(fields).length) throw new HttpError(400, 'Нет данных для изменения');
  const old = await query('SELECT status, reported_by FROM violations WHERE id = $1', [id]);
  if (!old.rows[0]) throw notFound('Нарушение');
  const keys = Object.keys(fields);
  await transaction(async (db) => {
    await db.query(
      `UPDATE violations SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = now() WHERE id = $1`,
      [id, ...keys.map((k) => fields[k])],
    );
    if (fields.status && fields.status !== old.rows[0].status && old.rows[0].reported_by && old.rows[0].reported_by !== req.user.id) {
      await notifyUsers(db, [old.rows[0].reported_by], {
        type: 'status', title: 'Статус нарушения изменён',
        message: `Нарушение #${id}: «${STATUS_RU[fields.status]}»`, link: '/m/notifications',
      });
    }
  });
  const { rows } = await query(`${BASE} WHERE v.id = $1`, [id]);
  res.json(rows[0]);
});

// POST /api/violations/:id/comments
const addComment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = validate(req.body).string('text', 'Комментарий', { required: true, max: 2000 }).check();
  const exists = await query('SELECT 1 FROM violations WHERE id = $1', [id]);
  if (!exists.rows[0]) throw notFound('Нарушение');
  const { rows } = await query(
    'INSERT INTO violation_comments (violation_id, user_id, text) VALUES ($1, $2, $3) RETURNING id, text, created_at',
    [id, req.user.id, data.text],
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/violations/:id
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM violations WHERE id = $1', [Number(req.params.id)]);
  if (!rowCount) throw notFound('Нарушение');
  res.status(204).end();
});

const types = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, code, name, color FROM violation_types ORDER BY id');
  res.json(rows);
});

module.exports = { list, get, create, update, addComment, remove, types, STATUSES };
