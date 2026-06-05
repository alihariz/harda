#!/bin/sh
set -e

echo "Running database migrations..."
flask db upgrade

echo "Seeding baseline data..."
python seeds.py --with-demo

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 wsgi:app
