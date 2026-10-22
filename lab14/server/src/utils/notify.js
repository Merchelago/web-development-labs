// Создание уведомлений пользователям (вызывается из контроллеров внутри той же транзакции)
const { query } = require('../db/pool');

async function notifyUsers(db, userIds, { category = 'system', type, title, message = null, link = null }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  await (db || { query }).query(
    `INSERT INTO notifications (user_id, category, type, title, message, link)
     SELECT unnest($1::int[]), $2, $3, $4, $5, $6`,
    [ids, category, type, title, message, link],
  );
}

async function adminIds(db) {
  const { rows } = await (db || { query }).query("SELECT id FROM users WHERE role = 'admin'");
  return rows.map((r) => r.id);
}

async function userIdByEmployee(db, employeeId) {
  const { rows } = await (db || { query }).query('SELECT id FROM users WHERE employee_id = $1', [employeeId]);
  return rows[0]?.id || null;
}

module.exports = { notifyUsers, adminIds, userIdByEmployee };
