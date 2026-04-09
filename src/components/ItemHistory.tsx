import React, { useEffect, useMemo, useState } from 'react';
import { Search, History, Calendar, Package } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../types';

const monthLabel = (year: number, monthIndex: number) =>
  new Date(year, monthIndex, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

const getLast12Months = () => {
  const now = new Date();
  const months: { key: string; year: number; month: number; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    months.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      year,
      month,
      label: monthLabel(year, month),
    });
  }
  return months;
};

const ItemHistory: React.FC = () => {
  const { token, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.TRANSACTIONS, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data.success) {
          setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        }
      } catch (error) {
        console.error('Error fetching item history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [token]);

  const months = useMemo(() => getLast12Months(), []);

  const filteredLastYearTransactions = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    return transactions
      .filter((tx) => {
        if (!tx?.timestamp) return false;
        const txDate = new Date(tx.timestamp);
        if (isNaN(txDate.getTime()) || txDate < start || txDate > now) return false;

        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
          (tx.itemName || '').toLowerCase().includes(q) ||
          (tx.make || '').toLowerCase().includes(q) ||
          (tx.model || '').toLowerCase().includes(q) ||
          (tx.specification || '').toLowerCase().includes(q) ||
          (tx.remarks || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, searchTerm]);

  const groupedByMonth = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    filteredLastYearTransactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tx);
    });
    return grouped;
  }, [filteredLastYearTransactions]);

  if ((user?.role || '').toLowerCase() !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-700">
        This page is available for admin only.
      </div>
    );
  }

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <History className="text-[#2E8B57]" />
          Item History
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search spare item by name, make, model, specification, or remarks..."
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent"
          />
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Showing last 12 months month-wise history. Includes taken, deleted and other quantity updates with remarks.
        </p>
      </div>

      {months.map((m) => {
        const monthTx = groupedByMonth[m.key] || [];
        return (
          <div key={m.key} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <Calendar size={16} className="text-[#2E8B57]" />
                <span>{m.label}</span>
              </div>
              <span className="text-sm text-gray-600">{monthTx.length} record(s)</span>
            </div>

            {monthTx.length === 0 ? (
              <div className="p-4 sm:p-6 text-sm text-gray-500">No matching history in this month.</div>
            ) : (
              <div className="divide-y">
                {monthTx.map((tx) => (
                  <div key={tx.id} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          <Package size={16} className="text-[#2E8B57]" />
                          {tx.itemName || 'Unknown Item'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {tx.make || '-'} {tx.model || ''} {tx.specification ? `| ${tx.specification}` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        Type: {(tx.type || '').toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        Updated Qty: {tx.quantity ?? 0}
                      </span>
                      {tx.user && (
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          By: {tx.user}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded-lg bg-gray-50">
                        <span className="font-medium text-gray-700">History Remarks:</span>{' '}
                        <span className="text-gray-800">{tx.remarks || '—'}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50">
                        <span className="font-medium text-gray-700">Purpose/Status:</span>{' '}
                        <span className="text-gray-800">
                          {tx.purpose || '—'} {tx.requestStatus ? `| ${tx.requestStatus}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ItemHistory;

