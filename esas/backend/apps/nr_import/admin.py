from django.contrib import admin
from .models import NRUpload, NRValidationError


@admin.register(NRUpload)
class NRUploadAdmin(admin.ModelAdmin):
    list_display = [
        'original_filename', 'exam_session', 'status',
        'total_rows', 'valid_rows', 'error_rows', 'uploaded_at'
    ]
    list_filter = ['status', 'exam_session']
    readonly_fields = ['uploaded_at', 'processed_at']


@admin.register(NRValidationError)
class NRValidationErrorAdmin(admin.ModelAdmin):
    list_display = ['nr_upload', 'row_number', 'error_type', 'message']
    list_filter = ['error_type', 'nr_upload']
