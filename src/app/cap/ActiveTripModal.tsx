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

interface ActiveTripModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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

export default function ActiveTripModal({ isOpen, onClose }: ActiveTripModalProps) {
    const [tripData, setTripData] = useState<ActiveTripData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load trip data
    useEffect(() => {
        if (isOpen) {
            const trip = activeTripStorage.getTrip();
            setTripData(trip);
        }
    }, [isOpen]);

    // Listen for updates from Flutter (location, distance, time)
    useEffect(() => {
        if (!isOpen || !tripData) return;

        // Location updates
        // Location updates
        (window as any).onTripLocationUpdate = (data: { lat: number; lon: number; distance: number }) => {
            if (!tripData) return;

            // Updated: Only handle map path updates here. 
            // Metrics (distance/cost) are now handled by updateTripMetrics in page.tsx 
            // which broadcasts to activeTripStorage.
            activeTripStorage.updateLocation(data.lat, data.lon, undefined, true);

            // Reload local state to refresh UI (map path)
            setTripData(activeTripStorage.getTrip());
        };

        return () => {
            delete (window as any).onTripLocationUpdate;
        };
    }, [isOpen, tripData]);

    // Auto-sync every 10 seconds
    useEffect(() => {
        if (!isOpen || !tripData) return;

        const syncInterval = setInterval(async () => {
            if (navigator.onLine) {
                await activeTripStorage.syncTrip(tripData.trip_id);
                setTripData(activeTripStorage.getTrip());
            }
        }, 10000);

        return () => clearInterval(syncInterval);
    }, [isOpen, tripData]);

    // Duration counter
    useEffect(() => {
        if (!isOpen || !tripData) return;

        const durationInterval = setInterval(() => {
            const now = Date.now();

            if (tripData.status === 'on_way' && tripData.accepted_at) {
                const duration = Math.floor((now - new Date(tripData.accepted_at).getTime()) / 60000);
                activeTripStorage.updateMetrics({ on_way_duration_min: duration }, true);
            } else if (tripData.status === 'waiting' && tripData.arrived_at) {
                const duration = Math.floor((now - new Date(tripData.arrived_at).getTime()) / 60000);
                activeTripStorage.updateMetrics({ waiting_duration_min: duration }, true);
            } else if (tripData.status === 'in_progress' && tripData.started_at) {
                const duration = Math.floor((now - new Date(tripData.started_at).getTime()) / 60000);
                activeTripStorage.updateMetrics({ trip_duration_min: duration }, true);
            }

            setTripData(activeTripStorage.getTrip());
        }, 1000);

        return () => clearInterval(durationInterval);
    }, [isOpen, tripData]);

    const handleStatusChange = async (newStatus: TripStatus) => {
        if (!tripData) return;

        setIsLoading(true);
        try {
            const success = await activeTripStorage.changeStatus(newStatus);

            if (success) {
                toast.success(`تم تحديث الحالة إلى: ${STATUS_LABELS[newStatus]}`);
                const updatedTrip = activeTripStorage.getTrip();
                setTripData(updatedTrip);

                // Broadcast status change to active_trips channel
                try {
                    await supabase.channel('active_trips').send({
                        type: 'broadcast',
                        event: 'status_changed',
                        payload: {
                            trip_id: tripData.trip_id,
                            order_id: tripData.order_id,
                            old_status: tripData.status,
                            new_status: newStatus,
                            timestamp: new Date().toISOString()
                        }
                    });
                    console.log('📡 Broadcasted status_changed event');
                } catch (broadcastError) {
                    console.warn('Failed to broadcast status change:', broadcastError);
                }

                // If completed, close modal
                if (newStatus === 'completed') {
                    setTimeout(() => {
                        activeTripStorage.clearTrip();
                        onClose();
                    }, 2000);
                }
            } else {
                toast.error('فشل تحديث الحالة. سيتم المحاولة عند عودة الاتصال.');
            }
        } catch (error) {
            console.error('Error changing status:', error);
            toast.error('حدث خطأ أثناء تحديث الحالة');
        } finally {
            setIsLoading(false);
        }
    };

    const getNextStatus = (): TripStatus | null => {
        if (!tripData) return null;

        switch (tripData.status) {
            case 'on_way': return 'waiting';
            case 'waiting': return 'in_progress';
            case 'in_progress': return 'completed';
            default: return null;
        }
    };

    const getNextStatusLabel = (): string => {
        const next = getNextStatus();
        if (!next) return '';

        switch (next) {
            case 'waiting': return 'وصلت - في الانتظار';
            case 'in_progress': return 'بدء الرحلة';
            case 'completed': return 'إنهاء الرحلة';
            default: return '';
        }
    };

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!tripData) return null;

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
                        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        dir="rtl"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[tripData.status]} animate-pulse`} />
                                <h2 className="text-xl font-bold">{STATUS_LABELS[tripData.status]}</h2>

                                {/* Connection Status Indicator */}
                                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <span>{isOnline ? 'متصل' : 'غير متصل'}</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                                <FaTimes className="text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">

                            {/* Customer Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <FaUser className="text-gray-600" />
                                    <h3 className="font-bold">معلومات الزبون</h3>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-lg font-semibold">{tripData.customer_name || 'زبون'}</p>
                                    <a href={`tel:${tripData.customer_phone}`} className="flex items-center gap-2 text-blue-600">
                                        <FaPhone className="text-sm" />
                                        <span dir="ltr">{tripData.customer_phone}</span>
                                    </a>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3">

                                {/* Distance */}
                                <div className="bg-blue-50 rounded-xl p-4">
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
                                <div className="bg-yellow-50 rounded-xl p-4">
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
                            <div className="bg-green-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <FaDollarSign className="text-green-600" />
                                    <h3 className="font-bold">الفاتورة</h3>
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
                                        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isLoading ? 'جاري التحديث...' : getNextStatusLabel()}
                                    </button>
                                )}

                                {/* Transfer Button (not in completed/cancelled) */}
                                {!['completed', 'cancelled'].includes(tripData.status) && (
                                    <button
                                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaExchangeAlt />
                                        تحويل الطلب لكابتن آخر
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
