export interface Profile {
  id: string;
  role: 'farmer' | 'researcher' | 'admin';
  full_name: string | null;
  organization: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  image_url: string;
  disease_name: string | null;
  confidence_score: number | null;
  treatment_recommendation: string | null;
  created_at: string;
}

export interface Disease {
  id: string;
  name: string;
  description: string;
  symptoms: string[];
  treatments: string[];
  prevention_tips: string[];
  created_at: string;
  updated_at: string;
}

export interface EducationalResource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  url: string;
  disease_id: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface DashboardStats {
  totalScans: number;
  successRate: number;
  activePlants: number;
  detectedDiseases: number;
}