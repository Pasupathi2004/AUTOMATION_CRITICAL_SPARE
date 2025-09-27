import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Users, AlertTriangle, Plus, Search } from 'lucide-react';
import { Analytics } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_ENDPOINTS } from '../config/api';

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
      const response = await fetch(API_ENDPOINTS.ANALYTICS.DASHBOARD, {
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
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#2E8B57] border-t-transparent absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Search Items',
      description: 'Find inventory items quickly',
      icon: Search,
      action: () => onPageChange('search'),
      gradient: 'from-blue-600 to-slate-700',
      bgGradient: 'from-blue-50 to-slate-100',
      roles: ['admin', 'user']
    },
    {
      title: 'Add New Item',
      description: 'Add items to inventory',
      icon: Plus,
      action: () => onPageChange('add-item'),
      gradient: 'from-green-600 to-emerald-700',
      bgGradient: 'from-green-50 to-emerald-100',
      roles: ['admin']
    },
    {
      title: 'View Spares',
      description: 'Browse all spare parts',
      icon: Package,
      action: () => onPageChange('spares-list'),
      gradient: 'from-slate-600 to-gray-700',
      bgGradient: 'from-slate-50 to-gray-100',
      roles: ['admin', 'user']
    },
    {
      title: 'Analytics',
      description: 'View detailed reports',
      icon: TrendingUp,
      action: () => onPageChange('analytics'),
      gradient: 'from-orange-600 to-red-600',
      bgGradient: 'from-orange-50 to-red-100',
      roles: ['admin']
    }
  ].filter(action => action.roles.includes(user?.role || 'user'));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-blue-900 to-slate-700 rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-8 sm:px-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent mb-2">
                Dashboard
              </h1>
              <p className="text-blue-100 text-lg sm:text-xl">Welcome back, {user?.username}! 👋</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-white text-sm font-medium">
                {isConnected ? 'Live Updates' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-slate-600/10"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{analytics?.totalItems || 0}</div>
                <div className="text-sm text-gray-600">Items</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Total Inventory</h3>
            <p className="text-sm text-gray-600">Complete item count</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-red-600/10"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{analytics?.lowStockItems || 0}</div>
                <div className="text-sm text-gray-600">Alerts</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Low Stock</h3>
            <p className="text-sm text-gray-600">Items need attention</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-emerald-600/10"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{analytics?.totalTransactions || 0}</div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Transactions</h3>
            <p className="text-sm text-gray-600">Monthly activity</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 to-gray-600/10"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{analytics?.activeUsers || 0}</div>
                <div className="text-sm text-gray-600">Users</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Active Users</h3>
            <p className="text-sm text-gray-600">This month</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Quick Actions</h2>
            <p className="text-gray-600">Access your most used features</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="group relative overflow-hidden bg-gradient-to-br p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-left"
                style={{
                  background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                  '--tw-gradient-from': action.bgGradient.split(' ')[0].replace('from-', ''),
                  '--tw-gradient-to': action.bgGradient.split(' ')[2].replace('-100', ''),
                } as React.CSSProperties}
              >
                <div className="relative">
                  <div className={`w-12 h-12 bg-gradient-to-r ${action.gradient} rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="text-white" size={24} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {analytics?.recentTransactions && analytics.recentTransactions.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Activity</h2>
              <p className="text-gray-600">Latest inventory transactions</p>
            </div>
          </div>
          <div className="space-y-4">
            {analytics.recentTransactions.slice(0, 5).map((transaction, index) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50/50 to-blue-50/50 rounded-xl hover:from-blue-50/50 hover:to-slate-50/50 transition-all duration-200 group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                    transaction.type === 'added' ? 'bg-gradient-to-r from-green-600 to-emerald-700' :
                    transaction.type === 'taken' ? 'bg-gradient-to-r from-orange-600 to-red-600' : 
                    'bg-gradient-to-r from-slate-600 to-gray-700'
                  }`}>
                    <span className="text-white font-bold text-sm">
                      {transaction.type === 'added' ? '+' : transaction.type === 'taken' ? '-' : '↻'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-base">{transaction.itemName}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.type} {transaction.quantity} units by {transaction.user}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  {new Date(transaction.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
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
