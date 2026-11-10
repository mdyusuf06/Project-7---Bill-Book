'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BarChart3,
  Clock,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';
import { SalesTrendChart } from './SalesTrendChart';
import { computeDashboardAnalytics } from '@/lib/analytics';
import { triggerHaptic } from '@/lib/haptics';
import { formatINR } from '@/lib/math';
import { useBillStore } from '@/store/useBillStore';
import type { Bill } from '@/types/bill';

interface DashboardViewProps {
  onGoToPos: () => void;
  onGoToSettings: () => void;
}

function formatBillTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timeStr = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  if (isToday) return `Today, ${timeStr}`;

  const dateStr = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(date);
  return `${dateStr}, ${timeStr}`;
}

export function DashboardView({
  onGoToPos,
  onGoToSettings,
}: DashboardViewProps) {
  const bills = useBillStore((s) => s.bills);
  const shopDetails = useBillStore((s) => s.shopDetails);
  const deleteBill = useBillStore((s) => s.deleteBill);
  const hapticsEnabled = useBillStore((s) => s.hapticsEnabled);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const analytics = useMemo(() => computeDashboardAnalytics(bills), [bills]);

  const orderedBills = useMemo(() => {
    const sorted = [...bills].sort((a, b) => b.createdAt - a.createdAt);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;

    return sorted.filter((bill) => {
      if (bill.billNumber.toLowerCase().includes(q)) return true;
      if (bill.customerName?.toLowerCase().includes(q)) return true;
      if (bill.customerPhone?.toLowerCase().includes(q)) return true;
      return bill.items.some((it) => it.name.toLowerCase().includes(q));
    });
  }, [bills, searchQuery]);

  const needsUpiSetup = !shopDetails.upiId.trim();

  return (
    <div className="space-y-4">
      {/* UPI Reminder Banner if not yet set */}
      {needsUpiSetup ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <p className="font-medium leading-snug">
            Add your <span className="font-bold">UPI ID</span> to show instant QR
            payment codes on every thermal bill.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onGoToSettings}
            className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-zinc-900 dark:text-amber-200"
          >
            Set UPI
          </Button>
        </motion.div>
      ) : null}

      {/* Hero Daily Sales Summary */}
      <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/15 dark:border-emerald-500/20 dark:from-emerald-600 dark:via-emerald-700 dark:to-zinc-900">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-semibold uppercase tracking-wider">
                <TrendingUp className="h-3.5 w-3.5" />
                Today&apos;s Sales
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums font-mono-receipt">
                {formatINR(analytics.todayTotal)}
              </div>
              <p className="text-xs text-emerald-100/90">
                {analytics.todayBillCount}{' '}
                {analytics.todayBillCount === 1 ? 'bill' : 'bills'} today
                {analytics.todayBillCount > 0
                  ? ` • Avg ${formatINR(analytics.todayAvgBill)}`
                  : ' • Ready for first order'}
              </p>
            </div>

            <Button
              type="button"
              onClick={() => {
                triggerHaptic('tap', hapticsEnabled);
                onGoToPos();
              }}
              className="shrink-0 bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Bill
            </Button>
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/15 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="block text-emerald-100/75 text-[10px] uppercase tracking-wider">
                Yesterday
              </span>
              <span className="font-mono-receipt font-bold tabular-nums">
                {formatINR(analytics.yesterdayTotal, false)}
              </span>
            </div>
            <div>
              <span className="block text-emerald-100/75 text-[10px] uppercase tracking-wider">
                7-Day Total
              </span>
              <span className="font-mono-receipt font-bold tabular-nums">
                {formatINR(analytics.sevenDayTotal, false)}
              </span>
            </div>
            <div>
              <span className="block text-emerald-100/75 text-[10px] uppercase tracking-wider">
                All-Time
              </span>
              <span className="font-mono-receipt font-bold tabular-nums">
                {analytics.allTimeCount} bills
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7-Day Rolling Sales Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">7-Day Sales Trend</CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Tap any day bar to inspect daily total
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono-receipt tabular-nums">
            {formatINR(analytics.sevenDayTotal, false)}
          </Badge>
        </CardHeader>
        <CardContent>
          <SalesTrendChart
            points={analytics.rolling7Days}
            maxTotal={analytics.maxDailyTotal}
          />
        </CardContent>
      </Card>

      {/* Chronological Bill History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Recent Bills
            </h2>
            <Badge variant="secondary">{bills.length}</Badge>
          </div>
        </div>

        {bills.length > 0 ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill #, customer name, phone, or item..."
              className="pl-10"
            />
          </div>
        ) : null}

        {orderedBills.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 mb-3">
                <ReceiptText className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {bills.length === 0
                  ? 'No bills recorded yet'
                  : 'No bills match your search'}
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-zinc-400">
                {bills.length === 0
                  ? 'Create your first digital bill with automatic GST/discount math and instant UPI QR code.'
                  : 'Try searching by bill number (e.g., BB-1001) or customer name.'}
              </p>
              {bills.length === 0 ? (
                <Button
                  type="button"
                  onClick={onGoToPos}
                  className="mt-4"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Create First Bill
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {orderedBills.map((bill, idx) => {
              const isConfirmingDelete = confirmDeleteId === bill.id;
              const itemsPreview = bill.items
                .slice(0, 2)
                .map((i) => `${i.name} ×${i.quantity}`)
                .join(', ');
              const extraCount = Math.max(0, bill.items.length - 2);

              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, delay: Math.min(idx * 0.02, 0.15) }}
                >
                  <Card className="transition-colors hover:border-emerald-300 dark:hover:border-emerald-500/40">
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('tap', hapticsEnabled);
                            setSelectedBill(bill);
                          }}
                          className="flex-1 text-left cursor-pointer focus:outline-none"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono-receipt text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              {bill.billNumber}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
                              <Clock className="h-3 w-3" />
                              {formatBillTimestamp(bill.createdAt)}
                            </span>
                            {bill.customerName || bill.customerPhone ? (
                              <Badge variant="secondary" className="text-[10px] py-0">
                                <User className="h-2.5 w-2.5" />
                                {bill.customerName || bill.customerPhone}
                              </Badge>
                            ) : null}
                          </div>

                          <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-300 line-clamp-1">
                            {itemsPreview}
                            {extraCount > 0 ? ` +${extraCount} more` : ''}
                          </p>
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('tap', hapticsEnabled);
                              setSelectedBill(bill);
                            }}
                            className="text-right cursor-pointer group"
                          >
                            <div className="font-mono-receipt text-sm font-extrabold text-slate-900 dark:text-white tabular-nums flex items-center gap-0.5">
                              {formatINR(bill.grandTotal)}
                              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                              Tap to share
                            </span>
                          </button>

                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2 text-[11px]"
                                onClick={() => {
                                  triggerHaptic('warning', hapticsEnabled);
                                  deleteBill(bill.id);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                Delete
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-[11px]"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Delete bill ${bill.billNumber}`}
                              onClick={() => setConfirmDeleteId(bill.id)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Preview & Share Modal */}
      <ReceiptModal
        bill={selectedBill}
        open={selectedBill !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedBill(null);
        }}
      />
    </div>
  );
}

