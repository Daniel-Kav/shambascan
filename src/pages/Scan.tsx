import React from 'react';
import { ImageUpload } from '../components/ImageUpload';

export function ScanPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Plant Disease Detection
          </h1>
          <p className="text-gray-600">
            Upload a photo of your plant to identify diseases and get treatment recommendations
          </p>
        </div>

        <ImageUpload />
      </div>
    </div>
  );
} 