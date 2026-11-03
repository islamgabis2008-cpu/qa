import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { PWAInstallButton } from './PWAInstallButton.js';
import {
  ShoppingBag,
  Bell,
  Globe,
  User as UserIcon,
  LogOut,
  MapPin,
  Utensils,
  Bike,
  ShieldCheck,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  onOpenCart: () => void;
  cartCount: number;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenNotifications: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const ALGERIAN_CITIES = [
  { ar: 'جميع الولايات', fr: 'Toutes les Wilayas', val: '' },
  { ar: 'الجزائر العاصمة', fr: 'Alger', val: 'Alger' },
  { ar: 'وهران', fr: 'Oran', val: 'Oran' },
  { ar: 'قسنطينة', fr: 'Constantine', val: 'Constantine' },
  { ar: 'عنابة', fr: 'Annaba', val: 'Annaba' },
  { ar: 'بجاية', fr: 'Béjaïa', val: 'Béjaïa' },
  { ar: 'باتنة', fr: 'Batna', val: 'Batna' },
  { ar: 'سطيف', fr: 'Sétif', val: 'Sétif' },
  { ar: 'البليدة', fr: 'Blida', val: 'Blida' },
  { ar: 'تلمسان', fr: 'Tlemcen', val: 'Tlemcen' },
];

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCart,
  cartCount,
  onOpenAuth,
  onOpenNotifications,
  selectedCity,
  onSelectCity,
  currentTab,
  onSelectTab
}) => {
  const { user, logout, unreadCount } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [showCityMenu, setShowCityMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Algerian Platform Bar */}
      <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-bold text-emerald-400">
            <span>🇩🇿 DZ ORDER</span>
          </span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="text-slate-300 text-[11px] hidden sm:inline">
            {lang === 'ar' ? 'الدفع نقداً عند الاستلام (COD) متاح في جميع الولايات' : 'Paiement en espèces à la livraison (COD) partout en Algérie'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <PWAInstallButton />
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & City Dropdown */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 text-left rtl:text-right group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <span className="text-xl">🇩🇿</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition">DZ ORDER</span>
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">DZD</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block leading-none">
                {lang === 'ar' ? 'طلب وتوصيل الطعام في الجزائر' : 'Livraison de repas en Algérie'}
              </p>
            </div>
          </button>

          {/* Algerian City Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCityMenu(!showCityMenu)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                {selectedCity
                  ? ALGERIAN_CITIES.find(c => c.val === selectedCity)?.[lang === 'ar' ? 'ar' : 'fr'] || selectedCity
                  : t('all_cities')}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showCityMenu && (
              <div className="absolute top-full start-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                {ALGERIAN_CITIES.map((c) => (
                  <button
                    key={c.val}
                    onClick={() => {
                      onSelectCity(c.val);
                      setShowCityMenu(false);
                    }}
                    className={`w-full text-start px-3 py-2 text-xs font-medium hover:bg-slate-50 transition flex items-center justify-between ${selectedCity === c.val ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'}`}
                  >
                    <span>{lang === 'ar' ? c.ar : c.fr}</span>
                    {selectedCity === c.val && <span className="text-blue-600">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Navigation Tabs Based on Role */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${currentTab === 'home' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {t('nav_home')}
          </button>

          {user?.role === 'CUSTOMER' && (
            <button
              onClick={() => onSelectTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${currentTab === 'orders' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t('nav_orders')}
            </button>
          )}

          {user?.role === 'RESTAURANT_OWNER' && (
            <button
              onClick={() => onSelectTab('owner')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${currentTab === 'owner' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{t('nav_owner_portal')}</span>
            </button>
          )}

          {user?.role === 'COURIER' && (
            <button
              onClick={() => onSelectTab('courier')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${currentTab === 'courier' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>{t('nav_courier_portal')}</span>
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${currentTab === 'admin' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('nav_admin')}</span>
            </button>
          )}
        </nav>

        {/* Right Actions: Language Switcher, Notifications, Cart, User Profile */}
        <div className="flex items-center gap-2">
          {/* Language Toggle (Arabic RTL / French LTR) */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            title="Changer de langue / تغيير اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{lang === 'ar' ? 'FR' : 'عربي'}</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 end-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Cart Icon (Customer) */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer tap-bounce"
            title="Mon Panier"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav_cart')}</span>
            {cartCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {cartCount}
              </span>
            )}
          </button>

          {/* User Profile / Login & Register */}
          {user ? (
            <div className="flex items-center gap-2 ms-1">
              <div className="hidden sm:block text-end rtl:text-start">
                <p className="text-xs font-bold text-slate-800 line-clamp-1">{user.full_name}</p>
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                  user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                  user.role === 'RESTAURANT_OWNER' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  user.role === 'COURIER' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                  'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                  {t(`role_${user.role.toLowerCase()}`)}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 ms-1">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                {t('login')}
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {t('register')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
