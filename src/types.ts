export interface ScanResult {
  id: string;
  timestamp: string;
  image: string;
  disease: string;
  confidence: number;
  treatment: string;
}

export interface DashboardStats {
  totalScans: number;
  successRate: number;
  ScannedPlants: number;
  detectedDiseases: number;
}