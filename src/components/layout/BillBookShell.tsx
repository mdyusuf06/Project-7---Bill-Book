'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calculator,
  Download,
  LayoutDashboard,
  Moon,
  ReceiptText,
  Settings,
  Sun,
  WifiOff,
} from 'lucide-react';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { PosView } from '@/components/pos/PosView';
import { SettingsView } from '@/components/settings/SettingsView';
import { usePwaStatus } from '@/components/pwa/ServiceWorkerRegistrar';
import { triggerHaptic } from '@/lib/haptics';
import { useBillStore } from '@/store/useBillStore';
import type { AppTab } from '@/types/bill';

interface BillBookShellProps {
  initialTab?: AppTab;
}

const NAV_ITEMS: {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'New Bill', icon: Calculator },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function subscribePopState(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getTabFromLocation(fallback: AppTab): AppTab {
  if (typeof window === 'undefined') return fallback;
  const param = new URLSearchParams(window.location.search).get('tab');
  if (param === 'dashboard' || param === 'pos' || param === 'settings') {
    return param;
  }
  return fallback;
}

export function BillBookShell({ initialTab = 'dashboard' }: BillBookShellProps) {
  const urlTab = useSyncExternalStore(
    subscribePopState,
    () => getTabFromLocation(initialTab),
    () => initialTab
  );
  const [tabOverride, setTabOverride] = useState<AppTab | null>(null);
  const activeTab = tabOverride ?? urlTab;

  const hasHydrated = useBillStore((s) => s.hasHydrated);
  const theme = useBillStore((s) => s.theme);
  const toggleTheme = useBillStore((s) => s.toggleTheme);
  const shopName = useBillStore((s) => s.shopDetails.shopName);
  const cartCount = useBillStore((s) => s.draft.items.length);
  const hapticsEnabled = useBillStore((s) => s.hapticsEnabled);

  const { isOnline, canInstall, promptInstall } = usePwaStatus();

  // Apply .dark class to <html> element and update mobile browser theme-color
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#09090b' : '#059669');
    }
  }, [theme]);

  const switchTab = (next: AppTab) => {
    if (next === activeTab) return;
    triggerHaptic('tap', hapticsEnabled);
    setTabOverride(next);
    if (typeof window !== 'undefined') {
      const targetUrl = next === 'dashboard' ? '/' : `/${next}`;
      window.history.replaceState(null, '', targetUrl);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#09090b]/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => switchTab('dashboard')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shadow-emerald-600/20 dark:bg-emerald-500 dark:text-zinc-950">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight">
                  Bill Book
                </span>
                {!isOnline ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    <WifiOff className="h-2.5 w-2.5" />
                    Offline
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 truncate max-w-[180px] sm:max-w-xs">
                {shopName || 'Local Shop POS'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {canInstall ? (
              <button
                type="button"
                onClick={() => promptInstall()}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Install</span>
              </button>
            ) : null}

            <button
              type="button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => {
                triggerHaptic('tap', hapticsEnabled);
                toggleTheme();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28">
        {!hasHydrated ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-36 rounded-2xl bg-slate-200/70 dark:bg-zinc-800/70" />
            <div className="h-44 rounded-2xl bg-slate-200/70 dark:bg-zinc-800/70" />
            <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-zinc-800/70" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {activeTab === 'dashboard' ? (
                <DashboardView
                  onGoToPos={() => switchTab('pos')}
                  onGoToSettings={() => switchTab('settings')}
                />
              ) : activeTab === 'pos' ? (
                <PosView />
              ) : (
                <SettingsView />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/90 backdrop-blur-lg dark:border-zinc-800/90 dark:bg-[#09090b]/92 pb-safe"
      >
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-1 px-3 pt-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const showBadge = item.id === 'pos' && cartCount > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-bold transition-colors cursor-pointer select-none ${
                  active
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {active ? (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-x-3 inset-y-0.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 -z-10"
                  />
                ) : null}

                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {showBadge ? (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 font-mono-receipt text-[9px] font-extrabold text-white dark:bg-emerald-400 dark:text-zinc-950">
                      {cartCount}
                    </span>
                  ) : null}
                </div>

                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
