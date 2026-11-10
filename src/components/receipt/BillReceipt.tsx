'use client';

import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatReceiptNumber, roundCurrency } from '@/lib/math';
import type { Bill } from '@/types/bill';

interface BillReceiptProps {
  bill: Bill;
}

function formatReceiptDateTime(timestamp: number): { date: string; time: string } {
  const d = new Date(timestamp);
  const date = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return { date, time };
}

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '');
}

export const BillReceipt = forwardRef<HTMLDivElement, BillReceiptProps>(
  function BillReceipt({ bill }, ref) {
    const { date, time } = formatReceiptDateTime(bill.createdAt);
    const hasDiscount = bill.discountAmount > 0;
    const hasTax = bill.taxRate > 0 && bill.taxAmount > 0;
    const halfTax = roundCurrency(bill.taxAmount / 2);
    const otherHalfTax = roundCurrency(bill.taxAmount - halfTax);
    const halfRate = roundCurrency(bill.taxRate / 2);

    return (
      <div
        ref={ref}
        className="w-full max-w-[356px] mx-auto p-3.5 bg-[#e2e8f0] rounded-2xl select-none"
      >
        <div className="relative bg-white text-slate-900 shadow-lg shadow-slate-900/10">
          {/* Top thermal perforation strip */}
          <div className="h-2 w-full bg-[repeating-linear-gradient(90deg,#f8fafc_0px,#f8fafc_6px,#e2e8f0_6px,#e2e8f0_10px)] border-b border-slate-200/80" />

          <div className="px-5 pt-4 pb-5 font-mono-receipt">
            {/* Shop Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center rounded-full border border-slate-300 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.2em] uppercase text-slate-500 mb-1">
                Tax / Cash Memo
              </div>
              <h2 className="font-sans text-lg font-extrabold tracking-tight uppercase text-slate-950 leading-tight">
                {bill.shopSnapshot.shopName}
              </h2>
              {bill.shopSnapshot.address ? (
                <p className="text-[11px] text-slate-600 leading-snug">
                  {bill.shopSnapshot.address}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                {bill.shopSnapshot.phone ? (
                  <span>Tel: {bill.shopSnapshot.phone}</span>
                ) : null}
                {bill.shopSnapshot.gstin ? (
                  <span>GSTIN: {bill.shopSnapshot.gstin}</span>
                ) : null}
              </div>
            </div>

            {/* Dashed Divider */}
            <div className="my-3.5 border-t border-dashed border-slate-300" />

            {/* Bill Metadata */}
            <div className="space-y-1 text-[11px] text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">BILL NO</span>
                <span className="font-bold text-slate-950">{bill.billNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">DATE</span>
                <span className="tabular-nums">
                  {date} • {time}
                </span>
              </div>
              {bill.customerName || bill.customerPhone ? (
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-500">CUSTOMER</span>
                  <span className="font-semibold text-slate-900 text-right max-w-[200px] truncate">
                    {[bill.customerName, bill.customerPhone]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Dashed Divider */}
            <div className="my-3.5 border-t border-dashed border-slate-300" />

            {/* Line Items Header */}
            <div className="grid grid-cols-12 gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
              <div className="col-span-6">Item</div>
              <div className="col-span-3 text-right">Qty×Rate</div>
              <div className="col-span-3 text-right">Amt</div>
            </div>

            {/* Line Items */}
            <div className="divide-y divide-dotted divide-slate-200">
              {bill.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-1 py-2 text-[11.5px] items-start"
                >
                  <div className="col-span-6 pr-1 font-sans font-semibold text-slate-900 leading-tight break-words">
                    {item.name}
                  </div>
                  <div className="col-span-3 text-right text-slate-600 tabular-nums leading-tight">
                    {formatQty(item.quantity)}×{formatReceiptNumber(item.unitPrice)}
                  </div>
                  <div className="col-span-3 text-right font-semibold text-slate-950 tabular-nums leading-tight">
                    {formatReceiptNumber(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Dashed Divider */}
            <div className="my-3 border-t border-dashed border-slate-300" />

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-[11.5px] tabular-nums">
              <div className="flex items-center justify-between text-slate-700">
                <span>Subtotal ({bill.items.length} items)</span>
                <span>₹{formatReceiptNumber(bill.subtotal)}</span>
              </div>

              {hasDiscount ? (
                <div className="flex items-center justify-between text-emerald-700 font-medium">
                  <span>
                    Discount (
                    {bill.discountType === 'percent'
                      ? `${bill.discountValue}%`
                      : 'Flat'}
                    )
                  </span>
                  <span>-₹{formatReceiptNumber(bill.discountAmount)}</span>
                </div>
              ) : null}

              {hasDiscount && hasTax ? (
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span>Taxable Amount</span>
                  <span>₹{formatReceiptNumber(bill.taxableAmount)}</span>
                </div>
              ) : null}

              {hasTax ? (
                <>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>GST ({bill.taxRate}%)</span>
                    <span>+₹{formatReceiptNumber(bill.taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pl-2">
                    <span>
                      CGST {halfRate}% (₹{formatReceiptNumber(halfTax)}) + SGST{' '}
                      {halfRate}% (₹{formatReceiptNumber(otherHalfTax)})
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Grand Total Band */}
            <div className="mt-3 pt-2.5 pb-2 border-y-2 border-slate-900 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Grand Total
              </span>
              <span className="text-xl font-extrabold tracking-tight text-slate-950 tabular-nums">
                ₹{formatReceiptNumber(bill.grandTotal)}
              </span>
            </div>

            {/* Dynamic UPI QR Section */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300 flex flex-col items-center text-center">
              {bill.upiUri ? (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 mb-2">
                    Scan &amp; Pay Exact Amount
                  </span>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <QRCodeSVG
                      value={bill.upiUri}
                      size={136}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      marginSize={1}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-slate-900">
                    Pay ₹{formatReceiptNumber(bill.grandTotal)} via UPI
                  </p>
                  <p className="text-[10px] text-slate-500 break-all max-w-full">
                    UPI ID: {bill.shopSnapshot.upiId}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400 tracking-wide">
                    GPay • PhonePe • Paytm • BHIM
                  </p>
                </>
              ) : (
                <div className="w-full rounded-xl bg-slate-50 border border-dashed border-slate-300 px-3 py-2.5 text-[10.5px] text-slate-500">
                  Add your UPI ID in Settings to print an instant payment QR code on bills.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-2.5 border-t border-dashed border-slate-300 text-center space-y-0.5">
              <p className="text-[11px] font-bold tracking-wider uppercase text-slate-800">
                Thank You • Visit Again
              </p>
              <p className="text-[9.5px] text-slate-400">
                Generated offline via Bill Book
              </p>
            </div>
          </div>

          {/* Jagged Sawtooth Thermal Bottom Edge (SVG renders sharply in html-to-image) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 320 14"
            preserveAspectRatio="none"
            className="block w-full h-3.5 bg-[#e2e8f0]"
          >
            <polygon
              fill="#ffffff"
              points="0,0 10,12 20,0 30,12 40,0 50,12 60,0 70,12 80,0 90,12 100,0 110,12 120,0 130,12 140,0 150,12 160,0 170,12 180,0 190,12 200,0 210,12 220,0 230,12 240,0 250,12 260,0 270,12 280,0 290,12 300,0 310,12 320,0"
            />
          </svg>
        </div>
      </div>
    );
  }
);

