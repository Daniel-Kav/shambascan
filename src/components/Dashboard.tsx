import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Leaf, Activity, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { DashboardStats } from '../types';

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
  const [scanActivity, setScanActivity] = useState([]);

  useEffect(() => {
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
        const { count: uniqueDiseases } = await supabase
          .from('diseases')
          .select('*', { count: 'exact', head: true });

        // Fetch active users (users with scans in last 30 days)
        const { count: activeUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalScans: totalScans || 0,
          successRate: totalScans ? (successfulScans / totalScans) * 100 : 0,
          activePlants: activeUsers || 0,
          detectedDiseases: uniqueDiseases || 0
        });

        // Fetch scan activity for the chart
        const { data: activityData } = await supabase
          .from('scans')
          .select('created_at')
          .order('created_at', { ascending: true });

        // Process activity data for the chart
        const processedActivity = processActivityData(activityData);
        setScanActivity(processedActivity);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    }

    fetchDashboardData();
  }, []);

  function processActivityData(data) {
    // Group scans by month
    const monthlyData = data.reduce((acc, scan) => {
      const month = new Date(scan.created_at).toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Convert to chart format
    return Object.entries(monthlyData).map(([name, scans]) => ({
      name,
      scans
    }));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Scans" value={stats.totalScans} icon={Leaf} />
        <StatCard title="Success Rate" value={`${stats.successRate.toFixed(1)}%`} icon={Activity} />
        <StatCard title="Active Users" value={stats.activePlants} icon={Users} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Activity</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scanActivity}>
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