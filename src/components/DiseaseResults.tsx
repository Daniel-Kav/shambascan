import React from 'react';
import { DiseaseVideos } from './DiseaseVideos';

interface Disease {
  name: string;
  confidence: number;
  description: string;
  treatment: string[];
  prevention: string[];
}

interface DiseaseResultsProps {
  disease: Disease;
}

export function DiseaseResults({ disease }: DiseaseResultsProps) {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{disease.name}</h1>
        
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg font-medium">Confidence:</div>
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 rounded-full h-4"
                style={{ width: `${disease.confidence}%` }}
              />
            </div>
            <div className="text-lg font-medium">{disease.confidence}%</div>
          </div>
        </div>

        <div className="prose max-w-none">
          <h2 className="text-xl font-semibold mb-2">Description</h2>
          <p className="text-gray-700 mb-6">{disease.description}</p>

          <h2 className="text-xl font-semibold mb-2">Treatment</h2>
          <ul className="list-disc pl-6 mb-6">
            {disease.treatment.map((item, index) => (
              <li key={index} className="text-gray-700">{item}</li>
            ))}
          </ul>

          <h2 className="text-xl font-semibold mb-2">Prevention</h2>
          <ul className="list-disc pl-6 mb-6">
            {disease.prevention.map((item, index) => (
              <li key={index} className="text-gray-700">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* YouTube video recommendations */}
      <DiseaseVideos diseaseName={disease.name} />
    </div>
  );
} 