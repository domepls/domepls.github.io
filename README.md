# DoMePls - Task Management System

DoMePls is a web-based task management system that allows users to create projects, manage tasks, and track progress with authentication and API-based architecture.

## Project Structure

```
domepls.github.io/
├── client/              # Angular frontend application
├── server/              # Django REST API backend
├── .github/
│   └── workflows/       # GitHub Actions CI/CD
├── README.md
└── .gitignore
```

## Tech Stack

- **Frontend**: Angular 17+, TypeScript, HTML, CSS
- **Backend**: Django 6.0, Django REST Framework 3.17
- **Database**: SQLite (development), PostgreSQL (production ready)
- **Authentication**: Token-based JWT
- **Deployment**:
  - Frontend: GitHub Pages (via GitHub Actions)
  - Backend: Render.com (via Docker)

## Prerequisites

- Node.js 20+ and npm
- Python 3.8+
- Git

## Setup Instructions

### Backend Setup (Django)

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Create and activate a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Run migrations:

   ```bash
   python manage.py migrate
   ```

5. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

The backend will be available at `http://localhost:8000`

### Frontend Setup (Angular)

1. Navigate to the client directory:

   ```bash
   cd client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Angular development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:4200`

## Team Members

1. Nurgali Nursultan - Team Lead
2. Zhenisova Aruzhan - Frontend
3. Toktarova Amina - Backend

## License

This project is licensed under the MIT License - see the LICENSE file for details.
