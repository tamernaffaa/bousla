/**
 * Trip Invoice Modal - Customer Interface
 * 
 * Displays trip invoice with details and captain rating
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheckCircle, FaMapMarkerAlt, FaRoad, FaClock, FaDollarSign } from 'react-icons/fa';
import StarRating from '../../components/StarRating';
import { toast } from 'react-toastify';

interface TripInvoiceModalProps {
    isOpen: boolean;
    tripData: any; // Using any for now to be flexible with payload from Supabase
    onComplete: (captainRating: number) => void;
    onCancel: () => void;
}

export default function CustomerTripInvoiceModal({ isOpen, tripData, onComplete, onCancel }: TripInvoiceModalProps) {
    const [captainRating, setCaptainRating] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-2xl text-white relative">
                            <button
                                onClick={onCancel}
                                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                            >
                                <FaTimes size={24} />
                            </button>

                            <div className="text-center">
                                <FaCheckCircle className="mx-auto mb-3" size={48} />
                                <h2 className="text-2xl font-bold">وصلت بالسلامة!</h2>
                                <p className="text-blue-100 mt-1">فاتورة الرحلة</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Cost Display - Main Focus */}
                            <div className="text-center bg-gray-50 p-6 rounded-2xl border-2 border-blue-100">
                                <p className="text-gray-500 mb-1">المبلغ المطلوب</p>
                                <div className="text-4xl font-bold text-blue-600 mb-2">
                                    {parseFloat(tripData.total_cost || '0').toFixed(0)} <span className="text-xl">ل.س</span>
                                </div>
                                <p className="text-sm text-gray-400">شاملاً كافة الرسوم والضرائب</p>
                            </div>

                            {/* Trip Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl text-center">
                                    <FaRoad className="mx-auto text-blue-600 mb-2" size={20} />
                                    <p className="font-bold text-gray-800">
                                        {tripData.distance_km || '0'} كم
                                    </p>
                                    <p className="text-xs text-gray-500">المسافة</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl text-center">
                                    <FaClock className="mx-auto text-purple-600 mb-2" size={20} />
                                    <p className="font-bold text-gray-800">
                                        {tripData.duration_min || '0'} دقيقة
                                    </p>
                                    <p className="text-xs text-gray-500">الوقت</p>
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

                            {/* Action Buttons */}
                            <button
                                onClick={handleComplete}
                                disabled={isSubmitting || captainRating === 0}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
                            >
                                {isSubmitting ? 'جاري التأكيد...' : 'تأكيد الدفع والتقييم'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
