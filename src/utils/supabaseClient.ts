import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

if (!import.meta.env.VITE_SUPABASE_URL) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL');
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY');
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to handle database operations with error handling
export async function handleDatabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      console.error('Database operation error:', error);
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Unexpected error:', err);
    return { data: null, error: errorMessage };
  }
}

// Helper function to insert scan data
export async function insertScanData(scanData: {
  user_id: string;
  image_url: string;
  scan_time: number;
  disease_name: string;
  confidence_score: number;
  severity: string;
  description: string;
  treatment_recommendation: string;
  preventive_measures: string;
}) {
  return handleDatabaseOperation(() =>
    supabaseClient
      .from('scans')
      .insert([scanData])
      .select()
  );
}

// Helper function to fetch user's scans
export async function fetchUserScans(userId: string) {
  return handleDatabaseOperation(() =>
    supabaseClient
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  );
}

// Helper function to fetch a single scan
export async function fetchScanById(scanId: string) {
  return handleDatabaseOperation(() =>
    supabaseClient
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single()
  );
}