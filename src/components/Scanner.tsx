      import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertTriangle, CheckCircle, ImageIcon, Brain, Cloud, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DiseaseVideos } from './DiseaseVideos';
import { aiService, type DiseaseAnalysis } from '../lib/ai-service';
import { api } from '../lib/api';

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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Please sign in to analyze plants');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setCurrentFile(file);
    setPreview(URL.createObjectURL(file));
    setIsAnalyzing(true);
    setError(null);
    resetLoadingSteps();

    try {
      // Step 1: Prepare Image
      updateStepStatus('prepare', 'loading');
      const formData = new FormData();
      formData.append('image', file);
      updateStepStatus('prepare', 'completed', 100);

      // Step 2: Analyze Disease
      updateStepStatus('analyze', 'loading');
      const analysis = await aiService.analyzePlantImage(preview!);
      setResult(analysis);
      updateStepStatus('analyze', 'completed', 100);

      // Step 3: Upload to Cloud Storage
      updateStepStatus('upload', 'loading');
      const imageUrl = await uploadToCloudinary(file, (progress) => {
        updateStepStatus('upload', 'loading', progress);
      });
      updateStepStatus('upload', 'completed', 100);

      // Step 4: Save to Database
      updateStepStatus('save', 'loading');
      formData.append('image_url', imageUrl);
      formData.append('disease_name', analysis.disease);
      formData.append('confidence_score', analysis.confidence.toString());
      formData.append('severity', analysis.severity);
      formData.append('description', analysis.description);
      formData.append('treatment_recommendation', analysis.treatment);
      formData.append('preventive_measures', JSON.stringify(analysis.preventiveMeasures));

      await api.createScan(formData);
      updateStepStatus('save', 'completed', 100);

      toast.success('Plant analysis completed successfully!');
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast.error('Failed to analyze plant: ' + error.message);
      
      // Update the failed step
      const failedStep = loadingSteps.find(step => step.status === 'loading');
      if (failedStep) {
        updateStepStatus(
          failedStep.id, 
          'error', 
          undefined, 
          error.message,
          onDrop.bind(null, acceptedFiles)
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, loadingSteps, preview]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1,
    disabled: isAnalyzing
  });

  return (
    <div className="space-y-8">
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
          ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className="w-12 h-12 text-gray-400" />
          {preview ? (
            <img src={preview} alt="Preview" className="max-w-xs rounded-lg shadow-sm" />
          ) : isDragActive ? (
            <p className="text-lg text-gray-600">Drop your image here...</p>
          ) : (
            <p className="text-lg text-gray-600">
              Drag & drop a plant image here, or click to select
            </p>
          )}
        </div>
      </div>

      {/* Loading Steps */}
      {isAnalyzing && (
        <div className="space-y-4">
          {loadingSteps.map((step) => (
            <div key={step.id} className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {step.status === 'waiting' && (
                  <step.icon className="w-6 h-6 text-gray-400" />
                )}
                {step.status === 'loading' && (
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                )}
                {step.status === 'completed' && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
                {step.status === 'error' && (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                )}
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{step.title}</h3>
                  {step.progress !== undefined && step.status === 'loading' && (
                    <span className="text-sm text-gray-500">{Math.round(step.progress)}%</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{step.description}</p>
                {step.status === 'error' && step.errorDetails && (
                  <p className="text-sm text-red-500 mt-1">{step.errorDetails}</p>
                )}
                {step.status === 'error' && step.retryFn && (
                  <button
                    onClick={step.retryFn}
                    className="text-sm text-blue-500 hover:text-blue-600 mt-2"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result && !isAnalyzing && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Analysis Results</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Detected Disease</h3>
                <p className="text-gray-600">{result.disease}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900">Confidence Score</h3>
                <p className="text-gray-600">{result.confidence.toFixed(2)}%</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Severity</h3>
                <p className="text-gray-600">{result.severity}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900">Description</h3>
                <p className="text-gray-600">{result.description}</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Treatment Recommendations</h3>
                <p className="text-gray-600">{result.treatment}</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Preventive Measures</h3>
                <ul className="list-disc list-inside text-gray-600">
                  {result.preventiveMeasures.map((measure, index) => (
                    <li key={index}>{measure}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Disease Videos */}
          <DiseaseVideos diseaseName={result.disease} />
        </div>
      )}
    </div>
  );
}