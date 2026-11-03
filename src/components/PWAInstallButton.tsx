import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from './usePWAInstall.js';
import { useLanguage } from '../context/LanguageContext.js';
import { Download, Smartphone, WifiOff } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t, lang } = useLanguage();

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          className="flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-700 hover:bg-amber-500 hover:text-white px-3 py-1 text-xs font-semibold border border-amber-300 transition-all cursor-pointer tap-bounce"
          title="Install DZ Order PWA"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Installer l\'App'}</span>
        </button>
      )}

      {isIOS && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-3 py-1 text-xs font-semibold border border-blue-200 transition-all cursor-pointer tap-bounce"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'تثبيت على iPhone' : 'Installer sur iOS'}</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {lang === 'ar' ? 'تثبيت DZ Order على الهاتف' : 'Installer DZ Order sur iPhone'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {lang === 'ar' ? (
                <>
                  1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari أسفل الشاشة.<br />
                  2. اسحب للأسفل واضغط على <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                </>
              ) : (
                <>
                  1. Touchez le bouton <strong>Partager</strong> dans Safari.<br />
                  2. Faites défiler et touchez <strong>Sur l'écran d'accueil</strong>.
                </>
              )}
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xl animate-bounce">
      <WifiOff className="w-4 h-4" />
      <span>{t('offline_msg')}</span>
    </div>
  );
};
