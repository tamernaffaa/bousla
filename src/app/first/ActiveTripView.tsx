/**
 * Active Trip View - Customer Interface
 * 
 * Displays the active trip for the customer.
 * Shows captain location, trip progress, and billing.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMapMarkerAlt, FaClock, FaDollarSign, FaUser, FaPhone, FaStar, FaRoad } from 'react-icons/fa';
import { activeTripStorage, ActiveTripData } from '../../lib/activeTripStorage';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface ActiveTripViewProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'modal' | 'embedded';
}

const STATUS_LABELS = {
    on_way: 'الكابتن في الطريق إليك',
    waiting: 'الكابتن في انتظارك',
    in_progress: 'الرحلة جارية',
    completed: 'اكتملت الرحلة',
    cancelled: 'تم إلغاء الرحلة'
};

const STATUS_ICONS = {
    on_way: '🚗',
    waiting: '⏰',
    in_progress: '🛣️',
    completed: '✅',
    cancelled: '❌'
};

export default function ActiveTripView({ isOpen, onClose, mode = 'modal' }: ActiveTripViewProps) {
    const [tripData, setTripData] = useState<ActiveTripData | null>(null);
    const [estimatedArrival, setEstimatedArrival] = useState<number>(0);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

    // Load trip data and poll for updates
    useEffect(() => {
        if (!isOpen) return;

        // Initial load
        const trip = activeTripStorage.getTrip();
        setTripData(trip);

        // Poll for updates every second
        const interval = setInterval(() => {
            const updatedTrip = activeTripStorage.getTrip();
            setTripData(updatedTrip);
            // console.log('tamer tamer 🔄 Refreshed trip data:', updatedTrip?.status);
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen]);

    // Listen for updates from Realtime - IMPROVED VERSION
    useEffect(() => {
        if (!isOpen || !tripData) return;

        console.log(`📡 Setting up realtime channel for trip ${tripData.trip_id}`);

        // Use trip-specific channel (matching captain's broadcast channel)
        const tripChannel = supabase
            .channel(`active_trip_${tripData.trip_id}`)
            .on('broadcast', { event: 'location_update' }, (payload) => {
                console.log('tamer 📍 Location update:', payload.payload);
                const data = payload.payload;
                activeTripStorage.updateLocation(data.lat, data.lng, undefined, true);
                setTripData(activeTripStorage.getTrip());
            })
            .on('broadcast', { event: 'status_update' }, (payload) => {
                console.log('tamer 🔄 Status update:', payload.payload);
                const data = payload.payload;
                activeTripStorage.updateTrip({ status: data.status }, true);
                setTripData(activeTripStorage.getTrip());
                toast.success(`تحديث: ${STATUS_LABELS[data.status as keyof typeof STATUS_LABELS]}`);
            })
            .on('broadcast', { event: 'status_changed' }, (payload) => {
                console.log('tamer 🔄 Status changed:', payload.payload);
                const data = payload.payload;
                activeTripStorage.updateTrip({ status: data.new_status }, true);
                setTripData(activeTripStorage.getTrip());
                toast.success(`تحديث: ${STATUS_LABELS[data.new_status as keyof typeof STATUS_LABELS]}`);
            })
            .on('broadcast', { event: 'metrics_update' }, (payload) => {
                console.log('tamer 💰 Metrics update:', payload.payload);
                const data = payload.payload;
                activeTripStorage.updateMetrics({
                    on_way_distance_km: data.on_way_distance_km,
                    on_way_duration_min: data.on_way_duration_min,
                    waiting_duration_min: data.waiting_duration_min,
                    trip_distance_km: data.trip_distance_km,
                    trip_duration_min: data.trip_duration_min,
                }, true);
                setTripData(activeTripStorage.getTrip());
            })
            .on('broadcast', { event: 'trip_completed' }, (payload) => {
                console.log('tamer ✅ Trip completed:', payload.payload);
                const data = payload.payload;
                toast.success('اكتملت الرحلة!');
                // Show rating modal or completion screen
                setTimeout(() => {
                    activeTripStorage.clearTrip();
                    onClose();
                }, 3000);
            })
            .on('broadcast', { event: 'trip_cancelled' }, (payload) => {
                console.log('tamer ❌ Trip cancelled:', payload.payload);
                toast.error('تم إلغاء الرحلة');
                setTimeout(() => {
                    activeTripStorage.clearTrip();
                    onClose();
                }, 2000);
            })
            .on('broadcast', { event: 'captain_reconnected' }, (payload) => {
                console.log('tamer 🔄 Captain reconnected:', payload.payload);
                toast.success('عاد الكابتن للاتصال');
                setConnectionStatus('connected');
            })
            .subscribe((status) => {
                console.log('tamer Channel status:', status);
                if (status === 'SUBSCRIBED') {
                    setConnectionStatus('connected');
                } else if (status === 'CLOSED') {
                    setConnectionStatus('disconnected');
                }
            });

        // Also listen to database changes as backup
        const dbChannel = supabase
            .channel(`active_trip_db_${tripData.trip_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'active_trips',
                    filter: `id=eq.${tripData.trip_id}`,
                },
                (payload) => {
                    console.log('tamer 💾 Database update:', payload.new);
                    const data = payload.new as any;
                    activeTripStorage.updateTrip({
                        status: data.status,
                        on_way_distance_km: data.on_way_distance_km,
                        on_way_duration_min: data.on_way_duration_min,
                        waiting_duration_min: data.waiting_duration_min,
                        trip_distance_km: data.trip_distance_km,
                        trip_duration_min: data.trip_duration_min,
                        total_cost: data.total_cost,
                    }, true);
                    setTripData(activeTripStorage.getTrip());
                }
            )
            .subscribe();

        return () => {
            console.log('tamer 🔌 Cleaning up realtime channels');
            supabase.removeChannel(tripChannel);
            supabase.removeChannel(dbChannel);
        };
    }, [isOpen, tripData?.trip_id]);

    // Calculate estimated arrival (simple calculation)
    useEffect(() => {
        if (!tripData || tripData.status !== 'on_way') return;

        // Assume average speed of 30 km/h in city
        const avgSpeed = 30;
        const remainingDistance = Math.max(0, 5 - tripData.on_way_distance_km); // Assume 5km total
        const eta = Math.ceil((remainingDistance / avgSpeed) * 60); // in minutes

        setEstimatedArrival(eta);
    }, [tripData]);

    const canCancel = tripData && ['on_way', 'waiting'].includes(tripData.status);

    const handleCancel = async () => {
        if (!tripData || !canCancel) return;

        const confirmed = confirm('هل أنت متأكد من إلغاء الرحلة؟');
        if (!confirmed) return;

        try {
            // Update status to cancelled
            await activeTripStorage.changeStatus('cancelled');

            // Broadcast cancellation
            await supabase.channel('active_trips').send({
                type: 'broadcast',
                event: 'trip_cancelled',
                payload: {
                    trip_id: tripData.trip_id,
                    cancelled_by: 'customer',
                    reason: 'Customer requested cancellation'
                }
            });

            toast.success('تم إلغاء الرحلة');

            setTimeout(() => {
                activeTripStorage.clearTrip();
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Error cancelling trip:', error);
            toast.error('فشل إلغاء الرحلة');
        }
    };

    const handlePokeCaptain = async () => {
        if (!tripData) return;

        try {
            // Send poke notification to captain via Supabase
            await supabase.channel('active_trips').send({
                type: 'broadcast',
                event: 'customer_poke',
                payload: {
                    trip_id: tripData.trip_id,
                    message: 'الزبون يطلب انتباهك'
                }
            });

            toast.success('تم نكز الكابتن!');
        } catch (error) {
            console.error('Error poking captain:', error);
            toast.error('فشل إرسال النكز');
        }
    };

    const handleOpenYandex = () => {
        if (!tripData?.last_location) {
            toast.error('موقع الكابتن غير متاح حالياً');
            return;
        }

        // Try to open Yandex Maps, fallback to Google Maps
        const lat = tripData.last_location.lat;
        const lon = tripData.last_location.lon;

        // Yandex Maps URL
        const yandexUrl = `yandexmaps://maps.yandex.com/?pt=${lon},${lat}&z=16`;

        // Google Maps fallback
        const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

        // Try Yandex first
        window.location.href = yandexUrl;

        // Fallback to Google Maps after a short delay
        setTimeout(() => {
            window.open(googleUrl, '_blank');
        }, 500);
    };

    if (!tripData) return null;

    const Content = (
        <div className={`flex flex-col h-full bg-white ${mode === 'embedded' ? 'rounded-2xl shadow-lg border border-gray-100 overflow-hidden' : 'rounded-t-3xl shadow-2xl overflow-y-auto'}`}>
            {/* Header */}
            <div className={`sticky top-0 p-4 border-b z-10 ${mode === 'embedded' ? 'bg-white' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{STATUS_ICONS[tripData.status]}</span>
                        <h2 className="text-xl font-bold text-gray-800">{STATUS_LABELS[tripData.status]}</h2>
                    </div>
                    {mode === 'modal' && (
                        <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full">
                            <FaTimes className="text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Connection Status Indicator */}
                {connectionStatus !== 'connected' && (
                    <div className={`mb-3 px-3 py-2 rounded-lg flex items-center gap-2 ${connectionStatus === 'connecting'
                        ? 'bg-yellow-100 border border-yellow-300'
                        : 'bg-red-100 border border-red-300'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connecting'
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-red-500'
                            }`} />
                        <span className={`text-sm font-medium ${connectionStatus === 'connecting'
                            ? 'text-yellow-800'
                            : 'text-red-800'
                            }`}>
                            {connectionStatus === 'connecting' ? 'جاري الاتصال...' : 'انقطع الاتصال - جاري إعادة المحاولة...'}
                        </span>
                    </div>
                )}

                {/* ETA for on_way status */}
                {tripData.status === 'on_way' && estimatedArrival > 0 && (
                    <div className={`${mode === 'embedded' ? 'bg-gray-50' : 'bg-white'} rounded-lg p-3 flex items-center justify-between`}>
                        <span className="text-sm text-gray-600">الوصول المتوقع</span>
                        <span className="text-lg font-bold text-green-600">{estimatedArrival} دقيقة</span>
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4 flex-1">
                {/* Captain Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start gap-4">
                        {/* Captain Photo */}
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 shrink-0">
                            {tripData.captain_photo ? (
                                <Image
                                    src={tripData.captain_photo}
                                    alt={tripData.captain_name || 'Captain'}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <FaUser className="text-gray-400 text-2xl" />
                                </div>
                            )}
                        </div>

                        {/* Captain Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold truncate">{tripData.captain_name || 'الكابتن'}</h3>
                                {tripData.captain_rating && (
                                    <div className="flex items-center gap-1 bg-yellow-100 px-2 py-0.5 rounded-full shrink-0">
                                        <FaStar className="text-yellow-500 text-xs" />
                                        <span className="text-sm font-semibold">{tripData.captain_rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                            <a
                                href={`tel:${tripData.captain_phone}`}
                                className="flex items-center gap-2 text-blue-600 text-sm"
                            >
                                <FaPhone className="text-xs" />
                                <span dir="ltr">{tripData.captain_phone}</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Trip Progress (for in_progress status) */}
                {tripData.status === 'in_progress' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <FaMapMarkerAlt className="text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-600">{tripData.trip_distance_km.toFixed(1)}</p>
                            <p className="text-sm text-gray-600">كيلومتر</p>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-4 text-center">
                            <FaClock className="text-yellow-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-yellow-600">{tripData.trip_duration_min}</p>
                            <p className="text-sm text-gray-600">دقيقة</p>
                        </div>
                    </div>
                )}

                {/* Current Cost */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FaDollarSign className="text-green-600" />
                            <span className="text-gray-600">التكلفة الحالية</span>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-green-600">{tripData.total_cost.toFixed(0)}</p>
                            <p className="text-sm text-gray-500">ليرة سورية</p>
                        </div>
                    </div>

                    {/* Cost Breakdown (collapsible) */}
                    {(tripData.on_way_cost > 0 || tripData.waiting_cost > 0 || tripData.trip_cost > 0) && (
                        <details className="mt-3 pt-3 border-t border-green-200">
                            <summary className="text-sm text-gray-600 cursor-pointer">عرض التفاصيل</summary>
                            <div className="mt-2 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>التكلفة الأساسية</span>
                                    <span>{tripData.base_cost.toFixed(0)} ل.س</span>
                                </div>
                                {tripData.on_way_cost > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>تكلفة الطريق</span>
                                        <span>{tripData.on_way_cost.toFixed(0)} ل.س</span>
                                    </div>
                                )}
                                {tripData.waiting_cost > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>تكلفة الانتظار</span>
                                        <span>{tripData.waiting_cost.toFixed(0)} ل.س</span>
                                    </div>
                                )}
                                {tripData.trip_cost > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>تكلفة الرحلة</span>
                                        <span>{tripData.trip_cost.toFixed(0)} ل.س</span>
                                    </div>
                                )}
                            </div>
                        </details>
                    )}
                </div>

                {/* Cancel Button */}
                {canCancel && mode === 'modal' && (
                    <button
                        onClick={handleCancel}
                        className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors border-2 border-red-200"
                    >
                        إلغاء الرحلة
                    </button>
                )}

                {/* Info Messages */}
                {tripData.status === 'on_way' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                        ℹ️ أول {tripData.free_on_way_km ?? 0} كم من طريق الكابتن إليك مجاني
                    </div>
                )}
                {tripData.status === 'waiting' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        ⏰ أول {tripData.free_waiting_min ?? 0} دقائق انتظار مجانية
                    </div>
                )}

                {/* Action Buttons */}
                {!['completed', 'cancelled'].includes(tripData.status) && (
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 text-center">التواصل مع الكابتن</h4>
                        <div className="flex justify-around items-center">
                            {/* Call Captain */}
                            <a
                                href={`tel:${tripData.captain_phone}`}
                                className="flex flex-col items-center justify-center"
                                title="اتصال بالكابتن"
                            >
                                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mb-2 shadow-lg hover:bg-green-600 transition-colors active:scale-95">
                                    <FaPhone className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xs font-semibold text-gray-700">اتصال</span>
                            </a>

                            {/* Poke Captain */}
                            <button
                                onClick={handlePokeCaptain}
                                className="flex flex-col items-center justify-center"
                                title="نكز الكابتن"
                            >
                                <div className="w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center mb-2 shadow-lg hover:bg-yellow-600 transition-colors active:scale-95">
                                    <FaMapMarkerAlt className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xs font-semibold text-gray-700">نكز</span>
                            </button>

                            {/* Open Yandex */}
                            <button
                                onClick={handleOpenYandex}
                                className="flex flex-col items-center justify-center"
                                title="فتح الخريطة"
                            >
                                <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center mb-2 shadow-lg hover:bg-purple-700 transition-colors active:scale-95">
                                    <FaRoad className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xs font-semibold text-gray-700">خريطة</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (mode === 'embedded') {
        return (
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full mb-4"
                    >
                        {Content}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Modal Mode
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh]"
                        dir="rtl"
                    >
                        {Content}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
