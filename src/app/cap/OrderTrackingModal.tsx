// OrderTrackingModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { finishTrip } from '../../lib/finishTrip';

export type myorder = {
  id: number;
  ser_chi_id: number;
  start_text: string;
  end_text: string;
  distance_km: string;
  duration_min: number;
  cost: string;
  user_rate: number;
  start_detlis: string;
  end_detlis: string;
  notes: string;
  discount: string;
  km_price: string;
  min_price: string;
  add1: string;
  f_km: string;
};

interface TrackingData {
  distance: string;
  time: string;
  price: string;
}

interface OrderTrackingModalProps {
  order: myorder;
  trackingData?: TrackingData;
  initialStatus?: string;
  onNextStatus: (status: string) => void;
  onCallCustomer: () => void;
  onPokeCustomer: () => void;
  onCallCompany: () => void;
  onCallEmergency: () => void;
   onOpenYandex: () => void;
   onStartRouteTracking: () => void;
  onPauseRouteTracking: () => void;
  onStopRouteTracking: () => void;
}

const STATUS_STEPS = [
  { id: 'arrived', label: 'انا في طريقي' },
  { id: 'waiting', label: 'انا في انتظار الزبون' },
  { id: 'started', label: 'تم بدء الرحلة' },
  { id: 'completed', label: 'انتهت الرحلة' }
];

const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  order,
  trackingData,
  initialStatus = 'arrived',
  onNextStatus,
  onCallCustomer,
  onPokeCustomer,
  onCallCompany,
  onCallEmergency,
  onOpenYandex,
  onStartRouteTracking,
  onPauseRouteTracking,
  onStopRouteTracking
}) => {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [isExpanded, setIsExpanded] = useState(true);
  const [displayData, setDisplayData] = useState({
    distance: order.distance_km,
    time: order.duration_min.toString(),
    price: order.cost
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  // زر إنهاء الرحلة عند المرحلة الأخيرة
  const handleFinishTrip = async () => {
    setIsFinishing(true);
    try {
      await finishTrip({
        tripData: {
          // تحويل order إلى tripData المتوقع (يجب التحقق من الحقول المطلوبة)
          trip_id: order.id,
          order_id: order.id,
          total_cost: Number(order.cost),
          // إضافة أي حقول أخرى مطلوبة منطقياً من order
        },
        customerRating: 5,
        onSuccess: () => {},
        onError: () => {}
      });
    } finally {
      setIsFinishing(false);
    }
  };

  useEffect(() => {
    if (trackingData) {
      setDisplayData({
        distance: trackingData.distance || order.distance_km,
        time: trackingData.time || order.duration_min.toString(),
        price: trackingData.price || order.cost
      });
    }
  }, [trackingData, order]);

 const handleNextStatus = async () => {
  const currentIndex = STATUS_STEPS.findIndex(step => step.id === currentStatus);
  if (currentIndex < STATUS_STEPS.length - 1) {
    const nextStatus = STATUS_STEPS[currentIndex + 1].id;
    setIsUpdating(true);
    
    try {
      await onNextStatus(nextStatus);
      // فقط في حالة النجاح، نحدث الحالة المحلية
      setCurrentStatus(nextStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      // عرض رسالة الخطأ للمستخدم
      
      // لا نحدث الحالة المحلية في حالة الفشل
    } finally {
      setIsUpdating(false);
    }
  }
};

  const getStatusIndex = (statusId: string) => {
    return STATUS_STEPS.findIndex(step => step.id === statusId);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div dir="rtl" className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 border-t border-gray-200 transition-all duration-300">
      {/* زر التصغير/التكبير */}
      <div className="flex justify-center pt-2 pb-1 cursor-pointer" onClick={toggleExpand}>
        <div className="w-10 h-1 bg-red-600 rounded-full"></div>
      </div>

      {/* دوائر عرض بيانات التكلفة */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex justify-around items-center mb-2">
          {/* دائرة المسافة */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-transparent border-2 border-blue-500 rounded-full flex flex-col items-center justify-center text-blue-500 font-bold shadow-md">
              <span className="text-lg">{displayData.distance}</span>
              <span className="text-xs">كم</span>
            </div>
            <span className="text-xs text-gray-600 mt-1">المسافة</span>
          </div>

          {/* دائرة الوقت */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-transparent border-2 border-blue-500 rounded-full flex flex-col items-center justify-center text-blue-500 font-bold shadow-md">
              <span className="text-lg">{displayData.time}</span>
              <span className="text-xs">دقيقة</span>
            </div>
            <span className="text-xs text-gray-600 mt-1">الوقت</span>
          </div>

          {/* دائرة التكلفة */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-16 bg-transparent border-2 border-blue-500 rounded-full flex flex-col items-center justify-center text-blue-500 font-bold shadow-md">
              <span className="text-lg">{displayData.price}</span>
              <span className="text-xs">ل.س</span>
            </div>
            <span className="text-xs text-gray-600 mt-1">التكلفة</span>
          </div>
        </div>
      </div>

    

      {/* المحتوى الإضافي - يظهر فقط في الوضع الممتد */}
      {isExpanded && (
        <>
          {/* معلومات الطلب */}
          <div dir="rtl" className="p-3 bg-blue-50 border-b border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center">
                <span className="text-gray-600 ml-1">:من</span>
                <span className="font-bold truncate max-w-[250px]">{order.start_text}</span>
              </div>

              <div className="flex items-center">
                <span className="text-gray-600 ml-1">:إلى</span>
                <span className="font-bold truncate max-w-[250px]">{order.end_text}</span>
              </div>
            </div>
          </div>

            {/* Status Progress */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex justify-between mb-3 relative">
          {STATUS_STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center z-10 relative" style={{ flex: 1 }}>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  getStatusIndex(currentStatus) >= index 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              <div className="text-xs mt-1 text-center px-1" style={{ maxWidth: '70px' }}>
                {step.label}
              </div>
            </div>
          ))}
          <div className="absolute top-4 left-0 right-0 h-1.5 bg-gray-300 transform translate-y-[-50%]">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ 
                width: `${(getStatusIndex(currentStatus) / (STATUS_STEPS.length - 1)) * 100}%` 
              }}
            ></div>
          </div>
        </div>

        {/* زر التالي الكبير */}
        {getStatusIndex(currentStatus) === STATUS_STEPS.length - 1 ? (
          <button
            onClick={handleFinishTrip}
            disabled={isFinishing}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-base font-semibold shadow-md hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isFinishing ? 'جاري الإنهاء...' : '🏁 إنهاء الرحلة'}
          </button>
        ) : (
          <button
            onClick={handleNextStatus}
            disabled={isUpdating}
            className="w-full h-14 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 text-base font-semibold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            {isUpdating ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري التحديث...
              </div>
            ) : 'الانتقال للمرحلة التالية'}
          </button>
        )}
      </div>

          {/* الأزرار الدائرية */}
          <div className="p-3 flex justify-around items-center">
            <button
              onClick={onCallCustomer}
              className="flex flex-col items-center justify-center"
              title="اتصال بالزبون"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-green-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="text-xs">اتصال بالزبون</span>
            </button>

            <button
              onClick={onPokeCustomer}
              className="flex flex-col items-center justify-center"
              title="نكز الزبون"
            >
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-yellow-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-xs">نكز</span>
            </button>

            <button
              onClick={onCallCompany}
              className="flex flex-col items-center justify-center"
              title="اتصال بالشركة"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-blue-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h2m-2 0h-4m-2 0H9m2 0h2m2 0h2M9 7h2m2 0h2M9 11h2m2 0h2m-2 4h2" />
                </svg>
              </div>
              <span className="text-xs">اتصال بالشركة</span>
            </button>

            <button
              onClick={onCallEmergency}
              className="flex flex-col items-center justify-center"
              title="اتصال طوارئ"
            >
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-red-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-xs">اتصال بالطوارئ</span>
            </button>

<button
  onClick={onOpenYandex}
  className="flex flex-col items-center justify-center"
  title="فتح Yandex"
>
  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-purple-700 transition-colors">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  </div>
  <span className="text-xs">Yandex</span>
</button>

          </div>
        </>
      )}
    </div>
  );
};

export default OrderTrackingModal;