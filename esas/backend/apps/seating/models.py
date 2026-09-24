from django.db import models


class SeatAllocation(models.Model):
    """Maps an ExamCandidate to a specific Seat in a specific ExamSession."""
    exam_session = models.ForeignKey(
        'examinations.ExamSession', on_delete=models.CASCADE,
        related_name='allocations'
    )
    candidate = models.ForeignKey(
        'students.ExamCandidate', on_delete=models.CASCADE,
        related_name='allocations'
    )
    room = models.ForeignKey(
        'rooms.Room', on_delete=models.CASCADE,
        related_name='allocations'
    )
    seat = models.ForeignKey(
        'rooms.Seat', on_delete=models.CASCADE,
        related_name='allocations'
    )
    is_locked = models.BooleanField(default=False)
    is_manual = models.BooleanField(
        default=False,
        help_text='True if this allocation was manually assigned or adjusted'
    )
    substituted_branch = models.CharField(
        max_length=10, blank=True,
        help_text='Original expected branch if substitution occurred'
    )
    substitution_reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [
            ('exam_session', 'candidate'),
            ('exam_session', 'room', 'seat'),
        ]
        ordering = ['room__room_number', 'seat__seat_number']

    def __str__(self):
        return (
            f'{self.candidate.student.pin} → '
            f'Room {self.room.room_number} Seat {self.seat.seat_number}'
        )


class AllocationAuditLog(models.Model):
    """Audit trail for all allocation-related actions."""
    ACTION_CHOICES = [
        ('GENERATED', 'Allocation Generated'),
        ('REGENERATED', 'Allocation Regenerated'),
        ('MOVED', 'Student Moved'),
        ('SWAPPED', 'Students Swapped'),
        ('ROOM_CHANGED', 'Room Changed'),
        ('SEAT_CHANGED', 'Seat Changed'),
        ('LOCKED', 'Session Locked'),
        ('UNLOCKED', 'Session Unlocked'),
        ('EXCLUDED', 'Student Excluded'),
        ('ADDED', 'Student Added'),
        ('EXPORTED', 'Report Exported'),
    ]

    exam_session = models.ForeignKey(
        'examinations.ExamSession', on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    user = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField(blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    reason = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.get_action_display()} - {self.timestamp}'
