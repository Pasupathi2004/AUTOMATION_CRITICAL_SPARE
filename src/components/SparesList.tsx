import React, { useState, useEffect } from 'react';
import { Package, Edit, Trash2, MapPin, Calendar, User, Download, Building, Archive, Search, X } from 'lucide-react';
import { InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';

const SparesList: React.FC = () => {
  const { user, token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    specification: '',
    rack: '',
    bin: '',
    quantity: '',
    minimumQuantity: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInventory(inventory);
    } else {
      const filtered = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.specification.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rack.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.quantity.toString().includes(searchTerm) ||
        (item.updatedBy && item.updatedBy.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredInventory(filtered);
    }
  }, [searchTerm, inventory]);

  // Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for inventory updates
    socket.on('inventoryCreated', (newItem: InventoryItem) => {
      console.log('🔌 Received inventoryCreated event:', newItem);
      setInventory(prev => [...prev, newItem]);
    });

    socket.on('inventoryUpdated', (updatedItem: InventoryItem) => {
      console.log('🔌 Received inventoryUpdated event:', updatedItem);
      setInventory(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));
    });

    socket.on('inventoryDeleted', (data: { id: number, item: InventoryItem }) => {
      console.log('🔌 Received inventoryDeleted event:', data);
      setInventory(prev => prev.filter(item => item.id !== data.id));
    });

    socket.on('bulkUploadCompleted', (data: { count: number, items: InventoryItem[] }) => {
      console.log('🔌 Received bulkUploadCompleted event:', data);
      setInventory(prev => [...prev, ...data.items]);
    });

    socket.on('lowStockAlert', (data: { item: InventoryItem, message: string }) => {
      console.log('🔌 Received lowStockAlert event:', data);
      // You can show a notification here
      alert(`⚠️ ${data.message}`);
    });

    return () => {
      socket.off('inventoryCreated');
      socket.off('inventoryUpdated');
      socket.off('inventoryDeleted');
      socket.off('bulkUploadCompleted');
      socket.off('lowStockAlert');
    };
  }, [socket, isConnected]);

  const fetchInventory = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setInventory(data.items);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      make: item.make,
      model: item.model,
      specification: item.specification,
      rack: item.rack,
      bin: item.bin,
      quantity: item.quantity.toString(),
      minimumQuantity: item.minimumQuantity !== undefined ? item.minimumQuantity.toString() : ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const response = await  fetch(`http://localhost:3001/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          updatedBy: user?.username
        }),
      });

      if (response.ok) {
        fetchInventory();
        setShowEditModal(false);
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/inventory/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ deletedBy: user?.username }),
      });

      if (response.ok) {
        fetchInventory();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Name', 'Make', 'Model', 'Specification', 'Rack', 'Bin', 
      'Quantity', 'Stock Status', 'Created At', 'Updated At', 'Updated By'
    ];
    
    const csvData = inventory.map(item => [
      item.id,
      item.name,
      item.make,
      item.model,
      item.specification,
      item.rack,
      item.bin,
      item.quantity,
      getStockStatus(item.quantity).status,
      format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      format(new Date(item.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
      item.updatedBy
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (quantity <= 5) return { status: 'Low Stock', color: 'text-orange-600 bg-orange-100' };
    if (quantity <= 20) return { status: 'Medium Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Spares List</h1>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-[#2E8B57] text-white rounded-lg hover:bg-[#236B45] transition-colors"
        >
          <Download size={20} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Standalone Search Box */}
      <div className="w-full flex justify-center">
        <div className="relative w-full max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, make, model, specification, location, quantity, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg shadow focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>
      {searchTerm && (
        <div className="text-center text-sm text-gray-600">
          Found {filteredInventory.length} item{filteredInventory.length !== 1 ? 's' : ''} matching "{searchTerm}"
        </div>
      )}

      {/* Summary/info card comes after search bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Total Items: {inventory.length}
            {searchTerm && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Showing {filteredInventory.length} filtered)
              </span>
            )}
          </h2>
          <div className="text-sm text-gray-600">
            Last updated: {inventory.length > 0 ? format(new Date(Math.max(...inventory.map(item => new Date(item.updatedAt).getTime()))), 'PPpp') : 'N/A'}
          </div>
        </div>
      </div>

      {filteredInventory.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => {
            const stockStatus = getStockStatus(item.quantity);
            return (
              <div key={item.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-[#2E8B57] rounded-lg p-2">
                        <Package className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{item.quantity}</div>
                      <div className="text-sm text-gray-600">in stock</div>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Make:</span>
                        <div className="text-gray-900">{item.make}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Model:</span>
                        <div className="text-gray-900">{item.model}</div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-600">Specification:</span>
                      <div className="text-gray-900 text-sm mt-1 line-clamp-2">{item.specification}</div>
                    </div>
                  </div>

                  {/* Location Section - Enhanced */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <MapPin className="text-[#2E8B57]" size={16} />
                      <span className="font-medium text-gray-700">Storage Location</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Building className="text-blue-600" size={16} />
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase">Rack</div>
                            <div className="text-lg font-bold text-gray-900">{item.rack}</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Archive className="text-purple-600" size={16} />
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase">Bin</div>
                            <div className="text-lg font-bold text-gray-900">{item.bin}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <div className="inline-flex items-center space-x-1 px-3 py-1 bg-[#2E8B57] text-white rounded-full text-sm font-medium">
                        <span>Location: {item.rack}-{item.bin}</span>
                      </div>
                    </div>
                  </div>

                  {/* Last Updated Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{format(new Date(item.updatedAt), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>{item.updatedBy}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Item"
                    >
                      <Edit size={16} />
                      <span className="text-sm">Edit</span>
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 size={16} />
                        <span className="text-sm">Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No items found matching your search' : 'No items found'}
          </h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms or clear the search to see all items.' : 'Start by adding some items to your inventory.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 bg-[#2E8B57] text-white rounded-lg hover:bg-[#236B45] transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Edit Item</h3>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Quantity</label>
                  <input
                    type="number"
                    value={formData.minimumQuantity}
                    onChange={(e) => setFormData({ ...formData, minimumQuantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rack Location</label>
                  <input
                    type="text"
                    value={formData.rack}
                    onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bin Location</label>
                  <input
                    type="text"
                    value={formData.bin}
                    onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Specification</label>
                <textarea
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2E8B57] text-white rounded-lg hover:bg-[#236B45]"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SparesList;
