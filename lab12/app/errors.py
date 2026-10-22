"""Единый формат ошибок API: {"error": "...", "details": {...}}."""
import logging

import psycopg2
from psycopg2 import errors as pg_errors
from werkzeug.exceptions import HTTPException

log = logging.getLogger(__name__)

HTTP_MESSAGES = {
    400: "Некорректный запрос",
    404: "Ресурс не найден",
    405: "Метод не поддерживается для этого адреса",
    415: "Ожидается тело запроса в формате JSON (Content-Type: application/json)",
}


class ApiError(Exception):
    def __init__(self, status, message, details=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.details = details


class ValidationError(ApiError):
    def __init__(self, details):
        super().__init__(400, "Ошибка валидации данных", details)


class NotFoundError(ApiError):
    def __init__(self, message):
        super().__init__(404, message)


def error_response(status, message, details=None):
    body = {"error": message}
    if details:
        body["details"] = details
    return body, status


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(e):
        return error_response(e.status, e.message, e.details)

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        return error_response(e.code, HTTP_MESSAGES.get(e.code, e.name))

    @app.errorhandler(pg_errors.UniqueViolation)
    def handle_unique(e):
        return error_response(409, "Запись с такими данными уже существует",
                              {"constraint": e.diag.constraint_name})

    @app.errorhandler(pg_errors.ForeignKeyViolation)
    def handle_fk(e):
        return error_response(409, "Операция нарушает связь между таблицами: на запись ссылаются другие данные",
                              {"constraint": e.diag.constraint_name})

    @app.errorhandler(pg_errors.CheckViolation)
    @app.errorhandler(pg_errors.NotNullViolation)
    def handle_check(e):
        return error_response(400, "Данные нарушают ограничения базы данных",
                              {"constraint": e.diag.constraint_name or e.diag.column_name})

    @app.errorhandler(psycopg2.OperationalError)
    @app.errorhandler(psycopg2.InterfaceError)
    def handle_db_unavailable(e):
        log.error("PostgreSQL недоступен: %s", e)
        return error_response(503, "База данных недоступна, повторите запрос позже")

    @app.errorhandler(psycopg2.Error)
    def handle_db_error(e):
        log.exception("Ошибка PostgreSQL")
        return error_response(500, "Ошибка базы данных")

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        log.exception("Необработанная ошибка")
        return error_response(500, "Внутренняя ошибка сервера")
