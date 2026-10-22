"""Фабрика Flask-приложения «Список задач»."""
from datetime import date, datetime

from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS

from .config import Config
from .db import database
from .errors import register_error_handlers
from .routes import register_blueprints


class ApiJSONProvider(DefaultJSONProvider):
    """JSON без экранирования кириллицы, даты — в формате ISO 8601."""

    ensure_ascii = False
    sort_keys = False

    @staticmethod
    def default(o):
        if isinstance(o, datetime):
            return o.isoformat(timespec="seconds")
        if isinstance(o, date):
            return o.isoformat()
        return DefaultJSONProvider.default(o)


def create_app(overrides=None):
    app = Flask(__name__, static_folder="static", static_url_path="/static")
    app.json_provider_class = ApiJSONProvider
    app.json = ApiJSONProvider(app)
    app.json.compact = False  # читаемый JSON с отступами

    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    # CORS-заголовки отдаются только разрешённым клиентам (например, React на :5173)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, always_send=False)
    database.init_app(app)
    register_error_handlers(app)
    register_blueprints(app)
    return app
