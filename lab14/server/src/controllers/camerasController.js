const { query } = require('../db/pool');
const { HttpError, asyncHandler, notFound } = require('../utils/http');
const { validate } = require('../utils/validate');

const BASE = `
  SELECT c.id, c.name, c.facility_id, f.name AS facility_name, c.location, c.status, c.resolution,
         m.file_path AS frame,
         (SELECT count(*) FROM detections d WHERE d.camera_id = c.id AND d.is_violation) AS violation_marks,
         (SELECT count(*) FROM violations v WHERE v.camera_id = c.id AND v.detected_at >= date_trunc('day', now())) AS violations_today
  FROM cameras c JOIN facilities f ON f.id = c.facility_id LEFT JOIN media m ON m.id = c.frame_id`;

const list = asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.facility_id) { params.push(Number(req.query.facility_id)); where = 'WHERE c.facility_id = $1'; }
  const { rows } = await query(`${BASE} ${where} ORDER BY c.id`, params);
  res.json(rows);
});

// GET /api/cameras/:id — камера и результаты распознавания на текущем кадре
const get = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query(`${BASE} WHERE c.id = $1`, [id]);
  if (!rows[0]) throw notFound('Камера');
  const det = await query(
    `SELECT d.id, d.label, d.is_violation, d.confidence, d.x, d.y, d.w, d.h, d.violation_id, v.status AS violation_status
     FROM detections d LEFT JOIN violations v ON v.id = d.violation_id WHERE d.camera_id = $1 ORDER BY d.id`, [id],
  );
  res.json({ ...rows[0], detections: rows[0].status === 'online' ? det.rows : [] });
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const d = validate(req.body)
    .string('name', 'Название', { max: 100 })
    .string('location', 'Расположение', { max: 200 })
    .oneOf('status', 'Статус', ['online', 'offline'])
    .int('facility_id', 'Объект', { min: 1 })
    .check();
  const keys = ['name', 'location', 'status', 'facility_id'].filter((k) => req.body[k] !== undefined);
  if (!keys.length) throw new HttpError(400, 'Нет данных для изменения');
  if (keys.includes('name') && !d.name) throw new HttpError(400, 'Название камеры не может быть пустым');
  const { rowCount } = await query(
    `UPDATE cameras SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`,
    [id, ...keys.map((k) => d[k])],
  );
  if (!rowCount) throw notFound('Камера');
  const { rows } = await query(`${BASE} WHERE c.id = $1`, [id]);
  res.json(rows[0]);
});

// POST /api/cameras/:id/snapshot — сохранение снимка текущего кадра в таблицу media
const snapshot = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const cam = await query(`SELECT c.status, m.file_path, m.size_bytes FROM cameras c LEFT JOIN media m ON m.id = c.frame_id WHERE c.id = $1`, [id]);
  if (!cam.rows[0]) throw notFound('Камера');
  if (cam.rows[0].status !== 'online') throw new HttpError(409, 'Камера не в сети — снимок недоступен');
  const name = `snapshot_cam${id}_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  const { rows } = await query(
    `INSERT INTO media (file_path, original_name, mime_type, size_bytes, kind, uploaded_by)
     VALUES ($1, $2, 'image/png', $3, 'snapshot', $4) RETURNING id, file_path, original_name, created_at`,
    [cam.rows[0].file_path, name, cam.rows[0].size_bytes, req.user.id],
  );
  res.status(201).json(rows[0]);
});

module.exports = { list, get, update, snapshot };
