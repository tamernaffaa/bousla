//first.tsx

'use client';

import { useState, useEffect, useRef } from "react";
import { FiMenu, FiX, FiArrowLeft } from "react-icons/fi";
import { fetchTrips as fetchTripsApi, fetchServices as fetchServicesApi } from "./UserApi";
import "../cap/native-styles.css";

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
  pro: number; //حقل ترتيب العرض
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
  const [loadingDots, setLoadingDots] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // بيانات الإعلانات
  const ads = [
    { id: 1, text: "خصم 20% على أول رحلة", bg: "bg-gradient-to-r from-yellow-400 to-orange-400" },
    { id: 2, text: "اشتراك شهري بـ 100 ل.س فقط", bg: "bg-gradient-to-r from-blue-400 to-purple-400" },
    { id: 3, text: "عروض خاصة للعملاء الدائمين", bg: "bg-gradient-to-r from-green-400 to-teal-400" },
  ];

  // تأثير النقاط المتحركة
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // دالة جلب الرحلات من Supabase
  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data = await fetchTripsApi(1);
      const formattedTrips = data.map((trip: RawTrip) => ({
        id: trip.id || 0,
        from: trip.start_text || "موقع الانطلاق غير محدد",
        to: trip.end_text || "موقع الوصول غير محدد",
        price: trip.cost !== null ? `قيمة الطلب: ${trip.cost} ل.س` : "يتم حساب السعر",
        distance: trip.distance_km ? `${parseFloat(trip.distance_km).toFixed(1)} كم` : "المسافة غير محددة",
        time: trip.duration_min ? `${trip.duration_min} دقائق` : "الوقت غير محدد",
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

  // دالة جلب الخدمات من Supabase
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
      setServicesError(
        err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
      );
      setServicesLoading(false);
      console.error('Error details:', err);
    }
  };

  // التحميل الأولي
  useEffect(() => {
    fetchTrips();
    fetchServices();
  }, []); // [] لضمان تنفيذ الدالة مرة واحدة فقط

  // تبديل الإعلانات تلقائياً
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [ads.length]);

  // منع نسخ النصوص
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("نسخ النصوص غير مسموح به");
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // تبديل حالة القائمة
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // اختيار الأيقونة واللون بناءً على نوع الخدمة
  const getServiceIconAndColor = (serviceName: string) => {
    switch (serviceName) {
      case 'نقل ركاب':
        return { icon: '🚗', color: 'bg-blue-100' };
      case 'توصيل طلبات':
        return { icon: '🏍', color: 'bg-green-100' };
      case 'توصيل بضائع':
        return { icon: '📦', color: 'bg-orange-100' };
      case 'توصيل أدوية':
        return { icon: '💊', color: 'bg-red-100' };
      case 'توصيل طعام':
        return { icon: '🍔', color: 'bg-green-100' };
      default:
        return { icon: '🚀', color: 'bg-gray-100' };
    }
  };

  // فتح الخريطة في صفحة جديدة
  const handleServiceClick = (serviceId: number) => {
    // إنشاء كائن يحتوي البيانات
    const serviceData = {
      service_id: serviceId,
      user_id: 1, // أو أي قيمة user_id
      timestamp: Date.now() // لإضافة طبقة أمان إضافية
    };

    // تخزين البيانات مشفرة
    const encryptedData = btoa(JSON.stringify(serviceData));
    localStorage.setItem('service_data', encryptedData);

    // الانتقال إلى صفحة الخريطة بدون معلمات
    window.location.href = '/map';
  };

  // بيانات وهمية للخدمات أثناء التحميل
  const dummyServices = [
    { id: 1, ser_name: '...', color: 'bg-gray-200' },
    { id: 2, ser_name: '...', color: 'bg-gray-200' },
    { id: 3, ser_name: '...', color: 'bg-gray-200' },
    { id: 4, ser_name: '...', color: 'bg-gray-200' },
    { id: 5, ser_name: '...', color: 'bg-gray-200' }
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <title>بوصلة - تطبيق نقل الركاب</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

      {/* شريط العنوان */}
      <header className="bg-yellow-400 p-4 shadow-md sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">بوصلة</h1>
          <button
            onClick={toggleMenu}
            className="text-gray-800 p-1"
            aria-label="فتح القائمة"
          >
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </header>

      {/* القائمة الجانبية */}
      <div
        ref={menuRef}
        className={`fixed top-16 left-0 z-50 h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out ${menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
          }`}
      >
        <div className="w-64 h-full bg-white shadow-xl" dir="ltr">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <button onClick={() => setMenuOpen(false)}>
              <FiX size={20} />
            </button>
            <h2 className="font-bold">القائمة</h2>
          </div>
          <nav className="p-4 h-[calc(100%-3.5rem)] overflow-y-auto">
            <ul className="space-y-4">
              <li className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                <span>الملف الشخصي</span>
                <FiArrowLeft />
              </li>
              <li className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                <span>المحفظة</span>
                <FiArrowLeft />
              </li>
              <li className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                <span>الرحلات السابقة</span>
                <FiArrowLeft />
              </li>
              <li className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                <span>عروض واكواد حسم</span>
                <FiArrowLeft />
              </li>
              <li className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                <span>تواصل معنا</span>
                <FiArrowLeft />
              </li>
              <li className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                <span>الإعدادات</span>
                <FiArrowLeft />
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <main className="p-4 pb-20" dir="rtl">

        {/* قسم الخدمات المعدل */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-700">خدماتنا</h2>
          {servicesLoading ? (
            <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-4 px-2" dir="rtl">
              {dummyServices.map((service) => (
                <div
                  key={service.id}
                  className={`
                    flex-shrink-0 
                    ${service.color} 
                    p-4 
                    rounded-xl 
                    w-28 
                    h-32
                    flex 
                    flex-col 
                    items-center 
                    justify-center
                    border-2 
                    border-white
                    shadow-[0_5px_15px_rgba(0,0,0,0.15)]
                    relative
                    overflow-hidden
                    animate-pulse
                  `}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-300 mb-3"></div>
                  <div className="w-20 h-4 rounded bg-gray-300"></div>
                </div>
              ))}
            </div>
          ) : servicesError ? (
            <div className="text-center text-red-500 py-4">{servicesError}</div>
          ) : services.length > 0 ? (
            <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-4 px-2" dir="rtl">
              {services
                .sort((a, b) => a.pro - b.pro)
                .map((service) => {
                  const { icon, color } = getServiceIconAndColor(service.ser_name);
                  return (
                    <div
                      key={service.id}
                      onClick={() => handleServiceClick(service.id)}
                      className={`
                        flex-shrink-0 
                        ${color} 
                        p-4 
                        rounded-xl 
                        w-28 
                        h-32
                        flex 
                        flex-col 
                        items-center 
                        justify-center
                        border-2 
                        border-white
                        shadow-[0_5px_15px_rgba(0,0,0,0.15)]
                        transform
                        transition-all
                        duration-300
                        ease-in-out
                        hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)]
                        hover:-translate-y-1
                        active:translate-y-0
                        active:shadow-[0_5px_15px_rgba(0,0,0,0.15)]
                        relative
                        overflow-hidden
                        before:content-['']
                        before:absolute
                        before:inset-0
                        before:bg-gradient-to-br
                        before:from-white/20
                        before:to-transparent
                        before:pointer-events-none
                        cursor-pointer
                      `}
                      style={{
                        userSelect: 'none',
                      }}
                    >
                      {/* تأثير ثلاثي الأبعاد */}
                      <div className="absolute inset-0 rounded-xl border-t-2 border-l-2 border-white/30 pointer-events-none"></div>

                      <span
                        className="text-3xl mb-2 z-10"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      >
                        {icon}
                      </span>

                      <span
                        className="text-sm font-bold text-center z-10 px-1"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                      >
                        {service.ser_name}
                      </span>

                      {/* تأثير الضوء */}
                      <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full filter blur-sm"></div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-4">لا توجد خدمات متاحة حالياً</div>
          )}
        </section>

        {/* قسم الرحلات الجارية */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-700">
              الرحلات الجارية{Array(loadingDots).fill('.').join('')}
            </h2>
            <button
              onClick={() => fetchTrips()}
              className="text-yellow-600 text-sm hover:text-yellow-700 active:scale-95 transition-transform"
              disabled={loading}
            >
              {loading ? 'جاري التحديث...' : 'تحديث'}
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4">جاري تحميل الرحلات...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-4">{error}</div>
            ) : trips.length > 0 ? (
              trips.map((trip) => (
                <div key={trip.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">من: {trip.from}</span>
                    <span className="text-yellow-600 font-bold">{trip.price}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">إلى: {trip.to}</span>
                    <span className="text-gray-500">{trip.time}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">المسافة: {trip.distance}</span>
                    <span className="text-red-500">
                      حالة الرحلة: {
                        trip.status === 'new_order' ? 'بإنتظار الكابتن' :
                          trip.status === 'start' ? 'قيد التنفيذ' :
                            trip.status === 'pending' ? 'قيد الانتظار' :
                              trip.status === 'end' ? 'منتهية' :
                                trip.status
                      }
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">لا توجد رحلات جارية حالياً</div>
            )}
          </div>
        </section>

        {/* قسم الإعلانات */}
        <section>
          <h2 className="text-lg font-bold mb-3 text-gray-700">العروض</h2>
          <div className="relative h-40 overflow-hidden rounded-xl">
            {ads.map((ad, index) => (
              <div
                key={ad.id}
                className={`absolute top-0 left-0 w-full h-full ${ad.bg} flex items-center justify-center text-white font-bold text-xl
                  transition-opacity duration-500 ease-in-out
                  ${index === currentAdIndex ? 'opacity-100' : 'opacity-0'}`}
                style={{ userSelect: 'none' }}
              >
                {ad.text}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}