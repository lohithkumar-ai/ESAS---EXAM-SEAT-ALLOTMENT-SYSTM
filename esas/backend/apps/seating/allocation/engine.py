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

            # Step 11: Calculate unallocated diagnostics and specific reasons
            allocated_candidate_ids = {a['candidate'].id for a in all_allocations}
            allocated_student_map = {a['candidate'].student_id: a for a in all_allocations}

            unallocated_records = [c for c in self.candidates if c.id not in allocated_candidate_ids]
            duplicate_roll_count = 0
            other_unallocated = []
            unallocated_details = []

            for c in unallocated_records:
                if c.student_id in allocated_student_map:
                    alloc = allocated_student_map[c.student_id]
                    duplicate_roll_count += 1
                    unallocated_details.append({
                        'pin': c.student.pin,
                        'name': c.student.name,
                        'branch': c.branch.code,
                        'category': c.category,
                        'reason': f"Already allocated to Room {alloc['room'].room_number}, Seat S{alloc['seat'].seat_number} (Duplicate/multi-subject entry)"
                    })
                else:
                    other_unallocated.append(c)
                    unallocated_details.append({
                        'pin': c.student.pin,
                        'name': c.student.name,
                        'branch': c.branch.code,
                        'category': c.category,
                        'reason': "Could not be placed due to room capacity or anti-clash buffer constraints"
                    })

            unique_students_total = len(set(c.student_id for c in self.candidates))
            unique_students_allocated = len(allocated_student_map)
            unique_students_unallocated = unique_students_total - unique_students_allocated

            if len(unallocated_records) == 0:
                reason_summary = "All registered candidates have been successfully allocated."
            elif len(other_unallocated) == 0:
                reason_summary = (
                    f"All {unique_students_allocated} unique physical students are 100% allocated. "
                    f"The {duplicate_roll_count} unallocated records are duplicate nominal roll entries "
                    f"(students enrolled in multiple subjects or sheets) who have already been assigned a seat."
                )
            else:
                reason_summary = (
                    f"{len(other_unallocated)} candidates could not be placed due to room capacity or anti-clash constraints, "
                    f"and {duplicate_roll_count} are duplicate nominal roll entries who are already seated."
                )

            unallocated_breakdown = {
                'total_unallocated': len(unallocated_records),
                'unique_students_total': unique_students_total,
                'unique_students_allocated': unique_students_allocated,
                'unique_students_unallocated': unique_students_unallocated,
                'duplicate_candidates': duplicate_roll_count,
                'unplaced_candidates': len(other_unallocated),
                'reason_summary': reason_summary,
                'details': unallocated_details[:100],
            }

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
                'unallocated_breakdown': unallocated_breakdown,
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
        
        # Order candidates by PIN so they are seated in natural roll number sequence
        candidates.sort(key=lambda c: (c.student.pin, c.id))
        
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

        required_rooms = math.ceil(total_candidates / 42)  # noqa: F841

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

        # ── Deduplicate: keep only ONE candidate record per student ──
        # A student taking multiple subjects produces multiple ExamCandidate
        # rows.  We must seat each *student* only once.  Pick the first
        # candidate encountered (list is already shuffled).
        allocated_student_ids = set()
        # Also collect student IDs that were already seated in a prior phase
        for cand in allocated_candidates:
            # allocated_candidates stores candidate.id; we need to look up
            # the student_id for those candidates already seated.
            pass
        # Build a set of student_ids already seated from occupied_seats
        for (_, _), prev_cand in occupied_seats.items():
            allocated_student_ids.add(prev_cand.student_id)

        candidate_queues = defaultdict(deque)
        # Keep candidates ordered by PIN so each branch is allocated in numerical order
        ordered_candidates = sorted(candidates, key=lambda c: (c.student.pin, c.id))
        for c in ordered_candidates:
            if c.id not in allocated_candidates and c.student_id not in allocated_student_ids:
                candidate_queues[c.branch.code].append(c)

        # Track remaining candidates per branch
        remaining = {}
        for b_code, q in candidate_queues.items():
            remaining[b_code] = len(q)

        for room_idx, room in enumerate(self.rooms):
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

            # Calculate branch pool for this room.
            # Strategy: when >= 3 branches available, we can fill most seats
            # with perfect tiling (few buffers needed). When only 2 branches
            # remain, ~50% of seats become buffers. When 1 branch remains,
            # ~66% become buffers. So we pack MORE candidates into rooms
            # while diversity is high, avoiding wasteful spreading later.
            active_branch_counts = {}
            for b_code, q in candidate_queues.items():
                avail_q = sum(1 for c in q if c.id not in allocated_candidates and c.student_id not in allocated_student_ids)
                if avail_q > 0:
                    active_branch_counts[b_code] = avail_q
            active_branches = len(active_branch_counts)

            if active_branches >= 3:
                # With 3-4 branches, tiling is efficient — fill room to capacity
                room_branch_pools = dict(active_branch_counts)
            else:
                # Few branches left — give this room ALL remaining candidates.
                # The branch_balancer will insert buffer benches as needed.
                room_branch_pools = dict(active_branch_counts)

            # Generate branch zigzag sequence for the empty seat count
            branch_seq = generate_branch_sequence(
                total_seats=len(empty_seats),
                branch_pools=room_branch_pools if any(room_branch_pools.values()) else {b: len(q) for b, q in candidate_queues.items() if len(q) > 0},
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

            # Build seat lookup for fast access by seat_number
            seat_obj_map = {s.seat_number: s for s in room_seats}

            for seat_idx, seat in enumerate(empty_seats):
                if seat_idx >= len(branch_seq):
                    break

                desired_branch = branch_seq[seat_idx]

                # If seat is designated as an empty buffer bench, leave it empty
                if not desired_branch:
                    continue

                # Determine adjacent subjects (same-row neighbors)
                adjacent_subjects = set()
                col = seat.column
                row = seat.row
                for sn, prev_cand in room_occupants.items():
                    prev_seat_obj = seat_obj_map.get(sn)
                    if prev_seat_obj and prev_seat_obj.row == row:
                        if abs(prev_seat_obj.column - col) == 1:
                            if prev_cand.subject:
                                adjacent_subjects.add(prev_cand.subject.code)

                # ── Check if the desired branch would clash with neighbors ──
                # The balancer planned this branch, but actual placements may
                # differ (substitutions in prior seats), so we must verify.
                branch_penalty = self._get_seat_branch_penalty(
                    desired_branch, seat, seat_obj_map, room_occupants
                )
                use_desired = branch_penalty < 2000

                candidate = None
                if use_desired:
                    # Pick candidate from desired branch (avoiding same-subject adjacency)
                    candidate = self._pick_candidate_from_branch(
                        candidate_queues, desired_branch, adjacent_subjects,
                        allocated_candidates, allocated_student_ids,
                    )

                if candidate:
                    allocated_candidates.add(candidate.id)
                    allocated_student_ids.add(candidate.student_id)
                    remaining[candidate.branch.code] = max(
                        0, remaining.get(candidate.branch.code, 0) - 1
                    )
                    allocations.append({
                        'candidate': candidate,
                        'room': room,
                        'seat': seat,
                        'substituted_branch': '',
                        'reason': '',
                    })
                    occupied_seats[(room.id, seat.id)] = candidate
                    room_occupants[seat.seat_number] = candidate
                else:
                    # Desired branch exhausted or would clash:
                    # Only substitute if a compatible candidate exists with ZERO clash (penalty < 2000)
                    sub_candidate, sub_branch = self._find_substitute_candidate(
                        candidate_queues, None, allocated_candidates,
                        allocated_student_ids, seat, room_seats, room_occupants,
                    )
                    if sub_candidate:
                        allocated_candidates.add(sub_candidate.id)
                        allocated_student_ids.add(sub_candidate.student_id)
                        remaining[sub_branch] = max(
                            0, remaining.get(sub_branch, 0) - 1
                        )
                        allocations.append({
                            'candidate': sub_candidate,
                            'room': room,
                            'seat': seat,
                            'substituted_branch': desired_branch or '',
                            'reason': f'Branch substituted to avoid neighbor clash',
                        })
                        occupied_seats[(room.id, seat.id)] = sub_candidate
                        room_occupants[seat.seat_number] = sub_candidate
                        substitutions.append({
                            'room': room.room_number,
                            'seat': seat.seat_number,
                            'expected_branch': desired_branch or '',
                            'actual_branch': sub_branch,
                            'reason': f'Branch substituted to avoid neighbor clash',
                        })
                    # If no valid substitute without clash, seat remains EMPTY (buffer bench)

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

    def _pick_candidate_from_branch(self, candidate_queues, desired_branch, adjacent_subjects, allocated_candidates=None, allocated_student_ids=None):
        """
        Pick a candidate strictly from desired_branch, preferring one whose
        subject code is NOT in adjacent_subjects and who has not already been seated.
        Ensures the same student is not seated twice.
        Returns None if desired_branch has no unseated candidates available.
        """
        if allocated_candidates is None:
            allocated_candidates = set()
        if allocated_student_ids is None:
            allocated_student_ids = set()

        def is_available(c):
            return c.id not in allocated_candidates and c.student_id not in allocated_student_ids

        def clean_queue(q):
            while len(q) > 0 and not is_available(q[0]):
                q.popleft()

        if desired_branch not in candidate_queues:
            return None

        queue = candidate_queues[desired_branch]
        clean_queue(queue)

        if len(queue) == 0:
            return None

        if not adjacent_subjects:
            return queue.popleft()

        # Scan for candidate whose subject isn't in adjacent_subjects
        for i, c in enumerate(queue):
            if not is_available(c):
                continue
            subj_code = c.subject.code if c.subject else ''
            if subj_code not in adjacent_subjects:
                del queue[i]
                return c

        # Fallback: if all have adjacent subject, still pick from desired branch
        # (branch separation is Priority 2, subject separation is Priority 3)
        for i, c in enumerate(queue):
            if is_available(c):
                del queue[i]
                return c

        return None

    def _get_seat_branch_penalty(self, branch_code, seat, seat_obj_map, room_occupants):
        """
        Calculate the neighbor penalty for placing a given branch at a seat.
        Uses the same weights as the branch_balancer and _find_substitute_candidate.

        Returns:
            int: Total penalty score (0 = no clash).
        """
        if not seat or not room_occupants:
            return 0
        penalty = 0
        col = seat.column
        row = seat.row
        for sn, occ in room_occupants.items():
            occ_seat = seat_obj_map.get(sn)
            if not occ_seat:
                continue
            c_diff = abs(occ_seat.column - col)
            r_diff = abs(occ_seat.row - row)
            if c_diff <= 1 and r_diff <= 1 and (c_diff + r_diff > 0):
                if occ.branch.code == branch_code:
                    if c_diff == 1 and r_diff == 0:
                        penalty += 10000  # Horizontal clash (side-by-side)
                    elif c_diff == 0 and r_diff == 1:
                        penalty += 5000   # Vertical clash (consecutive bench)
                    elif c_diff == 1 and r_diff == 1:
                        penalty += 2000   # Diagonal / cross clash
        return penalty

    def _find_substitute_candidate(self, candidate_queues, excluded_branch, allocated_candidates=None,
                                   allocated_student_ids=None, seat=None, room_seats=None, room_occupants=None):
        """
        Find a substitute candidate from available branches when excluded_branch is exhausted.
        Calculates penalty for all 8 surrounding cells (horizontal, vertical, diagonal)
        so the substitute does NOT clash with neighbors.
        """
        if allocated_candidates is None:
            allocated_candidates = set()
        if allocated_student_ids is None:
            allocated_student_ids = set()

        def is_available(c):
            return c.id not in allocated_candidates and c.student_id not in allocated_student_ids

        # Clean all queues of already seated candidates
        for b, q in candidate_queues.items():
            while len(q) > 0 and not is_available(q[0]):
                q.popleft()

        # Calculate neighbor penalty for each branch candidate at this seat
        seat_obj_map = {s.seat_number: s for s in room_seats} if room_seats else {}

        def get_branch_penalty(branch_code):
            if not seat or not room_occupants:
                return 0
            penalty = 0
            col = seat.column
            row = seat.row
            for sn, occ in room_occupants.items():
                occ_seat = seat_obj_map.get(sn)
                if not occ_seat:
                    continue
                c_diff = abs(occ_seat.column - col)
                r_diff = abs(occ_seat.row - row)
                if c_diff <= 1 and r_diff <= 1 and (c_diff + r_diff > 0):
                    if occ.branch.code == branch_code:
                        if c_diff == 1 and r_diff == 0:
                            penalty += 10000  # Horizontal clash (side-by-side)
                        elif c_diff == 0 and r_diff == 1:
                            penalty += 5000   # Vertical clash (consecutive bench)
                        elif c_diff == 1 and r_diff == 1:
                            penalty += 2000   # Diagonal / cross clash
            return penalty

        best_branch = None
        best_score = (float('inf'), 0)  # (lowest_penalty, -most_candidates)

        for branch, queue in candidate_queues.items():
            if excluded_branch and branch == excluded_branch:
                continue
            valid_count = sum(1 for c in queue if is_available(c))
            if valid_count == 0:
                continue
            penalty = get_branch_penalty(branch)
            score = (penalty, -valid_count)
            if score < best_score:
                best_score = score
                best_branch = branch

        # If even the best available substitute would cause a horizontal, vertical,
        # or diagonal clash, leave the seat EMPTY to act as a buffer bench.
        if best_score[0] >= 2000:
            return None, None

        if best_branch and len(candidate_queues[best_branch]) > 0:
            queue = candidate_queues[best_branch]
            for i, c in enumerate(queue):
                if is_available(c):
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
