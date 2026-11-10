'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextValue {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  swReady: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const PwaContext = createContext<PwaContextValue>({
  isOnline: true,
  isInstalled: false,
  canInstall: false,
  swReady: false,
  promptInstall: async () => 'unavailable',
});

export function usePwaStatus() {
  return useContext(PwaContext);
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function subscribeInstalled(callback: () => void) {
  const mql = window.matchMedia?.('(display-mode: standalone)');
  mql?.addEventListener?.('change', callback);
  window.addEventListener('appinstalled', callback);
  return () => {
    mql?.removeEventListener?.('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getInstalledSnapshot() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    () => true
  );
  const isInstalledSync = useSyncExternalStore(
    subscribeInstalled,
    getInstalledSnapshot,
    () => false
  );

  const [installedOverride, setInstalledOverride] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const isInstalled = isInstalledSync || installedOverride;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalledOverride(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in navigator) {
      const registerSw = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          const readyReg = await navigator.serviceWorker.ready;
          setSwReady(true);

          // Proactively cache all currently loaded Next.js static chunks for immediate Airplane Mode support
          const target = readyReg.active || registration.active;
          if (target) {
            const loadedUrls = new Set<string>([
              window.location.href,
              `${window.location.origin}/`,
              `${window.location.origin}/pos`,
              `${window.location.origin}/settings`,
            ]);

            const entries = performance.getEntriesByType(
              'resource'
            ) as PerformanceResourceTiming[];
            for (const entry of entries) {
              if (
                entry.name.startsWith(window.location.origin) &&
                (entry.name.includes('/_next/static/') ||
                  entry.name.includes('/icons/') ||
                  entry.name.endsWith('/manifest.json'))
              ) {
                loadedUrls.add(entry.name);
              }
            }

            target.postMessage({
              type: 'CACHE_URLS',
              urls: Array.from(loadedUrls),
            });
          }
        } catch {
          // Service worker registration failed (e.g., unsupported context)
        }
      };

      registerSw();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setInstalledOverride(true);
    }
    return outcome;
  };

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isInstalled,
        canInstall: Boolean(deferredPrompt) && !isInstalled,
        swReady,
        promptInstall,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}
