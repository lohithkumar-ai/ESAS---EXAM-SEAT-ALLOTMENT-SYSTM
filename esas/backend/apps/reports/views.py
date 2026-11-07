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
    """
    Export allotment data as PDF with bench-based layout.

    Layout per room page:
      3 bench columns separated by aisles.
      Each bench has LEFT seat | RIGHT seat.
      Seat numbering: within each bench column, LEFT seats top→bottom,
      then RIGHT seats top→bottom.
      Empty/buffer seats shown with RED "NOT ALLOCATED" label.
    """
    session, err = _get_session_or_error(request)
    if err:
        return err

    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle,
        Paragraph, Spacer, PageBreak,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER

    # ── Styles ──────────────────────────────────────────────────────────
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=12,
    )

    col_header_style = ParagraphStyle(
        'ColHeader',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
        textColor=colors.white,
    )

    seat_title_style = ParagraphStyle(
        'SeatTitle',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1E293B'),
    )

    pin_style = ParagraphStyle(
        'SeatPin',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        alignment=TA_CENTER,
        textColor=colors.black,
    )

    empty_title_style = ParagraphStyle(
        'EmptySeatTitle',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#475569'),
    )

    empty_text_style = ParagraphStyle(
        'EmptyText',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#64748B'),
    )

    # ── Query data ──────────────────────────────────────────────────────
    all_rooms = Room.objects.filter(is_active=True).order_by(
        'display_order', 'room_number'
    )

    allocations = SeatAllocation.objects.filter(
        exam_session=session
    ).select_related(
        'candidate__student', 'candidate__branch',
        'candidate__curriculum', 'candidate__subject',
        'room', 'seat'
    ).order_by('room__room_number', 'seat__seat_number')

    # Group allocations by room
    room_map = {}
    for r in all_rooms:
        room_map[r.room_number] = {'room': r, 'allocs': {}}

    for a in allocations:
        rn = a.room.room_number
        if rn in room_map:
            room_map[rn]['allocs'][a.seat.seat_number] = a

    # ── Build PDF ───────────────────────────────────────────────────────
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=landscape(A4),
        rightMargin=20, leftMargin=20,
        topMargin=20, bottomMargin=20,
    )
    elements = []

    # Column widths: 6 seat cols (118pt each) + 2 aisle gaps (26pt each)
    seat_w = 118
    aisle_w = 26
    col_widths = [seat_w, seat_w, aisle_w, seat_w, seat_w, aisle_w, seat_w, seat_w]

    # Physical column → table column mapping
    # phys_col 1→tbl 0, phys_col 2→tbl 1, aisle→tbl 2,
    # phys_col 3→tbl 3, phys_col 4→tbl 4, aisle→tbl 5,
    # phys_col 5→tbl 6, phys_col 6→tbl 7
    col_mapping = [0, 1, 3, 4, 6, 7]

    rooms_with_allocs = [
        (rn, rd) for rn, rd in room_map.items()
        if len(rd['allocs']) > 0
    ]
    # Also include empty rooms that are part of the allocation set
    if not rooms_with_allocs:
        rooms_with_allocs = list(room_map.items())

    num_rooms = len(rooms_with_allocs)

    for idx, (room_num, r_data) in enumerate(rooms_with_allocs):
        room = r_data['room']
        alloc_dict = r_data['allocs']
        allocated_count = len(alloc_dict)
        num_rows = room.rows  # 7
        bench_cols = room.columns // 2  # 3

        # ── Title ───────────────────────────────────────────────────────
        elements.append(Paragraph(
            f"ESAS - Seat Allotment: {session.name} | Room: {room_num}",
            title_style,
        ))
        elements.append(Paragraph(
            f"Capacity: {room.capacity} Seats  &bull;  "
            f"Allocated: {allocated_count}  &bull;  "
            f"Empty: {room.capacity - allocated_count}",
            subtitle_style,
        ))

        # ── Table data ──────────────────────────────────────────────────
        table_data = []
        table_styles = []

        # Row 0: Bench column headers
        header_row = [''] * 8
        header_labels = [
            (0, 1, f"COLUMN 1 (B1 – B{num_rows})"),
            (3, 4, f"COLUMN 2 (B{num_rows + 1} – B{num_rows * 2})"),
            (6, 7, f"COLUMN 3 (B{num_rows * 2 + 1} – B{num_rows * 3})"),
        ]
        for start, end, label in header_labels:
            header_row[start] = Paragraph(label, col_header_style)
            table_styles.extend([
                ('SPAN', (start, 0), (end, 0)),
                ('BACKGROUND', (start, 0), (end, 0), colors.HexColor('#1E293B')),
                ('TEXTCOLOR', (start, 0), (end, 0), colors.white),
            ])
        table_data.append(header_row)

        # General alignment
        table_styles.extend([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ])

        # Aisle columns: clean white background, no borders
        for aisle_col in [2, 5]:
            table_styles.append(
                ('BACKGROUND', (aisle_col, 0), (aisle_col, num_rows), colors.white)
            )

        # ── Seat rows ───────────────────────────────────────────────────
        # Bench-based seat numbering:
        #   Bench Col BC (0-based), physical cols = (BC*2+1, BC*2+2)
        #   LEFT seats:  seat_number = BC * (rows*2) + row  (row 1-based)
        #   RIGHT seats: seat_number = BC * (rows*2) + rows + row
        for row_idx in range(num_rows):
            row_cells = [''] * 8
            bench_row = row_idx + 1  # 1-based row

            for bc in range(bench_cols):
                # LEFT seat
                left_seat_num = bc * (num_rows * 2) + bench_row
                left_phys_col = bc * 2  # 0-based index into col_mapping
                left_tbl_col = col_mapping[left_phys_col]

                # RIGHT seat
                right_seat_num = bc * (num_rows * 2) + num_rows + bench_row
                right_phys_col = bc * 2 + 1
                right_tbl_col = col_mapping[right_phys_col]

                bench_num = bc * num_rows + bench_row

                # ── LEFT seat cell ──
                row_cells[left_tbl_col] = _build_seat_cell(
                    left_seat_num, bench_num, alloc_dict,
                    seat_title_style, pin_style,
                    empty_title_style, empty_text_style,
                )
                left_branch = alloc_dict[left_seat_num].candidate.branch.code if left_seat_num in alloc_dict else None
                _apply_cell_style(
                    table_styles, left_tbl_col, row_idx + 1,
                    left_seat_num in alloc_dict,
                    branch_code=left_branch,
                )

                # ── RIGHT seat cell ──
                row_cells[right_tbl_col] = _build_seat_cell(
                    right_seat_num, bench_num, alloc_dict,
                    seat_title_style, pin_style,
                    empty_title_style, empty_text_style,
                )
                right_branch = alloc_dict[right_seat_num].candidate.branch.code if right_seat_num in alloc_dict else None
                _apply_cell_style(
                    table_styles, right_tbl_col, row_idx + 1,
                    right_seat_num in alloc_dict,
                    branch_code=right_branch,
                )

            table_data.append(row_cells)

        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle(table_styles))
        elements.append(table)

        if idx < num_rooms - 1:
            elements.append(PageBreak())

    doc.build(elements)
    pdf_buffer.seek(0)

    response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = (
        f'attachment; filename="ESAS_Allotment_{session.name}.pdf"'
    )
    return response


def _build_seat_cell(seat_num, bench_num, alloc_dict,
                     seat_title_style, pin_style,
                     empty_title_style, empty_text_style):
    """Build a PDF cell for a single seat (allocated or empty)."""
    from reportlab.platypus import Spacer, Paragraph

    if seat_num in alloc_dict:
        alloc = alloc_dict[seat_num]
        pin = alloc.candidate.student.pin
        branch = alloc.candidate.branch.code
        return [
            Paragraph(f"B{bench_num} &bull; S{seat_num} ({branch})", seat_title_style),
            Spacer(1, 2),
            Paragraph(pin, pin_style),
        ]
    else:
        return [
            Paragraph(f"B{bench_num} &bull; S{seat_num}", empty_title_style),
            Spacer(1, 2),
            Paragraph("NOT ALLOCATED", empty_text_style),
        ]


def _apply_cell_style(table_styles, tbl_col, tbl_row, is_allocated, branch_code=None):
    """Apply clean black & white cell styling without branch or empty seat colors."""
    from reportlab.lib import colors as _c
    table_styles.extend([
        ('BACKGROUND', (tbl_col, tbl_row), (tbl_col, tbl_row), _c.white),
        ('BOX', (tbl_col, tbl_row), (tbl_col, tbl_row), 1, _c.HexColor('#0F172A')),
    ])
