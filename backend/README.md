# ShambaScan Backend

This is the Django backend for the ShambaScan application, which provides plant disease detection and management capabilities using Google's Gemini Vision API.

## Features

- User authentication with JWT
- Plant disease detection using Gemini Vision AI
- Disease information management
- User profiles and statistics
- Disease educational videos

## Setup

1. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a .env file in the root directory with the following variables:
```
DJANGO_SECRET_KEY=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here
DEBUG=True
```

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create a superuser:
```bash
python manage.py createsuperuser
```

6. Run the development server:
```bash
python manage.py runserver
```

## API Endpoints

### Authentication
- POST `/api/register/` - Register a new user
- POST `/api/token/` - Obtain JWT token pair
- POST `/api/token/refresh/` - Refresh JWT token

### Profile
- GET `/api/profile/` - Get user profile
- PUT `/api/profile/` - Update user profile

### Diseases
- GET `/api/diseases/` - List all diseases
- GET `/api/diseases/{id}/` - Get disease details

### Scans
- GET `/api/scans/` - List user's scans
- POST `/api/scans/` - Create new scan
- GET `/api/scans/{id}/` - Get scan details
- GET `/api/scans/stats/` - Get user's scan statistics

### Disease Videos
- GET `/api/videos/` - List all disease videos
- GET `/api/videos/?disease_id={id}` - List videos for specific disease

## Machine Learning Model

The disease detection model needs to be placed in the appropriate directory and configured in `core/ml_model.py`. Update the `model_path` and `class_labels` according to your trained model.
