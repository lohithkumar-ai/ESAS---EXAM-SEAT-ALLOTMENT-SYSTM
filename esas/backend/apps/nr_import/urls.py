from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_nr, name='nr-upload'),
    path('validate/', views.validate_nr, name='nr-validate'),
    path('import/', views.import_nr, name='nr-import'),
    path('preview/', views.preview_nr, name='nr-preview'),
]
