'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatINR } from '@/lib/math';
import type { DailySalesPoint } from '@/lib/analytics';

interface SalesTrendChartProps {
  points: DailySalesPoint[];
  maxTotal: number;
}

export function SalesTrendChart({ points, maxTotal }: SalesTrendChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(points.length - 1);
  const activePoint = points[selectedIndex] ?? points[points.length - 1];

  return (
    <div className="space-y-3">
      {/* Interactive detail readout */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-zinc-900/80">
        <div>
          <span className="font-semibold text-slate-900 dark:text-zinc-100">
            {activePoint?.isToday ? 'Today' : activePoint?.fullLabel}
          </span>
          <span className="ml-2 text-slate-500 dark:text-zinc-400">
            {activePoint?.billCount ?? 0}{' '}
            {activePoint?.billCount === 1 ? 'bill' : 'bills'}
          </span>
        </div>
        <span className="font-mono-receipt font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
          {formatINR(activePoint?.total ?? 0)}
        </span>
      </div>

      {/* 7-day animated bars */}
      <div
        className="grid grid-cols-7 gap-2 items-end h-28 pt-3"
        role="group"
        aria-label="7-day rolling sales bar chart"
      >
        {points.map((point, index) => {
          const ratio = maxTotal > 0 ? point.total / maxTotal : 0;
          const heightPercent = point.total > 0 ? Math.max(14, Math.round(ratio * 100)) : 6;
          const isSelected = index === selectedIndex;

          return (
            <button
              key={point.dateKey}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className="group flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer focus:outline-none"
              aria-label={`${point.fullLabel}: ${formatINR(point.total)}`}
            >
              <div className="relative w-full flex-1 flex items-end justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                    delay: index * 0.03,
                  }}
                  className={`w-full max-w-[28px] rounded-t-lg transition-colors ${
                    point.total === 0
                      ? 'bg-slate-200/80 dark:bg-zinc-800'
                      : point.isToday
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : isSelected
                          ? 'bg-emerald-500/80 dark:bg-emerald-400/80'
                          : 'bg-emerald-200 group-hover:bg-emerald-300 dark:bg-emerald-500/30 dark:group-hover:bg-emerald-500/50'
                  } ${
                    isSelected
                      ? 'ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-white dark:ring-offset-[#121318]'
                      : ''
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight ${
                  point.isToday || isSelected
                    ? 'text-slate-900 dark:text-zinc-100'
                    : 'text-slate-400 dark:text-zinc-500'
                }`}
              >
                {point.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

