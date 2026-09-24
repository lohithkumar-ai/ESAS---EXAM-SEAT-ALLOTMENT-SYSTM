from django.contrib import admin
from .models import SeatAllocation, AllocationAuditLog


@admin.register(SeatAllocation)
class SeatAllocationAdmin(admin.ModelAdmin):
    list_display = [
        'candidate', 'room', 'seat', 'is_locked',
        'is_manual', 'created_at'
    ]
    list_filter = ['exam_session', 'room', 'is_locked', 'is_manual']
    search_fields = [
        'candidate__student__pin', 'candidate__student__name'
    ]
    raw_id_fields = ['candidate', 'seat']


@admin.register(AllocationAuditLog)
class AllocationAuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'exam_session', 'user', 'timestamp']
    list_filter = ['action', 'exam_session']
    readonly_fields = ['timestamp']
