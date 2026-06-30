import os
from app import create_app

application = create_app(os.getenv("FLASK_ENV", "production"))

# Alias so `gunicorn wsgi:app` (used in entrypoint.sh) also resolves.
app = application
