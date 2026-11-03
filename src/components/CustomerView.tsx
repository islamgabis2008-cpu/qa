import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Restaurant, RestaurantCategory, Product, CartData, Order, Advertisement } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Search,
  Star,
  Clock,
  Bike,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Phone,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  MessageSquare,
  AlertCircle,
  Megaphone,
  Sparkles,
  Map as MapIcon,
  LayoutGrid
} from 'lucide-react';
import { RestaurantMap } from './RestaurantMap.js';
import { DeliveryTrackingMap } from './DeliveryTrackingMap.js';
import { RestaurantLocationMap } from './RestaurantLocationMap.js';

interface CustomerViewProps {
  selectedCity: string;
  isCartOpen: boolean;
  onCloseCart: () => void;
  activeOrderToTrack: number | null;
  onCloseTracking: () => void;
  onTrackOrder: (id: number) => void;
  currentTab: string;
  onOpenAuth?: (initialMode?: 'login' | 'register', initialRole?: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER') => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  selectedCity,
  isCartOpen,
  onCloseCart,
  activeOrderToTrack,
  onCloseTracking,
  onTrackOrder,
  currentTab,
  onOpenAuth
}) => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  // Data states
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [restaurantViewMode, setRestaurantViewMode] = useState<'grid' | 'map'>('grid');

  // Restaurant details modal
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);
  const [activeRestaurantMenu, setActiveRestaurantMenu] = useState<Product[]>([]);
  const [activeRestaurantReviews, setActiveRestaurantReviews] = useState<any[]>([]);
  const [restaurantModalTab, setRestaurantModalTab] = useState<'menu' | 'location'>('menu');

  // Cart state
  const [cart, setCart] = useState<CartData | null>(null);
  const [cartConflictModal, setCartConflictModal] = useState<{
    show: boolean;
    pendingProduct: Product | null;
    existingRestaurantName: string;
  }>({ show: false, pendingProduct: null, existingRestaurantName: '' });

  // Checkout state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.addresses?.[0] ? `${user.addresses[0].district}, ${user.addresses[0].street} - ${user.addresses[0].city}` : 'الجزائر العاصمة، حي ديدوش مراد'
  );
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [proposedDeliveryFee, setProposedDeliveryFee] = useState<string>('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Tracking state
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [counterFeeInput, setCounterFeeInput] = useState<string>('');
  const [feeActionLoading, setFeeActionLoading] = useState<boolean>(false);

  // Review & Complaint modal
  const [reviewModal, setReviewModal] = useState<{ show: boolean; orderId: number | null; rating: number; comment: string }>({
    show: false,
    orderId: null,
    rating: 5,
    comment: ''
  });
  const [complaintModal, setComplaintModal] = useState<{ show: boolean; orderId: number | null; subject: string; description: string }>({
    show: false,
    orderId: null,
    subject: '',
    description: ''
  });

  // Public advertisements state
  const [publicAds, setPublicAds] = useState<Advertisement[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [restRes, catRes, prodRes, adsRes] = await Promise.all([
        api.getRestaurants({ city: selectedCity, category: selectedCategory, search: searchQuery }).catch((err) => {
          console.error('Failed to get restaurants:', err);
          return { success: false, restaurants: [], count: 0 };
        }),
        api.getRestaurantCategories().catch((err) => {
          console.error('Failed to get categories:', err);
          return { success: false, categories: [] };
        }),
        api.getProducts({ city: selectedCity }).catch((err) => {
          console.error('Failed to get products:', err);
          return { success: false, products: [], count: 0 };
        }),
        api.getPublicAds({ city: selectedCity }).catch((err) => {
          console.error('Failed to get public ads:', err);
          return { success: false, count: 0, advertisements: [] };
        })
      ]);

      if (restRes.success) setRestaurants(restRes.restaurants);
      if (catRes.success) setCategories(catRes.categories);
      if (prodRes.success) setPopularProducts(prodRes.products.slice(0, 8));
      if (adsRes.success) setPublicAds(adsRes.advertisements);

      // Load cart safely
      try {
        const cartRes = await api.getCart();
        if (cartRes.success && cartRes.cart) {
          setCart(cartRes.cart);
        }
      } catch (err) {
        setCart({ id: 0, items: [], restaurant: null, subtotal: 0, delivery_fee: 0, total: 0, itemCount: 0 });
      }
    } catch (e) {
      console.error('Error loading customer data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCity, selectedCategory, searchQuery, user]);

  // Load customer order history if orders tab and user is logged in
  useEffect(() => {
    if (currentTab === 'orders') {
      if (user) {
        api.getMyOrders().then((res) => {
          if (res.success) setMyOrders(res.orders);
        }).catch((err) => {
          console.warn('Orders fetch error:', err);
          setMyOrders([]);
        });
      } else {
        setMyOrders([]);
      }
    }
  }, [currentTab, user]);

  // Poll tracked order if active
  useEffect(() => {
    if (!activeOrderToTrack) {
      setTrackedOrder(null);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await api.getOrderDetails(activeOrderToTrack);
        if (res.success) {
          setTrackedOrder(res);
        }
      } catch (err) {
        console.error('Track order error:', err);
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 4000);
    return () => clearInterval(interval);
  }, [activeOrderToTrack]);

  const openRestaurantDetails = async (restaurant: Restaurant) => {
    setActiveRestaurant(restaurant);
    setRestaurantModalTab('menu');
    try {
      const res = await api.getRestaurantDetails(restaurant.id);
      if (res.success) {
        setActiveRestaurantMenu(res.products);
        setActiveRestaurantReviews(res.reviews);
      }
    } catch (e) {
      console.error('Could not fetch restaurant details:', e);
    }
  };

  const handleAddToCart = async (product: Product, clearIfConflict = false) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    try {
      await api.addToCart(product.id, 1, '', clearIfConflict);
      const cartRes = await api.getCart();
      if (cartRes.success) setCart(cartRes.cart);
      setCartConflictModal({ show: false, pendingProduct: null, existingRestaurantName: '' });
    } catch (err: any) {
      if (err.code === 'CART_RESTAURANT_CONFLICT') {
        setCartConflictModal({
          show: true,
          pendingProduct: product,
          existingRestaurantName: err.data?.existingRestaurantName || 'Restaurant'
        });
      } else {
        alert(err.message || 'Could not add to cart');
      }
    }
  };

  const updateQuantity = async (itemId: number, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    try {
      await api.updateCartItem(itemId, newQty);
      const cartRes = await api.getCart();
      if (cartRes.success) setCart(cartRes.cart);
    } catch (e) {
      console.error('Update quantity error:', e);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await api.removeCartItem(itemId);
      const cartRes = await api.getCart();
      if (cartRes.success) setCart(cartRes.cart);
    } catch (e) {
      console.error('Remove item error:', e);
    }
  };

  const handleCheckout = async () => {
    if (!deliveryAddress.trim()) {
      alert(t('required'));
      return;
    }

    try {
      setOrderSubmitting(true);
      const parsedProposedFee = proposedDeliveryFee.trim() !== '' ? Number(proposedDeliveryFee) : undefined;
      const res = await api.placeOrder({
        delivery_address: deliveryAddress,
        delivery_instructions: deliveryNotes,
        proposed_delivery_fee: parsedProposedFee
      });

      if (res.success) {
        onCloseCart();
        setIsCheckingOut(false);
        setProposedDeliveryFee('');
        const cartRes = await api.getCart();
        if (cartRes.success) setCart(cartRes.cart);
        onTrackOrder(res.orderId);
      }
    } catch (err: any) {
      alert(err.message || 'Order failed');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleAcceptDeliveryFee = async (orderId: number) => {
    try {
      setFeeActionLoading(true);
      const res = await api.acceptDeliveryFee(orderId);
      if (res.success) {
        alert(lang === 'ar' ? 'تم تأكيد والاتفاق على سعر التوصيل بنجاح!' : 'Frais de livraison confirmés !');
        const updated = await api.getOrderDetails(orderId);
        if (updated.success) setTrackedOrder(updated);
        api.getMyOrders().then(r => r.success && setMyOrders(r.orders));
      }
    } catch (err: any) {
      alert(err.message || 'Error accepting fee');
    } finally {
      setFeeActionLoading(false);
    }
  };

  const handleProposeDeliveryFee = async (orderId: number, fee: number) => {
    if (!fee || fee <= 0) {
      alert(lang === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Veuillez saisir un montant valide');
      return;
    }
    try {
      setFeeActionLoading(true);
      const res = await api.proposeDeliveryFee(orderId, fee);
      if (res.success) {
        alert(lang === 'ar' ? 'تم إرسال اقتراحك للمندوب بنجاح' : 'Proposition envoyée au coursier');
        setCounterFeeInput('');
        const updated = await api.getOrderDetails(orderId);
        if (updated.success) setTrackedOrder(updated);
        api.getMyOrders().then(r => r.success && setMyOrders(r.orders));
      }
    } catch (err: any) {
      alert(err.message || 'Error proposing fee');
    } finally {
      setFeeActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Confirmer l\'annulation ?')) return;
    try {
      await api.cancelOrder(orderId, 'Client cancellation');
      const res = await api.getOrderDetails(orderId);
      if (res.success) setTrackedOrder(res);
      api.getMyOrders().then(r => r.success && setMyOrders(r.orders));
    } catch (err: any) {
      alert(err.message || 'Cannot cancel');
    }
  };

  const submitReview = async () => {
    if (!reviewModal.orderId) return;
    try {
      await api.submitReview(reviewModal.orderId, reviewModal.rating, reviewModal.comment);
      setReviewModal({ show: false, orderId: null, rating: 5, comment: '' });
      alert(lang === 'ar' ? 'شكراً على تقييمك!' : 'Merci pour votre avis !');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Review failed');
    }
  };

  const submitComplaint = async () => {
    if (!complaintModal.orderId || !complaintModal.subject.trim()) return;
    try {
      await api.submitComplaint(complaintModal.orderId, complaintModal.subject, complaintModal.description);
      setComplaintModal({ show: false, orderId: null, subject: '', description: '' });
      alert(lang === 'ar' ? 'تم تسجيل شكواك وسيتواصل معك الدعم الفني' : 'Réclamation enregistrée');
    } catch (err: any) {
      alert(err.message || 'Complaint failed');
    }
  };

  // ORDER HISTORY VIEW
  if (currentTab === 'orders') {
    if (!user) {
      return (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
              📦
            </div>
            <h2 className="text-base font-bold text-slate-800">
              {lang === 'ar' ? 'سجل الطلبات يتطلب تسجيل الدخول' : 'Connexion requise pour voir les commandes'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'يرجى تسجيل الدخول أو إنشاء حساب لعرض ومتابعة طلباتك السابقة' : 'Veuillez vous connecter pour consulter et suivre vos commandes.'}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onOpenAuth?.('login')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {t('login')}
              </button>
              <button
                onClick={() => onOpenAuth?.('register', 'CUSTOMER')}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
              >
                {t('register')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <span>📦</span>
          <span>{t('nav_orders')}</span>
        </h1>

        {myOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 p-8 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 text-2xl">
              🛒
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">{lang === 'ar' ? 'لا توجد طلبات سابقة' : 'Aucune commande passée'}</h3>
            <p className="text-xs text-slate-500 mb-6">{lang === 'ar' ? 'اكتشف أفضل المطاعم الجزائرية وابدأ طلبك الأول الآن!' : 'Découvrez nos restaurants partenaires et passez votre première commande.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <img src={ord.restaurant_logo} alt={ord.restaurant_name} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{ord.restaurant_name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>#{ord.order_number}</span>
                        <span>•</span>
                        <span>{ord.created_at?.slice(0, 16)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-end rtl:text-start">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                      ord.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                      ord.status === 'CANCELLED' || ord.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800 animate-pulse'
                    }`}>
                      {t(`status_${ord.status.toLowerCase()}`)}
                    </span>
                    <p className="text-xs font-black text-slate-900 mt-1">{ord.total_amount} {t('dzd')}</p>
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">{t('cash_on_delivery')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTrackOrder(ord.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {t('track_order')}
                    </button>
                    {ord.status === 'DELIVERED' && !ord.user_rating && (
                      <button
                        onClick={() => setReviewModal({ show: true, orderId: ord.id, rating: 5, comment: '' })}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{t('rate_experience')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      {/* Hero Algerian Delivery Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 text-white p-6 sm:p-10">
        <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80')` }} />
        
        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-bold border border-white/10">
            <span>🇩🇿</span>
            <span>{lang === 'ar' ? 'أفضل وألذ المطاعم في الجزائر' : 'Plateforme de Livraison N°1 en Algérie'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
            {t('welcome_msg')}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 font-medium">
            {t('app_tagline')} — {t('cash_on_delivery')}
          </p>

          {/* Search bar inside Hero */}
          <div className="pt-2">
            <div className="relative flex items-center bg-white rounded-2xl shadow-lg p-1.5 text-slate-800">
              <Search className="w-5 h-5 text-slate-400 ms-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search')}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-transparent border-0 focus:outline-hidden placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Restaurant Advertisements Showcase (إعلانات المطاعم المستهدفة جغرافياً) */}
      {publicAds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
                <Megaphone className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {lang === 'ar' ? 'عروض وإعلانات المطاعم الحصرية' : 'Offres & Campagnes des Restaurants'}
              </h2>
            </div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              {selectedCity ? (lang === 'ar' ? `📍 عروض في ${selectedCity}` : `📍 Offres à ${selectedCity}`) : (lang === 'ar' ? '🇩🇿 عروض مميزة' : '🇩🇿 En vedette')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicAds.map((ad) => (
              <div
                key={ad.id}
                onClick={async () => {
                  api.trackAdClick(ad.id).catch(() => {});
                  try {
                    const res = await api.getRestaurantDetails(ad.restaurant_id);
                    if (res.success) {
                      openRestaurantDetails(res.restaurant);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="group relative rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-slate-900 h-52 flex flex-col justify-end p-5"
              >
                {/* Ad Image */}
                <img
                  src={ad.image_url}
                  alt={ad.title_ar}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-3 start-3 end-3 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2">
                    {ad.badge_text && (
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-md flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{ad.badge_text}</span>
                      </span>
                    )}
                    {ad.discount_percentage ? (
                      <span className="px-2.5 py-1 rounded-full bg-red-600 text-white font-black text-xs shadow-md">
                        -{ad.discount_percentage}%
                      </span>
                    ) : null}
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                    📍 {ad.target_location === 'ALL' ? (lang === 'ar' ? 'كامل الجزائر' : 'National') : ad.target_location}
                  </span>
                </div>

                {/* Bottom Restaurant & Content */}
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2.5">
                    {ad.restaurant_logo && (
                      <img src={ad.restaurant_logo} alt="" className="w-9 h-9 rounded-xl object-cover border-2 border-white/80 shadow-md shrink-0" />
                    )}
                    <div>
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                        {ad.restaurant_name}
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-white leading-tight drop-shadow-sm">
                        {lang === 'ar' ? ad.title_ar : ad.title_fr}
                      </h3>
                    </div>
                  </div>

                  {ad.description_ar && (
                    <p className="text-xs text-slate-200 line-clamp-1 drop-shadow-sm">
                      {lang === 'ar' ? ad.description_ar : ad.description_fr}
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-amber-400 font-bold group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      <span>{lang === 'ar' ? 'عرض قائمة المطعم والطلب الآن' : 'Voir le menu et commander'}</span>
                      <span>{lang === 'ar' ? '←' : '→'}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Filter Pills */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900">{t('popular_categories')}</h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory('')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء التصفية' : 'Effacer filtre'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition cursor-pointer ${
              selectedCategory === '' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>🍽️</span>
            <span>{lang === 'ar' ? 'الكل' : 'Tous'}</span>
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(selectedCategory === c.slug ? '' : c.slug)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition cursor-pointer ${
                selectedCategory === c.slug ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">{c.icon}</span>
              <span>{lang === 'ar' ? c.name_ar : c.name_fr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Restaurants Section (Grid / Map Toggle) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">{t('featured_restaurants')}</h2>
            <p className="text-xs text-slate-500">{restaurants.length} {lang === 'ar' ? 'مطاعم معتمدة ومفتوحة' : 'restaurants partenaires disponibles'}</p>
          </div>

          {/* Toggle between Grid View & Map Discovery View */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setRestaurantViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                restaurantViewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'قائمة المطاعم' : 'Grille'}</span>
            </button>
            <button
              onClick={() => setRestaurantViewMode('map')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                restaurantViewMode === 'map'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'خريطة المطاعم 🗺️' : 'Carte 🗺️'}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl h-64 animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-100 shadow-sm space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 flex items-center justify-center text-4xl shadow-inner">
              🏪
            </div>
            
            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {lang === 'ar' ? 'لا توجد مطاعم مسجلة بعد في المنصة' : 'Aucun restaurant encore enregistré'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {lang === 'ar'
                  ? 'يمكنك الآن إنشاء حسابك مباشرة، تسجيل مطعمك في الجزائر، أو الانضمام كعامل توصيل!'
                  : 'Vous pouvez maintenant créer votre compte, inscrire votre restaurant ou devenir coursier !'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => onOpenAuth?.('register', 'RESTAURANT_OWNER')}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center gap-2"
              >
                <span>👨‍🍳</span>
                <span>{lang === 'ar' ? 'سجل مطعمك الآن' : 'Inscrire mon restaurant'}</span>
              </button>

              <button
                onClick={() => onOpenAuth?.('register', 'COURIER')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2"
              >
                <span>🛵</span>
                <span>{lang === 'ar' ? 'انضم كعامل توصيل (Coursier)' : 'Devenir coursier'}</span>
              </button>

              <button
                onClick={() => onOpenAuth?.('register', 'CUSTOMER')}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-2"
              >
                <span>👤</span>
                <span>{lang === 'ar' ? 'إنشاء حساب زبون' : 'Créer un compte client'}</span>
              </button>
            </div>
          </div>
        ) : restaurantViewMode === 'map' ? (
          /* Interactive Map View for Restaurants in Algeria */
          <div className="space-y-4">
            <RestaurantMap
              restaurants={restaurants}
              selectedCity={selectedCity}
              onSelectRestaurant={openRestaurantDetails}
              className="h-[480px] sm:h-[540px]"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((rest) => (
              <div
                key={rest.id}
                onClick={() => openRestaurantDetails(rest)}
                className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xs hover:shadow-xl transition-all duration-300 group cursor-pointer tap-bounce flex flex-col justify-between"
              >
                {/* Cover & Badges */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={rest.cover_url}
                    alt={rest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 start-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 text-[11px] font-bold shadow-xs">
                    {lang === 'ar' ? rest.category_name_ar : rest.category_name_fr}
                  </div>

                  {/* Delivery Info */}
                  <div className="absolute bottom-3 start-3 flex items-center gap-2 text-white text-xs font-semibold">
                    <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>25-35 min</span>
                    </span>
                    <span className="flex items-center gap-1 bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 rounded-full font-bold text-[11px]">
                      <Bike className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'التوصيل بالاتفاق' : 'Livraison négociable'}</span>
                    </span>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-3 end-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{rest.rating}</span>
                    <span className="text-[10px] font-normal text-slate-800">({rest.review_count})</span>
                  </div>
                </div>

                {/* Restaurant Content */}
                <div className="p-4 flex items-start gap-3">
                  <img
                    src={rest.logo_url}
                    alt={rest.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md shrink-0 -mt-8 relative z-10 bg-white"
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                      {rest.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {lang === 'ar' ? rest.description_ar : rest.description_fr}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      <span className="line-clamp-1">{rest.address} • {rest.city}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popular Algerian Dishes */}
      {popularProducts.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900">{t('popular_dishes')}</h2>
            <p className="text-xs text-slate-500">{lang === 'ar' ? 'أطباق طازجة ومحضرة بأيدي أمهر الطهاة' : 'Les incontournables de la cuisine algérienne'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularProducts.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs hover:shadow-md transition flex flex-col justify-between">
                <div className="relative h-32 w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                  <img src={p.image_url} alt={p.name_fr} className="w-full h-full object-cover" />
                  <div className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-bold">
                    {p.restaurant_name}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {lang === 'ar' ? p.name_ar : p.name_fr}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {lang === 'ar' ? p.description_ar : p.description_fr}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-50">
                  <span className="text-xs font-black text-blue-600">{p.price} {t('dzd')}</span>
                  <button
                    onClick={() => handleAddToCart(p)}
                    className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition cursor-pointer tap-bounce"
                    title={t('add_to_cart')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESTAURANT DETAILS MODAL */}
      {activeRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col border border-slate-100 overflow-hidden my-auto">
            {/* Header / Cover */}
            <div className="relative h-52 w-full bg-slate-200 shrink-0">
              <img src={activeRestaurant.cover_url} alt={activeRestaurant.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              <button
                onClick={() => setActiveRestaurant(null)}
                className="absolute top-4 end-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 start-4 end-4 flex items-end gap-3 text-white">
                <img src={activeRestaurant.logo_url} alt={activeRestaurant.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg bg-white shrink-0" />
                <div className="flex-1">
                  <h2 className="text-lg font-black leading-tight">{activeRestaurant.name}</h2>
                  <p className="text-xs text-slate-200 line-clamp-1 mt-0.5">
                    {lang === 'ar' ? activeRestaurant.description_ar : activeRestaurant.description_fr}
                  </p>
                  <div className="flex items-center gap-3 text-xs mt-1 text-slate-300">
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {activeRestaurant.rating} ({activeRestaurant.review_count} {t('reviews_count')})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {activeRestaurant.opening_hours}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {activeRestaurant.phone}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab navigation inside Restaurant Modal: Menu vs Map Location */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 gap-2">
              <button
                onClick={() => setRestaurantModalTab('menu')}
                className={`pb-2.5 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  restaurantModalTab === 'menu'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>🍽️</span>
                <span>{t('menu')}</span>
              </button>
              <button
                onClick={() => setRestaurantModalTab('location')}
                className={`pb-2.5 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  restaurantModalTab === 'location'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'ar' ? 'موقع المطعم على الخريطة' : 'Localisation sur la carte'}</span>
              </button>
            </div>

            {/* Modal Body: Location Map or Menu List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {restaurantModalTab === 'location' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {lang === 'ar'
                        ? 'يمكنك التعرف على موقع المطعم بدقة والمسافة التقريبية لطلبك أو الذهاب إليه مباشرة.'
                        : 'Visualisez l\'emplacement exact du restaurant et son itinéraire.'}
                    </span>
                  </div>
                  <RestaurantLocationMap
                    restaurant={activeRestaurant}
                    className="h-80 sm:h-96"
                  />
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span>🍽️</span>
                    <span>{t('menu')}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeRestaurantMenu.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition flex gap-3 ${item.is_available ? 'bg-white border-slate-100 hover:border-blue-200 shadow-xs' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                  >
                    <img src={item.image_url} alt={item.name_fr} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{lang === 'ar' ? item.name_ar : item.name_fr}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{lang === 'ar' ? item.description_ar : item.description_fr}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-xs font-black text-blue-600">{item.price} {t('dzd')}</span>
                        {item.is_available ? (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer tap-bounce"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t('add_to_cart')}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                            {t('unavailable')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reviews section */}
              {activeRestaurantReviews.length > 0 && (
                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-900 mb-3 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <span>{lang === 'ar' ? 'آراء وتقييمات الزبائن' : 'Avis des clients vérifiés'}</span>
                  </h4>
                  <div className="space-y-2">
                    {activeRestaurantReviews.map((rev) => (
                      <div key={rev.id} className="p-3 bg-slate-50 rounded-xl text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">{rev.customer_name}</span>
                          <span className="text-amber-500 font-black">{'★'.repeat(rev.rating)}</span>
                        </div>
                        <p className="text-slate-600 italic">"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SINGLE-RESTAURANT CART CONFLICT MODAL */}
      {cartConflictModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-amber-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center mb-2">
              {t('cart_conflict_title')}
            </h3>
            <p className="text-xs text-slate-600 text-center leading-relaxed mb-6">
              {t('cart_conflict_desc')} ({cartConflictModal.existingRestaurantName})
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (cartConflictModal.pendingProduct) {
                    handleAddToCart(cartConflictModal.pendingProduct, true);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {t('clear_and_add')}
              </button>
              <button
                onClick={() => setCartConflictModal({ show: false, pendingProduct: null, existingRestaurantName: '' })}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOPPING CART & CHECKOUT DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-s border-slate-100 animate-in slide-in-from-end duration-200">
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-900">{t('cart_title')}</h3>
                {cart?.restaurant && (
                  <p className="text-xs text-blue-600 font-bold">{cart.restaurant.name}</p>
                )}
              </div>
              <button onClick={onCloseCart} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!cart || cart.items.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <span className="text-4xl block mb-2">🛒</span>
                  <p className="text-xs font-semibold">{t('cart_empty')}</p>
                </div>
              ) : isCheckingOut ? (
                // Checkout Form
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                    <span className="font-bold block mb-1">🇩🇿 {t('cash_on_delivery')}</span>
                    {lang === 'ar' ? 'سيتسلم مندوب التوصيل المبلغ نقداً بالدينار الجزائري عند باب منزلك.' : 'Réglez directement en espèces au coursier à la réception.'}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">{t('delivery_address')}</label>
                    <textarea
                      rows={3}
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Wilaya, Commune, Rue, N° Appartement..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">{lang === 'ar' ? 'تعليمات إضافية للمندوب' : 'Instructions de livraison'}</label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder={t('delivery_notes_placeholder')}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Proposed Delivery Fee Input (Customer can propose) */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-emerald-950">
                      {lang === 'ar' ? 'سعر التوصيل المقترح (اختياري - بالدينار الجزائري)' : 'Tarif de livraison proposé (DZD - optionnel)'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={proposedDeliveryFee}
                        onChange={(e) => setProposedDeliveryFee(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: 200 أو 300 دج (أو اتركه فارغاً للاتفاق)' : 'Ex: 250 DZD (ou à convenir)'}
                        className="flex-1 p-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <span className="px-3 py-2.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-black flex items-center">
                        {t('dzd')}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      {lang === 'ar'
                        ? '🤝 سعر التوصيل يتم بالتراضي والاتفاق المباشر بينك وبين المندوب حتى يقبل الطرفان السعر.'
                        : '🤝 Le prix de la livraison est convenu d\'un commun accord entre vous et le coursier.'}
                    </p>
                  </div>

                  <button
                    onClick={() => setIsCheckingOut(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    ← {lang === 'ar' ? 'الرجوع لمحتويات السلة' : 'Retour aux articles'}
                  </button>
                </div>
              ) : (
                // Cart Items List
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                      <img src={item.image_url} alt={item.name_fr} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{lang === 'ar' ? item.name_ar : item.name_fr}</h4>
                        <span className="text-xs font-black text-blue-600 block mt-0.5">{item.price * item.quantity} {t('dzd')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer / Totals */}
            {cart && cart.items.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-white space-y-3">
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>{t('subtotal')}</span>
                    <span className="font-bold text-slate-900">{cart.subtotal} {t('dzd')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('delivery_fee')}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                      {lang === 'ar' ? 'بالاتفاق المباشر مع المندوب' : 'Accord direct avec coursier'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                    <span>{t('total')}</span>
                    <div className="text-end rtl:text-start">
                      <span className="text-blue-600">{cart.subtotal} {t('dzd')}</span>
                      <span className="text-[10px] text-slate-400 font-normal block">
                        {lang === 'ar' ? '(+ سعر التوصيل المتفق عليه)' : '(+ livraison à convenir)'}
                      </span>
                    </div>
                  </div>
                </div>

                {isCheckingOut ? (
                  <button
                    onClick={handleCheckout}
                    disabled={orderSubmitting}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer disabled:opacity-50"
                  >
                    {orderSubmitting ? t('loading') : t('place_order_btn')}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer tap-bounce"
                  >
                    {t('checkout')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIVE ORDER TRACKER MODAL */}
      {trackedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 p-6 space-y-6 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase">
                  DZ Order Live Tracking
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {lang === 'ar' ? 'طلب رقم' : 'Commande'} #{trackedOrder.order.order_number}
                </h3>
                <p className="text-xs text-slate-500">{trackedOrder.order.restaurant_name}</p>
              </div>
              <button onClick={onCloseTracking} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Status Line */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>{t('status')}:</span>
                <span className={`px-2 py-0.5 rounded-full ${
                  trackedOrder.order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 font-black' :
                  trackedOrder.order.status === 'CANCELLED' || trackedOrder.order.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  'bg-blue-600 text-white animate-pulse'
                }`}>
                  {t(`status_${trackedOrder.order.status.toLowerCase()}`)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{
                    width:
                      trackedOrder.order.status === 'PENDING' ? '15%' :
                      trackedOrder.order.status === 'ACCEPTED' ? '30%' :
                      trackedOrder.order.status === 'PREPARING' ? '45%' :
                      trackedOrder.order.status === 'READY' ? '60%' :
                      trackedOrder.order.status === 'COURIER_ASSIGNED' ? '70%' :
                      trackedOrder.order.status === 'PICKED_UP' ? '80%' :
                      trackedOrder.order.status === 'ON_THE_WAY' ? '90%' :
                      trackedOrder.order.status === 'DELIVERED' ? '100%' : '10%'
                  }}
                />
              </div>

              {trackedOrder.order.rejection_reason && (
                <p className="text-xs text-red-600 font-semibold">
                  {lang === 'ar' ? 'سبب الرفض:' : 'Motif :'} {trackedOrder.order.rejection_reason}
                </p>
              )}
            </div>

            {/* Live Interactive Delivery Tracking Map */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === 'ar' ? 'تتبع مسار التوصيل المباشر' : 'Suivi GPS de la livraison en direct'}</span>
                </span>
                {trackedOrder.order.courier_name && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {lang === 'ar' ? 'المندوب متصل بالـ GPS' : 'GPS Coursier Actif'}
                  </span>
                )}
              </div>
              <DeliveryTrackingMap
                restaurant={{
                  name: trackedOrder.order.restaurant_name,
                  phone: trackedOrder.order.restaurant_phone,
                  address: trackedOrder.order.restaurant_address,
                  city: trackedOrder.order.restaurant_city,
                  latitude: trackedOrder.order.restaurant_lat,
                  longitude: trackedOrder.order.restaurant_lng
                }}
                customer={{
                  name: trackedOrder.order.customer_name,
                  phone: trackedOrder.order.customer_phone,
                  address: trackedOrder.order.delivery_address
                }}
                courier={
                  trackedOrder.order.courier_name
                    ? {
                        name: trackedOrder.order.courier_name,
                        phone: trackedOrder.order.courier_phone,
                        vehicle_type: trackedOrder.order.vehicle_type,
                        latitude: trackedOrder.order.courier_lat,
                        longitude: trackedOrder.order.courier_lng
                      }
                    : null
                }
                orderStatus={trackedOrder.order.status}
                className="h-56 sm:h-64"
              />
            </div>

            {/* Courier Card (When Assigned) */}
            {trackedOrder.order.courier_name && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">{trackedOrder.order.courier_name}</h4>
                    <p className="text-[11px] text-emerald-700">
                      {trackedOrder.order.vehicle_plate || 'Moto DZ'} • {trackedOrder.order.courier_phone}
                    </p>
                  </div>
                </div>
                <a
                  href={`tel:${trackedOrder.order.courier_phone}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{t('call_courier')}</span>
                </a>
              </div>
            )}

            {/* Delivery Fee Agreement Card (Customer & Courier Negotiation) */}
            <div className="p-4 rounded-2xl border transition-all space-y-3 bg-slate-50/80 border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span>🤝</span>
                  <span>{lang === 'ar' ? 'الاتفاق على سعر التوصيل' : 'Accord tarif livraison'}</span>
                </span>

                {trackedOrder.order.delivery_fee_status === 'AGREED' ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{lang === 'ar' ? 'تم الاتفاق بنجاح' : 'Tarif convenu'}</span>
                  </span>
                ) : trackedOrder.order.delivery_fee_status === 'PROPOSED_BY_COURIER' ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black animate-pulse">
                    {lang === 'ar' ? 'اقتراح جديد من المندوب' : 'Offre du coursier'}
                  </span>
                ) : trackedOrder.order.delivery_fee_status === 'PROPOSED_BY_CUSTOMER' ? (
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold">
                    {lang === 'ar' ? 'في انتظار موافقة المندوب' : 'En attente du coursier'}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                    {lang === 'ar' ? 'قيد التحديد' : 'À convenir'}
                  </span>
                )}
              </div>

              {/* Status details & actions */}
              {trackedOrder.order.delivery_fee_status === 'AGREED' ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                  <div>
                    <span className="block font-bold">
                      {lang === 'ar' ? 'تم اعتماد سعر التوصيل النهائي بالتراضي:' : 'Frais de livraison convenus :'}
                    </span>
                    <span className="text-xs text-emerald-700">
                      {lang === 'ar' ? 'يدفع نقداً مع قيمة الوجبات للمندوب' : 'Payable en espèces avec la commande'}
                    </span>
                  </div>
                  <span className="text-base font-black text-emerald-700">{trackedOrder.order.delivery_fee} {t('dzd')}</span>
                </div>
              ) : trackedOrder.order.delivery_fee_status === 'PROPOSED_BY_COURIER' ? (
                <div className="space-y-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                  <div className="flex justify-between items-center text-amber-950 font-bold">
                    <span>{lang === 'ar' ? 'اقترح المندوب سعر توصيل:' : 'Le coursier propose :'}</span>
                    <span className="text-sm font-black text-amber-700">{trackedOrder.order.delivery_fee} {t('dzd')}</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleAcceptDeliveryFee(trackedOrder.order.id)}
                      disabled={feeActionLoading}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? `قبول عرض المندوب (${trackedOrder.order.delivery_fee} دج)` : 'Accepter l\'offre'}</span>
                    </button>
                  </div>

                  {/* Counter proposal */}
                  <div className="pt-2 border-t border-amber-200/60">
                    <span className="text-[11px] font-bold text-amber-900 block mb-1">
                      {lang === 'ar' ? 'أو قدّم اقتراحاً بديلاً للمندوب:' : 'Ou proposer un autre montant :'}
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={counterFeeInput}
                        onChange={(e) => setCounterFeeInput(e.target.value)}
                        placeholder={lang === 'ar' ? 'مبلغك (دج)...' : 'Montant (DZD)...'}
                        className="flex-1 p-2 rounded-lg bg-white border border-amber-300 text-xs font-bold"
                      />
                      <button
                        onClick={() => handleProposeDeliveryFee(trackedOrder.order.id, Number(counterFeeInput))}
                        disabled={feeActionLoading || !counterFeeInput}
                        className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                      >
                        {lang === 'ar' ? 'إرسال عرضي' : 'Envoyer'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : trackedOrder.order.delivery_fee_status === 'PROPOSED_BY_CUSTOMER' ? (
                <div className="space-y-2 p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs">
                  <div className="flex justify-between items-center text-blue-950">
                    <span className="font-bold">{lang === 'ar' ? 'عرضك المقترح للتوصيل:' : 'Votre proposition :'}</span>
                    <span className="text-sm font-black text-blue-700">{trackedOrder.order.delivery_fee} {t('dzd')}</span>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    {lang === 'ar'
                      ? 'تم إرسال هذا السعر للمندوب، وفي حال قبوله أو اقتراح سعر آخر سيتم إشعارك هنا فوراً.'
                      : 'En attente de confirmation ou contre-proposition du coursier.'}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={counterFeeInput}
                      onChange={(e) => setCounterFeeInput(e.target.value)}
                      placeholder={lang === 'ar' ? 'تعديل السعر المقترح...' : 'Modifier le montant...'}
                      className="flex-1 p-2 rounded-lg bg-white border border-blue-300 text-xs font-bold"
                    />
                    <button
                      onClick={() => handleProposeDeliveryFee(trackedOrder.order.id, Number(counterFeeInput))}
                      disabled={feeActionLoading || !counterFeeInput}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {lang === 'ar' ? 'تحديث السعر' : 'Modifier'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <p className="text-[11px] text-slate-600">
                    {lang === 'ar'
                      ? 'لم يتم تحديد سعر التوصيل بعد. يمكنك اقتراح سعر مناسب وسيقوم المندوب بتأكيده.'
                      : 'Aucun montant fixé. Proposez un tarif pour la livraison :'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={counterFeeInput}
                      onChange={(e) => setCounterFeeInput(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: 250 دج...' : 'Ex: 250 DZD...'}
                      className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold"
                    />
                    <button
                      onClick={() => handleProposeDeliveryFee(trackedOrder.order.id, Number(counterFeeInput))}
                      disabled={feeActionLoading || !counterFeeInput}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {lang === 'ar' ? 'اقتراح السعر' : 'Proposer'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items Snapshot */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-800">{lang === 'ar' ? 'تفاصيل الوجبات' : 'Articles commandés'}</h4>
              {trackedOrder.items?.map((it: any) => (
                <div key={it.id} className="flex justify-between text-xs text-slate-600">
                  <span>{it.quantity}x {lang === 'ar' ? it.product_name_ar : it.product_name_fr}</span>
                  <span className="font-bold">{it.total_price} {t('dzd')}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-slate-600 pt-1">
                <span>{t('delivery_fee')}</span>
                <span className="font-bold text-emerald-700">
                  {trackedOrder.order.delivery_fee_status === 'AGREED'
                    ? `${trackedOrder.order.delivery_fee} ${t('dzd')} (${lang === 'ar' ? 'متفق عليه' : 'convenu'})`
                    : trackedOrder.order.delivery_fee > 0
                    ? `${trackedOrder.order.delivery_fee} ${t('dzd')} (${lang === 'ar' ? 'قيد الاتفاق' : 'en négociation'})`
                    : (lang === 'ar' ? 'بالاتفاق المباشر' : 'À convenir')}
                </span>
              </div>
              <div className="flex justify-between text-xs font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>{t('total')} ({t('cash_on_delivery')})</span>
                <span className="text-blue-600">{trackedOrder.order.total_amount} {t('dzd')}</span>
              </div>
            </div>

            {/* Actions: Cancel if PENDING, Review/Complaint if DELIVERED */}
            <div className="pt-2 flex flex-wrap gap-2 justify-end">
              {trackedOrder.order.status === 'PENDING' && (
                <button
                  onClick={() => handleCancelOrder(trackedOrder.order.id)}
                  className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                >
                  {t('cancel_order')}
                </button>
              )}

              {trackedOrder.order.status === 'DELIVERED' && !trackedOrder.review && (
                <button
                  onClick={() => setReviewModal({ show: true, orderId: trackedOrder.order.id, rating: 5, comment: '' })}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{t('rate_experience')}</span>
                </button>
              )}

              <button
                onClick={() => setComplaintModal({ show: true, orderId: trackedOrder.order.id, subject: '', description: '' })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{t('submit_complaint')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RATING & REVIEW MODAL */}
      {reviewModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-900">{t('rate_experience')}</h3>
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setReviewModal({ ...reviewModal, rating: s })}
                  className="text-2xl text-amber-400 hover:scale-125 transition cursor-pointer"
                >
                  {s <= reviewModal.rating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={reviewModal.comment}
              onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
              placeholder={lang === 'ar' ? 'اكتب رأيك حول جودة الطعام وسرعة التوصيل...' : 'Partagez votre avis sur les plats et la livraison...'}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button onClick={submitReview} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md">
                {t('submit_review')}
              </button>
              <button onClick={() => setReviewModal({ show: false, orderId: null, rating: 5, comment: '' })} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT MODAL */}
      {complaintModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-900">{t('submit_complaint')}</h3>
            <input
              type="text"
              value={complaintModal.subject}
              onChange={(e) => setComplaintModal({ ...complaintModal, subject: e.target.value })}
              placeholder={lang === 'ar' ? 'موضوع الشكوى' : 'Objet de la réclamation'}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
            />
            <textarea
              rows={4}
              value={complaintModal.description}
              onChange={(e) => setComplaintModal({ ...complaintModal, description: e.target.value })}
              placeholder={lang === 'ar' ? 'يرجى وصف المشكلة بالتفصيل...' : 'Détaillez le problème rencontré...'}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs"
            />
            <div className="flex gap-2">
              <button onClick={submitComplaint} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md">
                {t('confirm')}
              </button>
              <button onClick={() => setComplaintModal({ show: false, orderId: null, subject: '', description: '' })} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
