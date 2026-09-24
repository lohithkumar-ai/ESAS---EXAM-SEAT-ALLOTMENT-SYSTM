from django.db import models


class Student(models.Model):
    """A student record from the Nominal Roll."""
    pin = models.CharField(max_length=30, db_index=True)
    name = models.CharField(max_length=200)
    branch = models.ForeignKey(
        'examinations.Branch', on_delete=models.CASCADE, related_name='students'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['pin']

    def __str__(self):
        return f'{self.pin} - {self.name}'


class ExamCandidate(models.Model):
    """
    A student's candidature for a specific exam session, subject and category.
    This is the core entity used by the allocation engine.
    """
    CATEGORY_CHOICES = [
        ('REGULAR', 'Regular'),
        ('SUPPLEMENTARY', 'Supplementary'),
    ]

    exam_session = models.ForeignKey(
        'examinations.ExamSession', on_delete=models.CASCADE,
        related_name='candidates'
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name='candidatures'
    )
    curriculum = models.ForeignKey(
        'examinations.Curriculum', on_delete=models.CASCADE,
        related_name='candidates'
    )
    branch = models.ForeignKey(
        'examinations.Branch', on_delete=models.CASCADE,
        related_name='candidates'
    )
    academic_year = models.ForeignKey(
        'examinations.AcademicYear', on_delete=models.CASCADE,
        related_name='candidates'
    )
    semester = models.ForeignKey(
        'examinations.Semester', on_delete=models.CASCADE,
        related_name='candidates', null=True, blank=True
    )
    subject = models.ForeignKey(
        'examinations.Subject', on_delete=models.CASCADE,
        related_name='candidates'
    )
    category = models.CharField(
        max_length=15, choices=CATEGORY_CHOICES, default='REGULAR'
    )
    nr_upload = models.ForeignKey(
        'nr_import.NRUpload', on_delete=models.CASCADE,
        related_name='candidates', null=True, blank=True
    )
    nr_row_number = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Original row number in the NR Excel file'
    )
    is_valid = models.BooleanField(default=True)
    validation_errors = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['branch__code', 'student__pin']
        unique_together = [
            'exam_session', 'student', 'subject'
        ]

    def __str__(self):
        return (
            f'{self.student.pin} - {self.subject.code} '
            f'({self.get_category_display()})'
        )
