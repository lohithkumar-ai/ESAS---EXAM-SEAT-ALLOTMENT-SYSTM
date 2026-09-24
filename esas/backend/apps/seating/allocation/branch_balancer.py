"""
Branch Balancer

Creates a balanced sequence of branches for room seating.
Handles branch substitution when a branch runs out of candidates.

Preferred pattern:
  CME  EEE  CME  EEE  CME  EEE
  ECE  ME   ECE  ME   ECE  ME
  CME  EEE  CME  EEE  CME  EEE
  ...
"""
from collections import deque


# Default branch pattern for odd/even rows
DEFAULT_PATTERN = {
    'odd_columns': ['CME', 'ECE'],   # Columns 1, 3, 5
    'even_columns': ['EEE', 'ME'],   # Columns 2, 4, 6
}


def generate_branch_sequence(total_seats, branch_pools, columns=3, rows=14, target_branches=None):
    """
    Generate a branch-balanced sequence for seating positions.

    With 3 columns × 14 rows:
      Col 1: Branch A, B alternating per row
      Col 2: Branch C, D alternating per row
      Col 3: Branch A, B alternating per row (offset)

    This ensures no two adjacent seats (horizontally) share the same branch.

    Args:
        total_seats: Number of seats to fill
        branch_pools: dict of {branch_code: count_of_available_candidates}
        columns: Room columns
        rows: Room rows
        target_branches: Explicit sequence of branches to use for the pattern

    Returns:
        List of branch codes in seat-filling order (zig-zag traversal).
    """
    if target_branches:
        available_branches = [b for b in target_branches if branch_pools.get(b, 0) > 0]
    else:
        available_branches = sorted(
            [b for b, count in branch_pools.items() if count > 0],
            key=lambda b: branch_pools[b],
            reverse=True
        )

    if not available_branches:
        return []

    # If fewer than 2 branches, just repeat what we have
    if len(available_branches) == 1:
        return [available_branches[0]] * min(
            total_seats, branch_pools[available_branches[0]]
        )

    # Build the ideal pattern for each seat position
    sequence = []
    remaining = dict(branch_pools)

    # Create alternating pairs for columns
    branches_to_use = available_branches
    if len(branches_to_use) == 4:
        pair_a = [branches_to_use[0], branches_to_use[1]]
        pair_b = [branches_to_use[2], branches_to_use[3]]
    elif len(branches_to_use) >= 2:
        pair_a = [b for i, b in enumerate(branches_to_use) if i % 2 == 0]
        pair_b = [b for i, b in enumerate(branches_to_use) if i % 2 == 1]
        if not pair_b:
            pair_b = pair_a
    else:
        pair_a = branches_to_use
        pair_b = branches_to_use

    # Generate seat-by-seat branch assignment following zig-zag order
    for seat_idx in range(total_seats):
        col = (seat_idx // rows) + 1
        row_in_col = seat_idx % rows

        # Choose pair based on column (odd/even)
        if col % 2 == 1:
            pair = pair_a
        else:
            pair = pair_b

        # Alternate within the pair based on row
        branch_idx = row_in_col % len(pair)
        desired_branch = pair[branch_idx]

        # Check if the desired branch has candidates
        if remaining.get(desired_branch, 0) > 0:
            sequence.append(desired_branch)
            remaining[desired_branch] -= 1
        else:
            # Substitution: find the branch with the most remaining candidates
            substituted = _find_substitute(remaining, desired_branch)
            if substituted:
                sequence.append(substituted)
                remaining[substituted] -= 1
            else:
                # No candidates available at all
                break

    return sequence


def _find_substitute(remaining, excluded_branch):
    """
    Find a substitute branch from the remaining pool.
    Returns the branch with the most available candidates.
    """
    best = None
    best_count = 0

    for branch, count in remaining.items():
        if count > 0 and count > best_count:
            best = branch
            best_count = count

    return best
