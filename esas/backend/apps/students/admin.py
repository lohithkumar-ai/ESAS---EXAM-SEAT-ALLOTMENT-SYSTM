from django.contrib import admin
from .models import Student, ExamCandidate


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['pin', 'name', 'branch', 'created_at']
    list_filter = ['branch']
    search_fields = ['pin', 'name']


@admin.register(ExamCandidate)
class ExamCandidateAdmin(admin.ModelAdmin):
    list_display = [
        'student', 'exam_session', 'branch', 'curriculum',
        'academic_year', 'subject', 'category', 'is_valid'
    ]
    list_filter = [
        'exam_session', 'branch', 'curriculum',
        'academic_year', 'category', 'is_valid'
    ]
    search_fields = ['student__pin', 'student__name']
    raw_id_fields = ['student', 'subject']
