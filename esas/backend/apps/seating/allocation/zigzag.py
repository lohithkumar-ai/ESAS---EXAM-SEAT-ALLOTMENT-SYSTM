"""
Zig-Zag / Serpentine Seat Numbering

Generates seat positions in a serpentine (zig-zag) pattern:
  Column 1: Top → Bottom
  Column 2: Bottom → Top
  Column 3: Top → Bottom
  ...

Default layout: 3 columns × 14 rows = 42 seats

Seat numbering example (3×14):
  01  15  29
  02  16  30
  03  17  31
  04  18  32
  05  19  33
  06  20  34
  07  21  35
  08  22  36
  09  23  37
  10  24  38
  11  25  39
  12  26  40
  13  27  41
  14  28  42
"""


def generate_zigzag_positions(columns=3, rows=14):
    """
    Generate seat positions in zig-zag / serpentine order.

    Returns a list of dicts:
      [{'seat_number': 1, 'column': 1, 'row': 1}, ...]

    The traversal order (for filling students) is:
      Col 1 top→bottom, Col 2 bottom→top, Col 3 top→bottom, ...
    """
    positions = []
    seat_num = 1

    for col in range(1, columns + 1):
        if col % 2 == 1:
            # Odd column: top → bottom
            for row in range(1, rows + 1):
                positions.append({
                    'seat_number': seat_num,
                    'column': col,
                    'row': row,
                })
                seat_num += 1
        else:
            # Even column: bottom → top
            for row in range(rows, 0, -1):
                positions.append({
                    'seat_number': seat_num,
                    'column': col,
                    'row': row,
                })
                seat_num += 1

    return positions


def generate_grid_layout(columns=3, rows=14):
    """
    Generate a 2D grid mapping for display purposes.
    Returns a dict: (col, row) → seat_number

    The seat numbers in the grid follow column-major order:
      Col 1 gets seats 1..rows
      Col 2 gets seats (rows+1)..2*rows
      etc.
    """
    grid = {}
    seat_num = 1
    for col in range(1, columns + 1):
        for row in range(1, rows + 1):
            grid[(col, row)] = seat_num
            seat_num += 1
    return grid
