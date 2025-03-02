import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface Disease {
  id: string;
  name: string;
  first_detected: string;
  last_detected: string;
  total_cases: number; // This will be computed from the query
}

export function DetectedDiseases() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDiseases() {
      try {
        setLoading(true);
        
        // Fetch diseases with counts from scans
        const { data, error } = await supabase
          .from('diseases')
          .select(`
            id,
            name,
            first_detected,
            last_detected,
            total_cases:scans!disease_name(count)
          `)
          .order('last_detected', { ascending: false });

        if (error) throw error;

        // Transform the data to include the count
        const processedData = data?.map(disease => ({
          ...disease,
          total_cases: disease.total_cases[0]?.count || 0
        })) || [];

        // Sort by total cases descending
        processedData.sort((a, b) => b.total_cases - a.total_cases);

        setDiseases(processedData);
      } catch (err) {
        console.error('Error fetching diseases:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch diseases');
      } finally {
        setLoading(false);
      }
    }

    fetchDiseases();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (diseases.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No diseases detected yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {diseases.map((disease) => (
          <div
            key={disease.id}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">{disease.name}</h3>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                {disease.total_cases} {disease.total_cases === 1 ? 'case' : 'cases'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <p>First Detected</p>
                <p className="font-medium text-gray-900">
                  {new Date(disease.first_detected).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p>Last Detected</p>
                <p className="font-medium text-gray-900">
                  {new Date(disease.last_detected).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 