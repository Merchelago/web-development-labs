import { HttpError } from '../utils/httpError.js';

// Коды ошибок подключения к PostgreSQL / сети
const CONNECTION_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '28P01', '28000', '3D000', '57P01', '57P03']);

/** 404 для неизвестных маршрутов */
export function notFoundHandler(req, res) {
    res.status(404).json({ error: `Маршрут не найден: ${req.method} ${req.originalUrl}` });
}

/** Единая обработка ошибок: любой сбой превращается в JSON вида { "error": "...", "details": {...} } */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
    }
    // некорректный JSON в теле запроса (ошибка express.json)
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Тело запроса содержит некорректный JSON' });
    }
    if (CONNECTION_CODES.has(err.code) || /timeout exceeded when trying to connect|Connection terminated/i.test(err.message)) {
        console.error('[db] нет соединения с PostgreSQL:', err.code || err.message);
        return res.status(503).json({ error: 'База данных недоступна. Повторите запрос позже.' });
    }
    // нарушения ограничений целостности PostgreSQL
    switch (err.code) {
        case '23505': return res.status(409).json({ error: 'Запись с таким значением уже существует', details: { constraint: err.constraint } });
        case '23503': return res.status(409).json({ error: 'Операция нарушает связь между таблицами', details: { constraint: err.constraint } });
        case '23502': return res.status(400).json({ error: `Не заполнено обязательное поле: ${err.column}` });
        case '23514': return res.status(400).json({ error: 'Значение не прошло проверку ограничения базы данных', details: { constraint: err.constraint } });
        case '22P02':
        case '22007':
        case '22008': return res.status(400).json({ error: 'Некорректный формат значения' });
        default: break;
    }
    console.error('[server] необработанная ошибка:', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
