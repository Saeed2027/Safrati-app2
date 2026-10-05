import { useEffect, useState, useCallback } from 'react';
import { Download, X, Plane } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'safrati_pwa_dismissed';
const DISMISS_DURATION = 1000 * 60 * 60 * 24 * 7;

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosManualVisible, setIosManualVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      if (Date.now() - dismissedAt < DISMISS_DURATION) return;
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (iOS) {
      setIsIOS(true);
      const timer = setTimeout(() => {
        setIosManualVisible(true);
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
    setIosManualVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted' || outcome === 'dismissed') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else {
      dismiss();
    }
  }

  if (!showPrompt) return null;

  return (
    <>
      {isIOS && iosManualVisible ? (
        <div className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-slide-up rounded-2xl border border-navy-100 bg-white p-4 shadow-2xl shadow-navy-900/20">
          <button
            onClick={dismiss}
            className="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-50"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-sky-500">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-navy-900">أضف سفرتي لشاشتك الرئيسية</h3>
              <p className="mt-1 text-xs leading-relaxed text-navy-500">
                اضغط على زر المشاركة
                <span className="mx-1 inline-block rounded bg-navy-100 px-1.5 py-0.5 text-xs font-bold text-navy-700">⎙</span>
                ثم اختر «إلى الشاشة الرئيسية»
              </p>
            </div>
          </div>
        </div>
      ) : !isIOS && deferredPrompt ? (
        <div className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-slide-up rounded-2xl border border-navy-100 bg-white p-4 shadow-2xl shadow-navy-900/20">
          <button
            onClick={dismiss}
            className="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-50"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-sky-500">
              <Download className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-navy-900">ثبّت تطبيق سفرتي</h3>
              <p className="mt-1 text-xs leading-relaxed text-navy-500">
                صار بإمكانك تصفح الباقات و التواصل مع الوكالات مباشرة من شاشتك الرئيسية
              </p>
              <button
                onClick={handleInstall}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-700"
              >
                <Download className="h-4 w-4" />
                إضافة للشاشة الرئيسية
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
