"""Views for the NR import app."""
import os
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import NRUpload, NRValidationError
from .services import parse_nr_excel, validate_nr_data, import_nr_to_database, inspect_excel_sheets
from apps.examinations.models import ExamSession


@api_view(['POST'])
@parser_classes([MultiPartParser])
def upload_nr(request):
    """Upload a Nominal Roll Excel file."""
    session_id = request.data.get('session_id')
    file = request.FILES.get('file')

    if not session_id:
        return Response(
            {'error': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not file:
        return Response(
            {'error': 'No file uploaded.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file type
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ['.xlsx', '.xls']:
        return Response(
            {'error': 'Only .xlsx and .xls files are supported.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file size (10MB)
    if file.size > 10 * 1024 * 1024:
        return Response(
            {'error': 'File size exceeds 10MB limit.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        exam_session = ExamSession.objects.get(id=session_id)
    except ExamSession.DoesNotExist:
        return Response(
            {'error': 'Invalid session_id.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Save the upload record
    nr_upload = NRUpload.objects.create(
        exam_session=exam_session,
        file=file,
        original_filename=file.name,
        file_size=file.size,
        uploaded_by=request.user if request.user.is_authenticated else None,
        status='UPLOADED',
    )

    sheet_info, recommended_sheet = inspect_excel_sheets(nr_upload.file.path)

    return Response({
        'upload_id': nr_upload.id,
        'filename': nr_upload.original_filename,
        'status': 'UPLOADED',
        'sheets': sheet_info,
        'recommended_sheet': recommended_sheet,
        'message': 'File uploaded successfully. Call /api/nr/validate/ to validate.',
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def validate_nr(request):
    """Validate an uploaded NR file."""
    upload_id = request.data.get('upload_id')
    sheet_name = request.data.get('sheet_name')

    if not upload_id:
        return Response(
            {'error': 'upload_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        nr_upload = NRUpload.objects.get(id=upload_id)
    except NRUpload.DoesNotExist:
        return Response(
            {'error': 'Invalid upload_id.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    nr_upload.status = 'VALIDATING'
    nr_upload.save()

    try:
        # Parse the Excel file with sheet selection
        df, column_mapping, fatal_errors, parse_warnings, used_sheet, sheet_info = parse_nr_excel(
            nr_upload.file.path, sheet_name=sheet_name
        )

        if fatal_errors:
            nr_upload.status = 'ERRORS'
            nr_upload.save()
            return Response({
                'upload_id': nr_upload.id,
                'status': 'ERRORS',
                'warnings': parse_warnings,
                'sheets': sheet_info,
                'selected_sheet': used_sheet,
                'errors': [{'row': 0, 'type': 'PARSE_ERROR', 'message': err} for err in fatal_errors],
                'message': '; '.join(fatal_errors),
            })

        # Validate rows
        valid_rows, errors = validate_nr_data(
            df, column_mapping, nr_upload.exam_session_id
        )

        # Save validation errors
        NRValidationError.objects.filter(nr_upload=nr_upload).delete()
        error_objects = [
            NRValidationError(
                nr_upload=nr_upload,
                row_number=e['row_number'],
                error_type=e['error_type'],
                column_name=e.get('column_name', ''),
                value=e.get('value', ''),
                message=e['message'],
            )
            for e in errors
        ]
        NRValidationError.objects.bulk_create(error_objects)

        # Update upload record
        nr_upload.total_rows = len(df)
        nr_upload.valid_rows = len(valid_rows)
        nr_upload.error_rows = len(errors)
        nr_upload.status = 'VALIDATED' if not errors else 'ERRORS'
        nr_upload.processed_at = timezone.now()
        nr_upload.save()

        # Update session status
        nr_upload.exam_session.status = 'NR_UPLOADED'
        nr_upload.exam_session.save()

        return Response({
            'upload_id': nr_upload.id,
            'status': nr_upload.status,
            'total_rows': nr_upload.total_rows,
            'valid_rows': nr_upload.valid_rows,
            'error_rows': nr_upload.error_rows,
            'detected_columns': column_mapping,
            'warnings': parse_warnings,
            'sheets': sheet_info,
            'selected_sheet': used_sheet,
            'errors': [
                {'row': e['row_number'], 'type': e['error_type'], 'message': e['message']}
                for e in errors[:100]
            ],
            'message': (
                f'Validation complete. {nr_upload.valid_rows} valid rows, '
                f'{nr_upload.error_rows} errors in sheet "{used_sheet}".'
            ),
        })

    except Exception as e:
        nr_upload.status = 'FAILED'
        nr_upload.save()
        return Response(
            {'error': f'Failed to process file: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
def import_nr(request):
    """Import validated NR data into the database."""
    upload_id = request.data.get('upload_id')
    sheet_name = request.data.get('sheet_name')

    if not upload_id:
        return Response(
            {'error': 'upload_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        nr_upload = NRUpload.objects.get(id=upload_id)
    except NRUpload.DoesNotExist:
        return Response(
            {'error': 'Invalid upload_id.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if nr_upload.status not in ['VALIDATED', 'ERRORS']:
        return Response(
            {'error': 'NR must be validated before import.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Re-parse and validate with the chosen sheet
        df, column_mapping, fatal_errors, _, used_sheet, _ = parse_nr_excel(
            nr_upload.file.path, sheet_name=sheet_name
        )
        if fatal_errors:
            return Response(
                {'error': '; '.join(fatal_errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_rows, _ = validate_nr_data(
            df, column_mapping, nr_upload.exam_session_id
        )

        # Import valid rows
        overrides = {
            'curriculum': request.data.get('curriculum'),
            'year': request.data.get('year'),
            'semester': request.data.get('semester'),
            'category': request.data.get('category'),
        }
        created_count = import_nr_to_database(
            valid_rows, nr_upload.exam_session, nr_upload, overrides=overrides
        )

        nr_upload.status = 'IMPORTED'
        nr_upload.save()

        # Update session status
        nr_upload.exam_session.status = 'VALIDATED'
        nr_upload.exam_session.save()

        return Response({
            'upload_id': nr_upload.id,
            'status': 'IMPORTED',
            'candidates_created': created_count,
            'message': f'Successfully imported {created_count} candidates.',
        })

    except Exception as e:
        return Response(
            {'error': f'Import failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
def preview_nr(request):
    """Preview the data from an uploaded NR file."""
    upload_id = request.query_params.get('upload_id')

    if not upload_id:
        return Response(
            {'error': 'upload_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        nr_upload = NRUpload.objects.get(id=upload_id)
    except NRUpload.DoesNotExist:
        return Response(
            {'error': 'Invalid upload_id.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        df, column_mapping, _ = parse_nr_excel(nr_upload.file.path)
        preview_data = df.head(20).fillna('').to_dict(orient='records')

        return Response({
            'upload_id': nr_upload.id,
            'filename': nr_upload.original_filename,
            'total_rows': len(df),
            'columns': list(df.columns),
            'detected_mapping': column_mapping,
            'preview': preview_data,
        })

    except Exception as e:
        return Response(
            {'error': f'Failed to preview: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
