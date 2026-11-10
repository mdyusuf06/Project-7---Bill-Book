import type { BillLineItem, CartItem, DiscountType } from '@/types/bill';

/**
 * Deterministic currency rounding to 2 decimal places.
 * Uses decimal-string exponent shifting for standard decimals to avoid
 * binary floating-point edge cases (e.g. 1.005 -> 1.01, 0.1 + 0.2 -> 0.30).
 */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;

  const str = String(value);
  if (!str.includes('e') && !str.includes('E')) {
    const shifted = Number(`${Math.round(Number(`${str}e2`))}e-2`);
    if (Number.isFinite(shifted)) {
      return Object.is(shifted, -0) ? 0 : Number(shifted.toFixed(2));
    }
  }

  const rounded = Number((Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Converts a rupee amount into integer paise for exact addition/subtraction. */
export function toPaise(rupees: number): number {
  return Math.round(roundCurrency(rupees) * 100);
}

/** Converts integer paise back to a 2-decimal rupee number. */
export function fromPaise(paise: number): number {
  return roundCurrency(paise / 100);
}

export function addCurrency(a: number, b: number): number {
  return fromPaise(toPaise(a) + toPaise(b));
}

export function subCurrency(a: number, b: number): number {
  return fromPaise(toPaise(a) - toPaise(b));
}

export interface CalculatedBillSummary {
  lineItems: BillLineItem[];
  itemCount: number;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
}

export function calculateBillTotals(
  items: CartItem[],
  discountType: DiscountType,
  rawDiscountValue: number,
  rawTaxRate: number
): CalculatedBillSummary {
  const lineItems: BillLineItem[] = items
    .filter((item) => item.quantity > 0 && item.unitPrice >= 0)
    .map((item) => {
      const unitPrice = roundCurrency(item.unitPrice);
      const quantity = Math.max(0, Number(item.quantity.toFixed(3)));
      const lineTotal = roundCurrency(unitPrice * quantity);
      return {
        id: item.id,
        name: item.name,
        unitPrice,
        quantity,
        unit: item.unit || 'pc',
        lineTotal,
      };
    });

  const subtotalPaise = lineItems.reduce((sum, item) => sum + toPaise(item.lineTotal), 0);
  const subtotal = fromPaise(subtotalPaise);

  const safeDiscountInput = Number.isFinite(rawDiscountValue)
    ? Math.max(0, rawDiscountValue)
    : 0;

  let discountValue = safeDiscountInput;
  let discountAmount = 0;

  if (discountType === 'percent') {
    discountValue = Math.min(100, roundCurrency(safeDiscountInput));
    discountAmount = roundCurrency((subtotal * discountValue) / 100);
  } else {
    discountValue = Math.min(subtotal, roundCurrency(safeDiscountInput));
    discountAmount = discountValue;
  }

  // Clamp discountAmount so taxableAmount is never negative
  if (toPaise(discountAmount) > subtotalPaise) {
    discountAmount = subtotal;
  }

  const taxablePaise = Math.max(0, subtotalPaise - toPaise(discountAmount));
  const taxableAmount = fromPaise(taxablePaise);

  const taxRate = Number.isFinite(rawTaxRate)
    ? Math.min(100, Math.max(0, roundCurrency(rawTaxRate)))
    : 0;

  const taxAmount = roundCurrency((taxableAmount * taxRate) / 100);
  const cgstAmount = roundCurrency(taxAmount / 2);
  const sgstAmount = subCurrency(taxAmount, cgstAmount);

  const grandTotal = fromPaise(taxablePaise + toPaise(taxAmount));

  const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    lineItems,
    itemCount: Number(itemCount.toFixed(3)),
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    cgstAmount,
    sgstAmount,
    grandTotal,
  };
}

const inrFormatter2 = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrFormatterCompact = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number, alwaysShowDecimals = true): string {
  const safe = roundCurrency(amount);
  return `₹${alwaysShowDecimals ? inrFormatter2.format(safe) : inrFormatterCompact.format(safe)}`;
}

export function formatReceiptNumber(amount: number): string {
  return inrFormatter2.format(roundCurrency(amount));
}

