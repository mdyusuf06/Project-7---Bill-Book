'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Minus,
  Percent,
  Plus,
  Receipt,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { triggerHaptic } from '@/lib/haptics';
import { calculateBillTotals, formatINR } from '@/lib/math';
import { useBillStore } from '@/store/useBillStore';
import type { Bill } from '@/types/bill';

const TAX_PRESETS = [0, 5, 12, 18];

interface CartCheckoutPanelProps {
  onBillFinalized: (bill: Bill) => void;
  compactHeader?: boolean;
}

export function CartCheckoutPanel({
  onBillFinalized,
  compactHeader = false,
}: CartCheckoutPanelProps) {
  const draft = useBillStore((s) => s.draft);
  const hapticsEnabled = useBillStore((s) => s.hapticsEnabled);
  const incrementCartItem = useBillStore((s) => s.incrementCartItem);
  const decrementCartItem = useBillStore((s) => s.decrementCartItem);
  const setCartItemQuantity = useBillStore((s) => s.setCartItemQuantity);
  const removeFromCart = useBillStore((s) => s.removeFromCart);
  const setDiscount = useBillStore((s) => s.setDiscount);
  const setTaxRate = useBillStore((s) => s.setTaxRate);
  const setCustomerInfo = useBillStore((s) => s.setCustomerInfo);
  const clearDraft = useBillStore((s) => s.clearDraft);
  const finalizeBill = useBillStore((s) => s.finalizeBill);

  const [showCustomerFields, setShowCustomerFields] = useState(
    Boolean(draft.customerName || draft.customerPhone)
  );

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

  const handleFinalize = () => {
    const bill = finalizeBill();
    if (!bill) return;
    triggerHaptic('success', hapticsEnabled);
    setShowCustomerFields(false);
    onBillFinalized(bill);
  };

  return (
    <div className="flex flex-col h-full">
      {!compactHeader ? (
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold tracking-tight">Current Bill</h3>
          </div>
          {draft.items.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('remove', hapticsEnabled);
                clearDraft();
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
            >
              Clear All
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Scrollable Cart Items + Controls */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {draft.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-3">
              <Receipt className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
              Your bill is empty
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-[220px]">
              Tap items from your catalog or add a custom item to start billing.
            </p>
          </div>
        ) : (
          <>
            {/* Line items */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {summary.lineItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] font-mono-receipt text-slate-500 dark:text-zinc-400 tabular-nums">
                        {formatINR(item.unitPrice)} / {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center rounded-lg border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name}`}
                          onClick={() => {
                            triggerHaptic('remove', hapticsEnabled);
                            decrementCartItem(item.id);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          aria-label={`Quantity for ${item.name}`}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (Number.isNaN(val)) return;
                            setCartItemQuantity(item.id, val);
                          }}
                          className="w-10 bg-transparent text-center font-mono-receipt text-xs font-bold text-slate-900 dark:text-white focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label={`Increase ${item.name}`}
                          onClick={() => {
                            triggerHaptic('tap', hapticsEnabled);
                            incrementCartItem(item.id);
                          }}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-mono-receipt text-xs font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                        {formatINR(item.lineTotal)}
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => {
                          triggerHaptic('remove', hapticsEnabled);
                          removeFromCart(item.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <Separator dashed />

            {/* Discount Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">Discount</Label>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap', hapticsEnabled);
                      setDiscount('percent', 0);
                    }}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      draft.discountType === 'percent'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                        : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    <Percent className="h-3 w-3" />%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap', hapticsEnabled);
                      setDiscount('flat', 0);
                    }}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      draft.discountType === 'flat'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                        : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    ₹ Flat
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={draft.discountType === 'percent' ? '100' : undefined}
                  step="any"
                  placeholder={
                    draft.discountType === 'percent' ? '0 %' : '0.00 ₹'
                  }
                  value={draft.discountValue === 0 ? '' : String(draft.discountValue)}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    setDiscount(
                      draft.discountType,
                      Number.isNaN(parsed) ? 0 : parsed
                    );
                  }}
                  className="h-9 font-mono-receipt text-sm tabular-nums"
                />
                {draft.discountType === 'percent' ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {[5, 10].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap', hapticsEnabled);
                          setDiscount('percent', pct);
                        }}
                        className={`h-9 px-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          draft.discountValue === pct
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* GST / Tax Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">GST / Tax (%)</Label>
                <span className="font-mono-receipt text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                  {summary.taxRate}% (+{formatINR(summary.taxAmount)})
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {TAX_PRESETS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap', hapticsEnabled);
                      setTaxRate(rate);
                    }}
                    className={`h-9 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      draft.taxRate === rate
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="any"
                  aria-label="Custom GST percentage"
                  placeholder="Custom"
                  value={
                    TAX_PRESETS.includes(draft.taxRate)
                      ? ''
                      : String(draft.taxRate)
                  }
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    setTaxRate(Number.isNaN(parsed) ? 0 : parsed);
                  }}
                  className="h-9 px-2 text-center font-mono-receipt text-xs"
                />
              </div>
            </div>

            {/* Optional Customer Tagging */}
            <div className="space-y-2">
              {!showCustomerFields ? (
                <button
                  type="button"
                  onClick={() => setShowCustomerFields(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Customer Tag (optional)
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-2 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Customer Tag</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerInfo('', '');
                        setShowCustomerFields(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={draft.customerName}
                      onChange={(e) =>
                        setCustomerInfo(e.target.value, draft.customerPhone)
                      }
                      placeholder="Customer name"
                      className="h-9 text-xs"
                    />
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={draft.customerPhone}
                      onChange={(e) =>
                        setCustomerInfo(draft.customerName, e.target.value)
                      }
                      placeholder="Phone number"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Totals & Finalize Sticky Footer */}
      {draft.items.length > 0 ? (
        <div className="border-t border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900/90 px-4 py-3.5 space-y-3">
          <div className="space-y-1 text-xs font-mono-receipt tabular-nums">
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span>{formatINR(summary.subtotal)}</span>
            </div>
            {summary.discountAmount > 0 ? (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                <span>
                  Discount (
                  {summary.discountType === 'percent'
                    ? `${summary.discountValue}%`
                    : 'Flat'}
                  )
                </span>
                <span>-{formatINR(summary.discountAmount)}</span>
              </div>
            ) : null}
            {summary.taxAmount > 0 ? (
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>GST ({summary.taxRate}%)</span>
                <span>+{formatINR(summary.taxAmount)}</span>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between pt-1.5 border-t border-slate-200 dark:border-zinc-800">
              <span className="font-sans text-sm font-extrabold text-slate-900 dark:text-white">
                Grand Total
              </span>
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {formatINR(summary.grandTotal)}
              </span>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={handleFinalize}
            className="w-full font-bold shadow-md shadow-emerald-600/20"
          >
            <CheckCircle2 className="h-5 w-5" />
            Generate Bill &amp; UPI QR
          </Button>
        </div>
      ) : null}
    </div>
  );
}

