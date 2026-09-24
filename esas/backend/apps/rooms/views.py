"""Views for the rooms app."""
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Room, Seat
from .serializers import RoomSerializer, RoomListSerializer, RoomCreateSerializer
from apps.seating.allocation.zigzag import generate_zigzag_positions


class RoomViewSet(viewsets.ModelViewSet):

    def get_queryset(self):
        qs = Room.objects.all()
        if self.action == 'list':
            session_id = self.request.query_params.get('session_id')
            if session_id:
                qs = qs.annotate(
                    allocated_count=Count(
                        'allocations',
                        filter=Q(allocations__exam_session_id=session_id)
                    )
                )
            else:
                qs = qs.annotate(allocated_count=Count('allocations'))
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return RoomListSerializer
        if self.action == 'create':
            return RoomCreateSerializer
        return RoomSerializer

    def perform_create(self, serializer):
        room = serializer.save()
        # Auto-generate seats
        positions = generate_zigzag_positions(
            columns=room.columns, rows=room.rows
        )
        seats = [
            Seat(
                room=room,
                seat_number=pos['seat_number'],
                column=pos['column'],
                row=pos['row'],
            )
            for pos in positions
        ]
        Seat.objects.bulk_create(seats)

    @action(detail=True, methods=['get'])
    def seating_chart(self, request, pk=None):
        """Get seating chart with allocation data for a room."""
        room = self.get_object()
        session_id = request.query_params.get('session_id')

        seats = room.seats.filter(is_active=True).order_by('seat_number')
        chart_data = []

        from apps.seating.models import SeatAllocation

        for seat in seats:
            seat_info = {
                'seat_number': seat.seat_number,
                'column': seat.column,
                'row': seat.row,
                'student': None,
            }

            if session_id:
                alloc = SeatAllocation.objects.filter(
                    exam_session_id=session_id,
                    seat=seat,
                    room=room,
                ).select_related(
                    'candidate__student', 'candidate__branch'
                ).first()

                if alloc:
                    seat_info['student'] = {
                        'pin': alloc.candidate.student.pin,
                        'name': alloc.candidate.student.name,
                        'branch': alloc.candidate.branch.code,
                        'category': alloc.candidate.category,
                    }

            chart_data.append(seat_info)

        return Response({
            'room_number': room.room_number,
            'columns': room.columns,
            'rows': room.rows,
            'capacity': room.capacity,
            'seats': chart_data,
        })
