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
  return format(date, fmt);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E8B57]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center w-full">User Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto px-4 py-2 bg-[#2E8B57] text-white rounded-lg hover:bg-[#236B45] transition-colors mt-2 sm:mt-0"
        >
          <Plus size={20} />
          <span>Add User</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-x-auto mt-4 w-full">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="text-[#2E8B57]" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Users ({users.length})</h2>
          </div>
        </div>

        {users.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`rounded-full p-2 ${
                            user.role === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {user.role === 'admin' ? (
                              <Shield className={`${user.role === 'admin' ? 'text-red-600' : 'text-blue-600'}`} size={16} />
                            ) : (
                              <UserIcon className="text-blue-600" size={16} />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            {user.id === currentUser?.id && (
                              <div className="text-xs text-gray-500">(You)</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {safeFormatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-md w-full sm:w-auto text-center"
                            title="Change Password"
                          >
                            <Edit size={18} />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-md w-full sm:w-auto text-center"
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
            <div className="sm:hidden space-y-4">
              {users.map((user) => (
                <div key={user.id} className="bg-gray-50 rounded-lg shadow p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${user.role === 'admin' ? 'bg-red-100' : 'bg-blue-100'}`}>{user.role === 'admin' ? (<Shield className="text-red-600" size={18} />) : (<UserIcon className="text-blue-600" size={18} />)}</div>
                    <div>
                      <div className="text-base font-semibold text-gray-900">{user.username}</div>
                      {user.id === currentUser?.id && (<div className="text-xs text-gray-500">(You)</div>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{user.role}</span>
                    <span className="text-xs text-gray-500 ml-auto">{safeFormatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="flex-1 text-blue-600 hover:text-blue-900 p-2 rounded-md bg-white border border-blue-100 text-center"
                      title="Change Password"
                    >
                      <Edit size={18} />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex-1 text-red-600 hover:text-red-900 p-2 rounded-md bg-white border border-red-100 text-center"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Start by adding some users to the system.</p>
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
