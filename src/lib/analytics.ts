import type { Bill } from '@/types/bill';
import { fromPaise, roundCurrency, toPaise } from './math';

export interface DailySalesPoint {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  total: number;
  billCount: number;
  isToday: boolean;
}

export interface DashboardAnalytics {
  todayTotal: number;
  todayBillCount: number;
  todayAvgBill: number;
  yesterdayTotal: number;
  sevenDayTotal: number;
  allTimeTotal: number;
  allTimeCount: number;
  rolling7Days: DailySalesPoint[];
  maxDailyTotal: number;
}

export function getLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeDashboardAnalytics(
  bills: Bill[],
  referenceTime = Date.now()
): DashboardAnalytics {
  const totalsByDayPaise = new Map<string, number>();
  const countsByDay = new Map<string, number>();

  let allTimePaise = 0;

  for (const bill of bills) {
    const paise = toPaise(bill.grandTotal);
    allTimePaise += paise;

    const key = getLocalDateKey(bill.createdAt);
    totalsByDayPaise.set(key, (totalsByDayPaise.get(key) ?? 0) + paise);
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }

  const refDate = new Date(referenceTime);
  const todayKey = getLocalDateKey(refDate.getTime());

  const yesterdayDate = new Date(refDate);
  yesterdayDate.setDate(refDate.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterdayDate.getTime());

  const rolling7Days: DailySalesPoint[] = [];
  let sevenDayPaise = 0;
  let maxDailyTotal = 0;

  const shortDayFormatter = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
  const fullDayFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  for (let offset = 6; offset >= 0; offset--) {
    const dayDate = new Date(refDate);
    dayDate.setHours(12, 0, 0, 0);
    dayDate.setDate(dayDate.getDate() - offset);

    const key = getLocalDateKey(dayDate.getTime());
    const dayPaise = totalsByDayPaise.get(key) ?? 0;
    const dayTotal = fromPaise(dayPaise);
    const dayCount = countsByDay.get(key) ?? 0;

    sevenDayPaise += dayPaise;
    if (dayTotal > maxDailyTotal) {
      maxDailyTotal = dayTotal;
    }

    rolling7Days.push({
      dateKey: key,
      shortLabel: offset === 0 ? 'Today' : shortDayFormatter.format(dayDate),
      fullLabel: fullDayFormatter.format(dayDate),
      total: dayTotal,
      billCount: dayCount,
      isToday: key === todayKey,
    });
  }

  const todayPaise = totalsByDayPaise.get(todayKey) ?? 0;
  const todayTotal = fromPaise(todayPaise);
  const todayBillCount = countsByDay.get(todayKey) ?? 0;
  const todayAvgBill =
    todayBillCount > 0 ? roundCurrency(todayTotal / todayBillCount) : 0;

  const yesterdayTotal = fromPaise(totalsByDayPaise.get(yesterdayKey) ?? 0);

  return {
    todayTotal,
    todayBillCount,
    todayAvgBill,
    yesterdayTotal,
    sevenDayTotal: fromPaise(sevenDayPaise),
    allTimeTotal: fromPaise(allTimePaise),
    allTimeCount: bills.length,
    rolling7Days,
    maxDailyTotal,
  };
}

