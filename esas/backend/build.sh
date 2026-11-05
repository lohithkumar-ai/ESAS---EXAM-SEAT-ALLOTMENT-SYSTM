#!/usr/bin/env bash
# Exit on error
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Seed base academic structures if fresh database
python seed.py || true
python seed_semesters.py || true

