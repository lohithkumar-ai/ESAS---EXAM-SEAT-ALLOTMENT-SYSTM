"""Serializers for the students app."""
from rest_framework import serializers
from .models import Student, ExamCandidate


class StudentSerializer(serializers.ModelSerializer):
    branch_code = serializers.CharField(source='branch.code', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'pin', 'name', 'branch', 'branch_code', 'created_at']


class ExamCandidateSerializer(serializers.ModelSerializer):
    pin = serializers.CharField(source='student.pin', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True)
    curriculum_code = serializers.CharField(source='curriculum.code', read_only=True)
    year_display = serializers.StringRelatedField(source='academic_year')
    semester_number = serializers.IntegerField(
        source='semester.number', read_only=True, default=None
    )
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    category_display = serializers.CharField(
        source='get_category_display', read_only=True
    )
    # Allocation info (filled by the view when needed)
    room_number = serializers.CharField(read_only=True, default=None)
    seat_number = serializers.IntegerField(read_only=True, default=None)

    class Meta:
        model = ExamCandidate
        fields = [
            'id', 'pin', 'student_name', 'branch_code',
            'curriculum_code', 'year_display', 'semester_number',
            'subject_code', 'subject_name', 'category', 'category_display',
            'is_valid', 'room_number', 'seat_number',
        ]
