from django.db import models


class ExaminationSoftware(models.Model):
    """The root software mode (e.g., March/April Examination)."""
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Examination Software'
        ordering = ['name']

    def __str__(self):
        return self.name


class Curriculum(models.Model):
    """Curriculum version (e.g., C23, C20, C16)."""
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Curricula'
        ordering = ['-code']

    def __str__(self):
        return self.code


class Branch(models.Model):
    """Branch/Department (e.g., CME, ECE, EEE, ME)."""
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Branches'
        ordering = ['display_order', 'code']

    def __str__(self):
        return self.code


class AcademicYear(models.Model):
    """Academic year (1st, 2nd, 3rd) tied to a curriculum."""
    YEAR_CHOICES = [
        (1, '1st Year'),
        (2, '2nd Year'),
        (3, '3rd Year'),
    ]
    curriculum = models.ForeignKey(
        Curriculum, on_delete=models.CASCADE, related_name='academic_years'
    )
    year = models.PositiveSmallIntegerField(choices=YEAR_CHOICES)

    class Meta:
        ordering = ['curriculum', 'year']
        unique_together = ['curriculum', 'year']

    def __str__(self):
        year_str = dict(self.YEAR_CHOICES).get(self.year, str(self.year))
        return f'{self.curriculum.code} - {year_str}'


class Semester(models.Model):
    """Semester information, linked to academic year."""
    number = models.PositiveSmallIntegerField()
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE, related_name='semesters'
    )

    class Meta:
        unique_together = ['number', 'academic_year']
        ordering = ['academic_year', 'number']

    def __str__(self):
        return f'{self.academic_year} - Semester {self.number}'


class ExamSession(models.Model):
    """An examination session scoped to a software."""
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('NR_UPLOADED', 'NR Uploaded'),
        ('VALIDATED', 'Validated'),
        ('ALLOCATION_GENERATED', 'Allocation Generated'),
        ('REVIEWED', 'Reviewed'),
        ('LOCKED', 'Locked'),
        ('PUBLISHED', 'Published'),
        ('ARCHIVED', 'Archived'),
    ]

    software = models.ForeignKey(
        ExaminationSoftware, on_delete=models.CASCADE, related_name='sessions'
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    status = models.CharField(
        max_length=25, choices=STATUS_CHOICES, default='DRAFT'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_sessions'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.code})'


class SessionConfiguration(models.Model):
    """Links a session to active curricula and semesters."""
    session = models.ForeignKey(
        ExamSession, on_delete=models.CASCADE, related_name='configurations'
    )
    curriculum = models.ForeignKey(
        Curriculum, on_delete=models.CASCADE, related_name='session_configs'
    )
    semester = models.ForeignKey(
        Semester, on_delete=models.CASCADE, related_name='session_configs'
    )

    class Meta:
        unique_together = ['session', 'curriculum', 'semester']

    def __str__(self):
        return f'{self.session.code} - {self.semester}'


class Subject(models.Model):
    """Subject within a curriculum."""
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    curriculum = models.ForeignKey(
        Curriculum, on_delete=models.CASCADE, related_name='subjects'
    )
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name='subjects',
        null=True, blank=True,
        help_text='Null if common across branches'
    )
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE, related_name='subjects',
        null=True, blank=True
    )
    semester = models.ForeignKey(
        Semester, on_delete=models.CASCADE, related_name='subjects',
        null=True, blank=True
    )
    is_common = models.BooleanField(
        default=False,
        help_text='True if this subject is shared across multiple branches'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'
