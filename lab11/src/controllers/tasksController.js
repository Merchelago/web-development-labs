import { query } from '../db/database.js';
import { parseId, parseTaskQuery, validateTask } from '../middleware/validate.js';
import { badRequest, notFound } from '../utils/httpError.js';

// Общая часть SELECT: задача вместе с названием категории и статуса, признак просрочки считается в БД
const SELECT_TASK = `
    SELECT t.id, t.title, t.description, t.priority, t.due_date, t.assignee,
           t.created_at, t.updated_at, t.completed_at,
           t.category_id, c.name AS category_name, c.color AS category_color,
           s.code AS status, s.name AS status_name,
           (t.due_date IS NOT NULL AND t.due_date < now() AND s.code <> 'done') AS is_overdue
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
    JOIN statuses s ON s.id = t.status_id`;

const ORDER_BY = {
    created_at: dir => `t.created_at ${dir}, t.id ${dir}`,
    due_date: dir => `t.due_date ${dir} NULLS LAST, t.id`,
    priority: dir => `CASE t.priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END ${dir}, t.due_date ASC NULLS LAST, t.id`,
    title: dir => `t.title ${dir}, t.id`,
};

async function findTask(id) {
    const { rows } = await query(`${SELECT_TASK} WHERE t.id = $1`, [id]);
    return rows[0];
}

async function ensureCategory(categoryId) {
    if (categoryId == null) return;
    const { rowCount } = await query('SELECT 1 FROM categories WHERE id = $1', [categoryId]);
    if (!rowCount) throw badRequest(`Категория с id=${categoryId} не существует`, { category_id: 'Неизвестная категория' });
}

/** GET /api/tasks — список с поиском, фильтрами и сортировкой */
export async function listTasks(req, res) {
    const { filters, sort, order } = parseTaskQuery(req.query);
    const where = [];
    const params = [];
    const add = value => { params.push(value); return `$${params.length}`; };

    if (filters.search) {
        const p = add(`%${filters.search}%`);
        where.push(`(t.title ILIKE ${p} OR t.description ILIKE ${p})`);
    }
    if (filters.categoryId) where.push(`t.category_id = ${add(filters.categoryId)}`);
    if (filters.status) where.push(`s.code = ${add(filters.status)}`);
    if (filters.priority) where.push(`t.priority = ${add(filters.priority)}`);
    if (filters.overdue === true) where.push(`t.due_date < now() AND s.code <> 'done'`);
    if (filters.overdue === false) where.push(`NOT (t.due_date IS NOT NULL AND t.due_date < now() AND s.code <> 'done')`);
    if (filters.due) {
        const p = add(filters.due);
        where.push(`t.due_date >= ${p}::date AND t.due_date < ${p}::date + 1`);
    }

    const sql = `${SELECT_TASK}
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY ${ORDER_BY[sort](order.toUpperCase())}`;
    const { rows } = await query(sql, params);
    res.json(rows);
}

/** GET /api/tasks/stats — общее количество, выполненные, активные, просроченные и разбивки */
export async function getStats(req, res) {
    const [totals, byCategory, byPriority] = await Promise.all([
        query(`
            SELECT count(*)::int AS total,
                   count(*) FILTER (WHERE s.code = 'done')::int AS done,
                   count(*) FILTER (WHERE s.code <> 'done')::int AS active,
                   count(*) FILTER (WHERE s.code = 'new')::int AS new,
                   count(*) FILTER (WHERE s.code = 'in_progress')::int AS in_progress,
                   count(*) FILTER (WHERE s.code <> 'done' AND t.due_date < now())::int AS overdue,
                   count(*) FILTER (WHERE t.due_date >= date_trunc('day', now())
                                      AND t.due_date < date_trunc('day', now()) + interval '1 day')::int AS due_today
            FROM tasks t JOIN statuses s ON s.id = t.status_id`),
        query(`
            SELECT c.id, c.name, c.color,
                   count(t.id)::int AS total,
                   count(t.id) FILTER (WHERE s.code = 'done')::int AS done
            FROM categories c
            LEFT JOIN tasks t ON t.category_id = c.id
            LEFT JOIN statuses s ON s.id = t.status_id
            GROUP BY c.id ORDER BY c.id`),
        query(`SELECT priority, count(*)::int AS total FROM tasks GROUP BY priority`),
    ]);
    const stats = totals.rows[0];
    stats.done_percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
    stats.by_category = byCategory.rows;
    stats.by_priority = Object.fromEntries(['high', 'medium', 'low'].map(p => [p, byPriority.rows.find(r => r.priority === p)?.total ?? 0]));
    res.json(stats);
}

/** GET /api/tasks/:id */
export async function getTask(req, res) {
    const id = parseId(req.params.id, 'задачи');
    const task = await findTask(id);
    if (!task) throw notFound(`Задача с id=${id} не найдена`);
    res.json(task);
}

/** POST /api/tasks — создание задачи */
export async function createTask(req, res) {
    const data = validateTask(req.body);
    await ensureCategory(data.category_id);
    const { rows } = await query(
        `INSERT INTO tasks (title, description, category_id, priority, due_date, assignee, status_id, completed_at)
         SELECT $1, $2, $3, $4, $5, $6, s.id, CASE WHEN s.code = 'done' THEN now() END
         FROM statuses s WHERE s.code = $7
         RETURNING id`,
        [data.title, data.description ?? '', data.category_id, data.priority, data.due_date, data.assignee ?? null, data.status ?? 'new'],
    );
    res.status(201).location(`/api/tasks/${rows[0].id}`).json(await findTask(rows[0].id));
}

/** PUT /api/tasks/:id — полное обновление (название обязательно) */
export async function replaceTask(req, res) {
    const id = parseId(req.params.id, 'задачи');
    const data = validateTask(req.body);
    await ensureCategory(data.category_id);
    const { rowCount } = await query(
        `UPDATE tasks t SET title = $1, description = $2, category_id = $3, priority = $4,
                due_date = $5, assignee = $6, updated_at = now()
         WHERE t.id = $7`,
        [data.title, data.description ?? '', data.category_id, data.priority, data.due_date, data.assignee ?? null, id],
    );
    if (!rowCount) throw notFound(`Задача с id=${id} не найдена`);
    if (data.status) await applyStatus(id, data.status);
    res.json(await findTask(id));
}

/** PATCH /api/tasks/:id — частичное обновление (только переданные поля) */
export async function patchTask(req, res) {
    const id = parseId(req.params.id, 'задачи');
    const data = validateTask(req.body, { partial: true });
    const { status, ...fields } = data;
    if (!Object.keys(data).length) throw badRequest('Нет полей для изменения');
    if ('category_id' in fields) await ensureCategory(fields.category_id);
    if (!(await findTask(id))) throw notFound(`Задача с id=${id} не найдена`);

    const columns = Object.keys(fields);
    if (columns.length) {
        const sets = columns.map((c, i) => `${c} = $${i + 1}`);
        await query(`UPDATE tasks SET ${sets.join(', ')}, updated_at = now() WHERE id = $${columns.length + 1}`,
            [...columns.map(c => fields[c]), id]);
    }
    if (status) await applyStatus(id, status);
    res.json(await findTask(id));
}

async function applyStatus(id, status) {
    // completed_at выставляется при выполнении и сбрасывается при возврате задачи в работу
    return query(
        `UPDATE tasks t SET status_id = s.id, updated_at = now(),
                completed_at = CASE WHEN s.code = 'done' THEN COALESCE(t.completed_at, now()) END
         FROM statuses s WHERE s.code = $1 AND t.id = $2`,
        [status, id],
    );
}

/** PATCH /api/tasks/:id/status — смена статуса: отметка о выполнении или возврат в активное состояние */
export async function setStatus(req, res) {
    const id = parseId(req.params.id, 'задачи');
    if (!req.body?.status) throw badRequest('Укажите статус', { status: 'Поле status обязательно' });
    const { status } = validateTask({ status: req.body.status }, { partial: true });
    const { rowCount } = await applyStatus(id, status);
    if (!rowCount) throw notFound(`Задача с id=${id} не найдена`);
    res.json(await findTask(id));
}

/** DELETE /api/tasks/:id */
export async function deleteTask(req, res) {
    const id = parseId(req.params.id, 'задачи');
    const { rows } = await query('DELETE FROM tasks WHERE id = $1 RETURNING id, title', [id]);
    if (!rows.length) throw notFound(`Задача с id=${id} не найдена`);
    res.json({ message: `Задача «${rows[0].title}» удалена`, id });
}
