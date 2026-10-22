const { query } = require('../db/pool');
const { HttpError, asyncHandler } = require('../utils/http');
const { parsePeriod } = require('../utils/period');

// GET /api/statistics?period=7d&facility_id=1 — данные для графиков раздела «Статистика»
const getStatistics = asyncHandler(async (req, res) => {
  const p = parsePeriod(req.query, '7d');
  const facilityId = req.query.facility_id ? Number(req.query.facility_id) : null;
  if (req.query.facility_id && !Number.isInteger(facilityId)) throw new HttpError(400, 'Некорректный объект');
  const params = [p.from, p.to, facilityId];

  const [series, byType, byFacility, totals] = await Promise.all([
    query(`SELECT d::date AS day,
                  (SELECT count(*) FROM violations v WHERE v.detected_at >= d AND v.detected_at < d + interval '1 day'
                     AND ($3::int IS NULL OR v.facility_id = $3)) AS violations,
                  (SELECT count(*) FROM violations v JOIN violation_types t ON t.id = v.type_id
                     WHERE t.code = 'danger_zone' AND v.detected_at >= d AND v.detected_at < d + interval '1 day'
                     AND ($3::int IS NULL OR v.facility_id = $3)) AS danger_zone,
                  (SELECT round(100.0 * avg((NOT pc.has_violation)::int), 1) FROM ppe_checks pc
                     WHERE pc.checked_at >= d AND pc.checked_at < d + interval '1 day'
                     AND ($3::int IS NULL OR pc.facility_id = $3)) AS compliance
           FROM generate_series($1::timestamptz, $2::timestamptz - interval '1 day', interval '1 day') AS d
           ORDER BY d`, params),
    query(`SELECT t.code, t.name, t.color, count(v.id) AS count
           FROM violation_types t
           LEFT JOIN violations v ON v.type_id = t.id AND v.detected_at >= $1 AND v.detected_at < $2
                AND ($3::int IS NULL OR v.facility_id = $3)
           GROUP BY t.id ORDER BY count DESC, t.id`, params),
    query(`SELECT f.id, f.name, count(v.id) AS count
           FROM facilities f
           LEFT JOIN violations v ON v.facility_id = f.id AND v.detected_at >= $1 AND v.detected_at < $2
           WHERE ($3::int IS NULL OR f.id = $3)
           GROUP BY f.id ORDER BY count DESC, f.id`, params),
    query(`SELECT (SELECT count(*) FROM violations v WHERE v.detected_at >= $1 AND v.detected_at < $2
                     AND ($3::int IS NULL OR v.facility_id = $3)) AS violations,
                  (SELECT round(100.0 * avg((NOT has_violation)::int), 1) FROM ppe_checks pc
                     WHERE pc.checked_at >= $1 AND pc.checked_at < $2 AND ($3::int IS NULL OR pc.facility_id = $3)) AS compliance,
                  (SELECT count(*) FROM ppe_checks pc WHERE pc.checked_at >= $1 AND pc.checked_at < $2
                     AND ($3::int IS NULL OR pc.facility_id = $3)) AS checks`, params),
  ]);
  const totalByFacility = byFacility.rows.reduce((s, r) => s + r.count, 0);
  const totalByType = byType.rows.reduce((s, r) => s + r.count, 0);
  res.json({
    period: { from: p.from, to: p.to, days: p.days },
    totals: totals.rows[0],
    series: series.rows,
    byType: byType.rows.map((r) => ({ ...r, percent: totalByType ? Math.round((r.count / totalByType) * 100) : 0 })),
    byFacility: byFacility.rows.map((r) => ({ ...r, percent: totalByFacility ? Math.round((r.count / totalByFacility) * 100) : 0 })),
  });
});

// GET /api/statistics/me?period=30d — личные показатели текущего сотрудника
const getMyStatistics = asyncHandler(async (req, res) => {
  const p = parsePeriod(req.query, '30d');
  const emp = req.user.employeeId;
  if (!emp) throw new HttpError(400, 'Учётная запись не связана с сотрудником');
  const params = [emp, p.from, p.to];
  const [summary, series, tasks] = await Promise.all([
    query(`SELECT round(100.0 * avg((NOT has_violation)::int), 0) AS compliance,
                  count(DISTINCT date_trunc('day', checked_at)) AS work_days,
                  count(*) AS checks,
                  (SELECT count(*) FROM violations v WHERE v.employee_id = $1 AND v.detected_at >= $2 AND v.detected_at < $3) AS violations,
                  (SELECT count(*) FROM violations v WHERE v.reported_by = (SELECT id FROM users WHERE employee_id = $1)
                     AND v.detected_at >= $2 AND v.detected_at < $3) AS reported,
                  (SELECT count(*) FROM ppe_checks pc WHERE pc.inspector_id = (SELECT id FROM users WHERE employee_id = $1)
                     AND pc.checked_at >= $2 AND pc.checked_at < $3) AS inspections
           FROM ppe_checks WHERE employee_id = $1 AND checked_at >= $2 AND checked_at < $3`, params),
    query(`SELECT d::date AS day,
                  (SELECT round(100.0 * avg((NOT pc.has_violation)::int), 0) FROM ppe_checks pc
                     WHERE pc.employee_id = $1 AND pc.checked_at >= d AND pc.checked_at < d + interval '1 day') AS compliance
           FROM generate_series($2::timestamptz, $3::timestamptz - interval '1 day', interval '1 day') AS d ORDER BY d`, params),
    query(`SELECT count(*) FILTER (WHERE status = 'done' AND completed_at >= $2 AND completed_at < $3) AS done,
                  count(*) FILTER (WHERE status <> 'done') AS active
           FROM tasks WHERE assignee_id = $1`, params),
  ]);
  res.json({ period: { from: p.from, to: p.to, days: p.days }, ...summary.rows[0], tasks: tasks.rows[0], series: series.rows });
});

module.exports = { getStatistics, getMyStatistics };
