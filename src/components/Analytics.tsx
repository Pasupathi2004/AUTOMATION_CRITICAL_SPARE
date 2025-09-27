import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { TrendingUp, Package, Users, Activity, Calendar, User, FileSpreadsheet, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BarChart3, X } from 'lucide-react';
import { Analytics as AnalyticsType } from '../types';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import * as XLSX from 'xlsx';
import { API_ENDPOINTS } from '../config/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const safeFormatDate = (dateValue: any) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return 'N/A';
  // Use toLocaleString for IST
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const Analytics: React.FC = () => {
  const { token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [storageMB, setStorageMB] = useState<number | null>(null);
  const [integrity, setIntegrity] = useState<any>(null);
  const [storage, setStorage] = useState<any>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  const [activeUserNames, setActiveUserNames] = useState<string[]>([]);
  const [editTx, setEditTx] = useState<any | null>(null);
  const isOwner = (useAuth().user?.username || '').toLowerCase() === 'pasu' || (useAuth().user?.role || '').toLowerCase() === 'owner';

  useEffect(() => {
    fetchAnalytics();
    fetchStorageMB();
    checkDataIntegrity();
    checkStorage();
    
    // Check if we need to reset monthly data
    checkMonthlyReset();
  }, []);

  // Refetch analytics when month/year changes
  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth, selectedYear]);

  const checkMonthlyReset = () => {
    const now = new Date();
    const lastReset = localStorage.getItem('lastMonthlyReset');
    
    if (lastReset) {
      const lastResetDate = new Date(lastReset);
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastResetMonth = lastResetDate.getMonth();
      const lastResetYear = lastResetDate.getFullYear();
      
      // If we're in a new month, reset the data
      if (currentMonth !== lastResetMonth || currentYear !== lastResetYear) {
        localStorage.setItem('lastMonthlyReset', now.toISOString());
        setSuccessMessage('New month detected! Analytics have been reset for the current month.');
        setTimeout(() => setSuccessMessage(null), 5000);
        fetchAnalytics(); // Refresh analytics for new month
      }
    } else {
      // First time, set the reset date
      localStorage.setItem('lastMonthlyReset', now.toISOString());
    }
  };

  // Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for transaction updates
    socket.on('transactionCreated', (newTransaction: any) => {
      console.log('🔌 Received transactionCreated event:', newTransaction);
      // Refresh analytics when new transaction is created
      fetchAnalytics();
    });

    socket.on('transactionsCleared', (data: { message: string }) => {
      console.log('🔌 Received transactionsCleared event:', data);
      // Refresh analytics when transactions are cleared
      fetchAnalytics();
      setSuccessMessage('Transaction history cleared in real-time!');
      setTimeout(() => setSuccessMessage(null), 3000);
    });

    return () => {
      socket.off('transactionCreated');
      socket.off('transactionsCleared');
    };
  }, [socket, isConnected]);

  const fetchAnalytics = async () => {
    try {
      const url = `${API_ENDPOINTS.ANALYTICS.DASHBOARD}?month=${selectedMonth}&year=${selectedYear}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
        // Extract unique user names from transactions
        if (data.analytics.recentTransactions) {
          const uniqueUsers = [...new Set(data.analytics.recentTransactions.map((t: any) => t.user).filter(Boolean))] as string[];
          setActiveUserNames(uniqueUsers);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTransactionEdit = async () => {
    if (!editTx) return;
    try {
      const response = await fetch(API_ENDPOINTS.TRANSACTION_UPDATE(editTx.id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: editTx.timestamp,
          remarks: editTx.remarks,
          quantity: editTx.quantity
        })
      });
      const data = await response.json();
      if (data.success) {
        setEditTx(null);
        setSuccessMessage('Transaction updated');
        setTimeout(() => setSuccessMessage(null), 2000);
        fetchAnalytics();
      } else {
        setSuccessMessage(data.message || 'Failed to update transaction');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (e) {
      setSuccessMessage('Network error');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };


  const fetchStorageMB = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ANALYTICS.SETTINGS.STORAGE, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) setStorageMB(data.storageMB);
    } catch (error) {
      setStorageMB(null);
    }
  };

  const handleDeleteHistory = async () => {
    if (!window.confirm('Are you sure you want to delete all transaction history? This cannot be undone.')) return;
    try {
      const response = await fetch(API_ENDPOINTS.TRANSACTIONS, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('All transaction history deleted!');
        fetchAnalytics();
      } else {
        setSuccessMessage(data.message || 'Failed to delete history.');
      }
    } catch (error) {
      setSuccessMessage('Network error while deleting history.');
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(Number(e.target.value));
  };


  const generateComprehensiveExcelReport = async () => {
    if (!analytics) {
      setSuccessMessage('No analytics data available. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      const currentYear = new Date().getFullYear();

      // Summary Sheet
      const summaryData = [
        ['Inventory Management System - Comprehensive Report'],
        ['Generated At:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        [''],
        ['Metric', 'Value'],
        ['Total Items', (analytics.totalItems || 0).toString()],
        ['Low Stock Items', (analytics.lowStockItems || 0).toString()],
        ['Total Transactions', (analytics.totalTransactions || 0).toString()],
        ['Items Consumed', (analytics.itemsConsumed || 0).toString()],
        ['Items Added', (analytics.itemsAdded || 0).toString()],
        ['Active Users', (analytics.activeUsers || 0).toString()]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Generate monthly sheets for the current year and previous/next year
      const yearsToProcess = [currentYear - 1, currentYear, currentYear + 1];
      
      for (const year of yearsToProcess) {
        for (let month = 0; month < 12; month++) {
          const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
          const monthTransactions = analytics.recentTransactions.filter(t => {
            const d = new Date(t.timestamp);
            return d.getMonth() === month && d.getFullYear() === year;
          });

          if (monthTransactions.length > 0) {
            // Monthly Summary Sheet
            const monthlySummaryData = [
              [`${monthName} ${year} - Monthly Summary`],
              ['Generated At:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
              [''],
              ['Metric', 'Value'],
              ['Total Transactions', monthTransactions.length.toString()],
              ['Items Added', monthTransactions.filter(t => t.type === 'added').reduce((sum, t) => sum + (t.quantity || 0), 0).toString()],
              ['Items Taken', monthTransactions.filter(t => t.type === 'taken').reduce((sum, t) => sum + (t.quantity || 0), 0).toString()],
              ['Items Updated', monthTransactions.filter(t => t.type === 'deleted').reduce((sum, t) => sum + (t.quantity || 0), 0).toString()],
              ['Active Users', [...new Set(monthTransactions.map(t => t.user).filter(Boolean))].length.toString()],
              [''],
              ['User Activity Breakdown:'],
              ['User', 'Transactions', 'Items Added', 'Items Taken', 'Items Updated']
            ];

            // Add user activity breakdown
            const userActivity = new Map();
            monthTransactions.forEach(transaction => {
              if (!userActivity.has(transaction.user)) {
                userActivity.set(transaction.user, { total: 0, added: 0, taken: 0, updated: 0 });
              }
              const user = userActivity.get(transaction.user);
              user.total++;
              if (transaction.type === 'added') user.added += transaction.quantity || 0;
              else if (transaction.type === 'taken') user.taken += transaction.quantity || 0;
              else if (transaction.type === 'deleted') user.updated += transaction.quantity || 0;
            });

            userActivity.forEach((activity, user) => {
              monthlySummaryData.push([
                user,
                activity.total.toString(),
                activity.added.toString(),
                activity.taken.toString(),
                activity.updated.toString()
              ]);
            });

            const monthlySummarySheet = XLSX.utils.aoa_to_sheet(monthlySummaryData);
            XLSX.utils.book_append_sheet(workbook, monthlySummarySheet, `${monthName} ${year} Summary`);

            // Monthly Transactions Detail Sheet
            const monthlyData = [
              [`${monthName} ${year} - Transaction Details`],
              ['Generated At:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
              [''],
              ['Item Name', 'Specification', 'Make', 'Model', 'Transaction Type', 'Quantity Changed', 'User', 'Date & Time', 'Action', 'Remarks']
            ];

            monthTransactions.forEach(transaction => {
              if (transaction) {
                const action = transaction.type === 'added' ? 'Stock Added' : 
                              transaction.type === 'taken' ? 'Stock Taken' : 'Stock Deleted';
                monthlyData.push([
                  transaction.itemName || '',
                  transaction.specification || '',
                  transaction.make || '',
                  transaction.model || '',
                  (transaction.type || '').toUpperCase(),
                  (transaction.quantity || 0).toString(),
                  transaction.user || '',
                  transaction.timestamp ? new Date(transaction.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
                  action,
                  transaction.remarks || ''
                ]);
              }
            });

            const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
            XLSX.utils.book_append_sheet(workbook, monthlySheet, `${monthName} ${year} Details`);
          }
        }
      }

      // Low Stock Alerts Sheet
      if (analytics.lowStockAlerts && analytics.lowStockAlerts.length > 0) {
        const lowStockData = [
          ['Item ID', 'Item Name', 'Make', 'Model', 'Specification', 'Current Quantity', 'Location', 'Last Updated', 'Updated By', 'Status']
        ];

        analytics.lowStockAlerts.forEach(item => {
          if (item && item.id) {
            const status = item.quantity === 0 ? 'Out of Stock' : 'Low Stock';
            lowStockData.push([
              item.id.toString() || '',
              item.name || '',
              item.make || '',
              item.model || '',
              item.specification || '',
              (item.quantity || 0).toString(),
              `Row ${item.rack || ''} - Column ${item.bin || ''}`,
              item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
              item.updatedBy || '',
              status
            ]);
          }
        });

        if (lowStockData.length > 1) {
          const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
          XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock Alerts');
        }
      }

      // Export the workbook
      XLSX.writeFile(workbook, `inventory_comprehensive_report_${timestamp}.xlsx`);
      
      // Show success message
      setSuccessMessage('Comprehensive Excel report with monthly sheets generated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error generating Excel report:', error);
      setSuccessMessage('Error generating Excel report. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const generateExcelReport = () => {
    if (!analytics) {
      setSuccessMessage('No analytics data available. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');

      // Summary Sheet
      const summaryData = [
        ['Inventory Management System - Analytics Report'],
        ['Generated At:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        [''],
        ['Metric', 'Value'],
        ['Total Items', (analytics.totalItems || 0).toString()],
        ['Low Stock Items', (analytics.lowStockItems || 0).toString()],
        ['Total Transactions', (analytics.totalTransactions || 0).toString()],
        ['Items Consumed', (analytics.itemsConsumed || 0).toString()],
        ['Items Added', (analytics.itemsAdded || 0).toString()],
        ['Active Users', (analytics.activeUsers || 0).toString()]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Recent Transactions Sheet (with item details, no Transaction ID)
      if (analytics.recentTransactions && analytics.recentTransactions.length > 0) {
        const transactionsData = [
          ['Item Name', 'Specification', 'Make', 'Model', 'Transaction Type', 'Quantity Changed', 'User', 'Date & Time', 'Action', 'Remarks']
        ];

        analytics.recentTransactions.forEach(transaction => {
          if (transaction) {
            const action = transaction.type === 'added' ? 'Stock Added' : 
                          transaction.type === 'taken' ? 'Stock Taken' : 'Stock Deleted';
            transactionsData.push([
              transaction.itemName || '',
              transaction.specification || '',
              transaction.make || '',
              transaction.model || '',
              (transaction.type || '').toUpperCase(),
              (transaction.quantity || 0).toString(),
              transaction.user || '',
              transaction.timestamp ? new Date(transaction.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
              action,
              transaction.remarks || ''
            ]);
          }
        });

        if (transactionsData.length > 1) { // Only add sheet if there's data
          const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);
          XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Recent Transactions');
        }
      }

      // Low Stock Alerts Sheet
      if (analytics.lowStockAlerts && analytics.lowStockAlerts.length > 0) {
        const lowStockData = [
          ['Item ID', 'Item Name', 'Make', 'Model', 'Specification', 'Current Quantity', 'Location', 'Last Updated', 'Updated By', 'Status']
        ];

        analytics.lowStockAlerts.forEach(item => {
          if (item && item.id) {
            const status = item.quantity === 0 ? 'Out of Stock' : 'Low Stock';
            lowStockData.push([
              item.id.toString() || '',
              item.name || '',
              item.make || '',
              item.model || '',
              item.specification || '',
              (item.quantity || 0).toString(),
              `Row ${item.rack || ''} - Column ${item.bin || ''}`,
              item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
              item.updatedBy || '',
              status
            ]);
          }
        });

        if (lowStockData.length > 1) { // Only add sheet if there's data
          const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
          XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock Alerts');
        }
      }

      // Export the workbook
      XLSX.writeFile(workbook, `inventory_report_${timestamp}.xlsx`);
      
      // Show success message
      setSuccessMessage('Excel report generated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error generating Excel report:', error);
      setSuccessMessage('Error generating Excel report. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Add data integrity check
  const checkDataIntegrity = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ANALYTICS.INTEGRITY, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setIntegrity(data.integrity);
      }
    } catch (error) {
      console.error('Failed to check data integrity:', error);
    }
  };

  // Add storage check
  const checkStorage = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ANALYTICS.SETTINGS.STORAGE, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStorage(data.storageMB);
      }
    } catch (error) {
      console.error('Failed to check storage:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2"></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Month/Year Selector Skeleton */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="ml-4">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  const stockStatusData = {
    labels: ['Out of Stock', 'Low Stock', 'Medium Stock', 'In Stock'],
    datasets: [
      {
        data: [
          analytics?.lowStockAlerts?.filter(item => item.quantity === 0).length || 0,
          analytics?.lowStockAlerts?.filter(item => item.quantity > 0 && item.quantity <= 5).length || 0,
          Math.max(0, (analytics?.totalItems || 0) - (analytics?.lowStockItems || 0) - Math.floor((analytics?.totalItems || 0) * 0.6)),
          Math.floor((analytics?.totalItems || 0) * 0.6)
        ],
        backgroundColor: ['#DC2626', '#EA580C', '#D97706', '#059669'],
        borderWidth: 0,
      },
    ],
  };

  const activityData = {
    labels: ['Items Added', 'Items Consumed'],
    datasets: [
      {
        label: 'Quantity',
        data: [analytics?.itemsAdded || 0, analytics?.itemsConsumed || 0],
        backgroundColor: ['#059669', '#DC2626'],
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E8B57] via-[#3B82F6] to-[#8B5CF6] text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <BarChart3 className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                      Analytics Dashboard
                    </h1>
                    <p className="text-blue-100 text-lg">
                      Comprehensive insights and reporting
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                    <Activity className="w-4 h-4" />
                    <span>{analytics?.totalTransactions || 0} Transactions</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDeleteHistory}
                  className="px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white rounded-xl transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Delete History
                </button>
                <button
                  onClick={() => setShowSettings(s => !s)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/30"
                >
                  Settings
                </button>
                <button
                  onClick={generateExcelReport}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/30"
                >
                  <FileSpreadsheet size={18} />
                  <span>Excel Report</span>
                </button>
                <button
                  onClick={generateComprehensiveExcelReport}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/30"
                >
                  <FileSpreadsheet size={18} />
                  <span>Monthly Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Period Selector */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Select Period</h3>
                <p className="text-gray-600">Choose the time range for your analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Mobile: Month dropdown */}
              <div className="lg:hidden">
                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Select month"
                >
                  {Array.from({ length: 12 }, (_, m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Desktop: Month chips */}
              <div className="hidden lg:flex gap-2 p-2 bg-gray-50 rounded-xl">
                {Array.from({ length: 12 }, (_, m) => {
                  const label = new Date(2000, m).toLocaleString('default', { month: 'short' });
                  const isActive = selectedMonth === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                          : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-md'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              
              {/* Year Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedYear(selectedYear - 1)}
                  className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200"
                  aria-label="Previous year"
                >
                  <ChevronLeft size={20} />
                </button>
                <select
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Select year"
                >
                  {(() => {
                    const current = new Date().getFullYear();
                    const years = [] as number[];
                    for (let y = current - 5; y <= current + 2; y++) years.push(y);
                    return years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ));
                  })()}
                </select>
                <button
                  onClick={() => setSelectedYear(selectedYear + 1)}
                  className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200"
                  aria-label="Next year"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

      {showSettings && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-4">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <div>Storage Used: {storageMB !== null ? `${storageMB} MB` : '...'}</div>
        </div>
      )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Total Items Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-600/10"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{analytics?.totalItems || 0}</div>
                  <div className="text-sm text-gray-600">Items</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Inventory</h3>
              <p className="text-sm text-gray-600">Complete item count in system</p>
              <div className="mt-4 flex items-center text-sm text-blue-600">
                <TrendingUp size={16} className="mr-1" />
                <span>All categories</span>
              </div>
            </div>
          </div>

          {/* Low Stock Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-600/10"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{analytics?.lowStockItems || 0}</div>
                  <div className="text-sm text-gray-600">Items</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Low Stock Alert</h3>
              <p className="text-sm text-gray-600">Items requiring attention</p>
              <div className="mt-4 flex items-center text-sm text-orange-600">
                <Activity size={16} className="mr-1" />
                <span>Needs restocking</span>
              </div>
            </div>
          </div>

          {/* Transactions Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-600/10"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{analytics?.totalTransactions || 0}</div>
                  <div className="text-sm text-gray-600">This Month</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Activity</h3>
              <p className="text-sm text-gray-600">Total transactions recorded</p>
              <div className="mt-4 flex items-center text-sm text-emerald-600">
                <Calendar size={16} className="mr-1" />
                <span>{new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })}</span>
              </div>
            </div>
          </div>

          {/* Active Users Card */}
          <div 
            className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
            onClick={() => setShowActiveUsersModal(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-600/10"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{analytics?.activeUsers || 0}</div>
                  <div className="text-sm text-gray-600">Users</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Users</h3>
              <p className="text-sm text-gray-600">Users with activity this month</p>
              <div className="mt-4 flex items-center text-sm text-purple-600">
                <Users size={16} className="mr-1" />
                <span>Click to view details</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Stock Status Chart */}
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Stock Status Distribution</h3>
                  <p className="text-gray-600">Current inventory levels overview</p>
                </div>
              </div>
              <div className="h-80 flex items-center justify-center">
                <Doughnut data={stockStatusData} options={chartOptions} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Out of Stock</div>
                    <div className="text-xs text-gray-600">{analytics?.lowStockAlerts?.filter(item => item.quantity === 0).length || 0} items</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Low Stock</div>
                    <div className="text-xs text-gray-600">{analytics?.lowStockAlerts?.filter(item => item.quantity > 0 && item.quantity <= 5).length || 0} items</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Activity Chart */}
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-green-50/50"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Monthly Activity</h3>
                  <p className="text-gray-600">Items added vs consumed this month</p>
                </div>
              </div>
              <div className="h-80 flex items-center justify-center">
                <Bar data={activityData} options={chartOptions} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Items Added</div>
                    <div className="text-xs text-gray-600">{analytics?.itemsAdded || 0} units</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Items Consumed</div>
                    <div className="text-xs text-gray-600">{analytics?.itemsConsumed || 0} units</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50"></div>
          <div className="relative">
            <div className="p-8 border-b border-gray-200/50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Recent Transactions</h3>
                    <p className="text-gray-600">
                      {analytics?.totalTransactions || 0} transactions in {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <span>{showAllTransactions ? 'Show Less' : 'Show All'}</span>
                  {showAllTransactions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-200/50">
              {analytics?.recentTransactions && analytics.recentTransactions.length > 0 ? (
                (showAllTransactions ? analytics.recentTransactions : analytics.recentTransactions.slice(0, 5)).map((transaction) => (
                  <div key={transaction.id} className="p-6 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300 group">
                    <div className="flex items-start gap-6">
                      {/* Status Indicator */}
                      <div className="flex-shrink-0">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                          transaction.type === 'added' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
                          transaction.type === 'taken' ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 
                          'bg-gradient-to-br from-orange-500 to-orange-700'
                        }`}>
                          <span className="text-white font-bold text-xl">
                            {transaction.type === 'added' ? '+' : transaction.type === 'taken' ? '-' : '↻'}
                          </span>
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-900 transition-colors">
                                {transaction.itemName}
                              </h4>
                              <span className={`px-4 py-2 text-sm font-semibold rounded-xl shadow-sm ${
                                transaction.type === 'added' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                transaction.type === 'taken' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                                'bg-orange-100 text-orange-800 border border-orange-200'
                              }`}>
                                {transaction.type.toUpperCase()}
                              </span>
                              {isOwner && (
                                <button
                                  onClick={() => setEditTx({
                                    id: transaction.id,
                                    timestamp: transaction.timestamp ? new Date(transaction.timestamp).toISOString().slice(0,16) : '',
                                    remarks: transaction.remarks || '',
                                    quantity: transaction.quantity || 0
                                  })}
                                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                            
                            <div className="text-gray-600 mb-4">
                              <div className="font-semibold text-gray-900">{transaction.make} {transaction.model}</div>
                              <div className="text-gray-500">{transaction.specification}</div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="font-semibold">Qty: {transaction.quantity}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User size={18} className="text-gray-400" />
                                <span>{transaction.user}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-gray-400" />
                                <span>{safeFormatDate(transaction.timestamp)}</span>
                              </div>
                            </div>

                            {transaction.remarks && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-400">
                                <div className="text-sm text-gray-700">
                                  <span className="font-semibold text-gray-900">Remarks:</span> {transaction.remarks}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Activity className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">No Recent Transactions</h3>
                  <p className="text-gray-600 max-w-md mx-auto">Transaction history will appear here as activity occurs in your inventory system.</p>
                </div>
              )}
              {analytics?.recentTransactions && analytics.recentTransactions.length > 5 && !showAllTransactions && (
                <div className="p-8 text-center bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-t border-gray-200/50">
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <ChevronDown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Showing 5 of {analytics.recentTransactions.length} transactions
                      </p>
                      <button 
                        onClick={() => setShowAllTransactions(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
                      >
                        View all {analytics.recentTransactions.length} transactions →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {analytics?.lowStockAlerts && analytics.lowStockAlerts.length > 0 && (
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-orange-50/50"></div>
            <div className="relative">
              <div className="p-8 border-b border-gray-200/50">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Low Stock Alerts</h3>
                      <p className="text-gray-600">
                        {analytics.lowStockAlerts.length} item{analytics.lowStockAlerts.length !== 1 ? 's' : ''} need attention
                      </p>
                    </div>
                  </div>
                  {analytics.lowStockAlerts.length > 5 && (
                    <button
                      onClick={() => setShowAllLowStock(!showAllLowStock)}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <span>{showAllLowStock ? 'Show Less' : 'Show All'}</span>
                      {showAllLowStock ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-200/50">
                {(showAllLowStock ? analytics.lowStockAlerts : analytics.lowStockAlerts.slice(0, 5)).map((item) => (
                  <div key={item.id} className="p-6 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-orange-50/50 transition-all duration-300 group">
                    <div className="flex items-start gap-6">
                      {/* Status Indicator */}
                      <div className="flex-shrink-0">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                          item.quantity === 0 ? 'bg-gradient-to-br from-red-500 to-red-700' :
                          item.quantity <= 2 ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                          'bg-gradient-to-br from-amber-500 to-amber-700'
                        }`}>
                          <span className="text-white font-bold text-xl">
                            {item.quantity === 0 ? '!' : item.quantity <= 2 ? '⚠' : '⚡'}
                          </span>
                        </div>
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <h4 className="text-lg font-bold text-gray-900 group-hover:text-red-900 transition-colors">
                                {item.name}
                              </h4>
                              <span className={`px-4 py-2 text-sm font-semibold rounded-xl shadow-sm ${
                                item.quantity === 0 ? 'bg-red-100 text-red-800 border border-red-200' :
                                item.quantity <= 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {item.quantity === 0 ? 'OUT OF STOCK' : item.quantity <= 2 ? 'CRITICAL' : 'LOW STOCK'}
                              </span>
                            </div>
                            
                            <div className="text-gray-600 mb-4">
                              <div className="font-semibold text-gray-900">{item.make} {item.model}</div>
                              <div className="text-gray-500">{item.specification}</div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="font-semibold">Qty: {item.quantity}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package size={18} className="text-gray-400" />
                                <span>Row {item.rack} - Column {item.bin}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-gray-400" />
                                <span>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </div>

                            {item.updatedBy && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-l-4 border-red-400">
                                <div className="text-sm text-gray-700">
                                  <span className="font-semibold text-gray-900">Last Updated by:</span> {item.updatedBy}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Display */}
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${
                          item.quantity === 0 ? 'text-red-600' :
                          item.quantity <= 2 ? 'text-orange-600' :
                          'text-amber-600'
                        }`}>
                          {item.quantity}
                        </div>
                        <div className="text-sm text-gray-600">remaining</div>
                        <div className={`text-xs font-semibold mt-2 px-3 py-1 rounded-lg ${
                          item.quantity === 0 ? 'bg-red-100 text-red-800' :
                          item.quantity <= 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.quantity === 0 ? 'URGENT' : item.quantity <= 2 ? 'CRITICAL' : 'LOW'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {analytics.lowStockAlerts.length > 5 && !showAllLowStock && (
                  <div className="p-8 text-center bg-gradient-to-r from-red-50/50 to-orange-50/50 border-t border-gray-200/50">
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <ChevronDown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Showing 5 of {analytics.lowStockAlerts.length} low stock items
                        </p>
                        <button 
                          onClick={() => setShowAllLowStock(true)}
                          className="text-sm text-red-600 hover:text-red-800 font-semibold hover:underline transition-colors"
                        >
                          View all {analytics.lowStockAlerts.length} items →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Data Integrity & Storage Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Data Integrity Card */}
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Data Integrity</h3>
                  <p className="text-gray-600">System health and data validation</p>
                </div>
              </div>
              {integrity ? (
                <div className="space-y-4">
                  {Object.entries(integrity).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center p-4 bg-white/50 rounded-xl">
                      <span className="text-sm font-semibold text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center gap-3">
                        {value.valid ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-green-100 text-green-800">
                            ✓ Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-red-100 text-red-800">
                            ✗ Invalid
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-600">
                          {value.count || 0} records
                        </span>
                        {value.hasBackup && (
                          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-100 text-blue-800">
                            Backup
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                  <p className="text-gray-500">Loading integrity data...</p>
                </div>
              )}
            </div>
          </div>

          {/* Storage Usage Card */}
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Storage Usage</h3>
                  <p className="text-gray-600">Database and file storage metrics</p>
                </div>
              </div>
              {storage !== null ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-white/50 rounded-xl">
                    <span className="text-sm font-semibold text-gray-700">Total Storage</span>
                    <span className="text-2xl font-bold text-gray-900">{storage} MB</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Usage</span>
                      <span className="font-semibold text-gray-900">{Math.min((storage / 10) * 100, 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((storage / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      {storage < 1 ? 'Low storage usage' : storage < 5 ? 'Moderate storage usage' : 'High storage usage'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                  <p className="text-gray-500">Loading storage data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Users Modal */}
      {showActiveUsersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Active Users</h3>
                    <p className="text-purple-100 text-sm">This month's activity</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowActiveUsersModal(false)}
                  className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {activeUserNames.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
                      {activeUserNames.length} user{activeUserNames.length !== 1 ? 's' : ''} active this month
                    </p>
                    <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      {analytics?.activeUsers || 0} Total
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {activeUserNames.map((userName, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-purple-50 hover:to-purple-100 transition-all duration-200 group">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                            <span className="text-white font-bold text-lg">
                              {userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 group-hover:text-purple-900 transition-colors">
                            {userName}
                          </h4>
                          <p className="text-sm text-gray-500 group-hover:text-purple-600 transition-colors">
                            Active user
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Users</h3>
                  <p className="text-gray-600 mb-4">No users have performed transactions this month.</p>
                  <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    Waiting for activity
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowActiveUsersModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal (Owner only) */}
      {isOwner && editTx && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Transaction</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={editTx.timestamp}
                  onChange={(e) => setEditTx({ ...editTx, timestamp: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  value={editTx.quantity}
                  onChange={(e) => setEditTx({ ...editTx, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                <textarea
                  value={editTx.remarks}
                  onChange={(e) => setEditTx({ ...editTx, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setEditTx(null)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={saveTransactionEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
