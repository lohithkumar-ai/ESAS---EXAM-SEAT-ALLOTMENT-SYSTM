"""
Management command to seed initial data: branches, curricula, years, rooms.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from apps.examinations.models import (
    Curriculum, Branch, AcademicYear, Semester, ExamSession
)
from apps.rooms.models import Room, Seat
from apps.seating.allocation.zigzag import generate_zigzag_positions


class Command(BaseCommand):
    help = 'Seed the database with initial configuration data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...\n')

        # ── Create superuser ────────────────────────────────────────────
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@esas.local',
                password='admin123',
            )
            self.stdout.write(self.style.SUCCESS('  [OK] Admin user created (admin / admin123)'))
        else:
            self.stdout.write('  - Admin user already exists')

        # ── Branches ────────────────────────────────────────────────────
        branches_data = [
            ('CME', 'Computer Engineering', 1),
            ('ECE', 'Electronics & Communication Engineering', 2),
            ('EEE', 'Electrical & Electronics Engineering', 3),
            ('ME', 'Mechanical Engineering', 4),
        ]
        for code, name, order in branches_data:
            Branch.objects.get_or_create(
                code=code,
                defaults={'name': name, 'display_order': order}
            )
        self.stdout.write(self.style.SUCCESS('  [OK] Branches seeded'))

        # ── Curricula ───────────────────────────────────────────────────
        for code in ['C23', 'C20', 'C16']:
            Curriculum.objects.get_or_create(
                code=code, defaults={'name': f'Curriculum {code}'}
            )
        self.stdout.write(self.style.SUCCESS('  [OK] Curricula seeded'))

        # ── Academic Years ──────────────────────────────────────────────
        for year in [1, 2, 3]:
            ay, _ = AcademicYear.objects.get_or_create(year=year)
            # Create common semesters for each year
            if year == 1:
                sems = [1, 2]
            elif year == 2:
                sems = [3, 4]
            else:
                sems = [5, 6]
            for sem in sems:
                Semester.objects.get_or_create(
                    number=sem, academic_year=ay
                )
        self.stdout.write(self.style.SUCCESS('  [OK] Academic years & semesters seeded'))

        # ── Rooms ───────────────────────────────────────────────────────
        for i in range(1, 7):
            room, created = Room.objects.get_or_create(
                room_number=str(100 + i),
                defaults={
                    'name': f'Room {100 + i}',
                    'capacity': 42,
                    'columns': 6,
                    'rows': 7,
                    'display_order': i,
                }
            )
            if created:
                # Auto-generate seats
                positions = generate_zigzag_positions(
                    columns=room.columns, rows=room.rows
                )
                seats = [
                    Seat(
                        room=room,
                        seat_number=pos['seat_number'],
                        column=pos['column'],
                        row=pos['row'],
                    )
                    for pos in positions
                ]
                Seat.objects.bulk_create(seats)

        self.stdout.write(self.style.SUCCESS('  [OK] 6 rooms seeded (101-106) with 42 seats each'))

        # ── Sample Exam Session ─────────────────────────────────────────
        ExamSession.objects.get_or_create(
            name='March-April 2027',
            session_type='MARCH_APRIL',
            defaults={
                'academic_year_label': '2026-2027',
                'status': 'DRAFT',
            }
        )
        self.stdout.write(self.style.SUCCESS('  [OK] Sample exam session created'))

        self.stdout.write(self.style.SUCCESS('\nSeed data complete!'))
