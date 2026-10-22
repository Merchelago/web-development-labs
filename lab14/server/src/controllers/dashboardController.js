const { query } = require('../db/pool');
const { asyncHandler } = require('../utils/http');
const { parsePeriod } = require('../utils/period');

const pctChange = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);

// GET /api/dashboard?period=today|7d|30d — ключевые показатели главной страницы (считаются на сервере)
const getDashboard = asyncHandler(async (req, res) => {
  const p = parsePeriod(req.query, 'today');
  const range = [p.from, p.to, p.prevFrom, p.prevTo];

  const [emp, ppe, viol, cams, recent, dist] = await Promise.all([
    query(`SELECT count(*) AS total, count(*) FILTER (WHERE is_active) AS active,
                  count(*) FILTER (WHERE hired_at <= CURRENT_DATE - 30) AS month_ago
           FROM employees`),
    query(`SELECT round(100.0 * avg((NOT has_violation)::int) FILTER (WHERE checked_at >= $1 AND checked_at < $2), 1) AS cur,
                  round(100.0 * avg((NOT has_violation)::int) FILTER (WHERE checked_at >= $3 AND checked_at < $4), 1) AS prev
           FROM ppe_checks WHERE checked_at >= $3 AND checked_at < $2`, [p.from, p.to, p.prevFrom, p.prevTo]),
    query(`SELECT count(*) FILTER (WHERE detected_at >= $1 AND detected_at < $2) AS cur,
                  count(*) FILTER (WHERE detected_at >= $3 AND detected_at < $4) AS prev
           FROM violations WHERE detected_at >= $3 AND detected_at < $2`, range),
    query(`SELECT count(*) FILTER (WHERE status = 'online') AS online, count(*) AS total FROM cameras`),
    query(`SELECT v.id, v.detected_at, v.severity, v.status, v.description, t.name AS type_name, t.code AS type_code, t.color,
                  f.name AS facility_name, c.name AS camera_name, m.file_path AS image
           FROM violations v
           JOIN violation_types t ON t.id = v.type_id
           JOIN facilities f ON f.id = v.facility_id
           LEFT JOIN cameras c ON c.id = v.camera_id
           LEFT JOIN media m ON m.id = v.media_id
           ORDER BY v.detected_at DESC LIMIT 6`),
    query(`SELECT t.code, t.name, t.color, count(v.id) AS count
           FROM violation_types t
           LEFT JOIN violations v ON v.type_id = t.id AND v.detected_at >= $1 AND v.detected_at < $2
           GROUP BY t.id ORDER BY t.id`, [p.from, p.to]),
  ]);

  const e = emp.rows[0];
  const ppeRow = ppe.rows[0];
  const v = viol.rows[0];
  const c = cams.rows[0];
  const total = dist.rows.reduce((s, r) => s + r.count, 0);
  res.json({
    period: { from: p.from, to: p.to, days: p.days },
    kpi: {
      employees: { value: e.total, active: e.active, change: pctChange(e.total, e.month_ago), compare: 'за месяц' },
      ppeCompliance: {
        value: ppeRow.cur,
        change: ppeRow.cur !== null && ppeRow.prev !== null ? Math.round((ppeRow.cur - ppeRow.prev) * 10) / 10 : null,
        unit: 'п.п.',
      },
      violations: { value: v.cur, change: pctChange(v.cur, v.prev), previous: v.prev },
      cameras: { value: c.online, total: c.total },
    },
    recent: recent.rows,
    distribution: { total, items: dist.rows.map((r) => ({ ...r, percent: total ? Math.round((r.count / total) * 100) : 0 })) },
  });
});

module.exports = { getDashboard };
