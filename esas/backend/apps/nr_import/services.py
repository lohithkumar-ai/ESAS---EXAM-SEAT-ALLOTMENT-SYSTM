"""
NR Excel Parser & Validator

Reads the Nominal Roll (NR) Excel file, detects columns via aliases,
normalizes values, and validates each row.
"""
import re
from datetime import datetime

import pandas as pd
from django.utils import timezone

from apps.examinations.models import (
    Curriculum, Branch, AcademicYear, Semester, Subject, ExamSession
)
from apps.students.models import Student, ExamCandidate
from apps.nr_import.models import NRUpload, NRValidationError


# ── Column alias mapping ─────────────────────────────────────────────────
COLUMN_ALIASES = {
    'pin': [
        'pin', 'pin no', 'pin number', 'student pin',
        'pin_no', 'pinnumber', 'studentpin', 'roll no',
        'roll_no', 'rollno', 'enrollment', 'enrollment no',
    ],
    'name': [
        'name', 'student name', 'student_name', 'studentname',
        'full name', 'full_name',
    ],
    'branch': [
        'branch', 'department', 'dept', 'branch code',
        'branch_code', 'branchcode',
    ],
    'year': [
        'year', 'academic year', 'academic_year', 'study year',
        'year of study',
    ],
    'semester': [
        'semester', 'sem', 'semester no', 'semester_no',
        'sem no', 'sem_no',
    ],
    'curriculum': [
        'curriculum', 'scheme', 'syllabus', 'curriculum code',
        'curriculum_code', 'scheme code',
    ],
    'subject_code': [
        'subject code', 'subject_code', 'subjectcode', 'sub code',
        'sub_code', 'course code', 'course_code',
    ],
    'subject_name': [
        'subject name', 'subject_name', 'subjectname', 'subject',
        'sub name', 'sub_name', 'course name', 'course_name',
    ],
    'category': [
        'category', 'student category', 'student_category',
        'studentcategory', 'status', 'reg/supply', 'reg_supply',
        'reg / supply', 'type', 'exam', 'regular/supply',
        'regular/supplementary', 'r/s', 'candidate type', 'student type',
        'exam type', 'exam_type', 'examtype', 'examination type', 'exam typ'
    ],
}

# ── PIN / subject-code patterns ──────────────────────────────────────────
# Valid PIN: 5-6 digits, hyphen/space, letters, hyphen/space, 3-4 digits
# e.g. 24101-EC-001, 24101 EC 003
PIN_PATTERN = re.compile(
    r'^\d{4,6}[\s\-][A-Za-z]{1,5}[\s\-]\d{2,4}$'
)

# Subject code pattern: 1-5 letters, optional hyphen/space, 3-4 digits
# e.g. EC-301, CM-401, EC 301
SUBJECT_CODE_PATTERN = re.compile(
    r'^[A-Za-z]{1,5}[\s\-]?\d{3,4}$'
)

# Pure serial number: just digits, typically 1-4 digits
SERIAL_NUMBER_PATTERN = re.compile(
    r'^\d{1,4}$'
)

# Valid normalized values
VALID_CATEGORIES = {
    'regular': 'REGULAR',
    'reg': 'REGULAR',
    'r': 'REGULAR',
    'supplementary': 'SUPPLEMENTARY',
    'supply': 'SUPPLEMENTARY',
    'sup': 'SUPPLEMENTARY',
    'supp': 'SUPPLEMENTARY',
    'supple': 'SUPPLEMENTARY',
    's': 'SUPPLEMENTARY',
}

YEAR_MAPPING = {
    '1': 1, '1st': 1, '1st year': 1, 'first': 1, 'first year': 1, 'i': 1,
    '2': 2, '2nd': 2, '2nd year': 2, 'second': 2, 'second year': 2, 'ii': 2,
    '3': 3, '3rd': 3, '3rd year': 3, 'third': 3, 'third year': 3, 'iii': 3,
}


def _normalize(value):
    """Normalize a value to lowercase stripped string."""
    if pd.isna(value) or value is None:
        return ''
    return str(value).strip().lower()


def _detect_columns(df):
    """
    Detect which DataFrame columns match our expected fields using aliases.
    Returns a dict mapping field_name -> actual_column_name.
    """
    mapping = {}
    df_cols_lower = {col.strip().lower(): col for col in df.columns}

    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in df_cols_lower:
                mapping[field] = df_cols_lower[alias]
                break

    # Smart fallback for category based on data values
    if 'category' not in mapping:
        for col in df.columns:
            if col in mapping.values():
                continue
            
            sample_vals = df[col].dropna().head(10).astype(str).str.lower().str.strip().tolist()
            if not sample_vals:
                continue
                
            match_count = sum(
                1 for v in sample_vals 
                if v in VALID_CATEGORIES or 'reg' in v or 'sup' in v or v == 'r' or v == 's'
            )
            
            if len(sample_vals) > 0 and (match_count / len(sample_vals)) > 0.5:
                mapping['category'] = col
                break

    return mapping


BOGUS_CODES = {'SNO', 'SINO', 'UNNAMED', 'SLNO', 'SL.NO', 'SERIAL', 'SERIAL NO', 'S NO', 'S_NO', 'NAN'}


def _is_valid_pin(value):
    """
    Check if a value looks like a valid student PIN.
    Rejects subject codes (e.g. EC-301), serial numbers (e.g. 1, 2, 3), and headers.
    """
    val = str(value).strip()
    if not val or val.lower() == 'nan':
        return False
    if val.upper() in BOGUS_CODES:
        return False
    # Reject pure serial numbers (1, 2, 3, ...)
    if SERIAL_NUMBER_PATTERN.match(val):
        return False
    # Reject subject codes (EC-301, CM-401, etc.)
    if SUBJECT_CODE_PATTERN.match(val):
        return False
    # A valid PIN must contain at least one digit and be at least 4 characters
    if not re.search(r'\d', val) or len(val) < 4:
        return False
    return True


def transform_matrix_to_tabular(df):
    """
    Transforms a Subject-Column Matrix DataFrame into a flat Tabular DataFrame.
    Matrix format: SNO, SUBJ1, SUBJ2, SUBJ3...
    Rows contain PINs under each subject column.
    """
    records = []
    ignore_cols = {
        'sino', 's.no', 'slno', 'sl.no', 'serial', 's no', 'serial no',
        'sno', 's_no', 's. no'
    }
    subject_cols = []
    for c in df.columns:
        col_str = str(c).strip().lower()
        if not col_str or col_str in ignore_cols or col_str.isdigit():
            continue
        if col_str.startswith('unnamed'):
            continue
        subject_cols.append(c)
    
    for idx, row in df.iterrows():
        for subj_code in subject_cols:
            pin = str(row[subj_code]).strip()
            if pin and pin.lower() != 'nan' and _is_valid_pin(pin):
                records.append({
                    'pin': pin,
                    'subject_code': str(subj_code).strip(),
                    'original_row': idx + 2,
                })
    
    return pd.DataFrame(records)


def transform_sbtet_master_list(df, subjects_col):
    """
    Transforms the SBTET Master List format into a flat Tabular DataFrame.
    The master list has a 'Subjects' column containing a comma-separated list
    of subject codes (e.g. 'EE-501,502,504,506').
    """
    records = []
    for idx, row in df.iterrows():
        subjects_str = str(row[subjects_col]).strip()
        if not subjects_str or subjects_str.lower() == 'nan':
            continue
            
        # Split by comma
        raw_subjects = [s.strip() for s in subjects_str.split(',')]
        
        # Resolve prefixes (e.g., EE-501, 502 -> EE-501, EE-502)
        resolved_subjects = []
        last_prefix = ""
        for subj in raw_subjects:
            match = re.match(r'^([A-Za-z]+-)(.*)', subj)
            if match:
                last_prefix = match.group(1)
                resolved_subjects.append(subj)
            else:
                if last_prefix:
                    resolved_subjects.append(f"{last_prefix}{subj}")
                else:
                    resolved_subjects.append(subj)
        
        # Add a record for each resolved subject
        for subj in resolved_subjects:
            record = row.to_dict()
            record['subject_code'] = subj
            record['original_row'] = idx + 2
            records.append(record)
            
    return pd.DataFrame(records)


def inspect_excel_sheets(file_path):
    """
    Inspects all sheets in an Excel workbook.
    Returns:
        (sheet_info, recommended_sheet)
    """
    import openpyxl
    wb = openpyxl.load_workbook(file_path, data_only=True)
    active_title = wb.active.title if wb.active else (wb.sheetnames[0] if wb.sheetnames else '')
    sheet_info = []
    pin_pattern = re.compile(r'^\d{4,6}-[A-Za-z]+-\d{3,4}$')

    for s in wb.sheetnames:
        ws = wb[s]
        pin_count = 0
        for row in ws.iter_rows(values_only=True):
            for cell in row:
                if cell and pin_pattern.match(str(cell).strip()):
                    pin_count += 1
        sheet_info.append({
            'name': s,
            'rows': ws.max_row or 0,
            'cols': ws.max_column or 0,
            'pin_count': pin_count,
            'is_active': (s == active_title),
        })

    # Pick recommended sheet:
    # 1. 'Table 2' if present (SBTET master list)
    # 2. Sheet with highest pin_count (tie-break with active sheet)
    # 3. Active sheet
    recommended_sheet = active_title
    for info in sheet_info:
        if info['name'].strip().lower() == 'table 2':
            recommended_sheet = info['name']
            break
    else:
        if sheet_info:
            best = max(sheet_info, key=lambda x: (x['pin_count'], 1 if x['is_active'] else 0))
            if best['pin_count'] > 0 or best['rows'] > 0:
                recommended_sheet = best['name']

    return sheet_info, recommended_sheet


def _locate_header_and_prepare_df(xls, target_sheet):
    """
    Reads target_sheet and detects the actual header row even if there are
    blank rows, title rows, or metadata rows at the top.
    """
    df_raw = pd.read_excel(xls, sheet_name=target_sheet, header=None)
    if len(df_raw) == 0:
        return pd.DataFrame()

    known_aliases = set()
    for aliases in COLUMN_ALIASES.values():
        known_aliases.update(aliases)
    known_aliases.update(['sno', 's.no', 'slno', 'sl.no', 'serial no', 'serial', 's no', 's_no'])

    best_row_idx = 0
    best_score = 0

    max_scan = min(35, len(df_raw))
    for idx in range(max_scan):
        row = df_raw.iloc[idx]
        vals = [str(v).strip() for v in row if pd.notna(v) and str(v).strip()]
        if not vals:
            continue

        score = 0
        for val in vals:
            v_lower = val.lower()
            if v_lower in known_aliases:
                score += 2
            elif SUBJECT_CODE_PATTERN.match(val):
                score += 3
            # If the cell looks like a PIN, it's a data row, not a header!
            if PIN_PATTERN.match(val):
                score -= 2

        if score > best_score:
            best_score = score
            best_row_idx = idx

    if best_score > 0 and best_row_idx > 0:
        # Header is at best_row_idx
        header_vals = [str(v).strip() if pd.notna(v) else '' for v in df_raw.iloc[best_row_idx]]
        df = df_raw.iloc[best_row_idx + 1:].copy()
        df.columns = header_vals
        df = df.reset_index(drop=True)
    else:
        # Default header=0
        df = pd.read_excel(xls, sheet_name=target_sheet)

    # Clean columns: drop columns where header is empty string or pure whitespace
    valid_cols = [c for c in df.columns if str(c).strip() != '' and str(c).strip().lower() != 'nan']
    if valid_cols:
        df = df[valid_cols]

    return df


def parse_nr_excel(file_path, sheet_name=None):
    """
    Parse an NR Excel file and return a DataFrame with detected column mapping.
    Handles Tabular, Subject-Column Matrix, and SBTET Master List formats.

    Returns:
        (df, column_mapping, fatal_errors, warnings, sheet_name_used, sheet_info)
    """
    xls = pd.ExcelFile(file_path, engine='openpyxl')
    sheet_info, recommended_sheet = inspect_excel_sheets(file_path)

    target_sheet = sheet_name if (sheet_name and sheet_name in xls.sheet_names) else recommended_sheet
    if target_sheet not in xls.sheet_names:
        target_sheet = xls.sheet_names[0]

    df = _locate_header_and_prepare_df(xls, target_sheet)
    
    # If this sheet looks empty or is a title sheet (like 'Table 1'), look for another sheet with 'PIN'
    if len(df) < 2 and len(xls.sheet_names) > 1:
        for sheet in xls.sheet_names:
            temp_df = _locate_header_and_prepare_df(xls, sheet)
            cols_lower = [str(c).lower() for c in temp_df.columns]
            if any('pin' in c for c in cols_lower):
                df = temp_df
                target_sheet = sheet
                break

    column_mapping = _detect_columns(df)
    warnings = []
    fatal_errors = []

    # Check if this is the SBTET format with a 'Subjects' column
    df_cols_lower = {str(col).strip().lower(): col for col in df.columns}
    subjects_col = df_cols_lower.get('subjects')
    
    # Check if the header row actually contains data (e.g., PINs like 26101-CM-001)
    header_is_data = any(re.match(r'^\d{4,6}-[A-Za-z]+-\d{3,4}$', str(c).strip()) for c in df.columns)
    if header_is_data:
        df = pd.read_excel(xls, sheet_name=target_sheet, header=None)
        column_mapping = _detect_columns(df)
        df_cols_lower = {str(col).strip().lower(): col for col in df.columns}
        subjects_col = df_cols_lower.get('subjects')
        warnings.append('Detected data in header row. Re-read without header.')

    if subjects_col and 'pin' in column_mapping:
        warnings.append('Detected SBTET Master List format. Expanding subjects.')
        df = transform_sbtet_master_list(df, subjects_col)
        column_mapping = _detect_columns(df)
        column_mapping['subject_code'] = 'subject_code'
    
    # If we didn't find 'pin' and 'subject_code', check if it's a Matrix format
    elif 'pin' not in column_mapping and 'subject_code' not in column_mapping:
        df = transform_matrix_to_tabular(df)
        column_mapping = {'pin': 'pin', 'subject_code': 'subject_code'}
        warnings.append(f'Detected Subject-Column Matrix format from {target_sheet}. Extracted PINs automatically.')

    # Check for required columns
    required = ['pin', 'subject_code']
    for field in required:
        if field not in column_mapping:
            fatal_errors.append(f'Required column not detected: {field}')

    if len(df) == 0:
        fatal_errors.append(f'No candidate rows found in sheet "{target_sheet}".')

    return df, column_mapping, fatal_errors, warnings, target_sheet, sheet_info


def validate_nr_data(df, column_mapping, exam_session_id):
    """
    Validate each row of the NR DataFrame.

    Returns:
        (valid_rows, errors)
        valid_rows: list of dicts with normalized data
        errors: list of dicts with row_number, error_type, message
    """
    valid_rows = []
    errors = []

    # Load existing branches for validation
    existing_branches = set(
        Branch.objects.values_list('code', flat=True)
    )
    existing_curricula = set(
        Curriculum.objects.values_list('code', flat=True)
    )

    seen_pins_subjects = set()

    def _get(row, field):
        col = column_mapping.get(field)
        if col is None:
            return ''
        val = row.get(col, '')
        return _normalize(val)

    for idx, row in df.iterrows():
        # Handle original row tracking for matrix format
        row_num = row.get('original_row', idx + 2) 
        row_errors = []

        # PIN
        pin = _get(row, 'pin')
        if not pin:
            row_errors.append({
                'row_number': row_num,
                'error_type': 'MISSING_PIN',
                'column_name': 'PIN',
                'value': '',
                'message': f'Row {row_num} → Missing PIN',
            })
        elif not _is_valid_pin(pin):
            # Skip rows where the PIN is actually a subject code, serial number, or bogus header
            row_errors.append({
                'row_number': row_num,
                'error_type': 'INVALID_PIN',
                'column_name': 'PIN',
                'value': pin,
                'message': f'Row {row_num} → Invalid PIN "{pin}"',
            })

        # Name
        name = _get(row, 'name')
        if not name and 'name' in column_mapping:
            row_errors.append({
                'row_number': row_num,
                'error_type': 'MISSING_NAME',
                'column_name': 'Name',
                'value': '',
                'message': f'Row {row_num} → Missing Name',
            })
        elif not name:
            name = f"Student {pin}"

        # Branch
        branch_raw = _get(row, 'branch')
        if not branch_raw and pin:
            # Auto-extract from PIN (e.g., 24101-CM-001 -> CM)
            match = re.search(r'^[0-9]+-([A-Za-z]+)-[0-9]+$', pin)
            if not match:
                match = re.search(r'-?([A-Za-z]{2,5})-?', pin)
            if match:
                branch_raw = match.group(1).upper()
        if not branch_raw and row.get('subject_code'):
            match = re.match(r'^([A-Za-z]{2,5})-?', str(row.get('subject_code')).strip())
            if match:
                branch_raw = match.group(1).upper()
        
        # Guard against bogus branch names like SNO, SINO, UNNAMED
        if branch_raw and branch_raw.upper() in BOGUS_CODES:
            branch_raw = ''
        
        branch_code = branch_raw.upper() if branch_raw else ''
        if not branch_code or branch_code in BOGUS_CODES:
            row_errors.append({
                'row_number': row_num,
                'error_type': 'INVALID_BRANCH',
                'column_name': 'Branch',
                'value': branch_raw,
                'message': f'Row {row_num} → Missing or Invalid Branch',
            })
        elif branch_code not in existing_branches:
            Branch.objects.get_or_create(code=branch_code, defaults={'name': branch_code})
            existing_branches.add(branch_code)

        # Subject code
        subj_code = _get(row, 'subject_code')
        if not subj_code or subj_code.upper() in BOGUS_CODES:
            row_errors.append({
                'row_number': row_num,
                'error_type': 'INVALID_SUBJECT',
                'column_name': 'Subject Code',
                'value': subj_code,
                'message': f'Row {row_num} → Missing or Invalid Subject Code',
            })

        # Year
        year_raw = _get(row, 'year')
        year_val = YEAR_MAPPING.get(year_raw)
        if not year_val and subj_code:
            # Infer from subject code (1XX -> Year 1, 3XX -> Year 2, 5XX -> Year 3)
            match_num = re.search(r'(\d{3})', subj_code)
            if match_num:
                first_digit = int(match_num.group(1)[0])
                if first_digit in [1, 2]:
                    year_val = 1
                elif first_digit in [3, 4]:
                    year_val = 2
                elif first_digit in [5, 6, 7]:
                    year_val = 3
        if not year_val:
            year_val = 1

        # Semester
        sem_raw = _get(row, 'semester')
        sem_val = None
        if sem_raw:
            try:
                sem_val = int(float(sem_raw))
            except (ValueError, TypeError):
                pass

        # Curriculum
        curr_raw = _get(row, 'curriculum')
        if not curr_raw and pin:
            match = re.match(r'^(\d{2})', pin)
            if match:
                yy = int(match.group(1))
                if yy >= 26:
                    curr_raw = 'C26'
                elif yy >= 23:
                    curr_raw = 'C23'
                elif yy >= 20:
                    curr_raw = 'C20'
                elif yy >= 16:
                    curr_raw = 'C16'
                else:
                    curr_raw = f'C{yy}'
                    
        curr_code = curr_raw.upper() if curr_raw else 'C26'
        if curr_code and curr_code not in existing_curricula:
            Curriculum.objects.get_or_create(code=curr_code, defaults={'name': curr_code})
            existing_curricula.add(curr_code)

        # Subject code
        subj_code = _get(row, 'subject_code')
        if not subj_code:
            row_errors.append({
                'row_number': row_num,
                'error_type': 'MISSING_SUBJECT_CODE',
                'column_name': 'Subject Code',
                'value': '',
                'message': f'Row {row_num} → Missing Subject Code',
            })

        # Subject name
        subj_name = _get(row, 'subject_name')
        if not subj_name and 'subject_name' in column_mapping:
            row_errors.append({
                'row_number': row_num,
                'error_type': 'MISSING_SUBJECT_NAME',
                'column_name': 'Subject Name',
                'value': '',
                'message': f'Row {row_num} → Missing Subject Name',
            })
        elif not subj_name:
            subj_name = f"Subject {subj_code}"

        # Category
        cat_raw = _get(row, 'category')
        category = ''
        if cat_raw:
            if 'sup' in cat_raw or cat_raw == 's':
                category = 'SUPPLEMENTARY'
            elif 'reg' in cat_raw or cat_raw == 'r':
                category = 'REGULAR'
            else:
                category = VALID_CATEGORIES.get(cat_raw, '')

        if 'category' in column_mapping and not category:
            if cat_raw:
                row_errors.append({
                    'row_number': row_num,
                    'error_type': 'INVALID_CATEGORY',
                    'column_name': 'Category',
                    'value': cat_raw,
                    'message': f'Row {row_num} → Invalid category: {cat_raw}',
                })
            else:
                category = 'REGULAR'  # Default to Regular if empty

        if not category:
            category = 'REGULAR'

        # Duplicate check
        dup_key = (pin, subj_code)
        if pin and subj_code and dup_key in seen_pins_subjects:
            row_errors.append({
                'row_number': row_num,
                'error_type': 'DUPLICATE_RECORD',
                'column_name': 'PIN+Subject',
                'value': f'{pin}+{subj_code}',
                'message': f'Row {row_num} → Duplicate record: {pin} + {subj_code}',
            })
        elif pin and subj_code:
            seen_pins_subjects.add(dup_key)

        if row_errors:
            errors.extend(row_errors)
        else:
            # Get the original (non-normalized) name
            name_col = column_mapping.get('name')
            original_name = str(row.get(name_col, '')).strip() if name_col else name
            pin_col = column_mapping.get('pin')
            original_pin = str(row.get(pin_col, '')).strip() if pin_col else pin

            valid_rows.append({
                'row_number': row_num,
                'pin': original_pin,
                'name': original_name,
                'branch': branch_code,
                'year': year_val or 1,
                'semester': sem_val,
                'curriculum': curr_code or 'C23',
                'subject_code': subj_code.upper(),
                'subject_name': str(row.get(column_mapping.get('subject_name', ''), subj_name)).strip(),
                'category': category,
            })

    return valid_rows, errors


def import_nr_to_database(valid_rows, exam_session, nr_upload, overrides=None):
    """
    Import validated NR rows into the database,
    creating Student, Subject, and ExamCandidate records.
    """
    from apps.examinations.models import SessionConfiguration
    
    overrides = overrides or {}
    created_count = 0
    configured_semesters = set()

    for row_data in valid_rows:
        curr_val = overrides.get('curriculum') or row_data['curriculum']
        year_val = overrides.get('year') or row_data['year']
        sem_val = overrides.get('semester') or row_data['semester']
        cat_val = overrides.get('category') or row_data['category']
        
        if cat_val == 'MIXED' or not cat_val:
            cat_val = row_data['category']

        # Get or create Branch
        branch, _ = Branch.objects.get_or_create(
            code=row_data['branch'],
            defaults={'name': row_data['branch']}
        )

        # Get or create Curriculum
        curriculum, _ = Curriculum.objects.get_or_create(
            code=curr_val,
            defaults={'name': curr_val}
        )

        # Get or create AcademicYear (V2: requires curriculum)
        academic_year, _ = AcademicYear.objects.get_or_create(
            curriculum=curriculum,
            year=year_val,
        )

        # Get or create Semester
        semester = None
        if sem_val:
            semester, _ = Semester.objects.get_or_create(
                number=sem_val,
                academic_year=academic_year
            )

            # Track configured semesters
            if semester:
                configured_semesters.add((curriculum.id, semester.id))

        # Get or create Subject
        subject, created = Subject.objects.get_or_create(
            code=row_data['subject_code'],
            curriculum=curriculum,
            defaults={
                'name': row_data['subject_name'],
                'branch': branch,
                'academic_year': academic_year,
                'semester': semester,
            }
        )

        # Get or create Student
        student, _ = Student.objects.get_or_create(
            pin=row_data['pin'],
            defaults={
                'name': row_data['name'],
                'branch': branch,
            }
        )

        # Create ExamCandidate (update if already exists)
        _, was_created = ExamCandidate.objects.update_or_create(
            exam_session=exam_session,
            student=student,
            subject=subject,
            defaults={
                'curriculum': curriculum,
                'branch': branch,
                'academic_year': academic_year,
                'semester': semester,
                'category': cat_val,
                'nr_upload': nr_upload,
                'nr_row_number': row_data['row_number'],
            }
        )
        if was_created:
            created_count += 1

    # Create SessionConfigurations for tracked semesters
    for curr_id, sem_id in configured_semesters:
        SessionConfiguration.objects.get_or_create(
            session=exam_session,
            curriculum_id=curr_id,
            semester_id=sem_id
        )

    # Detect common subjects after import
    _detect_common_subjects(exam_session)

    return created_count


def _detect_common_subjects(exam_session):
    """
    Detect subjects that are shared across multiple branches
    for a given exam session. Marks Subject.is_common = True.
    """
    from django.db.models import Count

    candidates = ExamCandidate.objects.filter(
        exam_session=exam_session, is_valid=True
    )

    # Group by subject and count distinct branches
    subject_branch_counts = (
        candidates
        .values('subject__id', 'subject__code')
        .annotate(branch_count=Count('branch', distinct=True))
    )

    for entry in subject_branch_counts:
        if entry['branch_count'] > 1:
            Subject.objects.filter(id=entry['subject__id']).update(
                is_common=True
            )
