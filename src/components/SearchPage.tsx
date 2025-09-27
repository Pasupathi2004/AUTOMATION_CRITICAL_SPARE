import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, MicOff, Package, MapPin, Plus, Minus } from 'lucide-react';
import { InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_ENDPOINTS } from '../config/api';
import { format } from 'date-fns';

const SearchPage: React.FC = () => {
  const { token, user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const recognition = useRef<any>(null);
  const [quantityInputs, setQuantityInputs] = useState<{ [key: string]: string }>({});
  const [remarksInputs, setRemarksInputs] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchInventory();
    initializeSpeechRecognition();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, inventory]);

  // Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for inventory updates
    socket.on('inventoryUpdated', (updatedItem: InventoryItem) => {
      setInventory(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));
    });

    socket.on('transactionCreated', () => {
      fetchInventory();
    });

    socket.on('lowStockAlert', (data: { item: InventoryItem, message: string }) => {
      alert(`⚠️ ${data.message}`);
    });

    return () => {
      socket.off('inventoryUpdated');
      socket.off('transactionCreated');
      socket.off('lowStockAlert');
    };
  }, [socket, isConnected]);

  const fetchInventory = async () => {
    try {
      const response = await  fetch(API_ENDPOINTS.INVENTORY.LIST, {
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

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  const startVoiceSearch = () => {
    if (recognition.current) {
      setIsListening(true);
      recognition.current.start();
    }
  };

  const stopVoiceSearch = () => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  const filterItems = () => {
    if (!searchQuery.trim()) {
      setFilteredItems([]);
      return;
    }

    const filtered = inventory.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rack.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bin.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredItems(filtered);
  };

  const getStockStatus = (quantity: number, minimumQuantity: number = 5) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (quantity <= minimumQuantity) return { status: 'Low Stock', color: 'text-orange-600 bg-orange-100' };
    if (quantity <= minimumQuantity * 2) return { status: 'Medium Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  // Helper to check for valid MongoDB ObjectId
  const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);

  const handleQuantityUpdate = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    if (!isValidObjectId(itemId)) {
      setSuccessMessage('Invalid item ID');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }
    setUpdatingItems(prev => new Set(prev).add(itemId));
    const item = inventory.find(i => i.id === itemId);
    try {
      const response = await fetch(API_ENDPOINTS.INVENTORY.UPDATE(itemId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: newQuantity,
          minimumQuantity: item ? item.minimumQuantity : 0,
          updatedBy: user?.username,
          remarks: remarksInputs[itemId] || ''
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage('Quantity updated successfully!');
        fetchInventory();
        // Clear per-item inputs after successful update
        setQuantityInputs(prev => ({ ...prev, [itemId]: '' }));
        setRemarksInputs(prev => ({ ...prev, [itemId]: '' }));
      } else {
        setSuccessMessage(data.message || 'Failed to update quantity.');
      }
        setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setSuccessMessage('Error updating quantity.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleIncreaseQuantity = (item: InventoryItem) => {
    handleQuantityUpdate(item.id, item.quantity + 1);
  };

  const handleDecreaseQuantity = (item: InventoryItem) => {
    if (item.quantity > 0) {
      handleQuantityUpdate(item.id, item.quantity - 1);
    }
  };

  const handleQuantityInputChange = (itemId: string, value: string) => {
    setQuantityInputs((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleCustomQuantityUpdate = (item: InventoryItem) => {
    const inputValue = quantityInputs[item.id];
    const newQuantity = parseInt(inputValue, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      setSuccessMessage('Please enter a valid non-negative number.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }
    if (!remarksInputs[item.id] || !remarksInputs[item.id].trim()) {
      setSuccessMessage('Please enter remarks for this update.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }
    handleQuantityUpdate(item.id, newQuantity);
  };

  const handleTakeQuantity = (item: InventoryItem) => {
    const inputValue = quantityInputs[item.id];
    const takeQty = parseInt(inputValue, 10);
    if (isNaN(takeQty) || takeQty < 1 || takeQty > item.quantity) {
      alert('Please enter a valid quantity to take.');
      return;
    }
    if (!remarksInputs[item.id] || !remarksInputs[item.id].trim()) {
      alert('Please enter remarks before updating.');
      return;
    }
    handleQuantityUpdate(item.id, item.quantity - takeQty);
  };

  const safeFormatDate = (dateValue: any, fmt = 'yyyy-MM-dd HH:mm:ss') => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    // Use toLocaleString for IST
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E8B57] via-[#3B82F6] to-[#8B5CF6] rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-8 sm:px-8 sm:py-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Search Inventory
              </h1>
              <p className="text-blue-100 text-lg mt-1">Find items quickly with smart search</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, make, model, specification, row, column, quantity, or location..."
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white text-lg"
            />
          </div>
          
          {recognition.current && (
            <button
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
              className={`w-full sm:w-auto p-4 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                isListening 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
                  : 'bg-gradient-to-r from-[#2E8B57] to-[#3B82F6] text-white hover:from-[#236B45] hover:to-[#2563EB]'
              }`}
            >
              <div className="flex items-center gap-2">
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                <span className="hidden sm:inline">
                  {isListening ? 'Stop' : 'Voice Search'}
                </span>
              </div>
            </button>
          )}
        </div>
        
        {isListening && (
          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center space-x-3 bg-gradient-to-r from-red-50 to-pink-50 px-6 py-3 rounded-xl border border-red-200">
              <div className="animate-pulse w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-red-700 font-semibold">Listening for your voice...</span>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
          <div className="p-6 sm:p-8 border-b border-gray-200/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Search Results
                </h2>
                <p className="text-gray-600">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found</p>
              </div>
            </div>
          </div>
          
          {filteredItems.length > 0 ? (
            <div className="divide-y divide-gray-200/50">
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item.quantity, item.minimumQuantity);
                return (
                  <div key={item.id} className="p-6 sm:p-8 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 group">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-[#2E8B57] to-[#3B82F6] rounded-xl flex items-center justify-center shadow-lg">
                            <Package className="text-white" size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{item.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stockStatus.color}`}>
                              {stockStatus.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 text-sm text-gray-600 mb-4">
                          <div className="bg-gray-50/50 p-3 rounded-lg">
                            <strong className="text-gray-800">Make:</strong> {item.make}
                          </div>
                          <div className="bg-gray-50/50 p-3 rounded-lg">
                            <strong className="text-gray-800">Model:</strong> {item.model}
                          </div>
                          <div className="bg-gray-50/50 p-3 rounded-lg md:col-span-2 lg:col-span-1">
                            <strong className="text-gray-800">Specification:</strong> {item.specification}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0 text-sm text-gray-600">
                          <div className="flex items-center space-x-2 bg-blue-50/50 px-3 py-2 rounded-lg">
                            <MapPin size={16} className="text-blue-600" />
                            <span className="font-medium">Row {item.rack} - Column {item.bin}</span>
                          </div>
                          <div className="bg-gray-50/50 px-3 py-2 rounded-lg">
                            <strong className="text-gray-800">Updated:</strong> {safeFormatDate(item.updatedAt)}
                          </div>
                          <div className="bg-gray-50/50 px-3 py-2 rounded-lg">
                            <strong className="text-gray-800">By:</strong> {item.updatedBy}
                          </div>
                        </div>
                      </div>
                      
                      <div className="lg:text-right">
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-2xl border border-gray-200/50">
                          <div className="mb-4">
                            <div className="text-4xl font-bold text-gray-900 mb-1">
                              {updatingItems.has(item.id) ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#2E8B57] border-t-transparent mx-auto"></div>
                              ) : (
                                item.quantity
                              )}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">in stock</div>
                          </div>
                          
                          <div className="space-y-3">
                            <input
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={quantityInputs[item.id] !== undefined ? quantityInputs[item.id] : ''}
                              onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all"
                              disabled={updatingItems.has(item.id)}
                              placeholder="Qty to take"
                            />
                            <textarea
                              value={remarksInputs[item.id] || ''}
                              onChange={(e) => setRemarksInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-left focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all resize-none"
                              placeholder="Remarks (required)"
                              rows={2}
                            />
                            <button
                              onClick={() => handleTakeQuantity(item)}
                              disabled={updatingItems.has(item.id) || !quantityInputs[item.id] || isNaN(Number(quantityInputs[item.id])) || Number(quantityInputs[item.id]) < 1 || Number(quantityInputs[item.id]) > item.quantity || !remarksInputs[item.id] || !remarksInputs[item.id].trim()}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                            >
                              Update Quantity
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 sm:p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No items found</h3>
              <p className="text-gray-600 text-lg">
                No items match your search criteria. Try different keywords.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search Instructions */}
      {!searchQuery && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Start searching</h3>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Enter keywords to search through inventory items by name, make, model, specification, or location.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">🔍 Text Search</h4>
              <p className="text-gray-600">Type any keyword to find matching items</p>
            </div>
            <div className="group p-6 bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">🎤 Voice Search</h4>
              <p className="text-gray-600">Click the microphone icon to search by voice</p>
            </div>
            <div className="group p-6 bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">⌨️ Quick Search</h4>
              <p className="text-gray-600">Use keyboard shortcuts for faster navigation</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
