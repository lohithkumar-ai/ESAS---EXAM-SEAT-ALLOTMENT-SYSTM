"""Views for the students app."""
from django.db.models import Q, Subquery, OuterRef, CharField, IntegerField
from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Student, ExamCandidate
from .serializers import StudentSerializer, ExamCandidateSerializer
from apps.seating.models import SeatAllocation


class StudentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentSerializer
    queryset = Student.objects.select_related('branch').all()
    filterset_fields = ['branch']
    search_fields = ['pin', 'name']


class ExamCandidateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ExamCandidateSerializer
    pagination_class = None

    def get_queryset(self):
        qs = ExamCandidate.objects.select_related(
            'student', 'branch', 'curriculum',
            'academic_year', 'semester', 'subject'
        )

        session_id = self.request.query_params.get('session_id')
        if session_id:
            qs = qs.filter(exam_session_id=session_id)

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category.upper())

        branch = self.request.query_params.get('branch')
        if branch:
            qs = qs.filter(branch__code=branch.upper())

        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(academic_year__year=year)

        # Annotate with allocation info
        qs = qs.annotate(
            room_number=Subquery(
                SeatAllocation.objects.filter(
                    candidate_id=OuterRef('pk')
                ).values('room__room_number')[:1],
                output_field=CharField(),
            ),
            seat_number=Subquery(
                SeatAllocation.objects.filter(
                    candidate_id=OuterRef('pk')
                ).values('seat__seat_number')[:1],
                output_field=IntegerField(),
            ),
        )

        return qs.order_by('room_number', 'seat_number', 'student__pin')


@api_view(['GET'])
def search_students(request):
    """
    Search students by PIN or name.
    Returns student details with room/seat allocation info.
    """
    query = request.query_params.get('q', '').strip()
    session_id = request.query_params.get('session_id')

    if not query or len(query) < 2:
        return Response(
            {'error': 'Search query must be at least 2 characters.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    candidates = ExamCandidate.objects.select_related(
        'student', 'branch', 'curriculum',
        'academic_year', 'semester', 'subject', 'exam_session'
    ).filter(
        Q(student__pin__icontains=query) | Q(student__name__icontains=query)
    )

    if session_id:
        candidates = candidates.filter(exam_session_id=session_id)

    # Annotate with allocation
    candidates = candidates.annotate(
        room_number=Subquery(
            SeatAllocation.objects.filter(
                candidate_id=OuterRef('pk')
            ).values('room__room_number')[:1],
            output_field=CharField(),
        ),
        seat_number=Subquery(
            SeatAllocation.objects.filter(
                candidate_id=OuterRef('pk')
            ).values('seat__seat_number')[:1],
            output_field=IntegerField(),
        ),
    )[:50]

    serializer = ExamCandidateSerializer(candidates, many=True)
    return Response({
        'count': len(serializer.data),
        'results': serializer.data,
    })
