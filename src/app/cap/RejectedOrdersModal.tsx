// RejectedOrdersModal.tsx
'use client';

import React from 'react';
import { FaTimes, FaUndo, FaTrash } from 'react-icons/fa';

interface RejectedOrder {
    order_id: number;
    reason: string;
    timestamp: number;
}

interface RejectedOrdersModalProps {
    orders: RejectedOrder[];
    onClose: () => void;
    onReconsider: (orderId: number) => void;
    onPermanentDelete?: (orderId: number) => void;
}

export const RejectedOrdersModal: React.FC<RejectedOrdersModalProps> = ({
    orders,
    onClose,
    onReconsider,
    onPermanentDelete
}) => {
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('ar-SY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getReasonText = (reason: string) => {
        const reasons: { [key: string]: string } = {
            'manual_reject': 'رفض يدوي',
            'too_far': 'بعيد جداً',
            'busy': 'مشغول',
            'not_specified': 'غير محدد'
        };
        return reasons[reason] || reason;
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">الطلبات المرفوضة ({orders.length})</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-5xl">✓</span>
                            </div>
                            <p className="text-lg font-bold">لا توجد طلبات مرفوضة</p>
                            <p className="text-sm mt-2">جميع الطلبات تم قبولها أو لم يتم رفض أي طلب بعد</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {orders.map((order) => (
                                <div
                                    key={order.order_id}
                                    className="p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-lg text-gray-900">
                                                    طلب #{order.order_id}
                                                </span>
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                                    مرفوض
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">السبب:</span>
                                                    <span>{getReasonText(order.reason)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">التاريخ:</span>
                                                    <span className="text-xs">{formatTimestamp(order.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => onReconsider(order.order_id)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-bold text-sm transition-colors"
                                        >
                                            <FaUndo size={14} />
                                            إعادة النظر
                                        </button>
                                        {onPermanentDelete && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('هل تريد حذف هذا الطلب نهائياً من القائمة؟')) {
                                                        onPermanentDelete(order.order_id);
                                                    }
                                                }}
                                                className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-bold text-sm transition-colors"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {orders.length > 0 && (
                    <div className="bg-gray-50 p-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>إجمالي الطلبات المرفوضة: <strong>{orders.length}</strong></span>
                            <button
                                onClick={onClose}
                                className="text-blue-600 hover:text-blue-700 font-bold"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
