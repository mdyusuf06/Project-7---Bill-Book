'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Minus,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';
import { CartCheckoutPanel } from './CartCheckoutPanel';
import { triggerHaptic } from '@/lib/haptics';
import { calculateBillTotals, formatINR } from '@/lib/math';
import { createId } from '@/lib/utils';
import { useBillStore } from '@/store/useBillStore';
import type { Bill } from '@/types/bill';

export function PosView() {
  const inventory = useBillStore((s) => s.inventory);
  const draft = useBillStore((s) => s.draft);
  const hapticsEnabled = useBillStore((s) => s.hapticsEnabled);
  const addToCart = useBillStore((s) => s.addToCart);
  const incrementCartItem = useBillStore((s) => s.incrementCartItem);
  const decrementCartItem = useBillStore((s) => s.decrementCartItem);
  const clearDraft = useBillStore((s) => s.clearDraft);
  const addInventoryItem = useBillStore((s) => s.addInventoryItem);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Custom / ad-hoc item modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customUnit, setCustomUnit] = useState('pc');
  const [saveCustomToInventory, setSaveCustomToInventory] = useState(false);

  // Finalized receipt preview state
  const [finalizedBill, setFinalizedBill] = useState<Bill | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const item of inventory) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [inventory, search, selectedCategory]);

  const cartQtyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of draft.items) {
      map.set(c.id, c.quantity);
    }
    return map;
  }, [draft.items]);

  const summary = useMemo(
    () =>
      calculateBillTotals(
        draft.items,
        draft.discountType,
        draft.discountValue,
        draft.taxRate
      ),
    [draft.items, draft.discountType, draft.discountValue, draft.taxRate]
  );

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = customName.trim();
    const price = parseFloat(customPrice);
    const qty = parseFloat(customQty);

    if (!trimmedName || Number.isNaN(price) || price < 0) return;
    const safeQty = Number.isNaN(qty) || qty <= 0 ? 1 : qty;

    let itemId = createId('custom');
    if (saveCustomToInventory) {
      const saved = addInventoryItem({
        name: trimmedName,
        price,
        unit: customUnit.trim() || 'pc',
        category: 'General',
      });
      itemId = saved.id;
    }

    addToCart(
      {
        id: itemId,
        name: trimmedName,
        unitPrice: price,
        unit: customUnit.trim() || 'pc',
      },
      safeQty
    );

    triggerHaptic('tap', hapticsEnabled);
    setCustomName('');
    setCustomPrice('');
    setCustomQty('1');
    setCustomUnit('pc');
    setSaveCustomToInventory(false);
    setCustomModalOpen(false);
  };

  const handleBillFinalized = (bill: Bill) => {
    setMobileCartOpen(false);
    setFinalizedBill(bill);
    setReceiptOpen(true);
  };

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-5 items-start">
      {/* Left Column: Search, Categories & Tap-to-Add Grid */}
      <div className="lg:col-span-7 space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items to add..."
              className="pl-10"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              triggerHaptic('tap', hapticsEnabled);
              setCustomModalOpen(true);
            }}
            className="shrink-0 gap-1.5"
          >
            <PackagePlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Custom Item</span>
            <span className="sm:hidden">Custom</span>
          </Button>
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  triggerHaptic('tap', hapticsEnabled);
                  setSelectedCategory(cat);
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500 dark:text-zinc-950'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Custom / Ad-hoc Items Currently in Cart that aren't in Inventory */}
        {draft.items.some((c) => !inventory.some((inv) => inv.id === c.id)) ? (
          <div className="flex flex-wrap gap-1.5">
            {draft.items
              .filter((c) => !inventory.some((inv) => inv.id === c.id))
              .map((customItem) => (
                <Badge key={customItem.id} variant="amber" className="py-1 px-2.5">
                  {customItem.name} ×{customItem.quantity} (
                  {formatINR(customItem.unitPrice)})
                </Badge>
              ))}
          </div>
        ) : null}

        {/* Inventory Grid */}
        {filteredInventory.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
              No matching inventory items
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Use &ldquo;Custom Item&rdquo; above or add items in the Inventory tab.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-20 lg:pb-4">
            {filteredInventory.map((item) => {
              const inCartQty = cartQtyById.get(item.id) ?? 0;

              return (
                <motion.div
                  key={item.id}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3 transition-all ${
                    inCartQty > 0
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30 dark:border-emerald-500/70 dark:bg-emerald-500/10'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-[#121318] dark:hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap', hapticsEnabled);
                      addToCart({
                        id: item.id,
                        name: item.name,
                        unitPrice: item.price,
                        unit: item.unit,
                      });
                    }}
                    className="text-left flex-1 cursor-pointer focus:outline-none"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        {item.category}
                      </span>
                      {inCartQty > 0 ? (
                        <motion.span
                          initial={{ scale: 0.7 }}
                          animate={{ scale: 1 }}
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 font-mono-receipt text-[11px] font-bold text-white dark:bg-emerald-500 dark:text-zinc-950 tabular-nums"
                        >
                          {inCartQty}
                        </motion.span>
                      ) : null}
                    </div>

                    <p className="mt-1.5 text-sm font-bold leading-snug text-slate-900 dark:text-zinc-100 line-clamp-2">
                      {item.name}
                    </p>

                    <div className="mt-2.5 flex items-baseline gap-1">
                      <span className="font-mono-receipt text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatINR(item.price, false)}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                        / {item.unit}
                      </span>
                    </div>
                  </button>

                  {inCartQty > 0 ? (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        aria-label={`Remove one ${item.name}`}
                        onClick={() => {
                          triggerHaptic('remove', hapticsEnabled);
                          decrementCartItem(item.id);
                        }}
                        className="flex h-7 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200 cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono-receipt text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                        {inCartQty} {item.unit}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${item.name}`}
                        onClick={() => {
                          triggerHaptic('tap', hapticsEnabled);
                          incrementCartItem(item.id);
                        }}
                        className="flex h-7 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Desktop Sticky Split-View Cart */}
      <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-20">
        <Card className="overflow-hidden max-h-[calc(100dvh-9.5rem)] flex flex-col">
          <CartCheckoutPanel onBillFinalized={handleBillFinalized} />
        </Card>
      </div>

      {/* Mobile Floating Cart Review Bar */}
      {draft.items.length > 0 ? (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-[4.75rem] z-30 mx-auto max-w-xl px-3 lg:hidden"
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap', hapticsEnabled);
              setMobileCartOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-xl shadow-emerald-950/25 ring-1 ring-emerald-400/30 transition-transform active:scale-[0.98] dark:bg-emerald-500 dark:text-zinc-950 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 dark:bg-zinc-950/15">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                  {summary.lineItems.length}{' '}
                  {summary.lineItems.length === 1 ? 'Item' : 'Items'} •{' '}
                  {summary.itemCount} Qty
                </p>
                <p className="font-mono-receipt text-base font-extrabold tabular-nums">
                  {formatINR(summary.grandTotal)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold dark:bg-zinc-950/15">
              Review &amp; Bill
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        </motion.div>
      ) : null}

      {/* Mobile Cart & Checkout Sheet Dialog */}
      <Dialog open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <DialogContent className="p-0 max-w-md">
          <DialogHeader className="border-b border-slate-100 dark:border-zinc-800 px-4 pt-4 pb-3 flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base">Review Bill</DialogTitle>
              <DialogDescription>
                Adjust quantities, discount, GST &amp; customer tag
              </DialogDescription>
            </div>
            {draft.items.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('remove', hapticsEnabled);
                  clearDraft();
                  setMobileCartOpen(false);
                }}
                className="mr-8 text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
              >
                Clear
              </button>
            ) : null}
          </DialogHeader>

          <div className="max-h-[76dvh] overflow-hidden flex flex-col">
            <CartCheckoutPanel
              compactHeader
              onBillFinalized={handleBillFinalized}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Quick-Add Item Dialog */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogDescription>
              Quickly add any non-catalog or loose item to this bill
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustomItem} className="px-5 pb-5 space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="custom-item-name">Item Name</Label>
              <Input
                id="custom-item-name"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Loose Jaggery 1kg"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="custom-item-price">Price (₹)</Label>
                <Input
                  id="custom-item-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  required
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="65"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-item-qty">Qty</Label>
                <Input
                  id="custom-item-qty"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="any"
                  required
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  placeholder="1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-item-unit">Unit</Label>
                <Input
                  id="custom-item-unit"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="pc"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveCustomToInventory}
                onChange={(e) => setSaveCustomToInventory(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
              />
              Also save to permanent inventory
            </label>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setCustomModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add to Bill
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Finalized Receipt Modal */}
      <ReceiptModal
        bill={finalizedBill}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        isNewBill
      />
    </div>
  );
}

