"use client";
// CaptainApp.tsx
import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import 'react-toastify/dist/ReactToastify.css';
import './native-styles.css';
import { toast, ToastContainer } from 'react-toastify';
import {
  Order, OrderDetails, Payment, Service, Position,
  Profile, TrackingData, LastOrder, CaptainData, KotlinOrderData, OrderStatusResponse
} from './types';
import { FaUser, FaBars, FaSearch, FaMapMarkerAlt, FaChevronUp, FaPowerOff, FaCompass, FaPlus, FaMinus, FaLayerGroup } from 'react-icons/fa';
import { createCustomIcon, decodePolyline, extractMunicipality, createCarIcon, calculateDistance } from './mapUtils';
import { supabase } from '../../lib/supabaseClient';
import { captainApi, ordersApi, servicesApi, paymentsApi } from './api';
import { ProfileMenu as DynamicProfileMenu } from './menu/ProfileMenu';
import { BetterLuckMessage } from './BetterLuckMessage';
import { OrderDetailsModal } from './OrderDetailsModal';
import OrderTrackingModal from './OrderTrackingModal';
import { RejectedOrdersModal } from './RejectedOrdersModal';
import { checkAndApplyRewards } from './lib/rewardHandler';

// تحميل مكونات الخريطة بعد ذلك
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500">جاري تحميل الخريطة...</div>
    </div>
  });

const MapComponent = dynamic(
  () => import('./MapComponent').then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100" />
  }
);

const DEFAULT_POSITION: Position = [33.5138, 36.2765];



export default function CaptainApp() {
  // State
  const [active, setActive] = useState(false);
  const [zoneRadius, setZoneRadius] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastorder, setLastorder] = useState<LastOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [profile, setProfile] = useState<Profile>({
    name: "اسم الكابتن",
    phone: "0933696969",
    photo: ""
  });
  const [currentLocation, setCurrentLocation] = useState<Position | null>(DEFAULT_POSITION);
  const [trackingData, setTrackingData] = useState<TrackingData>({
    distance: "0.0",
    time: "0",
    price: "0.0"
  });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showLastOrders, setShowLastOrders] = useState(false);
  const [userRate, setUserRate] = useState(0);
  const [pokeCount, setPokeCount] = useState(0);
  const [routePoints, setRoutePoints] = useState<Position[]>([]);
  const [markers, setMarkers] = useState<{ position: Position, icon: L.Icon, popup: string }[]>([]);
  const [circleCenter, setCircleCenter] = useState<Position>(DEFAULT_POSITION);
  const [circleRadius, setCircleRadius] = useState(1000);
  const [mapZoom, setMapZoom] = useState(14);
  const [isUpdatingService, setIsUpdatingService] = useState<number | null>(null);
  const [isRefreshingPayments, setIsRefreshingPayments] = useState(false);
  const [isRefreshingLastOrders, setIsRefreshingLastOrders] = useState(false);
  const [isRefreshingServices, setIsRefreshingServices] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [rejectedOrders, setRejectedOrders] = useState<{ order_id: number, reason: string, timestamp: number }[]>([]);
  const [showRejectedOrders, setShowRejectedOrders] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [acceptOrderStatus, setAcceptOrderStatus] = useState<'idle' | 'goodluck' | 'loading' | 'success' | 'error'>('idle');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<OrderDetails | null>(null);
  const [carMarker, setCarMarker] = useState<{
    position: Position;
    icon: L.Icon;
  } | null>(null);
  const [icons, setIcons] = useState<{
    carIcon: L.Icon | null,
    redIcon: L.Icon | null,
    greenIcon: L.Icon | null
  }>({
    carIcon: null,
    redIcon: null,
    greenIcon: null
  });
  const [captainId, setCaptainId] = useState<number>(0);
  const [menusLoaded, setMenusLoaded] = useState(false);

  // Swipe Logic for Opening Menu (Swipe Left from Right Edge - Arabic Layout)
  const [pageTouchStart, setPageTouchStart] = useState<number | null>(null);
  const [pageTouchEnd, setPageTouchEnd] = useState<number | null>(null);

  const onPageTouchStart = (e: React.TouchEvent) => {
    // Only trigger if starting from the rightmost 15% of the screen
    if (e.targetTouches[0].clientX > window.innerWidth * 0.85) {
      setPageTouchEnd(null);
      setPageTouchStart(e.targetTouches[0].clientX);
    } else {
      setPageTouchStart(null);
    }
  };

  const onPageTouchMove = (e: React.TouchEvent) => {
    if (pageTouchStart) {
      setPageTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const onPageTouchEnd = () => {
    if (!pageTouchStart || !pageTouchEnd) return;
    const distance = pageTouchStart - pageTouchEnd;
    const isSwipeLeft = distance > 50; // Swiping Left (Start > End, moving towards left)

    if (isSwipeLeft) {
      setShowProfile(true);
    }
    setPageTouchStart(null);
    setPageTouchEnd(null);
  };

  // حالة جديدة لتتبع المسار النشط
  const [activeRoute, setActiveRoute] = useState<{
    orderId: number;
    points: Position[];
  } | null>(null);

  const [isSheetMinimized, setIsSheetMinimized] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const [radiusText, setRadiusText] = useState<{ position: Position, text: string } | null>(null);

  //دالة لمتابعة ارسال الطلب المكتمل وغير مرسل
  const [completedOrderData, setCompletedOrderData] = useState<{
    order: KotlinOrderData;
    real_km: string;
    real_min: string;
    real_price: string;
    end_time: string;
  } | null>(null);

  // Rewards Data
  const [rewards, setRewards] = useState<any[]>([]);
  const [totalRewards, setTotalRewards] = useState(0);
  const [isRefreshingRewards, setIsRefreshingRewards] = useState(false);

  // تعريف دالة fetchRewards في النطاق العلوي للمكون
  const fetchRewards = useCallback(async () => {
    try {
      setIsRefreshingRewards(true);
      // جلب العروض من نوع captain_reward
      const { data: promotions } = await supabase
        .from('promotions')
        .select('*')
        .eq('type', 'captain_reward')
        .eq('active', true)
        .gte('end_date', new Date().toISOString());

      setRewards(promotions || []);

      if (captainId) {
        // حساب إجمالي المكافآت المكتسبة
        const { data: usage } = await supabase
          .from('promotion_usage')
          .select('discount_amount')
          .eq('captain_id', captainId);

        const total = usage?.reduce((sum, u) => sum + u.discount_amount, 0) || 0;
        setTotalRewards(total);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setIsRefreshingRewards(false);
    }
  }, [captainId]); // إضافة captainId كتبعية

  useEffect(() => {
    if (captainId) {
      fetchRewards();
    }
  }, [captainId, fetchRewards]); // إضافة fetchRewards كتبعية





  // استقبال بيانات الكابتن
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);

      const id = urlParams.get('id');
      const name = urlParams.get('name');
      const phone = urlParams.get('phone');
      const photo = urlParams.get('photo');
      const activeParam = urlParams.get('active');

      if (id) {
        setCaptainId(Number(id));
      }

      // تحويل قيمة active من سلسلة نصية إلى boolean
      setActive(activeParam === 'true');

      // تحديث البيانات الأساسية
      const updatedProfile = {
        name: name ? decodeURIComponent(name) : profile.name,
        phone: phone ? decodeURIComponent(phone) : profile.phone,
        photo: profile.photo // الاحتفاظ بالقيمة الحالية افتراضيًا
      };

      // التحقق من صحة الصورة قبل التحديث
      if (photo) {
        const photoUrl = decodeURIComponent(photo);

        // دالة للتحقق من صحة الصورة
        const checkImageValidity = async (url: string) => {
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.startsWith('image/')) {
                return url; // الصورة صالحة
              }
            }
            return null; // الصورة غير صالحة
          } catch (error) {
            return null; // حدث خطأ في التحقق
          }
        };

        // التحقق من الصورة وتحديث الحالة فقط إذا كانت صالحة
        checkImageValidity(photoUrl).then(validUrl => {
          if (validUrl) {
            setProfile(prev => ({
              ...prev,
              ...updatedProfile,
              photo: validUrl
            }));
          } else {
            // إذا كانت الصورة غير صالحة، نحدّث كل شيء ما عدا الصورة
            setProfile(prev => ({
              ...prev,
              ...updatedProfile
            }));
          }
        });
      } else {
        // إذا لم تكن هناك صورة في الرابط، نحدّث البيانات الأخرى فقط
        setProfile(prev => ({
          ...prev,
          ...updatedProfile
        }));
      }
    }
  }, []);

  const sendToKotlin = (action: string, message: string) => {
    try {
      console.log(`Sending to Kotlin - Action: ${action}, Message: ${message}`);

      // الطريقة المباشرة مع TypeScript
      if (window.Android?.receiveMessage) {
        window.Android.receiveMessage(action, message);
        return;
      }

      // إذا كنت تستخدم ReactNativeWebView (يحتاج إلى JSON)
      if (window.ReactNativeWebView?.postMessage) {
        const jsonMessage = JSON.stringify({ action, message });
        window.ReactNativeWebView.postMessage(jsonMessage);
        return;
      }

      // للتنمية المحلية/المتصفح
      console.warn('Android interface not available, mocking send:', { action, message });
      mockKotlinResponse(action, message);
    } catch (error) {
      console.error('Error sending to Kotlin:', error);
    }
  };

  // دالة المحاكاة المعدلة
  const mockKotlinResponse = (action: string, message: string) => {
    console.log(`Mock Kotlin response - Action: ${action}, Message: ${message}`);
  };

  // Memoized values
  const filteredPayments = useMemo(() => {
    return filterMonth
      ? payments.filter(p => p.insert_time.startsWith(filterMonth))
      : payments;
  }, [payments, filterMonth]);

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(payments.map(p => p.insert_time.substring(0, 7)))
    ).sort().reverse();
  }, [payments]);

  const fetchLastOrders = useCallback(async () => {
    console.log('Fetching last orders for captain:', captainId);
    try {
      const lastOrders = await ordersApi.getLastOrders(captainId);
      setLastorder(lastOrders);
    } catch (error) {
      console.error('Error fetching last orders:', error);
    }
  }, [captainId]);

  // Effects
  useEffect(() => {
    // تحميل القوائم أولاً
    const loadMenus = async () => {
      try {
        // تحميل مكونات القوائم أولاً
        await Promise.all([
          import('./menu/ProfileMenu'),
          import('./menu/PaymentsMenu'),
          import('./menu/ServicesMenu'),
          import('./menu/LastOrdersMenu')
        ]);

        // تحديث حالة أن القوائم قد تم تحميلها
        setMenusLoaded(true);

        // ثم تحميل البيانات
        fetchInitialData();
        fetchPayments();
        fetchLastOrders();
      } catch (error) {
        console.error('Error loading menus:', error);
      }
    };

    loadMenus();
  }, []);

  // تحميل أيقونة السيارة بعد تحميل القوائم
  useEffect(() => {
    if (menusLoaded && currentLocation && icons.carIcon) {
      setCarMarker({
        position: currentLocation,
        icon: icons.carIcon as L.Icon
      });
    }
  }, [menusLoaded, icons.carIcon, currentLocation]);

  // داخل مكون CaptainApp، أضف useEffect لاستقبال الموقع
  useEffect(() => {
    // تعريف دالة استقبال الموقع من Kotlin
    const handleLocationUpdate = (lat: number, lng: number) => {
      const newLocation: Position = [lat, lng];

      // تحديث حالة الموقع الحالي
      setCurrentLocation(newLocation);

      // تحديث مركز الدائرة
      setCircleCenter(newLocation);

      // تحديث موقع السيارة فقط
      if (icons.carIcon) {
        setCarMarker({
          position: newLocation,
          icon: icons.carIcon
        });
      }

      // Broadcast Location to Supabase (Throttled: once every 10s)
      const now = Date.now();
      if (captainId && active && (!lastLocationBroadcast.current || now - lastLocationBroadcast.current > 10000)) {
        lastLocationBroadcast.current = now;
        supabase.channel('bousla_matching').send({
          type: 'broadcast',
          event: 'location_update',
          payload: {
            driver_id: captainId,
            lat: lat,
            lng: lng,
            status: 'online'
          }
        }).then(() => console.log('Location broadcasted'));
      }
    };

    window.updateLocation = handleLocationUpdate;

    return () => {
      window.updateLocation = () => { };
    };
  }, [icons.carIcon, captainId, active]);

  // Ref for throttling location broadcasts
  const lastLocationBroadcast = useRef<number>(0);

  // 📡 Automatic Location Broadcasting (Every 10 seconds)
  useEffect(() => {
    if (!active || !currentLocation || !captainId) return;

    const broadcastLocation = () => {
      supabase.channel('bousla_matching').send({
        type: 'broadcast',
        event: 'location_update',
        payload: {
          driver_id: captainId,
          lat: currentLocation[0],
          lng: currentLocation[1],
          status: 'online',
          timestamp: Date.now()
        }
      }).then(() => console.log('📍 Location auto-broadcasted'));
    };

    // Initial broadcast
    broadcastLocation();

    // Broadcast every 10 seconds
    const intervalId = setInterval(broadcastLocation, 10000);

    return () => clearInterval(intervalId);
  }, [active, currentLocation, captainId]);

  // تحميل الأيقونات بعد تحميل القوائم
  useEffect(() => {
    if (menusLoaded) {
      const loadIcons = async () => {
        const [carIcon, redIcon, greenIcon] = await Promise.all([
          createCarIcon(),
          createCustomIcon('red'),
          createCustomIcon('green')
        ]);

        setIcons({
          carIcon,
          redIcon,
          greenIcon
        });
      };

      loadIcons();
    }
  }, [menusLoaded]);

  // استقبال تحديثات الموقع للطلبات النشطة
  useEffect(() => {
    // تعريف دالة استقبال تحديثات الموقع من Kotlin للطلبات النشطة
    window.updateOrderLocation = (orderId: number, lat: number, lng: number) => {
      console.log('Received location update for order:', orderId, lat, lng);

      // إذا كان هذا الطلب هو الطلب النشط الحالي
      if (activeRoute && activeRoute.orderId === orderId) {
        // إضافة النقطة الجديدة إلى المسار
        const newPoint: Position = [lat, lng];
        setActiveRoute(prev => prev ? {
          ...prev,
          points: [...prev.points, newPoint]
        } : null);

        // تحديث موقع السيارة على الخريطة
        if (icons.carIcon) {
          setCarMarker({
            position: newPoint,
            icon: icons.carIcon
          });
        }
      }
    };

    // تعريف دالة استقبال مسار كامل من Kotlin
    window.updateOrderRoute = (orderId: number, routeData: string) => {
      try {
        const points = JSON.parse(routeData) as Position[];
        console.log('Received full route for order:', orderId, points.length, 'points');

        setActiveRoute({
          orderId,
          points
        });
      } catch (error) {
        console.error('Error parsing route data:', error);
      }
    };

    return () => {
      window.updateOrderLocation = () => { };
      window.updateOrderRoute = () => { };
    };
    return () => {
      window.updateOrderLocation = () => { };
      window.updateOrderRoute = () => { };
    };
  }, [activeRoute, icons.carIcon]);

  // 📡 Realtime Matching Listener (Captain Side)
  useEffect(() => {
    if (!active || !currentLocation || !captainId) return;

    // Track notified orders to prevent duplicates
    const notifiedOrdersSet = new Set<number>();

    // Helper function for handling order broadcasts
    const handleOrderBroadcast = async (payload: any) => {
      console.log('Received Order Broadcast:', payload);

      // Handle different payload formats
      // Format 1: {event: 'new_order_request', payload: {order_id, lat, lon}}
      // Format 2: {add1, cost, id, start_point, ...} (direct order object)
      const orderData = payload.payload || payload;

      let lat: number | undefined, lon: number | undefined;
      let order_id = orderData.order_id || orderData.id;

      // Try to extract coordinates
      if (orderData.lat && orderData.lon) {
        lat = orderData.lat;
        lon = orderData.lon;
      } else if (orderData.start_point) {
        const parts = orderData.start_point.split(',');
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lon = parseFloat(parts[1]);
        }
      }

      if (!lat || !lon || !order_id) {
        console.error('Invalid order payload:', payload);
        return;
      }

      // Check if already notified or rejected
      if (notifiedOrdersSet.has(order_id)) {
        console.log(`⏭️ Order ${order_id} already notified, skipping...`);
        return;
      }

      // Check if rejected
      const isRejected = rejectedOrders.some(r => r.order_id === order_id);
      if (isRejected) {
        console.log(`🚫 Order ${order_id} was rejected, skipping...`);
        return;
      }

      // 1. Calculate Distance
      const dist = calculateDistance(currentLocation[0], currentLocation[1], lat, lon);
      console.log(`New Order ${order_id} at ${dist.toFixed(2)}km. Zone: ${zoneRadius}km`);

      // 2. Check Zone
      if (dist <= zoneRadius) {
        // Mark as notified
        notifiedOrdersSet.add(order_id);
        // 3. Notify Captain (UI)
        toast.info(`🔔 طلب جديد قريب منك! (${dist.toFixed(1)} كم)`, {
          position: "top-center",
          autoClose: 5000,
          onClick: () => {
            if ((window as any).handleNewOrder) {
              (window as any).handleNewOrder(order_id);
            }
          }
        });

        // 4. Notify Customer that a captain is nearby
        await supabase.channel('bousla_matching').send({
          type: 'broadcast',
          event: 'captain_found',
          payload: {
            order_id: order_id,
            captain_id: captainId
          }
        });
      }
    };

    // Listen for both events just in case
    const matchingChannel = supabase.channel('bousla_matching')
      .on('broadcast', { event: 'new_order' }, handleOrderBroadcast)
      .on('broadcast', { event: 'new_order_request' }, handleOrderBroadcast)
      .subscribe();

    return () => {
      supabase.removeChannel(matchingChannel);
    };
  }, [active, currentLocation, captainId, zoneRadius]);

  // 🔄 Polling Listener (Fallback for Weak Connection + Initial Load)
  useEffect(() => {
    if (!active || !currentLocation || !captainId) return;

    // Track notified orders to avoid duplicates
    const notifiedOrders = new Set<number>();

    const pollOrders = async () => {
      console.log('🔍 Polling for available orders...');
      // 1. Fetch available orders from DB (pending + new_order)
      const availableOrders = await ordersApi.getAvailableOrders();

      // 2. Filter locally by Zone
      availableOrders.forEach(order => {
        if (!order.start_point) return;
        const [lat, lon] = order.start_point.split(',').map(Number);
        if (isNaN(lat) || isNaN(lon)) return;

        const dist = calculateDistance(currentLocation[0], currentLocation[1], lat, lon);

        // 3. If match & not already notified
        if (dist <= zoneRadius && !notifiedOrders.has(order.id)) {
          notifiedOrders.add(order.id);
          console.log(`✅ Found order ${order.id} within zone (${dist.toFixed(1)}km)`);

          toast.info(`🔔 طلب متاح قريب منك! (${dist.toFixed(1)} كم)`, {
            position: "top-center",
            autoClose: 5000,
            onClick: () => {
              if ((window as any).handleNewOrder) {
                (window as any).handleNewOrder(order.id);
              }
            }
          });
        }
      });
    };

    // Initial call immediately when captain activates
    pollOrders();

    // Then poll every 15 seconds
    const intervalId = setInterval(pollOrders, 15000);

    return () => clearInterval(intervalId);
  }, [active, currentLocation, captainId, zoneRadius]);

  // Callbacks
  const fetchInitialData = useCallback(async () => {
    try {
      const servicesData = await servicesApi.getCaptainServices(captainId);
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }, [captainId]);

  const fetchPayments = useCallback(async () => {
    try {
      setIsRefreshingPayments(true);
      const paymentsData = await paymentsApi.getCaptainPayments(captainId);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsRefreshingPayments(false);
    }
  }, [captainId]);

  const handleRefreshLastOrders = useCallback(async () => {
    setIsRefreshingLastOrders(true);
    try {
      await fetchLastOrders();
    } catch (error) {
      console.error('Error refreshing last orders:', error);
    } finally {
      setIsRefreshingLastOrders(false);
    }
  }, [fetchLastOrders]);

  const handleRefreshServices = useCallback(async () => {
    setIsRefreshingServices(true);
    try {
      await fetchInitialData();
    } catch (error) {
      console.error('Error refreshing services:', error);
    } finally {
      setIsRefreshingServices(false);
    }
  }, [fetchInitialData]);

  const handleActivate = useCallback(() => {
    const newActiveState = !active;
    setActive(newActiveState);

    // تحديث حالة النشاط في قاعدة البيانات
    captainApi.updateActivity(captainId, newActiveState);

    // إرسال القيمة إلى Kotlin بناءً على الحالة الجديدة
    sendToKotlin("start_cap_serv", newActiveState ? "1" : "0");
  }, [active, captainId]);

  const clearRoute = useCallback(() => {
    setRoutePoints([]);
    setMarkers([]);
    setActiveRoute(null);
  }, []);

  const drawRoute = useCallback(async (startPoint: string, endPoint: string) => {
    console.log('Attempting to draw route from:', startPoint, 'to:', endPoint);

    // تنظيف المسار الحالي أولاً
    clearRoute();

    if (!startPoint || !endPoint) {
      console.error('Missing start or end point');
      return;
    }

    let startCoords, endCoords;

    // محاولة تحليل التنسيق المختلف
    if (startPoint.includes(' ') && endPoint.includes(' ')) {
      // إذا كان التنسيق "lat,lng lat,lng"
      const points = startPoint.split(' ');
      if (points.length === 2) {
        startCoords = points[0].split(',');
        endCoords = points[1].split(',');
      } else {
        console.error('Unexpected coordinate format with space:', startPoint);
        return;
      }
    } else {
      // التنسيق الطبيعي "lat,lng"
      startCoords = startPoint.split(',');
      endCoords = endPoint.split(',');
    }

    if (startCoords.length !== 2 || endCoords.length !== 2) {
      console.error('Invalid coordinate format. Expected "lat,lng" or "lat,lng lat,lng"');
      console.error('Start coords:', startCoords, 'End coords:', endCoords);
      return;
    }

    const startLat = parseFloat(startCoords[0].trim());
    const startLng = parseFloat(startCoords[1].trim());
    const endLat = parseFloat(endCoords[0].trim());
    const endLng = parseFloat(endCoords[1].trim());

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      console.error('Invalid coordinates:', { startLat, startLng, endLat, endLng });
      return;
    }

    console.log('Parsed coordinates:', { startLat, startLng, endLat, endLng });

    try {
      console.log('Fetching route from OSRM...');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full`
      );

      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('OSRM response:', data);

      let coordinates: [number, number][] = [];

      if (data.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];

        if (typeof route.geometry === 'string') {
          const decoded = decodePolyline(route.geometry);
          coordinates = decoded.map(point => [point.lat, point.lng]);
        } else if (route.geometry?.coordinates) {
          coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
        }

        console.log('Route calculated with', coordinates.length, 'points');
      }

      if (coordinates.length === 0) {
        console.log('Using straight line as fallback');
        coordinates = [
          [startLat, startLng],
          [endLat, endLng]
        ];
      }

      setRoutePoints(coordinates);

      // استخدام أيقونات مؤقتة إذا لم تكن الأيقونات الرئيسية جاهزة
      let redIconToUse = icons.redIcon;
      let greenIconToUse = icons.greenIcon;

      if (!redIconToUse) {
        redIconToUse = await createCustomIcon('red');
      }
      if (!greenIconToUse) {
        greenIconToUse = await createCustomIcon('green');
      }

      setMarkers([
        {
          position: [startLat, startLng],
          icon: redIconToUse,
          popup: "نقطة الانطلاق"
        },
        {
          position: [endLat, endLng],
          icon: greenIconToUse,
          popup: "نقطة الوصول"
        }
      ]);

      console.log('Route and markers set successfully');

    } catch (error) {
      console.error('Error calculating route:', error);
      // رسم خط مباشر كبديل في حالة الخطأ
      setRoutePoints([
        [startLat, startLng],
        [endLat, endLng]
      ]);

      let redIconToUse = icons.redIcon;
      let greenIconToUse = icons.greenIcon;

      if (!redIconToUse) {
        redIconToUse = await createCustomIcon('red');
      }
      if (!greenIconToUse) {
        greenIconToUse = await createCustomIcon('green');
      }

      setMarkers([
        {
          position: [startLat, startLng],
          icon: redIconToUse,
          popup: "نقطة الانطلاق"
        },
        {
          position: [endLat, endLng],
          icon: greenIconToUse,
          popup: "نقطة الوصول"
        }
      ]);

      console.log('Fallback straight line route set');
    }
  }, [clearRoute, icons.redIcon, icons.greenIcon]);

  const updateZoneRadius = useCallback((radius: number) => {
    const newRadius = Math.max(0.2, Math.min(5, radius));
    setZoneRadius(newRadius);

    const radiusInMeters = newRadius * 1000;
    setCircleRadius(radiusInMeters);

    sendToKotlin("update_zone", newRadius.toFixed(1)); // رقم واحد بعد الفاصلة

    // تحديث نص نصف القطر في منتصف الدائرة
    if (currentLocation) {
      setRadiusText({
        position: currentLocation,
        text: `${newRadius.toFixed(1)} كم` // هنا أيضًا لتكون متسقة
      });
    }
  }, [currentLocation]);

  const handleMyLocation = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.flyTo(currentLocation, 16);
      setMapZoom(16);
    }
  }, [currentLocation]);

  ///استقبال الطلبات من كوتلن
  useEffect(() => {
    // تعريف دالة استقبال الطلبات من Kotlin
    window.handleNewOrder = async (orderId: number) => {
      console.log('Received new order ID:', orderId);

      try {
        // جلب تفاصيل الطلب من API
        const order = await ordersApi.getById(orderId);

        if (order) {
          setSelectedOrder({
            id: order.id,
            ser_chi_id: order.ser_chi_id,
            start_text: order.start_text,
            end_text: order.end_text,
            distance_km: order.distance_km,
            duration_min: order.duration_min,
            cost: order.cost,
            user_rate: order.user_rate,
            start_detlis: order.start_detlis,
            end_detlis: order.end_detlis,
            notes: order.notes || 'لا توجد ملاحظات',
            km_price: order.km_price,
            min_price: order.min_price,
            discount: order.discount,
            add1: order.add1,
            f_km: order.f_km,
            start_time: new Date().toISOString(),
            status: order.status,
            real_km: order.real_km,
            real_min: order.real_min,
            real_price: order.real_price,
            real_street: order.real_street,
            waiting_min: order.waiting_min,
            end_time: order.end_time,
            start_point: order.start_point,
            end_point: order.end_point
          });

          setShowOrderDetails(true);

          if (order.start_point && order.end_point) {
            drawRoute(order.start_point, order.end_point);
          }
        }
      } catch (error) {
        console.error('Error handling new order:', error);
      }
    };

    return () => {
      // تنظيف الدالة عند إلغاء التثبيت
      window.handleNewOrder = () => { };
    };
  }, [drawRoute]);

  const openOrderDetails = useCallback(async (orderId: number) => {
    console.log('Fetching order with ID:', orderId);
    setAcceptOrderStatus('loading');

    const order = await ordersApi.getById(orderId);

    if (!order) {
      console.error('No order data received for ID:', orderId);
      setAcceptOrderStatus('error');
      return;
    }

    setSelectedOrder({
      id: order.id,
      ser_chi_id: order.ser_chi_id,
      start_text: order.start_text,
      end_text: order.end_text,
      distance_km: order.distance_km,
      duration_min: order.duration_min,
      cost: order.cost,
      user_rate: order.user_rate,
      start_detlis: order.start_detlis,
      end_detlis: order.end_detlis,
      notes: order.notes || 'لا توجد ملاحظات',
      km_price: order.km_price,
      min_price: order.min_price,
      discount: order.discount,
      add1: order.add1,
      f_km: order.f_km,
      start_time: new Date().toISOString(),
      status: order.status,
      real_km: order.real_km,
      real_min: order.real_min,
      real_price: order.real_price,
      real_street: order.real_street,
      waiting_min: order.waiting_min,
      end_time: order.end_time,
      start_point: order.start_point,
      end_point: order.end_point
    });

    setAcceptOrderStatus('idle');
    setShowOrderDetails(true);

    if (order.start_point && order.end_point) {
      drawRoute(order.start_point, order.end_point);
    }
  }, [drawRoute]);

  ///الموافقة على الطلب
  const handleAcceptOrder = useCallback(async (status: string) => {
    if (!selectedOrder) return;

    setAcceptOrderStatus('loading');

    try {
      const result = await ordersApi.updateStatus(selectedOrder.id, captainId, status);
      console.log('Order status update result:', result);

      if (result.status === 'success') {
        setAcceptOrderStatus('success');

        // إرسال بيانات الطلب إلى Kotlin
        const orderData = {
          id: selectedOrder.id,
          start_text: selectedOrder.start_text,
          end_text: selectedOrder.end_text,
          distance_km: selectedOrder.distance_km,
          duration_min: selectedOrder.duration_min,
          cost: selectedOrder.cost,
          user_rate: selectedOrder.user_rate,
          km_price: selectedOrder.km_price,
          min_price: selectedOrder.min_price,
          discount: selectedOrder.discount,
          add1: selectedOrder.add1,
          f_km: selectedOrder.f_km,
          start_time: selectedOrder.start_time,
          accept_time: new Date().toISOString(),
          start_point: selectedOrder.start_point,
          end_point: selectedOrder.end_point
        };

        sendToKotlin("order_accepted", JSON.stringify(orderData));

        // إيقاف زر استقبال الطلبات
        setActive(false);

        setTimeout(() => {
          setShowOrderDetails(false);
          setAcceptOrderStatus('idle');

          // إظهار واجهة متابعة الطلب
          setTrackingOrder(selectedOrder);
          setShowOrderTracking(true);

          // بدء تتبع المسار
          sendToKotlin("start_route_tracking", selectedOrder.id.toString());
        }, 2000);
      } else if (result.status === 'goodluck') {
        setAcceptOrderStatus('goodluck');
        setTimeout(() => {
          setShowOrderDetails(false);
          setAcceptOrderStatus('idle');
          clearRoute();
          setShowMessage(true);
        }, 2000);
      } else {
        setAcceptOrderStatus('error');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      setAcceptOrderStatus('error');
    }
  }, [selectedOrder, captainId, clearRoute]);

  // رفض الطلب
  const handleRejectOrder = useCallback(async (orderId: number, reason: string = 'not_specified') => {
    try {
      // 1. حفظ في قاعدة البيانات
      const result = await ordersApi.rejectOrder(
        orderId,
        captainId,
        reason
      );

      if (result.success) {
        // 2. إضافة للقائمة المحلية
        setRejectedOrders(prev => [...prev, {
          order_id: orderId,
          reason: reason,
          timestamp: Date.now()
        }]);

        // 3. إغلاق نافذة التفاصيل
        setShowOrderDetails(false);
        setSelectedOrder(null);

        toast.success(`تم رفض الطلب #${orderId} وحفظه في السجل`);
        console.log(`❌ Order ${orderId} rejected and saved to DB. Reason: ${reason}`);
      } else {
        toast.error('فشل حفظ رفض الطلب في قاعدة البيانات');
        console.error('Failed to save rejection to DB');
      }
    } catch (error) {
      console.error('Error in handleRejectOrder:', error);
      toast.error('حدث خطأ أثناء رفض الطلب');
    }
  }, [captainId]);

  // إضافة دالة لإنهاء تتبع المسار
  const stopRouteTracking = useCallback(() => {
    setActiveRoute(null);
    // إرسال أمر إيقاف التتبع إلى Kotlin
    sendToKotlin("stop_route_tracking", "");
  }, []);

  //تعديل حالة الطلب
  const handleNextStatus = useCallback(async (status: string) => {
    if (!trackingOrder) return;

    // حالة التحميل - إظهار مؤشر الانتظار
    setAcceptOrderStatus('loading');

    try {
      if (status === "completed") {
        // إيقاف تتبع المسار
        stopRouteTracking();
        sendToKotlin("stop_tracking_services", "0");
        setShowOrderTracking(false);
        sendToKotlin("order_status_update", JSON.stringify({
          orderId: trackingOrder.id,
          status: status,
          date_time: new Date().toISOString()
        }));

        clearRoute();

        // Check for rewards
        checkAndApplyRewards(trackingOrder, captainId).then(async result => {
          if (result.applied) {
            toast.success(`🎉 مبروك! حصلت على مكافأة: ${result.totalAmount} ل.س`);
            // Refresh payments list if the function exists
            if (typeof fetchPayments === 'function') {
              // @ts-ignore
              fetchPayments();
            } else {
              // Try to trigger refresh via filtering if available, or just notify user
              console.log('Payments refreshed implicitly or fetchPayments not available in scope');
            }
          }
        });
      }

      // إرسال حالة الطلب الجديدة إلى السيرفر مع مهلة زمنية
      const result = await Promise.race([
        ordersApi.updateStatus(trackingOrder.id, captainId, status),
        new Promise<{ status: string }>((resolve) => setTimeout(() => resolve({ status: 'timeout' }), 10000)) // مهلة 10 ثواني
      ]) as OrderStatusResponse | { status: string };

      if ((result as { status: string }).status === 'timeout') {
        // إذا انتهت المهلة الزمنية
        setAcceptOrderStatus('error');
        throw new Error('فشل في تحديث الحالة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
      }

      if ((result as OrderStatusResponse).status === 'success') {
        // إرسال الطلب لكوتلن
        sendToKotlin("order_status_update", JSON.stringify({
          orderId: trackingOrder.id,
          status: status,
          date_time: new Date().toISOString()
        }));

        if (status === "completed") {
          sendToKotlin("delete_order_finish", "0");
        }

        console.log(`تم تحديث حالة الطلب ${trackingOrder.id} إلى ${status} بنجاح`);
        setAcceptOrderStatus('success');

        // إخفاء مؤشر الانتظار بعد نجاح العملية
        setTimeout(() => {
          setAcceptOrderStatus('idle');
        }, 2000);
      } else {
        console.error('فشل في تحديث حالة الطلب في السيرفر');
        setAcceptOrderStatus('error');
        throw new Error('فشل في تحديث الحالة. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      console.error('خطأ أثناء تحديث حالة الطلب:', error);
      setAcceptOrderStatus('error');
      throw error; // إعادة رفع الخطأ ليتم التعامل معه في المكون الفرعي
    }
  }, [trackingOrder, captainId, stopRouteTracking]);

  ///عرض الطلب المفتوح بعد اعادة تشغيل التطبيق
  useEffect(() => {
    // طلب التحقق من الطلبات المفتوحة من Kotlin
    const checkForOpenOrder = () => {
      sendToKotlin("check_open_order", "");
    };

    // تعريف دالة استقبال الرد من Kotlin
    window.handleOpenOrderResponse = (response: string) => {
      console.log('Open order response:', response);

      if (response !== "no_open_order") {
        try {
          // محاولة تحليل الرد كمصفوفة أولاً
          const orderDataArray = JSON.parse(response);
          let orderData: KotlinOrderData | null = null;

          if (Array.isArray(orderDataArray) && orderDataArray.length > 0) {
            // أخذ أول عنصر في المصفوفة
            orderData = orderDataArray[0];
          } else if (typeof orderDataArray === 'object' && orderDataArray !== null) {
            // إذا كان كائنًا وليس مصفوفة
            orderData = orderDataArray;
          }

          if (orderData && typeof orderData.id === 'number') {
            if (orderData.status === "completed") {
              // عرض واجهة الطلب المكتمل
              setCompletedOrderData({
                order: orderData,
                real_km: orderData.real_km || "0",
                real_min: orderData.real_min || "0",
                real_price: orderData.real_price || "0",
                end_time: orderData.end_time || new Date().toISOString()
              });
            } else {
              handleOpenOrder(orderData);
            }
          }
        } catch (error) {
          console.error('Error parsing open order data:', error);
        }
      } else {
        console.log('No open orders found');
      }
    };

    // التحقق من وجود طلب مفتوح عند تحميل التطبيق
    checkForOpenOrder();

    return () => {
      window.handleOpenOrderResponse = () => { };
    };
  }, []);

  //عرض رسالة متابعة الطلب المكتمل وغير مرسل للسيرفر
  const handleSubmitCompletedOrder = useCallback(async () => {
    if (!completedOrderData) return;

    try {
      setAcceptOrderStatus('loading');

      // إرسال تحديث الحالة للسيرفر
      const result = await ordersApi.updateStatus(
        completedOrderData.order.id,
        captainId,
        "completed"
      );

      if (result.status === 'success') {
        // إرسال البيانات إلى Kotlin
        sendToKotlin("order_status_update", JSON.stringify({
          orderId: completedOrderData.order.id,
          status: "completed",
          date_time: completedOrderData.end_time,
          real_km: completedOrderData.real_km,
          real_min: completedOrderData.real_min,
          real_price: completedOrderData.real_price
        }));

        sendToKotlin("delete_order_finish", "0");

        setAcceptOrderStatus('success');
        setCompletedOrderData(null);

        clearRoute();

        setTimeout(() => {
          setAcceptOrderStatus('idle');
        }, 2000);
      } else {
        setAcceptOrderStatus('error');
        alert('فشل في إرسال التحديث. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      console.error('Error submitting completed order:', error);
      setAcceptOrderStatus('error');
    }
  }, [completedOrderData, captainId]);

  // تطوير دالة handleOpenOrder لمعالجة البيانات الكاملة
  const handleOpenOrder = useCallback((orderData: KotlinOrderData) => {
    console.log('Received open order:', orderData);

    // إنشاء كائن الطلب مع جميع البيانات
    const trackingOrderData: OrderDetails = {
      id: orderData.id,
      ser_chi_id: orderData.ser_chi_id || 0,
      start_text: orderData.start_text || '',
      end_text: orderData.end_text || '',
      distance_km: orderData.distance_km || '0.0',
      duration_min: typeof orderData.duration_min === 'string'
        ? parseInt(orderData.duration_min) || 0
        : orderData.duration_min || 0,
      cost: orderData.cost || '0.0',
      user_rate: typeof orderData.user_rate === 'string'
        ? parseInt(orderData.user_rate) || 0
        : orderData.user_rate || 0,
      start_detlis: orderData.start_detlis || '',
      end_detlis: orderData.end_detlis || '',
      notes: orderData.notes || 'لا توجد ملاحظات',
      km_price: orderData.km_price || '0.0',
      min_price: orderData.min_price || '0.0',
      discount: orderData.discount || '0',
      add1: orderData.add1 || '0.0',
      f_km: orderData.f_km || '0.0',
      start_time: orderData.start_time || new Date().toISOString(),
      status: orderData.status || 'arrived',
      real_km: orderData.real_km,
      real_min: orderData.real_min,
      real_price: orderData.real_price,
      real_street: orderData.real_street,
      waiting_min: orderData.waiting_min,
      end_time: orderData.end_time,
      start_point: orderData.start_point || "",
      end_point: orderData.end_point || ""
    };

    // تعيين حالة التتبع - استخدام حالة الطلب من Kotlin إذا كانت متوفرة
    setTrackingOrder(trackingOrderData);
    setShowOrderTracking(true);

    // بدء تتبع المسار إذا كانت هناك بيانات موقع
    if (orderData.current_lat && orderData.current_lng) {
      const initialPoint: Position = [orderData.current_lat, orderData.current_lng];
      setActiveRoute({
        orderId: orderData.id,
        points: [initialPoint]
      });

      // تحديث موقع السيارة
      if (icons.carIcon) {
        setCarMarker({
          position: initialPoint,
          icon: icons.carIcon
        });
      }
    }

    // إذا كانت هناك نقاط طريق، رسم المسار
    if (orderData.start_point && orderData.end_point) {
      console.log('Drawing route for open order:', orderData.start_point, orderData.end_point);
      drawRoute(orderData.start_point, orderData.end_point);
    } else {
      console.warn('Missing start_point or end_point in open order data');
    }

    // إرسال حالة الطلب إلى Kotlin للتأكد من المزامنة
    sendToKotlin("order_tracking_started", JSON.stringify({
      orderId: orderData.id,
      status: orderData.status || 'unknown'
    }));
  }, [drawRoute, icons.carIcon]);

  //فتح الطريق في yandex
  const handleOpenYandex = useCallback(() => {
    if (trackingOrder && trackingOrder.start_point && trackingOrder.end_point) {
      const yandexData = {
        start_point: trackingOrder.start_point,
        end_point: trackingOrder.end_point
      };
      sendToKotlin("open_yandex", JSON.stringify(yandexData));
    } else {
      toast.error("لا توجد إحداثيات متاحة لفتح Yandex");
    }
  }, [trackingOrder]);

  //الاتصال بالزبون
  const handleCallCustomer = useCallback(() => {
    if (trackingOrder) {
      sendToKotlin("call_customer", trackingOrder.id.toString());
    }
  }, [trackingOrder]);

  //نكز
  const handlePokeCustomer = useCallback(() => {
    if (trackingOrder) {
      sendToKotlin("poke_customer", trackingOrder.id.toString());
    }
  }, [trackingOrder]);

  //الاتصال بالشركة
  const handleCallCompany = useCallback(() => {
    sendToKotlin("call_company", "");
  }, []);

  //الاتصال بالطوارئ
  const handleCallEmergency = useCallback(() => {
    sendToKotlin("call_emergency", "");
  }, []);

  ///استقبال بيانات متابعة الرحلة من كوتلن
  useEffect(() => {
    window.update_cost = (km: string, min: string, cost: string) => {
      console.log('Received cost data:', { km, min, cost });

      setTrackingData({
        distance: km,
        time: min,
        price: cost
      });

      if (trackingOrder) {
        setTrackingOrder(prev => prev ? {
          ...prev,
          distance_km: km,
          duration_min: parseInt(min) || 0,
          cost: cost
        } : null);
      }
    };

    return () => {
      window.update_cost = undefined;
    };
  }, [trackingOrder]);

  //ايقاف زر نشط 
  // داخل useEffect الرئيسي لإعداد الاستماع للأحداث
  useEffect(() => {
    // تعريف دالة استقبال أمر إيقاف التتبع من Kotlin
    window.handleStopTrackingButton = () => {
      console.log('Received stop tracking button command from Android');

      // إيقاف حالة النشاط
      setActive(false);

      // إيقاف تتبع المسار
      stopRouteTracking();

      // تنظيف المسار
      clearRoute();
    };

    return () => {
      window.handleStopTrackingButton = () => { };
    };
  }, [clearRoute, stopRouteTracking]);

  // ايقاف او تشغيل الخدمات
  // ... (previous logic around here) ...

  // Handle Back Button from Android
  useEffect(() => {
    // Define the global function for Android to call
    window.handleBackButton = () => {
      // 1. If Profile/Side Menu is open, close it
      if (showProfile) {
        setShowProfile(false);
        return true; // We handled the back button
      }

      // 2. If Order Tracking is open but we want to close it? (Usually valid to keep it)
      // Maybe if OrderDetailsModal is open?
      if (showOrderDetails) {
        setShowOrderDetails(false);
        setSelectedOrder(null);
        return true;
      }

      if (showChangePassword) {
        setShowChangePassword(false);
        return true;
      }

      // 3. Not handled, let Android do its default behavior (go back or exit)
      return false;
    };

    return () => {
      // Cleanup if needed, though mostly persistent
      window.handleBackButton = undefined;
    };
  }, [showProfile, showOrderDetails, showChangePassword]);

  //ايقاف او تشغيل الخدمات
  const handleServiceToggle = useCallback(async (service: Service) => {
    const newActive = service.active === false ? true : false;
    const originalActive = service.active;

    setServices(prev => prev.map(s =>
      s.id === service.id ? { ...s, active: newActive } : s
    ));

    try {
      const success = await servicesApi.updateStatus(service.id, newActive, captainId);
      if (!success) {
        throw new Error('Failed to update service status');
      }

      // إشعار Flutter بتحديث كاش الخدمات
      if (typeof window !== 'undefined' && (window as any).Android) {
        try {
          const message = JSON.stringify({
            action: 'refresh_services_cache',
            captain_id: captainId
          });
          (window as any).Android.postMessage(message);
          console.log('Notified Flutter to refresh services cache');
        } catch (e) {
          console.error('Failed to notify Flutter:', e);
        }
      }
    } catch (error) {
      setServices(prev => prev.map(s =>
        s.id === service.id ? { ...s, active: originalActive } : s
      ));
      console.error('Failed to update service:', error);
    }
  }, [captainId]);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون على الأقل 6 أحرف');
      return;
    }

    try {
      const response: { success: boolean; message?: string } = await captainApi.changePassword(captainId, currentPassword, newPassword);

      if (response.success) {
        // إظهار رسالة نجاح
        alert('تم تغيير كلمة المرور بنجاح');
        setShowChangePassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
      } else {
        setPasswordError(response.message || 'حدث خطأ أثناء تغيير كلمة المرور');
      }
    } catch (error) {
      setPasswordError('حدث خطأ في الاتصال بالخادم');
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-gray-100 font-sans" dir="rtl">

      {/* 🗺️ MAP LAYER (Full Screen) */}
      <div className="absolute inset-0 z-0 h-full w-full">
        {menusLoaded ? (
          <Suspense fallback={<div className="h-full w-full bg-gray-200 animate-pulse" />}>
            <MapContainer
              center={currentLocation || DEFAULT_POSITION}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              ref={mapRef}
            >
              <MapComponent
                center={currentLocation || DEFAULT_POSITION}
                zoom={mapZoom}
                routePoints={routePoints}
                markers={[
                  ...markers,
                  ...(carMarker ? [{
                    position: carMarker.position,
                    icon: carMarker.icon,
                    popup: "موقعك الحالي"
                  }] : [])
                ]}
                circleCenter={circleCenter}
                circleRadius={circleRadius}
                radiusText={radiusText}
                activeRoute={activeRoute ? activeRoute.points : []}
              />
            </MapContainer>
          </Suspense>
        ) : (
          <div className="h-full w-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 font-bold">جاري تحميل الخريطة...</span>
          </div>
        )}
      </div>

      {/* 🔝 TOP FLOATING BAR */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start safe-area-top pointer-events-none">
        {/* Earnings Pill (Left) */}
        <div className="pointer-events-auto bg-black text-white px-5 py-2 rounded-full shadow-lg flex flex-col items-center min-w-[100px]">
          <span className="text-xs text-gray-400 font-bold">اليوم</span>
          <span className="text-xl font-bold font-mono">{(totalRewards + 15000).toLocaleString()} ل.س</span>
        </div>

        {/* Status Badge (Center) - Only show if online */}
        {active && (
          <div className="bg-black/80 backdrop-blur-md text-yellow-400 px-4 py-1 rounded-full text-sm font-bold shadow-md animate-pulse">
            🟢 أنت متصل
          </div>
        )}

        {/* Profile/Menu Button (Right) */}
        <button
          onClick={() => setShowProfile(true)}
          className="pointer-events-auto bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-transform active:scale-95 relative"
        >
          {profile.photo ? (
            <img src={profile.photo} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <FaBars className="text-xl text-black" />
          )}
          {/* Notification Dot */}
          <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
        </button>
      </div>

      {/* 🎮 MAP CONTROLS (Right Side) - Moved UP to avoid overlap */}
      <div className="absolute right-4 top-32 flex flex-col gap-3 z-10 pointer-events-auto">
        <button onClick={handleMyLocation} className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:text-black hover:bg-gray-50">
          <FaCompass className="text-xl" />
        </button>
        <button onClick={() => updateZoneRadius(zoneRadius + 0.1)} className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:text-black hover:bg-gray-50">
          <FaPlus />
        </button>
        <button onClick={() => updateZoneRadius(zoneRadius - 0.1)} className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:text-black hover:bg-gray-50">
          <FaMinus />
        </button>
        <button onClick={() => setShowServices(true)} className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:text-black hover:bg-gray-50">
          <FaLayerGroup />
        </button>
      </div>

      {/* 🚀 BOTTOM PANEL (GO Button) */}
      <div
        className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-30 transition-all duration-500 ease-in-out"
      >
        {/* Handle Bar */}
        <div
          onClick={() => setIsSheetMinimized(!isSheetMinimized)}
          className="w-full flex justify-center pb-4 cursor-pointer active:opacity-70"
          role="button"
          aria-label="Toggle Bottom Sheet"
        >
          <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
        </div>

        {/* Content Container - Morphs from Col to Row */}
        <div className={`flex transition-all duration-500 ${isSheetMinimized ? 'flex-row-reverse items-center justify-between gap-4' : 'flex-col items-center'}`}>

          {/* 1. Status Text */}
          <div className={`transition-all duration-500 ${isSheetMinimized ? 'text-right mb-0' : 'text-center mb-6 w-full'}`}>
            {active ? (
              <h3 className={`font-bold text-gray-700 animate-pulse ${isSheetMinimized ? 'text-sm' : 'text-xl'}`}>جاري البحث...</h3>
            ) : (
              <h3 className={`font-bold text-gray-400 ${isSheetMinimized ? 'text-sm' : 'text-base'}`}>غير متصل</h3>
            )}
          </div>

          {/* 2. Main Button */}
          <div className={`transition-all duration-500 ${isSheetMinimized ? 'w-auto' : 'w-full flex justify-center'}`}>
            {active ? (
              <button
                onClick={handleActivate}
                className={`bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isSheetMinimized ? 'px-6 py-2 text-sm h-10' : 'w-full py-4 text-xl h-16'}`}
              >
                <FaPowerOff />
                {!isSheetMinimized && <span>إيقاف العمل</span>}
              </button>
            ) : (
              <button
                onClick={handleActivate}
                className={`bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-full shadow-xl transition-all active:scale-95 flex items-center justify-center ${isSheetMinimized ? 'w-12 h-12 text-sm' : 'w-24 h-24 text-2xl shadow-yellow-200 ring-4 ring-yellow-100'}`}
              >
                ابدأ
              </button>
            )}
          </div>

          {/* 3. Stats Row (Condensed in Minimized) */}
          <div className={`transition-all duration-500 border-gray-100 ${isSheetMinimized ? 'border-none flex gap-4' : 'border-t mt-8 pt-6 w-full flex justify-between'}`}>
            <div className={`text-center ${isSheetMinimized ? '' : 'flex-1 border-l border-gray-100'}`}>
              <div className={`text-gray-400 font-bold ${isSheetMinimized ? 'text-[10px]' : 'text-xs mb-1'}`}>القبول</div>
              <div className={`font-bold text-green-600 ${isSheetMinimized ? 'text-sm' : 'text-lg'}`}>95%</div>
            </div>
            <div className={`text-center ${isSheetMinimized ? '' : 'flex-1 border-l border-gray-100'}`}>
              <div className={`text-gray-400 font-bold ${isSheetMinimized ? 'text-[10px]' : 'text-xs mb-1'}`}>التقييم</div>
              <div className={`font-bold text-black ${isSheetMinimized ? 'text-sm' : 'text-lg'}`}>4.9</div>
            </div>
            <div className={`text-center ${isSheetMinimized ? '' : 'flex-1'}`}>
              <div className={`text-gray-400 font-bold ${isSheetMinimized ? 'text-[10px]' : 'text-xs mb-1'}`}>الرحلات</div>
              <div className={`font-bold text-black ${isSheetMinimized ? 'text-sm' : 'text-lg'}`}>12</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edge Swipe Trigger Zone */}
      <div
        className="fixed top-0 right-0 w-8 h-full z-40"
        onTouchStart={onPageTouchStart}
        onTouchMove={onPageTouchMove}
        onTouchEnd={onPageTouchEnd}
      />

      {/* 📱 MODALS & DYNAMIC CONTENT */}
      {showProfile && (
        <DynamicProfileMenu
          profile={profile}
          onClose={() => setShowProfile(false)}
          services={services}
          isUpdatingService={isUpdatingService}
          isRefreshingServices={isRefreshingServices}
          onRefreshServices={handleRefreshServices}
          onToggleService={handleServiceToggle}
          payments={filteredPayments}
          availableMonths={availableMonths}
          filterMonth={filterMonth}
          isRefreshingPayments={isRefreshingPayments}
          onRefreshPayments={fetchPayments}
          onFilterMonth={setFilterMonth}
          rewards={rewards}
          totalRewards={totalRewards}
          isRefreshingRewards={isRefreshingRewards}
          onRefreshRewards={fetchRewards}
          lastOrders={lastorder}
          isRefreshingLastOrders={isRefreshingLastOrders}
          onRefreshLastOrders={handleRefreshLastOrders}
          onOrderClick={(id) => { openOrderDetails(id); setShowProfile(false); }}
          onvertioal_order={() => { openOrderDetails(1); setShowProfile(false); }}
          onlogout_btn={() => sendToKotlin("logout", "")}
          onShowChangePassword={() => { setShowChangePassword(true); setShowProfile(false); }}
          onShowRejectedOrders={() => { setShowRejectedOrders(true); setShowProfile(false); }}
          rejectedOrdersCount={rejectedOrders.length}
        />
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowOrderDetails(false);
            setAcceptOrderStatus('idle');
            clearRoute();
          }}
          onAccept={() => handleAcceptOrder("cap_accept")}
          acceptStatus={acceptOrderStatus}
        />
      )}

      {showMessage && <BetterLuckMessage onClose={() => setShowMessage(false)} />}

      {showOrderTracking && trackingOrder && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <OrderTrackingModal
            order={trackingOrder}
            trackingData={trackingData}
            initialStatus={trackingOrder.status}
            onNextStatus={handleNextStatus}
            onCallCustomer={handleCallCustomer}
            onPokeCustomer={handlePokeCustomer}
            onCallCompany={handleCallCompany}
            onCallEmergency={handleCallEmergency}
            onOpenYandex={handleOpenYandex}
            onStartRouteTracking={() => sendToKotlin("start_route_tracking", trackingOrder.id.toString())}
            onPauseRouteTracking={() => sendToKotlin("pause_route_tracking", trackingOrder.id.toString())}
            onStopRouteTracking={stopRouteTracking}
          />
        </div>
      )}

      {/* Pending Completion Modal */}
      {completedOrderData && (
        <div className="absolute inset-0 flex items-center justify-center z-40 backdrop-blur-md bg-black/20" dir="rtl">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80">
            <h2 className="text-xl font-bold mb-4 text-center">لم يتم إنهاء آخر طلب</h2>
            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl text-sm">
              <div className="flex justify-between"><span className="text-gray-500">المسافة:</span><span className="font-bold">{completedOrderData.real_km} كم</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الوقت:</span><span className="font-bold">{completedOrderData.real_min} د</span></div>
              <div className="flex justify-between border-t pt-2 mt-2"><span className="text-gray-800 font-bold">التكلفة:</span><span className="font-black text-yellow-600">{completedOrderData.real_price} ل.س</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCompletedOrderData(null)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">إلغاء</button>
              <button onClick={handleSubmitCompletedOrder} disabled={acceptOrderStatus === 'loading'} className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 flex justify-center items-center">
                {acceptOrderStatus === 'loading' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'إرسال'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="absolute inset-0 flex items-center justify-center z-40 backdrop-blur-md bg-black/20">
          <div className="bg-white p-6 rounded-2xl w-80 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-right">تغيير كلمة المرور</h2>
            {passwordError && <div className="mb-4 text-sm text-red-500 text-right bg-red-50 p-2 rounded">{passwordError}</div>}

            <div className="space-y-4">
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="كلمة المرور الحالية" className="w-full p-3 bg-gray-50 rounded-xl text-right outline-none focus:ring-2 focus:ring-yellow-400" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة المرور الجديدة" className="w-full p-3 bg-gray-50 rounded-xl text-right outline-none focus:ring-2 focus:ring-yellow-400" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة المرور" className="w-full p-3 bg-gray-50 rounded-xl text-right outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>

            <div className="flex justify-between mt-6 gap-3">
              <button onClick={() => { setShowChangePassword(false); setPasswordError(''); }} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600">إلغاء</button>
              <button onClick={handleChangePassword} className="flex-1 py-3 bg-yellow-400 text-black rounded-xl font-bold hover:bg-yellow-500">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Rejected Orders Modal */}
      {showRejectedOrders && (
        <RejectedOrdersModal
          orders={rejectedOrders}
          onClose={() => setShowRejectedOrders(false)}
          onReconsider={(orderId) => {
            // Remove from rejected list
            setRejectedOrders(prev => prev.filter(r => r.order_id !== orderId));
            toast.success(`تمت إعادة النظر في الطلب #${orderId}`);
          }}
          onPermanentDelete={(orderId) => {
            setRejectedOrders(prev => prev.filter(r => r.order_id !== orderId));
            toast.info(`تم حذف الطلب #${orderId} من القائمة`);
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

    </div>
  );
};