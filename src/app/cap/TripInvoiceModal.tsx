'use client';

import { useEffect } from 'react';

interface TripInvoiceData {
    trip_id: number;
    order_id: number;
    total_cost: number;
    on_way_distance_km: number;
    on_way_duration_min: number;
    waiting_duration_min: number;
    trip_distance_km: number;
    trip_duration_min: number;
    base_cost: number;
    km_price: number;
    min_price: number;
    accepted_at: string;
    arrived_at?: string;
    started_at?: string;
    completed_at: string;
}

interface TripInvoiceModalProps {
    isOpen: boolean;
    invoiceData: TripInvoiceData | null;
    onClose: () => void;
}

export default function TripInvoiceModal({ isOpen, invoiceData, onClose }: TripInvoiceModalProps) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !invoiceData) return null;

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 1) return `${Math.round(minutes * 60)} ثانية`;
        return `${Math.round(minutes)} دقيقة`;
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">🎉 تمت الرحلة بنجاح</h2>
                            <p className="text-green-100 text-sm mt-1">رحلة #{invoiceData.trip_id}</p>
                        </div>
                        <div className="text-3xl">✅</div>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Total Cost - Highlighted */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 text-center">
                        <p className="text-gray-600 text-sm mb-1">المبلغ الإجمالي</p>
                        <p className="text-4xl font-bold text-green-600">
                            {invoiceData.total_cost.toLocaleString('ar-SY')} ل.س
                        </p>
                    </div>

                    {/* Time Details */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <h3 className="font-semibold text-gray-700 mb-3">⏱️ تفاصيل الوقت</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500">قبول الطلب</p>
                                <p className="font-semibold">{formatTime(invoiceData.accepted_at)}</p>
                            </div>
                            {invoiceData.arrived_at && (
                                <div>
                                    <p className="text-gray-500">الوصول</p>
                                    <p className="font-semibold">{formatTime(invoiceData.arrived_at)}</p>
                                </div>
                            )}
                            {invoiceData.started_at && (
                                <div>
                                    <p className="text-gray-500">بدء الرحلة</p>
                                    <p className="font-semibold">{formatTime(invoiceData.started_at)}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-gray-500">إنهاء الرحلة</p>
                                <p className="font-semibold">{formatTime(invoiceData.completed_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Distance & Duration */}
                    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                        <h3 className="font-semibold text-gray-700 mb-3">📍 المسافة والمدة</h3>

                        {/* On Way */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">مسافة الذهاب للزبون</span>
                            <span className="font-semibold">{invoiceData.on_way_distance_km.toFixed(1)} كم</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">مدة الذهاب</span>
                            <span className="font-semibold">{formatDuration(invoiceData.on_way_duration_min)}</span>
                        </div>

                        {/* Waiting */}
                        {invoiceData.waiting_duration_min > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">مدة الانتظار</span>
                                <span className="font-semibold">{formatDuration(invoiceData.waiting_duration_min)}</span>
                            </div>
                        )}

                        <div className="border-t border-blue-200 my-2"></div>

                        {/* Trip */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">مسافة الرحلة</span>
                            <span className="font-semibold text-blue-600">{invoiceData.trip_distance_km.toFixed(1)} كم</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">مدة الرحلة</span>
                            <span className="font-semibold text-blue-600">{formatDuration(invoiceData.trip_duration_min)}</span>
                        </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-amber-50 rounded-xl p-4 space-y-2">
                        <h3 className="font-semibold text-gray-700 mb-3">💰 تفاصيل التكلفة</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">السعر الأساسي</span>
                                <span className="font-semibold">{invoiceData.base_cost.toLocaleString('ar-SY')} ل.س</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>سعر الكيلومتر</span>
                                <span>{invoiceData.km_price.toLocaleString('ar-SY')} ل.س/كم</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>سعر الدقيقة</span>
                                <span>{invoiceData.min_price.toLocaleString('ar-SY')} ل.س/دقيقة</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Close Button */}
                <div className="p-6 bg-gray-50 border-t">
                    <button
                        onClick={onClose}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
                    >
                        ✓ إغلاق الفاتورة
                    </button>
                </div>
            </div>
        </div>
    );
}
