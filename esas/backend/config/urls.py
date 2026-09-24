"""
ESAS URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/exams/', include('apps.examinations.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/nr/', include('apps.nr_import.urls')),
    path('api/rooms/', include('apps.rooms.urls')),
    path('api/allotment/', include('apps.seating.urls')),
    path('api/reports/', include('apps.reports.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
