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
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'added' | 'taken' | 'deleted';
  quantity: number;
  user: string;
  timestamp: string;
}

export interface Analytics {
  totalItems: number;
  lowStockItems: number;
  totalTransactions: number;
  itemsConsumed: number;
  itemsAdded: number;
  activeUsers: number;
  recentTransactions: Transaction[];
  lowStockAlerts: InventoryItem[];
}