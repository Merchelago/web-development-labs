const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const { HttpError, asyncHandler } = require('../utils/http');
const { validate } = require('../utils/validate');

const USER_SQL = `
  SELECT u.id, u.email, u.role, u.password_hash, u.employee_id,
         e.full_name, e.position, e.department, f.name AS facility_name
  FROM users u
  LEFT JOIN employees e ON e.id = u.employee_id
  LEFT JOIN facilities f ON f.id = e.facility_id`;

const publicUser = ({ password_hash: _, ...u }) => u;

const login = asyncHandler(async (req, res) => {
  const data = validate(req.body).email('email', 'Email', { required: true }).string('password', 'Пароль', { required: true }).check();
  const { rows } = await query(`${USER_SQL} WHERE lower(u.email) = lower($1)`, [data.email]);
  const user = rows[0];
  // одинаковый ответ для неверного логина и пароля — чтобы не раскрывать существование учётной записи
  if (!user || !(await bcrypt.compare(String(req.body.password), user.password_hash))) {
    throw new HttpError(401, 'Неверный email или пароль');
  }
  const token = jwt.sign({ sub: user.id, role: user.role, emp: user.employee_id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  });
  res.json({ token, user: publicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  const { rows } = await query(`${USER_SQL} WHERE u.id = $1`, [req.user.id]);
  if (!rows[0]) throw new HttpError(401, 'Пользователь не найден');
  res.json(publicUser(rows[0]));
});

module.exports = { login, me };
