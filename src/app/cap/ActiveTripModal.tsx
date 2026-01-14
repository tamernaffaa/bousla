/**
 * Active Trip Modal - Captain Interface (Redesigned)
 * 
 * Compact, minimizable modal for trip tracking
 * Features: Swipe buttons, collapsible view, mobile-optimized
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaClock, FaRoad, FaDollarSign, FaUser, FaPhone } from 'react-icons/fa';
import { activeTripStorage, ActiveTripData, TripStatus } from '../../lib/activeTripStorage';
import { localOrderStorage } from '../../lib/localOrderStorage';
import { toast } from 'react-toastify';
import { finishTrip } from '../../lib/finishTrip';
import SwipeButton from '../../components/SwipeButton';

interface ActiveTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId?: number;
}

type StatusConfig = {
    label: string;
    color: string;
    icon: string;
    next: TripStatus | null;
};

const STATUS_CONFIG: Record<TripStatus, StatusConfig> = {
    on_way: { label: 'في الطريق إليك', color: 'bg-blue-500', icon: '🚗', next: 'waiting' },
    waiting: { label: 'في انتظارك', color: 'bg-yellow-500', icon: '⏰', next: 'in_progress' },
    in_progress: { label: 'الرحلة جارية', color: 'bg-green-500', icon: '🛣️', next: 'completed' },
    completed: { label: 'مكتملة', color: 'bg-gray-500', icon: '✅', next: null },
    cancelled: { label: 'ملغاة', color: 'bg-red-500', icon: '❌', next: null }
};

export default function ActiveTripModal({ isOpen, onClose }: ActiveTripModalProps) {
    const [tripData, setTripData] = useState<ActiveTripData | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Load and update trip data
    useEffect(() => {
        if (!isOpen) return;

        const updateData = () => {
            const trip = activeTripStorage.getTrip();
            setTripData(trip);
        };

        updateData();
        const interval = setInterval(updateData, 1000);

        // Listen for updates from Flutter
        (window as any).updateTripMetrics = (data: any) => {
            activeTripStorage.updateMetrics({
                on_way_distance_km: parseFloat(data.on_way_distance_km || '0'),
                on_way_duration_min: parseFloat(data.on_way_duration_min || '0'),
                waiting_duration_min: parseFloat(data.waiting_duration_min || '0'),
                trip_distance_km: parseFloat(data.trip_distance_km || '0'),
                trip_duration_min: parseFloat(data.trip_duration_min || '0')
            }, true);
        };

        return () => {
            clearInterval(interval);
            delete (window as any).updateTripMetrics;
        };
    }, [isOpen]);

    const handleStatusChange = async () => {
        if (!tripData) return;

        const currentStatus = tripData.status;
        const nextStatus = STATUS_CONFIG[currentStatus]?.next;

        if (!nextStatus) return;

        setIsLoading(true);

        try {
            if (nextStatus === 'completed') {
                // Save invoice data before completion
                const invoiceData = {
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

                await finishTrip({
                    tripData,
                    customerRating: 5,
                    onSuccess: () => {
                        localOrderStorage.clearActiveOrder();
                        if ((window as any).showTripInvoice) {
                            (window as any).showTripInvoice(invoiceData);
                        }
                        setIsLoading(false);
                    },
                    onError: () => setIsLoading(false)
                });
            } else {
                await activeTripStorage.changeStatus(nextStatus as TripStatus);
                toast.success(`تم التحديث إلى: ${STATUS_CONFIG[nextStatus].label}`);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error changing status:', error);
            toast.error('حدث خطأ أثناء التحديث');
            setIsLoading(false);
        }
    };

    if (!isOpen || !tripData) return null;

    const config = STATUS_CONFIG[tripData.status];
    const currentDistance = tripData.status === 'on_way'
        ? tripData.on_way_distance_km
        : tripData.trip_distance_km;
    const currentDuration = tripData.status === 'on_way'
        ? tripData.on_way_duration_min
        : tripData.trip_duration_min;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl ${isMinimized ? 'h-20' : 'h-[65vh]'
                    }`}
            >
                {/* Minimized View */}
                {isMinimized && (
                    <div
                        onClick={() => setIsMinimized(false)}
                        className="h-full px-4 py-3 flex items-center justify-between cursor-pointer active:bg-gray-50"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 ${config.color} rounded-full flex items-center justify-center text-2xl`}>
                                {config.icon}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{config.label}</p>
                                <p className="text-sm text-gray-500">
                                    {currentDistance.toFixed(1)} كم • {Math.round(currentDuration)} دقيقة
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-lg font-bold text-gray-800">
                                {Math.round(tripData.total_cost || 0).toLocaleString()} ل.س
                            </p>
                            <FaChevronUp className="text-gray-400" />
                        </div>
                    </div>
                )}

                {/* Expanded View */}
                {!isMinimized && (
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <FaChevronDown className="text-gray-600" />
                            </button>
                            <h2 className="text-lg font-bold text-gray-800">متابعة الرحلة</h2>
                            <div className="w-8" /> {/* Spacer */}
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Status Badge */}
                            <div className={`${config.color} text-white p-4 rounded-2xl text-center`}>
                                <p className="text-3xl mb-2">{config.icon}</p>
                                <p className="text-xl font-bold">{config.label}</p>
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 p-3 rounded-xl text-center">
                                    <FaRoad className="mx-auto text-blue-600 mb-1" />
                                    <p className="text-lg font-bold text-gray-800">
                                        {currentDistance.toFixed(1)}
                                    </p>
                                    <p className="text-xs text-gray-500">كم</p>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-xl text-center">
                                    <FaClock className="mx-auto text-purple-600 mb-1" />
                                    <p className="text-lg font-bold text-gray-800">
                                        {Math.round(currentDuration)}
                                    </p>
                                    <p className="text-xs text-gray-500">دقيقة</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl text-center">
                                    <FaDollarSign className="mx-auto text-green-600 mb-1" />
                                    <p className="text-lg font-bold text-gray-800">
                                        {Math.round(tripData.total_cost || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500">ل.س</p>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                <div className="flex items-center gap-2">
                                    <FaUser className="text-gray-600" />
                                    <p className="text-gray-800">معلومات الزبون</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FaPhone />
                                    <p>اضغط للاتصال</p>
                                </div>
                            </div>

                            {/* Locations */}
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500">من</p>
                                        <p className="text-sm text-gray-800">موقع الانطلاق</p>
                                    </div>
                                </div>
                                <div className="border-r-2 border-gray-300 h-4 mr-1"></div>
                                <div className="flex items-start gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500">إلى</p>
                                        <p className="text-sm text-gray-800">الوجهة</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        {config.next && (
                            <div className="p-4 border-t bg-white">
                                <SwipeButton
                                    onSwipeComplete={handleStatusChange}
                                    text={`اسحب للانتقال إلى: ${STATUS_CONFIG[config.next as TripStatus].label}`}
                                    icon="→"
                                    color={STATUS_CONFIG[config.next as TripStatus].color}
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
