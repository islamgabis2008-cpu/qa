import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Restaurant } from '../types/index.js';
import { getRestaurantCoords } from './RestaurantMap.js';
import { useLanguage } from '../context/LanguageContext.js';
import { Navigation, MapPin, Phone, Clock } from 'lucide-react';

interface RestaurantLocationMapProps {
  restaurant: Restaurant;
  className?: string;
}

export const RestaurantLocationMap: React.FC<RestaurantLocationMapProps> = ({
  restaurant,
  className = 'h-64 sm:h-72'
}) => {
  const { lang, t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const coords = getRestaurantCoords(restaurant);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: coords,
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const icon = L.divIcon({
      className: 'restaurant-single-pin',
      html: `
        <div style="position: relative; transform: translate(-50%, -50%);">
          <div style="position: absolute; inset: -5px; background: #2563EB; border-radius: 9999px; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; background: #2563EB; color: white; width: 44px; height: 44px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37,99,235,0.5); border: 3px solid white; font-size: 22px;">
            ${restaurant.category_icon || '🏪'}
          </div>
          <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #2563EB;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const marker = L.marker(coords, { icon }).addTo(map);
    marker.bindPopup(`
      <div style="font-size: 11px; padding: 4px; line-height: 1.4;">
        <b style="font-size: 12px; color: #1E40AF;">🏪 ${restaurant.name}</b><br/>
        <span>📍 ${restaurant.address} • ${restaurant.city}</span><br/>
        <span>⭐ ${restaurant.rating} (${restaurant.review_count} avis)</span>
      </div>
    `).openPopup();

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [restaurant]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-md bg-white">
      {/* Top Banner */}
      <div className="absolute top-3 start-3 end-3 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-2 text-xs font-bold text-slate-800">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>{restaurant.name} — {restaurant.city}</span>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-2xl shadow-md flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'الاتجاهات في خرائط Google' : 'Google Maps'}</span>
        </a>
      </div>

      {/* Map DOM */}
      <div ref={mapContainerRef} className={`w-full ${className} z-0`} />

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-800">{restaurant.address} • {restaurant.city}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{restaurant.opening_hours}</span>
          </span>
          <a href={`tel:${restaurant.phone}`} className="text-blue-600 font-bold hover:underline flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            <span>{restaurant.phone}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
