# ESAS - Smart Exam Seat Allotment System

A web-based examination seat-allotment platform for diploma/polytechnic colleges.

## Tech Stack

- **Backend:** Django + Django REST Framework
- **Frontend:** React 19 + Vite + Tailwind CSS
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Excel:** OpenPyXL + Pandas
- **PDF:** ReportLab
- **Auth:** JWT (SimpleJWT)

## Quick Start

### Backend
```bash
cd esas/backend
venv\Scripts\activate       # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd esas/frontend
npm install
npm run dev
```

## Project Structure
```
esas/
├── backend/
│   ├── config/          # Django project settings
│   ├── apps/
│   │   ├── accounts/    # Authentication & user management
│   │   ├── examinations/# Exam sessions
│   │   ├── students/    # Student & candidate management
│   │   ├── nr_import/   # Nominal Roll upload & parsing
│   │   ├── seating/     # Allocation engine
│   │   ├── rooms/       # Room configuration
│   │   └── reports/     # PDF/Excel report generation
│   └── manage.py
├── frontend/            # React + Vite app
└── sample_data/         # Sample NR Excel files
```
