import React, { useState, useEffect } from 'react';
import { Plus, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';

const AddItem: React.FC = () => {
  const { user, token } = useAuth();
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
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [refreshInventory, setRefreshInventory] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(API_ENDPOINTS.INVENTORY.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          updatedBy: user?.username
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Item added successfully!' });
        setFormData({
          name: '',
          make: '',
          model: '',
          specification: '',
          rack: '',
          bin: '',
          quantity: '',
          minimumQuantity: ''
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to add item. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check if the server is running.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (refreshInventory) {
      // Optionally, you can trigger a fetch or event to update the spares list
      setRefreshInventory(false);
    }
  }, [refreshInventory]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E8B57] via-[#3B82F6] to-[#8B5CF6] rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-8 sm:px-8 sm:py-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Add New Item
              </h1>
              <p className="text-blue-100 text-lg mt-1">Create new inventory items</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
        <div className="p-6 sm:p-8 border-b border-gray-200/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#2E8B57] to-[#3B82F6] rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Item Details</h2>
              <p className="text-gray-600">Fill in the information below</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                Item Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Enter item name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="make" className="block text-sm font-semibold text-gray-700">
                Make *
              </label>
              <input
                type="text"
                id="make"
                name="make"
                value={formData.make}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Enter make"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="model" className="block text-sm font-semibold text-gray-700">
                Model *
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Enter model"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="quantity" className="block text-sm font-semibold text-gray-700">
                Quantity *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="rack" className="block text-sm font-semibold text-gray-700">
                Row Location *
              </label>
              <input
                type="text"
                id="rack"
                name="rack"
                value={formData.rack}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Enter row location"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="bin" className="block text-sm font-semibold text-gray-700">
                Column Location *
              </label>
              <input
                type="text"
                id="bin"
                name="bin"
                value={formData.bin}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Enter column location"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="minimumQuantity" className="block text-sm font-semibold text-gray-700">
                Minimum Quantity *
              </label>
              <input
                type="number"
                id="minimumQuantity"
                name="minimumQuantity"
                value={formData.minimumQuantity}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Enter minimum quantity"
              />
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <label htmlFor="specification" className="block text-sm font-semibold text-gray-700">
              Specification *
            </label>
            <textarea
              id="specification"
              name="specification"
              value={formData.specification}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none resize-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
              placeholder="Enter detailed specification"
            />
          </div>

          {message && (
            <div className={`mt-8 p-6 rounded-2xl flex items-center gap-4 ${
              message.type === 'success' 
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-700'
                : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
              }`}>
                <span className="text-white text-sm font-bold">
                  {message.type === 'success' ? '✓' : '!'}
                </span>
              </div>
              <span className="font-semibold text-lg">{message.text}</span>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={() => setFormData({
                name: '',
                make: '',
                model: '',
                specification: '',
                rack: '',
                bin: '',
                quantity: '',
                minimumQuantity: ''
              })}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#2E8B57] to-[#3B82F6] text-white rounded-xl hover:from-[#236B45] hover:to-[#2563EB] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Adding Item...</span>
                </div>
              ) : (
                <>
                  <Plus size={20} />
                  <span>Add Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bulk Upload Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Bulk Upload Items</h2>
            <p className="text-gray-600">Upload multiple items at once using Excel/CSV</p>
          </div>
        </div>
        
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('bulk-upload-file') as HTMLInputElement;
            if (!fileInput.files || fileInput.files.length === 0) {
              setBulkUploadStatus('Please select a file to upload.');
              return;
            }
            setBulkUploading(true);
            setBulkUploadStatus(null);
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            try {
              const response = await fetch(API_ENDPOINTS.INVENTORY.BULK_UPLOAD, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: formData
              });
              const data = await response.json();
              if (data.success) {
                setBulkUploadStatus('Bulk upload successful!');
                setRefreshInventory(true);
              } else {
                setBulkUploadStatus(data.message || 'Bulk upload failed.');
              }
            } catch (error) {
              setBulkUploadStatus('Network error during bulk upload.');
            } finally {
              setBulkUploading(false);
            }
          }}
          className="flex flex-col lg:flex-row items-center gap-4"
          encType="multipart/form-data"
        >
          <div className="flex-1 w-full">
            <input
              type="file"
              id="bulk-upload-file"
              accept=".xlsx,.xls,.csv"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={bulkUploading}
            className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            {bulkUploading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              'Upload Excel File'
            )}
          </button>
          <a
            href="/example-bulk-upload-template.csv"
            download
            className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 text-center"
          >
            Download Template
          </a>
        </form>
        
        {bulkUploadStatus && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <span className="text-blue-700 font-semibold">{bulkUploadStatus}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddItem;
