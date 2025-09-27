import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_ENDPOINTS } from '../config/api';
import { format } from 'date-fns';

const safeFormatDate = (dateValue: any, fmt = 'yyyy-MM-dd HH:mm:ss') => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return 'N/A';
  // Use toLocaleString for IST
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const UserManagement: React.FC = () => {
  const { user: currentUser, token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for user updates
    socket.on('userCreated', (newUser: User) => {
      console.log('🔌 Received userCreated event:', newUser);
      setUsers(prev => [...prev, newUser]);
    });

    socket.on('userUpdated', (updatedUser: User) => {
      console.log('🔌 Received userUpdated event:', updatedUser);
      setUsers(prev => prev.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ));
    });

    socket.on('userDeleted', (data: { id: string, user: User }) => {
      console.log('🔌 Received userDeleted event:', data);
      setUsers(prev => prev.filter(user => user.id !== data.id));
    });

    return () => {
      socket.off('userCreated');
      socket.off('userUpdated');
      socket.off('userDeleted');
    };
  }, [socket, isConnected]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS.LIST, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_ENDPOINTS.USERS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'User added successfully!' });
        setFormData({ username: '', password: '', role: 'user' });
        setShowAddModal(false);
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to add user.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const response = await fetch(API_ENDPOINTS.USERS.UPDATE(editingUser.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: formData.password }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Password updated successfully!' });
        setShowEditModal(false);
        setEditingUser(null);
        setFormData({ username: '', password: '', role: 'user' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update password.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(API_ENDPOINTS.USERS.DELETE(userId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'User deleted successfully!' });
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete user.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '', role: user.role });
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-transparent absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-blue-900 to-slate-700 rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-8 sm:px-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-blue-100 text-lg mt-1">Manage system users and permissions</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus size={20} />
              <span>Add User</span>
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-6 rounded-2xl flex items-center gap-4 ${
          message.type === 'success' 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700'
            : 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-700'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            <span className="text-white text-sm font-bold">
              {message.type === 'success' ? '✓' : '!'}
            </span>
          </div>
          <span className="font-semibold text-lg">{message.text}</span>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-gray-200/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Users</h2>
              <p className="text-gray-600">{users.length} user{users.length !== 1 ? 's' : ''} in system</p>
            </div>
          </div>
        </div>

        {users.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-slate-50/50 transition-all duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`rounded-xl p-3 shadow-lg ${
                          user.role === 'admin' ? 'bg-gradient-to-r from-red-100 to-orange-100' : 'bg-gradient-to-r from-blue-100 to-slate-100'
                        }`}>
                          {user.role === 'admin' ? (
                            <Shield className={`${user.role === 'admin' ? 'text-red-600' : 'text-slate-700'}`} size={20} />
                          ) : (
                            <UserIcon className="text-slate-700" size={20} />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{user.username}</div>
                          {user.id === currentUser?.id && (
                            <div className="text-xs text-gray-500 font-medium">(You)</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-gradient-to-r from-red-100 to-orange-100 text-red-800' 
                          : 'bg-gradient-to-r from-blue-100 to-slate-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {safeFormatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                            className="text-slate-700 hover:text-slate-900 p-2 rounded-xl w-full sm:w-auto text-center bg-slate-50 hover:bg-slate-100 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Change Password"
                        >
                          <Edit size={18} />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-xl w-full sm:w-auto text-center bg-red-50 hover:bg-red-100 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Delete User"
                          >
                              <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            {/* Mobile Cards */}
            <div className="sm:hidden space-y-4 p-6">
              {users.map((user) => (
                <div key={user.id} className="bg-gradient-to-r from-white to-slate-50 rounded-2xl shadow-lg border border-slate-200/50 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`rounded-xl p-3 shadow-lg ${
                      user.role === 'admin' ? 'bg-gradient-to-r from-red-100 to-orange-100' : 'bg-gradient-to-r from-blue-100 to-slate-100'
                    }`}>
                      {user.role === 'admin' ? (
                        <Shield className="text-red-600" size={20} />
                      ) : (
                        <UserIcon className="text-slate-700" size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-gray-900">{user.username}</div>
                      {user.id === currentUser?.id && (
                        <div className="text-sm text-gray-500 font-medium">(You)</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-gradient-to-r from-red-100 to-orange-100 text-red-800' 
                        : 'bg-gradient-to-r from-blue-100 to-slate-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">{safeFormatDate(user.createdAt)}</span>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEditModal(user)}
                      className="flex-1 bg-gradient-to-r from-slate-700 to-blue-800 text-white p-3 rounded-xl hover:from-slate-800 hover:to-blue-900 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-center"
                      title="Change Password"
                    >
                      <Edit size={18} className="mx-auto" />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white p-3 rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-center"
                        title="Delete User"
                      >
                        <Trash2 size={18} className="mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 sm:p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-slate-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No users found</h3>
            <p className="text-gray-600 text-lg mb-6">Start by adding some users to the system.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-slate-700 to-blue-800 text-white rounded-xl hover:from-slate-800 hover:to-blue-900 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Add First User
            </button>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Add New User</h3>
            </div>
            
            <form onSubmit={handleAddUser} className="p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ username: '', password: '', role: 'user' });
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-[#2E8B57] text-white rounded-lg hover:bg-[#236B45]"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Password Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Change Password for {editingUser.username}
              </h3>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="p-4 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                  required
                />
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setFormData({ username: '', password: '', role: 'user' });
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-[#2E8B57] text-white rounded-lg hover:bg-[#236B45]"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
