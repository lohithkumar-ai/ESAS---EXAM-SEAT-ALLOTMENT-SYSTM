import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.examinations.models import Curriculum, AcademicYear, Semester

def seed_years_semesters():
    curricula = Curriculum.objects.all()
    for c in curricula:
        for year in [1, 2, 3]:
            ay, created = AcademicYear.objects.get_or_create(curriculum=c, year=year)
            if created:
                print(f"Created Academic Year {year} for {c.code}")
            
            # Semesters for year 1 are typically 1,2 or just 1st year
            # Let's create semesters for each year. 
            if year == 1:
                sem_nums = [1, 2] if c.code != 'C-16' else [1]
            elif year == 2:
                sem_nums = [3, 4]
            else:
                sem_nums = [5, 6]
                
            for sem_num in sem_nums:
                sem, sem_created = Semester.objects.get_or_create(academic_year=ay, number=sem_num)
                if sem_created:
                    print(f"Created Semester {sem_num} for {ay}")

if __name__ == '__main__':
    seed_years_semesters()
