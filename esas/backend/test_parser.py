import os
import sys
import django

# Setup django
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.nr_import.services import parse_nr_excel, validate_nr_data
import pandas as pd

file_path = 'test_nr.xlsx'
df, column_mapping, fatal_errors, warnings, target_sheet, sheet_info = parse_nr_excel(file_path)

print(f"Target sheet: {target_sheet}")
print(f"Sheet info: {sheet_info}")
print(f"Fatal errors: {fatal_errors}")
print(f"Detected columns: {column_mapping}")
print(f"Warnings: {warnings}")
print(f"Extracted rows (before validation): {len(df)}")
print(df.head())

valid_rows, errors = validate_nr_data(df, column_mapping, exam_session_id=None)
print(f"Valid rows: {len(valid_rows)}")
print(f"Errors: {len(errors)}")

for r in valid_rows[:5]:
    print(f"Row {r['row_number']} - PIN: {r['pin']}, Curriculum: {r['curriculum']}, Branch: {r['branch']}")

if len(valid_rows) > 0:
    print("Last valid row:")
    r = valid_rows[-1]
    print(f"Row {r['row_number']} - PIN: {r['pin']}, Curriculum: {r['curriculum']}, Branch: {r['branch']}")
