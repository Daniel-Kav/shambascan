import { useState } from 'react';

import { Home, Leaf, History, BookOpen, HelpCircle, Menu, LogIn } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner'
import { Auth } from './components/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ScanHistory } from './components/ScanHistory';

function AppContent() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user) {
    return <Auth />;
  }

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'scanner', name: 'Disease & Quality', icon: Leaf },
    { id: 'history', name: 'Analysis History', icon: History },
    { id: 'guide', name: 'Guide & Help', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white w-64 fixed h-full shadow-lg transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-64'}`}>
        <div className="p-4 ">
          <div className="flex items-center gap-2 mb-20 ">
            <Leaf className="h-8 w-8 text-green-600" />
            <span className="text-xl font-semibold text-gray-900">ShambaScan</span>
          </div>
          
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 pb-10 text-sm font-medium rounded-lg transition-colors
                    ${activeTab === item.id
                      ? 'bg-green-50 text-green-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Need help with plant care?</p>
              <button className="flex items-center text-green-600 text-sm font-medium">
                <HelpCircle className="w-4 h-4 mr-2" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Hero Section */}
              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2064&q=80"
                  alt="Agriculture background"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-center p-8">
                  <h1 className="text-4xl font-bold text-white mb-4">
                    Smart Agriculture Solutions
                  </h1>
                  <p className="text-xl text-gray-200 mb-8">
                    Revolutionizing farming with AI-powered plant disease detection and monitoring
                  </p>
                  <div className="flex gap-4 mb-8">
                    <span className="px-4 py-2 bg-green-600 text-white rounded-full">AI-Powered</span>
                    <span className="px-4 py-2 bg-green-600 text-white rounded-full">Real-Time Analysis</span>
                    <span className="px-4 py-2 bg-green-600 text-white rounded-full">User-Friendly</span>
                    <span className="px-4 py-2 bg-green-600 text-white rounded-full">Multi-Crop Support</span>
                    <span className="px-4 py-2 bg-green-600 text-white rounded-full">YouTube API</span>
                  </div>
                  <div className="flex gap-4">
                    <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Get Started
                    </button>
                    <button className="px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors">
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
              <Dashboard />
            </div>
          )}
          {activeTab === 'scanner' && <Scanner user={user} />}
          {activeTab === 'history' && <ScanHistory user={user} />}
          {activeTab === 'guide' && <div className="p-6">Guide & Help coming soon</div>}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};