import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { RestaurantApplication, User, Order, Delivery, Complaint, PlatformSetting, AuditLog } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';
import {
  ShieldCheck,
  Users,
  Store,
  Bike,
  Package,
  TrendingUp,
  Settings,
  AlertCircle,
  FileText,
  CheckCircle,
  XCircle,
  Search,
  DollarSign,
  Clock
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { lang, t } = useLanguage();

  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'kpis' | 'restaurants' | 'couriers' | 'users' | 'orders' | 'complaints' | 'ads' | 'settings' | 'audit'>('kpis');
  const [loading, setLoading] = useState(true);

  // Tab data
  const [restaurantApps, setRestaurantApps] = useState<RestaurantApplication[]>([]);
  const [courierApps, setCourierApps] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminAds, setAdminAds] = useState<any[]>([]);
  const [showNewAdModal, setShowNewAdModal] = useState(false);
  const [newAd, setNewAd] = useState({
    title_ar: '',
    title_fr: '',
    description_ar: '',
    description_fr: '',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    target_location: 'ALL',
    placement: 'HERO',
    badge_text: 'عرض حصري 🇩🇿',
    discount_percentage: 20
  });

  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{ show: boolean; appId: number | null; reason: string }>({
    show: false,
    appId: null,
    reason: ''
  });

  // Complaint resolve modal
  const [resolveModal, setResolveModal] = useState<{ show: boolean; complaintId: number | null; notes: string }>({
    show: false,
    complaintId: null,
    notes: ''
  });

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const dash = await api.getAdminDashboard();
      if (dash.success) setStats(dash.stats);

      const [rApps, cApps, uList, ords, comp, sets, logs, adsRes] = await Promise.all([
        api.getAdminRestaurantApplications(),
        api.getAdminCourierApplications(),
        api.getAdminUsers(),
        api.getAdminOrders(),
        api.getAdminComplaints(),
        api.getAdminSettings(),
        api.getAdminAuditLogs(),
        api.getAdminAds()
      ]);

      if (rApps.success) setRestaurantApps(rApps.applications);
      if (cApps.success) setCourierApps(cApps.couriers);
      if (uList.success) setUsers(uList.users);
      if (ords.success) setOrders(ords.orders);
      if (comp.success) setComplaints(comp.complaints);
      if (sets.success) setSettings(sets.settings);
      if (logs.success) setAuditLogs(logs.logs);
      if (adsRes.success) setAdminAds(adsRes.advertisements);
    } catch (e) {
      console.error('Admin data fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.title_ar.trim() || !newAd.image_url.trim()) {
      alert(lang === 'ar' ? 'يرجى ملء عنوان الإعلان والصورة' : 'Veuillez remplir le titre et l\'image');
      return;
    }
    try {
      const res = await api.createAdminAd(newAd);
      if (res.success) {
        alert(lang === 'ar' ? 'تم نشر الإعلان الترويجي بنجاح!' : 'Annonce publiée avec succès !');
        setShowNewAdModal(false);
        setNewAd({
          title_ar: '',
          title_fr: '',
          description_ar: '',
          description_fr: '',
          image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
          target_location: 'ALL',
          placement: 'HERO',
          badge_text: 'عرض حصري 🇩🇿',
          discount_percentage: 20
        });
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Error creating ad');
    }
  };

  const handleToggleAd = async (id: number) => {
    try {
      const res = await api.toggleAdminAd(id);
      if (res.success) {
        setAdminAds(prev => prev.map(a => a.id === id ? { ...a, is_active: res.is_active } : a));
      }
    } catch (err: any) {
      alert(err.message || 'Error toggling ad');
    }
  };

  const handleDeleteAd = async (id: number) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الإعلان نهائياً؟' : 'Supprimer définitivement cette annonce ?')) return;
    try {
      const res = await api.deleteAdminAd(id);
      if (res.success) {
        setAdminAds(prev => prev.filter(a => a.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting ad');
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApproveRestaurant = async (id: number) => {
    try {
      const res = await api.approveRestaurantApplication(id);
      if (res.success) {
        alert(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleRejectRestaurant = async () => {
    if (!rejectModal.appId || !rejectModal.reason.trim()) return;
    try {
      const res = await api.rejectRestaurantApplication(rejectModal.appId, rejectModal.reason);
      if (res.success) {
        setRejectModal({ show: false, appId: null, reason: '' });
        alert(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleApproveCourier = async (id: number) => {
    try {
      const res = await api.approveCourierApplication(id);
      if (res.success) {
        alert(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Courier approval failed');
    }
  };

  const handleToggleUser = async (userId: number) => {
    try {
      const res = await api.toggleUserActive(userId);
      if (res.success) {
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Toggle user failed');
    }
  };

  const handleSaveSetting = async (key: string, value: any) => {
    try {
      const res = await api.saveAdminSetting(key, value);
      if (res.success) {
        setSettings(res.settings);
        alert(lang === 'ar' ? 'تم حفظ الإعداد بنجاح' : 'Paramètre mis à jour');
      }
    } catch (err: any) {
      alert(err.message || 'Save setting failed');
    }
  };

  const handleResolveComplaint = async () => {
    if (!resolveModal.complaintId) return;
    try {
      await api.resolveAdminComplaint(resolveModal.complaintId, resolveModal.notes);
      setResolveModal({ show: false, complaintId: null, notes: '' });
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Resolve failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Title & Nav Tabs */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black">{t('admin_title')}</h1>
            <p className="text-xs text-slate-400">Algeria Central Operations Console</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'kpis' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            📊 KPIs
          </button>
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'restaurants' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            🏪 {t('tab_restaurant_apps')} ({restaurantApps.filter(a => a.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('couriers')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'couriers' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            🛵 {t('tab_courier_apps')} ({courierApps.filter(c => c.approval_status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            👥 {t('tab_users')}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'orders' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            📦 {t('tab_orders')}
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'complaints' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            ⚠️ {t('tab_complaints')} ({complaints.filter(c => c.status === 'OPEN').length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            ⚙️ {t('tab_settings')}
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'ads' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            📢 {lang === 'ar' ? 'الإعلانات' : 'Publicités'} ({adminAds.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${activeTab === 'audit' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            📋 {t('tab_audit')}
          </button>
        </div>
      </div>

      {/* TAB 1: 10 KPI STATS CARDS */}
      {activeTab === 'kpis' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">{t('kpi_total_customers')}</span>
            <span className="text-xl font-black text-slate-900">{stats.totalCustomers}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">{t('kpi_total_restaurants')}</span>
            <span className="text-xl font-black text-blue-600">{stats.totalRestaurants}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 block mb-1">{t('kpi_pending_apps')}</span>
            <span className="text-xl font-black text-amber-600">{stats.pendingRestaurantApps}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 block mb-1">{t('kpi_pending_couriers')}</span>
            <span className="text-xl font-black text-amber-600">{stats.pendingCourierApps}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">{t('kpi_total_orders')}</span>
            <span className="text-xl font-black text-slate-900">{stats.totalOrders}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">{t('kpi_active_deliveries')}</span>
            <span className="text-xl font-black text-purple-600">{stats.activeDeliveries}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">{lang === 'ar' ? 'توصيلات ناجحة' : 'Courses terminées'}</span>
            <span className="text-xl font-black text-emerald-600">{stats.completedDeliveries}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs sm:col-span-2">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">{t('kpi_total_revenue')}</span>
            <span className="text-2xl font-black text-blue-600">{stats.totalSales} {t('dzd')}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">{lang === 'ar' ? 'رسوم التوصيل' : 'Frais de livraison'}</span>
            <span className="text-xl font-black text-slate-800">{stats.deliveryFees} {t('dzd')}</span>
          </div>
        </div>
      )}

      {/* TAB 2: RESTAURANT APPLICATIONS TABLE */}
      {activeTab === 'restaurants' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900">{t('tab_restaurant_apps')}</h3>
            <span className="text-xs text-slate-500 font-bold">{restaurantApps.length} dossiers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 text-start">Restaurant</th>
                  <th className="p-3.5 text-start">Propriétaire</th>
                  <th className="p-3.5 text-start">Ville / Wilaya</th>
                  <th className="p-3.5 text-start">Statut</th>
                  <th className="p-3.5 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restaurantApps.map((ra) => (
                  <tr key={ra.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <img src={ra.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold text-slate-900">{ra.restaurant_name}</p>
                          <p className="text-[11px] text-slate-500">{ra.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800">{ra.owner_name}</p>
                      <p className="text-[11px] text-slate-400">{ra.owner_email}</p>
                    </td>
                    <td className="p-3.5 font-medium">{ra.city}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        ra.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        ra.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {ra.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-end space-x-1 rtl:space-x-reverse">
                      {ra.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveRestaurant(ra.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                          >
                            {t('approve_btn')}
                          </button>
                          <button
                            onClick={() => setRejectModal({ show: true, appId: ra.id, reason: '' })}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs"
                          >
                            {t('reject_btn')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COURIER APPLICATIONS TABLE */}
      {activeTab === 'couriers' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900">{t('tab_courier_apps')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 text-start">Coursier</th>
                  <th className="p-3.5 text-start">Véhicule</th>
                  <th className="p-3.5 text-start">Plaque d'immatriculation</th>
                  <th className="p-3.5 text-start">Statut</th>
                  <th className="p-3.5 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courierApps.map((ca) => (
                  <tr key={ca.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{ca.full_name}</p>
                      <p className="text-[11px] text-slate-500">{ca.phone}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{ca.vehicle_type}</td>
                    <td className="p-3.5 text-slate-600">{ca.vehicle_plate || '—'}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        ca.approval_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        ca.approval_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {ca.approval_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-end">
                      {ca.approval_status === 'PENDING' && (
                        <button
                          onClick={() => handleApproveCourier(ca.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          {t('approve_btn')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USERS MANAGEMENT (SUSPEND / REACTIVATE) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900">{t('tab_users')}</h3>
            <span className="text-xs text-slate-500">{users.length} comptes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 text-start">Utilisateur</th>
                  <th className="p-3.5 text-start">Rôle</th>
                  <th className="p-3.5 text-start">Statut</th>
                  <th className="p-3.5 text-end">Gestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{u.full_name}</p>
                      <p className="text-[11px] text-slate-500">{u.email} • {u.phone}</p>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.is_active ? 'ACTIF' : 'SUSPENDU'}
                      </span>
                    </td>
                    <td className="p-3.5 text-end">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleUser(u.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active ? t('suspend_user') : t('reactivate_user')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ALL ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-900">{t('tab_orders')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 text-start">N° Commande</th>
                  <th className="p-3.5 text-start">Restaurant</th>
                  <th className="p-3.5 text-start">Client</th>
                  <th className="p-3.5 text-start">Total (COD)</th>
                  <th className="p-3.5 text-end">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3.5 font-black text-slate-900">#{o.order_number}</td>
                    <td className="p-3.5 font-medium">{o.restaurant_name}</td>
                    <td className="p-3.5 text-slate-600">{o.customer_name}</td>
                    <td className="p-3.5 font-black text-blue-600">{o.total_amount} {t('dzd')}</td>
                    <td className="p-3.5 text-end">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-900">{c.subject}</span>
                  <p className="text-[11px] text-slate-500">{c.customer_name} • {c.customer_phone}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">{c.description}</p>
              {c.status !== 'RESOLVED' && (
                <button
                  onClick={() => setResolveModal({ show: true, complaintId: c.id, notes: '' })}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
                >
                  {t('resolve_complaint')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: PLATFORM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-xl space-y-4">
          <h3 className="text-sm font-black text-slate-900">{t('tab_settings')}</h3>
          {settings.map((s) => (
            <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <label className="block text-xs font-bold text-slate-800">{s.key}</label>
              <p className="text-[11px] text-slate-500">{s.description}</p>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  defaultValue={s.value}
                  id={`setting-${s.key}`}
                  className="p-2 rounded-xl border border-slate-200 text-xs bg-white flex-1"
                />
                <button
                  onClick={() => {
                    const el = document.getElementById(`setting-${s.key}`) as HTMLInputElement;
                    if (el) handleSaveSetting(s.key, el.value);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-900">{t('tab_audit')}</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {auditLogs.map((l) => (
              <div key={l.id} className="p-3.5 text-xs flex justify-between items-center hover:bg-slate-50">
                <div>
                  <span className="font-bold text-slate-900">{l.action}</span>
                  <p className="text-slate-500 text-[11px]">{l.details}</p>
                </div>
                <div className="text-end text-slate-400 text-[10px]">
                  <p>{l.user_name || 'System'}</p>
                  <p>{l.created_at}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ADVERTISEMENTS (ADMIN EXCLUSIVE) */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📢</span>
                <span>{lang === 'ar' ? 'إدارة الإعلانات والحملات الترويجية' : 'Gestion des Campagnes Publicitaires'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'هذا القسم مخصص حصرياً لإدارة التطبيق لإنشاء ومتابعة البانرات الترويجية لجميع الزبائن.'
                  : 'Section exclusive à l\'administration pour diffuser des bannières aux clients.'}
              </p>
            </div>
            <button
              onClick={() => setShowNewAdModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <span>➕</span>
              <span>{lang === 'ar' ? 'إنشاء إعلان جديد' : 'Nouvelle Annonce'}</span>
            </button>
          </div>

          {adminAds.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400 text-xs">
              <span className="text-3xl block mb-2">📢</span>
              <p>{lang === 'ar' ? 'لا توجد إعلانات ترويجية منشورة حالياً' : 'Aucune annonce active'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminAds.map((ad) => (
                <div key={ad.id} className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between">
                  <div className="relative h-36 w-full bg-slate-100">
                    <img src={ad.image_url} alt={ad.title_ar} className="w-full h-full object-cover" />
                    <div className="absolute top-2.5 start-2.5 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold shadow-xs">
                      {ad.placement}
                    </div>
                    {ad.discount_percentage > 0 && (
                      <div className="absolute top-2.5 end-2.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                        -{ad.discount_percentage}%
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2 flex-1">
                    <h4 className="text-xs font-black text-slate-900 line-clamp-1">{ad.title_ar}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{ad.description_ar}</p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-50">
                      <span>📍 {ad.target_location === 'ALL' ? (lang === 'ar' ? 'كل الولايات' : 'Toutes wilayas') : ad.target_location}</span>
                      <span>•</span>
                      <span>👁️ {ad.views_count || 0}</span>
                      <span>•</span>
                      <span>🖱️ {ad.clicks_count || 0}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleAd(ad.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        ad.is_active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {ad.is_active ? (lang === 'ar' ? 'نشط' : 'Actif') : (lang === 'ar' ? 'معطل' : 'Inactif')}
                    </button>

                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      title={lang === 'ar' ? 'حذف الإعلان' : 'Supprimer'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE AD MODAL */}
      {showNewAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {lang === 'ar' ? 'إنشاء إعلان ترويجي جديد للزبائن' : 'Créer une nouvelle annonce'}
              </h3>
              <button onClick={() => setShowNewAdModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAd} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'عنوان الإعلان (بالعربية)' : 'Titre (Arabe)'}</label>
                <input
                  type="text"
                  required
                  value={newAd.title_ar}
                  onChange={(e) => setNewAd({ ...newAd, title_ar: e.target.value })}
                  placeholder="مثال: خصم 30% على وجبات الكسكس والشاورما"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'العنوان (بالفرنسية)' : 'Titre (Français)'}</label>
                <input
                  type="text"
                  value={newAd.title_fr}
                  onChange={(e) => setNewAd({ ...newAd, title_fr: e.target.value })}
                  placeholder="Ex: -30% sur tous les plats traditionnels"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'الوصف (بالعربية)' : 'Description'}</label>
                <textarea
                  rows={2}
                  value={newAd.description_ar}
                  onChange={(e) => setNewAd({ ...newAd, description_ar: e.target.value })}
                  placeholder="نص ترويجي إضافي لجذب الزبائن..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'رابط صورة البانر (URL)' : 'Image URL'}</label>
                <input
                  type="url"
                  required
                  value={newAd.image_url}
                  onChange={(e) => setNewAd({ ...newAd, image_url: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'الولاية المستهدفة' : 'Wilaya cible'}</label>
                  <select
                    value={newAd.target_location}
                    onChange={(e) => setNewAd({ ...newAd, target_location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="ALL">{lang === 'ar' ? 'كل الولايات' : 'Toute l\'Algérie'}</option>
                    <option value="Alger">الجزائر العاصمة (Alger)</option>
                    <option value="Oran">وهران (Oran)</option>
                    <option value="Constantine">قسنطينة (Constantine)</option>
                    <option value="Annaba">عنابة (Annaba)</option>
                    <option value="Setif">سطيف (Sétif)</option>
                    <option value="Blida">البليدة (Blida)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'مكان الظهور' : 'Emplacement'}</label>
                  <select
                    value={newAd.placement}
                    onChange={(e) => setNewAd({ ...newAd, placement: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="HERO">{lang === 'ar' ? 'بانر الواجهة الرئيسية (HERO)' : 'Bannière d\'accueil'}</option>
                    <option value="POPUP">{lang === 'ar' ? 'نافذة منبثقة (POPUP)' : 'Popup'}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  {lang === 'ar' ? 'نشر الإعلان فوراً' : 'Publier l\'annonce'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewAdModal(false)}
                  className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-900">{lang === 'ar' ? 'سبب رفض طلب المطعم' : 'Motif de refus de la demande'}</h3>
            <textarea
              rows={3}
              required
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Raison du refus (ex: registre du commerce non valide)..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs"
            />
            <div className="flex gap-2">
              <button onClick={handleRejectRestaurant} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs">
                {t('confirm')}
              </button>
              <button onClick={() => setRejectModal({ show: false, appId: null, reason: '' })} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE COMPLAINT MODAL */}
      {resolveModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-900">{t('resolve_complaint')}</h3>
            <textarea
              rows={3}
              value={resolveModal.notes}
              onChange={(e) => setResolveModal({ ...resolveModal, notes: e.target.value })}
              placeholder="Commentaire de résolution pour le client..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs"
            />
            <div className="flex gap-2">
              <button onClick={handleResolveComplaint} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                {t('confirm')}
              </button>
              <button onClick={() => setResolveModal({ show: false, complaintId: null, notes: '' })} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
