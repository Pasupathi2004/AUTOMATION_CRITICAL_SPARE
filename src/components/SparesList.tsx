import React, { useState, useEffect } from 'react';
import { Package, Edit, Trash2, MapPin, Calendar, User, Download, Building, Archive, Search, X } from 'lucide-react';
import { InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';
import { API_ENDPOINTS } from '../config/api';
import * as XLSX from 'xlsx';

// Helper function for safe date formatting in Indian 12-hour format
const safeFormatDate = (dateValue: any, fmt = 'yyyy-MM-dd HH:mm:ss') => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return 'N/A';
  // Use toLocaleString for IST with 12-hour format
  return date.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Helper to check for valid MongoDB ObjectId
const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);

const SparesList: React.FC = () => {
  const { user, token } = useAuth();
  const isAdmin = (user?.role || '').toString().trim().toLowerCase() === 'admin';
  const { socket, isConnected } = useSocket();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'critical' | 'consumable'>('all');
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
    minimumQuantity: '',
    // Optional cost per single item
    cost: '',
    category: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchInventory();
    // Debug user role
    console.log('Current user:', user);
    console.log('User role:', user?.role);
  }, [user]);

  useEffect(() => {
    let filtered = inventory;

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => {
        const itemCategory = item.category || 'consumable';
        return itemCategory.toLowerCase() === categoryFilter.toLowerCase();
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.specification.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rack.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.quantity.toString().includes(searchTerm) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.updatedBy && item.updatedBy.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredInventory(filtered);
  }, [searchTerm, categoryFilter, inventory]);

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

    socket.on('inventoryDeleted', (data: { id: string, item: InventoryItem }) => {
      console.log('🔌 Received inventoryDeleted event:', data);
      setInventory(prev => prev.filter(item => item.id !== data.id));
      setFilteredInventory(prev => prev.filter(item => item.id !== data.id));
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
      const response = await fetch(API_ENDPOINTS.INVENTORY.LIST, {
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
      minimumQuantity: item.minimumQuantity !== undefined ? item.minimumQuantity.toString() : '',
      cost: item.cost !== undefined ? item.cost.toString() : '',
      category: item.category || 'consumable'
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!isValidObjectId(editingItem.id)) {
      setMessage({ type: 'error', text: 'Invalid item ID' });
      return;
    }
    try {
      const response = await fetch(API_ENDPOINTS.INVENTORY.UPDATE(editingItem.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          minimumQuantity: parseInt(formData.minimumQuantity),
          cost: formData.cost !== '' ? parseFloat(formData.cost) : '',
          updatedBy: user?.username
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Item updated successfully!' });
        fetchInventory();
        setShowEditModal(false);
        setEditingItem(null);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update item.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating item.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    if (!isValidObjectId(id)) {
      setMessage({ type: 'error', text: 'Invalid item ID' });
      return;
    }
    try {
      const response = await fetch(API_ENDPOINTS.INVENTORY.DELETE(id), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Item deleted successfully!' });
        fetchInventory();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete item.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting item.' });
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Name', 'Make', 'Model', 'Specification', 'Row', 'Column', 
      'Quantity', 'Minimum Quantity', 'Category', 'Cost (per item)', 'Stock Status', 'Created At', 'Updated At', 'Updated By'
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
      item.minimumQuantity,
      item.category || 'consumable',
      item.cost !== undefined ? item.cost : '',
      getStockStatus(item.quantity, item.minimumQuantity).status,
      safeFormatDate(item.createdAt),
      safeFormatDate(item.updatedAt),
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

  const exportToExcel = () => {
    try {
      const headers = [
        'ID', 'Name', 'Make', 'Model', 'Specification', 'Row', 'Column', 
        'Quantity', 'Minimum Quantity', 'Category', 'Cost (per item)', 'Stock Status', 'Created At', 'Updated At', 'Updated By'
      ];
      
      const excelData = inventory.map(item => [
        item.id,
        item.name,
        item.make,
        item.model,
        item.specification,
        item.rack,
        item.bin,
        item.quantity,
        item.minimumQuantity,
        item.category || 'consumable',
        item.cost !== undefined ? item.cost : '',
        getStockStatus(item.quantity, item.minimumQuantity).status,
        safeFormatDate(item.createdAt),
        safeFormatDate(item.updatedAt),
        item.updatedBy
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelData]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
      
      XLSX.writeFile(workbook, `inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      // Fallback to CSV if Excel export fails
      exportToCSV();
    }
  };

  const getStockStatus = (quantity: number, minimumQuantity: number = 5) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (quantity <= minimumQuantity) return { status: 'Low Stock', color: 'text-orange-600 bg-orange-100' };
    if (quantity <= minimumQuantity * 2) return { status: 'Medium Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  const getLastUpdated = () => {
    if (inventory.length === 0) return 'N/A';
    const times = inventory.map(item => {
      const t = new Date(item.updatedAt).getTime();
      return isNaN(t) ? 0 : t;
    });
    const maxTime = Math.max(...times);
    if (maxTime === 0) return 'N/A';
    return safeFormatDate(new Date(maxTime));
  };

  // Filter out invalid items before rendering
  const validInventory = inventory.filter(item => isValidObjectId(item.id));
  const validFilteredInventory = filteredInventory.filter(item => isValidObjectId(item.id));
  const invalidItems = inventory.filter(item => !isValidObjectId(item.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E8B57]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Spares List</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto px-4 py-2 bg-[#2E8B57] text-white rounded-lg hover:bg-[#236B45] transition-colors mt-2 sm:mt-0"
        >
          <Download size={20} />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Standalone Search Box */}
      <div className="w-full flex flex-col items-center">
        <div className="relative w-full max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, make, model, specification, row, column, quantity, category, or user..."
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

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            categoryFilter === 'all'
              ? 'bg-[#2E8B57] text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setCategoryFilter('critical')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            categoryFilter === 'critical'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
          }`}
        >
          Critical
        </button>
        <button
          onClick={() => setCategoryFilter('consumable')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            categoryFilter === 'consumable'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
          }`}
        >
          Consumable
        </button>
      </div>

      {categoryFilter !== 'all' && (
        <div className="text-center text-sm text-gray-600">
          Showing {filteredInventory.length} {categoryFilter} item{filteredInventory.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Summary/info card comes after search bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Total Items: {inventory.length}
            {(searchTerm || categoryFilter !== 'all') && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Showing {filteredInventory.length} filtered)
              </span>
            )}
          </h2>
          <div className="text-xs sm:text-sm text-gray-600">
            Last updated: {getLastUpdated()}
          </div>
        </div>
      </div>

      {invalidItems.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-100 text-yellow-800">
          Warning: {invalidItems.length} item(s) with invalid ID(s) were hidden. Please check your data.
        </div>
      )}

      {validFilteredInventory.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {validFilteredInventory.map((item) => {
            const stockStatus = getStockStatus(item.quantity, item.minimumQuantity);
            const numericCost =
              typeof item.cost === 'number'
                ? item.cost
                : item.cost !== undefined && item.cost !== null
                  ? Number(item.cost)
                  : undefined;
            const hasCost = numericCost !== undefined && !isNaN(numericCost);
            const totalValue = hasCost ? numericCost * item.quantity : undefined;
            return (
              <div key={item.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-[#2E8B57] rounded-lg p-2">
                        <Package className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.status}
                          </span>
                          {item.category && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.category === 'critical' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.category === 'critical' ? 'Critical' : 'Consumable'}
                            </span>
                          )}
                        </div>
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
                    
                    {isAdmin && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex flex-col">
                          <span className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">
                            Cost / Item
                          </span>
                          <span className="mt-1 text-lg font-bold text-emerald-900">
                            {hasCost ? numericCost!.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col">
                          <span className="text-xs font-semibold text-amber-700 tracking-wide uppercase">
                            Total Value
                          </span>
                          <span className="mt-1 text-lg font-bold text-amber-900">
                            {hasCost && totalValue !== undefined ? totalValue.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}
                    
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
                            <div className="text-xs font-medium text-gray-500 uppercase">Row</div>
                            <div className="text-lg font-bold text-gray-900">{item.rack}</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Archive className="text-purple-600" size={16} />
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase">Column</div>
                            <div className="text-lg font-bold text-gray-900">{item.bin}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <div className="inline-flex items-center space-x-1 px-3 py-1 bg-[#2E8B57] text-white rounded-full text-sm font-medium">
                        <span>Location: Row {item.rack} - Column {item.bin}</span>
                      </div>
                    </div>
                  </div>

                  {/* Last Updated Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 mb-4 gap-2 sm:gap-0">
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{safeFormatDate(item.updatedAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>{item.updatedBy}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t border-gray-200">
                    {isAdmin && (
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex items-center justify-center space-x-1 w-full sm:w-auto px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Item"
                      >
                        <Edit size={16} />
                        <span className="text-sm">Edit</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center justify-center space-x-1 w-full sm:w-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-4 sm:p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Edit Item</h3>
            </div>
            
            <form onSubmit={handleUpdate} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost (per item)</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Row Location</label>
                  <input
                    type="text"
                    value={formData.rack}
                    onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Column Location</label>
                  <input
                    type="text"
                    value={formData.bin}
                    onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
                    required
                  >
                    <option value="">Select category</option>
                    <option value="critical">Critical</option>
                    <option value="consumable">Consumable</option>
                  </select>
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
              
              

              <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#2E8B57] text-white hover:bg-[#236B45]"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div>
      )}
    </div>
  );
};

export default SparesList;
