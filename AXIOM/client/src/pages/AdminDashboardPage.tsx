import React from 'react';
import { KYCComprehensiveAdminDashboard } from '../components/kyc/KYCComprehensiveAdminDashboard';
import AdminLoginForm from '../components/AdminLoginForm';
import { useAuth } from '../hooks/useAuth';

const AdminDashboardPage: React.FC = () => {
  const { user, loading, error, login, logout, isAdmin, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated()) {
    return <AdminLoginForm onLogin={login} loading={loading} error={error} />;
  }

  // Show access denied if authenticated but not admin
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the admin dashboard.
            <br />
            Admin privileges are required.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Current Role: <span className="font-medium">{user?.role}</span>
            </p>
            <button
              onClick={logout}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              🔓 Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show admin dashboard if authenticated and authorized
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto p-4">
        {/* Admin Header with User Info */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-blue-800 mb-2">
                🏛️ SWF Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Comprehensive platform administration and KYC management
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Logged in as: <span className="font-medium">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Role: <span className="font-medium text-green-600">{user?.role}</span>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🔓 Logout
              </button>
            </div>
          </div>
        </div>
        
        <KYCComprehensiveAdminDashboard />
      </div>
    </div>
  );
};

export default AdminDashboardPage;
