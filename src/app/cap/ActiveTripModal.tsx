/**
 * Active Trip Modal - Captain Interface
 * 
 * Displays and manages the active trip for the captain.
 * Works offline with automatic sync.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMapMarkerAlt, FaClock, FaRoad, FaDollarSign, FaUser, FaPhone, FaExchangeAlt } from 'react-icons/fa';
import { activeTripStorage, ActiveTripData, TripStatus } from '../../lib/activeTripStorage';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-toastify';
import TripInvoiceModal from './TripInvoiceModal';
import { finishTrip } from '../../lib/finishTrip';

interface ActiveTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId?: number;
}

// Helper to send messages to Kotlin
const sendToKotlin = (action: string, data: string) => {
    if (typeof window !== 'undefined' && (window as any).Android) {
        try {
            const message = JSON.stringify({ action, data });
            (window as any).Android.postMessage(message);
            console.log(`Sent to Kotlin: ${action}`, data);
        } catch (e) {
            console.error('Failed to send to Kotlin:', e);
        }
    }
};

const STATUS_LABELS: Record<TripStatus, string> = {
    on_way: 'في طريقي للزبون',
    waiting: 'في انتظار الزبون',
    in_progress: 'الرحلة جارية',
    completed: 'مكتملة',
    cancelled: 'ملغاة'
};

const STATUS_COLORS: Record<TripStatus, string> = {
    on_way: 'bg-blue-500',
    waiting: 'bg-yellow-500',
    in_progress: 'bg-green-500',
    completed: 'bg-gray-500',
    cancelled: 'bg-red-500'
};

export default function ActiveTripModal({ isOpen, onClose, orderId }: ActiveTripModalProps) {
    const [tripData, setTripData] = useState<ActiveTripData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null); // Saved invoice data
    const [isExpanded, setIsExpanded] = useState(true);

    // Load trip data from storage
    useEffect(() => {
        if (!isOpen) return;

        const trip = activeTripStorage.getTrip();
        setTripData(trip);

        // Poll for updates every second - BUT STOP when invoice is shown
        const interval = setInterval(() => {
            // Don't update if invoice is showing (to prevent clearing tripData)
            if (showInvoice) return;

            const updatedTrip = activeTripStorage.getTrip();
            setTripData(updatedTrip);
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, showInvoice]);

    // Listen for dynamic updates from Kotlin
    useEffect(() => {
        if (!isOpen || !tripData) return;

        (window as any).updateTripMetrics = (data: any) => {
            console.log('tamer Received metrics data:', data);

            const metrics = {
                on_way_distance_km: parseFloat(data.on_way_distance_km || '0'),
                on_way_duration_min: parseFloat(data.on_way_duration_min || '0'),
                waiting_duration_min: parseFloat(data.waiting_duration_min || '0'),
                trip_distance_km: parseFloat(data.trip_distance_km || '0'),
                trip_duration_min: parseFloat(data.trip_duration_min || '0')
            };

            activeTripStorage.updateMetrics(metrics, true);
            const updatedTrip = activeTripStorage.getTrip();
            if (updatedTrip) {
                setTripData(updatedTrip);
            }
        };

        return () => {
            (window as any).updateTripMetrics = undefined;
        };
    }, [isOpen, tripData]);

    // زر الطي/التوسيع
    const handleToggleExpand = () => setIsExpanded((prev) => !prev);

    // دوال الحالة التالية
    function getNextStatus(): TripStatus | null {
        if (!tripData) return null;
        switch (tripData.status) {
            case 'on_way': return 'waiting';
            case 'waiting': return 'in_progress';
            case 'in_progress': return null; // إنهاء الرحلة
            default: return null;
        }
    }

    function getNextStatusLabel(): string {
        if (!tripData) return '';
        switch (tripData.status) {
            case 'on_way': return 'وصلت للزبون';
            case 'waiting': return 'بدء الرحلة';
            case 'in_progress': return 'إنهاء الرحلة';
            default: return '';
        }
    }

    async function handleStatusChange(nextStatus: TripStatus) {
        if (!tripData) return;
        setIsLoading(true);
        try {
            // تحديث الحالة في activeTripStorage (سيتم الحفظ تلقائياً)
            const success = await activeTripStorage.changeStatus(nextStatus);

            if (success) {
                // تحديث الحالة المحلية فوراً
                setTripData({ ...tripData, status: nextStatus });
                toast.success('تم تحديث حالة الرحلة!');

                // إرسال التحديث إلى Kotlin
                if (orderId) {
                    const message = JSON.stringify({
                        orderId: orderId,
                        status: nextStatus,
                        timestamp: new Date().toISOString()
                    });
                    sendToKotlin("trip_status_update", message);
                }
            } else {
                toast.error('فشل تحديث الحالة');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('حدث خطأ أثناء تحديث الحالة');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCompleteTrip(customerRating?: number) {
        if (!tripData) return;

        // CRITICAL: Save invoice data NOW before localStorage gets cleared
        const savedInvoiceData = {
            trip_id: tripData.trip_id,
            order_id: tripData.order_id,
            total_cost: tripData.total_cost,
            on_way_distance_km: tripData.on_way_distance_km,
            on_way_duration_min: tripData.on_way_duration_min,
            waiting_duration_min: tripData.waiting_duration_min,
            trip_distance_km: tripData.trip_distance_km,
            trip_duration_min: tripData.trip_duration_min,
            base_cost: tripData.base_cost,
            km_price: tripData.km_price,
            min_price: tripData.min_price,
            accepted_at: tripData.accepted_at,
            arrived_at: tripData.arrived_at,
            started_at: tripData.started_at,
            completed_at: new Date().toISOString()
        };

        console.log('💾 Saved invoice data:', savedInvoiceData);
        setInvoiceData(savedInvoiceData);

        setIsLoading(true);
        try {
            await finishTrip({
                tripData,
                customerRating,
                onSuccess: () => {
                    console.log('✅ Trip completion initiated, showing invoice...');
                    setShowInvoice(true);
                    setIsLoading(false);
                },
                onError: () => setIsLoading(false)
            });
        } catch (error) {
            console.error('❌ Error completing trip:', error);
            setIsLoading(false);
        }
    }

    const handleCloseInvoice = () => {
        console.log('📋 Closing invoice and cleaning up...');

        // Clear trip data from localStorage
        activeTripStorage.clearTrip();

        // Hide invoice
        setShowInvoice(false);

        // Clear invoice data
        setInvoiceData(null);

        // Clear tripData to close the modal
        setTripData(null);

        // Close the main modal
        onClose();

        console.log('✅ Invoice closed and trip data cleared');
    };

    if (!tripData) return null;
    return (
        <>
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
                            animate={{ y: isExpanded ? 0 : '80%' }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl ${isExpanded ? 'max-h-[90vh]' : 'max-h-[80px]'} overflow-y-auto border-t-4 border-blue-500`}
                            dir="rtl"
                        >
                            {/* زر الطي/التوسيع */}
                            <div className="flex justify-center pt-2 pb-1 cursor-pointer" onClick={handleToggleExpand}>
                                <div className="w-10 h-1 bg-blue-500 rounded-full"></div>
                            </div>

                            {/* محتوى مختصر عند الطي */}
                            {!isExpanded && (
                                <div className="flex items-center justify-between px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[tripData.status]} animate-pulse`} />
                                        <span className="font-bold text-blue-700">{STATUS_LABELS[tripData.status]}</span>
                                    </div>
                                    <span className="font-semibold text-gray-700">{tripData.customer_name || 'زبون'}</span>
                                </div>
                            )}

                            {/* محتوى البطاقة الكامل عند التوسيع */}
                            {isExpanded && (
                                <div className="p-4 space-y-4">
                                    {/* Customer Info */}
                                    <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <FaUser className="text-blue-600" />
                                            <h3 className="font-bold text-blue-700">معلومات الزبون</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-lg font-semibold text-gray-800">{tripData.customer_name || 'زبون'}</p>
                                            <a href={`tel:${tripData.customer_phone}`} className="flex items-center gap-2 text-blue-600">
                                                <FaPhone className="text-sm" />
                                                <span dir="ltr">{tripData.customer_phone}</span>
                                            </a>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Distance */}
                                        <div className="bg-blue-50 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FaRoad className="text-blue-600" />
                                                <span className="text-sm text-gray-600">المسافة</span>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {tripData.status === 'on_way' && `${tripData.on_way_distance_km.toFixed(1)} كم`}
                                                {tripData.status === 'waiting' && `${tripData.on_way_distance_km.toFixed(1)} كم`}
                                                {tripData.status === 'in_progress' && `${tripData.trip_distance_km.toFixed(1)} كم`}
                                                {tripData.status === 'completed' && `${tripData.trip_distance_km.toFixed(1)} كم`}
                                            </p>
                                        </div>

                                        {/* Duration */}
                                        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FaClock className="text-yellow-600" />
                                                <span className="text-sm text-gray-600">الوقت</span>
                                            </div>
                                            <p className="text-2xl font-bold text-yellow-600">
                                                {tripData.status === 'on_way' && `${tripData.on_way_duration_min} د`}
                                                {tripData.status === 'waiting' && `${tripData.waiting_duration_min} د`}
                                                {tripData.status === 'in_progress' && `${tripData.trip_duration_min} د`}
                                                {tripData.status === 'completed' && `${tripData.trip_duration_min} د`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Billing Breakdown */}
                                    <div className="bg-green-50 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FaDollarSign className="text-green-600" />
                                            <h3 className="font-bold text-green-700">الفاتورة</h3>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">التكلفة الأساسية</span>
                                                <span className="font-semibold">{tripData.base_cost.toFixed(0)} ل.س</span>
                                            </div>
                                            {tripData.on_way_cost > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">تكلفة الطريق ({tripData.on_way_billable_km.toFixed(1)} كم)</span>
                                                    <span className="font-semibold">{tripData.on_way_cost.toFixed(0)} ل.س</span>
                                                </div>
                                            )}
                                            {tripData.waiting_cost > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">تكلفة الانتظار ({tripData.waiting_billable_min} د)</span>
                                                    <span className="font-semibold">{tripData.waiting_cost.toFixed(0)} ل.س</span>
                                                </div>
                                            )}
                                            {tripData.trip_cost > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">تكلفة الرحلة</span>
                                                    <span className="font-semibold">{tripData.trip_cost.toFixed(0)} ل.س</span>
                                                </div>
                                            )}
                                            <div className="border-t border-green-200 pt-2 flex justify-between text-lg">
                                                <span className="font-bold">الإجمالي</span>
                                                <span className="font-bold text-green-600">{tripData.total_cost.toFixed(0)} ل.س</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sync Status */}
                                    {tripData.sync_status === 'pending' && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                                            ⏳ يوجد {tripData.pending_updates.length} تحديث في انتظار المزامنة
                                        </div>
                                    )}
                                    {tripData.sync_status === 'failed' && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                                            ❌ فشلت المزامنة. سيتم إعادة المحاولة تلقائياً.
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                        {getNextStatus() && (
                                            <button
                                                onClick={() => handleStatusChange(getNextStatus()!)}
                                                disabled={isLoading}
                                                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                                            >
                                                {isLoading ? 'جاري التحديث...' : getNextStatusLabel()}
                                            </button>
                                        )}

                                        {/* Complete Trip Button (only in in_progress status) */}
                                        {tripData.status === 'in_progress' && (
                                            <button
                                                onClick={() => handleCompleteTrip(5)}
                                                disabled={isLoading}
                                                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 shadow-md"
                                            >
                                                {isLoading ? 'جاري الإنهاء...' : '🏁 إنهاء الرحلة'}
                                            </button>
                                        )}

                                        {/* Transfer Button (not in completed/cancelled) */}
                                        {!['completed', 'cancelled'].includes(tripData.status) && (
                                            <button
                                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md"
                                            >
                                                <FaExchangeAlt />
                                                تحويل الطلب لكابتن آخر
                                            </button>
                                        )}

                                        {/* Circular Action Buttons */}
                                        <div className="pt-2 flex justify-around items-center">
                                            <button
                                                onClick={() => {
                                                    if (orderId) {
                                                        sendToKotlin("call_customer", orderId.toString());
                                                    }
                                                }}
                                                className="flex flex-col items-center justify-center"
                                                title="اتصال بالزبون"
                                            >
                                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-green-600 transition-colors">
                                                    <FaPhone className="h-6 w-6 text-white" />
                                                </div>
                                                <span className="text-xs">اتصال بالزبون</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (orderId) {
                                                        sendToKotlin("poke_customer", orderId.toString());
                                                        toast.success('تم نكز الزبون!');
                                                    }
                                                }}
                                                className="flex flex-col items-center justify-center"
                                                title="نكز الزبون"
                                            >
                                                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-yellow-600 transition-colors">
                                                    <FaMapMarkerAlt className="h-6 w-6 text-white" />
                                                </div>
                                                <span className="text-xs">نكز</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    sendToKotlin("call_company", "");
                                                }}
                                                className="flex flex-col items-center justify-center"
                                                title="اتصال بالشركة"
                                            >
                                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-blue-600 transition-colors">
                                                    <FaUser className="h-6 w-6 text-white" />
                                                </div>
                                                <span className="text-xs">اتصال بالشركة</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    sendToKotlin("call_emergency", "");
                                                }}
                                                className="flex flex-col items-center justify-center"
                                                title="اتصال طوارئ"
                                            >
                                                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-red-700 transition-colors">
                                                    <FaTimes className="h-6 w-6 text-white" />
                                                </div>
                                                <span className="text-xs">اتصال بالطوارئ</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (tripData?.start_point && tripData?.end_point) {
                                                        const yandexData = {
                                                            start_point: tripData.start_point,
                                                            end_point: tripData.end_point
                                                        };
                                                        sendToKotlin("open_yandex", JSON.stringify(yandexData));
                                                    } else {
                                                        toast.error('لا توجد إحداثيات متاحة لفتح Yandex');
                                                    }
                                                }}
                                                className="flex flex-col items-center justify-center"
                                                title="فتح Yandex"
                                            >
                                                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-1 shadow-md hover:bg-purple-700 transition-colors">
                                                    <FaRoad className="h-6 w-6 text-white" />
                                                </div>
                                                <span className="text-xs">Yandex</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Independent Trip Invoice Modal */}
            <TripInvoiceModal
                isOpen={showInvoice}
                invoiceData={invoiceData}
                onClose={handleCloseInvoice}
            />
        </>
    );
}

