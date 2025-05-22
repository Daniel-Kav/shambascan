# ShambaScan

ShambaScan is a web application designed to assist with plant disease detection and quality assessment using AI.

## Project Structure

The project is composed of the following main parts:

### Frontend

Located in the `src/` directory, the frontend is a React application built with TypeScript and styled using Tailwind CSS. It provides a user interface for interacting with the ShambaScan service. It uses `pnpm` or `npm`/`yarn` for dependency management.

Key frontend components in `src/components/` include:

*   `App.tsx`: The main application shell, handling routing and overall layout.
*   `Auth.tsx`: Manages user authentication (sign in, sign up).
*   `Dashboard.tsx`: The main user dashboard.
*   `Scanner.tsx`: Provides the interface for uploading plant images and initiating the analysis.
*   `ScanHistory.tsx`: Displays a list of the user's past plant scans.
*   `ScanDetails.tsx`: Shows detailed results for a specific plant scan.
*   `DiseaseResults.tsx`: Likely a component for displaying the results of a disease analysis.
*   `DiseaseVideos.tsx`: Displays relevant videos related to plant diseases.
*   `ImageUpload.tsx`: A reusable component for image file uploads.
*   `AgrovetMap.tsx`: Appears to be related to displaying a map, potentially for locating agricultural resources.
*   `Analytics.tsx`: A component potentially intended for displaying analytics or additional information (currently seems to contain placeholder content based on `App.tsx`).
*   `Navbar.tsx`: The application's navigation bar/sidebar.

### Backend

The backend, located in the `backend/` directory, is a Django application. It handles API requests from the frontend, processes the plant image analysis, manages user data and analysis history, and interacts with the machine learning model and the database. It uses `pip` for dependency management and relies on a `requirements.txt` file.

#### API Endpoints

The backend exposes the following main API endpoints:

*   `/api/register/`: User registration.
*   `/api/profile/`: User profile management.
*   `/api/diseases/`: Information about plant diseases.
*   `/api/scans/`: Managing plant scan history and results.
*   `/api/videos/`: Related disease videos.
*   `/api/token/`: Obtain JWT tokens for authentication.
*   `/api/token/refresh/`: Refresh JWT tokens.

#### Database Schema

The core database models defined in `backend/core/models.py` include:

*   `User`: Custom user model extending Django's `AbstractUser`, includes email, creation, and update timestamps.
*   `Profile`: One-to-one relationship with `User`, stores additional user information like bio and location.
*   `Disease`: Stores information about specific plant diseases (name, description, symptoms, treatment, prevention).
*   `Scan`: Records each plant scan performed by a user, links to the user, stored image, detected disease, confidence score, and timestamps.
*   `DiseaseVideo`: Links relevant videos to specific diseases.

### Machine Learning

The machine learning component is responsible for analyzing plant images to detect diseases and assess quality. The primary logic for model inference in the backend is found in `backend/core/ml_model.py`.

Key functionalities include:

*   **Model Loading:** The `load_model` function handles loading the trained machine learning model.
*   **Image Preprocessing:** The `preprocess_image` function prepares the uploaded plant images for analysis, including resizing and format conversion.
*   **Disease Prediction:** The `predict_disease` function uses the loaded model and preprocessed image to predict the plant disease and a confidence score. It appears to utilize the Gemini API (via an internal helper function) to get detailed analysis results including severity, description, treatment recommendations, and preventive measures, formatted as a JSON object.

Relevant code and data for machine learning model training and inference are also located in directories such as `src/training/`, `src/models/`, and `src/data/`, and files like `src/train.py`.

### Database and Authentication

The project uses Supabase, indicated by the `supabase/` directory and the `AuthContext` in the frontend, for database and authentication services. The backend uses JWT for API authentication.

## Setup and Installation

To set up the project, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Daniel-Kav/shambascan.git
    cd shambascan
    ```

2.  **Frontend Setup:**

    Navigate to the project root directory and install dependencies using your preferred package manager (pnpm is used in `pnpm-lock.yaml`):

    ```bash
    pnpm install
    # or npm install
    # or yarn install
    ```

3.  **Backend Setup:**

    Navigate to the `backend/` directory and create a Python virtual environment. Then install the backend dependencies:

    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    pip install -r requirements.txt
    ```

4.  **Environment Variables:**

    Create a `.env` file in the `backend/` directory with the following variables:

    ```dotenv
    DJANGO_SECRET_KEY='your_secret_key'
    DEBUG=True # Set to False in production
    GEMINI_API_KEY='your_gemini_api_key'
    ```

    You will also need to configure Supabase environment variables, likely in the frontend or backend depending on how it's integrated beyond the `AuthContext`. Refer to the Supabase documentation for details on obtaining your Supabase URL and Anon key.

5.  **Database Migration:**

    From the `backend/` directory, apply the database migrations:

    ```bash
    python manage.py migrate
    ```

## Running the Application

1.  **Run the Backend:**

    From the `backend/` directory, start the Django development server:

    ```bash
    python manage.py runserver
    ```

2.  **Run the Frontend:**

    From the project root directory, start the frontend development server:

    ```bash
    pnpm run dev
    # or npm run dev
    # or yarn run dev
    ```

    The frontend application should now be accessible in your browser.

## Usage

Once the application is running, follow these steps to use the plant disease and quality scanner:

1.  **Sign In:** If you are a new user, sign up for an account. Otherwise, sign in using your credentials.
2.  **Navigate to Scanner:** Click on the "Disease & Quality" (Scanner) tab in the sidebar.
3.  **Upload Image:** Drag and drop a plant image into the designated area or click to select a file.
4.  **Analysis Process:** The application will display the progress of the analysis, including preparing the image, analyzing for disease using the AI model, uploading the image to cloud storage, and saving the results to the database.
5.  **View Results:** Once the analysis is complete, the results, including disease name, confidence score, severity, description, and treatment recommendations, will be displayed.
6.  **Analysis History:** You can view your past scan results in the "Analysis History" tab.
7.  **Guide & Help:** The "Guide & Help" section is intended to provide additional information and support. 