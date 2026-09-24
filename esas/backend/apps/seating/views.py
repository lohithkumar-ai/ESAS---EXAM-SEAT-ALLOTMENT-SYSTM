"""Views for the seating/allotment app."""
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.examinations.models import ExamSession
from .allocation.engine import AllocationEngine
from .allocation.validator import validate_allocation
from .models import SeatAllocation, AllocationAuditLog


@api_view(['POST'])
def generate_allotment(request):
    """Generate seat allotment for an exam session."""
    session_id = request.data.get('session_id')
    category = request.data.get('category')  # None, 'REGULAR', 'SUPPLEMENTARY'
    target_branches = request.data.get('branches', [])

    if not session_id:
        return Response(
            {'error': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        exam_session = ExamSession.objects.get(id=session_id)
    except ExamSession.DoesNotExist:
        return Response(
            {'error': 'Invalid session_id.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if exam_session.status == 'LOCKED':
        return Response(
            {'error': 'Session is locked. Unlock before regenerating.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    engine = AllocationEngine(exam_session, category_filter=category, target_branches=target_branches)
    result = engine.generate(user=request.user)

    return Response(result, status=(
        status.HTTP_200_OK if result['success']
        else status.HTTP_400_BAD_REQUEST
    ))


@api_view(['POST'])
def regenerate_allotment(request):
    """Regenerate allocation (clears draft and re-runs)."""
    session_id = request.data.get('session_id')
    category = request.data.get('category')
    target_branches = request.data.get('branches', [])

    if not session_id:
        return Response(
            {'error': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        exam_session = ExamSession.objects.get(id=session_id)
    except ExamSession.DoesNotExist:
        return Response(
            {'error': 'Invalid session_id.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if exam_session.status == 'LOCKED':
        return Response(
            {'error': 'Session is locked. Unlock before regenerating.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    engine = AllocationEngine(exam_session, category_filter=category, target_branches=target_branches)
    result = engine.generate(user=request.user)

    if result['success']:
        AllocationAuditLog.objects.create(
            exam_session=exam_session,
            user=request.user,
            action='REGENERATED',
            description='Allocation regenerated',
        )

    return Response(result)


@api_view(['POST'])
def reset_allotment(request):
    """Reset/Delete allocation (clears draft and reverts status)."""
    session_id = request.data.get('session_id')

    if not session_id:
        return Response(
            {'error': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        exam_session = ExamSession.objects.get(id=session_id)
    except ExamSession.DoesNotExist:
        return Response(
            {'error': 'Invalid session_id.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if exam_session.status == 'LOCKED':
        return Response(
            {'error': 'Session is locked. Unlock before resetting.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Delete all non-locked allocations for this session
    SeatAllocation.objects.filter(
        exam_session=exam_session,
        is_locked=False,
    ).delete()

    # Revert session status
    if exam_session.status in ['ALLOCATION_GENERATED', 'REVIEWED']:
        exam_session.status = 'VALIDATED'
        exam_session.save()

    AllocationAuditLog.objects.create(
        exam_session=exam_session,
        user=request.user,
        action='REGENERATED',  # Or add a 'RESET' action to models.py if needed, using REGENERATED for now
        description='Allocation reset/deleted',
    )

    return Response({'success': True, 'message': 'Allocation has been reset.'})


@api_view(['POST'])
def validate_allotment(request):
    """Validate current allocation."""
    session_id = request.data.get('session_id')

    if not session_id:
        return Response(
            {'error': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        exam_session = ExamSession.objects.get(id=session_id)
    except ExamSession.DoesNotExist:
        return Response(
            {'error': 'Invalid session_id.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    result = validate_allocation(exam_session)
    return Response(result)


@api_view(['GET'])
def allotment_detail(request):
    """Get allocation details for a session, optionally filtered by room."""
    session_id = request.query_params.get('session_id')
    room_id = request.query_params.get('room_id')

    if not session_id:
        return Response(
            {'error': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    allocations = SeatAllocation.objects.filter(
        exam_session_id=session_id
    ).select_related(
        'candidate__student', 'candidate__branch',
        'candidate__curriculum', 'candidate__subject',
        'room', 'seat'
    ).order_by('room__room_number', 'seat__seat_number')

    if room_id:
        allocations = allocations.filter(room_id=room_id)

    data = []
    for alloc in allocations:
        data.append({
            'id': alloc.id,
            'room_number': alloc.room.room_number,
            'seat_number': alloc.seat.seat_number,
            'seat_column': alloc.seat.column,
            'seat_row': alloc.seat.row,
            'pin': alloc.candidate.student.pin,
            'name': alloc.candidate.student.name,
            'branch': alloc.candidate.branch.code,
            'curriculum': alloc.candidate.curriculum.code,
            'subject_code': alloc.candidate.subject.code,
            'subject_name': alloc.candidate.subject.name,
            'category': alloc.candidate.category,
            'is_locked': alloc.is_locked,
            'is_manual': alloc.is_manual,
            'substituted_branch': alloc.substituted_branch,
            'substitution_reason': alloc.substitution_reason,
        })

    return Response({
        'count': len(data),
        'allocations': data,
    })
