/**
 * Trip Invoice Modal - Captain Interface
 * 
 * Displays trip invoice with details and customer rating
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheckCircle, FaMapMarkerAlt, FaRoad, FaClock, FaDollarSign } from 'react-icons/fa';
import StarRating from '../../components/StarRating';
import { ActiveTripData } from '../../lib/activeTripStorage';
import { toast } from 'react-toastify';

interface TripInvoiceModalProps {
    isOpen: boolean;
    tripData: ActiveTripData;
    onComplete: (customerRating: number) => void;
    onCancel: () => void;
}

export default function TripInvoiceModal({ isOpen, tripData, onComplete, onCancel }: TripInvoiceModalProps) {
    const [customerRating, setCustomerRating] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleComplete = async () => {
        if (customerRating === 0) {
            toast.error('يرجى تقييم الزبون');
            return;
        }

        setIsSubmitting(true);
        try {
            await onComplete(customerRating);
        } catch (error) {
            console.error('Error completing trip:', error);
            toast.error('حدث خطأ أثناء إنهاء الرحلة');
            setIsSubmitting(false);
        }
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
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onCancel}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-2xl text-white relative">
                            <button
                                onClick={onCancel}
                                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                            >
                                <FaTimes size={24} />
                            </button>

                            <div className="text-center">
                                <FaCheckCircle className="mx-auto mb-3" size={48} />
                                <h2 className="text-2xl font-bold">تم إنهاء الرحلة بنجاح!</h2>
                                <p className="text-green-100 mt-1">فاتورة الرحلة</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Trip Details */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <FaMapMarkerAlt className="text-green-600 mt-1" size={20} />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">من</p>
                                        <p className="font-medium">{tripData.customer_name || 'موقع البداية'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <FaMapMarkerAlt className="text-red-600 mt-1" size={20} />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">إلى</p>
                                        <p className="font-medium">الوجهة</p>
                                    </div>
                                </div>
                            </div>

                            {/* Trip Metrics */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                                <div className="text-center">
                                    <FaRoad className="mx-auto text-blue-600 mb-2" size={24} />
                                    <p className="text-2xl font-bold text-gray-800">
                                        {(tripData.on_way_distance_km + tripData.trip_distance_km).toFixed(1)}
                                    </p>
                                    <p className="text-sm text-gray-600">كيلومتر</p>
                                </div>
                                <div className="text-center">
                                    <FaClock className="mx-auto text-purple-600 mb-2" size={24} />
                                    <p className="text-2xl font-bold text-gray-800">
                                        {tripData.on_way_duration_min + tripData.waiting_duration_min + tripData.trip_duration_min}
                                    </p>
                                    <p className="text-sm text-gray-600">دقيقة</p>
                                </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <FaDollarSign className="text-green-600" size={20} />
                                    <h3 className="font-bold text-lg">التفاصيل المالية</h3>
                                </div>

                                <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">التكلفة الأساسية</span>
                                        <span className="font-semibold">{tripData.base_cost.toFixed(0)} ل.س</span>
                                    </div>

                                    {tripData.on_way_cost > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">
                                                تكلفة الطريق ({tripData.on_way_distance_km.toFixed(1)} كم)
                                            </span>
                                            <span className="font-semibold">{tripData.on_way_cost.toFixed(0)} ل.س</span>
                                        </div>
                                    )}

                                    {tripData.waiting_cost > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">
                                                تكلفة الانتظار ({tripData.waiting_duration_min} د)
                                            </span>
                                            <span className="font-semibold">{tripData.waiting_cost.toFixed(0)} ل.س</span>
                                        </div>
                                    )}

                                    {tripData.trip_cost > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">تكلفة الرحلة</span>
                                            <span className="font-semibold">{tripData.trip_cost.toFixed(0)} ل.س</span>
                                        </div>
                                    )}

                                    <div className="border-t border-gray-300 pt-2 mt-2">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>الإجمالي</span>
                                            <span className="text-green-600">{tripData.total_cost.toFixed(0)} ل.س</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Rating */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-lg text-center">قيّم الزبون</h3>
                                <div className="flex justify-center">
                                    <StarRating
                                        rating={customerRating}
                                        onRatingChange={setCustomerRating}
                                        size={40}
                                    />
                                </div>
                                <p className="text-center text-sm text-gray-600">
                                    {customerRating === 0 && 'اضغط على النجوم للتقييم'}
                                    {customerRating === 1 && 'سيء جداً'}
                                    {customerRating === 2 && 'سيء'}
                                    {customerRating === 3 && 'مقبول'}
                                    {customerRating === 4 && 'جيد'}
                                    {customerRating === 5 && 'ممتاز'}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onCancel}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={isSubmitting || customerRating === 0}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all"
                                >
                                    {isSubmitting ? 'جاري الإنهاء...' : 'إنهاء وتأكيد'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
