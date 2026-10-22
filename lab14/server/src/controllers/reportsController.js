// Отчёты за период и экспорт табличных данных в CSV
const { query } = require('../db/pool');
const { HttpError, asyncHandler } = require('../utils/http');
const { parsePeriod } = require('../utils/period');

const STATUS = { new: 'Новое', in_progress: 'В обработке', resolved: 'Устранено', closed: 'Закрыто' };
const TASK_STATUS = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена' };
const SEV = { low: 'Низкий', medium: 'Средний', high: 'Высокий', critical: 'Критический' };

async function buildSummary(p) {
  const params = [p.from, p.to];
  const [totals, byType, byFacility, daily, tasks] = await Promise.all([
    query(`SELECT count(*) AS violations,
                  count(*) FILTER (WHERE status IN ('resolved', 'closed')) AS resolved,
                  count(*) FILTER (WHERE severity IN ('high', 'critical')) AS severe,
                  (SELECT round(100.0 * avg((NOT has_violation)::int), 1) FROM ppe_checks WHERE checked_at >= $1 AND checked_at < $2) AS compliance,
                  (SELECT count(*) FROM ppe_checks WHERE checked_at >= $1 AND checked_at < $2) AS checks,
                  (SELECT count(*) FROM tasks WHERE status = 'done' AND completed_at >= $1 AND completed_at < $2) AS tasks_done
           FROM violations WHERE detected_at >= $1 AND detected_at < $2`, params),
    query(`SELECT t.name, t.color, count(v.id) AS count FROM violation_types t
           LEFT JOIN violations v ON v.type_id = t.id AND v.detected_at >= $1 AND v.detected_at < $2
           GROUP BY t.id ORDER BY count DESC`, params),
    query(`SELECT f.name, count(v.id) AS count,
                  count(v.id) FILTER (WHERE v.status IN ('resolved', 'closed')) AS resolved
           FROM facilities f LEFT JOIN violations v ON v.facility_id = f.id AND v.detected_at >= $1 AND v.detected_at < $2
           GROUP BY f.id ORDER BY count DESC`, params),
    query(`SELECT d::date AS day,
                  (SELECT count(*) FROM violations v WHERE v.detected_at >= d AND v.detected_at < d + interval '1 day') AS violations,
                  (SELECT round(100.0 * avg((NOT pc.has_violation)::int), 1) FROM ppe_checks pc
                     WHERE pc.checked_at >= d AND pc.checked_at < d + interval '1 day') AS compliance
           FROM generate_series($1::timestamptz, $2::timestamptz - interval '1 day', interval '1 day') d ORDER BY d`, params),
    query(`SELECT t.title, e.full_name AS assignee, t.completed_at, t.result
           FROM tasks t JOIN employees e ON e.id = t.assignee_id
           WHERE t.status = 'done' AND t.completed_at >= $1 AND t.completed_at < $2 ORDER BY t.completed_at DESC`, params),
  ]);
  return { period: { from: p.from, to: p.to, days: p.days }, totals: totals.rows[0], byType: byType.rows,
    byFacility: byFacility.rows, daily: daily.rows, completedTasks: tasks.rows };
}

const summary = asyncHandler(async (req, res) => res.json(await buildSummary(parsePeriod(req.query, '30d'))));

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toLocaleString('ru-RU') : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (header, rows) => `﻿${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}\r\n`;
const fmtDay = (d) => new Date(d).toLocaleDateString('ru-RU');

// GET /api/reports/export?kind=violations|tasks|employees|summary&period=30d — CSV (разделитель «;», UTF-8 с BOM для Excel)
const exportCsv = asyncHandler(async (req, res) => {
  const p = parsePeriod(req.query, '30d');
  const kind = req.query.kind || 'violations';
  let csv;
  if (kind === 'violations') {
    const { rows } = await query(
      `SELECT v.id, v.detected_at, t.name AS type, f.name AS facility, c.name AS camera, v.severity, v.status,
              e.full_name AS employee, v.description
       FROM violations v JOIN violation_types t ON t.id = v.type_id JOIN facilities f ON f.id = v.facility_id
       LEFT JOIN cameras c ON c.id = v.camera_id LEFT JOIN employees e ON e.id = v.employee_id
       WHERE v.detected_at >= $1 AND v.detected_at < $2 ORDER BY v.detected_at DESC`, [p.from, p.to]);
    csv = toCsv(['№', 'Дата и время', 'Тип нарушения', 'Объект', 'Камера', 'Опасность', 'Статус', 'Сотрудник', 'Описание'],
      rows.map((r) => [r.id, r.detected_at, r.type, r.facility, r.camera, SEV[r.severity], STATUS[r.status], r.employee, r.description]));
  } else if (kind === 'tasks') {
    const { rows } = await query(
      `SELECT t.id, t.title, e.full_name AS assignee, t.priority, t.due_date, t.status, t.completed_at, t.result
       FROM tasks t JOIN employees e ON e.id = t.assignee_id ORDER BY t.id`);
    csv = toCsv(['№', 'Задача', 'Исполнитель', 'Приоритет', 'Срок', 'Статус', 'Выполнена', 'Результат'],
      rows.map((r) => [r.id, r.title, r.assignee, { low: 'Низкий', medium: 'Средний', high: 'Высокий' }[r.priority],
        r.due_date && fmtDay(r.due_date), TASK_STATUS[r.status], r.completed_at, r.result]));
  } else if (kind === 'employees') {
    const { rows } = await query(
      `SELECT e.id, e.full_name, e.position, e.department, f.name AS facility, e.phone, e.email, e.is_active
       FROM employees e LEFT JOIN facilities f ON f.id = e.facility_id ORDER BY e.full_name`);
    csv = toCsv(['№', 'ФИО', 'Должность', 'Подразделение', 'Объект', 'Телефон', 'Email', 'Активен'],
      rows.map((r) => [r.id, r.full_name, r.position, r.department, r.facility, r.phone, r.email, r.is_active ? 'да' : 'нет']));
  } else if (kind === 'summary') {
    const s = await buildSummary(p);
    const rows = [['Период', `${fmtDay(p.from)} – ${fmtDay(new Date(p.to - 1))}`],
      ['Всего нарушений', s.totals.violations], ['Устранено / закрыто', s.totals.resolved],
      ['Высокой и критической опасности', s.totals.severe], ['Соблюдение СИЗ, %', s.totals.compliance],
      ['Проверок СИЗ', s.totals.checks], ['Выполнено задач', s.totals.tasks_done], [],
      ['Категория', 'Количество'], ...s.byType.map((r) => [r.name, r.count]), [],
      ['Объект', 'Нарушений', 'Устранено'], ...s.byFacility.map((r) => [r.name, r.count, r.resolved]), [],
      ['Дата', 'Нарушений', 'Соблюдение СИЗ, %'], ...s.daily.map((r) => [fmtDay(r.day), r.violations, r.compliance])];
    csv = toCsv(['Отчёт SafeVision', ''], rows);
  } else {
    throw new HttpError(400, 'Неизвестный тип выгрузки. Допустимо: violations, tasks, employees, summary');
  }
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="safevision_${kind}_${stamp}.csv"`);
  res.send(csv);
});

module.exports = { summary, exportCsv };
