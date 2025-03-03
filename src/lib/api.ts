import axios from 'axios';
import { auth } from './auth';

const API_URL = 'http://localhost:8000/api';

// Add response interceptor for token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await auth.refreshToken();
      return axios(originalRequest);
    }
    return Promise.reject(error);
  }
);

export interface Scan {
  id: string;
  user_id: string;
  image_url: string;
  disease_name: string;
  confidence_score: number;
  severity: string;
  description: string;
  treatment_recommendation: string;
  preventive_measures: string;
  created_at: string;
}

export interface Disease {
  id: string;
  name: string;
  description: string;
  symptoms: string;
  treatment: string;
  prevention: string;
  videos: DiseaseVideo[];
}

export interface DiseaseVideo {
  id: string;
  disease_id: string;
  title: string;
  url: string;
  description: string;
}

export interface Profile {
  id: string;
  user_id: string;
  bio: string;
  location: string;
}

class ApiService {
  // Scans
  async createScan(data: FormData): Promise<Scan> {
    const response = await axios.post(`${API_URL}/scans/`, data);
    return response.data;
  }

  async getScans(): Promise<Scan[]> {
    const response = await axios.get(`${API_URL}/scans/`);
    return response.data;
  }

  async getScanStats() {
    const response = await axios.get(`${API_URL}/scans/stats/`);
    return response.data;
  }

  // Diseases
  async getDiseases(): Promise<Disease[]> {
    const response = await axios.get(`${API_URL}/diseases/`);
    return response.data;
  }

  async getDisease(id: string): Promise<Disease> {
    const response = await axios.get(`${API_URL}/diseases/${id}/`);
    return response.data;
  }

  // Disease Videos
  async getDiseaseVideos(diseaseId: string): Promise<DiseaseVideo[]> {
    const response = await axios.get(`${API_URL}/videos/?disease_id=${diseaseId}`);
    return response.data;
  }

  // Profile
  async getProfile(): Promise<Profile> {
    const response = await axios.get(`${API_URL}/profile/`);
    return response.data;
  }

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    const response = await axios.put(`${API_URL}/profile/`, data);
    return response.data;
  }
}

export const api = new ApiService();
