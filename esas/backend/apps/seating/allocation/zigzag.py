"""
Bench-Based Seat Numbering

Generates seat positions for a bench-based layout where each
"bench column" consists of 2 physical columns (LEFT and RIGHT seat).

Default layout: 3 bench-columns × 7 rows = 21 benches = 42 seats

Seat numbering (column-major, left-side-first within each bench-column):

  Bench Col 1          Bench Col 2          Bench Col 3
  B1:  s1  s8          B8:  s15 s22         B15: s29 s36
  B2:  s2  s9          B9:  s16 s23         B16: s30 s37
  B3:  s3  s10         B10: s17 s24         B17: s31 s38
  B4:  s4  s11         B11: s18 s25         B18: s32 s39
  B5:  s5  s12         B12: s19 s26         B19: s33 s40
  B6:  s6  s13         B13: s20 s27         B20: s34 s41
  B7:  s7  s14         B14: s21 s28         B21: s35 s42

Physical column mapping:
  Bench Col 1 → physical cols (1, 2)
  Bench Col 2 → physical cols (3, 4)
  Bench Col 3 → physical cols (5, 6)
"""


def generate_zigzag_positions(columns=6, rows=7):
    """
    Generate seat positions in bench-based order.

    Args:
        columns: Number of physical columns (default: 6 = 3 bench-columns × 2)
        rows:    Number of rows (default: 7)

    Returns:
        List of dicts: [{'seat_number': 1, 'column': 1, 'row': 1}, ...]

    The numbering goes: for each bench-column (pair of 2 physical columns),
    number the LEFT seats top-to-bottom, then RIGHT seats top-to-bottom.
    """
    positions = []
    seat_num = 1
    bench_columns = columns // 2  # Number of bench-columns

    for bc in range(bench_columns):
        left_col = bc * 2 + 1   # Physical column index (1-based)
        right_col = bc * 2 + 2

        # LEFT seats: top → bottom
        for row in range(1, rows + 1):
            positions.append({
                'seat_number': seat_num,
                'column': left_col,
                'row': row,
            })
            seat_num += 1

        # RIGHT seats: top → bottom
        for row in range(1, rows + 1):
            positions.append({
                'seat_number': seat_num,
                'column': right_col,
                'row': row,
            })
            seat_num += 1

    return positions


def generate_grid_layout(columns=6, rows=7):
    """
    Generate a 2D grid mapping for display purposes.
    Returns a dict: (col, row) → seat_number

    Uses the same bench-based numbering as generate_zigzag_positions.
    """
    grid = {}
    for pos in generate_zigzag_positions(columns, rows):
        grid[(pos['column'], pos['row'])] = pos['seat_number']
    return grid


def get_bench_info(seat_number, columns=6, rows=7):
    """
    Given a seat number, return bench information.

    Returns:
        {
            'bench_number': int,      # 1-based bench number (B1, B2, ...)
            'bench_column': int,      # 1-based bench column (1, 2, 3)
            'bench_row': int,         # 1-based row within the bench column
            'side': 'LEFT' | 'RIGHT', # Which side of the bench
            'physical_column': int,   # 1-based physical column
            'physical_row': int,      # 1-based physical row
        }
    """
    seats_per_bench_col = rows * 2
    bench_col_index = (seat_number - 1) // seats_per_bench_col  # 0-based
    seat_in_bench_col = (seat_number - 1) % seats_per_bench_col  # 0-based

    if seat_in_bench_col < rows:
        # LEFT side
        side = 'LEFT'
        row = seat_in_bench_col + 1
        phys_col = bench_col_index * 2 + 1
    else:
        # RIGHT side
        side = 'RIGHT'
        row = seat_in_bench_col - rows + 1
        phys_col = bench_col_index * 2 + 2

    bench_row = row
    bench_number = bench_col_index * rows + bench_row

    return {
        'bench_number': bench_number,
        'bench_column': bench_col_index + 1,
        'bench_row': bench_row,
        'side': side,
        'physical_column': phys_col,
        'physical_row': row,
    }
