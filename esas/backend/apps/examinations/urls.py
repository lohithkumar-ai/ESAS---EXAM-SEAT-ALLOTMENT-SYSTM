from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'software', views.ExaminationSoftwareViewSet)
router.register(r'curricula', views.CurriculumViewSet)
router.register(r'branches', views.BranchViewSet)
router.register(r'years', views.AcademicYearViewSet)
router.register(r'semesters', views.SemesterViewSet)
router.register(r'subjects', views.SubjectViewSet)
router.register(r'session-configs', views.SessionConfigurationViewSet)
router.register(r'sessions', views.ExamSessionViewSet, basename='session')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.dashboard_stats, name='dashboard'),
]
