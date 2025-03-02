      // });

      // if (scanError) {
import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertTriangle, CheckCircle, ImageIcon, Brain, Cloud, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { DiseaseVideos } from './DiseaseVideos';
import { aiService, type DiseaseAnalysis } from '../lib/ai-service';

interface ScannerProps {
  user: {
    id: string;
  } | null;
}

interface LoadingStep {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'loading' | 'completed' | 'error';
  icon: React.ElementType;
  progress?: number;
  errorDetails?: string;
  retryFn?: () => void;
}

interface UploadProgressCallback {
  (progress: number): void;
}

interface Video {
  url: string;
  title: string;
  thumbnail: string;
}

const uploadToCloudinary = async (file: File, onProgress: UploadProgressCallback): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '');

  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/upload`);
    xhr.send(formData);
  });
};

const insertScanData = async (data: {
  user_id: string;
  image_url: string;
  disease_name: string;
  confidence_score: number;
  severity: string;
  description: string;
  treatment_recommendation: string;
  preventive_measures: string;
  video_urls: string[];
  video_titles: string[];
  video_thumbnails: string[];
  scan_time?: number;
}) => {
  return await supabase
    .from('scans')
    .insert([{
      user_id: data.user_id,
      image_url: data.image_url,
      disease_name: data.disease_name,
      confidence_score: data.confidence_score,
      severity: data.severity,
      description: data.description,
      treatment_recommendation: data.treatment_recommendation,
      preventive_measures: data.preventive_measures,
      video_urls: data.video_urls,
      video_titles: data.video_titles,
      video_thumbnails: data.video_thumbnails,
      scan_time: data.scan_time
    }])
    .select('*')
    .single();
};

export function Scanner({ user }: ScannerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    {
      id: 'prepare',
      title: 'Preparing Image',
      description: 'Converting and optimizing image for analysis',
      status: 'waiting',
      icon: ImageIcon,
      progress: 0
    },
    {
      id: 'analyze',
      title: 'Analyzing Disease',
      description: 'AI model analyzing plant symptoms',
      status: 'waiting',
      icon: Brain,
      progress: 0
    },
    {
      id: 'upload',
      title: 'Saving Image',
      description: 'Uploading image to cloud storage',
      status: 'waiting',
      icon: Cloud,
      progress: 0
    },
    {
      id: 'save',
      title: 'Recording Results',
      description: 'Saving analysis results to database',
      status: 'waiting',
      icon: Database,
      progress: 0
    }
  ]);
  const [videos, setVideos] = useState<Video[]>([]);

  const updateStepStatus = (
    stepId: string, 
    status: LoadingStep['status'], 
    progress?: number, 
    errorDetails?: string,
    retryFn?: () => void
  ) => {
    setLoadingSteps(steps => 
      steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              status, 
              progress: progress ?? step.progress,
              errorDetails,
              retryFn
            } 
          : step
      )
    );
  };

  const resetLoadingSteps = () => {
    setLoadingSteps(steps => 
      steps.map(step => ({ 
        ...step, 
        status: 'waiting', 
        progress: 0, 
        errorDetails: undefined,
        retryFn: undefined 
      }))
    );
  };

  const fetchVideos = async (diseaseName: string) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(
          `${diseaseName} plant disease treatment prevention`
        )}&type=video&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      return data.items.map((item: any) => ({
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url
      }));
    } catch (error) {
      console.error('Error fetching videos:', error);
      return [];
    }
  };

  const processImage = async (file: File) => {
    if (!user) {
      toast.error('Please log in to use this feature');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      resetLoadingSteps();

      // Step 1: Prepare Image
      updateStepStatus('prepare', 'loading');
      const reader = new FileReader();
      const imageData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      updateStepStatus('prepare', 'completed', 100);

      // Step 2: Analyze Image
      updateStepStatus('analyze', 'loading');
      const analysis = await aiService.analyzeImage(imageData);
      updateStepStatus('analyze', 'completed', 100);

      // Step 3: Upload to Cloud Storage
      updateStepStatus('upload', 'loading');
      const imageUrl = await uploadToCloudinary(file, (progress) => {
        updateStepStatus('upload', 'loading', progress);
      });
      updateStepStatus('upload', 'completed', 100);

      // Fetch educational videos
      const fetchedVideos = await fetchVideos(analysis.disease);
      setVideos(fetchedVideos);

      // Step 4: Save Results
      updateStepStatus('save', 'loading');
      const startTime = Date.now();
      const { error: scanError } = await insertScanData({
        user_id: user.id,
        image_url: imageUrl,
        disease_name: analysis.disease,
        confidence_score: analysis.confidence,
        severity: analysis.severity,
        description: analysis.description,
        treatment_recommendation: analysis.treatment,
        preventive_measures: analysis.preventiveMeasures.join('. '),
        video_urls: fetchedVideos.map((v: Video) => v.url),
        video_titles: fetchedVideos.map((v: Video) => v.title),
        video_thumbnails: fetchedVideos.map((v: Video) => v.thumbnail),
        scan_time: (Date.now() - startTime) / 1000
      });

      if (scanError) {
        updateStepStatus(
          'save', 
          'error', 
          0, 
          'Failed to save results to database. Click to retry.',
          () => processImage(file)
        );
        console.error('Database error:', scanError);
        setResult(analysis);
        toast.success('Analysis complete! (Save to database failed)');
        return;
      }

      updateStepStatus('save', 'completed', 100);
      setResult(analysis);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
      setError(errorMessage);
      toast.error(errorMessage);

      const currentStep = loadingSteps.find(step => step.status === 'loading');
      if (currentStep) {
        updateStepStatus(
          currentStep.id,
          'error',
          0,
          errorMessage,
          () => processImage(file)
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user?.id) {
      toast.error('Please sign in to use the scanner');
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      setCurrentFile(file);
      setError(null);
      setResult(null);
      setPreview(URL.createObjectURL(file));
      resetLoadingSteps();
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    multiple: false
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low':
        return 'text-yellow-600 bg-yellow-50';
      case 'medium':
        return 'text-orange-600 bg-orange-50';
      case 'high':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStepStatusColor = (status: LoadingStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'loading':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Please sign in to use the scanner</p>
      </div>
    );
  }

  const renderLoadingStep = (step: LoadingStep) => (
    <div key={step.id} className="relative">
      <div className="flex items-start gap-3 mb-2">
        <div className={`mt-1 ${getStepStatusColor(step.status)}`}>
          {step.status === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : step.status === 'completed' ? (
            <CheckCircle className="w-5 h-5" />
          ) : step.status === 'error' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <step.icon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium">{step.title}</p>
          <p className="text-sm text-gray-500">
            {step.status === 'error' && step.errorDetails ? (
              <button 
                onClick={step.retryFn} 
                className="text-red-600 hover:text-red-800 underline"
              >
                {step.errorDetails}
              </button>
            ) : (
              step.description
            )}
          </p>
        </div>
        {step.progress !== undefined && step.progress > 0 && step.status !== 'error' && (
          <span className="text-sm font-medium text-gray-600">
            {Math.round(step.progress)}%
          </span>
        )}
      </div>
      {step.status === 'loading' && (
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${step.progress}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-green-500 bg-green-50' : 'border-green-200 hover:border-green-300'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-gray-700 text-lg font-medium">
            {isDragActive
              ? "Drop the image here"
              : "Click to upload or drag and drop"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            PNG, JPG up to 16MB
          </p>
        </div>

        {preview && (
          <div className="mt-6">
            <div className="flex gap-6">
              <div className="flex-1">
                <div className="relative rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full object-contain"
                    style={{ maxHeight: '400px' }}
                  />
                </div>

                {!isAnalyzing && !result && (
                  <div className="mt-4">
                    <button
                      onClick={() => currentFile && processImage(currentFile)}
                      className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Brain className="w-5 h-5" />
                      Analyze Image
                    </button>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="mt-4 bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                      <span className="text-green-700 font-medium">Analyzing...</span>
                    </div>
                  </div>
                )}
              </div>

              {isAnalyzing && (
                <div className="w-96">
                  <div className="bg-white rounded-lg p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Analysis Progress</h3>
                    <div className="space-y-6">
                      {loadingSteps.map(renderLoadingStep)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && !isAnalyzing && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Analysis Error</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="mt-6">
                <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">Analysis Results</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(result.severity)}`}>
                      {result.severity} Severity
                    </span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-gray-600">Detected Disease:</p>
                        <p className="font-semibold text-green-600">{result.disease}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 rounded-full h-2"
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {result.confidence.toFixed(1)}% confidence
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-600">{result.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Treatment Guide</h4>
                      <p className="text-gray-600">{result.treatment}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Prevention</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {result.preventiveMeasures.map((measure, index) => (
                          <li key={index} className="text-gray-600">{measure}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <DiseaseVideos diseaseName={result.disease} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}