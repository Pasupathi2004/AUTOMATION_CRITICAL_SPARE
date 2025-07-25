import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Package, 
  Search, 
  Plus, 
  BarChart3, 
  Users, 
  LogOut, 
  Bell,
  Home,
  Wifi,
  WifiOff
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { user, logout, token } = useAuth();
  const { isConnected } = useSocket();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchLowStockAlerts();
  }, []);

  const fetchLowStockAlerts = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ANALYTICS.DASHBOARD, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.analytics.lowStockAlerts || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'user'] },
    { id: 'search', label: 'Search', icon: Search, roles: ['admin', 'user'] },
    { id: 'add-item', label: 'Add Item', icon: Plus, roles: ['admin'] },
    { id: 'spares-list', label: 'Spares List', icon: Package, roles: ['admin', 'user'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || 'user')
  );

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2E8B57] text-white shadow-lg w-full">
        <div className="px-2 sm:px-4 lg:px-8 w-full">
          <div className="flex flex-row items-center h-16 w-full relative">
            {/* Mobile menu button */}
            <div className="flex items-center flex-shrink-0 z-10">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-[#236B45]"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
            {/* Centered title */}
            <div className="flex-1 flex justify-center items-center absolute left-0 right-0 pointer-events-none">
              <h1 className="text-base sm:text-xl font-bold truncate max-w-[70vw] sm:max-w-none pointer-events-auto">Automation Inventory Manager</h1>
            </div>
            {/* Empty right side for spacing on mobile */}
            <div className="flex-shrink-0 ml-auto hidden sm:block" style={{ width: '200px' }}></div>
          </div>
          {/* Notification, welcome, and logout: below title on mobile, right on desktop */}
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-2 sm:mt-0 w-full">
              {/* Socket.IO Connection Status */}
            <div className="flex items-center space-x-1 sm:space-x-2">
                {isConnected ? (
                  <Wifi size={16} className="text-green-300" />
                ) : (
                  <WifiOff size={16} className="text-red-300" />
                )}
                <span className="text-xs text-gray-300 hidden sm:inline">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-md hover:bg-[#236B45]"
                >
                  <Bell size={20} />
                  {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                <div className="z-50">
                  {/* Mobile: fixed, centered overlay */}
                  <div className="block sm:hidden fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center pt-20" onClick={() => setShowNotifications(false)}></div>
                  <div className="block sm:hidden fixed top-20 left-1/2 transform -translate-x-1/2 w-11/12 max-w-xs bg-white rounded-lg shadow-lg border z-50 p-4" onClick={e => e.stopPropagation()}>
                    <div className="border-b pb-2 mb-2">
                      <h3 className="font-semibold text-gray-800">Low Stock Alerts</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((item, index) => (
                          <div key={index} className="p-3 border-b last:border-b-0">
                            <p className="font-medium text-gray-800">{item.name}</p>
                            <p className="text-sm text-red-600">
                              Low stock: {item.quantity} remaining
                            </p>
                            <p className="text-xs text-gray-500">
                              Location: Row {item.rack} - Column {item.bin}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No low stock alerts
                        </div>
                      )}
                    </div>
                    <button className="mt-4 w-full bg-[#2E8B57] text-white rounded-lg py-2" onClick={() => setShowNotifications(false)}>Close</button>
                  </div>
                  {/* Desktop: right-aligned dropdown */}
                  <div className="hidden sm:block absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-gray-800">Low Stock Alerts</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((item, index) => (
                          <div key={index} className="p-3 border-b last:border-b-0">
                            <p className="font-medium text-gray-800">{item.name}</p>
                            <p className="text-sm text-red-600">
                              Low stock: {item.quantity} remaining
                            </p>
                            <p className="text-xs text-gray-500">
                              Location: Row {item.rack} - Column {item.bin}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No low stock alerts
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                )}
              </div>
            <span className="text-xs sm:text-sm truncate max-w-[60vw] sm:max-w-none text-center">Welcome, {user?.username}</span>
              <button
                onClick={handleLogout}
              className="flex items-center justify-center space-x-1 px-2 py-2 sm:px-3 rounded-md hover:bg-[#236B45]"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside 
          className={`${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-30 w-4/5 max-w-xs bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 mt-16 md:mt-0`}
        >
          <nav className="h-full px-4 py-6 overflow-y-auto">
            <ul className="space-y-2">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onPageChange(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                        currentPage === item.id
                          ? 'bg-[#2E8B57] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Main content */}
        <main className="flex-1 p-2 sm:p-4 md:p-6 md:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
