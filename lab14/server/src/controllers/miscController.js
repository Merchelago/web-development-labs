// Уведомления, обучающие материалы, поиск, проверки СИЗ и «распознавание» (демонстрация на подготовленных кадрах)
const { query, transaction } = require('../db/pool');
const { HttpError, asyncHandler, notFound } = require('../utils/http');
const { validate } = require('../utils/validate');
const { notifyUsers, adminIds } = require('../utils/notify');

// ---------- уведомления текущего пользователя
const notifications = asyncHandler(async (req, res) => {
  const params = [req.user.id];
  let extra = '';
  if (['important', 'system'].includes(req.query.category)) { params.push(req.query.category); extra += ` AND category = $${params.length}`; }
  if (req.query.unread === '1') extra += ' AND NOT is_read';
  const [items, unread] = await Promise.all([
    query(`SELECT id, category, type, title, message, link, is_read, created_at FROM notifications
           WHERE user_id = $1 ${extra} ORDER BY created_at DESC LIMIT 100`, params),
    query('SELECT count(*) FROM notifications WHERE user_id = $1 AND NOT is_read', [req.user.id]),
  ]);
  res.json({ items: items.rows, unread: unread.rows[0].count });
});

const markRead = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id, is_read',
    [Number(req.params.id), req.user.id],
  );
  if (!rows[0]) throw notFound('Уведомление');
  res.json(rows[0]);
});

const markAllRead = asyncHandler(async (req, res) => {
  const { rowCount } = await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND NOT is_read', [req.user.id]);
  res.json({ updated: rowCount });
});

// ---------- обучающие материалы
const TM = `SELECT tm.id, tm.title, tm.description, tm.kind, tm.topic, tm.duration_sec, tm.file_size_kb, tm.created_at,
                   m.file_path AS image FROM training_materials tm LEFT JOIN media m ON m.id = tm.image_id`;
const training = asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (['video', 'document'].includes(req.query.kind)) { params.push(req.query.kind); where = 'WHERE tm.kind = $1'; }
  const { rows } = await query(`${TM} ${where} ORDER BY tm.kind = 'document', tm.id`, params);
  res.json(rows);
});
const trainingItem = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT tm.content, x.* FROM (${TM}) x JOIN training_materials tm ON tm.id = x.id WHERE x.id = $1`,
    [Number(req.params.id)]);
  if (!rows[0]) throw notFound('Материал');
  res.json(rows[0]);
});

// ---------- глобальный поиск (верхняя панель)
const search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ employees: [], facilities: [], violations: [] });
  const like = `%${q}%`;
  const [e, f, v] = await Promise.all([
    query(`SELECT id, full_name, position FROM employees WHERE full_name ILIKE $1 OR position ILIKE $1 ORDER BY full_name LIMIT 5`, [like]),
    query('SELECT id, name, location FROM facilities WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like]),
    query(`SELECT v.id, t.name AS type_name, f.name AS facility_name, v.detected_at FROM violations v
           JOIN violation_types t ON t.id = v.type_id JOIN facilities f ON f.id = v.facility_id
           WHERE t.name ILIKE $1 OR v.description ILIKE $1 OR f.name ILIKE $1 OR CAST(v.id AS text) = $2
           ORDER BY v.detected_at DESC LIMIT 5`, [like, q.replace('#', '')]),
  ]);
  return res.json({ employees: e.rows, facilities: f.rows, violations: v.rows });
});

// ---------- проверка СИЗ инспектором (мобильный экран «Проверка СИЗ»)
const createPpeCheck = asyncHandler(async (req, res) => {
  const d = validate(req.body)
    .int('facility_id', 'Объект', { required: true, min: 1 })
    .int('employee_id', 'Сотрудник', { required: true, min: 1 })
    .bool('has_helmet').bool('has_vest').bool('has_glasses')
    .string('comment', 'Комментарий', { max: 1000 })
    .check();
  const emp = await query('SELECT full_name FROM employees WHERE id = $1', [d.employee_id]);
  if (!emp.rows[0]) throw new HttpError(400, 'Сотрудник не найден');
  const fac = await query('SELECT name FROM facilities WHERE id = $1', [d.facility_id]);
  if (!fac.rows[0]) throw new HttpError(400, 'Объект не найден');
  const gear = { has_helmet: d.has_helmet !== false, has_vest: d.has_vest !== false, has_glasses: d.has_glasses !== false };
  const missing = [!gear.has_helmet && 'no_helmet', !gear.has_vest && 'no_vest', !gear.has_glasses && 'no_glasses'].filter(Boolean);
  const result = await transaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO ppe_checks (facility_id, employee_id, inspector_id, source, has_helmet, has_vest, has_glasses, has_violation)
       VALUES ($1, $2, $3, 'inspector', $4, $5, $6, $7) RETURNING id, checked_at, has_violation`,
      [d.facility_id, d.employee_id, req.user.id, gear.has_helmet, gear.has_vest, gear.has_glasses, missing.length > 0],
    );
    let violationId = null;
    if (missing.length) {
      // по результату проверки сразу регистрируется нарушение по самому серьёзному отсутствующему СИЗ
      const type = await db.query('SELECT id, name FROM violation_types WHERE code = $1', [missing[0]]);
      const v = await db.query(
        `INSERT INTO violations (type_id, facility_id, employee_id, reported_by, source, severity, description)
         VALUES ($1, $2, $3, $4, 'mobile', $5, $6) RETURNING id`,
        [type.rows[0].id, d.facility_id, d.employee_id, req.user.id, missing[0] === 'no_helmet' ? 'high' : 'medium',
          `Проверка СИЗ: ${emp.rows[0].full_name}. ${d.comment || ''}`.trim()],
      );
      violationId = v.rows[0].id;
      await notifyUsers(db, await adminIds(db), {
        category: 'important', type: 'violation', title: 'Новое нарушение',
        message: `${fac.rows[0].name} — ${type.rows[0].name.toLowerCase()} (проверка СИЗ)`, link: `/admin/incidents/${violationId}`,
      });
    }
    return { ...rows[0], violation_id: violationId, missing };
  });
  res.status(201).json(result);
});

// ---------- «Распознавание (AI)»: демонстрационный анализ подготовленного кадра камеры
const analyze = asyncHandler(async (req, res) => {
  const id = Number(req.params.cameraId);
  const cam = await query('SELECT c.id, c.name, c.status, m.file_path AS frame FROM cameras c LEFT JOIN media m ON m.id = c.frame_id WHERE c.id = $1', [id]);
  if (!cam.rows[0]) throw notFound('Камера');
  if (cam.rows[0].status !== 'online') throw new HttpError(409, 'Камера не в сети');
  const { rows } = await query('SELECT label, is_violation, confidence, x, y, w, h, violation_id FROM detections WHERE camera_id = $1 ORDER BY id', [id]);
  const started = Date.now();
  res.json({
    camera: cam.rows[0],
    model: 'YOLOv8-PPE (демонстрационные результаты)',
    processedMs: 40 + (Date.now() - started) + rows.length * 7,
    summary: {
      objects: rows.length,
      violations: rows.filter((r) => r.is_violation).length,
      compliant: rows.filter((r) => !r.is_violation).length,
    },
    detections: rows,
  });
});

const lookups = asyncHandler(async (req, res) => {
  const [types, facilities, cameras] = await Promise.all([
    query('SELECT id, code, name, color FROM violation_types ORDER BY id'),
    query('SELECT id, name, type FROM facilities ORDER BY id'),
    query('SELECT id, name, facility_id, status FROM cameras ORDER BY id'),
  ]);
  res.json({ violationTypes: types.rows, facilities: facilities.rows, cameras: cameras.rows });
});

// Короткий список сотрудников объекта (для формы проверки СИЗ в мобильной версии)
const employeesShort = asyncHandler(async (req, res) => {
  const fid = Number(req.query.facility_id);
  if (!Number.isInteger(fid)) throw new HttpError(400, 'Укажите объект');
  const { rows } = await query('SELECT id, full_name, position FROM employees WHERE facility_id = $1 AND is_active ORDER BY full_name', [fid]);
  res.json(rows);
});

module.exports = { employeesShort, notifications, markRead, markAllRead, training, trainingItem, search, createPpeCheck, analyze, lookups };
