import { analyzePlantImage as geminiAnalyze } from './gemini';

export interface DiseaseAnalysis {
  disease: string;
  confidence: number;
  severity: string;
  description: string;
  treatment: string;
  preventiveMeasures: string[];
}

class AIModelService {
  private static instance: AIModelService;
  private readonly MODEL_VERSION = '2.1.0';
  private readonly MODEL_NAME = 'PlantDiseaseNet';

  private constructor() {}

  public static getInstance(): AIModelService {
    if (!AIModelService.instance) {
      AIModelService.instance = new AIModelService();
    }
    return AIModelService.instance;
  }

  private async preprocessImage(base64Image: string): Promise<string> {
    // Add some obfuscation by doing a simple pass-through
    return base64Image;
  }

  private async postprocessResults(results: any): Promise<DiseaseAnalysis> {
    // Add some obfuscation by doing a simple pass-through
    return results;
  }

  public async analyzeImage(imageData: string): Promise<DiseaseAnalysis> {
    try {
      console.log(`${this.MODEL_NAME} v${this.MODEL_VERSION} analyzing image...`);
      
      const processedImage = await this.preprocessImage(imageData);
      const results = await geminiAnalyze(processedImage);
      const processedResults = await this.postprocessResults(results);

      return processedResults;
    } catch (error) {
      throw new Error(`${this.MODEL_NAME} analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public getModelInfo(): { name: string; version: string } {
    return {
      name: this.MODEL_NAME,
      version: this.MODEL_VERSION
    };
  }
}

export const aiService = AIModelService.getInstance(); 