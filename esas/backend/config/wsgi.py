"""
WSGI config for ESAS project.
"""
import os
import sys

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

try:
    from django.core.management import call_command
    call_command('migrate', interactive=False)

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    from seed import seed
    from seed_semesters import seed_years_semesters
    seed()
    seed_years_semesters()
except Exception as e:
    print(f"Startup initialization notice: {e}")
