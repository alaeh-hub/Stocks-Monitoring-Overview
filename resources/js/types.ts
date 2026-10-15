export type Shift = 'MORNING' | 'NIGHT';
export type PeriodStatus = 'open' | 'entries_locked' | 'closed' | 'unlocked';

export interface ProductRow {
  id: number;
  sku: string | null;
  name: string;
  category: string;
  unit: string;
  online: number;
  offline: number;
  total: number;
  threshold: number | null;
  status?: 'out' | 'low';
}

export interface OnlineMovement {
  entries: number; opening: number; transferIn: number; transferOut: number;
  productionIn: number; fulfillmentOut: number; rts: number; remaining: number;
}
export interface OfflineMovement {
  entries: number; opening: number; transferIn: number; transferOut: number;
  productionIn: number; deliveryOut: number; backloads: number; upsellOut: number; remaining: number;
}

export interface Audit {
  date: string;
  shift: Shift;
  totalCounts: number;
  withVariance: number;
  netVariance: number;
  absVariance: number;
  unpublished: number;
  top: {
    name: string; sku: string | null; unit: string; location: 'ONLINE' | 'OFFLINE' | 'TOTAL';
    system: number; counted: number; variance: number; remarks: string | null;
  }[];
}

export interface Dashboard {
  meta: { generatedAt: string; database: string; lookbackDays: number };
  empty: boolean;
  period: null | {
    date: string; shift: Shift; status: PeriodStatus; closedAt: string | null;
    previous: { date: string; shift: Shift };
  };
  kpis?: {
    remaining: { total: number; online: number; offline: number };
    activeProducts: number;
    productsInStock: number;
    thresholdsSet: number;
    lowStockCount: number;
    outOfStockCount: number;
    productionIn: { value: number; previous: number | null };
    outflow: { value: number; previous: number | null };
    pendingCorrections: number;
    unpublishedCounts: number;
  };
  movement?: { online: OnlineMovement; offline: OfflineMovement };
  trend?: { date: string; production: number; fulfillment: number; delivery: number }[];
  topProducts?: ProductRow[];
  categories?: { category: string; products: number; online: number; offline: number; total: number }[];
  lowStock?: ProductRow[];
  audit?: Audit | null;
  closures?: {
    date: string; shift: Shift; status: PeriodStatus; closedAt: string | null;
    closedBy: string | null; unlockReason: string | null;
  }[];
  activity?: { id: number; table: string; recordId: number; action: 'CREATE' | 'UPDATE' | 'DELETE'; at: string | null; user: string | null }[];
}

export interface ApiError { message: string; detail?: string }
