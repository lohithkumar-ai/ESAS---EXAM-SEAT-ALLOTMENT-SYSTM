"""Serializers for the rooms app."""
from rest_framework import serializers
from .models import Room, Seat


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ['id', 'seat_number', 'column', 'row', 'is_active']


class RoomSerializer(serializers.ModelSerializer):
    total_seats = serializers.IntegerField(read_only=True)
    seats = SeatSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = [
            'id', 'room_number', 'name', 'capacity', 'columns',
            'rows', 'is_active', 'display_order', 'total_seats', 'seats'
        ]


class RoomListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (without nested seats)."""
    total_seats = serializers.IntegerField(read_only=True)
    allocated_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Room
        fields = [
            'id', 'room_number', 'name', 'capacity', 'columns',
            'rows', 'is_active', 'display_order', 'total_seats',
            'allocated_count'
        ]


class RoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['room_number', 'name', 'capacity', 'columns', 'rows']
