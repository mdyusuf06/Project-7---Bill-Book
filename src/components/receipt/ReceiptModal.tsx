'use client';

import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  Loader2,
  Share2,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BillReceipt } from './BillReceipt';
import {
  exportAndDownloadReceipt,
  shareReceiptImage,
  type ImageFormat,
} from '@/lib/exportReceipt';
import { triggerHaptic } from '@/lib/haptics';
import { useBillStore } from '@/store/useBillStore';
import type { Bill } from '@/types/bill';

interface ReceiptModalProps {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNewBill?: boolean;
}

export function ReceiptModal({
  bill,
  open,
  onOpenChange,
  isNewBill = false,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const hapticsEnabled = useBillStore((s) => s.hapticsEnabled);
  const [format, setFormat] = useState<ImageFormat>('png');
  const [busyAction, setBusyAction] = useState<'share' | 'download' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!bill) return null;

  const handleShare = async () => {
    if (!receiptRef.current || busyAction) return;
    setBusyAction('share');
    setStatusMessage(null);
    try {
      triggerHaptic('tap', hapticsEnabled);
      const res = await shareReceiptImage(receiptRef.current, bill, format);
      setStatusMessage(res.message);
      if (res.outcome === 'shared' || res.outcome === 'downloaded') {
        triggerHaptic('success', hapticsEnabled);
      }
    } catch {
      setStatusMessage('Could not capture receipt image. Please try Download.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownload = async () => {
    if (!receiptRef.current || busyAction) return;
    setBusyAction('download');
    setStatusMessage(null);
    try {
      triggerHaptic('tap', hapticsEnabled);
      await exportAndDownloadReceipt(receiptRef.current, bill, format);
      setStatusMessage(`Saved ${bill.billNumber}.${format === 'jpeg' ? 'jpg' : 'png'}`);
      triggerHaptic('success', hapticsEnabled);
    } catch {
      setStatusMessage('Failed to export receipt image.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setStatusMessage(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-slate-100 dark:border-zinc-800/80 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 pr-8">
            {isNewBill ? (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <div>
              <DialogTitle className="text-base">
                {isNewBill ? `Bill ${bill.billNumber} Created` : `Receipt ${bill.billNumber}`}
              </DialogTitle>
              <DialogDescription>
                Share directly to WhatsApp or download thermal slip
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Receipt Preview */}
        <div className="overflow-y-auto px-4 py-4 bg-slate-100/80 dark:bg-zinc-950/70 max-h-[58dvh]">
          <BillReceipt ref={receiptRef} bill={bill} />
        </div>

        {/* Controls Footer */}
        <div className="border-t border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121318] px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500 dark:text-zinc-400">
              Export Format
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-zinc-800">
              {(['png', 'jpeg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                    format === fmt
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {statusMessage ? (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={busyAction !== null}
              className="w-full"
            >
              {busyAction === 'download' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Save {format.toUpperCase()}
            </Button>

            <Button
              type="button"
              onClick={handleShare}
              disabled={busyAction !== null}
              className="w-full"
            >
              {busyAction === 'share' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share Receipt
            </Button>
          </div>

          {bill.upiUri ? (
            <a
              href={bill.upiUri}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open UPI App on this Device
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

