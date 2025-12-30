// MapComponent.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  Circle, 
  useMap, 
  CircleMarker, 
  Tooltip 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Position } from './types';
import { createCustomIcon, createCarIcon } from './mapUtils';

interface MapComponentProps {
  center: Position;
  zoom: number;
  routePoints?: Position[];
  markers?: {position: Position, icon: L.Icon, popup: string}[];
  circleCenter?: Position;
  circleRadius?: number;
  radiusText?: {position: Position, text: string} | null;
  activeRoute?: Position[]; // إضافة خاصية جديدة للمسار النشط
  // onMapClick?: () => void;
}

// مكون لعرض نص نصف القطر
const RadiusText: React.FC<{ position: Position; text: string }> = ({ position, text }) => {
  return (
    <CircleMarker
      center={position}
      radius={0} // دائرة غير مرئية
      fillOpacity={0}
      stroke={false}
    >
      <Tooltip 
        permanent 
        direction="center" 
        className="radius-tooltip"
      >
        {text}
      </Tooltip>
    </CircleMarker>
  );
};

const MapUpdater = ({ center, zoom }: { center: Position, zoom: number }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
};

export const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom,
  routePoints = [],
  markers = [],
  circleCenter,
  circleRadius,
  radiusText,
  activeRoute = [], // قيمة افتراضية
  // onMapClick,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [markerIcons, setMarkerIcons] = useState<{[key: string]: L.Icon}>({});

  useEffect(() => {
    setIsClient(true);
    
    // تحميل الأيقونات عند التهيئة
    const loadIcons = async () => {
      const icons: {[key: string]: L.Icon} = {};
      
      icons['car'] = await createCarIcon();
      icons['red'] = await createCustomIcon('red');
      icons['green'] = await createCustomIcon('green');
      
      setMarkerIcons(icons);
    };
    
    loadIcons();

    // إضافة CSS للـ Tooltip
    const style = document.createElement('style');
    style.textContent = `
      .radius-tooltip {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        font-weight: bold !important;
        font-size: 16px !important;
        color: #000 !important;
        text-shadow: 
          -1px -1px 0 #fff,  
          1px -1px 0 #fff,
          -1px 1px 0 #fff,
          1px 1px 0 #fff !important;
      }
      .radius-tooltip::before {
        display: none !important;
      }
      
      .active-route {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!isClient) return null;

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapUpdater center={center} zoom={zoom} />
      
      {/* عرض المسار العادي */}
      {routePoints.length > 1 && (
        <Polyline 
          positions={routePoints}
          color="#3B82F6"
          weight={5}
          opacity={0.7}
          lineCap="round"
          lineJoin="round"
        />
      )}
      
      {/* عرض المسار النشط إذا كان موجوداً */}
      {activeRoute.length > 1 && (
        <Polyline 
          positions={activeRoute}
          color="#FF0000" // لون مختلف للمسار النشط
          weight={6}
          opacity={0.9}
          lineCap="round"
          lineJoin="round"
          className="active-route"
        />
      )}
      
      {/* عرض نقاط المسار النشط */}
      {activeRoute.length > 0 && (
        <CircleMarker
          center={activeRoute[activeRoute.length - 1]} // آخر نقطة في المسار
          radius={8}
          color="#FF0000"
          fillColor="#FFFFFF"
          fillOpacity={1}
          weight={2}
        >
          <Popup>آخر موقع مسجل</Popup>
        </CircleMarker>
      )}
      
      {markers.map((marker, index) => (
        <Marker 
          key={index} 
          position={marker.position} 
          icon={markerIcons[marker.icon as unknown as string] || marker.icon}
        >
          <Popup>{marker.popup}</Popup>
        </Marker>
      ))}
      
      {circleCenter && circleRadius && (
        <Circle
          center={circleCenter}
          radius={circleRadius}
          color="red"
          fillOpacity={0.1}
        />
      )}

      {radiusText && (
        <RadiusText 
          position={radiusText.position} 
          text={radiusText.text} 
        />
      )}
    </>
  );
};