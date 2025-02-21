import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function analyzePlantImage(imageBase64: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
  
  const prompt = `Analyze this plant image and identify any diseases. 
    Provide the following information:
    1. Disease name (if any)
    2. Confidence level (as a percentage)
    3. Brief description
    4. Treatment recommendations
    Format the response as JSON.`;

  const result = await model.generateContent([prompt, { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }]);
  const response = await result.response;
  
  try {
    return JSON.parse(response.text());
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error('Failed to analyze image');
  }
}