import { ArrowLeft, Star } from 'lucide-react';
import { format } from 'date-fns';

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

interface ScanDetailsProps {
  scan: Scan;
  onBack: () => void;
}

export default function ScanDetails({ scan, onBack }: ScanDetailsProps) {
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

  return (
    <div className="container mx-auto p-4">
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Scan History
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-start space-x-6">
            <img
              src={scan.image_url}
              alt={scan.scan_name}
              className="w-48 h-48 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{scan.scan_name}</h1>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Scan ID</p>
                  <p className="font-medium">{scan.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scan Date</p>
                  <p className="font-medium">
                    {format(new Date(scan.created_at), 'PPpp')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quality Score</p>
                  <div className="flex">{renderStars(scan.quality_score || 0)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scan Time</p>
                  <p className="font-medium">{(scan.scan_time || 0).toFixed(2)}s</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Disease Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Disease Name</p>
                    <p className="font-medium">{scan.disease_name || 'Not detected'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Confidence Score</p>
                    <div className="flex">{renderStars(scan.confidence_score || 0)}</div>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="mt-1">{scan.description || 'No description available'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Severity</p>
                  <p className="mt-1">{scan.severity || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Treatment & Prevention</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Treatment Recommendation</p>
                  <p className="mt-1">{scan.treatment_recommendation || 'No treatment recommendations available'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Preventive Measures</p>
                  <p className="mt-1">{scan.preventive_measures || 'No preventive measures available'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
