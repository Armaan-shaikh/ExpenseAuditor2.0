
export interface ExpenseEntry {
  expenseId: string;
  store: string;
  category: string;
  remarks: string;
  user: string;
  date: string;
  time: string;
  amount: number;
}

export interface StoreMetric {
  storeName: string;
  totalSpend: number;
  topCategory: string;
  remarksQuality: 'Good' | 'Lazy';
  riskLevel: 'Low' | 'Medium' | 'High';
  riskReason: string;
  entriesCount: number;
  goodPoint?: string;
  badPoint?: string;
}

export interface AuditSummary {
  totalSpend: number;
  avgSpendPerStore: number;
  topCategory: string;
  storeMetrics: StoreMetric[];
  redFlags: string[];
  geminiAnalysis?: string;
}

export interface RawDataPoint {
  [key: string]: any;
}
