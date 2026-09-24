"""
Seat Allocation Engine

The core allocation engine that orchestrates:
1. Loading valid candidates from the exam session
2. Calculating required rooms
3. Creating seats (zig-zag pattern)
4. Building branch-balanced candidate pools
5. Assigning candidates to seats
6. Recording substitutions
7. Validating the allocation

This is the heart of the ESAS system.
"""
import math
from collections import defaultdict
from django.db import transaction

from apps.examinations.models import ExamSession, Branch
from apps.students.models import ExamCandidate
from apps.rooms.models import Room, Seat
from apps.seating.models import SeatAllocation, AllocationAuditLog
from .zigzag import generate_zigzag_positions
from .branch_balancer import generate_branch_sequence
from .validator import validate_allocation


class AllocationEngine:
    """Main allocation engine class."""

    def __init__(self, exam_session, category_filter=None, target_branches=None):
        """
        Args:
            exam_session: ExamSession instance
            category_filter: None (all), 'REGULAR', or 'SUPPLEMENTARY'
            target_branches: List of branch codes to include in this allocation run
        """
        self.exam_session = exam_session
        self.category_filter = category_filter
        self.target_branches = target_branches or []
        self.candidates = []
        self.rooms = []
        self.allocation_log = []

    def generate(self, user=None):
        """
        Run the full allocation pipeline.
        Two-phase approach:
          Phase 1: Allocate all REGULAR candidates in zigzag pattern
          Phase 2: Fill remaining seats with SUPPLEMENTARY candidates

        Returns:
            {
                'success': bool,
                'message': str,
                'rooms_used': int,
                'candidates_allocated': int,
                'candidates_unallocated': int,
                'substitutions': [...],
                'validation': {...},
            }
        """
        with transaction.atomic():
            # Step 1: Clear any existing draft allocations
            self._clear_draft_allocations()

            # Step 2: Load ALL valid candidates (both Regular and Supply)
            self._load_candidates()
            if not self.candidates:
                return {
                    'success': False,
                    'message': 'No valid candidates found for this session matching the criteria.',
                    'rooms_used': 0,
                    'candidates_allocated': 0,
                    'candidates_unallocated': 0,
                    'substitutions': [],
                    'validation': None,
                }

            # Step 3: Load available rooms
            self._load_rooms()

            # Step 4: Check capacity
            capacity_check = self._check_capacity()
            if not capacity_check['sufficient']:
                return {
                    'success': False,
                    'message': capacity_check['message'],
                    'rooms_used': 0,
                    'candidates_allocated': 0,
                    'candidates_unallocated': len(self.candidates),
                    'substitutions': [],
                    'validation': None,
                }

            # Step 5: Ensure seats exist for all rooms
            self._ensure_room_seats()

            # Step 6: Split candidates into Regular and Supply
            regular_candidates = [c for c in self.candidates if c.category == 'REGULAR']
            supply_candidates = [c for c in self.candidates if c.category == 'SUPPLEMENTARY']

            # Phase 1: Allocate Regular candidates first
            all_allocations = []
            all_substitutions = []
            occupied_seats = {}  # (room_id, seat_id) -> candidate
            allocated_candidate_ids = set()  # candidate.id -> seat

            if regular_candidates:
                reg_allocs, reg_subs, occupied_seats = self._allocate_candidates_to_rooms(
                    regular_candidates, occupied_seats, allocated_candidate_ids
                )
                all_allocations.extend(reg_allocs)
                all_substitutions.extend(reg_subs)

            # Phase 2: Fill remaining seats with Supply candidates
            if supply_candidates:
                sup_allocs, sup_subs, occupied_seats = self._allocate_candidates_to_rooms(
                    supply_candidates, occupied_seats, allocated_candidate_ids
                )
                all_allocations.extend(sup_allocs)
                all_substitutions.extend(sup_subs)

            # Step 7: Save allocations
            self._save_allocations(all_allocations)

            # Step 8: Log the action
            AllocationAuditLog.objects.create(
                exam_session=self.exam_session,
                user=user,
                action='GENERATED',
                description=(
                    f'Allocated {len(all_allocations)} candidates '
                    f'({len(regular_candidates)} Regular + {len(supply_candidates)} Supply) '
                    f'across {len(self.rooms)} rooms'
                ),
            )

            # Step 9: Update session status
            self.exam_session.status = 'ALLOCATION_GENERATED'
            self.exam_session.save()

            # Step 10: Validate
            validation = validate_allocation(self.exam_session)

            return {
                'success': True,
                'message': (
                    f'Successfully allocated {len(all_allocations)} candidates '
                    f'({len(regular_candidates)} Regular + {len(supply_candidates)} Supply) '
                    f'across {len(self.rooms)} rooms.'
                ),
                'rooms_used': len(self.rooms),
                'candidates_allocated': len(all_allocations),
                'candidates_unallocated': (
                    len(self.candidates) - len(all_allocations)
                ),
                'substitutions': all_substitutions,
                'validation': validation,
                'regular_count': len(regular_candidates),
                'supply_count': len(supply_candidates),
            }

    def _clear_draft_allocations(self):
        """Remove existing non-locked allocations for this session."""
        # Only clear allocations for the target branches if specified, 
        # otherwise clear all unlocked allocations.
        qs = SeatAllocation.objects.filter(
            exam_session=self.exam_session,
            is_locked=False,
        )
        if self.target_branches:
            qs = qs.filter(candidate__branch__code__in=self.target_branches)
        qs.delete()

    def _load_candidates(self):
        """Load all valid candidates from the database and jumble them."""
        import random
        
        qs = ExamCandidate.objects.filter(
            exam_session=self.exam_session,
            is_valid=True,
        ).select_related(
            'student', 'branch', 'curriculum',
            'academic_year', 'semester', 'subject'
        )

        # If a specific category was requested (e.g., only Regular), filter.
        # Otherwise load both Regular and Supply for two-phase allocation.
        if self.category_filter:
            qs = qs.filter(category=self.category_filter)
            
        if self.target_branches:
            qs = qs.filter(branch__code__in=self.target_branches)

        candidates = list(qs)
        
        # Jumble candidates thoroughly (Regular/Supply, Years, Semesters)
        random.shuffle(candidates)
        
        self.candidates = candidates

    def _load_rooms(self):
        """Load active rooms, ordered for allocation."""
        self.rooms = list(
            Room.objects.filter(is_active=True).order_by(
                'display_order', 'room_number'
            )
        )

    def _check_capacity(self):
        """Check if available rooms have enough total capacity."""
        total_capacity = sum(r.capacity for r in self.rooms)
        total_candidates = len(self.candidates)

        required_rooms = math.ceil(total_candidates / 42)

        if total_capacity < total_candidates:
            additional_needed = math.ceil(
                (total_candidates - total_capacity) / 42
            )
            return {
                'sufficient': False,
                'message': (
                    f'Insufficient room capacity. '
                    f'Students: {total_candidates}, '
                    f'Available capacity: {total_capacity}. '
                    f'Additional rooms required: {additional_needed}'
                ),
            }

        return {'sufficient': True, 'message': 'OK'}

    def _ensure_room_seats(self):
        """Create seat records for rooms that don't have them yet."""
        for room in self.rooms:
            existing_seats = room.seats.count()
            if existing_seats < room.capacity:
                positions = generate_zigzag_positions(
                    columns=room.columns, rows=room.rows
                )
                for pos in positions:
                    Seat.objects.get_or_create(
                        room=room,
                        seat_number=pos['seat_number'],
                        defaults={
                            'column': pos['column'],
                            'row': pos['row'],
                        }
                    )

    def _build_branch_pools(self):
        """Count candidates per branch."""
        pools = defaultdict(int)
        for c in self.candidates:
            pools[c.branch.code] += 1
        return dict(pools)

    def _build_candidate_queues(self):
        """
        Build per-branch queues of candidates for allocation.
        Returns dict of {branch_code: deque([candidate, ...])}
        """
        from collections import deque
        queues = defaultdict(deque)
        for c in self.candidates:
            queues[c.branch.code].append(c)
        return dict(queues)

    def _allocate_candidates_to_rooms(self, candidates, occupied_seats, allocated_candidates=None):
        """
        Allocate a list of candidates to rooms using branch-balanced zigzag pattern.
        Skips seats that are already occupied (from a previous phase).
        
        Args:
            candidates: List of ExamCandidate objects to allocate
            occupied_seats: Dict of {(room_id, seat_id): candidate} already placed
            allocated_candidates: Set of candidate IDs already given a seat
            
        Returns:
            (allocations, substitutions, updated_occupied_seats)
        """
        import random
        from collections import deque

        if allocated_candidates is None:
            allocated_candidates = set()

        allocations = []
        substitutions = []

        # Build per-branch candidate queues from the given candidates (excluding already seated candidates)
        candidate_queues = defaultdict(deque)
        shuffled = list(candidates)
        random.shuffle(shuffled)
        for c in shuffled:
            if c.id not in allocated_candidates:
                candidate_queues[c.branch.code].append(c)

        # Track remaining candidates per branch
        remaining = {}
        for b_code, q in candidate_queues.items():
            remaining[b_code] = len(q)

        for room in self.rooms:
            # Get ALL seats for this room
            room_seats = list(
                room.seats.filter(is_active=True).order_by('seat_number')
            )

            # Filter to only empty seats
            empty_seats = [
                s for s in room_seats 
                if (room.id, s.id) not in occupied_seats
            ]

            if not empty_seats:
                continue

            # Check if any candidates remain
            total_remaining = sum(len(q) for q in candidate_queues.values())
            if total_remaining == 0:
                break

            # Generate branch zigzag sequence for the empty seat count
            branch_seq = generate_branch_sequence(
                total_seats=len(empty_seats),
                branch_pools={b: len(q) for b, q in candidate_queues.items() if len(q) > 0},
                columns=room.columns,
                rows=room.rows,
                target_branches=self.target_branches,
            )

            # Build a lookup of already-placed candidates in this room
            room_occupants = {}  # seat_number -> candidate
            for (r_id, s_id), cand in occupied_seats.items():
                if r_id == room.id:
                    seat_obj = next((s for s in room_seats if s.id == s_id), None)
                    if seat_obj:
                        room_occupants[seat_obj.seat_number] = cand

            for seat_idx, seat in enumerate(empty_seats):
                if seat_idx >= len(branch_seq):
                    break

                desired_branch = branch_seq[seat_idx]

                # Determine adjacent subjects (same-row neighbors)
                adjacent_subjects = set()
                col = seat.column
                row = seat.row
                for sn, prev_cand in room_occupants.items():
                    prev_seat_obj = next(
                        (s for s in room_seats if s.seat_number == sn), None
                    )
                    if prev_seat_obj and prev_seat_obj.row == row:
                        if abs(prev_seat_obj.column - col) == 1:
                            if prev_cand.subject:
                                adjacent_subjects.add(prev_cand.subject.code)

                # Pick candidate avoiding same-subject adjacency
                candidate = self._pick_candidate_avoiding_subject(
                    candidate_queues, desired_branch, adjacent_subjects, allocated_candidates
                )

                if candidate:
                    allocated_candidates.add(candidate.id)
                    remaining[candidate.branch.code] = max(
                        0, remaining.get(candidate.branch.code, 0) - 1
                    )
                    sub_branch = '' if candidate.branch.code == desired_branch else desired_branch
                    allocations.append({
                        'candidate': candidate,
                        'room': room,
                        'seat': seat,
                        'substituted_branch': sub_branch,
                        'reason': f'{desired_branch} subject-swap' if sub_branch else '',
                    })
                    occupied_seats[(room.id, seat.id)] = candidate
                    room_occupants[seat.seat_number] = candidate

                    if sub_branch:
                        substitutions.append({
                            'room': room.room_number,
                            'seat': seat.seat_number,
                            'expected_branch': desired_branch,
                            'actual_branch': candidate.branch.code,
                            'reason': 'Subject adjacency swap',
                        })
                else:
                    # Find any substitute
                    sub_candidate, sub_branch = self._find_substitute_candidate(
                        candidate_queues, desired_branch, allocated_students
                    )
                    if sub_candidate:
                        allocated_students.add(sub_candidate.student.pin)
                        remaining[sub_branch] = max(
                            0, remaining.get(sub_branch, 0) - 1
                        )
                        allocations.append({
                            'candidate': sub_candidate,
                            'room': room,
                            'seat': seat,
                            'substituted_branch': desired_branch,
                            'reason': f'{desired_branch} candidates exhausted',
                        })
                        occupied_seats[(room.id, seat.id)] = sub_candidate
                        room_occupants[seat.seat_number] = sub_candidate
                        substitutions.append({
                            'room': room.room_number,
                            'seat': seat.seat_number,
                            'expected_branch': desired_branch,
                            'actual_branch': sub_branch,
                            'reason': f'{desired_branch} candidates exhausted',
                        })

        return allocations, substitutions, occupied_seats

    def _distribute_candidates_to_rooms(self, total):
        """
        Distribute candidates by filling rooms completely to capacity 
        before moving to the next room.
        """
        if not self.rooms:
            return []

        distribution = []
        remaining = total

        for room in self.rooms:
            if remaining <= 0:
                distribution.append(0)
            else:
                alloc = min(remaining, room.capacity)
                distribution.append(alloc)
                remaining -= alloc

        return distribution

    def _pick_candidate_avoiding_subject(self, candidate_queues, desired_branch, adjacent_subjects, allocated_candidates=None):
        """
        Pick a candidate from the desired branch, preferring one whose subject
        code is NOT in adjacent_subjects and who has not already been seated.
        """
        if allocated_candidates is None:
            allocated_candidates = set()

        def clean_queue(q):
            while len(q) > 0 and q[0].id in allocated_candidates:
                q.popleft()

        # First: try the desired branch
        if desired_branch in candidate_queues:
            queue = candidate_queues[desired_branch]
            clean_queue(queue)

            if len(queue) > 0:
                if not adjacent_subjects:
                    return queue.popleft()

                # Scan for candidate whose subject isn't adjacent
                for i, c in enumerate(queue):
                    if c.id in allocated_candidates:
                        continue
                    subj_code = c.subject.code if c.subject else ''
                    if subj_code not in adjacent_subjects:
                        del queue[i]
                        return c

                # Fallback: pop first unallocated
                for i, c in enumerate(queue):
                    if c.id not in allocated_candidates:
                        del queue[i]
                        return c

        # Desired branch is empty or exhausted, try other branches
        for branch_code, queue in candidate_queues.items():
            if branch_code == desired_branch:
                continue
            clean_queue(queue)
            if len(queue) == 0:
                continue

            for i, c in enumerate(queue):
                if c.id in allocated_candidates:
                    continue
                subj_code = c.subject.code if c.subject else ''
                if subj_code not in adjacent_subjects:
                    del queue[i]
                    return c

            for i, c in enumerate(queue):
                if c.id not in allocated_candidates:
                    del queue[i]
                    return c

        return None

    def _find_substitute_candidate(self, candidate_queues, excluded_branch, allocated_candidates=None):
        """
        Find a substitute candidate from the branch with the most remaining.
        Returns (candidate, branch_code) or (None, None).
        """
        if allocated_candidates is None:
            allocated_candidates = set()

        # Clean all queues of already seated candidates
        for b, q in candidate_queues.items():
            while len(q) > 0 and q[0].id in allocated_candidates:
                q.popleft()

        best_branch = None
        best_count = 0

        for branch, queue in candidate_queues.items():
            valid_count = sum(1 for c in queue if c.id not in allocated_candidates)
            if valid_count > best_count:
                best_branch = branch
                best_count = valid_count

        if best_branch and len(candidate_queues[best_branch]) > 0:
            queue = candidate_queues[best_branch]
            for i, c in enumerate(queue):
                if c.id not in allocated_candidates:
                    del queue[i]
                    return c, best_branch

        return None, None

    def _save_allocations(self, allocations):
        """Bulk-save allocation records."""
        alloc_objects = []
        for alloc in allocations:
            alloc_objects.append(SeatAllocation(
                exam_session=self.exam_session,
                candidate=alloc['candidate'],
                room=alloc['room'],
                seat=alloc['seat'],
                substituted_branch=alloc['substituted_branch'],
                substitution_reason=alloc['reason'],
            ))

        SeatAllocation.objects.bulk_create(alloc_objects)
