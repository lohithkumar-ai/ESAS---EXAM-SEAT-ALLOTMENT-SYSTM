"""
One-time cleanup script for bogus SNO/SINO/UNNAMED data.
Run: python cleanup_bogus.py
"""
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from apps.students.models import Student, ExamCandidate
from apps.examinations.models import Branch, Subject
from apps.seating.models import SeatAllocation

bogus_branch_codes = ['SNO', 'SINO', 'UNNAMED']

print("=== Cleaning bogus data ===")

# Delete allocations, candidates, students for bogus branches
SeatAllocation.objects.filter(candidate__branch__code__in=bogus_branch_codes).delete()
ExamCandidate.objects.filter(branch__code__in=bogus_branch_codes).delete()
ExamCandidate.objects.filter(subject__code__startswith='UNNAMED').delete()
Student.objects.filter(branch__code__in=bogus_branch_codes).delete()
Subject.objects.filter(code__startswith='UNNAMED').delete()
Subject.objects.filter(code='SNO').delete()

for code in bogus_branch_codes:
    Branch.objects.filter(code=code).delete()

print("Remaining branches:", list(Branch.objects.values_list('code', flat=True)))
print("Remaining students:", Student.objects.count())
print("Remaining candidates:", ExamCandidate.objects.count())
print("Done!")
