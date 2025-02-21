import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Leaf, Activity, Users } from 'lucide-react';
import type { DashboardStats } from '../types';

const mockData = [
  { name: 'Jan', scans: 65 },
  { name: 'Feb', scans: 85 },
  { name: 'Mar', scans: 120 },
  { name: 'Apr', scans: 90 },
];

const stats: DashboardStats = {
  totalScans: 1234,
  successRate: 98.5,
  activePlants: 526,
  detectedDiseases: 45,
};

const StatCard = ({ title, value, icon: Icon }: { title: string; value: number | string; icon: React.ElementType }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-green-50 rounded-lg">
        <Icon className="w-6 h-6 text-green-600" />
      </div>
      <div>
        <h3 className="text-sm text-gray-600">{title}</h3>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Scans" value={stats.totalScans} icon={Leaf} />
        <StatCard title="Success Rate" value={`${stats.successRate}%`} icon={Activity} />
        <StatCard title="Active Users" value={stats.activePlants} icon={Users} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Activity</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="scans" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}