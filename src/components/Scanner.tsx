import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { analyzePlantImage, PlantAnalysis } from '../lib/gemini';
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '../utils/cloudinary';
import { insertScanData } from '../utils/supabaseClient';
import { supabase } from '../lib/supabase';

interface ScannerProps {
  user: any;
}

export function Scanner({ user }: ScannerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PlantAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .limit(1);
        
        if (error) {
          console.error('Supabase connection error:', error);
        } else {
          console.log('Supabase connection successful:', data);
        }
      } catch (err) {
        console.error('Error testing Supabase connection:', err);
      }
    };

    testConnection();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Please sign in to use the scanner');
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      try {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        setPreview(URL.createObjectURL(file));

        // Convert image to base64
        const reader = new FileReader();
        const startTime = Date.now();
        reader.onload = async () => {
          const base64String = reader.result as string;
          
          try {
            // Analyze image with Gemini
            const analysis = await analyzePlantImage(base64String.split(',')[1]);

            console.log(`analysis ${analysis}`)
            
            try {
              // Upload image to Cloudinary
              const imageUrl = await uploadToCloudinary(file);

              // Save scan result to database using our helper function
              const { error: scanError } = await insertScanData({
                user_id: user.id,
                image_url: imageUrl,
                scan_name: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
                scan_time: (Date.now() - startTime) / 1000, // Convert to seconds
                quality_score: analysis.confidence, // Using confidence as quality score for now
                disease_name: analysis.disease,
                confidence_score: analysis.confidence,
                severity: analysis.severity,
                description: analysis.description,
                treatment_recommendation: analysis.treatment,
                preventive_measures: analysis.preventiveMeasures.join('. '),
              });

              if (scanError) {
                console.error('Database error:', scanError);
                // Continue with analysis even if database save fails
                setResult(analysis);
                toast.success('Analysis complete! (Save to database failed)');
                return;
              }

              setResult(analysis);
              toast.success('Analysis complete!');
            } catch (uploadError) {
              console.error('Upload/Database error:', uploadError);
              // Still show the analysis even if upload/database operations fail
              setResult(analysis);
              toast.success('Analysis complete! (Upload/Database operations failed)');
            }
          } catch (analysisError) {
            const errorMessage = analysisError instanceof Error ? analysisError.message : 'Failed to analyze image';
            setError(errorMessage);
            toast.error(errorMessage);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsAnalyzing(false);
      }
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

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Please sign in to use the scanner</p>
      </div>
    );
  }

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
                  <div className="text-white text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Analyzing image...</p>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}