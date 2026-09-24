from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'list', views.StudentViewSet, basename='student')
router.register(r'candidates', views.ExamCandidateViewSet, basename='candidate')

urlpatterns = [
    path('', include(router.urls)),
    path('search/', views.search_students, name='student-search'),
]
