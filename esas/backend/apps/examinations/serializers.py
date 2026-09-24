"""Serializers for the examinations app."""
from rest_framework import serializers
from .models import (
    ExaminationSoftware, Curriculum, Branch, AcademicYear, 
    Semester, Subject, ExamSession, SessionConfiguration
)


class ExaminationSoftwareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExaminationSoftware
        fields = '__all__'


class CurriculumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curriculum
        fields = '__all__'


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'


class AcademicYearSerializer(serializers.ModelSerializer):
    display = serializers.SerializerMethodField()
    curriculum_code = serializers.CharField(source='curriculum.code', read_only=True)

    class Meta:
        model = AcademicYear
        fields = ['id', 'curriculum', 'curriculum_code', 'year', 'display']

    def get_display(self, obj):
        return str(obj)


class SemesterSerializer(serializers.ModelSerializer):
    academic_year_display = serializers.StringRelatedField(source='academic_year')

    class Meta:
        model = Semester
        fields = ['id', 'number', 'academic_year', 'academic_year_display']


class SubjectSerializer(serializers.ModelSerializer):
    curriculum_code = serializers.CharField(source='curriculum.code', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True, default='')

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'name', 'curriculum', 'curriculum_code',
            'branch', 'branch_code', 'academic_year', 'semester',
            'is_common', 'created_at'
        ]


class SessionConfigurationSerializer(serializers.ModelSerializer):
    curriculum_code = serializers.CharField(source='curriculum.code', read_only=True)
    semester_number = serializers.IntegerField(source='semester.number', read_only=True)

    class Meta:
        model = SessionConfiguration
        fields = ['id', 'session', 'curriculum', 'curriculum_code', 'semester', 'semester_number']


class ExamSessionSerializer(serializers.ModelSerializer):
    software_name = serializers.CharField(source='software.name', read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    candidate_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ExamSession
        fields = [
            'id', 'software', 'software_name', 'name', 'code', 
            'status', 'status_display', 'is_active', 'created_at', 'updated_at', 
            'candidate_count'
        ]


class ExamSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = ['software', 'name', 'code']
