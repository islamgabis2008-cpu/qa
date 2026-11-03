import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext.js';
import { ExternalLink, Navigation, Phone, Bike, Store, MapPin } from 'lucide-react';

interface DeliveryTrackingMapProps {
  restaurant: {
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  customer: {
    name?: string;
    phone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  courier?: {
    name?: string;
    phone?: string;
    vehicle_type?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  orderStatus?: string;
  className?: string;
}

export const DeliveryTrackingMap: React.FC<DeliveryTrackingMapProps> = ({
  restaurant,
  customer,
  courier,
  orderStatus = 'ON_THE_WAY',
  className = 'h-72 sm:h-96'
}) => {
  const { lang, t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Fallback coordinates if not present (Alger Center)
  const restLat = restaurant.latitude || 36.7538;
  const restLng = restaurant.longitude || 3.0588;

  // Customer coords fallback (offset slightly from restaurant)
  const custLat = customer.latitude || restLat + 0.018;
  const custLng = customer.longitude || restLng + 0.022;

  // Courier coords: if courier has location, use it, else midpoint
  const courLat = courier?.latitude || (restLat + custLat) / 2;
  const courLng = courier?.longitude || (restLng + custLng) / 2;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [courLat, courLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update markers and route line whenever positions or status change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layerGroupRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. RESTAURANT MARKER
    const restCoords: [number, number] = [restLat, restLng];
    bounds.extend(restCoords);

    const restIcon = L.divIcon({
      className: 'tracking-pin',
      html: `
        <div style="position: relative; transform: translate(-50%, -50%);">
          <div style="background: #2563EB; color: white; width: 38px; height: 38px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37,99,235,0.45); border: 2.5px solid white; font-size: 18px;">
            🏪
          </div>
          <div style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #2563EB;"></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22]
    });

    const restMarker = L.marker(restCoords, { icon: restIcon }).addTo(layer);
    restMarker.bindPopup(`
      <div style="font-size: 11px; padding: 4px; line-height: 1.4;">
        <b style="color: #1E40AF; font-size: 12px;">🏪 ${restaurant.name}</b><br/>
        <span>📍 ${restaurant.address || restaurant.city || 'Alger'}</span>
        ${restaurant.phone ? `<br/><a href="tel:${restaurant.phone}" style="color: #2563EB; font-weight: bold;">📞 ${restaurant.phone}</a>` : ''}
      </div>
    `);

    // 2. CUSTOMER DESTINATION MARKER
    const custCoords: [number, number] = [custLat, custLng];
    bounds.extend(custCoords);

    const custIcon = L.divIcon({
      className: 'tracking-pin',
      html: `
        <div style="position: relative; transform: translate(-50%, -50%);">
          <div style="background: #EF4444; color: white; width: 38px; height: 38px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(239,68,68,0.45); border: 2.5px solid white; font-size: 18px;">
            📍
          </div>
          <div style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #EF4444;"></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22]
    });

    const custMarker = L.marker(custCoords, { icon: custIcon }).addTo(layer);
    custMarker.bindPopup(`
      <div style="font-size: 11px; padding: 4px; line-height: 1.4;">
        <b style="color: #B91C1C; font-size: 12px;">📍 ${lang === 'ar' ? 'عنوان التوصيل' : 'Adresse de livraison'}</b><br/>
        <span>${customer.name ? `👤 ${customer.name}<br/>` : ''}</span>
        <span>${customer.address || 'Alger'}</span>
        ${customer.phone ? `<br/><a href="tel:${customer.phone}" style="color: #DC2626; font-weight: bold;">📞 ${customer.phone}</a>` : ''}
      </div>
    `);

    // 3. COURIER LIVE MARKER (IF ASSIGNED OR ON THE WAY)
    if (courier || orderStatus === 'ON_THE_WAY' || orderStatus === 'PICKED_UP' || orderStatus === 'COURIER_ASSIGNED') {
      const courCoords: [number, number] = [courLat, courLng];
      bounds.extend(courCoords);

      const courierIcon = L.divIcon({
        className: 'tracking-pin-courier',
        html: `
          <div style="position: relative; transform: translate(-50%, -50%);">
            <div style="position: absolute; inset: -4px; background: #059669; border-radius: 9999px; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; background: #059669; color: white; width: 44px; height: 44px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(5,150,105,0.5); border: 3px solid white; font-size: 22px;">
              🛵
            </div>
            <div style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #059669;"></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -25]
      });

      const courMarker = L.marker(courCoords, { icon: courierIcon }).addTo(layer);
      courMarker.bindPopup(`
        <div style="font-size: 11px; padding: 4px; line-height: 1.4;">
          <b style="color: #047857; font-size: 12px;">🛵 ${courier?.name || (lang === 'ar' ? 'مندوب التوصيل' : 'Coursier')}</b><br/>
          <span>${lang === 'ar' ? 'الموقع الجغرافي نشط وحي' : 'Position GPS en temps réel'}</span>
          ${courier?.phone ? `<br/><a href="tel:${courier.phone}" style="color: #059669; font-weight: bold;">📞 ${courier.phone}</a>` : ''}
        </div>
      `);

      // Draw polyline connecting: Restaurant -> Courier -> Customer
      const routePolyline = L.polyline([restCoords, courCoords, custCoords], {
        color: '#059669',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8
      }).addTo(layer);
    } else {
      // Connect Restaurant to Customer directly
      L.polyline([restCoords, custCoords], {
        color: '#2563EB',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.7
      }).addTo(layer);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [restLat, restLng, custLat, custLng, courLat, courLng, courier, orderStatus, lang]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${courLat},${courLng}&destination=${custLat},${custLng}`;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-md bg-white">
      {/* Top Banner Status */}
      <div className="absolute top-3 start-3 end-3 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {orderStatus === 'ON_THE_WAY'
              ? (lang === 'ar' ? 'المندوب في الطريق إليك 🛵' : 'Coursier en route vers vous 🛵')
              : orderStatus === 'PICKED_UP'
              ? (lang === 'ar' ? 'تم استلام الطلب من المطعم' : 'Commande récupérée')
              : (lang === 'ar' ? 'تتبع مباشر للمسار الجغرافي' : 'Suivi GPS en direct')}
          </span>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-2xl shadow-md flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'فتح في خرائط Google' : 'Google Maps'}</span>
        </a>
      </div>

      {/* Map Element */}
      <div ref={mapContainerRef} className={`w-full ${className} z-0`} />

      {/* Bottom Route Legend */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🏪</span>
            <span className="font-bold text-slate-800">{restaurant.name}</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base">🛵</span>
            <span className="font-bold text-emerald-700">{courier?.name || (lang === 'ar' ? 'المندوب' : 'Coursier')}</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base">📍</span>
            <span className="font-bold text-slate-800">{customer.address || (lang === 'ar' ? 'الوجهة' : 'Destination')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
