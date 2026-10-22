from .categories import bp as categories_bp
from .main import bp as main_bp
from .stats import bp as stats_bp
from .statuses import bp as statuses_bp
from .tasks import bp as tasks_bp


def register_blueprints(app):
    for bp in (main_bp, tasks_bp, categories_bp, statuses_bp, stats_bp):
        app.register_blueprint(bp)
