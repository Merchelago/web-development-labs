import { badRequest } from '../utils/httpError.js';

export const PRIORITIES = ['low', 'medium', 'high'];
export const STATUS_CODES = ['new', 'in_progress', 'done'];
export const SORT_FIELDS = ['created_at', 'due_date', 'priority', 'title'];

/** Проверка параметра :id — положительное целое число. */
export function parseId(value, entity = 'записи') {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw badRequest(`Некорректный идентификатор ${entity}: «${value}»`);
    return id;
}

const isBlank = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * Проверка тела запроса задачи. partial = true — для частичного обновления (проверяются только переданные поля).
 * Возвращает нормализованные данные или выбрасывает 400 со списком ошибок по полям.
 */
export function validateTask(body, { partial = false } = {}) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Тело запроса должно быть JSON-объектом');
    const errors = {};
    const data = {};
    const has = field => Object.prototype.hasOwnProperty.call(body, field);

    if (!partial || has('title')) {
        if (typeof body.title !== 'string' || body.title.trim().length < 3) errors.title = 'Название обязательно, не короче 3 символов';
        else if (body.title.trim().length > 200) errors.title = 'Название не длиннее 200 символов';
        else data.title = body.title.trim();
    }
    if (has('description')) {
        if (body.description !== null && typeof body.description !== 'string') errors.description = 'Описание должно быть строкой';
        else data.description = (body.description ?? '').trim();
    }
    if (!partial || has('category_id')) {
        if (isBlank(body.category_id)) data.category_id = null;
        else if (!Number.isInteger(Number(body.category_id)) || Number(body.category_id) <= 0) errors.category_id = 'Категория должна быть идентификатором (целым числом)';
        else data.category_id = Number(body.category_id);
    }
    if (!partial || has('priority')) {
        const priority = body.priority ?? 'medium';
        if (!PRIORITIES.includes(priority)) errors.priority = `Приоритет: одно из значений ${PRIORITIES.join(', ')}`;
        else data.priority = priority;
    }
    if (!partial || has('due_date')) {
        if (isBlank(body.due_date)) data.due_date = null;
        else if (Number.isNaN(Date.parse(body.due_date))) errors.due_date = 'Срок выполнения — дата в формате ISO 8601 (например, 2026-10-25T18:00)';
        else data.due_date = new Date(body.due_date).toISOString();
    }
    if (has('assignee')) {
        if (body.assignee !== null && typeof body.assignee !== 'string') errors.assignee = 'Исполнитель должен быть строкой';
        else if ((body.assignee ?? '').length > 80) errors.assignee = 'Исполнитель — не длиннее 80 символов';
        else data.assignee = body.assignee?.trim() || null;
    }
    if (has('status')) {
        if (!STATUS_CODES.includes(body.status)) errors.status = `Статус: одно из значений ${STATUS_CODES.join(', ')}`;
        else data.status = body.status;
    }

    if (Object.keys(errors).length) throw badRequest('Некорректные данные задачи', errors);
    return data;
}

export function validateCategory(body) {
    const errors = {};
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (name.length < 2 || name.length > 50) errors.name = 'Название категории — от 2 до 50 символов';
    const color = body?.color ?? '#2f80ed';
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) errors.color = 'Цвет — в формате #RRGGBB';
    if (Object.keys(errors).length) throw badRequest('Некорректные данные категории', errors);
    return { name, color };
}

/** Разбор query-параметров списка задач: фильтры, поиск, сортировка. */
export function parseTaskQuery(q) {
    const errors = {};
    const filters = {};
    if (q.search) filters.search = String(q.search).trim();
    if (q.category_id) {
        const id = Number(q.category_id);
        if (!Number.isInteger(id) || id <= 0) errors.category_id = 'category_id — целое число';
        else filters.categoryId = id;
    }
    if (q.status) {
        if (!STATUS_CODES.includes(q.status)) errors.status = `status: ${STATUS_CODES.join(' | ')}`;
        else filters.status = q.status;
    }
    if (q.priority) {
        if (!PRIORITIES.includes(q.priority)) errors.priority = `priority: ${PRIORITIES.join(' | ')}`;
        else filters.priority = q.priority;
    }
    if (q.overdue !== undefined) filters.overdue = q.overdue === 'true' || q.overdue === '1';
    if (q.due) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(q.due)) errors.due = 'due — дата в формате YYYY-MM-DD';
        else filters.due = q.due;
    }
    const sort = q.sort ?? 'created_at';
    if (!SORT_FIELDS.includes(sort)) errors.sort = `sort: ${SORT_FIELDS.join(' | ')}`;
    const order = (q.order ?? (sort === 'title' ? 'asc' : 'desc')).toLowerCase();
    if (!['asc', 'desc'].includes(order)) errors.order = 'order: asc | desc';
    if (Object.keys(errors).length) throw badRequest('Некорректные параметры запроса', errors);
    return { filters, sort, order };
}
