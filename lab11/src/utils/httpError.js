/** Ошибка с HTTP-статусом: выбрасывается в контроллерах и превращается в JSON-ответ в errorHandler. */
export class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const notFound = message => new HttpError(404, message);
export const conflict = message => new HttpError(409, message);

/** Обёртка для async-обработчиков: передаёт исключения в next(), чтобы их обработал errorHandler. */
export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
