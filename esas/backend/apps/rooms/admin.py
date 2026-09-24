from django.contrib import admin
from .models import Room, Seat


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = [
        'room_number', 'name', 'capacity', 'columns',
        'rows', 'is_active', 'display_order'
    ]
    list_filter = ['is_active']
    search_fields = ['room_number', 'name']


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ['room', 'seat_number', 'column', 'row', 'is_active']
    list_filter = ['room', 'is_active']
