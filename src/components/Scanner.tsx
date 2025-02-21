import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';

export function Scanner() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
        setIsAnalyzing(true);
        // Simulate analysis
        setTimeout(() => setIsAnalyzing(false), 2000);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    multiple: false
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Disease Scanner</h2>
      
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
            <div className="relative">
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
          </div>
        )}
      </div>
    </div>
  );
}