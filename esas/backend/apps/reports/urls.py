from django.urls import path
from . import views

urlpatterns = [
    path('seat-allotment/', views.seat_allotment_report, name='report-allotment'),
    path('room-summary/', views.room_summary_report, name='report-room-summary'),
    path('subject-wise/', views.subject_wise_report, name='report-subject-wise'),
    path('export/excel/', views.export_excel, name='export-excel'),
    path('export/pdf/', views.export_pdf, name='export-pdf'),
]
