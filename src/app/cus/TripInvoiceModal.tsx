/**
 * Trip Invoice Modal - Customer Interface
 * 
 * Displays trip invoice with complete details and captain rating
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheckCircle, FaMapMarkerAlt, FaRoad, FaClock, FaDollarSign } from 'react-icons/fa';
import StarRating from '../../components/StarRating';
import { toast } from 'react-toastify';
import { activeTripStorage } from '../../lib/activeTripStorage';

interface TripInvoiceModalProps {
    isOpen: boolean;
    tripData: any;
    onComplete: (captainRating: number) => void;
    onCancel: () => void;
}

export default function CustomerTripInvoiceModal({ isOpen, tripData, onComplete, onCancel }: TripInvoiceModalProps) {
    const [captainRating, setCaptainRating] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fullTripData, setFullTripData] = useState<any>(null);

    // Load complete trip data from activeTripStorage
    useEffect(() => {
        if (isOpen && tripData) {
            const storedTrip = activeTripStorage.getTrip();
            if (storedTrip) {
                // Merge broadcast data with stored data
                setFullTripData({
                    ...storedTrip,
                    ...tripData
                });
                console.log('📋 Full trip data for invoice:', storedTrip);
            } else {
                // Fallback to broadcast data only
                setFullTripData(tripData);
            }
        }
    }, [isOpen, tripData]);

    const handleComplete = async () => {
        if (captainRating === 0) {
            toast.error('يرجى تقييم الكابتن');
            return;
        }

        setIsSubmitting(true);
        try {
            await onComplete(captainRating);
        } catch (error) {
            console.error('Error confirming payment:', error);
            toast.error('حدث خطأ أثناء تأكيد الدفع');
            setIsSubmitting(false);
        }
    };

    if (!fullTripData) return null;

    const formatTime = (isoString?: string) => {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
        return date.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 1) return `${Math.round(minutes * 60)} ثانية`;
        return `${Math.round(minutes)} دقيقة`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl z-[9999] max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-2xl text-white relative">
                            <div className="text-center">
                                <FaCheckCircle className="mx-auto mb-3" size={48} />
                                <h2 className="text-2xl font-bold">وصلت بالسلامة! 🎉</h2>
                                <p className="text-green-100 mt-1">فاتورة الرحلة</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Total Cost - Highlighted */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 text-center">
                                <p className="text-gray-600 text-sm mb-1">المبلغ الإجمالي</p>
                                <p className="text-4xl font-bold text-green-600">
                                    {(fullTripData.total_cost || 0).toLocaleString('ar-SY')} ل.س
                                </p>
                            </div>

                            {/* Time Details */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <h3 className="font-semibold text-gray-700 mb-3">⏱️ تفاصيل الوقت</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-gray-500">قبول الطلب</p>
                                        <p className="font-semibold">{formatTime(fullTripData.accepted_at)}</p>
                                    </div>
                                    {fullTripData.arrived_at && (
                                        <div>
                                            <p className="text-gray-500">الوصول</p>
                                            <p className="font-semibold">{formatTime(fullTripData.arrived_at)}</p>
                                        </div>
                                    )}
                                    {fullTripData.started_at && (
                                        <div>
                                            <p className="text-gray-500">بدء الرحلة</p>
                                            <p className="font-semibold">{formatTime(fullTripData.started_at)}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-gray-500">إنهاء الرحلة</p>
                                        <p className="font-semibold">{formatTime(fullTripData.completed_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Distance & Duration */}
                            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                                <h3 className="font-semibold text-gray-700 mb-3">📍 المسافة والمدة</h3>

                                {/* On Way */}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">مسافة الذهاب للزبون</span>
                                    <span className="font-semibold">{(fullTripData.on_way_distance_km || 0).toFixed(2)} كم</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">مدة الذهاب</span>
                                    <span className="font-semibold">{formatDuration(fullTripData.on_way_duration_min || 0)}</span>
                                </div>

                                {/* Waiting */}
                                {(fullTripData.waiting_duration_min || 0) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">مدة الانتظار</span>
                                        <span className="font-semibold">{formatDuration(fullTripData.waiting_duration_min)}</span>
                                    </div>
                                )}

                                <div className="border-t border-blue-200 my-2"></div>

                                {/* Trip */}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">مسافة الرحلة</span>
                                    <span className="font-semibold text-blue-600">{(fullTripData.trip_distance_km || 0).toFixed(2)} كم</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">مدة الرحلة</span>
                                    <span className="font-semibold text-blue-600">{formatDuration(fullTripData.trip_duration_min || 0)}</span>
                                </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="bg-amber-50 rounded-xl p-4 space-y-2">
                                <h3 className="font-semibold text-gray-700 mb-3">💰 تفاصيل التكلفة</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">السعر الأساسي</span>
                                        <span className="font-semibold">{(fullTripData.base_cost || 0).toLocaleString('ar-SY')} ل.س</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>سعر الكيلومتر</span>
                                        <span>{(fullTripData.km_price || 0).toLocaleString('ar-SY')} ل.س/كم</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>سعر الدقيقة</span>
                                        <span>{(fullTripData.min_price || 0).toLocaleString('ar-SY')} ل.س/دقيقة</span>
                                    </div>
                                </div>
                            </div>

                            {/* Captain Rating */}
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <h3 className="font-bold text-lg text-center">كيف كانت رحلتك مع الكابتن؟</h3>
                                <div className="flex justify-center">
                                    <StarRating
                                        rating={captainRating}
                                        onRatingChange={setCaptainRating}
                                        size={40}
                                    />
                                </div>
                                <p className="text-center text-sm text-gray-600">
                                    {captainRating === 0 && 'اضغط على النجوم للتقييم'}
                                    {captainRating === 1 && 'سيئة جداً'}
                                    {captainRating === 2 && 'سيئة'}
                                    {captainRating === 3 && 'مقبولة'}
                                    {captainRating === 4 && 'جيدة'}
                                    {captainRating === 5 && 'ممتازة'}
                                </p>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleComplete}
                                disabled={isSubmitting || captainRating === 0}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl active:scale-95"
                            >
                                {isSubmitting ? 'جاري التأكيد...' : '✓ تأكيد الدفع والتقييم'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
