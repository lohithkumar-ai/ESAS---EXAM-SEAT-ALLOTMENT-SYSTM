import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from apps.examinations.models import ExaminationSoftware, Curriculum, Branch

def seed():
    # Superuser
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin')
        print("Created superuser 'admin' with password 'admin'")

    # Software
    softwares = ['March / April Examination', 'October / November Examination']
    for name in softwares:
        ExaminationSoftware.objects.get_or_create(name=name)
        print(f"Created software: {name}")

    # Curricula
    curricula = ['C-23', 'C-20', 'C-16']
    for c in curricula:
        Curriculum.objects.get_or_create(code=c, defaults={'name': f'{c} Curriculum'})
        print(f"Created curriculum: {c}")

    # Branches
    branches = [
        ('CME', 'Computer Engineering', 1),
        ('ECE', 'Electronics and Communication', 2),
        ('EEE', 'Electrical and Electronics', 3),
        ('ME', 'Mechanical Engineering', 4),
    ]
    for code, name, order in branches:
        Branch.objects.get_or_create(code=code, defaults={'name': name, 'display_order': order})
        print(f"Created branch: {code}")

if __name__ == '__main__':
    seed()
