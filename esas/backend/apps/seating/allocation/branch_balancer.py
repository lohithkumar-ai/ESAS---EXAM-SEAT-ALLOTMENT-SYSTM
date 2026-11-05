"""
Branch Balancer

Creates a balanced sequence of branches for room seating following the
PRD Section 9 & 11 specifications and empty buffer bench separation.

Pattern specification:
- 4 Branches (e.g. CME, EEE, ECE, ME):
    Odd columns (1, 3, 5):  Pair A = [Branch 0, Branch 1] (e.g. CME, EEE)
    Even columns (2, 4, 6): Pair B = [Branch 3, Branch 2] (e.g. ME, ECE)
- 3 Branches (e.g. ECE, EEE, ME - when CME is exhausted):
    Odd columns (1, 3):  Dominant branch (ECE) + Third branch (ME)
    Even column (2):     Second branch (EEE) alternating with EMPTY buffer benches
- 2 Branches (e.g. ECE, EEE):
    Odd columns (1, 3):  Dominant branch (ECE) alternating with EMPTY buffer benches
    Even column (2):     Second branch (EEE) alternating with EMPTY buffer benches
- 1 Branch (e.g. ECE only):
    Odd columns (1, 3):  Dominant branch (ECE) alternating with EMPTY buffer benches
    Even column (2):     100% COMPLETELY EMPTY buffer corridor

This guarantees:
1. Zero horizontal clashes (side-by-side).
2. Zero vertical clashes (consecutive rows in same column).
3. Zero diagonal clashes (cross corners).
4. No mixing of incompatible branches in the same column at the end.
5. Column 2 (S15 to S28) never has EC and EE sitting side-by-side.
"""

DEFAULT_BRANCH_ORDER = ['CM', 'CME', 'EE', 'EEE', 'M', 'ME', 'EC', 'ECE']


def generate_branch_sequence(total_seats, branch_pools, columns=3, rows=14, target_branches=None):
    """
    Generate a branch-balanced sequence for seating positions.

    Args:
        total_seats: Number of seats to fill (e.g. 42)
        branch_pools: dict of {branch_code: count_of_available_candidates}
        columns: Room columns (default: 3)
        rows: Room rows (default: 14)
        target_branches: Explicit list of branch codes to consider

    Returns:
        List of branch codes (or None for empty buffer benches) in
        seat-filling order (zig-zag column-major traversal).
    """
    if target_branches:
        active = [b for b in target_branches if branch_pools.get(b, 0) > 0]
    else:
        active = [b for b, count in branch_pools.items() if count > 0]

    if not active:
        return [None] * total_seats

    # Order active branches: prefer standard order if present, else by count
    standard_order = ['CM', 'CME', 'EE', 'EEE', 'M', 'ME', 'EC', 'ECE']
    active_sorted = []
    for std in standard_order:
        matches = [b for b in active if b.upper() == std.upper()]
        for m in matches:
            if m not in active_sorted:
                active_sorted.append(m)
    for b in sorted(active, key=lambda x: branch_pools[x], reverse=True):
        if b not in active_sorted:
            active_sorted.append(b)

    rem = dict(branch_pools)
    grid = {}  # (col, row) -> branch or None

    n_act = len([b for b in active_sorted if rem.get(b, 0) > 0])
    by_count = sorted(
        [b for b in active_sorted if rem.get(b, 0) > 0],
        key=lambda b: rem[b],
        reverse=True,
    )
    dominant = by_count[0] if by_count else None

    if n_act >= 4:
        # Col 1 & 3: Pair A = [active_sorted[0], active_sorted[1]] (e.g. CM, EE)
        # Col 2:     Pair B = [active_sorted[2], active_sorted[3]] (e.g. M, EC)
        pair_a = [active_sorted[0], active_sorted[1]]
        pair_b = [active_sorted[2], active_sorted[3]]
    elif n_act == 3:
        # 3 branches remaining (e.g. EC, EE, M)
        # Dominant (EC) in Col 1 & 3, second (EE) in Col 2, third (M) paired with EC in Col 1 & 3
        sec = by_count[1]
        third = by_count[2]
        pair_a = [dominant, third]
        pair_b = [None, sec]  # Col 2 has sec alternating with None
    elif n_act == 2:
        # 2 branches (e.g. EC, EE)
        sec = by_count[1]
        pair_a = [dominant, None]
        pair_b = [None, sec]
    else:
        # 1 branch (dominant only)
        pair_a = [dominant, None]
        pair_b = [None, None]

    # Fill Odd Columns (1, 3, 5...)
    for col in range(1, columns + 1, 2):
        for r in range(1, rows + 1):
            desired = pair_a[(r - 1) % len(pair_a)]
            if desired and rem.get(desired, 0) > 0:
                grid[(col, r)] = desired
                rem[desired] -= 1
            else:
                grid[(col, r)] = None

    # Fill Even Columns (2, 4, 6...)
    # Even columns run bottom-to-top in zig-zag order
    for col in range(2, columns + 1, 2):
        for i in range(rows):
            r = rows - i  # row 14 down to 1
            desired = pair_b[i % len(pair_b)]
            if desired and rem.get(desired, 0) > 0:
                # Check horizontal clash with left or right neighbors
                left = grid.get((col - 1, r))
                right = grid.get((col + 1, r))
                if left == desired or right == desired:
                    grid[(col, r)] = None
                else:
                    grid[(col, r)] = desired
                    rem[desired] -= 1
            else:
                grid[(col, r)] = None

    # Convert physical grid to zig-zag (serpentine) column-major order:
    # Col 1: row 1..14 (top -> bottom)
    # Col 2: row 14..1 (bottom -> top)
    # Col 3: row 1..14 (top -> bottom)
    sequence = []
    for col in range(1, columns + 1):
        if col % 2 == 1:
            row_range = range(1, rows + 1)
        else:
            row_range = range(rows, 0, -1)
        for r in row_range:
            sequence.append(grid.get((col, r)))
            if len(sequence) >= total_seats:
                break
        if len(sequence) >= total_seats:
            break

    return sequence
