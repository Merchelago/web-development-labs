// Единый обработчик ошибок: понятное сообщение в JSON и корректный HTTP-статус
const multer = require('multer');
const { HttpError } = require('../utils/http');

const PG_ERRORS = {
  23503: [409, 'Операция нарушает связь с другими данными (связанная запись не существует или используется)'],
  23505: [409, 'Запись с такими данными уже существует'],
  23514: [400, 'Значение не удовлетворяет ограничениям базы данных'],
  23502: [400, 'Не заполнено обязательное поле'],
  '22P02': [400, 'Некорректный формат значения'],
  22007: [400, 'Некорректная дата'],
  22001: [400, 'Слишком длинное значение'],
};

function notFoundRoute(req, res) {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.originalUrl} не найден` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Файл больше 5 МБ' : 'Ошибка загрузки файла';
    return res.status(400).json({ error: msg });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
  }
  if (err.code && PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    return res.status(status).json({ error: message, details: err.detail });
  }
  if (['ECONNREFUSED', '57P03', '3D000', '28P01'].includes(err.code)) {
    console.error('[db]', err.message);
    return res.status(503).json({ error: 'База данных недоступна, попробуйте позже' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}

module.exports = { errorHandler, notFoundRoute };
