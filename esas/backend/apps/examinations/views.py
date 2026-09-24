"""Views for the examinations app."""
from django.db.models import Count
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response

from .models import (
    ExaminationSoftware, Curriculum, Branch, AcademicYear, 
    Semester, Subject, ExamSession, SessionConfiguration
)
from .serializers import (
    ExaminationSoftwareSerializer, CurriculumSerializer, BranchSerializer, 
    AcademicYearSerializer, SemesterSerializer, SubjectSerializer, 
    ExamSessionSerializer, ExamSessionCreateSerializer,
    SessionConfigurationSerializer
)


class ExaminationSoftwareViewSet(viewsets.ModelViewSet):
    queryset = ExaminationSoftware.objects.all()
    serializer_class = ExaminationSoftwareSerializer


class CurriculumViewSet(viewsets.ModelViewSet):
    queryset = Curriculum.objects.all()
    serializer_class = CurriculumSerializer


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    filterset_fields = ['curriculum']


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    filterset_fields = ['academic_year']


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Subject.objects.select_related(
        'curriculum', 'branch', 'academic_year', 'semester'
    ).all()
    serializer_class = SubjectSerializer
    filterset_fields = ['curriculum', 'branch', 'is_common']


class SessionConfigurationViewSet(viewsets.ModelViewSet):
    queryset = SessionConfiguration.objects.all()
    serializer_class = SessionConfigurationSerializer
    filterset_fields = ['session', 'curriculum', 'semester']


class ExamSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSessionSerializer

    def get_queryset(self):
        qs = ExamSession.objects.annotate(
            candidate_count=Count('candidates')
        )
        software_id = self.request.query_params.get('software')
        if software_id:
            qs = qs.filter(software_id=software_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return ExamSessionCreateSerializer
        return ExamSessionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        session = self.get_object()
        if session.status != 'ALLOCATION_GENERATED' and session.status != 'REVIEWED':
            return Response(
                {'error': 'Can only lock sessions with generated allocations.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        session.status = 'LOCKED'
        session.save()
        return Response({'message': 'Session locked successfully.'})

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        session = self.get_object()
        session.status = 'REVIEWED'
        session.save()
        return Response({'message': 'Session unlocked.'})


@api_view(['GET'])
def dashboard_stats(request):
    """Return aggregated dashboard statistics."""
    from apps.students.models import ExamCandidate
    from apps.rooms.models import Room
    from apps.seating.models import SeatAllocation

    # Get active session if any
    active_session = ExamSession.objects.filter(is_active=True).first()
    session_id = request.query_params.get('session_id') or (
        active_session.id if active_session else None
    )

    if not session_id:
        return Response({
            'total_students': 0,
            'regular_students': 0,
            'supplementary_students': 0,
            'total_subjects': 0,
            'total_branches': Branch.objects.filter(is_active=True).count(),
            'total_rooms': Room.objects.filter(is_active=True).count(),
            'allocated_seats': 0,
            'remaining_seats': 0,
            'year_distribution': [],
            'branch_distribution': [],
            'category_distribution': [],
            'active_session': None,
        })

    candidates = ExamCandidate.objects.filter(
        exam_session_id=session_id, is_valid=True
    )
    allocations = SeatAllocation.objects.filter(exam_session_id=session_id)

    total = candidates.count()
    regular = candidates.filter(category='REGULAR').count()
    supplementary = candidates.filter(category='SUPPLEMENTARY').count()
    subjects = candidates.values('subject').distinct().count()
    allocated = allocations.count()

    # Year distribution
    year_dist = list(
        candidates.values('academic_year__year')
        .annotate(count=Count('id'))
        .order_by('academic_year__year')
    )

    # Branch distribution
    branch_dist = list(
        candidates.values('branch__code')
        .annotate(count=Count('id'))
        .order_by('branch__code')
    )

    # Room utilization
    room_util = list(
        allocations.values('room__room_number', 'room__capacity')
        .annotate(allocated=Count('id'))
        .order_by('room__room_number')
    )

    session_data = None
    if active_session and str(active_session.id) == str(session_id):
        session_data = ExamSessionSerializer(active_session).data

    return Response({
        'total_students': total,
        'regular_students': regular,
        'supplementary_students': supplementary,
        'total_subjects': subjects,
        'total_branches': Branch.objects.filter(is_active=True).count(),
        'total_rooms': Room.objects.filter(is_active=True).count(),
        'allocated_seats': allocated,
        'remaining_seats': total - allocated,
        'year_distribution': year_dist,
        'branch_distribution': branch_dist,
        'room_utilization': room_util,
        'category_distribution': [
            {'category': 'Regular', 'count': regular},
            {'category': 'Supplementary', 'count': supplementary},
        ],
        'active_session': session_data,
    })
