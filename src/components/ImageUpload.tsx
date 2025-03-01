import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2 } from 'lucide-react';
import { DiseaseResults } from './DiseaseResults';
import { supabase } from '../lib/supabase';

interface UploadedImage {
  url: string;
  file: File;
}

export function ImageUpload() {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedImage({
      url: URL.createObjectURL(file),
      file
    });
    setDetectionResult(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1,
    multiple: false
  });

  const analyzeImage = async () => {
    if (!uploadedImage) return;

    try {
      setIsAnalyzing(true);
      setError(null);

      // Upload image to Supabase Storage
      const fileName = `${Date.now()}-${uploadedImage.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('plant-images')
        .upload(fileName, uploadedImage.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('plant-images')
        .getPublicUrl(fileName);

      // Simulate disease detection API call (replace with your actual API)
      // This is a mock result - replace with your actual disease detection logic
      const mockResult = {
        name: "Tomato Late Blight",
        confidence: 95.6,
        description: "Late blight is a devastating disease that affects tomato plants, causing dark brown spots on leaves and stems. The disease can spread rapidly in cool, wet conditions.",
        treatment: [
          "Remove and destroy all infected plant parts",
          "Apply copper-based fungicides",
          "Improve air circulation between plants",
          "Water at the base of plants to keep leaves dry"
        ],
        prevention: [
          "Plant resistant varieties",
          "Maintain proper plant spacing",
          "Avoid overhead irrigation",
          "Practice crop rotation",
          "Keep garden free of plant debris"
        ]
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDetectionResult(mockResult);

      // Save scan record to database
      const { error: dbError } = await supabase
        .from('scans')
        .insert([
          {
            image_url: publicUrl,
            disease_name: mockResult.name,
            confidence: mockResult.confidence,
            user_id: (await supabase.auth.getUser()).data.user?.id
          }
        ]);

      if (dbError) throw dbError;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      console.error('Error analyzing image:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setUploadedImage(null);
    setDetectionResult(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-500'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">
            {isDragActive
              ? 'Drop the image here'
              : 'Drag & drop an image here, or click to select'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: JPEG, JPG, PNG
          </p>
        </div>
      </div>

      {uploadedImage && (
        <div className="mb-8">
          <div className="relative">
            <img
              src={uploadedImage.url}
              alt="Uploaded plant"
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              onClick={resetUpload}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 text-white
                ${isAnalyzing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'}`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Image'
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {detectionResult && (
        <DiseaseResults disease={detectionResult} />
      )}
    </div>
  );
} 