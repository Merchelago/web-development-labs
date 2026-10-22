// Аутентификация по JWT (заголовок Authorization: Bearer <token>) и проверка роли
const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/http');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Требуется авторизация'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, employeeId: payload.emp };
    return next();
  } catch {
    return next(new HttpError(401, 'Сессия истекла, войдите заново'));
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, 'Недостаточно прав для выполнения операции'));
  }
  return next();
};

const isAdmin = (req) => req.user?.role === 'admin';

module.exports = { requireAuth, requireRole, isAdmin };
