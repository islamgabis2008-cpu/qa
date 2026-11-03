import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { X, Lock, Mail, User, Phone, Bike, Store } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'CUSTOMER'
}) => {
  const { login, register } = useAuth();
  const { t, lang } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER'>(initialRole);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+213 ');
  const [vehicleType, setVehicleType] = useState<'MOTO' | 'CAR' | 'BICYCLE'>('MOTO');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [businessReg, setBusinessReg] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync mode and role when props change
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setError(null);
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else {
        await register({
          email,
          password,
          full_name: fullName,
          phone,
          role,
          language: lang,
          vehicle_type: role === 'COURIER' ? vehicleType : undefined,
          vehicle_plate: role === 'COURIER' ? vehiclePlate : undefined,
          business_reg_number: role === 'RESTAURANT_OWNER' ? businessReg : undefined
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇩🇿</span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {mode === 'login' ? t('login') : t('register')}
              </h2>
              <p className="text-xs text-slate-500">DZ Order - Algérie</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Login & Register */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${mode === 'login' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
          >
            {t('login')}
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${mode === 'register' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
          >
            {t('register')}
          </button>
        </div>

        {mode === 'register' && (
          <div className="mb-4 p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 text-xs">
            <p className="text-[11px] text-blue-800 leading-relaxed">
              {lang === 'ar'
                ? '📝 أنشئ حسابك الشخصي (زبون، صاحب مطعم، أو عامل توصيل) وسيتم حفظه مباشرة في قاعدة البيانات.'
                : '📝 Créez votre compte personnel (client, restaurateur ou coursier) enregistré directement en base de données.'}
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              {/* Role selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('choose_role')}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('CUSTOMER')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${role === 'CUSTOMER' ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <User className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <span className="text-[11px] block">{t('role_customer')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('RESTAURANT_OWNER')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${role === 'RESTAURANT_OWNER' ? 'border-amber-600 bg-amber-50/50 text-amber-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Store className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <span className="text-[11px] block">{t('role_owner')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('COURIER')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${role === 'COURIER' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Bike className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="text-[11px] block">{t('role_courier')}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('full_name')}</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ex: مصطفى بن علي"
                    className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('phone')}</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+213 555 12 34 56"
                    className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {role === 'COURIER' && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('vehicle_type')}</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="MOTO">{t('moto')}</option>
                      <option value="CAR">{t('car')}</option>
                      <option value="BICYCLE">{t('bicycle')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('license_plate')}</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="00123-116-16"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {role === 'RESTAURANT_OWNER' && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('commercial_reg')}</label>
                  <input
                    type="text"
                    value={businessReg}
                    onChange={(e) => setBusinessReg(e.target.value)}
                    placeholder="RC-16/00-1234567B22"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('email')}</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@dzorder.dz"
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('password')}</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? t('loading') : (mode === 'login' ? t('login') : t('register'))}
          </button>
        </form>
      </div>
    </div>
  );
};
