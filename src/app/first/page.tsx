//first.tsx

'use client';

import { useState, useEffect, useRef } from "react";
import { FaBars, FaTimes, FaArrowLeft, FaMapMarkerAlt, FaSearch, FaStar, FaHistory, FaWallet, FaUser, FaCog, FaPercentage, FaPhoneAlt } from "react-icons/fa";
import { fetchTrips as fetchTripsApi, fetchServices as fetchServicesApi } from "./UserApi";
import { motion, AnimatePresence } from "framer-motion";
import "../cap/native-styles.css";
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-toastify';
import { activeTripStorage } from '../../lib/activeTripStorage';
import ActiveTripView from './ActiveTripView';

interface Trip {
  id: number;
  from: string;
  to: string;
  price: string;
  distance: string;
  time: string;
  status: string;
}

interface Service {
  id: number;
  ser_name: string;
  note1: string;
  activ: number;
  pro: number; // Order priority
}

interface RawTrip {
  id?: number;
  start_text?: string;
  end_text?: string;
  cost?: number | null;
  distance_km?: string;
  duration_min?: string;
  status?: string;
}

interface RawService {
  id?: number;
  ser_name?: string;
  note1?: string;
  activ?: number;
  pro?: number;
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Active Order State
  const [activeOrder, setActiveOrder] = useState<{
    order_id: number;
    from: string;
    to: string;
    service_name: string;
    service_icon?: string;
    cost: string;
    distance: string;
    duration: number;
    status: string;
    timestamp: number;
  } | null>(null);
  const [captainsNotified, setCaptainsNotified] = useState(0);
  const [showActiveTripView, setShowActiveTripView] = useState(false);

  // Ads Data
  const ads = [
    { id: 1, text: "خصم 20% على أول رحلة", subtext: "استخدم كود: FIRST20", bg: "bg-teal-600" },
    { id: 2, text: "اشتراك شهري مميز", subtext: "توفير بـ 100 ل.س", bg: "bg-indigo-600" },
    { id: 3, text: "أكثر توفيراً مع بوصلة", subtext: "أسعار تنافسية دائماً", bg: "bg-yellow-500" },
  ];

  // Fetch Trips
  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data = await fetchTripsApi(1);
      const formattedTrips = data.map((trip: RawTrip) => ({
        id: trip.id || 0,
        from: trip.start_text || "موقع الانطلاق غير محدد",
        to: trip.end_text || "موقع الوصول غير محدد",
        price: trip.cost !== null ? `${trip.cost} ل.س` : "--",
        distance: trip.distance_km ? `${parseFloat(trip.distance_km).toFixed(1)} كم` : "--",
        time: trip.duration_min ? `${trip.duration_min} د` : "--",
        status: trip.status || "غير معروف"
      }));
      setTrips(formattedTrips);
      setLoading(false);
    } catch (err: unknown) {
      setError('حدث خطأ أثناء جلب الرحلات');
      setLoading(false);
      console.error('Error fetching trips:', err);
    }
  };

  // Fetch Services
  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const data = await fetchServicesApi();
      const formattedServices = data.map((service: RawService) => ({
        id: service.id || 0,
        ser_name: service.ser_name || "غير محدد",
        note1: service.note1 || "",
        activ: service.activ || 0,
        pro: service.pro || 0
      }));
      formattedServices.sort((a: Service, b: Service) => a.pro - b.pro);
      setServices(formattedServices);
      setServicesLoading(false);
    } catch (err: unknown) {
      setServicesError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      setServicesLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchTrips();
    fetchServices();
  }, []);

  // Load Active Order from localStorage
  useEffect(() => {
    const storedOrder = localStorage.getItem('active_order');
    if (storedOrder) {
      try {
        const order = JSON.parse(storedOrder);
        setActiveOrder(order);
        setCaptainsNotified(0);

        // Listen for broadcasts (Captain Found & Order Accepted)
        const matchingChannel = supabase.channel('bousla_matching')
          .on('broadcast', { event: 'captain_found' }, (payload) => {
            if (payload.payload.order_id === order.order_id) {
              setCaptainsNotified(prev => prev + 1);
            }
          })
          .on('broadcast', { event: 'order_accepted' }, (payload) => {
            if (payload.payload.order_id === order.order_id) {
              console.log('⚡ Order accepted via broadcast!', payload.payload);
              toast.success(`🎉 تم قبول طلبك بواسطة الكابتن!`);

              const updatedOrder = { ...order, status: 'accepted', captain_id: payload.payload.captain_id };
              setActiveOrder(updatedOrder);
              localStorage.setItem('active_order', JSON.stringify(updatedOrder));

              // Create active trip for customer
              const activeTripData = {
                trip_id: payload.payload.trip_id || order.order_id,
                order_id: order.order_id,
                captain_id: payload.payload.captain_id,
                customer_id: order.user_id,
                status: 'on_way' as const,
                accepted_at: new Date().toISOString(),
                on_way_distance_km: 0,
                on_way_duration_min: 0,
                on_way_billable_km: 0,
                waiting_duration_min: 0,
                waiting_billable_min: 0,
                trip_distance_km: 0,
                trip_duration_min: 0,
                base_cost: parseFloat(order.cost) || 0,
                km_price: parseFloat(order.km_price) || 0,
                min_price: parseFloat(order.min_price) || 0,
                on_way_cost: 0,
                waiting_cost: 0,
                trip_cost: 0,
                total_cost: parseFloat(order.cost) || 0,
                route_points: [],
                captain_name: payload.payload.captain_name,
                captain_phone: payload.payload.captain_phone,
                captain_photo: payload.payload.captain_photo,
                captain_rating: payload.payload.captain_rating,
                last_synced: Date.now(),
                pending_updates: [],
                sync_status: 'synced' as const
              };

              activeTripStorage.saveTrip(activeTripData);
              console.log('🚗 Active trip created for customer');
            }
          })
          .subscribe();

        // Listen for order status updates
        const orderSubscription = supabase
          .channel(`order_status_${order.order_id}`)
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.order_id}` },
            (payload) => {
              const newStatus = payload.new.status;
              if (newStatus === 'accepted' || newStatus === 'cap_accept') {
                toast.success('تم قبول طلبك! الكابتن في الطريق 🚕');
                setActiveOrder(prev => prev ? { ...prev, status: 'accepted' } : null);
                localStorage.setItem('active_order', JSON.stringify({ ...order, status: 'accepted' }));
              } else if (newStatus === 'cancelled') {
                toast.info('تم إلغاء الطلب');
                localStorage.removeItem('active_order');
                setActiveOrder(null);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(matchingChannel);
          supabase.removeChannel(orderSubscription);
        };
      } catch (e) {
        console.error('Error loading active order:', e);
        localStorage.removeItem('active_order');
      }
    }
  }, []);

  // Check for active trip on mount
  useEffect(() => {
    const trip = activeTripStorage.getTrip();
    if (trip && trip.status !== 'completed' && trip.status !== 'cancelled') {
      setShowActiveTripView(true);
      console.log('📱 Active trip found, showing trip view');
    }
  }, []);

  // Subscribe to active_trips channel for real-time updates
  useEffect(() => {
    const userId = parseInt(localStorage.getItem('userId') || '0');
    if (!userId) return;

    console.log('🔌 Subscribing to active_trips channel for user:', userId);

    const channel = supabase.channel('active_trips')
      .on('broadcast', { event: 'trip_created' }, (payload: any) => {
        console.log('📡 Received trip_created event:', payload);

        if (payload.payload.customer_id === userId) {
          console.log('✅ Trip is for this customer, creating local trip');

          // إنشاء رحلة نشطة للزبون
          const tripData = {
            trip_id: payload.payload.trip_id,
            order_id: payload.payload.order_id,
            captain_id: payload.payload.captain_id,
            customer_id: payload.payload.customer_id,
            status: payload.payload.status,
            accepted_at: payload.payload.timestamp,
            on_way_distance_km: 0,
            on_way_duration_min: 0,
            on_way_billable_km: 0,
            waiting_duration_min: 0,
            waiting_billable_min: 0,
            trip_distance_km: 0,
            trip_duration_min: 0,
            base_cost: payload.payload.base_cost,
            km_price: payload.payload.km_price,
            min_price: payload.payload.min_price,
            on_way_cost: 0,
            waiting_cost: 0,
            trip_cost: 0,
            total_cost: payload.payload.base_cost,
            route_points: [],
            captain_name: payload.payload.captain_name,
            captain_phone: payload.payload.captain_phone,
            captain_photo: payload.payload.captain_photo,
            customer_name: '',
            customer_phone: '',
            last_synced: Date.now(),
            pending_updates: [],
            sync_status: 'synced' as const
          };

          activeTripStorage.saveTrip(tripData);
          setShowActiveTripView(true);
          console.log('🚗 Active trip created for customer');

          // إزالة الطلب النشط
          localStorage.removeItem('active_order');
          setActiveOrder(null);
        }
      })
      .on('broadcast', { event: 'status_changed' }, (payload: any) => {
        console.log('📡 Received status_changed event:', payload);

        const trip = activeTripStorage.getTrip();
        if (trip && trip.trip_id === payload.payload.trip_id) {
          activeTripStorage.updateTrip({
            ...trip,
            status: payload.payload.new_status
          });
          console.log('🔄 Trip status updated to:', payload.payload.new_status);
        }
      })
      .on('broadcast', { event: 'location_update' }, (payload: any) => {
        // تحديث الموقع على الخريطة (سيتم تنفيذه لاحقاً)
        console.log('📍 Location update:', payload);
      })
      .on('broadcast', { event: 'billing_update' }, (payload: any) => {
        console.log('💰 Billing update:', payload);

        const trip = activeTripStorage.getTrip();
        if (trip && trip.trip_id === payload.payload.trip_id) {
          activeTripStorage.updateTrip({
            ...trip,
            on_way_distance_km: payload.payload.on_way_distance_km,
            on_way_duration_min: payload.payload.on_way_duration_min,
            waiting_duration_min: payload.payload.waiting_duration_min,
            trip_distance_km: payload.payload.trip_distance_km,
            trip_duration_min: payload.payload.trip_duration_min,
            total_cost: payload.payload.current_cost
          });
        }
      })
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from active_trips channel');
      supabase.removeChannel(channel);
    };
  }, []);


  // Polling Fallback (Check status every 3 seconds for reliability)
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'searching_for_captain') return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, cap_id, status')
        .eq('id', activeOrder.order_id)
        .single();

      if (data && (data.status === 'cap_accept' || data.status === 'accepted') && data.cap_id) {
        console.log('🔄 Polling detected accepted order:', data);

        // منع التحديث المتكرر إذا كانت الحالة محدثة بالفعل
        if (activeOrder.status !== 'accepted') {
          toast.success('تم قبول طلبك! الكابتن في الطريق 🚕');
          const updatedOrder = { ...activeOrder, status: 'accepted', captain_id: data.cap_id };
          setActiveOrder(updatedOrder);
          localStorage.setItem('active_order', JSON.stringify(updatedOrder));
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrder]);

  // Ads Rotator
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, 5000); // Faster rotation
    return () => clearInterval(interval);
  }, [ads.length]);

  // Handle Android Back Button for Menu
  useEffect(() => {
    const handlePopState = () => {
      if (menuOpen) setMenuOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [menuOpen]);

  const openMenu = () => {
    if (!menuOpen) {
      window.history.pushState({ menu: true }, '');
      setMenuOpen(true);
    }
  };

  const closeMenu = () => {
    if (menuOpen) {
      window.history.back();
      // setMenuOpen(false) will happen in popstate
    }
  };

  // Helper for Service Visuals
  const getServiceVisuals = (serviceName: string) => {
    // Uber-like mapping with custom icons/colors if needed
    // Defaulting to a clean look
    if (serviceName.includes('توصيل طلبات')) return { icon: '📦', bg: 'bg-green-50' };
    if (serviceName.includes('نقل ركاب')) return { icon: '🚗', bg: 'bg-blue-50' };
    if (serviceName.includes('أدوية')) return { icon: '💊', bg: 'bg-red-50' };
    if (serviceName.includes('طعام')) return { icon: '🍔', bg: 'bg-orange-50' };
    return { icon: '🚀', bg: 'bg-gray-50' };
  };

  // Navigate to Map
  const handleServiceClick = (serviceId: number) => {
    const serviceData = {
      service_id: serviceId,
      user_id: 1,
      timestamp: Date.now()
    };
    const encryptedData = btoa(JSON.stringify(serviceData));
    localStorage.setItem('service_data', encryptedData);
    window.location.href = '/map';
  };

  const handleGenericMapClick = () => {
    // Just go to map without pre-selection
    window.location.href = '/map';
  }

  // Dummy Loading Services
  const dummyServices = [1, 2, 3, 4];

  return (
    <div className="h-screen bg-white font-sans text-gray-900 overflow-y-auto overflow-x-hidden" dir="rtl">
      <title>بوصلة - الرئيسية</title>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-40 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          {/* We can use an image logo here if available, or just text */}
          <div className="bg-yellow-400 text-black font-black px-2 py-1 rounded text-xl tracking-tighter">B</div>
          <h1 className="text-xl font-bold">بوصلة</h1>
        </div>
        <button onClick={openMenu} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <FaBars size={20} className="text-gray-700" />
        </button>
      </header>

      {/* SIDE MENU */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              ref={menuRef}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Menu Header */}
              <div className="bg-yellow-400 p-6 pt-12 text-black">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl shadow-lg mb-3 mx-auto">
                  <FaUser />
                </div>
                <h2 className="text-xl font-bold text-center">أهلاً بك</h2>
                <p className="text-center opacity-80 text-sm">المستخدم المميز</p>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-1">
                  {[
                    { icon: <FaUser />, label: 'الملف الشخصي' },
                    { icon: <FaWallet />, label: 'المحفظة' },
                    { icon: <FaHistory />, label: 'الرحلات السابقة' },
                    { icon: <FaPercentage />, label: 'العروض' },
                    { icon: <FaPhoneAlt />, label: 'تواصل معنا' },
                    { icon: <FaCog />, label: 'الإعدادات' },
                  ].map((item, idx) => (
                    <li key={idx}>
                      <button className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-700 hover:text-black">
                        <span className="text-gray-400">{item.icon}</span>
                        <span className="font-bold">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="p-4 border-t border-gray-100">
                <button onClick={closeMenu} className="w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200">
                  إغلاق القائمة
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="pt-20 pb-24 px-4 max-w-lg mx-auto md:max-w-xl">

        {/* HERO / ADS SECTION - Styled like a featured banner */}
        <section className="mb-6 relative h-48 rounded-2xl overflow-hidden shadow-lg cursor-pointer group">
          {ads.map((ad, index) => (
            <div
              key={ad.id}
              className={`absolute inset-0 ${ad.bg} flex flex-col items-center justify-center text-white p-6 transition-opacity duration-700
                  ${index === currentAdIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}
                `}
            >
              <h2 className="text-2xl font-black mb-1 text-center drop-shadow-md">{ad.text}</h2>
              <p className="opacity-90 font-medium bg-black/10 px-3 py-1 rounded-full">{ad.subtext}</p>
            </div>
          ))}
          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
            {ads.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentAdIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
        </section>

        {/* SERVICES GRID */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">خدماتنا</h2>
          </div>

          {servicesLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
              {dummyServices.map(i => <div key={i} className="min-w-[100px] h-32 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : servicesError ? (
            <div className="text-red-500 text-center text-sm">{servicesError}</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {services.map(service => {
                const visual = getServiceVisuals(service.ser_name);
                return (
                  <motion.div
                    key={service.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleServiceClick(service.id)}
                    className={`
                                min-w-[110px] h-32
                                flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer transition-all
                                ${visual.bg} hover:shadow-md border border-transparent hover:border-yellow-400
                            `}
                  >
                    <span className="text-4xl mb-3 filter drop-shadow-sm">{visual.icon}</span>
                    <span className="text-xs font-bold text-center leading-tight text-gray-800">{service.ser_name}</span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>

        {/* SAVED PLACES SHORTCUTS */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3">وجهات مفضلة</h2>
          <div className="space-y-2">
            <div onClick={handleGenericMapClick} className="flex items-center gap-4 p-3 bg-white hover:bg-gray-50 rounded-xl border-b border-gray-50 cursor-pointer">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"><FaStar /></div>
              <div>
                <h3 className="font-bold text-sm">الأماكن المحفوظة</h3>
                <p className="text-xs text-gray-400">المنزل، العمل...</p>
              </div>
            </div>
            <div onClick={handleGenericMapClick} className="flex items-center gap-4 p-3 bg-white hover:bg-gray-50 rounded-xl border-b border-gray-50 cursor-pointer">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"><FaHistory /></div>
              <div>
                <h3 className="font-bold text-sm">الشام مول</h3>
                <p className="text-xs text-gray-400">دمشق، كفرسوسة</p>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIVE TRIPS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">نشاطك الحالي</h2>
            <button onClick={() => fetchTrips()} className="text-yellow-600 text-sm font-bold">تحديث</button>
          </div>

          {/* Active Order - Searching for Captain */}
          {activeOrder && activeOrder.status === 'searching_for_captain' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-2xl shadow-lg border-2 border-yellow-400 mb-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                  >
                    <span className="animate-spin">🔍</span>
                    جاري البحث عن كابتن
                  </motion.div>
                </div>
                <span className="font-black text-gray-900 text-lg">{activeOrder.cost} ل.س</span>
              </div>

              <div className="relative border-r-2 border-yellow-400 pr-4 py-1 space-y-3">
                <div className="relative">
                  <div className="absolute -right-[23px] top-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white shadow-md"></div>
                  <h4 className="text-xs text-gray-500 font-bold">من</h4>
                  <p className="font-bold text-sm text-gray-800">{activeOrder.from}</p>
                </div>
                <div className="relative">
                  <div className="absolute -right-[23px] top-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white shadow-md"></div>
                  <h4 className="text-xs text-gray-500 font-bold">إلى</h4>
                  <p className="font-bold text-sm text-gray-800">{activeOrder.to}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-yellow-200 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="font-bold bg-white px-2 py-1 rounded">{activeOrder.service_name}</span>
                  <span>{activeOrder.distance} كم</span>
                  <span>{activeOrder.duration} د</span>
                </div>
              </div>

              {captainsNotified > 0 && (
                <div className="mt-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold text-center">
                  تم إشعار {captainsNotified} كابتن 🚕
                </div>
              )}

              <button
                onClick={() => {
                  if (confirm('هل تريد إلغاء الطلب؟')) {
                    supabase.from('orders')
                      .update({ status: 'cancelled', cancelled_by: 'user' })
                      .eq('id', activeOrder.order_id);
                    localStorage.removeItem('active_order');
                    setActiveOrder(null);
                    toast.info('تم إلغاء الطلب');
                  }
                }}
                className="w-full mt-3 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
              >
                إلغاء الطلب
              </button>
            </motion.div>
          )}

          {/* Accepted Order */}
          {activeOrder && activeOrder.status === 'accepted' && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-lg border-2 border-green-400 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  ✅ تم قبول الطلب
                </div>
                <span className="font-black text-gray-900">{activeOrder.cost} ل.س</span>
              </div>
              <p className="text-sm text-gray-600 text-center">الكابتن في الطريق إليك!</p>
            </div>
          )}

          {/* Previous Trips */}
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">جاري التحميل...</div>
          ) : trips.length > 0 ? (
            <div className="space-y-4">
              {trips.map(trip => (
                <div key={trip.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">
                        {trip.status === 'new_order' ? 'جديد' : trip.status === 'start' ? 'جارية' : trip.status}
                      </div>
                      <span className="text-xs text-gray-400">#{trip.id}</span>
                    </div>
                    <span className="font-black text-gray-900">{trip.price}</span>
                  </div>

                  <div className="relative border-r-2 border-gray-200 pr-4 py-1 space-y-4">
                    <div className="relative">
                      <div className="absolute -right-[23px] top-1 w-3 h-3 bg-black rounded-full ring-2 ring-white"></div>
                      <h4 className="text-xs text-gray-400">من</h4>
                      <p className="font-bold text-sm">{trip.from}</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -right-[23px] top-1 w-3 h-3 bg-yellow-400 rounded-full ring-2 ring-white"></div>
                      <h4 className="text-xs text-gray-400">إلى</h4>
                      <p className="font-bold text-sm">{trip.to}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !activeOrder && (
            <div className="flex flex-col items-center justify-center py-8 opacity-50">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-2">🍃</div>
              <p className="text-sm font-medium">لا توجد رحلات حالياً</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}