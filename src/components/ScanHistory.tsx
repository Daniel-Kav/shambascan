import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Star } from 'lucide-react';
import ScanDetails from './ScanDetails';

interface Scan {
  id: string;
  scan_name: string;
  image_url: string;
  quality_score: number;
  scan_time: number;
  created_at: string;
  disease_name: string;
  confidence_score: number;
  description: string;
  severity: string;
  treatment_recommendation: string;
  preventive_measures: string;
}

interface ScanHistoryProps {
  user: any;
}

export function ScanHistory({ user }: ScanHistoryProps) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScans();
  }, [user]);

  const fetchScans = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (score: number) => {
    const stars = [];
    const totalStars = 10;
    const filledStars = Math.round(score * totalStars);

    for (let i = 0; i < totalStars; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < filledStars ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
          }`}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return <div className="p-4">Loading scan history...</div>;
  }

  if (selectedScan) {
    return <ScanDetails scan={selectedScan} onBack={() => setSelectedScan(null)} />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Scan History</h1>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            className="px-3 py-2 border rounded-md"
            onChange={(e) => {
              // Add date filtering logic here
            }}
          />
          <select
            className="px-3 py-2 border rounded-md"
            onChange={(e) => {
              // Add score filtering logic here
            }}
          >
            <option value="all">All Scores</option>
            <option value="high">High Score</option>
            <option value="medium">Medium Score</option>
            <option value="low">Low Score</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scan Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {scans.map((scan) => (
              <tr key={scan.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scan.id.slice(-8)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <img src={scan.image_url} alt={scan.scan_name} className="h-12 w-12 object-cover rounded-md" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{scan.scan_name || 'Unnamed Scan'}</div>
                  <div className="text-sm text-gray-500">Time: {(scan.scan_time || 0).toFixed(2)}s</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex">{renderStars(scan.quality_score || 0)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(scan.created_at), 'yyyy-MM-dd HH:mm:ss.SSSSSS')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedScan(scan)}
                    className="text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md"
                  >
                    Read More
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
