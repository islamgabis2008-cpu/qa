import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { Delivery } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';
import { DeliveryTrackingMap } from './DeliveryTrackingMap.js';
import {
  Bike,
  Power,
  MapPin,
  Phone,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Navigation,
  Compass,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import L from 'leaflet';

export const CourierView: React.FC = () => {
  const { lang, t } = useLanguage();

  const [profile, setProfile] = useState<any>(null);
  const [activeDelivery, setActiveDelivery] = useState<any | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Delivery[]>([]);
  const [earnings, setEarnings] = useState<{ total: number; completedCount: number }>({ total: 0, completedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [inspectTask, setInspectTask] = useState<Delivery | null>(null);
  const [counterFeeInput, setCounterFeeInput] = useState<string>('');
  const [feeActionLoading, setFeeActionLoading] = useState<boolean>(false);

  // GPS Geolocation state (Mandatory to work)
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [lastLocationSync, setLastLocationSync] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const courierMapContainerRef = useRef<HTMLDivElement | null>(null);
  const courierMapInstanceRef = useRef<L.Map | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);
  const tasksLayerRef = useRef<L.LayerGroup | null>(null);

  const loadCourierData = async () => {
    try {
      setLoading(true);
      const res = await api.getCourierProfile();
      if (res.success) {
        setProfile(res.profile);
        setActiveDelivery(res.activeDelivery);
        setEarnings(res.earnings);

        if (res.profile?.current_latitude && res.profile?.current_longitude) {
          setGpsCoords({
            latitude: res.profile.current_latitude,
            longitude: res.profile.current_longitude
          });
        }

        if (res.profile?.is_approved && res.profile?.is_online) {
          const tasksRes = await api.getCourierTasks();
          if (tasksRes.success) setAvailableTasks(tasksRes.tasks);
        }
      }
    } catch (e) {
      console.error('Courier data load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourierData();
  }, []);

  // Request browser GPS position with high accuracy
  const requestCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error(lang === 'ar' ? 'المتصفح لا يدعم خدمة تحديد المواقع (GPS)' : 'La géolocalisation n\'est pas supportée'));
        return;
      }

      setGpsLoading(true);
      setGpsError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLoading(false);
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          };
          setGpsCoords(coords);
          setLastLocationSync(new Date().toLocaleTimeString());
          resolve(coords);
        },
        (err) => {
          setGpsLoading(false);
          let msg = lang === 'ar'
            ? 'يجب السماح بالوصول إلى الموقع الجغرافي (GPS) حتى تستطيع العمل واستقبال الطلبات'
            : 'L\'accès GPS est obligatoire pour travailler et recevoir les courses.';
          if (err.code === 1) {
            msg = lang === 'ar'
              ? 'تم رفض إذن تحديد الموقع (GPS). يرجى تفعيل الموقع من إعدادات المتصفح/الهاتف للبدء بالعمل'
              : 'Permission GPS refusée. Veuillez autoriser la localisation pour travailler.';
          } else if (err.code === 2) {
            msg = lang === 'ar'
              ? 'إشارة الموقع (GPS) غير متوفرة حالياً، يرجى التأكد من تشغيل الـ GPS'
              : 'Position GPS indisponible. Veuillez vérifier votre signal.';
          }
          setGpsError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  // Start continuous watchPosition when online
  const startGpsWatcher = () => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsCoords({ latitude, longitude });
        setLastLocationSync(new Date().toLocaleTimeString());

        // Update server live courier location
        try {
          await api.updateCourierLocation(latitude, longitude);
        } catch (e) {
          console.warn('Silent location sync error:', e);
        }

        // Update map marker if open
        if (courierMarkerRef.current) {
          courierMarkerRef.current.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        console.warn('GPS watcher error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  // Stop continuous watchPosition
  const stopGpsWatcher = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Start watcher if courier is already online
  useEffect(() => {
    if (profile?.is_online) {
      startGpsWatcher();
    } else {
      stopGpsWatcher();
    }
    return () => stopGpsWatcher();
  }, [profile?.is_online]);

  // Poll tasks if online
  useEffect(() => {
    if (!profile?.is_approved || !profile?.is_online) return;
    const interval = setInterval(async () => {
      try {
        const tasksRes = await api.getCourierTasks();
        if (tasksRes.success) setAvailableTasks(tasksRes.tasks);
      } catch {}
    }, 6000);
    return () => clearInterval(interval);
  }, [profile?.is_approved, profile?.is_online]);

  // TOGGLE ONLINE / OFFLINE (STRICT GPS ENFORCEMENT)
  const toggleOnline = async () => {
    if (!profile?.is_online) {
      // Must obtain GPS first to go online
      try {
        const coords = await requestCurrentLocation();
        const res = await api.toggleCourierOnline(coords);
        if (res.success) {
          setProfile((prev: any) => ({ ...prev, is_online: 1 }));
          setShowGpsModal(false);
          startGpsWatcher();
          const tasksRes = await api.getCourierTasks();
          if (tasksRes.success) setAvailableTasks(tasksRes.tasks);
        }
      } catch (err: any) {
        setShowGpsModal(true);
      }
    } else {
      // Going offline
      try {
        const res = await api.toggleCourierOnline();
        if (res.success) {
          setProfile((prev: any) => ({ ...prev, is_online: 0 }));
          stopGpsWatcher();
          setAvailableTasks([]);
        }
      } catch (err: any) {
        alert(err.message || 'Toggle offline failed');
      }
    }
  };

  const handleAcceptTask = async (deliveryId: number) => {
    // Check GPS before accepting task
    if (!gpsCoords) {
      try {
        await requestCurrentLocation();
      } catch {
        setShowGpsModal(true);
        return;
      }
    }

    try {
      const res = await api.acceptCourierTask(deliveryId);
      if (res.success) {
        alert(lang === 'ar' ? 'تم قبول المهمة بنجاح!' : 'Mission acceptée !');
        loadCourierData();
      }
    } catch (err: any) {
      alert(err.message || 'Could not accept task');
      loadCourierData();
    }
  };

  const handlePickup = async (deliveryId: number) => {
    try {
      await api.pickupCourierTask(deliveryId);
      loadCourierData();
    } catch (err: any) {
      alert(err.message || 'Pickup failed');
    }
  };

  const handleOnTheWay = async (deliveryId: number) => {
    try {
      await api.onTheWayCourierTask(deliveryId);
      loadCourierData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleCompleteDelivery = async (deliveryId: number) => {
    if (!confirm(lang === 'ar' ? 'هل قمت بتسليم الطلب للزبون واستلام المبلغ نقداً؟' : 'Confirmer la remise du colis et l\'encaissement ?')) return;
    try {
      await api.completeCourierTask(deliveryId);
      alert(lang === 'ar' ? 'أحسنت! تمت المهمة بنجاح وأضيفت عمولة التوصيل لأرباحك.' : 'Félicitations ! Course complétée avec succès.');
      loadCourierData();
    } catch (err: any) {
      alert(err.message || 'Complete delivery failed');
    }
  };

  const handleAcceptDeliveryFee = async (orderId: number) => {
    try {
      setFeeActionLoading(true);
      const res = await api.acceptDeliveryFee(orderId);
      if (res.success) {
        alert(lang === 'ar' ? 'تم تأكيد والاتفاق على سعر التوصيل مع الزبون بنجاح!' : 'Frais de livraison confirmés avec le client !');
        loadCourierData();
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
        alert(lang === 'ar' ? 'تم إرسال اقتراحك للزبون بنجاح' : 'Proposition envoyée au client');
        setCounterFeeInput('');
        loadCourierData();
      }
    } catch (err: any) {
      alert(err.message || 'Error proposing fee');
    } finally {
      setFeeActionLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.getCourierHistory();
      if (res.success) {
        setHistory(res.deliveries);
        setShowHistory(true);
      }
    } catch (e) {
      console.error('History error:', e);
    }
  };

  // Courier Idle / Tasks Map (When online and NO active mission)
  useEffect(() => {
    if (!profile?.is_online || activeDelivery || !courierMapContainerRef.current) return;

    const lat = gpsCoords?.latitude || profile.current_latitude || 36.7538;
    const lng = gpsCoords?.longitude || profile.current_longitude || 3.0588;

    if (!courierMapInstanceRef.current) {
      const map = L.map(courierMapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const tasksLayer = L.layerGroup().addTo(map);
      tasksLayerRef.current = tasksLayer;
      courierMapInstanceRef.current = map;

      // Add courier marker
      const bikeIcon = L.divIcon({
        className: 'courier-live-pin',
        html: `
          <div style="position: relative; transform: translate(-50%, -50%);">
            <div style="position: absolute; inset: -4px; background: #059669; border-radius: 9999px; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; background: #059669; color: white; width: 44px; height: 44px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(5,150,105,0.5); border: 2.5px solid white; font-size: 22px;">
              🛵
            </div>
            <div style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #059669;"></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      courierMarkerRef.current = L.marker([lat, lng], { icon: bikeIcon }).addTo(map);
      courierMarkerRef.current.bindPopup(`
        <div style="font-size: 11px; font-weight: bold; text-align: center; padding: 4px;">
          🛵 ${lang === 'ar' ? 'موقعك الحالي في الخدمة' : 'Votre position en service'}
        </div>
      `);
    } else {
      courierMapInstanceRef.current.setView([lat, lng]);
      if (courierMarkerRef.current) {
        courierMarkerRef.current.setLatLng([lat, lng]);
      }
    }

    // Render available tasks on the map
    const tasksLayer = tasksLayerRef.current;
    if (tasksLayer) {
      tasksLayer.clearLayers();
      availableTasks.forEach((task: any) => {
        const taskLat = task.restaurant_lat || (lat + 0.008);
        const taskLng = task.restaurant_lng || (lng + 0.008);

        const taskIcon = L.divIcon({
          className: 'task-map-pin',
          html: `
            <div style="position: relative; transform: translate(-50%, -50%);">
              <div style="background: #2563EB; color: white; width: 34px; height: 34px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(37,99,235,0.4); border: 2px solid white; font-size: 16px;">
                📦
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const m = L.marker([taskLat, taskLng], { icon: taskIcon }).addTo(tasksLayer);
        m.bindPopup(`
          <div style="font-size: 11px; line-height: 1.4; padding: 4px;">
            <b>#${task.order_number} — ${task.restaurant_name}</b><br/>
            <span>📍 ${task.pickup_address}</span><br/>
            <span style="color: #059669; font-weight: bold;">+${task.delivery_fee} DZD</span>
          </div>
        `);
      });
    }

    return () => {
      if (courierMapInstanceRef.current && (!profile?.is_online || activeDelivery)) {
        courierMapInstanceRef.current.remove();
        courierMapInstanceRef.current = null;
        courierMarkerRef.current = null;
      }
    };
  }, [profile?.is_online, activeDelivery, gpsCoords, availableTasks, lang]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">
        <Bike className="w-8 h-8 mx-auto mb-2 animate-bounce text-emerald-600" />
        <p className="text-xs font-semibold">{t('loading')}</p>
      </div>
    );
  }

  // CASE 1: PENDING COURIER APPROVAL
  if (profile && !profile.is_approved) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
            🛵
          </div>
          <h2 className="text-lg font-black text-slate-900">
            {lang === 'ar' ? 'طلب التوصيل قيد المراجعة' : 'Candidature coursier en cours d\'examen'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('courier_pending_msg')}
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-start rtl:text-end space-y-1.5 border border-slate-100">
            <p><span className="font-bold text-slate-700">{t('vehicle_type')}:</span> {profile.vehicle_type}</p>
            <p><span className="font-bold text-slate-700">{t('license_plate')}:</span> {profile.vehicle_plate || 'Non spécifié'}</p>
            <p><span className="font-bold text-slate-700">{t('status')}:</span> <span className="font-bold text-amber-600">{profile.approval_status}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // CASE 2: APPROVED COURIER DASHBOARD
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* GPS Mandatory Requirement Warning if offline */}
      {!profile?.is_online && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900">
                {lang === 'ar' ? 'تشغيل نظام تحديد المواقع (GPS) إلزامي للعمل' : 'Localisation GPS obligatoire pour travailler'}
              </h3>
              <p className="text-[11px] text-slate-600">
                {lang === 'ar'
                  ? 'يتطلب العمل وتلقي مهام التوصيل تفعيل الموقع الجغرافي الحي لحساب المسافة وتوجيه الطلبات الأقرب إليك.'
                  : 'Activez votre GPS pour vous positionner sur la carte et commencer à recevoir des courses.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleOnline}
            disabled={gpsLoading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? (lang === 'ar' ? 'جاري تحديد موقعك...' : 'Localisation...') : (lang === 'ar' ? 'تفعيل الموقع وبدء العمل' : 'Activer GPS & Travailler')}</span>
          </button>
        </div>
      )}

      {/* Status & Online Toggle Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
            profile?.is_online ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' : 'bg-slate-200 text-slate-500'
          }`}>
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                {profile?.is_online ? t('courier_status_online') : t('courier_status_offline')}
              </h2>
              <span className={`w-2.5 h-2.5 rounded-full ${profile?.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            </div>
            <p className="text-xs text-slate-500">
              {profile?.vehicle_type} ({profile?.vehicle_plate || 'DZ'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile?.is_online && gpsCoords && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>GPS: {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}</span>
            </div>
          )}

          <button
            onClick={toggleOnline}
            disabled={gpsLoading}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer tap-bounce disabled:opacity-50 ${
              profile?.is_online
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{gpsLoading ? (lang === 'ar' ? 'جاري الفحص...' : 'Vérification...') : (profile?.is_online ? t('go_offline') : t('go_online'))}</span>
          </button>
        </div>
      </div>

      {/* GPS Live Telemetry Info Bar (When Online) */}
      {profile?.is_online && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
            <span className="font-black">
              {lang === 'ar' ? 'نظام تحديد المواقع (GPS) نشط ومتصل في الوقت الفعلي' : 'Suivi de géolocalisation GPS actif en temps réel'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold text-emerald-800">
            {lastLocationSync && (
              <span>
                {lang === 'ar' ? `آخر تحديث: ${lastLocationSync}` : `Dernière synchro: ${lastLocationSync}`}
              </span>
            )}
            <button
              onClick={() => requestCurrentLocation()}
              className="p-1 hover:bg-emerald-100 rounded-lg transition cursor-pointer text-emerald-700"
              title={lang === 'ar' ? 'تحديث الموقع الآن' : 'Actualiser la position'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block mb-1">{t('total_earnings')}</span>
          <span className="text-2xl font-black text-emerald-600">{earnings.total} {t('dzd')}</span>
        </div>
        <div
          onClick={loadHistory}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs hover:border-blue-200 transition cursor-pointer"
        >
          <span className="text-xs text-slate-500 font-semibold block mb-1">{t('completed_deliveries')}</span>
          <span className="text-2xl font-black text-blue-600">{earnings.completedCount}</span>
        </div>
      </div>

      {/* ACTIVE MISSION CARD WITH LIVE TRACKING MAP */}
      {activeDelivery && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase backdrop-blur-md">
              {t('active_mission')}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              activeDelivery.delivery_fee_status === 'AGREED'
                ? 'bg-emerald-400 text-slate-950 font-black'
                : 'bg-amber-400 text-slate-950 font-black'
            }`}>
              {activeDelivery.delivery_fee_status === 'AGREED'
                ? `${activeDelivery.delivery_fee} ${t('dzd')} (${lang === 'ar' ? 'متفق عليه' : 'convenu'})`
                : activeDelivery.delivery_fee > 0
                ? `${activeDelivery.delivery_fee} ${t('dzd')} (${lang === 'ar' ? 'قيد الاتفاق' : 'en négociation'})`
                : (lang === 'ar' ? 'سعر التوصيل بالاتفاق' : 'Tarif à convenir')}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-black">
              {lang === 'ar' ? 'طلب رقم' : 'Commande'} #{activeDelivery.order_number} ({activeDelivery.total_amount} {t('dzd')})
            </h3>
            <p className="text-xs text-emerald-100">{t('cash_on_delivery')}</p>
          </div>

          {/* Courier Delivery Fee Agreement Section */}
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md text-xs space-y-2 border border-white/15">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-emerald-100">
                <span>🤝</span>
                <span>{lang === 'ar' ? 'الاتفاق على سعر التوصيل مع الزبون' : 'Accord tarifaire avec le client'}</span>
              </span>
              {activeDelivery.delivery_fee_status === 'AGREED' ? (
                <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  ✓ {lang === 'ar' ? 'تم الاتفاق' : 'Convenu'}
                </span>
              ) : (
                <span className="bg-amber-400/20 text-amber-200 border border-amber-300/40 px-2 py-0.5 rounded-full text-[11px] font-bold animate-pulse">
                  {lang === 'ar' ? 'قيد التفاوض' : 'En négociation'}
                </span>
              )}
            </div>

            {activeDelivery.delivery_fee_status === 'AGREED' ? (
              <p className="text-emerald-100 text-[11px]">
                {lang === 'ar'
                  ? `تم الاتفاق على مبلغ ${activeDelivery.delivery_fee} دج للتوصيل. يتم تحصيله نقداً مع ثمن الطلب.`
                  : `Tarif de livraison validé à ${activeDelivery.delivery_fee} DZD. À encaisser auprès du client.`}
              </p>
            ) : activeDelivery.delivery_fee_status === 'PROPOSED_BY_CUSTOMER' ? (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl">
                  <span>{lang === 'ar' ? 'الزبون يقترح سعر التوصيل:' : 'Le client propose :'}</span>
                  <span className="text-sm font-black text-amber-300">{activeDelivery.delivery_fee} {t('dzd')}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptDeliveryFee(activeDelivery.order_id || activeDelivery.id)}
                    disabled={feeActionLoading}
                    className="flex-1 py-2 rounded-xl bg-white text-emerald-900 font-black text-xs hover:bg-slate-100 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{lang === 'ar' ? `قبول عرض الزبون (${activeDelivery.delivery_fee} دج)` : 'Accepter l\'offre'}</span>
                  </button>
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={counterFeeInput}
                    onChange={(e) => setCounterFeeInput(e.target.value)}
                    placeholder={lang === 'ar' ? 'اقتراح سعر بديل (دج)...' : 'Contre-proposition (DZD)...'}
                    className="flex-1 p-2 rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-white/60 text-xs font-bold"
                  />
                  <button
                    onClick={() => handleProposeDeliveryFee(activeDelivery.order_id || activeDelivery.id, Number(counterFeeInput))}
                    disabled={feeActionLoading || !counterFeeInput}
                    className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {lang === 'ar' ? 'إرسال عرضي' : 'Proposer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-emerald-100">
                  {activeDelivery.delivery_fee_status === 'PROPOSED_BY_COURIER'
                    ? (lang === 'ar' ? `أنت اقترحت ${activeDelivery.delivery_fee} دج (في انتظار قبول الزبون)` : `Vous avez proposé ${activeDelivery.delivery_fee} DZD`)
                    : (lang === 'ar' ? 'سعر التوصيل لم يحدد بعد. اقترح سعرك المناسب:' : 'Proposez vos frais de livraison :')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={counterFeeInput}
                    onChange={(e) => setCounterFeeInput(e.target.value)}
                    placeholder={lang === 'ar' ? 'المبلغ المطلوب (دج)...' : 'Tarif souhaité (DZD)...'}
                    className="flex-1 p-2 rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-white/60 text-xs font-bold"
                  />
                  <button
                    onClick={() => handleProposeDeliveryFee(activeDelivery.order_id || activeDelivery.id, Number(counterFeeInput))}
                    disabled={feeActionLoading || !counterFeeInput}
                    className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {lang === 'ar' ? 'إرسال للزبون' : 'Envoyer'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md text-xs space-y-2">
            <div>
              <span className="text-emerald-200 block text-[10px] font-bold">{t('pickup_from')}</span>
              <p className="font-bold">{activeDelivery.restaurant_name} — {activeDelivery.pickup_address}</p>
              <a href={`tel:${activeDelivery.restaurant_phone}`} className="text-amber-300 font-semibold underline text-[11px] inline-block mt-0.5">
                📞 {activeDelivery.restaurant_phone}
              </a>
            </div>
            <div className="pt-2 border-t border-white/10">
              <span className="text-emerald-200 block text-[10px] font-bold">{t('deliver_to')}</span>
              <p className="font-bold">{activeDelivery.customer_name} — {activeDelivery.delivery_address}</p>
              <a href={`tel:${activeDelivery.customer_phone}`} className="text-amber-300 font-semibold underline text-[11px] inline-block mt-0.5">
                📞 {activeDelivery.customer_phone}
              </a>
            </div>
          </div>

          {/* Embedded Interactive Live Delivery Map for the Courier */}
          <div className="pt-1">
            <h4 className="text-xs font-bold text-emerald-100 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              <span>{lang === 'ar' ? 'خريطة المسار الحي وموقع التسليم' : 'Itinéraire & Localisation de la course'}</span>
            </h4>
            <DeliveryTrackingMap
              restaurant={{
                name: activeDelivery.restaurant_name,
                phone: activeDelivery.restaurant_phone,
                address: activeDelivery.pickup_address,
                latitude: activeDelivery.restaurant_lat,
                longitude: activeDelivery.restaurant_lng
              }}
              customer={{
                name: activeDelivery.customer_name,
                phone: activeDelivery.customer_phone,
                address: activeDelivery.delivery_address
              }}
              courier={{
                name: profile?.full_name || (lang === 'ar' ? 'أنت' : 'Vous'),
                phone: profile?.phone,
                latitude: gpsCoords?.latitude || profile?.current_latitude,
                longitude: gpsCoords?.longitude || profile?.current_longitude
              }}
              orderStatus={activeDelivery.status}
              className="h-64 sm:h-80"
            />
          </div>

          {/* Stepper Buttons for Active Mission */}
          <div className="pt-2">
            {activeDelivery.status === 'ASSIGNED' && (
              <button
                onClick={() => handlePickup(activeDelivery.id)}
                className="w-full py-3.5 rounded-2xl bg-white text-emerald-800 font-black text-xs shadow-md hover:bg-slate-50 transition cursor-pointer"
              >
                {t('confirm_pickup')}
              </button>
            )}

            {activeDelivery.status === 'PICKED_UP' && (
              <button
                onClick={() => handleOnTheWay(activeDelivery.id)}
                className="w-full py-3.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs shadow-md hover:bg-amber-300 transition cursor-pointer"
              >
                {t('confirm_on_the_way')}
              </button>
            )}

            {activeDelivery.status === 'ON_THE_WAY' && (
              <button
                onClick={() => handleCompleteDelivery(activeDelivery.id)}
                className="w-full py-3.5 rounded-2xl bg-emerald-950 text-white font-black text-xs shadow-md hover:bg-black transition cursor-pointer"
              >
                {t('confirm_delivered')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* IDLE MAP & AVAILABLE DELIVERY TASKS POOL */}
      {!activeDelivery && profile?.is_online && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📍</span>
              <span>{lang === 'ar' ? 'خريطة المهام وموقعك الجغرافي' : 'Carte de vos missions & Position'}</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {availableTasks.length} {lang === 'ar' ? 'طلبات جاهزة' : 'courses prêtes'}
            </span>
          </div>

          {/* Interactive Map for Courier Location & Nearby Tasks */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs bg-white">
            <div ref={courierMapContainerRef} className="w-full h-64 sm:h-72 z-0" />
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <span>🛵</span>
                <span>{lang === 'ar' ? 'موقعك الحي يتم بثه للزبائن تلقائياً' : 'Votre position est transmise en direct'}</span>
              </span>
              <span className="text-slate-400 text-[11px]">DZ Order Courier GPS</span>
            </div>
          </div>

          {availableTasks.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 animate-spin" />
              <p>{t('no_tasks_available')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-slate-900">#{task.order_number}</span>
                      <p className="text-xs text-slate-500">{task.restaurant_name}</p>
                    </div>
                    <div className="text-end rtl:text-start">
                      <span className="text-sm font-black text-emerald-600 block">
                        {task.delivery_fee_status === 'AGREED'
                          ? `+${task.delivery_fee} ${t('dzd')}`
                          : task.delivery_fee_status === 'PROPOSED_BY_CUSTOMER'
                          ? `+${task.delivery_fee} ${t('dzd')}`
                          : (lang === 'ar' ? 'بالاتفاق المباشر' : 'À convenir')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {task.delivery_fee_status === 'AGREED'
                          ? (lang === 'ar' ? 'سعر متفق عليه' : 'Tarif convenu')
                          : task.delivery_fee_status === 'PROPOSED_BY_CUSTOMER'
                          ? (lang === 'ar' ? 'مقترح من الزبون' : 'Offre client')
                          : (lang === 'ar' ? 'تفاوض مباشر' : 'À négocier')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100 text-slate-700">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>{t('pickup_from')}:</strong> {task.pickup_address}</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>{t('deliver_to')}:</strong> {task.delivery_address}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setInspectTask(task)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lang === 'ar' ? 'معاينة المسار على الخريطة' : 'Voir le trajet'}</span>
                    </button>

                    <button
                      onClick={() => handleAcceptTask(task.id)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition cursor-pointer tap-bounce flex items-center justify-center gap-1.5"
                    >
                      <span>🛵</span>
                      <span>{t('accept_task')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INSPECT TASK ON MAP MODAL */}
      {inspectTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 p-6 space-y-4 my-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {lang === 'ar' ? 'معاينة مسار الطلب' : 'Aperçu du trajet'}
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1">
                  #{inspectTask.order_number} — {inspectTask.restaurant_name}
                </h3>
              </div>
              <button
                onClick={() => setInspectTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Addresses */}
            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100 text-slate-700">
              <p className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>{t('pickup_from')}:</strong> {inspectTask.restaurant_name} — {inspectTask.pickup_address}</span>
              </p>
              <p className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>{t('deliver_to')}:</strong> {inspectTask.customer_name} — {inspectTask.delivery_address}</span>
              </p>
            </div>

            {/* Interactive Route Map */}
            <DeliveryTrackingMap
              restaurant={{
                name: inspectTask.restaurant_name || (lang === 'ar' ? 'مطعم' : 'Restaurant'),
                phone: inspectTask.restaurant_phone,
                address: inspectTask.pickup_address,
                latitude: inspectTask.restaurant_lat,
                longitude: inspectTask.restaurant_lng
              }}
              customer={{
                name: inspectTask.customer_name,
                phone: inspectTask.customer_phone,
                address: inspectTask.delivery_address
              }}
              courier={
                gpsCoords
                  ? {
                      name: profile?.full_name || (lang === 'ar' ? 'موقعك' : 'Vous'),
                      phone: profile?.phone,
                      latitude: gpsCoords.latitude,
                      longitude: gpsCoords.longitude
                    }
                  : null
              }
              orderStatus="READY"
              className="h-64 sm:h-72"
            />

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold">
              <span>{lang === 'ar' ? 'سعر التوصيل المقترح:' : 'Frais proposés :'}</span>
              <span className="text-base font-black text-emerald-700">
                {inspectTask.delivery_fee_status === 'AGREED'
                  ? `${inspectTask.delivery_fee} ${t('dzd')}`
                  : inspectTask.delivery_fee > 0
                  ? `${inspectTask.delivery_fee} ${t('dzd')} (${lang === 'ar' ? 'مقترح زبون' : 'proposé'})`
                  : (lang === 'ar' ? 'بالاتفاق المباشر' : 'À convenir')}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const id = inspectTask.id;
                  setInspectTask(null);
                  handleAcceptTask(id);
                }}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🛵</span>
                <span>{lang === 'ar' ? 'تأكيد قبول المهمة وبدء التوصيل' : 'Accepter cette course'}</span>
              </button>
              <button
                onClick={() => setInspectTask(null)}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg max-h-[80vh] rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-900">{t('completed_deliveries')}</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5">
              {history.map((h) => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">#{h.order_number}</span>
                    <p className="text-[11px] text-slate-500">{h.restaurant_name} → {h.customer_name}</p>
                  </div>
                  <span className="font-black text-emerald-600">+{h.delivery_fee} {t('dzd')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GPS MANDATORY MODAL / PERMISSION PROMPT */}
      {showGpsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
              📍
            </div>
            <h3 className="text-base font-black text-slate-900">
              {lang === 'ar' ? 'تفعيل الموقع الجغرافي (GPS) إلزامي' : 'Activation du GPS obligatoire'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {gpsError || (lang === 'ar'
                ? 'وفقاً لسياسة عمل منصة DZ Order، يجب تفعيل خدمة تحديد الموقع الجغرافي (GPS) ومنح الإذن للمتصفح حتى تستطيع العمل واستلام مهام التوصيل في منطقتك.'
                : 'Pour des raisons de logistique et de sécurité, vous devez activer votre géolocalisation pour passer en ligne.')}
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={toggleOnline}
                disabled={gpsLoading}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? (lang === 'ar' ? 'جاري التحقق...' : 'Vérification...') : (lang === 'ar' ? 'منح الإذن وتفعيل الموقع الآن' : 'Autoriser et activer')}</span>
              </button>
              <button
                onClick={() => setShowGpsModal(false)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
