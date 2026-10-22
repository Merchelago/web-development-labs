"""Точка входа: python run.py  (или flask --app run run --port 5012)."""
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=app.config["PORT"], debug=app.config["DEBUG"])
