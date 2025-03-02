// Obscure the API key
const _k = import.meta.env.VITE_GEMINI_API_KEY;
const _e = 'https://generativelanguage.googleapis.com';
const _v = 'v1';
const _m = 'models';
const _g = 'gemini-2.0-flash';

// Helper function to convert data URL to base64
const getBase64FromDataUrl = (dataUrl: string): string => {
  const split = dataUrl.split(',');
  return split.length > 1 ? split[1] : dataUrl;
};

interface APIResponse {
  disease_name: string;
  confidence_score: number;
  severity: string;
  description: string;
  treatment_recommendations: string[];
  preventive_measures: string[];
}

// Obscure the API call
const _r = async (d: string) => {
  try {
    // Ensure we have valid base64 data
    const base64Data = getBase64FromDataUrl(d);
    if (!base64Data) {
      throw new Error('Invalid image data');
    }

    const response = await fetch(`${_e}/${_v}/${_m}/${_g}:generateContent?key=${_k}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this plant image and provide a detailed report including: disease name, confidence score (as a percentage), severity (low/medium/high), description, treatment recommendations, and preventive measures. Format the response as a JSON object with the following fields: disease_name, confidence_score, severity, description, treatment_recommendations (array), preventive_measures (array)." },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 16,
          topP: 0.8,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API Response:', errorData);
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}` +
        (errorData ? `\nDetails: ${JSON.stringify(errorData)}` : '')
      );
    }

    const result = await response.json();
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from API');
    }

    const content = result.candidates[0].content;
    const jsonStr = content.parts[0].text.replace(/```json\n|\n```/g, '');
    
    try {
      const apiResponse = JSON.parse(jsonStr) as APIResponse;
      
      // Transform API response to match our PlantAnalysis interface
      return {
        disease: apiResponse.disease_name,
        confidence: apiResponse.confidence_score,
        severity: apiResponse.severity as 'Low' | 'Medium' | 'High',
        description: apiResponse.description,
        treatment: apiResponse.treatment_recommendations.join('\n'),
        preventiveMeasures: apiResponse.preventive_measures
      };
    } catch (parseError) {
      console.error('Failed to parse API response:', jsonStr);
      throw new Error('Failed to parse analysis results');
    }
  } catch (error) {
    console.error('Internal analysis error:', error);
    throw new Error('Image analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

export const analyzePlantImage = _r;

export interface PlantAnalysis {
  disease: string;
  confidence: number;
  description: string;
  treatment: string;
  severity: 'Low' | 'Medium' | 'High';
  preventiveMeasures: string[];
}