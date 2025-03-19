import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface Disease {
  disease_name: string;
  total_cases: number;
  first_detected: string;
  last_detected: string;
  description: string;
}

export function DetectedDiseases() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDiseases() {
      try {
        setLoading(true);
        
        // Get disease statistics from scans table with corrected query
        const { data, error } = await supabase
          .from('scans')
          .select('disease_name, description, created_at')
          .not('disease_name', 'is', null);

        if (error) throw error;

        // Process the data manually since we're not using group by in the query
        const diseaseMap = new Map();
        
        data.forEach(scan => {
          if (!diseaseMap.has(scan.disease_name)) {
            diseaseMap.set(scan.disease_name, {
              disease_name: scan.disease_name,
              description: scan.description,
              total_cases: 0,
              first_detected: scan.created_at,
              last_detected: scan.created_at
            });
          }
          
          const diseaseData = diseaseMap.get(scan.disease_name);
          diseaseData.total_cases += 1;
          
          // Update first and last detected dates
          if (new Date(scan.created_at) < new Date(diseaseData.first_detected)) {
            diseaseData.first_detected = scan.created_at;
          }
          
          if (new Date(scan.created_at) > new Date(diseaseData.last_detected)) {
            diseaseData.last_detected = scan.created_at;
          }
        });

        // Convert Map to array and sort by total cases descending
        const processedData = Array.from(diseaseMap.values())
          .sort((a, b) => b.total_cases - a.total_cases);

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
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-4">
        <h3 className="text-lg font-medium text-gray-900">Disease Statistics</h3>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Unique Diseases</p>
            <p className="text-2xl font-semibold text-green-600">{diseases.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Cases</p>
            <p className="text-2xl font-semibold text-green-600">
              {diseases.reduce((sum, disease) => sum + disease.total_cases, 0)}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {diseases.map((disease) => (
          <div
            key={disease.disease_name}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">{disease.disease_name}</h3>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                {disease.total_cases} {disease.total_cases === 1 ? 'case' : 'cases'}
              </span>
            </div>
            {disease.description && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {disease.description}
              </p>
            )}
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