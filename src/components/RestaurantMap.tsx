import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Restaurant } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';
import { MapPin, Navigation, Star, Clock, Bike, Store, Maximize2 } from 'lucide-react';

interface RestaurantMapProps {
  restaurants: Restaurant[];
  selectedCity?: string;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  className?: string;
}

// Algerian Wilayas coordinates lookup
const CITY_COORDINATES: Record<string, [number, number]> = {
  'Alger': [36.7538, 3.0588],
  'الجزائر العاصمة': [36.7538, 3.0588],
  'Oran': [35.6987, -0.6349],
  'وهران': [35.6987, -0.6349],
  'Constantine': [36.3650, 6.6147],
  'قسنطينة': [36.3650, 6.6147],
  'Annaba': [36.9000, 7.7667],
  'عنابة': [36.9000, 7.7667],
  'Blida': [36.4700, 2.8300],
  'البليدة': [36.4700, 2.8300],
  'Sétif': [36.1900, 5.4100],
  'سطيف': [36.1900, 5.4100],
  'Batna': [35.5560, 6.1741],
  'باتنة': [35.5560, 6.1741],
  'Béjaïa': [36.7511, 5.0567],
  'بجاية': [36.7511, 5.0567],
  'Tlemcen': [34.8828, -1.3167],
  'تلمسان': [34.8828, -1.3167],
  'Tizi Ouzou': [36.7118, 4.0459],
  'تيزي وزو': [36.7118, 4.0459],
  'Biskra': [34.8500, 5.7333],
  'بسكرة': [34.8500, 5.7333],
  'Mostaganem': [35.9333, 0.0903],
  'مستغانم': [35.9333, 0.0903],
  'Chlef': [36.1667, 1.3333],
  'الشلف': [36.1667, 1.3333],
  'Ouargla': [31.9500, 5.3167],
  'ورقلة': [31.9500, 5.3167],
  'Sidi Bel Abbès': [35.1899, -0.6308],
  'سيدي بلعباس': [35.1899, -0.6308],
  'Boumerdès': [36.7667, 3.4772],
  'بومرداس': [36.7667, 3.4772],
  'Tipaza': [36.5897, 2.4475],
  'تيبازة': [36.5897, 2.4475]
};

// Deterministic jitter helper for restaurants in the same city without exact lat/lng
export function getRestaurantCoords(r: Restaurant): [number, number] {
  if (r.latitude && r.longitude && !isNaN(r.latitude) && !isNaN(r.longitude)) {
    return [r.latitude, r.longitude];
  }
  const base = CITY_COORDINATES[r.city] || [36.7538, 3.0588];
  // Deterministic scatter around city center (~500m to 2km)
  const offsetLat = (((r.id * 17) % 23) - 11) * 0.0028;
  const offsetLng = (((r.id * 31) % 23) - 11) * 0.0035;
  return [base[0] + offsetLat, base[1] + offsetLng];
}

export const RestaurantMap: React.FC<RestaurantMapProps> = ({
  restaurants,
  selectedCity = '',
  onSelectRestaurant,
  className = 'h-[500px]'
}) => {
  const { lang, t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hoveredRestaurant, setHoveredRestaurant] = useState<Restaurant | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = selectedCity && CITY_COORDINATES[selectedCity]
      ? CITY_COORDINATES[selectedCity]
      : [36.7538, 3.0588]; // Alger center default

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: selectedCity ? 13 : 11,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Force map to adapt to container size
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update map center when selectedCity changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (selectedCity && CITY_COORDINATES[selectedCity]) {
      mapInstanceRef.current.setView(CITY_COORDINATES[selectedCity], 13, { animate: true });
    }
  }, [selectedCity]);

  // Render restaurant markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (restaurants.length === 0) return;

    const bounds = L.latLngBounds([]);

    restaurants.forEach((restaurant) => {
      const coords = getRestaurantCoords(restaurant);
      bounds.extend(coords);

      const categoryIcon = restaurant.category_icon || '🍲';
      const markerHtml = `
        <div class="group cursor-pointer relative" style="transform: translate(-50%, -50%);">
          <div style="background-color: #2563EB; color: white; width: 40px; height: 40px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px -5px rgba(37,99,235,0.5); border: 2.5px solid white; font-size: 19px; transition: transform 0.2s;" class="hover:scale-110">
            <span>${categoryIcon}</span>
          </div>
          <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #2563EB;"></div>
          <div style="position: absolute; top: -10px; right: -8px; background: #F59E0B; color: #020617; font-weight: 900; font-size: 10px; padding: 1px 5px; border-radius: 9999px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 1.5px solid white; display: flex; align-items: center; gap: 2px;">
            <span>★</span><span>${restaurant.rating}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'restaurant-map-pin',
        html: markerHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -25]
      });

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-800 text-xs font-sans max-w-[240px]';
      popupContent.innerHTML = `
        <div class="space-y-2">
          ${restaurant.cover_url ? `<img src="${restaurant.cover_url}" alt="${restaurant.name}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 12px; margin-bottom: 6px;" />` : ''}
          <div style="display: flex; align-items: center; gap: 8px;">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" alt="" style="width: 28px; height: 28px; border-radius: 8px; object-fit: cover;" />` : ''}
            <div>
              <h4 style="font-weight: 800; font-size: 13px; color: #0F172A; line-height: 1.2;">${restaurant.name}</h4>
              <p style="font-size: 11px; color: #64748B;">${lang === 'ar' ? (restaurant.category_name_ar || 'مطعم معتمد') : (restaurant.category_name_fr || 'Restaurant')} • ${restaurant.city}</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; padding: 4px 0; border-top: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #059669; font-weight: 700;">★ ${restaurant.rating} (${restaurant.review_count})</span>
            <span style="color: #2563EB; font-weight: 700;">🛵 250 ${lang === 'ar' ? 'دج' : 'DZD'}</span>
          </div>
          <button id="btn-open-menu-${restaurant.id}" style="width: 100%; padding: 8px 12px; background: #2563EB; color: white; border-radius: 10px; font-weight: 800; font-size: 11px; border: none; cursor: pointer; text-align: center; margin-top: 4px;">
            ${lang === 'ar' ? 'عرض القائمة والطلب 🍽️' : 'Voir le menu & commander 🍽️'}
          </button>
        </div>
      `;

      // Bind menu open action inside popup
      const marker = L.marker(coords, { icon: customIcon }).addTo(markersLayer);
      marker.bindPopup(popupContent, { maxWidth: 260, className: 'restaurant-custom-popup' });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-open-menu-${restaurant.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectRestaurant(restaurant);
          };
        }
      });

      marker.on('click', () => {
        setHoveredRestaurant(restaurant);
      });
    });

    // If no specific city is selected and we have markers, fit bounds
    if (!selectedCity && restaurants.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [restaurants, lang, selectedCity, onSelectRestaurant]);

  // Locate User GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError(lang === 'ar' ? 'المتصفح لا يدعم تحديد الموقع الجغرافي' : 'Géolocalisation non supportée');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);
        setLocating(false);

        const map = mapInstanceRef.current;
        if (!map) return;

        map.setView([lat, lng], 14, { animate: true });

        // Add or move user marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const userIcon = L.divIcon({
            className: 'user-location-pin',
            html: `
              <div style="position: relative; width: 28px; height: 28px; transform: translate(-50%, -50%);">
                <div style="position: absolute; inset: 0; background: #2563EB; border-radius: 9999px; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; inset: 4px; background: #2563EB; border: 3px solid white; border-radius: 9999px; box-shadow: 0 4px 10px rgba(37,99,235,0.5);"></div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map);
          userMarkerRef.current.bindPopup(`
            <div style="font-size: 11px; font-weight: bold; padding: 4px; text-align: center;">
              📍 ${lang === 'ar' ? 'موقعك الحالي في الجزائر' : 'Votre position actuelle'}
            </div>
          `);
        }
      },
      (err) => {
        setLocating(false);
        setLocationError(lang === 'ar' ? 'تعذر تحديد موقعك الحالي، يرجى تفعيل إذن الموقع' : 'Impossible d\'obtenir la géolocalisation');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-md bg-white">
      {/* Top Map Action Bar */}
      <div className="absolute top-3 start-3 end-3 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-2 text-xs font-bold text-slate-800">
          <Store className="w-4 h-4 text-blue-600" />
          <span>
            {restaurants.length} {lang === 'ar' ? 'مطعم على الخريطة' : 'restaurants sur la carte'}
          </span>
          {selectedCity && (
            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
              {selectedCity}
            </span>
          )}
        </div>

        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="pointer-events-auto bg-white hover:bg-slate-50 text-slate-800 hover:text-blue-600 px-3 py-1.5 rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
        >
          <Navigation className={`w-3.5 h-3.5 text-blue-600 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? (lang === 'ar' ? 'جاري التحديد...' : 'Localisation...') : (lang === 'ar' ? 'تحديد موقعي 📍' : 'Ma position 📍')}</span>
        </button>
      </div>

      {locationError && (
        <div className="absolute top-14 start-3 end-3 z-[1000] bg-amber-50 text-amber-800 border border-amber-200 p-2.5 rounded-xl text-xs flex items-center justify-between shadow-md">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="font-bold text-amber-900 ms-2">✕</button>
        </div>
      )}

      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className={`w-full ${className} z-0`} />

      {/* Bottom Floating Quick Card for hovered/selected restaurant */}
      {hoveredRestaurant && (
        <div className="absolute bottom-3 start-3 end-3 sm:start-auto sm:end-3 sm:max-w-xs z-[1000] bg-white rounded-2xl p-3 shadow-xl border border-slate-100 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <img
            src={hoveredRestaurant.logo_url || hoveredRestaurant.cover_url}
            alt={hoveredRestaurant.name}
            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-slate-900 truncate">{hoveredRestaurant.name}</h4>
            <p className="text-[11px] text-slate-500 truncate">{hoveredRestaurant.address} • {hoveredRestaurant.city}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-amber-600">★ {hoveredRestaurant.rating}</span>
              <span className="text-[10px] text-slate-400">•</span>
              <span className="text-[10px] text-emerald-600 font-bold">250 {t('dzd')}</span>
            </div>
          </div>
          <button
            onClick={() => onSelectRestaurant(hoveredRestaurant)}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition"
          >
            {lang === 'ar' ? 'طلب' : 'Menu'}
          </button>
        </div>
      )}
    </div>
  );
};
