"""
Data migration: Convert existing rooms from 3×14 to 6×7 (bench-based layout)
and regenerate all seat positions.
"""
from django.db import migrations


def convert_rooms_to_bench_layout(apps, schema_editor):
    """
    Update all rooms from columns=3, rows=14 to columns=6, rows=7.
    Delete existing seats and regenerate with bench-based numbering.
    """
    Room = apps.get_model('rooms', 'Room')
    Seat = apps.get_model('rooms', 'Seat')

    for room in Room.objects.all():
        # Only convert rooms that have the old 3×14 layout
        if room.columns == 3 and room.rows == 14:
            room.columns = 6
            room.rows = 7
            # capacity stays 42 (6×7 = 42)
            room.save()

        # Delete all existing seats for this room
        Seat.objects.filter(room=room).delete()

        # Regenerate seats with bench-based numbering
        cols = room.columns
        rows = room.rows
        bench_columns = cols // 2
        seat_num = 1

        for bc in range(bench_columns):
            left_col = bc * 2 + 1
            right_col = bc * 2 + 2

            # LEFT seats: top → bottom
            for row in range(1, rows + 1):
                Seat.objects.create(
                    room=room,
                    seat_number=seat_num,
                    column=left_col,
                    row=row,
                    is_active=True,
                )
                seat_num += 1

            # RIGHT seats: top → bottom
            for row in range(1, rows + 1):
                Seat.objects.create(
                    room=room,
                    seat_number=seat_num,
                    column=right_col,
                    row=row,
                    is_active=True,
                )
                seat_num += 1


def revert_rooms_to_old_layout(apps, schema_editor):
    """Revert rooms back to 3×14 with zigzag seat numbering."""
    Room = apps.get_model('rooms', 'Room')
    Seat = apps.get_model('rooms', 'Seat')

    for room in Room.objects.all():
        if room.columns == 6 and room.rows == 7:
            room.columns = 3
            room.rows = 14
            room.save()

        Seat.objects.filter(room=room).delete()

        seat_num = 1
        for col in range(1, 4):
            for row in range(1, 15):
                Seat.objects.create(
                    room=room,
                    seat_number=seat_num,
                    column=col,
                    row=row,
                    is_active=True,
                )
                seat_num += 1


class Migration(migrations.Migration):

    dependencies = [
        ('rooms', '0003_update_room_defaults_bench_layout'),
    ]

    operations = [
        migrations.RunPython(
            convert_rooms_to_bench_layout,
            revert_rooms_to_old_layout,
        ),
    ]

