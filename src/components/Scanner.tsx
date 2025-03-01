import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertTriangle, CheckCircle, ImageIcon, Brain, Cloud, Database } from 'lucide-react';
import { analyzePlantImage } from '../lib/gemini';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { DiseaseVideos } from './DiseaseVideos';

interface ScannerProps {
  user: {
    id: string;
  } | null;
}

import type { PlantAnalysis } from '../lib/gemini';

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

const uploadToCloudinary = async (file: File, onProgress: UploadProgressCallback): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');

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
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`);
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
}) => {
  const { data: result, error } = await supabase.from('scans').insert([data]).select();
  if (error) throw error;
  return { data: result, error };
};

export function Scanner({ user }: ScannerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PlantAnalysis | null>(null);
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

  const processImage = async (file: File) => {
    if (!user?.id) {
      toast.error('Please sign in to use the scanner');
      return;
    }

    try {
      setCurrentFile(file);
      setIsAnalyzing(true);
      setError(null);
      setResult(null);
      setPreview(URL.createObjectURL(file));
      resetLoadingSteps();

      // Step 1: Prepare Image
      updateStepStatus('prepare', 'loading');
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          updateStepStatus('prepare', 'loading', progress);
        }
      };

      const base64String = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      updateStepStatus('prepare', 'completed', 100);

      // Step 2: Analyze Image
      updateStepStatus('analyze', 'loading');
      const analysis = await analyzePlantImage(base64String.split(',')[1]);
      updateStepStatus('analyze', 'completed', 100);

      // Step 3: Upload Image
      updateStepStatus('upload', 'loading');
      const imageUrl = await uploadToCloudinary(file, (progress) => {
        updateStepStatus('upload', 'loading', progress);
      });
      updateStepStatus('upload', 'completed', 100);

      // Step 4: Save Results
      updateStepStatus('save', 'loading');
      const { error: scanError } = await insertScanData({
        user_id: user.id,
        image_url: imageUrl,
        disease_name: analysis.disease,
        confidence_score: analysis.confidence,
        severity: analysis.severity,
        description: analysis.description,
        treatment_recommendation: analysis.treatment,
        preventive_measures: analysis.preventiveMeasures.join('. '),
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
          `Error: ${errorMessage}. Click to retry.`,
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
      await processImage(file);
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
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Plant Disease Scanner</h2>
      
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-500'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {isDragActive
              ? "Drop the image here"
              : "Drag 'n' drop a plant image here, or click to select"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supports JPG, JPEG, PNG
          </p>
        </div>

        {preview && (
          <div className="mt-6">
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="rounded-lg max-h-96 mx-auto"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">Analyzing Image</h3>
                    <div className="space-y-6">
                      {loadingSteps.map(renderLoadingStep)}
                    </div>
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <button
                          onClick={() => currentFile && processImage(currentFile)}
                          className="flex items-center gap-2 text-red-600 hover:text-red-800"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Retry Analysis</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Analysis Error</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <>
                <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Analysis Results</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(result.severity)}`}>
                      {result.severity} Severity
                    </span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2">
                        {result.disease === 'Healthy' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                        )}
                        <p className="text-sm text-gray-600">Diagnosis</p>
                      </div>
                      <p className="font-medium mt-1">{result.disease}</p>
                      <p className="text-sm text-gray-500 mt-1">Confidence: {result.confidence}%</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Description</p>
                      <p className="text-gray-800">{result.description}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Treatment Recommendations</p>
                      <p className="text-gray-800">{result.treatment}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Preventive Measures</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {result.preventiveMeasures.map((measure, index) => (
                          <li key={index} className="text-gray-800">{measure}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <DiseaseVideos diseaseName={result.disease} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}