import os
import base64
import google.generativeai as genai
from typing import TypedDict, List
import json

# Configure Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-pro-vision')

class PlantAnalysis(TypedDict):
    disease_name: str
    confidence_score: float
    severity: str
    description: str
    treatment_recommendations: List[str]
    preventive_measures: List[str]

def encode_image_to_base64(image_path: str) -> str:
    """Convert image file to base64 string."""
    with open(image_path, 'rb') as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

async def analyze_plant_image(image_path: str) -> PlantAnalysis:
    """
    Analyze plant image using Gemini Vision API.
    Returns structured analysis of plant disease.
    """
    try:
        # Prepare the image
        image_data = encode_image_to_base64(image_path)
        
        # Prepare the prompt
        prompt = """
        Analyze this plant image and provide a detailed report including:
        disease name, confidence score (as a percentage), severity (low/medium/high),
        description, treatment recommendations, and preventive measures.
        Format the response as a JSON object with the following fields:
        disease_name, confidence_score, severity, description,
        treatment_recommendations (array), preventive_measures (array).
        """

        # Generate content
        response = await model.generate_content_async([
            prompt,
            {
                "mime_type": "image/jpeg",
                "data": image_data
            }
        ], generation_config={
            "temperature": 0.2,
            "top_k": 16,
            "top_p": 0.8,
            "max_output_tokens": 1024
        })

        # Extract and parse the JSON response
        result_text = response.text.strip()
        # Remove markdown code blocks if present
        result_text = result_text.replace('```json\n', '').replace('\n```', '')
        
        analysis: PlantAnalysis = json.loads(result_text)
        
        # Validate required fields
        required_fields = ['disease_name', 'confidence_score', 'severity', 
                         'description', 'treatment_recommendations', 'preventive_measures']
        for field in required_fields:
            if field not in analysis:
                raise ValueError(f"Missing required field: {field}")

        return analysis

    except Exception as e:
        print(f"Error analyzing image: {str(e)}")
        raise
