export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  make: string;
  model: string;
  specification: string;
  rack: string;
  bin: string;
  quantity: number;
  minimumQuantity: number;
   // Optional cost per single item
  cost?: number;
  category?: 'critical' | 'consumable';
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Transaction {
  id: string;
  itemId?: string;
  itemName: string;
  type: 'added' | 'taken' | 'deleted';
  purpose?: 'breakdown' | 'others';
  requestedBy?: string;
  requestStatus?: 'pending' | 'approved' | 'rejected' | '';
  resolvedBy?: string;
  quantity: number;
  user: string;
  timestamp: string;
  // Optional last-update metadata (present when transaction was edited)
  editedBy?: string;
  editedAt?: string;
  // Enhanced item details for comprehensive analytics
  make?: string;
  model?: string;
  specification?: string;
  rack?: string;
  bin?: string;
  remarks?: string;
}

export interface RequestTicket {
  id: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  purpose: 'breakdown' | 'others';
  remarks: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  resolvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
}

export interface Analytics {
  totalItems: number;
  lowStockItems: number;
  totalTransactions: number;
  itemsConsumed: number;
  itemsAdded: number;
  costConsumed?: number;
  costAdded?: number;
  monthlyCostSeries?: { month: number; added: number; consumed: number }[];
  totalValueCritical?: number;
  totalValueConsumable?: number;
  totalValueAll?: number;
  activeUsers: number;
  recentTransactions: Transaction[];
  lowStockAlerts: InventoryItem[];
}