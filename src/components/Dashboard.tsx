import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Users, AlertTriangle, Plus, Search, IndianRupee } from 'lucide-react';
import { Analytics, InventoryItem } from '../types';
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
  const [showMaxLevelModal, setShowMaxLevelModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  const formatINR = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E8B57]"></div>
      </div>
    );
  }

  const maxLevelItems: InventoryItem[] = analytics?.maxLevelItems || [];
  const lowStockItems: InventoryItem[] = analytics?.lowStockAlerts || [];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 text-sm sm:text-base">Welcome back, {user?.username}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <div
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer"
          onClick={() => lowStockItems.length > 0 && setShowLowStockModal(true)}
        >
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

        <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer" onClick={() => maxLevelItems.length > 0 && setShowMaxLevelModal(true)}>
          <div className="flex items-center">
            <div className="bg-orange-100 rounded-lg p-3">
              <TrendingUp className="text-orange-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Max Level Reached</p>
              <p className="text-2xl font-bold text-gray-900">{maxLevelItems.length}</p>
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-lg p-3">
              <IndianRupee className="text-red-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Total Value</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatINR(analytics?.totalValueCritical || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <IndianRupee className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Consumable Total Value</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatINR(analytics?.totalValueConsumable || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                <h3 className="font-medium text-gray-900 mb-1 text-base sm:text-lg">{action.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Max Level Items Modal */}
      {showMaxLevelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Max Level Reached Items ({maxLevelItems.length})
              </h2>
              <button
                onClick={() => setShowMaxLevelModal(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {maxLevelItems.length === 0 ? (
                <p className="text-sm text-gray-600">No items have reached their maximum quantity.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700">Item</th>
                        <th className="text-left py-2 pr-2 font-semibold text-gray-700">Category</th>
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700">Specification</th>
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700">Location</th>
                        <th className="text-right py-2 pr-2 font-semibold text-gray-700">Qty</th>
                        <th className="text-right py-2 pr-2 font-semibold text-gray-700">Max Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maxLevelItems.map((item) => (
                        <tr key={item.id || (item as any)._id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-600">
                              {item.make} {item.model}
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${(item.category || 'consumable').toLowerCase() === 'critical' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                              {(item.category || 'consumable').charAt(0).toUpperCase() + (item.category || 'consumable').slice(1)}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-gray-700">
                            <div className="max-w-xs truncate" title={item.specification}>
                              {item.specification}
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-gray-700">
                            Row {item.rack}, Col {item.bin}
                          </td>
                          <td className="py-2 pr-2 text-right text-gray-900 font-semibold">
                            {item.quantity}
                          </td>
                          <td className="py-2 pr-2 text-right text-gray-900 font-semibold">
                            {item.maximumQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Items Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Low Stock Items ({lowStockItems.length})
              </h2>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-gray-600">No low stock items.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700">Item</th>
                        <th className="text-left py-2 pr-2 font-semibold text-gray-700">Category</th>
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700">Specification</th>
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700">Location</th>
                        <th className="text-right py-2 pr-2 font-semibold text-gray-700">Qty</th>
                        <th className="text-right py-2 pr-2 font-semibold text-gray-700">Min Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item) => (
                        <tr key={item.id || (item as any)._id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-600">
                              {item.make} {item.model}
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${(item.category || 'consumable').toLowerCase() === 'critical' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                              {(item.category || 'consumable').charAt(0).toUpperCase() + (item.category || 'consumable').slice(1)}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-gray-700">
                            <div className="max-w-xs truncate" title={item.specification}>
                              {item.specification}
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-gray-700">
                            Row {item.rack}, Col {item.bin}
                          </td>
                          <td className="py-2 pr-2 text-right text-gray-900 font-semibold">
                            {item.quantity}
                          </td>
                          <td className="py-2 pr-2 text-right text-gray-900 font-semibold">
                            {item.minimumQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
