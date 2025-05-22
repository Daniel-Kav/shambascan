# ShambaScan

ShambaScan is a web application designed to assist with plant disease detection and quality assessment using AI.

## Project Structure

The project is composed of the following main parts:

### Frontend

Located in the `src/` directory, the frontend is a React application built with TypeScript and styled using Tailwind CSS. It provides a user interface for interacting with the ShambaScan service, including user authentication, a dashboard, a scanner for analyzing plant images, and a history of past analyses.

### Backend

The backend, located in the `backend/` directory, is a Django application. It handles API requests from the frontend, likely processes the plant image analysis, manages user data and analysis history, and interacts with the machine learning model and the database.

### Machine Learning

Relevant code and data for machine learning model training and inference are located in directories such as `src/training/`, `src/models/`, `src/data/`, and files like `src/train.py` and `backend/core/ml_model.py`. This part is responsible for the core AI functionality of detecting plant diseases and assessing quality.

### Database and Authentication

The project uses Supabase, indicated by the `supabase/` directory and the `AuthContext` in the frontend, for database and authentication services.

## Setup and Installation

*(Further details on setting up the environment, installing dependencies, and running the application will be added here.)*

## Usage

*(Instructions on how to use the application will be added here.)* 