from django.contrib import admin
from .models import (
    ExaminationSoftware, Curriculum, Branch, AcademicYear, Semester, Subject, 
    ExamSession, SessionConfiguration
)

@admin.register(ExaminationSoftware)
class ExaminationSoftwareAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']

@admin.register(Curriculum)
class CurriculumAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['code', 'name']


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active', 'display_order']
    list_filter = ['is_active']
    search_fields = ['code', 'name']


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['curriculum', 'year']
    list_filter = ['curriculum']


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ['number', 'academic_year']
    list_filter = ['academic_year']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'curriculum', 'branch', 'is_common']
    list_filter = ['curriculum', 'branch', 'is_common', 'academic_year']
    search_fields = ['code', 'name']


@admin.register(ExamSession)
class ExamSessionAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'software',
        'status', 'is_active', 'created_at'
    ]
    list_filter = ['software', 'status', 'is_active']
    search_fields = ['name', 'code']

@admin.register(SessionConfiguration)
class SessionConfigurationAdmin(admin.ModelAdmin):
    list_display = ['session', 'curriculum', 'semester']
    list_filter = ['session', 'curriculum']
