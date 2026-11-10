import { toBlob, toJpeg, toPng } from 'html-to-image';
import type { Bill } from '@/types/bill';
import { formatINR } from './math';

export type ImageFormat = 'png' | 'jpeg';

export interface ExportResult {
  outcome: 'shared' | 'downloaded' | 'cancelled';
  message: string;
}

const CAPTURE_OPTIONS = {
  pixelRatio: 3,
  backgroundColor: '#e2e8f0',
  cacheBust: false,
  skipAutoScale: true,
};

export async function captureReceiptBlob(
  element: HTMLElement,
  format: ImageFormat = 'png'
): Promise<Blob> {
  if (format === 'jpeg') {
    const dataUrl = await toJpeg(element, {
      ...CAPTURE_OPTIONS,
      quality: 0.96,
    });
    const res = await fetch(dataUrl);
    return res.blob();
  }

  const blob = await toBlob(element, CAPTURE_OPTIONS);
  if (blob) return blob;

  const dataUrl = await toPng(element, CAPTURE_OPTIONS);
  const res = await fetch(dataUrl);
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function exportAndDownloadReceipt(
  element: HTMLElement,
  bill: Bill,
  format: ImageFormat = 'png'
): Promise<void> {
  const blob = await captureReceiptBlob(element, format);
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const safeNum = bill.billNumber.replace(/[^a-zA-Z0-9_-]/g, '-');
  downloadBlob(blob, `${safeNum}.${ext}`);
}

export async function shareReceiptImage(
  element: HTMLElement,
  bill: Bill,
  format: ImageFormat = 'png'
): Promise<ExportResult> {
  const blob = await captureReceiptBlob(element, format);
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const safeNum = bill.billNumber.replace(/[^a-zA-Z0-9_-]/g, '-');
  const file = new File([blob], `${safeNum}.${ext}`, { type: mime });

  const shopName = bill.shopSnapshot.shopName || 'Bill Book';
  const shareText = [
    `${shopName} — Receipt ${bill.billNumber}`,
    `Total: ${formatINR(bill.grandTotal)}`,
    bill.customerName ? `Customer: ${bill.customerName}` : '',
    bill.shopSnapshot.upiId ? `UPI: ${bill.shopSnapshot.upiId}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: `Bill ${bill.billNumber} — ${shopName}`,
        text: shareText,
        files: [file],
      });
      return {
        outcome: 'shared',
        message: 'Receipt shared successfully.',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          outcome: 'cancelled',
          message: 'Share cancelled.',
        };
      }
      // Fall through to direct download on unexpected share API error
    }
  }

  downloadBlob(blob, `${safeNum}.${ext}`);
  return {
    outcome: 'downloaded',
    message: `Saved ${safeNum}.${ext} (native share unavailable on this browser).`,
  };
}

