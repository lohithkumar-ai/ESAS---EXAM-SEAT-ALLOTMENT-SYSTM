from django.db import models
from django.conf import settings


class Room(models.Model):
    """A physical examination room."""
    room_number = models.CharField(max_length=20)
    name = models.CharField(max_length=100, blank=True)
    capacity = models.PositiveIntegerField(default=42)
    columns = models.PositiveIntegerField(default=3)
    rows = models.PositiveIntegerField(default=14)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'room_number']

    def __str__(self):
        return f'Room {self.room_number}'

    @property
    def total_seats(self):
        return self.columns * self.rows


class Seat(models.Model):
    """An individual seat position within a room."""
    room = models.ForeignKey(
        Room, on_delete=models.CASCADE, related_name='seats'
    )
    seat_number = models.PositiveIntegerField()
    column = models.PositiveIntegerField()
    row = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['room', 'seat_number']
        ordering = ['seat_number']

    def __str__(self):
        return f'Room {self.room.room_number} - Seat {self.seat_number}'
