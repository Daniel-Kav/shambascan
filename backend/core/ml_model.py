import asyncio as a
from PIL import Image
from ._internal import _p

def load_model():
    """Load the trained model."""
    return True

def preprocess_image(image_path):
    """Preprocess the image for model prediction."""
    try:
        img = Image.open(image_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img = img.resize((224, 224))
        return image_path
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return None

def predict_disease(image_path):
    """
    Predict plant disease from image.
    Returns: (disease_name, confidence_score)
    """
    if not load_model():
        return None, 0

    processed_path = preprocess_image(image_path)
    if not processed_path:
        return None, 0

    try:
        prompt = """
        Analyze this plant image and provide a detailed report including:
        disease name, confidence score (as a percentage), severity (low/medium/high),
        description, treatment recommendations, and preventive measures.
        Format the response as a JSON object with the following fields:
        disease_name, confidence_score, severity, description,
        treatment_recommendations (array), preventive_measures (array).
        """
        
        result = a.run(_p(processed_path, prompt))
        return result['disease_name'], result['confidence_score']
    except Exception as e:
        print(f"Error making prediction: {e}")
        return None, 0
