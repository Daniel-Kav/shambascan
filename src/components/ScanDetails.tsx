import { ArrowLeft, Star, Eye, ThumbsUp } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface Video {
  url: string;
  title: string;
  thumbnail: string;
}

interface Scan {
  id: string;
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
  video_urls: string[];
  video_titles: string[];
  video_thumbnails: string[];
}

interface ScanDetailsProps {
  scan: Scan;
  onBack: () => void;
}

interface VideoModalProps {
  video: Video;
  onClose: () => void;
}

function VideoModal({ video, onClose }: VideoModalProps) {
  const videoId = video.url.split('v=')[1];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-lg">{video.title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

export default function ScanDetails({ scan, onBack }: ScanDetailsProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

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

  const videos = scan.video_urls.map((url, index) => ({
    url,
    title: scan.video_titles[index],
    thumbnail: scan.video_thumbnails[index]
  }));

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
              alt="Scanned plant"
              className="w-48 h-48 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{scan.description}</h1>
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
                  <div className="flex">{renderStars(scan.confidence_score || 0)}</div>
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

            {videos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Educational Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map((video, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <button
                        onClick={() => setSelectedVideo(video)}
                        className="block w-full text-left"
                      >
                        <div className="relative">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                            {video.title}
                          </h3>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}
