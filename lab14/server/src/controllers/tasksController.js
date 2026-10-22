const { query, transaction } = require('../db/pool');
const { HttpError, asyncHandler, notFound } = require('../utils/http');
const { validate } = require('../utils/validate');
const { notifyUsers, adminIds, userIdByEmployee } = require('../utils/notify');
const { isAdmin } = require('../middleware/auth');

const STATUS_RU = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена' };
const BASE = `
  SELECT t.id, t.title, t.description, t.priority, t.due_date, t.status, t.result, t.completed_at, t.created_at, t.updated_at,
         t.assignee_id, e.full_name AS assignee_name, e.position AS assignee_position,
         t.violation_id, vt.name AS violation_type, t.facility_id, f.name AS facility_name,
         (t.status <> 'done' AND t.due_date < CURRENT_DATE) AS overdue
  FROM tasks t
  JOIN employees e ON e.id = t.assignee_id
  LEFT JOIN violations v ON v.id = t.violation_id
  LEFT JOIN violation_types vt ON vt.id = v.type_id
  LEFT JOIN facilities f ON f.id = t.facility_id`;

const ORDER = `ORDER BY CASE t.status WHEN 'in_progress' THEN 0 WHEN 'new' THEN 1 ELSE 2 END,
               CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.due_date NULLS LAST, t.id DESC`;

// GET /api/tasks — администратор видит все задачи, сотрудник — только назначенные ему
const list = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (!isAdmin(req) || req.query.mine) add('t.assignee_id = ?', req.user.employeeId || 0);
  if (req.query.status) add('t.status = ?', req.query.status);
  if (req.query.assignee_id && isAdmin(req)) add('t.assignee_id = ?', Number(req.query.assignee_id));
  if (req.query.facility_id) add('t.facility_id = ?', Number(req.query.facility_id));
  if (req.query.search) add('t.title ILIKE ?', `%${req.query.search}%`);
  const { rows } = await query(`${BASE} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ${ORDER}`, params);
  res.json(rows);
});

async function loadTask(req, id) {
  const { rows } = await query(`${BASE} WHERE t.id = $1`, [id]);
  const task = rows[0];
  if (!task) throw notFound('Задача');
  if (!isAdmin(req) && task.assignee_id !== req.user.employeeId) throw new HttpError(403, 'Задача назначена другому сотруднику');
  return task;
}

const get = asyncHandler(async (req, res) => res.json(await loadTask(req, Number(req.params.id))));

// POST /api/tasks — создание задачи администратором; исполнитель получает уведомление
const create = asyncHandler(async (req, res) => {
  const data = validate(req.body)
    .string('title', 'Название', { required: true, max: 200 })
    .string('description', 'Описание', { max: 4000 })
    .int('assignee_id', 'Исполнитель', { required: true, min: 1 })
    .int('violation_id', 'Нарушение', { min: 1 })
    .int('facility_id', 'Объект', { min: 1 })
    .oneOf('priority', 'Приоритет', ['low', 'medium', 'high'])
    .date('due_date', 'Срок выполнения')
    .check();
  if (data.due_date && new Date(data.due_date) < new Date(new Date().toDateString())) {
    throw new HttpError(400, 'Срок выполнения не может быть в прошлом');
  }
  const emp = await query('SELECT full_name, is_active FROM employees WHERE id = $1', [data.assignee_id]);
  if (!emp.rows[0]) throw new HttpError(400, 'Исполнитель не найден');
  if (!emp.rows[0].is_active) throw new HttpError(400, 'Нельзя назначить задачу неактивному сотруднику');
  let facilityId = data.facility_id;
  if (data.violation_id) {
    const v = await query('SELECT facility_id FROM violations WHERE id = $1', [data.violation_id]);
    if (!v.rows[0]) throw new HttpError(400, 'Связанное нарушение не найдено');
    facilityId = facilityId || v.rows[0].facility_id;
  }
  const id = await transaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO tasks (title, description, assignee_id, created_by, violation_id, facility_id, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [data.title, data.description, data.assignee_id, req.user.id, data.violation_id, facilityId, data.priority || 'medium', data.due_date],
    );
    if (data.violation_id) {
      await db.query("UPDATE violations SET status = 'in_progress', updated_at = now() WHERE id = $1 AND status = 'new'", [data.violation_id]);
    }
    await notifyUsers(db, [await userIdByEmployee(db, data.assignee_id)], {
      category: 'important', type: 'task', title: 'Вам назначено задание', message: data.title, link: `/m/tasks/${rows[0].id}`,
    });
    return rows[0].id;
  });
  res.status(201).json(await loadTask(req, id));
});

// PATCH /api/tasks/:id — администратор меняет любые поля, сотрудник — только статус и результат своей задачи
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const task = await loadTask(req, id);
  const v = validate(req.body)
    .oneOf('status', 'Статус', ['new', 'in_progress', 'done'])
    .string('result', 'Результат', { max: 4000 });
  if (isAdmin(req)) {
    v.string('title', 'Название', { max: 200 }).string('description', 'Описание', { max: 4000 })
      .int('assignee_id', 'Исполнитель', { min: 1 }).oneOf('priority', 'Приоритет', ['low', 'medium', 'high'])
      .date('due_date', 'Срок выполнения');
  } else if (Object.keys(req.body).some((k) => !['status', 'result'].includes(k))) {
    throw new HttpError(403, 'Сотрудник может изменить только статус и результат задачи');
  }
  const data = v.check();
  if (data.title === null && req.body.title !== undefined) throw new HttpError(400, 'Поле «Название» обязательно');
  const fields = Object.fromEntries(Object.entries(data).filter(([k]) => req.body[k] !== undefined));
  if (!Object.keys(fields).length) throw new HttpError(400, 'Нет данных для изменения');
  if (fields.status === 'done' && !fields.result && !task.result && !isAdmin(req)) {
    throw new HttpError(400, 'Опишите результат выполнения задачи');
  }
  await transaction(async (db) => {
    const keys = Object.keys(fields);
    const extra = fields.status === 'done' ? ', completed_at = now()' : fields.status ? ', completed_at = NULL' : '';
    await db.query(
      `UPDATE tasks SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}${extra}, updated_at = now() WHERE id = $1`,
      [id, ...keys.map((k) => fields[k])],
    );
    if (fields.status && fields.status !== task.status) {
      // устранение нарушения после выполнения связанной задачи
      if (fields.status === 'done' && task.violation_id) {
        await db.query("UPDATE violations SET status = 'resolved', updated_at = now() WHERE id = $1 AND status IN ('new', 'in_progress')",
          [task.violation_id]);
      }
      const who = isAdmin(req) ? [await userIdByEmployee(db, task.assignee_id)] : await adminIds(db);
      await notifyUsers(db, who, {
        type: 'status', title: `Задача: ${STATUS_RU[fields.status].toLowerCase()}`,
        message: `${task.assignee_name}: «${task.title}»`, link: isAdmin(req) ? `/m/tasks/${id}` : '/admin/incidents?tab=tasks',
      });
    }
    if (fields.assignee_id && fields.assignee_id !== task.assignee_id) {
      await notifyUsers(db, [await userIdByEmployee(db, fields.assignee_id)], {
        category: 'important', type: 'task', title: 'Вам назначено задание', message: task.title, link: `/m/tasks/${id}`,
      });
    }
  });
  res.json(await loadTask(req, id));
});

const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM tasks WHERE id = $1', [Number(req.params.id)]);
  if (!rowCount) throw notFound('Задача');
  res.status(204).end();
});

module.exports = { list, get, create, update, remove };
