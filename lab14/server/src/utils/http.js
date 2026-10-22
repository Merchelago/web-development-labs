// Ошибка с HTTP-статусом и обёртка для асинхронных обработчиков Express
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (what) => new HttpError(404, `${what} не найден(о)`);

module.exports = { HttpError, asyncHandler, notFound };
