from django.urls import path
from . import views

urlpatterns = [
    path('generate/', views.generate_allotment, name='allotment-generate'),
    path('regenerate/', views.regenerate_allotment, name='allotment-regenerate'),
    path('reset/', views.reset_allotment, name='allotment-reset'),
    path('validate/', views.validate_allotment, name='allotment-validate'),
    path('detail/', views.allotment_detail, name='allotment-detail'),
]
