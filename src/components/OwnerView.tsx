import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Restaurant,
  RestaurantApplication,
  Product,
  ProductCategory,
  Order,
  RestaurantCategory,
  Advertisement,
  CustomerBroadcast
} from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';
import { ImageUploader } from './ImageUploader.js';
import {
  Utensils,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Package,
  Settings,
  Phone,
  MapPin,
  Trash2,
  Edit,
  DollarSign,
  Save,
  Check,
  Megaphone,
  Send,
  Eye,
  MousePointerClick,
  Sparkles,
  Tag,
  Radio,
  Users
} from 'lucide-react';

const ALGERIAN_LOCATIONS = [
  { value: 'ALL', labelAr: '🇩🇿 جميع الولايات (كامل القطر الجزائري)', labelFr: 'Toute l\'Algérie (National)' },
  { value: 'الجزائر العاصمة', labelAr: '📍 الجزائر العاصمة (Alger)', labelFr: 'Alger' },
  { value: 'وهران', labelAr: '📍 وهران (Oran)', labelFr: 'Oran' },
  { value: 'قسنطينة', labelAr: '📍 قسنطينة (Constantine)', labelFr: 'Constantine' },
  { value: 'عنابة', labelAr: '📍 عنابة (Annaba)', labelFr: 'Annaba' },
  { value: 'سطيف', labelAr: '📍 سطيف (Sétif)', labelFr: 'Sétif' },
  { value: 'البليدة', labelAr: '📍 البليدة (Blida)', labelFr: 'Blida' },
  { value: 'باتنة', labelAr: '📍 باتنة (Batna)', labelFr: 'Batna' },
  { value: 'تلمسان', labelAr: '📍 تلمسان (Tlemcen)', labelFr: 'Tlemcen' },
  { value: 'بجاية', labelAr: '📍 بجاية (Béjaïa)', labelFr: 'Béjaïa' },
  { value: 'تيزي وزو', labelAr: '📍 تيزي وزو (Tizi Ouzou)', labelFr: 'Tizi Ouzou' },
  { value: 'بسكرة', labelAr: '📍 بسكرة (Biskra)', labelFr: 'Biskra' },
  { value: 'مستغانم', labelAr: '📍 مستغانم (Mostaganem)', labelFr: 'Mostaganem' },
  { value: 'الشلف', labelAr: '📍 الشلف (Chlef)', labelFr: 'Chlef' },
  { value: 'ورقلة', labelAr: '📍 ورقلة (Ouargla)', labelFr: 'Ouargla' },
  { value: 'سيدي بلعباس', labelAr: '📍 سيدي بلعباس (Sidi Bel Abbès)', labelFr: 'Sidi Bel Abbès' },
  { value: 'بومرداس', labelAr: '📍 بومرداس (Boumerdès)', labelFr: 'Boumerdès' },
  { value: 'تيبازة', labelAr: '📍 تيبازة (Tipaza)', labelFr: 'Tipaza' }
];

export const OwnerView: React.FC = () => {
  const { lang, t } = useLanguage();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [application, setApplication] = useState<RestaurantApplication | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tabs: 'orders' | 'menu' | 'ads' | 'broadcasts' | 'stats' | 'settings'
  const [tab, setTab] = useState<'orders' | 'menu' | 'ads' | 'broadcasts' | 'stats' | 'settings'>('orders');

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [rejectModal, setRejectModal] = useState<{ show: boolean; orderId: number | null; reason: string }>({
    show: false,
    orderId: null,
    reason: ''
  });

  // Menu
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [restCategories, setRestCategories] = useState<RestaurantCategory[]>([]);
  const [productModal, setProductModal] = useState<{
    show: boolean;
    isEdit: boolean;
    productId?: number;
    categoryId: number;
    nameAr: string;
    nameFr: string;
    descAr: string;
    descFr: string;
    price: number;
    imageUrl: string;
  }>({
    show: false,
    isEdit: false,
    categoryId: 1,
    nameAr: '',
    nameFr: '',
    descAr: '',
    descFr: '',
    price: 800,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  });

  // Advertisements
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [adModal, setAdModal] = useState<{
    show: boolean;
    isEdit: boolean;
    id?: number;
    titleAr: string;
    titleFr: string;
    descAr: string;
    descFr: string;
    imageUrl: string;
    targetLocation: string;
    placement: 'HERO' | 'OFFERS' | 'POPULAR';
    badgeText: string;
    discountPercentage: number;
    productId?: number;
  }>({
    show: false,
    isEdit: false,
    titleAr: '',
    titleFr: '',
    descAr: '',
    descFr: '',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    targetLocation: 'ALL',
    placement: 'HERO',
    badgeText: 'تخفيض خاص 20%',
    discountPercentage: 20
  });
  const [adSaving, setAdSaving] = useState(false);
  const [adSuccessMsg, setAdSuccessMsg] = useState('');

  // Customer Broadcasts / Messages
  const [broadcasts, setBroadcasts] = useState<CustomerBroadcast[]>([]);
  const [broadcastModal, setBroadcastModal] = useState<{
    show: boolean;
    titleAr: string;
    titleFr: string;
    messageAr: string;
    messageFr: string;
    targetAudience: 'ALL' | 'PAST_CUSTOMERS';
    targetLocation: string;
    discountCode: string;
  }>({
    show: false,
    titleAr: '',
    titleFr: '',
    messageAr: '',
    messageFr: '',
    targetAudience: 'ALL',
    targetLocation: 'ALL',
    discountCode: ''
  });
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState('');

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Application Form State (if not registered yet)
  const [appName, setAppName] = useState('');
  const [appPhone, setAppPhone] = useState('+213 ');
  const [appCity, setAppCity] = useState('الجزائر العاصمة / Alger');
  const [appAddress, setAppAddress] = useState('');
  const [appCategory, setAppCategory] = useState(1);
  const [appDescAr, setAppDescAr] = useState('');
  const [appDescFr, setAppDescFr] = useState('');
  const [appHours, setAppHours] = useState('10:00 - 23:00');
  const [appLogoUrl, setAppLogoUrl] = useState('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80');
  const [appCoverUrl, setAppCoverUrl] = useState('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80');

  // Restaurant Settings Form State (for approved restaurant)
  const [settingsName, setSettingsName] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');
  const [settingsCity, setSettingsCity] = useState('');
  const [settingsAddress, setSettingsAddress] = useState('');
  const [settingsHours, setSettingsHours] = useState('10:00 - 23:00');
  const [settingsDescAr, setSettingsDescAr] = useState('');
  const [settingsDescFr, setSettingsDescFr] = useState('');
  const [settingsLogoUrl, setSettingsLogoUrl] = useState('');
  const [settingsCoverUrl, setSettingsCoverUrl] = useState('');
  const [settingsIsActive, setSettingsIsActive] = useState(true);
  const [settingsIsDelivering, setSettingsIsDelivering] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');

  const loadOwnerData = async () => {
    try {
      setLoading(true);
      const res = await api.getOwnerRestaurant();
      if (res.success) {
        setRestaurant(res.restaurant);
        setApplication(res.application);
        setIsApproved(res.isApproved);

        if (res.restaurant) {
          setSettingsName(res.restaurant.name || '');
          setSettingsPhone(res.restaurant.phone || '');
          setSettingsCity(res.restaurant.city || '');
          setSettingsAddress(res.restaurant.address || '');
          setSettingsHours(res.restaurant.opening_hours || '10:00 - 23:00');
          setSettingsDescAr(res.restaurant.description_ar || '');
          setSettingsDescFr(res.restaurant.description_fr || '');
          setSettingsLogoUrl(res.restaurant.logo_url || '');
          setSettingsCoverUrl(res.restaurant.cover_url || '');
          setSettingsIsActive(res.restaurant.is_active === 1);
          setSettingsIsDelivering(res.restaurant.is_delivering === 1);
        }

        if (res.isApproved && res.restaurant) {
          const [ords, prods, prodCats, st, adRes, bRes] = await Promise.all([
            api.getOwnerOrders().catch(() => ({ success: false, orders: [] })),
            api.getOwnerProducts().catch(() => ({ success: false, products: [] })),
            api.getProductCategories().catch(() => ({ success: false, categories: [] })),
            api.getOwnerStats().catch(() => ({ success: false, stats: null })),
            api.getOwnerAds().catch(() => ({ success: false, count: 0, advertisements: [] })),
            api.getOwnerBroadcasts().catch(() => ({ success: false, count: 0, broadcasts: [] }))
          ]);
          if (ords.success) setOrders(ords.orders);
          if (prods.success) setProducts(prods.products);
          if (prodCats.success) setCategories(prodCats.categories);
          if (st.success) setStats(st.stats);
          if (adRes.success) setAds(adRes.advertisements);
          if (bRes.success) setBroadcasts(bRes.broadcasts);
        } else {
          const catRes = await api.getRestaurantCategories();
          if (catRes.success) setRestCategories(catRes.categories);
        }
      }
    } catch (e) {
      console.error('Owner data error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerData();
  }, []);

  // Poll orders every 8 seconds if approved
  useEffect(() => {
    if (!isApproved) return;
    const interval = setInterval(async () => {
      try {
        const ords = await api.getOwnerOrders();
        if (ords.success) setOrders(ords.orders);
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [isApproved]);

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.submitRestaurantApplication({
        restaurant_name: appName,
        phone: appPhone,
        address: appAddress,
        city: appCity,
        category_id: appCategory,
        description_ar: appDescAr,
        description_fr: appDescFr,
        opening_hours: appHours,
        logo_url: appLogoUrl,
        cover_url: appCoverUrl
      });
      if (res.success) {
        alert(res.message);
        loadOwnerData();
      }
    } catch (err: any) {
      alert(err.message || 'Application failed');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsSaving(true);
      const res = await api.updateOwnerRestaurant({
        name: settingsName,
        phone: settingsPhone,
        city: settingsCity,
        address: settingsAddress,
        opening_hours: settingsHours,
        description_ar: settingsDescAr,
        description_fr: settingsDescFr,
        logo_url: settingsLogoUrl,
        cover_url: settingsCoverUrl,
        is_active: settingsIsActive,
        is_delivering: settingsIsDelivering
      });
      if (res.success) {
        setRestaurant(res.restaurant);
        setSettingsSuccessMsg(
          lang === 'ar'
            ? 'تم حفظ وتحديث بيانات وصور المطعم بنجاح!'
            : 'Paramètres et photos du restaurant mis à jour avec succès !'
        );
        setTimeout(() => setSettingsSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Error updating restaurant');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    try {
      await api.acceptOwnerOrder(orderId);
      const ords = await api.getOwnerOrders();
      if (ords.success) setOrders(ords.orders);
    } catch (err: any) {
      alert(err.message || 'Accept failed');
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectModal.orderId || !rejectModal.reason.trim()) return;
    try {
      await api.rejectOwnerOrder(rejectModal.orderId, rejectModal.reason);
      setRejectModal({ show: false, orderId: null, reason: '' });
      const ords = await api.getOwnerOrders();
      if (ords.success) setOrders(ords.orders);
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    }
  };

  const handlePrepareOrder = async (orderId: number) => {
    try {
      await api.prepareOwnerOrder(orderId);
      const ords = await api.getOwnerOrders();
      if (ords.success) setOrders(ords.orders);
    } catch (err: any) {
      alert(err.message || 'Prepare failed');
    }
  };

  const handleReadyOrder = async (orderId: number) => {
    try {
      await api.readyOwnerOrder(orderId);
      const ords = await api.getOwnerOrders();
      if (ords.success) setOrders(ords.orders);
      alert(lang === 'ar' ? 'تم تجهيز الطلب وبدء استدعاء مندوب التوصيل!' : 'Commande prête et mission diffusée aux coursiers !');
    } catch (err: any) {
      alert(err.message || 'Ready failed');
    }
  };

  // Products
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (productModal.isEdit && productModal.productId) {
        await api.updateOwnerProduct(productModal.productId, {
          category_id: productModal.categoryId,
          name_ar: productModal.nameAr,
          name_fr: productModal.nameFr,
          description_ar: productModal.descAr,
          description_fr: productModal.descFr,
          price: productModal.price,
          image_url: productModal.imageUrl
        });
      } else {
        await api.createOwnerProduct({
          category_id: productModal.categoryId,
          name_ar: productModal.nameAr,
          name_fr: productModal.nameFr,
          description_ar: productModal.descAr,
          description_fr: productModal.descFr,
          price: productModal.price,
          image_url: productModal.imageUrl
        });
      }

      setProductModal({ ...productModal, show: false });
      const prods = await api.getOwnerProducts();
      if (prods.success) setProducts(prods.products);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    }
  };

  const handleToggleProduct = async (productId: number) => {
    try {
      await api.toggleOwnerProduct(productId);
      const prods = await api.getOwnerProducts();
      if (prods.success) setProducts(prods.products);
    } catch (err: any) {
      alert(err.message || 'Toggle failed');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذا الطبق؟' : 'Supprimer ce plat ?')) return;
    try {
      await api.deleteOwnerProduct(productId);
      const prods = await api.getOwnerProducts();
      if (prods.success) setProducts(prods.products);
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  // Advertisements Handlers
  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adModal.titleAr.trim() || !adModal.imageUrl.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال عنوان الإعلان وصورته' : 'Veuillez saisir le titre et l\'image de la publicité');
      return;
    }

    try {
      setAdSaving(true);
      if (adModal.isEdit && adModal.id) {
        await api.updateOwnerAd(adModal.id, {
          title_ar: adModal.titleAr,
          title_fr: adModal.titleFr || adModal.titleAr,
          description_ar: adModal.descAr,
          description_fr: adModal.descFr,
          image_url: adModal.imageUrl,
          target_location: adModal.targetLocation,
          placement: adModal.placement,
          badge_text: adModal.badgeText,
          discount_percentage: adModal.discountPercentage
        });
      } else {
        await api.createOwnerAd({
          title_ar: adModal.titleAr,
          title_fr: adModal.titleFr || adModal.titleAr,
          description_ar: adModal.descAr,
          description_fr: adModal.descFr,
          image_url: adModal.imageUrl,
          target_location: adModal.targetLocation,
          placement: adModal.placement,
          badge_text: adModal.badgeText,
          discount_percentage: adModal.discountPercentage,
          product_id: adModal.productId
        });
      }

      setAdModal({ ...adModal, show: false });
      const adRes = await api.getOwnerAds();
      if (adRes.success) setAds(adRes.advertisements);
      setAdSuccessMsg(lang === 'ar' ? 'تم نشر الإعلان بنجاح في المنطقة المحددة!' : 'Publicité publiée avec succès dans la zone ciblée !');
      setTimeout(() => setAdSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Ad save failed');
    } finally {
      setAdSaving(false);
    }
  };

  const handleToggleAd = async (ad: Advertisement) => {
    try {
      await api.updateOwnerAd(ad.id, { is_active: ad.is_active === 1 ? 0 : 1 });
      const adRes = await api.getOwnerAds();
      if (adRes.success) setAds(adRes.advertisements);
    } catch (err: any) {
      alert(err.message || 'Ad toggle failed');
    }
  };

  const handleDeleteAd = async (adId: number) => {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذا الإعلان؟' : 'Supprimer cette publicité ?')) return;
    try {
      await api.deleteOwnerAd(adId);
      const adRes = await api.getOwnerAds();
      if (adRes.success) setAds(adRes.advertisements);
    } catch (err: any) {
      alert(err.message || 'Delete ad failed');
    }
  };

  // Broadcasts / Messages Handlers
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastModal.titleAr.trim() || !broadcastModal.messageAr.trim()) {
      alert(lang === 'ar' ? 'يرجى كتابة عنوان الرسالة ومحتواها' : 'Veuillez saisir le titre et le contenu du message');
      return;
    }

    try {
      setBroadcastSending(true);
      const res = await api.sendOwnerBroadcast({
        title_ar: broadcastModal.titleAr,
        title_fr: broadcastModal.titleFr || broadcastModal.titleAr,
        message_ar: broadcastModal.messageAr,
        message_fr: broadcastModal.messageFr || broadcastModal.messageAr,
        target_audience: broadcastModal.targetAudience,
        target_location: broadcastModal.targetLocation,
        discount_code: broadcastModal.discountCode
      });

      if (res.success) {
        setBroadcastModal({
          show: false,
          titleAr: '',
          titleFr: '',
          messageAr: '',
          messageFr: '',
          targetAudience: 'ALL',
          targetLocation: 'ALL',
          discountCode: ''
        });
        const bRes = await api.getOwnerBroadcasts();
        if (bRes.success) setBroadcasts(bRes.broadcasts);
        setBroadcastSuccessMsg(
          lang === 'ar'
            ? `تم إرسال الإشعار بنجاح إلى ${res.sentCount} زبون في المنطقة المستهدفة!`
            : `Message diffusé avec succès à ${res.sentCount} clients ciblés !`
        );
        setTimeout(() => setBroadcastSuccessMsg(''), 5000);
      }
    } catch (err: any) {
      alert(err.message || 'Broadcast failed');
    } finally {
      setBroadcastSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">
        <Utensils className="w-8 h-8 mx-auto mb-2 animate-bounce text-amber-500" />
        <p className="text-xs font-semibold">{t('loading')}</p>
      </div>
    );
  }

  // CASE 1: NOT APPROVED YET / APPLICATION PENDING
  if (!isApproved) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {application?.status === 'PENDING' ? (
          <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-md text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
              ⏳
            </div>
            <h2 className="text-lg font-black text-slate-900">
              {lang === 'ar' ? 'طلبك قيد المراجعة والاعتماد' : 'Demande en cours d\'examen'}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              {t('pending_approval_notice')}
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl text-xs text-start rtl:text-end space-y-2 border border-slate-100">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <img src={application.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                <div>
                  <p className="font-bold text-slate-900">{application.restaurant_name}</p>
                  <p className="text-[11px] text-slate-500">{application.city}</p>
                </div>
              </div>
              <p><span className="font-bold text-slate-700">{t('phone')}:</span> {application.phone}</p>
              <p><span className="font-bold text-slate-700">{t('status')}:</span> <span className="font-bold text-amber-600">PENDING (قيد المراجعة)</span></p>
            </div>
          </div>
        ) : application?.status === 'REJECTED' ? (
          <div className="bg-white rounded-3xl p-8 border border-red-200 shadow-md text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">
              ❌
            </div>
            <h2 className="text-lg font-black text-slate-900">
              {lang === 'ar' ? 'تم رفض طلب الاعتماد السابق' : 'Demande refusée'}
            </h2>
            <p className="text-xs text-red-600 font-semibold">
              {lang === 'ar' ? 'سبب الرفض:' : 'Motif :'} {application.rejection_reason || 'Dossier non conforme'}
            </p>
            <button
              onClick={() => setApplication(null)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
            >
              {lang === 'ar' ? 'تقديم طلب جديد' : 'Soumettre à nouveau'}
            </button>
          </div>
        ) : (
          // APPLICATION REGISTRATION FORM
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">{t('apply_restaurant_title')}</h2>
                <p className="text-xs text-slate-500">DZ Order Partner Onboarding</p>
              </div>
            </div>

            <form onSubmit={submitApplication} className="space-y-5">
              {/* RESTAURANT IMAGES SECTION */}
              <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 space-y-4">
                <h3 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span>📸</span>
                  <span>{lang === 'ar' ? 'صور المطعم (الشعار والغلاف)' : 'Photos du restaurant (Logo & Couverture)'}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Restaurant Logo */}
                  <ImageUploader
                    value={appLogoUrl}
                    onChange={setAppLogoUrl}
                    label={lang === 'ar' ? 'شعار المطعم (Logo)' : 'Logo du restaurant'}
                    helperText={lang === 'ar' ? 'صورة مربعة مميزة للمطعم' : 'Format carré recommandé'}
                    aspect="square"
                    type="logo"
                    lang={lang}
                  />

                  {/* Restaurant Cover */}
                  <ImageUploader
                    value={appCoverUrl}
                    onChange={setAppCoverUrl}
                    label={lang === 'ar' ? 'واجهة المطعم / الغلاف (Cover)' : 'Bannière / Façade du restaurant'}
                    helperText={lang === 'ar' ? 'صورة عريضة لواجهة المطعم' : 'Format paysage panoramique'}
                    aspect="banner"
                    type="cover"
                    lang={lang}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('restaurant_name')}</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="مطعم البهجة العاصمي"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('phone')}</label>
                  <input
                    type="tel"
                    required
                    value={appPhone}
                    onChange={(e) => setAppPhone(e.target.value)}
                    placeholder="+213 21 63 45 78"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('restaurant_category')}</label>
                  <select
                    value={appCategory}
                    onChange={(e) => setAppCategory(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {restCategories.map((c) => (
                      <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_fr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('city')}</label>
                  <input
                    type="text"
                    required
                    value={appCity}
                    onChange={(e) => setAppCity(e.target.value)}
                    placeholder="الجزائر العاصمة / Alger"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('opening_hours')}</label>
                  <input
                    type="text"
                    value={appHours}
                    onChange={(e) => setAppHours(e.target.value)}
                    placeholder="10:00 - 23:30"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('delivery_address')}</label>
                <input
                  type="text"
                  required
                  value={appAddress}
                  onChange={(e) => setAppAddress(e.target.value)}
                  placeholder="12 شارع ديدوش مراد، البريد المركزي"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'وصف المطعم بالعربية' : 'Description (Arabe)'}</label>
                <textarea
                  rows={2}
                  value={appDescAr}
                  onChange={(e) => setAppDescAr(e.target.value)}
                  placeholder="أشهى الأطباق والمأكولات التقليدية العاصمية..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'وصف المطعم بالفرنسية' : 'Description (Français)'}</label>
                <textarea
                  rows={2}
                  value={appDescFr}
                  onChange={(e) => setAppDescFr(e.target.value)}
                  placeholder="Spécialités traditionnelles raffinées..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>{lang === 'ar' ? 'إرسال طلب الاعتماد مع الصور للإدارة' : 'Soumettre le dossier avec photos à l\'administration'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // CASE 2: APPROVED RESTAURANT OWNER DASHBOARD
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Restaurant Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={restaurant?.logo_url} alt={restaurant?.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900">{restaurant?.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                {lang === 'ar' ? 'معتمد' : 'Approuvé'}
              </span>
              {restaurant?.is_delivering ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {lang === 'ar' ? 'يستقبل طلبات' : 'En livraison'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {lang === 'ar' ? 'متوقف مؤقتاً' : 'Suspendu'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
              <span>{restaurant?.city}</span>
              <span>•</span>
              <span>⭐ {restaurant?.rating} ({restaurant?.review_count} {t('reviews_count')})</span>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap rounded-2xl bg-slate-100 p-1 gap-1">
          <button
            onClick={() => setTab('orders')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${tab === 'orders' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
          >
            {t('active_incoming_orders')} ({orders.filter(o => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)).length})
          </button>
          <button
            onClick={() => setTab('menu')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${tab === 'menu' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
          >
            {t('manage_menu')} ({products.length})
          </button>
          <button
            onClick={() => setTab('ads')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'ads' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'ar' ? 'طلب إعلان ترويجي 📢' : 'Publicités 📢'}</span>
          </button>
          <button
            onClick={() => setTab('broadcasts')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'broadcasts' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
          >
            <Send className="w-3.5 h-3.5 text-blue-500" />
            <span>{lang === 'ar' ? 'رسائل للزبائن' : 'Messages'}</span>
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${tab === 'stats' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
          >
            {lang === 'ar' ? 'الإحصائيات' : 'Statistiques'}
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'settings' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'صور وبيانات المطعم' : 'Infos'}</span>
          </button>
        </div>
      </div>

      {/* SUCCESS BANNERS */}
      {adSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{adSuccessMsg}</span>
        </div>
      )}
      {broadcastSuccessMsg && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{broadcastSuccessMsg}</span>
        </div>
      )}

      {/* TAB 1: ORDERS PIPELINE */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>{lang === 'ar' ? 'لا توجد طلبات واردة حالياً' : 'Aucune commande pour le moment'}</p>
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">#{ord.order_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        ord.status === 'PENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        ord.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                        ord.status === 'PREPARING' ? 'bg-purple-100 text-purple-800' :
                        ord.status === 'READY' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t(`status_${ord.status.toLowerCase()}`)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ord.customer_name} • {ord.customer_phone}
                    </p>
                  </div>

                  <div className="text-end rtl:text-start">
                    <span className="text-sm font-black text-blue-600">{ord.total_amount} {t('dzd')}</span>
                    <span className="block text-[10px] text-slate-400">{t('cash_on_delivery')}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="py-3 space-y-1">
                  {ord.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-xs text-slate-700">
                      <span>{it.quantity}x {lang === 'ar' ? it.product_name_ar : it.product_name_fr}</span>
                      <span className="font-semibold">{it.total_price} {t('dzd')}</span>
                    </div>
                  ))}
                  {ord.delivery_instructions && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg mt-2">
                      <strong>Note:</strong> {ord.delivery_instructions}
                    </p>
                  )}
                </div>

                {/* Workflow Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                  {ord.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleAcceptOrder(ord.id)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                      >
                        {t('accept_order')}
                      </button>
                      <button
                        onClick={() => setRejectModal({ show: true, orderId: ord.id, reason: '' })}
                        className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs transition cursor-pointer"
                      >
                        {t('reject_order')}
                      </button>
                    </>
                  )}

                  {ord.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handlePrepareOrder(ord.id)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                      {t('start_preparing')}
                    </button>
                  )}

                  {ord.status === 'PREPARING' && (
                    <button
                      onClick={() => handleReadyOrder(ord.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                      {t('mark_ready')}
                    </button>
                  )}

                  {ord.status === 'READY' && (
                    <span className="text-xs font-bold text-emerald-600 py-1 flex items-center gap-1">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'بانتظار استلام المندوب' : 'En attente d\'un coursier'}</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: MENU & PRODUCTS CRUD */}
      {tab === 'menu' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900">{t('manage_menu')}</h3>
            <button
              onClick={() => setProductModal({
                show: true,
                isEdit: false,
                categoryId: categories[0]?.id || 1,
                nameAr: '',
                nameFr: '',
                descAr: '',
                descFr: '',
                price: 800,
                imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
              })}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add_dish')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="relative h-36 rounded-xl overflow-hidden mb-3 bg-slate-100">
                    <img src={p.image_url} alt={p.name_fr} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleToggleProduct(p.id)}
                      className={`absolute top-2 start-2 px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs cursor-pointer ${
                        p.is_available ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                      }`}
                    >
                      {p.is_available ? (lang === 'ar' ? 'متوفر' : 'En stock') : (lang === 'ar' ? 'غير متوفر' : 'Épuisé')}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{lang === 'ar' ? p.name_ar : p.name_fr}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{lang === 'ar' ? p.description_ar : p.description_fr}</p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-50">
                  <span className="text-xs font-black text-blue-600">{p.price} {t('dzd')}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setProductModal({
                        show: true,
                        isEdit: true,
                        productId: p.id,
                        categoryId: p.category_id,
                        nameAr: p.name_ar,
                        nameFr: p.name_fr,
                        descAr: p.description_ar,
                        descFr: p.description_fr,
                        price: p.price,
                        imageUrl: p.image_url
                      })}
                      className="p-1.5 text-slate-500 hover:text-blue-600 transition cursor-pointer"
                      title={t('edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 transition cursor-pointer"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ADVERTISEMENTS NOTICE FOR RESTAURANTS (إدارة الإعلانات حصرية للمدير) */}
      {tab === 'ads' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl text-center space-y-6 relative overflow-hidden">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center mx-auto text-4xl shadow-inner border border-white/20">
              📢
            </div>

            <div className="max-w-xl mx-auto space-y-3">
              <span className="px-3.5 py-1 rounded-full bg-white/20 text-amber-100 text-xs font-black backdrop-blur-md uppercase tracking-wider">
                {lang === 'ar' ? 'قسم الحملات والإعلانات الترويجية' : 'Espace Publicitaire & Promotion'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                {lang === 'ar'
                  ? 'للإعلان تواصل مع صاحب التطبيق في الخاص'
                  : 'Pour toute publicité, contactez le propriétaire de l\'application en privé'}
              </h3>
              <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                {lang === 'ar'
                  ? 'يتم تنسيق ونشر الإعلانات المصورة والعروض الترويجية الحصرية حصرياً عبر إدارة المنصة لضمان أفضل وصول وزيادة مبيعات مطعمك في منطقتك.'
                  : 'Les campagnes publicitaires ciblées sur la plateforme sont gérées directement par l\'administration. Contactez-nous pour mettre en avant votre restaurant.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href="https://wa.me/213555000000?text=مرحبا، أود الإعلان عن مطعمي في منصة DZ Order"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-black text-xs shadow-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-2"
              >
                <span className="text-base">💬</span>
                <span>{lang === 'ar' ? 'تواصل عبر واتساب (WhatsApp)' : 'Contacter sur WhatsApp'}</span>
              </a>

              <a
                href="tel:+213555000000"
                className="px-5 py-3 rounded-2xl bg-black/20 hover:bg-black/30 text-white font-black text-xs border border-white/30 backdrop-blur-md transition cursor-pointer flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>{lang === 'ar' ? 'اتصال هاتفي مباشر بالإدارة' : 'Appeler l\'administration'}</span>
              </a>
            </div>

            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md max-w-lg mx-auto text-start rtl:text-end text-xs text-amber-100 border border-white/10 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{lang === 'ar' ? 'مزايا الإعلان عبر إدارة المنصة:' : 'Avantages des campagnes :'}</span>
              </p>
              <p>• {lang === 'ar' ? 'بانر ترويجي رئيسي (Hero Banner) في واجهة التطبيق' : 'Bannière principale en haut de page'}</p>
              <p>• {lang === 'ar' ? 'استهداف جغرافي دقيق بحسب ولايتك أو كامل الجزائر' : 'Ciblage par wilaya spécifique ou national'}</p>
              <p>• {lang === 'ar' ? 'أكواد خصم وشريط عروض مميز يبرز مطعمك في الصدارة' : 'Bons plans et mise en avant de vos menus'}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER BROADCASTS / MESSAGES (إرسال رسائل وإشعارات للزبائن) */}
      {tab === 'broadcasts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <span>{lang === 'ar' ? 'إرسال رسائل وإشعارات مباشرة للزبائن' : 'Diffusion de Messages aux Clients'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                {lang === 'ar'
                  ? 'أرسل تنبيهات فورية، عروض ترويجية، وأكواد خصم للزبائن في ولايتك أو لزبائنك السابقين مباشرة في هواتفهم.'
                  : 'Envoyez des notifications et offres promotionnelles directement aux clients ciblés de votre zone.'}
              </p>
            </div>

            <button
              onClick={() => setBroadcastModal({
                show: true,
                titleAr: '',
                titleFr: '',
                messageAr: '',
                messageFr: '',
                targetAudience: 'ALL',
                targetLocation: restaurant?.city || 'ALL',
                discountCode: ''
              })}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إرسال رسالة جديدة' : 'Envoyer un message'}</span>
            </button>
          </div>

          {broadcasts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
                ✉️
              </div>
              <h4 className="text-base font-black text-slate-900">
                {lang === 'ar' ? 'لم تقم بإرسال أي رسائل ترويجية بعد' : 'Aucun message diffusé pour le moment'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {lang === 'ar'
                  ? 'أرسل الآن رسالة مع كود خصم لتشجيع الزبائن في منطقتك على الطلب من مطعمك اليوم!'
                  : 'Envoyez un code promo ou une offre spéciale pour stimuler les commandes dès aujourd\'hui.'}
              </p>
              <button
                onClick={() => setBroadcastModal({
                  show: true,
                  titleAr: '',
                  titleFr: '',
                  messageAr: '',
                  messageFr: '',
                  targetAudience: 'ALL',
                  targetLocation: restaurant?.city || 'ALL',
                  discountCode: ''
                })}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إرسال أول رسالة ترويجية' : 'Diffuser mon premier message'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                        📢
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{lang === 'ar' ? b.title_ar : b.title_fr}</h4>
                        <span className="text-[10px] text-slate-400">{b.created_at}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] flex items-center gap-1 border border-emerald-100">
                        <Users className="w-3 h-3 text-emerald-600" />
                        <span>{lang === 'ar' ? `وصلت إلى ${b.sent_count} زبون` : `Reçu par ${b.sent_count} clients`}</span>
                      </span>
                      {b.discount_code && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-mono font-bold text-[11px] border border-amber-200">
                          🏷️ {b.discount_code}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {lang === 'ar' ? b.message_ar : b.message_fr}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{lang === 'ar' ? 'الولاية المستهدفة:' : 'Zone:'} {b.target_location === 'ALL' ? (lang === 'ar' ? 'كامل الجزائر' : 'National') : b.target_location}</span>
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{b.target_audience === 'PAST_CUSTOMERS' ? (lang === 'ar' ? 'زبائن المطعم السابقين' : 'Anciens clients') : (lang === 'ar' ? 'جميع الزبائن' : 'Tous les clients')}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STATS */}
      {tab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block mb-1">{t('restaurant_sales')}</span>
              <span className="text-2xl font-black text-blue-600">{stats.totalSales} {t('dzd')}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block mb-1">{lang === 'ar' ? 'الطلبات المكتملة' : 'Commandes livrées'}</span>
              <span className="text-2xl font-black text-emerald-600">{stats.completedOrders}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block mb-1">{lang === 'ar' ? 'تقييم المطعم' : 'Note moyenne'}</span>
              <span className="text-2xl font-black text-amber-500">⭐ {stats.averageRating}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RESTAURANT PROFILE, PHOTOS & SETTINGS */}
      {tab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">
                {lang === 'ar' ? 'إعدادات وصور المطعم' : 'Paramètres et photos du restaurant'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'يمكنك تعديل وتحديث صورة الغلاف، الشعار، ومواعيد العمل وحالة التوصيل في أي وقت'
                  : 'Modifiez la photo de couverture, le logo, les horaires et les informations'}
              </p>
            </div>
          </div>

          {settingsSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{settingsSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* PHOTO MANAGEMENT (LOGO & COVER BANNER) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>🖼️</span>
                <span>{lang === 'ar' ? 'صور المطعم الرسمية' : 'Photos officielles du restaurant'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUploader
                  value={settingsLogoUrl}
                  onChange={setSettingsLogoUrl}
                  label={lang === 'ar' ? 'شعار المطعم (Logo)' : 'Logo du restaurant'}
                  helperText={lang === 'ar' ? 'يظهر كأيقونة للمطعم في التطبيق' : 'Affiché comme icône'}
                  aspect="square"
                  type="logo"
                  lang={lang}
                />

                <ImageUploader
                  value={settingsCoverUrl}
                  onChange={setSettingsCoverUrl}
                  label={lang === 'ar' ? 'غلاف وواجهة المطعم (Cover Banner)' : 'Bannière de couverture'}
                  helperText={lang === 'ar' ? 'يظهر كصورة عريضة للمطعم' : 'Affiché en haut de la fiche'}
                  aspect="banner"
                  type="cover"
                  lang={lang}
                />
              </div>
            </div>

            {/* RESTAURANT INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('restaurant_name')}</label>
                <input
                  type="text"
                  required
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('phone')}</label>
                <input
                  type="tel"
                  required
                  value={settingsPhone}
                  onChange={(e) => setSettingsPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('city')}</label>
                <input
                  type="text"
                  required
                  value={settingsCity}
                  onChange={(e) => setSettingsCity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('opening_hours')}</label>
                <input
                  type="text"
                  value={settingsHours}
                  onChange={(e) => setSettingsHours(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('delivery_address')}</label>
              <input
                type="text"
                required
                value={settingsAddress}
                onChange={(e) => setSettingsAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'وصف المطعم بالعربية' : 'Description (Arabe)'}</label>
                <textarea
                  rows={2}
                  value={settingsDescAr}
                  onChange={(e) => setSettingsDescAr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'ar' ? 'وصف المطعم بالفرنسية' : 'Description (Français)'}</label>
                <textarea
                  rows={2}
                  value={settingsDescFr}
                  onChange={(e) => setSettingsDescFr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* STATUS TOGGLES */}
            <div className="flex flex-wrap items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={settingsIsDelivering}
                  onChange={(e) => setSettingsIsDelivering(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>{lang === 'ar' ? 'استقبال طلبات التوصيل (Activer la livraison)' : 'Activer la livraison'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={settingsIsActive}
                  onChange={(e) => setSettingsIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span>{lang === 'ar' ? 'المطعم مفتوح ونشط في المنصة' : 'Restaurant ouvert et visible'}</span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={settingsSaving}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{settingsSaving ? t('loading') : (lang === 'ar' ? 'حفظ تعديلات المطعم والصور' : 'Enregistrer les modifications')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REJECT ORDER MODAL */}
      {rejectModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-900">{t('rejection_reason_prompt')}</h3>
            <textarea
              rows={3}
              required
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder={lang === 'ar' ? 'سبب الرفض (مثال: نفاد المكونات، ضغط طلبات كبير)...' : 'Raison du refus (ex: rupture d\'ingrédients)...'}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRejectOrder}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs cursor-pointer"
              >
                {t('confirm')}
              </button>
              <button
                onClick={() => setRejectModal({ show: false, orderId: null, reason: '' })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {productModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <h3 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
              {productModal.isEdit ? t('edit') : t('add_dish')}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <ImageUploader
                value={productModal.imageUrl}
                onChange={(url) => setProductModal({ ...productModal, imageUrl: url })}
                label={lang === 'ar' ? 'صورة الطبق / الوجبة' : 'Photo du plat'}
                helperText={lang === 'ar' ? 'التقط من الكاميرا، ارفع ملف، أو اختر طبق جزائري' : 'Prenez une photo ou choisissez parmi les plats'}
                aspect="dish"
                type="dish"
                lang={lang}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('dish_name_ar')}</label>
                  <input
                    type="text"
                    required
                    value={productModal.nameAr}
                    onChange={(e) => setProductModal({ ...productModal, nameAr: e.target.value })}
                    placeholder="رشتة عاصمية"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('dish_name_fr')}</label>
                  <input
                    type="text"
                    required
                    value={productModal.nameFr}
                    onChange={(e) => setProductModal({ ...productModal, nameFr: e.target.value })}
                    placeholder="Rechta Algéroise"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('dish_price')}</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={productModal.price}
                    onChange={(e) => setProductModal({ ...productModal, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={productModal.categoryId}
                    onChange={(e) => setProductModal({ ...productModal, categoryId: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_fr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('dish_desc_ar')}</label>
                <textarea
                  rows={2}
                  value={productModal.descAr}
                  onChange={(e) => setProductModal({ ...productModal, descAr: e.target.value })}
                  placeholder="رشتة بالدجاج والحمص والمرقة البيضاء..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('dish_desc_fr')}</label>
                <textarea
                  rows={2}
                  value={productModal.descFr}
                  onChange={(e) => setProductModal({ ...productModal, descFr: e.target.value })}
                  placeholder="Rechta traditionnelle sauce blanche au poulet..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer transition">
                  {t('save')}
                </button>
                <button type="button" onClick={() => setProductModal({ ...productModal, show: false })} className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition">
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ADVERTISEMENT MODAL (عمل إعلان بصورة مع تحديد المكان) */}
      {adModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <span>
                  {adModal.isEdit
                    ? (lang === 'ar' ? 'تعديل الإعلان' : 'Modifier la publicité')
                    : (lang === 'ar' ? 'إنشاء إعلان جديد لمطعمك' : 'Créer une nouvelle publicité')}
                </span>
              </h3>
              <button
                onClick={() => setAdModal({ ...adModal, show: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAd} className="space-y-4">
              {/* Ad Image with file upload & presets */}
              <ImageUploader
                value={adModal.imageUrl}
                onChange={(url) => setAdModal({ ...adModal, imageUrl: url })}
                label={lang === 'ar' ? 'صورة الإعلان (بانر عريض)' : 'Bannière / Image de la publicité'}
                helperText={lang === 'ar' ? 'التقط من الكاميرا، ارفع ملفك، أو اختر من الصور' : 'Téléversez une image attractive'}
                aspect="banner"
                type="cover"
                lang={lang}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'عنوان الإعلان بالعربية *' : 'Titre (Arabe) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={adModal.titleAr}
                    onChange={(e) => setAdModal({ ...adModal, titleAr: e.target.value })}
                    placeholder="وجبة عائلية مميزة بتخفيض 25%!"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'عنوان الإعلان بالفرنسية' : 'Titre (Français)'}
                  </label>
                  <input
                    type="text"
                    value={adModal.titleFr}
                    onChange={(e) => setAdModal({ ...adModal, titleFr: e.target.value })}
                    placeholder="Menu Familial -25% de Réduction !"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* TARGET LOCATION (تحديد المكان الذي يريد) */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
                <label className="block text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'ar' ? 'تحديد المكان / الولاية المستهدفة للإعلان *' : 'Zone géographique ciblée (Wilaya) *'}</span>
                </label>
                <select
                  value={adModal.targetLocation}
                  onChange={(e) => setAdModal({ ...adModal, targetLocation: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-blue-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                >
                  {ALGERIAN_LOCATIONS.map((loc) => (
                    <option key={loc.value} value={loc.value}>
                      {lang === 'ar' ? loc.labelAr : loc.labelFr}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-600">
                  {lang === 'ar'
                    ? 'سيظهر هذا الإعلان فقط للزبائن المتواجدين في هذه الولاية أو عند تصفحهم لمطاعمها'
                    : 'Cette annonce sera affichée pour les utilisateurs se trouvant ou commandant dans cette zone.'}
                </p>
              </div>

              {/* PLACEMENT & BADGE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'مكان ظهور الإعلان في التطبيق' : 'Emplacement d\'affichage'}
                  </label>
                  <select
                    value={adModal.placement}
                    onChange={(e) => setAdModal({ ...adModal, placement: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="HERO">{lang === 'ar' ? 'البانر الرئيسي العلوي (Hero Banner)' : 'Bannière Principale du Haut'}</option>
                    <option value="OFFERS">{lang === 'ar' ? 'شريط العروض الحصرية (Bons Plans)' : 'Section Offres Exclusives'}</option>
                    <option value="POPULAR">{lang === 'ar' ? 'أعلى قائمة المطاعم الموصى بها' : 'En tête des restaurants'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'شارة العرض (Badge)' : 'Badge promotionnel'}
                  </label>
                  <input
                    type="text"
                    value={adModal.badgeText}
                    onChange={(e) => setAdModal({ ...adModal, badgeText: e.target.value })}
                    placeholder="عرض خاص اليوم / Offre Flash"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* DISCOUNT PERCENTAGE & OPTIONAL PRODUCT LINK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'نسبة الخصم % (اختياري)' : 'Pourcentage de réduction %'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={adModal.discountPercentage}
                    onChange={(e) => setAdModal({ ...adModal, discountPercentage: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'ربط بطبق معين (اختياري)' : 'Lier à un plat spécifique'}
                  </label>
                  <select
                    value={adModal.productId || ''}
                    onChange={(e) => setAdModal({ ...adModal, productId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="">{lang === 'ar' ? '-- بدون ربط (يربط بالمطعم ككل) --' : '-- Lien vers le restaurant entier --'}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {lang === 'ar' ? p.name_ar : p.name_fr} ({p.price} DZD)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'تفاصيل العرض بالعربية' : 'Description de l\'offre (Arabe)'}
                </label>
                <textarea
                  rows={2}
                  value={adModal.descAr}
                  onChange={(e) => setAdModal({ ...adModal, descAr: e.target.value })}
                  placeholder="استمتع بأشهى المأكولات مع توصيل سريع لجميع أحياء المدينة..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={adSaving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{adSaving ? t('loading') : (lang === 'ar' ? 'نشر الإعلان في المنطقة المحددة' : 'Publier dans la zone ciblée')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdModal({ ...adModal, show: false })}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND BROADCAST MODAL (إرسال رسائل للزبائن) */}
      {broadcastModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <span>{lang === 'ar' ? 'إرسال إشعار ترويجي للزبائن' : 'Diffuser une notification aux clients'}</span>
              </h3>
              <button
                onClick={() => setBroadcastModal({ ...broadcastModal, show: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {/* TARGET AUDIENCE & LOCATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الجمهور المستهدف' : 'Audience cible'}
                  </label>
                  <select
                    value={broadcastModal.targetAudience}
                    onChange={(e) => setBroadcastModal({ ...broadcastModal, targetAudience: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold"
                  >
                    <option value="ALL">{lang === 'ar' ? 'جميع الزبائن في المنصة' : 'Tous les clients'}</option>
                    <option value="PAST_CUSTOMERS">{lang === 'ar' ? 'زبائن مطعمي السابقين فقط' : 'Mes anciens clients uniquement'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'المنطقة المستهدفة' : 'Zone ciblée'}
                  </label>
                  <select
                    value={broadcastModal.targetLocation}
                    onChange={(e) => setBroadcastModal({ ...broadcastModal, targetLocation: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold"
                  >
                    {ALGERIAN_LOCATIONS.map((loc) => (
                      <option key={loc.value} value={loc.value}>
                        {lang === 'ar' ? loc.labelAr : loc.labelFr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'عنوان الرسالة *' : 'Titre du message *'}
                </label>
                <input
                  type="text"
                  required
                  value={broadcastModal.titleAr}
                  onChange={(e) => setBroadcastModal({ ...broadcastModal, titleAr: e.target.value })}
                  placeholder="عرض حصري اليوم من مطعمنا! 🍕"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'نص الرسالة الترويجية *' : 'Contenu du message *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={broadcastModal.messageAr}
                  onChange={(e) => setBroadcastModal({ ...broadcastModal, messageAr: e.target.value })}
                  placeholder="اطلب الآن واستفد من خصم خاص على جميع الأطباق التقليدية والفاست فود مع توصيل فوري إلى باب بيتك..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'كود الخصم (اختياري)' : 'Code Promo (optionnel)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={broadcastModal.discountCode}
                    onChange={(e) => setBroadcastModal({ ...broadcastModal, discountCode: e.target.value.toUpperCase() })}
                    placeholder="DZ2025"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold tracking-wider uppercase text-blue-600"
                  />
                  <Tag className="w-4 h-4 text-slate-400 absolute end-3 top-3" />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-[11px] text-amber-800 leading-relaxed">
                💡 {lang === 'ar'
                  ? 'ستصل هذه الرسالة كإشعار فوري داخل التطبيق لجميع الزبائن المحددين في الولاية المختارة، متضمنة كود الخصم ورابط مباشر لمطعمك.'
                  : 'Cette notification sera transmise instantanément dans l\'application à tous les clients ciblés.'}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={broadcastSending}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{broadcastSending ? t('loading') : (lang === 'ar' ? 'إرسال الإشعار للزبائن الآن' : 'Diffuser la notification')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastModal({ ...broadcastModal, show: false })}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
