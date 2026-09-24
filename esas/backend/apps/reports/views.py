"""Report generation views - PDF and Excel exports."""
import io
import math
from django.db.models import Count, Q
from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as http_status

from apps.examinations.models import ExamSession, Branch, Curriculum, Subject
from apps.students.models import ExamCandidate
from apps.seating.models import SeatAllocation
from apps.rooms.models import Room


def _get_session_or_error(request):
    session_id = request.query_params.get('session_id')
    if not session_id:
        return None, Response({'error': 'session_id required.'}, status=http_status.HTTP_400_BAD_REQUEST)
    try:
        return ExamSession.objects.get(id=session_id), None
    except ExamSession.DoesNotExist:
        return None, Response({'error': 'Invalid session.'}, status=http_status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def seat_allotment_report(request):
    """Get seat allotment data for export."""
    session, err = _get_session_or_error(request)
    if err:
        return err

    allocations = SeatAllocation.objects.filter(
        exam_session=session
    ).select_related(
        'candidate__student', 'candidate__branch',
        'candidate__curriculum', 'candidate__subject',
        'room', 'seat'
    ).order_by('room__room_number', 'seat__seat_number')

    rooms_data = {}
    for alloc in allocations:
        rn = alloc.room.room_number
        if rn not in rooms_data:
            rooms_data[rn] = {
                'room_number': rn,
                'capacity': alloc.room.capacity,
                'students': [],
            }
        rooms_data[rn]['students'].append({
            'seat': alloc.seat.seat_number,
            'pin': alloc.candidate.student.pin,
            'name': alloc.candidate.student.name,
            'branch': alloc.candidate.branch.code,
            'subject': alloc.candidate.subject.name,
            'category': alloc.candidate.category,
        })

    return Response({
        'session': session.name,
        'rooms': list(rooms_data.values()),
    })


@api_view(['GET'])
def room_summary_report(request):
    """Room summary report."""
    session, err = _get_session_or_error(request)
    if err:
        return err

    rooms = Room.objects.filter(is_active=True).annotate(
        allocated=Count(
            'allocations',
            filter=Q(allocations__exam_session=session)
        )
    ).order_by('room_number')

    data = [{
        'room_number': r.room_number,
        'capacity': r.capacity,
        'allocated': r.allocated,
        'empty': r.capacity - r.allocated,
    } for r in rooms]

    return Response({'rooms': data})





@api_view(['GET'])
def subject_wise_report(request):
    """Subject-wise distribution report."""
    session, err = _get_session_or_error(request)
    if err:
        return err

    subjects = Subject.objects.filter(
        candidates__exam_session=session, candidates__is_valid=True
    ).annotate(
        student_count=Count('candidates')
    ).order_by('code').distinct()

    data = [{
        'subject_code': s.code,
        'subject_name': s.name,
        'students': s.student_count,
        'is_common': s.is_common,
    } for s in subjects]

    return Response({'subjects': data})





@api_view(['GET'])
def export_excel(request):
    """Export allotment data as Excel."""
    session, err = _get_session_or_error(request)
    if err:
        return err

    import pandas as pd

    report_type = request.query_params.get('type', 'allotment')

    allocations = SeatAllocation.objects.filter(
        exam_session=session
    ).select_related(
        'candidate__student', 'candidate__branch',
        'candidate__curriculum', 'candidate__subject',
        'candidate__academic_year',
        'room', 'seat'
    ).order_by('room__room_number', 'seat__seat_number')

    rows = []
    
    # Group allocations by room
    rooms = {}
    for a in allocations:
        rn = a.room.room_number
        if rn not in rooms:
            rooms[rn] = {
                'capacity': a.room.capacity,
                'allocations': {}
            }
        rooms[rn]['allocations'][a.seat.seat_number] = a

    for rn, room_data in rooms.items():
        rows.append({
            'Desk No': f'room {rn}',
            'PIN Number': '',
        })
        capacity = room_data['capacity']
        for desk_no in range(1, capacity + 1):
            if desk_no in room_data['allocations']:
                alloc = room_data['allocations'][desk_no]
                pin = alloc.candidate.student.pin
            else:
                pin = 'Empty'
            
            rows.append({
                'Desk No': desk_no,
                'PIN Number': pin,
            })

    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Seat Allotment', index=False, header=False)

    output.seek(0)
    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="ESAS_Allotment_{session.name}.xlsx"'
    return response


@api_view(['GET'])
def export_pdf(request):
    """Export allotment data as PDF."""
    session, err = _get_session_or_error(request)
    if err:
        return err

    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet

    report_type = request.query_params.get('type', 'allotment')

    allocations = SeatAllocation.objects.filter(
        exam_session=session
    ).select_related(
        'candidate__student', 'candidate__branch',
        'candidate__curriculum', 'candidate__subject',
        'room', 'seat'
    ).order_by('room__room_number', 'seat__seat_number')

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    elements = []

    # Group by room
    rooms = {}
    for a in allocations:
        rn = a.room.room_number
        if rn not in rooms:
            rooms[rn] = []
        rooms[rn].append(a)

    for i, (room_num, room_allocs) in enumerate(rooms.items()):
        # Title for the room
        elements.append(Paragraph(
            f'ESAS - Seat Allotment: {session.name} | Room: {room_num}',
            styles['Title']
        ))
        elements.append(Spacer(1, 0.2 * inch))

        table_data = []
        capacity = room_allocs[0].room.capacity if room_allocs else 42
        
        # Build dictionary of seat_number -> allocation
        alloc_dict = {a.seat.seat_number: a for a in room_allocs}
        
        # Build 6 columns x 7 rows matrix (S1-S7 down each column)
        num_cols = 6
        num_rows = 7
        
        for row_idx in range(num_rows):
            row_data = []
            for col_idx in range(num_cols):
                # Zigzag serpentine: odd columns go down, even columns go up
                if col_idx % 2 == 0:
                    # Even col_idx (0, 2, 4) = columns 1, 3, 5 → top to bottom
                    seat_num = col_idx * num_rows + row_idx + 1
                else:
                    # Odd col_idx (1, 3, 5) = columns 2, 4, 6 → bottom to top
                    seat_num = (col_idx + 1) * num_rows - row_idx
                if seat_num > capacity:
                    row_data.append("")
                else:
                    if seat_num in alloc_dict:
                        alloc = alloc_dict[seat_num]
                        pin = alloc.candidate.student.pin
                        cell_text = f"S{seat_num}\n{pin}"
                    else:
                        cell_text = f"S{seat_num}\nEmpty"
                    row_data.append(cell_text)
            table_data.append(row_data)

        # Create Table (7 columns wide, adjust width to fit A4 landscape)
        col_width = (doc.width) / num_cols
        table = Table(table_data, colWidths=[col_width] * num_cols)
        
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        elements.append(table)
        
        # Page break after every room except the last one
        if i < len(rooms) - 1:
            elements.append(PageBreak())

    doc.build(elements)
    buffer.seek(0)

    response = HttpResponse(buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="ESAS_Allotment_{session.name}.pdf"'
    return response
