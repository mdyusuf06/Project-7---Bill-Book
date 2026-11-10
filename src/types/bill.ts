export type DiscountType = 'percent' | 'flat';

export type AppTab = 'dashboard' | 'pos' | 'settings';

export type ThemeMode = 'light' | 'dark';

export interface ShopDetails {
  shopName: string;
  phone: string;
  upiId: string;
  address: string;
  gstin: string;
  defaultTaxRate: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: string;
  createdAt: number;
}

export interface CartItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit: string;
}

export interface BillLineItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  lineTotal: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  createdAt: number;
  items: BillLineItem[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  customerName?: string;
  customerPhone?: string;
  upiUri?: string;
  shopSnapshot: {
    shopName: string;
    phone: string;
    upiId: string;
    address: string;
    gstin: string;
  };
}

export interface DraftBillState {
  items: CartItem[];
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  customerName: string;
  customerPhone: string;
}

