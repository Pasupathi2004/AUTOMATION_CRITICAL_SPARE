import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, CheckCircle, XCircle, RefreshCcw, Inbox } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { RequestTicket } from '../types';

const Requests: React.FC = () => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [requests, setRequests] = useState<RequestTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(API_ENDPOINTS.REQUESTS.LIST, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        const normalized = (data.requests || []).map((r: any) => ({
          id: r._id || r.id,
          itemId: r.itemId,
          itemName: r.itemName,
          quantity: r.quantity,
          purpose: r.purpose || 'breakdown',
          remarks: r.remarks || '',
          status: r.status || 'pending',
          requestedBy: r.requestedBy || '',
          resolvedBy: r.resolvedBy || '',
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          resolvedAt: r.resolvedAt || null,
        }));
        setRequests(normalized);
      } else {
        setMessage(data.message || 'Unable to load requests.');
      }
    } catch (error) {
      setMessage('Failed to fetch requests.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!socket) return;
    socket.on('requestCreated', fetchRequests);
    socket.on('requestUpdated', fetchRequests);
    return () => {
      socket.off('requestCreated', fetchRequests);
      socket.off('requestUpdated', fetchRequests);
    };
  }, [socket, fetchRequests]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(API_ENDPOINTS.REQUESTS.UPDATE(id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage(`Request ${status}.`);
        fetchRequests();
      } else {
        setMessage(data.message || 'Failed to update request.');
      }
    } catch (error) {
      setMessage('Failed to update request.');
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
          <span>{message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ClipboardList className="text-[#2E8B57]" />
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'admin' ? 'Breakdown Requests' : 'My Breakdown Requests'}
          </h1>
        </div>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-sm"
        >
          <RefreshCcw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-600">
          <Inbox className="mx-auto mb-2 text-gray-400" />
          No breakdown requests yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-500">Item</p>
                  <p className="text-lg font-semibold text-gray-900">{req.itemName}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    req.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : req.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {req.status.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Purpose:</strong> {req.purpose}</p>
                <p><strong>Quantity:</strong> {req.quantity}</p>
                <p><strong>Requested by:</strong> {req.requestedBy}</p>
                <p><strong>Remarks:</strong> {req.remarks || '—'}</p>
          {req.resolvedBy && (
            <p><strong>Resolved by:</strong> {req.resolvedBy}</p>
          )}
                {req.createdAt && (
                  <p className="text-xs text-gray-500">
                    Raised on: {new Date(req.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                )}
              </div>
              {req.status === 'pending' && user?.role === 'admin' && (
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => updateStatus(req.id, 'approved')}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    <CheckCircle size={16} />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => updateStatus(req.id, 'rejected')}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    <XCircle size={16} />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Requests;

