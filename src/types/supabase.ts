export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      scans: {
        Row: {
          id: number
          user_id: string
          image_url: string
          disease_name: string
          confidence_score: number
          severity: string
          description: string
          treatment_recommendation: string
          preventive_measures: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          image_url: string
          disease_name: string
          confidence_score: number
          severity: string
          description: string
          treatment_recommendation: string
          preventive_measures: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          image_url?: string
          disease_name?: string
          confidence_score?: number
          severity?: string
          description?: string
          treatment_recommendation?: string
          preventive_measures?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
