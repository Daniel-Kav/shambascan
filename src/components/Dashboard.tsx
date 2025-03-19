import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Leaf, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Scanner } from './Scanner';
import { DetectedDiseases } from './DetectedDiseases';
import type { DashboardStats } from '../types/index';

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
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    successRate: 0,
    activePlants: 0,
    detectedDiseases: 0
  });
  const [scanActivity, setScanActivity] = useState<{ name: string; scans: number }[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    async function fetchDashboardData() {
      try {
        // Fetch total scans
        const { count: totalScans } = await supabase
          .from('scans')
          .select('*', { count: 'exact', head: true });

        // Fetch successful scans (with disease detection)
        const { count: successfulScans } = await supabase
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .not('disease_name', 'is', null);

        // Fetch unique diseases detected
        const { data: diseaseData } = await supabase
          .from('scans')
          .select('disease_name')
          .not('disease_name', 'is', null);

        const uniqueDiseases = new Set(diseaseData?.map(scan => scan.disease_name) || []).size;

        // Fetch active users (users with scans in last 30 days)
        const { count: activeUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalScans: totalScans || 0,
          successRate: totalScans ? ((successfulScans || 0) / totalScans) * 100 : 0,
          activePlants: activeUsers || 0,
          detectedDiseases: uniqueDiseases || 0
        });

        // Fetch scan activity for the chart
        const { data: activityData } = await supabase
          .from('scans')
          .select('created_at')
          .order('created_at', { ascending: true });

        // Process activity data for the chart
        const processedActivity = processActivityData(activityData || []);
        setScanActivity(processedActivity);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    }

    fetchDashboardData();
  }, []);

  function processActivityData(data: { created_at: string }[]): { name: string; scans: number }[] {
    const monthlyData = data.reduce((acc: { [key: string]: number }, scan) => {
      const month = new Date(scan.created_at).toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([name, scans]) => ({
      name,
      scans
    }));
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen w-full max-w-[1920px] mx-auto">
      {/* Analytics Section */}
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Scans" value={stats.totalScans} icon={Activity} />
          <StatCard title="Success Rate" value={`${stats.successRate.toFixed(1)}%`} icon={Activity} />
          <StatCard title="Active Plants" value={stats.activePlants} icon={Leaf} />
          <StatCard title="Detected Diseases" value={stats.detectedDiseases} icon={Users} />
        </div>

        {/* Activity Chart and Diseases Grid */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> */}
          {/* Activity Chart */}
          {/* <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Scan Activity</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scanActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="scans" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div> */}

          {/* Detected Diseases */}
          {/* <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Detected Diseases</h2>
            <DetectedDiseases />
          </div> */}
        {/* </div> */}
      </div>

      {/* Scanner Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-6">Upload Image</h2>
        <Scanner user={user} />
      </div>
    </div>
  );
}