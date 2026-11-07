"""
Branch Balancer — Bench-Based Pattern

Creates a balanced sequence of branches for room seating following
the bench-based layout where each bench has a LEFT and RIGHT seat.

Pattern specification (4 branches: CM, EE, EC, M):
─────────────────────────────────────────────────────
Each bench seats TWO students side-by-side. Branches are assigned
in pairs at the bench level:

  Pair A = CM (left) + EC (right)
  Pair B = EE (left) + M  (right)

Row-level alternation:
  Bench Columns 1 & 3:  Odd rows (1,3,5,7) → Pair A;  Even rows (2,4,6) → Pair B
  Bench Column 2:       Odd rows (1,3,5,7) → Pair B;  Even rows (2,4,6) → Pair A
  (Column 2 is INVERTED relative to columns 1 & 3)

This guarantees:
  ✓ Zero horizontal clashes (left/right on same bench are different branches)
  ✓ Zero vertical clashes (consecutive rows in same physical column alternate)
  ✓ Zero diagonal clashes (cross corners are guaranteed different)

Seat numbering within each bench column:
  LEFT seats numbered top-to-bottom first (s1–s7),
  then RIGHT seats top-to-bottom (s8–s14).

Fallback patterns for fewer branches:
  3 branches: Pair A = (B0, B2), Pair B = (B1, buffer), with column inversion
  2 branches: Pair A = (B0, buffer), Pair B = (B1, buffer)
  1 branch:   Pair A = (B0, buffer), columns 1&3 only; column 2 = all buffer
"""

# Standard branch ordering — short codes first, then full names
BRANCH_PAIR_ORDER = {
    # Map short NR codes to pair positions
    'CM':  ('A', 'LEFT'),  'CME': ('A', 'LEFT'),
    'EC':  ('A', 'RIGHT'), 'ECE': ('A', 'RIGHT'),
    'EE':  ('B', 'LEFT'),  'EEE': ('B', 'LEFT'),
    'M':   ('B', 'RIGHT'), 'ME':  ('B', 'RIGHT'),
}

# Preferred ordering for pair assignment when branches don't match standard codes
DEFAULT_BRANCH_ORDER = ['CM', 'CME', 'EE', 'EEE', 'M', 'ME', 'EC', 'ECE']


def generate_branch_sequence(total_seats, branch_pools, columns=6, rows=7, target_branches=None):
    """
    Generate a branch-balanced sequence for bench-based seating positions.

    The sequence is ordered by seat number (bench-column-major, left-first):
      Bench Col 1 LEFT (s1–s7), Bench Col 1 RIGHT (s8–s14),
      Bench Col 2 LEFT (s15–s21), Bench Col 2 RIGHT (s22–s28),
      Bench Col 3 LEFT (s29–s35), Bench Col 3 RIGHT (s36–s42).

    Args:
        total_seats:     Number of seats to fill (e.g. 42)
        branch_pools:    dict of {branch_code: count_of_available_candidates}
        columns:         Physical columns (default: 6 = 3 bench-cols × 2)
        rows:            Rows per bench column (default: 7)
        target_branches: Explicit list of branch codes to consider

    Returns:
        List of branch codes (or None for empty buffer seats) in
        seat-number order.
    """
    if target_branches:
        active = [b for b in target_branches if branch_pools.get(b, 0) > 0]
    else:
        active = [b for b, count in branch_pools.items() if count > 0]

    if not active:
        return [None] * total_seats

    # Sort active branches by the standard order, then by count
    active_sorted = _sort_branches(active, branch_pools)

    # Determine pair assignments
    pair_a_left, pair_a_right, pair_b_left, pair_b_right = _assign_pairs(active_sorted, branch_pools)

    bench_columns = columns // 2  # Number of bench columns

    # Build the physical grid: (physical_col, row) → branch or None
    grid = {}
    rem = dict(branch_pools)

    for bc in range(bench_columns):
        left_col = bc * 2 + 1
        right_col = bc * 2 + 2
        bench_col_num = bc + 1  # 1-based bench column number

        for row in range(1, rows + 1):
            is_odd_row = (row % 2 == 1)

            # Determine which pair to use for this row
            if bench_col_num % 2 == 1:
                # Bench columns 1, 3, 5...: odd rows = Pair A, even rows = Pair B
                use_pair_a = is_odd_row
            else:
                # Bench column 2, 4...: INVERTED — odd rows = Pair B, even rows = Pair A
                use_pair_a = not is_odd_row

            if use_pair_a:
                left_branch = pair_a_left
                right_branch = pair_a_right
            else:
                left_branch = pair_b_left
                right_branch = pair_b_right

            # Place LEFT seat
            if left_branch and rem.get(left_branch, 0) > 0:
                grid[(left_col, row)] = left_branch
                rem[left_branch] -= 1
            else:
                grid[(left_col, row)] = None

            # Place RIGHT seat
            if right_branch and rem.get(right_branch, 0) > 0:
                grid[(right_col, row)] = right_branch
                rem[right_branch] -= 1
            else:
                grid[(right_col, row)] = None

    # Convert grid to seat-number order sequence
    # Order: for each bench column, LEFT seats (rows 1..N), then RIGHT seats (rows 1..N)
    sequence = []
    for bc in range(bench_columns):
        left_col = bc * 2 + 1
        right_col = bc * 2 + 2

        # LEFT seats top-to-bottom
        for row in range(1, rows + 1):
            sequence.append(grid.get((left_col, row)))

        # RIGHT seats top-to-bottom
        for row in range(1, rows + 1):
            sequence.append(grid.get((right_col, row)))

    # Trim or pad to total_seats
    if len(sequence) > total_seats:
        sequence = sequence[:total_seats]
    while len(sequence) < total_seats:
        sequence.append(None)

    return sequence


def _sort_branches(active, branch_pools):
    """Sort active branches by standard order, then by candidate count."""
    active_sorted = []
    for std in DEFAULT_BRANCH_ORDER:
        matches = [b for b in active if b.upper() == std.upper()]
        for m in matches:
            if m not in active_sorted:
                active_sorted.append(m)
    # Add any remaining branches not in the standard order
    for b in sorted(active, key=lambda x: branch_pools[x], reverse=True):
        if b not in active_sorted:
            active_sorted.append(b)
    return active_sorted


def _assign_pairs(active_sorted, branch_pools):
    """
    Assign branches to pair positions.

    Returns: (pair_a_left, pair_a_right, pair_b_left, pair_b_right)
    Each can be a branch code or None (buffer).
    """
    n = len(active_sorted)

    if n >= 4:
        # Try to match standard pair positions
        pair_a_left = None
        pair_a_right = None
        pair_b_left = None
        pair_b_right = None

        for b in active_sorted:
            info = BRANCH_PAIR_ORDER.get(b.upper())
            if info:
                pair_name, side = info
                if pair_name == 'A' and side == 'LEFT' and pair_a_left is None:
                    pair_a_left = b
                elif pair_name == 'A' and side == 'RIGHT' and pair_a_right is None:
                    pair_a_right = b
                elif pair_name == 'B' and side == 'LEFT' and pair_b_left is None:
                    pair_b_left = b
                elif pair_name == 'B' and side == 'RIGHT' and pair_b_right is None:
                    pair_b_right = b

        # Fill any unmatched positions with remaining branches
        remaining = [b for b in active_sorted if b not in [pair_a_left, pair_a_right, pair_b_left, pair_b_right]]
        for slot_setter in [
            lambda b: _set_if_none(pair_a_left, b),
        ]:
            pass

        # Simpler approach: fill empty slots
        if pair_a_left is None and remaining:
            pair_a_left = remaining.pop(0)
        if pair_a_right is None and remaining:
            pair_a_right = remaining.pop(0)
        if pair_b_left is None and remaining:
            pair_b_left = remaining.pop(0)
        if pair_b_right is None and remaining:
            pair_b_right = remaining.pop(0)

        return pair_a_left, pair_a_right, pair_b_left, pair_b_right

    elif n == 3:
        # 3 branches: Pair A gets branches 0 and 2, Pair B gets branch 1 + buffer
        by_count = sorted(active_sorted, key=lambda b: branch_pools[b], reverse=True)
        return by_count[0], by_count[2], by_count[1], None

    elif n == 2:
        # 2 branches: each on left of their pair, right = buffer
        by_count = sorted(active_sorted, key=lambda b: branch_pools[b], reverse=True)
        return by_count[0], None, by_count[1], None

    else:
        # 1 branch: only left of Pair A, everything else buffer
        return active_sorted[0], None, None, None
