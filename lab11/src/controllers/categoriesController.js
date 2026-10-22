import { query } from '../db/database.js';
import { parseId, validateCategory } from '../middleware/validate.js';
import { conflict, notFound } from '../utils/httpError.js';

const SELECT_CATEGORY = `
    SELECT c.id, c.name, c.color, c.created_at, count(t.id)::int AS tasks_count
    FROM categories c LEFT JOIN tasks t ON t.category_id = c.id`;

/** GET /api/categories */
export async function listCategories(req, res) {
    const { rows } = await query(`${SELECT_CATEGORY} GROUP BY c.id ORDER BY c.id`);
    res.json(rows);
}

/** GET /api/categories/:id */
export async function getCategory(req, res) {
    const id = parseId(req.params.id, 'категории');
    const { rows } = await query(`${SELECT_CATEGORY} WHERE c.id = $1 GROUP BY c.id`, [id]);
    if (!rows.length) throw notFound(`Категория с id=${id} не найдена`);
    res.json(rows[0]);
}

/** POST /api/categories — повтор названия даст 409 из-за ограничения UNIQUE (см. errorHandler) */
export async function createCategory(req, res) {
    const { name, color } = validateCategory(req.body);
    const { rows } = await query('INSERT INTO categories (name, color) VALUES ($1, $2) RETURNING *', [name, color]);
    res.status(201).json({ ...rows[0], tasks_count: 0 });
}

/** PUT /api/categories/:id */
export async function updateCategory(req, res) {
    const id = parseId(req.params.id, 'категории');
    const { name, color } = validateCategory(req.body);
    const { rows } = await query('UPDATE categories SET name = $1, color = $2 WHERE id = $3 RETURNING *', [name, color, id]);
    if (!rows.length) throw notFound(`Категория с id=${id} не найдена`);
    res.json(rows[0]);
}

/** DELETE /api/categories/:id — нельзя удалить категорию, к которой привязаны задачи (ON DELETE RESTRICT) */
export async function deleteCategory(req, res) {
    const id = parseId(req.params.id, 'категории');
    try {
        const { rows } = await query('DELETE FROM categories WHERE id = $1 RETURNING name', [id]);
        if (!rows.length) throw notFound(`Категория с id=${id} не найдена`);
        res.json({ message: `Категория «${rows[0].name}» удалена`, id });
    } catch (err) {
        if (err.code === '23503') throw conflict('Нельзя удалить категорию: к ней привязаны задачи. Сначала перенесите или удалите их.');
        throw err;
    }
}

/** GET /api/statuses — справочник статусов */
export async function listStatuses(req, res) {
    const { rows } = await query('SELECT id, code, name, is_final FROM statuses ORDER BY id');
    res.json(rows);
}
