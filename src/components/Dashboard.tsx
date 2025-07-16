import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Users, AlertTriangle, Plus, Search } from 'lucide-react';
import { Analytics } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const { user, token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for transaction updates to refresh analytics
    socket.on('transactionCreated', (newTransaction: any) => {
      console.log('🔌 Received transactionCreated event in Dashboard:', newTransaction);
      // Refresh analytics when new transaction is created
      fetchAnalytics();
    });

    socket.on('transactionsCleared', (data: { message: string }) => {
      console.log('🔌 Received transactionsCleared event in Dashboard:', data);
      // Refresh analytics when transactions are cleared
      fetchAnalytics();
    });

    return () => {
      socket.off('transactionCreated');
      socket.off('transactionsCleared');
    };
  }, [socket, isConnected]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E8B57]"></div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Search Items',
      description: 'Find inventory items quickly',
      icon: Search,
      action: () => onPageChange('search'),
      color: 'bg-blue-500',
      roles: ['admin', 'user']
    },
    {
      title: 'Add New Item',
      description: 'Add items to inventory',
      icon: Plus,
      action: () => onPageChange('add-item'),
      color: 'bg-green-600',
      roles: ['admin']
    },
    {
      title: 'View Spares',
      description: 'Browse all spare parts',
      icon: Package,
      action: () => onPageChange('spares-list'),
      color: 'bg-purple-600',
      roles: ['admin', 'user']
    },
    {
      title: 'Analytics',
      description: 'View detailed reports',
      icon: TrendingUp,
      action: () => onPageChange('analytics'),
      color: 'bg-orange-600',
      roles: ['admin']
    }
  ].filter(action => action.roles.includes(user?.role || 'user'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.username}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <Package className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.totalItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-lg p-3">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.lowStockItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-lg p-3">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.totalTransactions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-lg p-3">
              <Users className="text-purple-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.activeUsers || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
              >
                <div className={`${action.color} rounded-lg p-2 w-fit mb-3`}>
                  <Icon className="text-white" size={20} />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {analytics?.recentTransactions && analytics.recentTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {analytics.recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{transaction.itemName}</p>
                  <p className="text-sm text-gray-600">
                    {transaction.type} {transaction.quantity} units by {transaction.user}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(transaction.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
