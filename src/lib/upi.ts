import { roundCurrency } from './math';

export interface UpiParams {
  upiId: string;
  shopName: string;
  amount: number;
}

/**
 * Generates a strict NPCI UPI Intent URI:
 * upi://pay?pa=<UPI_ID>&pn=<SHOP_NAME>&am=<TOTAL>&cu=INR
 */
export function buildUpiUri({ upiId, shopName, amount }: UpiParams): string {
  const cleanPa = upiId.trim().replace(/[&=?\s#]/g, '');
  if (!cleanPa) return '';

  const cleanPn = encodeURIComponent(shopName.trim() || 'Shopkeeper');
  const safeAmount = Math.max(0, roundCurrency(amount)).toFixed(2);

  return `upi://pay?pa=${cleanPa}&pn=${cleanPn}&am=${safeAmount}&cu=INR`;
}

export function isValidUpiId(upiId: string): boolean {
  const trimmed = upiId.trim();
  if (!trimmed) return false;
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(trimmed);
}

