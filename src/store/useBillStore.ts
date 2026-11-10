'use client';

import { del as idbDel, get as idbGet, set as idbSet } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { calculateBillTotals, roundCurrency } from '@/lib/math';
import { buildUpiUri } from '@/lib/upi';
import { createId } from '@/lib/utils';
import type {
  Bill,
  DiscountType,
  DraftBillState,
  InventoryItem,
  ShopDetails,
  ThemeMode,
} from '@/types/bill';

const STORAGE_KEY = 'bill-book-offline-store-v1';

const STARTER_INVENTORY: Omit<InventoryItem, 'id' | 'createdAt'>[] = [
  { name: 'Full Cream Milk 500ml', price: 33, unit: 'pack', category: 'Dairy' },
  { name: 'Whole Wheat Bread', price: 45, unit: 'loaf', category: 'Bakery' },
  { name: 'Basmati Rice 1kg', price: 115, unit: 'kg', category: 'Grains' },
  { name: 'Refined Cooking Oil 1L', price: 148, unit: 'btl', category: 'Essentials' },
  { name: 'Toor Dal 1kg', price: 162, unit: 'kg', category: 'Grains' },
  { name: 'Tea Powder 250g', price: 95, unit: 'pack', category: 'Beverages' },
  { name: 'Sugar 1kg', price: 46, unit: 'kg', category: 'Essentials' },
  { name: 'Farm Eggs (6 pcs)', price: 48, unit: 'tray', category: 'Dairy' },
  { name: 'Butter 100g', price: 58, unit: 'pack', category: 'Dairy' },
  { name: 'Mineral Water 1L', price: 20, unit: 'btl', category: 'Beverages' },
];

function createStarterInventory(): InventoryItem[] {
  const baseTime = Date.now();
  return STARTER_INVENTORY.map((item, idx) => ({
    ...item,
    id: `starter_${idx + 1}`,
    createdAt: baseTime - (STARTER_INVENTORY.length - idx) * 1000,
  }));
}

const DEFAULT_SHOP_DETAILS: ShopDetails = {
  shopName: 'Apna Kirana & General Store',
  phone: '',
  upiId: '',
  address: 'Main Market Road',
  gstin: '',
  defaultTaxRate: 0,
};

const createEmptyDraft = (defaultTaxRate = 0): DraftBillState => ({
  items: [],
  discountType: 'percent',
  discountValue: 0,
  taxRate: defaultTaxRate,
  customerName: '',
  customerPhone: '',
});

const offlineStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const value = await idbGet<string>(name);
      if (value !== undefined) return value;
    } catch {
      // Fallback to localStorage when IndexedDB is unavailable
    }
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await idbSet(name, value);
      return;
    } catch {
      // Fallback to localStorage if IndexedDB fails
    }
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Ignore storage quota errors
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await idbDel(name);
    } catch {
      // Ignore
    }
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore
    }
  },
};

export interface BillStoreState {
  hasHydrated: boolean;
  theme: ThemeMode;
  hapticsEnabled: boolean;
  shopDetails: ShopDetails;
  inventory: InventoryItem[];
  bills: Bill[];
  nextBillSeq: number;
  draft: DraftBillState;

  setHasHydrated: (hydrated: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setHapticsEnabled: (enabled: boolean) => void;

  updateShopDetails: (updates: Partial<ShopDetails>) => void;

  addInventoryItem: (item: {
    name: string;
    price: number;
    unit?: string;
    category?: string;
  }) => InventoryItem;
  updateInventoryItem: (
    id: string,
    updates: Partial<Omit<InventoryItem, 'id' | 'createdAt'>>
  ) => void;
  deleteInventoryItem: (id: string) => void;
  loadStarterInventory: () => void;

  addToCart: (
    item: { id: string; name: string; unitPrice: number; unit?: string },
    qty?: number
  ) => void;
  setCartItemQuantity: (id: string, quantity: number) => void;
  incrementCartItem: (id: string) => void;
  decrementCartItem: (id: string) => void;
  removeFromCart: (id: string) => void;
  setDiscount: (discountType: DiscountType, discountValue: number) => void;
  setTaxRate: (taxRate: number) => void;
  setCustomerInfo: (customerName: string, customerPhone: string) => void;
  clearDraft: () => void;

  finalizeBill: () => Bill | null;
  deleteBill: (id: string) => void;
  clearAllBills: () => void;
}

export const useBillStore = create<BillStoreState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      theme: 'light',
      hapticsEnabled: true,
      shopDetails: DEFAULT_SHOP_DETAILS,
      inventory: createStarterInventory(),
      bills: [],
      nextBillSeq: 1001,
      draft: createEmptyDraft(0),

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),

      updateShopDetails: (updates) =>
        set((state) => {
          const nextShop = {
            ...state.shopDetails,
            ...updates,
            defaultTaxRate:
              updates.defaultTaxRate !== undefined
                ? Math.min(100, Math.max(0, roundCurrency(updates.defaultTaxRate)))
                : state.shopDetails.defaultTaxRate,
          };
          const syncDraftTax =
            updates.defaultTaxRate !== undefined && state.draft.items.length === 0
              ? { ...state.draft, taxRate: nextShop.defaultTaxRate }
              : state.draft;
          return { shopDetails: nextShop, draft: syncDraftTax };
        }),

      addInventoryItem: ({ name, price, unit = 'pc', category = 'General' }) => {
        const newItem: InventoryItem = {
          id: createId('itm'),
          name: name.trim(),
          price: Math.max(0, roundCurrency(price)),
          unit: unit.trim() || 'pc',
          category: category.trim() || 'General',
          createdAt: Date.now(),
        };
        set((state) => ({
          inventory: [newItem, ...state.inventory],
        }));
        return newItem;
      },

      updateInventoryItem: (id, updates) =>
        set((state) => ({
          inventory: state.inventory.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...updates,
                  name: updates.name !== undefined ? updates.name.trim() : item.name,
                  price:
                    updates.price !== undefined
                      ? Math.max(0, roundCurrency(updates.price))
                      : item.price,
                  unit:
                    updates.unit !== undefined
                      ? updates.unit.trim() || 'pc'
                      : item.unit,
                  category:
                    updates.category !== undefined
                      ? updates.category.trim() || 'General'
                      : item.category,
                }
              : item
          ),
        })),

      deleteInventoryItem: (id) =>
        set((state) => ({
          inventory: state.inventory.filter((item) => item.id !== id),
        })),

      loadStarterInventory: () =>
        set((state) => {
          const existingNames = new Set(
            state.inventory.map((i) => i.name.toLowerCase())
          );
          const additions = createStarterInventory().filter(
            (s) => !existingNames.has(s.name.toLowerCase())
          );
          return { inventory: [...state.inventory, ...additions] };
        }),

      addToCart: (item, qty = 1) =>
        set((state) => {
          const existing = state.draft.items.find((c) => c.id === item.id);
          const safeQty = Math.max(0.01, Number(qty.toFixed(3)));
          const nextItems = existing
            ? state.draft.items.map((c) =>
                c.id === item.id
                  ? { ...c, quantity: Number((c.quantity + safeQty).toFixed(3)) }
                  : c
              )
            : [
                ...state.draft.items,
                {
                  id: item.id,
                  name: item.name,
                  unitPrice: Math.max(0, roundCurrency(item.unitPrice)),
                  quantity: safeQty,
                  unit: item.unit || 'pc',
                },
              ];

          return {
            draft: {
              ...state.draft,
              items: nextItems,
            },
          };
        }),

      setCartItemQuantity: (id, quantity) =>
        set((state) => {
          const safeQty = Number(quantity.toFixed(3));
          const nextItems =
            safeQty <= 0
              ? state.draft.items.filter((c) => c.id !== id)
              : state.draft.items.map((c) =>
                  c.id === id ? { ...c, quantity: safeQty } : c
                );
          return {
            draft: {
              ...state.draft,
              items: nextItems,
            },
          };
        }),

      incrementCartItem: (id) =>
        set((state) => ({
          draft: {
            ...state.draft,
            items: state.draft.items.map((c) =>
              c.id === id
                ? { ...c, quantity: Number((c.quantity + 1).toFixed(3)) }
                : c
            ),
          },
        })),

      decrementCartItem: (id) =>
        set((state) => {
          const nextItems = state.draft.items
            .map((c) =>
              c.id === id
                ? { ...c, quantity: Number((c.quantity - 1).toFixed(3)) }
                : c
            )
            .filter((c) => c.quantity > 0);
          return {
            draft: {
              ...state.draft,
              items: nextItems,
            },
          };
        }),

      removeFromCart: (id) =>
        set((state) => ({
          draft: {
            ...state.draft,
            items: state.draft.items.filter((c) => c.id !== id),
          },
        })),

      setDiscount: (discountType, discountValue) =>
        set((state) => ({
          draft: {
            ...state.draft,
            discountType,
            discountValue: Number.isFinite(discountValue)
              ? Math.max(0, roundCurrency(discountValue))
              : 0,
          },
        })),

      setTaxRate: (taxRate) =>
        set((state) => ({
          draft: {
            ...state.draft,
            taxRate: Number.isFinite(taxRate)
              ? Math.min(100, Math.max(0, roundCurrency(taxRate)))
              : 0,
          },
        })),

      setCustomerInfo: (customerName, customerPhone) =>
        set((state) => ({
          draft: {
            ...state.draft,
            customerName,
            customerPhone,
          },
        })),

      clearDraft: () =>
        set((state) => ({
          draft: createEmptyDraft(state.shopDetails.defaultTaxRate),
        })),

      finalizeBill: () => {
        const state = get();
        if (state.draft.items.length === 0) return null;

        const summary = calculateBillTotals(
          state.draft.items,
          state.draft.discountType,
          state.draft.discountValue,
          state.draft.taxRate
        );

        if (summary.lineItems.length === 0) return null;

        const seq = state.nextBillSeq;
        const billNumber = `BB-${seq}`;
        const upiUri = buildUpiUri({
          upiId: state.shopDetails.upiId,
          shopName: state.shopDetails.shopName,
          amount: summary.grandTotal,
        });

        const cleanCustName = state.draft.customerName.trim();
        const cleanCustPhone = state.draft.customerPhone.trim();

        const newBill: Bill = {
          id: createId('bill'),
          billNumber,
          createdAt: Date.now(),
          items: summary.lineItems,
          subtotal: summary.subtotal,
          discountType: summary.discountType,
          discountValue: summary.discountValue,
          discountAmount: summary.discountAmount,
          taxableAmount: summary.taxableAmount,
          taxRate: summary.taxRate,
          taxAmount: summary.taxAmount,
          grandTotal: summary.grandTotal,
          customerName: cleanCustName || undefined,
          customerPhone: cleanCustPhone || undefined,
          upiUri: upiUri || undefined,
          shopSnapshot: {
            shopName: state.shopDetails.shopName.trim() || 'My Shop',
            phone: state.shopDetails.phone.trim(),
            upiId: state.shopDetails.upiId.trim(),
            address: state.shopDetails.address.trim(),
            gstin: state.shopDetails.gstin.trim(),
          },
        };

        set({
          bills: [newBill, ...state.bills],
          nextBillSeq: seq + 1,
          draft: createEmptyDraft(state.shopDetails.defaultTaxRate),
        });

        return newBill;
      },

      deleteBill: (id) =>
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== id),
        })),

      clearAllBills: () => set({ bills: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => offlineStorage),
      partialize: (state) => ({
        theme: state.theme,
        hapticsEnabled: state.hapticsEnabled,
        shopDetails: state.shopDetails,
        inventory: state.inventory,
        bills: state.bills,
        nextBillSeq: state.nextBillSeq,
        draft: state.draft,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

