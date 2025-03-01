import React, { useEffect, useState } from 'react';
import { X, Filter, Clock, Eye, ThumbsUp } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  viewCount: string;
  likeCount: string;
  duration: string;
  category: 'treatment' | 'prevention' | 'identification' | 'general';
}

interface DiseaseVideosProps {
  diseaseName: string;
}

interface VideoModalProps {
  video: Video | null;
  onClose: () => void;
}

// Video Modal Component
function VideoModal({ video, onClose }: VideoModalProps) {
  if (!video) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-lg">{video.title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${video.id}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {video.viewCount} views
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              {video.likeCount} likes
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {video.duration}
            </div>
          </div>
          <p className="text-sm text-gray-600">{video.description}</p>
          <div className="mt-2">
            <span className="text-sm font-medium text-gray-700">Channel: </span>
            <span className="text-sm text-gray-600">{video.channelTitle}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DiseaseVideos({ diseaseName }: DiseaseVideosProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');

  useEffect(() => {
    const fetchVideos = async () => {
      if (!diseaseName) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // First API call to get video details
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(
            `${diseaseName} crop disease ${filter !== 'all' ? filter : ''}`
          )}&type=video&key=AIzaSyBLmdnuzxg2iNqz_3H7JBMaE9I6Aq-FTDQ`
        );

        if (!searchResponse.ok) {
          throw new Error('Failed to fetch videos');
        }

        const searchData = await searchResponse.json();
        
        // Get video IDs for detailed info
        const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
        
        // Second API call to get additional video details
        const detailsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=AIzaSyBLmdnuzxg2iNqz_3H7JBMaE9I6Aq-FTDQ`
        );

        if (!detailsResponse.ok) {
          throw new Error('Failed to fetch video details');
        }

        const detailsData = await detailsResponse.json();

        // Combine and format video data
        const formattedVideos = detailsData.items.map((item: any) => ({
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
          publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
          description: item.snippet.description,
          viewCount: new Intl.NumberFormat('en-US', { notation: 'compact' }).format(item.statistics.viewCount),
          likeCount: new Intl.NumberFormat('en-US', { notation: 'compact' }).format(item.statistics.likeCount),
          duration: formatDuration(item.contentDetails.duration),
          category: categorizeVideo(item.snippet.title, item.snippet.description)
        }));

        // Sort videos based on selected criteria
        const sortedVideos = sortVideos(formattedVideos, sortBy);
        setVideos(sortedVideos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [diseaseName, filter, sortBy]);

  const categorizeVideo = (title: string, description: string): Video['category'] => {
    const content = (title + ' ' + description).toLowerCase();
    if (content.includes('treatment') || content.includes('cure') || content.includes('control')) {
      return 'treatment';
    } else if (content.includes('prevent') || content.includes('avoid')) {
      return 'prevention';
    } else if (content.includes('identify') || content.includes('symptoms')) {
      return 'identification';
    }
    return 'general';
  };

  const formatDuration = (duration: string): string => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    let result = '';
    if (hours) result += `${hours}:`;
    result += `${minutes.padStart(2, '0')}:`;
    result += seconds.padStart(2, '0');
    return result;
  };

  const sortVideos = (videosToSort: Video[], criterion: string): Video[] => {
    return [...videosToSort].sort((a, b) => {
      switch (criterion) {
        case 'views':
          return parseInt(b.viewCount.replace(/[^\d]/g, '')) - parseInt(a.viewCount.replace(/[^\d]/g, ''));
        case 'likes':
          return parseInt(b.likeCount.replace(/[^\d]/g, '')) - parseInt(a.likeCount.replace(/[^\d]/g, ''));
        case 'date':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        default:
          return 0;
      }
    });
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Error loading videos: {error}
      </div>
    );
  }

  if (!videos.length) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Educational Videos</h2>
        
        <div className="flex flex-wrap gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="all">All Content</option>
            <option value="treatment">Treatment</option>
            <option value="prevention">Prevention</option>
            <option value="identification">Identification</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="relevance">Most Relevant</option>
            <option value="views">Most Viewed</option>
            <option value="likes">Most Liked</option>
            <option value="date">Newest</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
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
                <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-600">{video.channelTitle}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {video.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {video.likeCount}
                  </span>
                  <span>{video.publishedAt}</span>
                </div>
                <span className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">
                  {video.category}
                </span>
              </div>
            </button>
          </div>
        ))}
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