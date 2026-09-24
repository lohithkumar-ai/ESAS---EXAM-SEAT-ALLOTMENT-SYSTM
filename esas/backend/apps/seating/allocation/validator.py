"""
Allocation Validator

Validates the generated seat allocation against all business rules
specified in Section 26 of the PRD.
"""


def validate_allocation(exam_session):
    """
    Run all validation rules against the current allocation.

    Returns:
        {
            'is_valid': bool,
            'errors': [{'rule': str, 'message': str, 'details': str}],
            'warnings': [str],
            'stats': {...}
        }
    """
    from apps.seating.models import SeatAllocation
    from apps.students.models import ExamCandidate

    allocations = SeatAllocation.objects.filter(
        exam_session=exam_session
    ).select_related(
        'candidate', 'candidate__student', 'candidate__branch',
        'candidate__subject', 'candidate__curriculum',
        'room', 'seat'
    )

    candidates = ExamCandidate.objects.filter(
        exam_session=exam_session, is_valid=True
    )

    errors = []
    warnings = []

    # ── Rule 1: No student can have two seats ───────────────────────────
    student_seats = {}
    for alloc in allocations:
        student_id = alloc.candidate.student_id
        if student_id in student_seats:
            warnings.append(
                f'{alloc.candidate.student.pin} is enrolled in multiple exams and assigned to '
                f'Room {alloc.room.room_number} Seat {alloc.seat.seat_number} '
                f'and Room {student_seats[student_id]["room"]} Seat {student_seats[student_id]["seat"]}.'
            )
        else:
            student_seats[student_id] = {
                'room': alloc.room.room_number,
                'seat': alloc.seat.seat_number,
            }

    # ── Rule 2: No seat can contain two students ────────────────────────
    seat_students = {}
    for alloc in allocations:
        seat_key = (alloc.room_id, alloc.seat_id)
        if seat_key in seat_students:
            errors.append({
                'rule': 'Rule 2',
                'message': 'Seat has multiple students',
                'details': (
                    f'Room {alloc.room.room_number} Seat {alloc.seat.seat_number} '
                    f'has both {seat_students[seat_key]} and '
                    f'{alloc.candidate.student.pin}'
                ),
            })
        else:
            seat_students[seat_key] = alloc.candidate.student.pin

    # ── Rule 3: No room can exceed 42 students ──────────────────────────
    from django.db.models import Count
    room_counts = (
        allocations.values('room__room_number', 'room__capacity')
        .annotate(count=Count('id'))
    )
    for rc in room_counts:
        if rc['count'] > rc['room__capacity']:
            errors.append({
                'rule': 'Rule 3',
                'message': 'Room over capacity',
                'details': (
                    f'Room {rc["room__room_number"]} has {rc["count"]} students '
                    f'(capacity: {rc["room__capacity"]})'
                ),
            })

    # ── Rule 4: Every valid candidate must be allocated or marked ────────
    allocated_candidate_ids = set(
        allocations.values_list('candidate_id', flat=True)
    )
    all_candidate_ids = set(candidates.values_list('id', flat=True))
    unallocated = all_candidate_ids - allocated_candidate_ids

    if unallocated:
        warnings.append(
            f'{len(unallocated)} candidates are not allocated to any seat'
        )

    # ── Rule 10: Room + seat must be unique ──────────────────────────────
    # Already checked by Rule 2 above

    stats = {
        'total_candidates': candidates.count(),
        'total_allocated': allocations.count(),
        'total_unallocated': len(unallocated),
        'total_rooms_used': allocations.values('room').distinct().count(),
    }

    return {
        'is_valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'stats': stats,
    }
