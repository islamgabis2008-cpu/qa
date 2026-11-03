import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LanguageProvider, useLanguage } from './context/LanguageContext.js';
import { Navbar } from './components/Navbar.js';
import { CustomerView } from './components/CustomerView.js';
import { OwnerView } from './components/OwnerView.js';
import { CourierView } from './components/CourierView.js';
import { AdminView } from './components/AdminView.js';
import { AuthModal } from './components/AuthModal.js';
import { NotificationModal } from './components/NotificationModal.js';
import { OfflineIndicator } from './components/PWAInstallButton.js';
import { api } from './services/api.js';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [cartCount, setCartCount] = useState<number>(0);

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalRole, setAuthModalRole] = useState<'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER'>('CUSTOMER');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeOrderToTrack, setActiveOrderToTrack] = useState<number | null>(null);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER' = 'CUSTOMER') => {
    setAuthModalMode(mode);
    setAuthModalRole(role);
    setIsAuthOpen(true);
  };

  // Synchronize default tab when user switches role
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setCurrentTab('admin');
    } else if (user?.role === 'RESTAURANT_OWNER') {
      setCurrentTab('owner');
    } else if (user?.role === 'COURIER') {
      setCurrentTab('courier');
    } else {
      if (currentTab === 'admin' || currentTab === 'owner' || currentTab === 'courier') {
        setCurrentTab('home');
      }
    }
  }, [user?.role]);

  // Refresh cart count periodically or on tab change
  useEffect(() => {
    const fetchCartCount = async () => {
      if (!user) {
        setCartCount(0);
        return;
      }
      try {
        const res = await api.getCart();
        if (res.success && res.cart) {
          setCartCount(res.cart.itemCount || 0);
        }
      } catch {
        // ignore
      }
    };

    fetchCartCount();
    const interval = setInterval(fetchCartCount, 8000);
    return () => clearInterval(interval);
  }, [user, currentTab, isCartOpen]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172033] flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        cartCount={cartCount}
        onOpenAuth={handleOpenAuth}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setActiveOrderToTrack(null);
        }}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentTab === 'owner' && user?.role === 'RESTAURANT_OWNER' ? (
          <OwnerView />
        ) : currentTab === 'courier' && user?.role === 'COURIER' ? (
          <CourierView />
        ) : currentTab === 'admin' && user?.role === 'ADMIN' ? (
          <AdminView />
        ) : (
          <CustomerView
            selectedCity={selectedCity}
            isCartOpen={isCartOpen}
            onCloseCart={() => setIsCartOpen(false)}
            activeOrderToTrack={activeOrderToTrack}
            onCloseTracking={() => setActiveOrderToTrack(null)}
            onTrackOrder={(id) => setActiveOrderToTrack(id)}
            currentTab={currentTab}
            onOpenAuth={handleOpenAuth}
          />
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authModalMode}
        initialRole={authModalRole}
      />
      <NotificationModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <OfflineIndicator />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-bold text-slate-800">
            <span>🇩🇿 DZ ORDER</span>
            <span>•</span>
            <span>{t('app_tagline')}</span>
          </div>
          <p className="text-slate-400">
            {lang === 'ar'
              ? 'منصة جزائرية 100% متوافقة مع الهواتف الذكية (PWA) وتدعم الدفع نقداً عند الاستلام (COD)'
              : 'Plateforme 100% algérienne optimisée PWA Mobile-First avec paiement à la livraison (Cash on Delivery)'}
          </p>
          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-4">
            <span>Version 1.0.0 Production-Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
