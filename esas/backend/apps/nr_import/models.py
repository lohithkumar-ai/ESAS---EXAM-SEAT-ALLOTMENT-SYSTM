from django.db import models


class NRUpload(models.Model):
    """Record of a Nominal Roll file upload."""
    STATUS_CHOICES = [
        ('UPLOADED', 'Uploaded'),
        ('VALIDATING', 'Validating'),
        ('VALIDATED', 'Validated'),
        ('ERRORS', 'Has Errors'),
        ('IMPORTED', 'Imported'),
        ('FAILED', 'Failed'),
    ]

    exam_session = models.ForeignKey(
        'examinations.ExamSession', on_delete=models.CASCADE,
        related_name='nr_uploads'
    )
    file = models.FileField(upload_to='nr_uploads/%Y/%m/')
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default='UPLOADED'
    )
    total_rows = models.PositiveIntegerField(default=0)
    valid_rows = models.PositiveIntegerField(default=0)
    error_rows = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'NR Upload'
        verbose_name_plural = 'NR Uploads'

    def __str__(self):
        return f'{self.original_filename} ({self.get_status_display()})'


class NRValidationError(models.Model):
    """Individual validation error found during NR processing."""
    ERROR_TYPES = [
        ('MISSING_PIN', 'Missing PIN'),
        ('DUPLICATE_PIN', 'Duplicate PIN'),
        ('MISSING_NAME', 'Missing Name'),
        ('INVALID_BRANCH', 'Invalid Branch'),
        ('INVALID_YEAR', 'Invalid Year'),
        ('INVALID_CURRICULUM', 'Invalid Curriculum'),
        ('MISSING_SUBJECT_CODE', 'Missing Subject Code'),
        ('MISSING_SUBJECT_NAME', 'Missing Subject Name'),
        ('INVALID_CATEGORY', 'Invalid Category'),
        ('DUPLICATE_RECORD', 'Duplicate Record'),
        ('INVALID_DATA', 'Invalid Data'),
    ]

    nr_upload = models.ForeignKey(
        NRUpload, on_delete=models.CASCADE, related_name='errors'
    )
    row_number = models.PositiveIntegerField()
    error_type = models.CharField(max_length=25, choices=ERROR_TYPES)
    column_name = models.CharField(max_length=50, blank=True)
    value = models.CharField(max_length=200, blank=True)
    message = models.CharField(max_length=500)

    class Meta:
        ordering = ['row_number']

    def __str__(self):
        return f'Row {self.row_number}: {self.message}'
