import os
import sys
from pathlib import Path

# Add the backend directory to sys.path so config and apps can be imported
backend_dir = Path(__file__).resolve().parent / 'esas' / 'backend'
sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
