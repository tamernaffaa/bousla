// mapUtils.ts
'use client';

import { Position } from './types';

let L: typeof import('leaflet') | null = null;

// تعريف واجهة مخصصة لـ Icon.Default.prototype
interface DefaultIconPrototype {
  _getIconUrl?: string;
}

const ensureLeafletLoaded = async () => {
  if (typeof window !== 'undefined' && !L) {
    L = await import('leaflet');

    // حل مشكلة أيقونات Leaflet الافتراضية بدون استخدام any
    const defaultIconProto = L.Icon.Default.prototype as DefaultIconPrototype;
    delete defaultIconProto._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/images/marker-icon-2x.png',
      iconUrl: '/images/marker-icon.png',
      shadowUrl: '/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }
  return L;
};

export const createCustomIcon = async (color: string) => {
  const L = await ensureLeafletLoaded();
  if (!L) return {} as L.Icon;

  return new L.Icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
      </svg>`
    )}`,
    iconSize: [38, 38], // Increased size slightly for stroke
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });
};

export const createCarIcon = async () => {
  const L = await ensureLeafletLoaded();
  if (!L) return {} as L.Icon;

  return new L.Icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.5));">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
        <circle cx="7.5" cy="14.5" r="1.5" fill="black"/>
        <circle cx="16.5" cy="14.5" r="1.5" fill="black"/>
      </svg>`
    )}`,
    iconSize: [40, 40], // Increased size slightly
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};



export const decodePolyline = (encoded: string) => {
  const poly: { lat: number, lng: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  const len = encoded.length;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
  }

  return poly;
};

export const extractMunicipality = (text: string) => {
  if (!text) return 'غير محدد';
  if (text.includes("بلدية")) {
    return text.split("بلدية")[1].split(",")[0].trim();
  }
  if (text.includes("المدينة:")) {
    return text.split("المدينة:")[1].split(",")[0].trim();
  }
  return text;
};