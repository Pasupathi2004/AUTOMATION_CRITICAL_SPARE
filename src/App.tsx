import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SearchPage from './components/SearchPage';
import AddItem from './components/AddItem';
import SparesList from './components/SparesList';
import Analytics from './components/Analytics';
import UserManagement from './components/UserManagement';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E8B57]"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
      case 'search':
        return <SearchPage />;
      case 'add-item':
        return <AddItem />;
      case 'spares-list':
        return <SparesList />;
      case 'analytics':
        return <Analytics />;
      case 'users':
        return <UserManagement />;
      default:
        return <Dashboard onPageChange={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <SocketProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SocketProvider>
  );
}

export default App;