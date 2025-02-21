import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface PlantAnalysis {
  disease: string;
  confidence: number;
  description: string;
  treatment: string;
  severity: 'Low' | 'Medium' | 'High';
  preventiveMeasures: string[];
}

export async function analyzePlantImage(imageBase64: string): Promise<PlantAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a professional plant pathologist. Analyze this plant image and provide a detailed diagnosis.
    Focus on identifying any diseases, pests, or nutritional deficiencies.
    
    Provide your analysis in the following format exactly, with no markdown formatting or bullet points:
    {
      "disease": "Name of the disease or 'Healthy' if no disease detected",
      "confidence": A number between 0-100 representing your confidence level,
      "description": "A clear, concise description of the visible symptoms and condition, in a single paragraph without any formatting",
      "treatment": "A clear, step-by-step treatment plan in a single paragraph without any formatting or numbering",
      "severity": "One of: Low, Medium, High",
      "preventiveMeasures": [
        "List of preventive measures as simple sentences",
        "Each measure should be a complete, clear instruction",
        "No formatting or special characters"
      ]
    }

    Be specific and practical in your recommendations. If the plant appears healthy, 
    still provide preventive care advice. Ensure the response is properly formatted as JSON.`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
    ]);

    const response = await result.response;

    try {
      // Get the text content from the response
      const text = response.text();
      console.log('Raw text:', text);

      // Clean up the response text by removing markdown code block markers
      const cleanedResponse = text
        .replace(/```json\n?/g, '') // Remove opening ```json
        .replace(/```\n?/g, '') // Remove closing ```
        .trim();

      console.log('Cleaned response:', cleanedResponse);

      // Parse the cleaned response into a JSON object
      const parsedResponse = JSON.parse(cleanedResponse);

      // Clean up markdown formatting in text fields (if any)
      const cleanMarkdown = (text: string) => {
        return text
          .replace(/\*\*/g, '') // Remove bold markers
          .replace(/\*/g, '') // Remove italic markers
          .replace(/\d+\.\s+/g, '') // Remove numbered lists
          .replace(/[-*•]\s+/g, '') // Remove bullet points
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
      };

      // Clean up the treatment and description fields
      parsedResponse.treatment = cleanMarkdown(parsedResponse.treatment);
      parsedResponse.description = cleanMarkdown(parsedResponse.description);
      parsedResponse.disease = cleanMarkdown(parsedResponse.disease);
      parsedResponse.preventiveMeasures = parsedResponse.preventiveMeasures.map((measure: string) =>
        cleanMarkdown(measure)
      );

      // Validate the response has all required fields
      const requiredFields = ['disease', 'confidence', 'description', 'treatment', 'severity', 'preventiveMeasures'];
      const missingFields = requiredFields.filter((field) => !(field in parsedResponse));

      if (missingFields.length > 0) {
        throw new Error(`Invalid response format. Missing fields: ${missingFields.join(', ')}`);
      }

      // Ensure confidence is a number between 0 and 100
      if (typeof parsedResponse.confidence !== 'number' || parsedResponse.confidence < 0 || parsedResponse.confidence > 100) {
        throw new Error('Invalid confidence value. Confidence must be a number between 0 and 100.');
      }

      // Ensure severity is one of the allowed values
      const allowedSeverities = ['Low', 'Medium', 'High'];
      if (!allowedSeverities.includes(parsedResponse.severity)) {
        throw new Error(`Invalid severity value. Severity must be one of: ${allowedSeverities.join(', ')}`);
      }

      // Create a properly typed PlantAnalysis object
      const analysis: PlantAnalysis = {
        disease: parsedResponse.disease,
        confidence: parsedResponse.confidence,
        description: parsedResponse.description,
        treatment: parsedResponse.treatment,
        severity: parsedResponse.severity as 'Low' | 'Medium' | 'High',
        preventiveMeasures: parsedResponse.preventiveMeasures
      };

      return analysis;
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw new Error('Failed to parse analysis results. Please try again.');
    }
  } catch (apiError) {
    console.error('Gemini API error:', apiError);
    throw new Error('Failed to analyze image. Please check your internet connection and try again.');
  }
}