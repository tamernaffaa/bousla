//PaymentsMenu.tsx
'use client';

import React from 'react';
import { Payment } from '../types';

interface PaymentsMenuProps {
  payments: Payment[];
  availableMonths: string[];
  filterMonth: string | null;
  isRefreshing: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onFilterMonth: (month: string | null) => void;
}

export const PaymentsMenu: React.FC<PaymentsMenuProps> = ({
  payments,
  availableMonths,
  filterMonth,
  isRefreshing,
  onClose,
  onRefresh,
  onFilterMonth
}) => {
  const getPaymentTypeInfo = (type: string) => {
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('withdrawal') || typeLower.includes('سحب')) {
      return {
        text: 'سحب',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        borderColor: 'border-red-100'
      };
    }
    
    if (typeLower.includes('payment') || typeLower.includes('دفع') || typeLower.includes('تسديد')) {
      return {
        text: 'تسديد',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-100'
      };
    }
    
    return {
      text: type,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-100'
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { // تغيير من 'ar-SA' إلى 'en-US' للتاريخ الميلادي
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { // تغيير من 'ar-SA' إلى 'en-US' للتاريخ الميلادي
      month: 'long',
      year: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-SA', {
      maximumFractionDigits: 0
    }).format(num);
  };

  // حساب المجموع: المدفوعات - المسحوبات
  const calculateTotal = () => {
    let total = 0;
    payments.forEach(payment => {
      const typeInfo = getPaymentTypeInfo(payment.type1);
      const amount = parseFloat(payment.mony);
      
      if (typeInfo.text === 'تسديد') {
        total += amount;
      } else if (typeInfo.text === 'سحب') {
        total -= amount;
      }
    });
    return total;
  };

  return (
    <div className="fixed inset-0 z-50" dir="ltr">
      {/* خلفية سوداء شفافة */}
        <div className="absolute left-0 right-0 transition-opacity" style={{top: '4rem', height: 'calc(100vh - 4rem)', backgroundColor: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)'}} onClick={onClose} />
      {/* القائمة الجانبية */}
      <div className="fixed left-0 top-16 w-3/4 max-w-sm bg-white h-[calc(100vh-4rem)] shadow-xl flex flex-col animate-slide-in-left z-50">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1 mr-2"
              title="تحديث البيانات"
            >
              {isRefreshing ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <h2 className="text-xl font-bold">الدفعات المالية</h2>
          </div>
          <button onClick={onClose} className="text-2xl">
            &times;
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Month Filter */}
          <div className="mb-4 flex overflow-x-auto pb-2 space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => onFilterMonth(null)}
              className={`px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                !filterMonth ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
              }`}
            >
              الكل
            </button>
            {availableMonths.map(month => (
              <button
                key={month}
                onClick={() => onFilterMonth(month)}
                className={`px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                  filterMonth === month ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {formatMonth(month)}
              </button>
            ))}
          </div>

          {/* Payments List */}
          <div className="space-y-3">
            {payments.length > 0 ? (
              payments.map(payment => {
                const typeInfo = getPaymentTypeInfo(payment.type1);
                const amount = parseFloat(payment.mony);
                
                return (
                  <div 
                    key={payment.id} 
                    className={`p-3 rounded-lg shadow border ${typeInfo.borderColor} ${typeInfo.bgColor}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeInfo.bgColor} ${typeInfo.textColor}`}>
                        {typeInfo.text}
                      </span>
                      <span className={`font-bold ${typeInfo.textColor}`}>
                        {formatNumber(amount)} ل.س
                      </span>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      {formatDate(payment.insert_time)}
                    </div>
                    
                    {payment.note && (
                      <div className="mt-1 text-sm text-gray-500 truncate">
                        {payment.note}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                {isRefreshing ? 'جاري تحميل البيانات...' : 'لا توجد دفعات مسجلة'}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="font-medium">المجموع:</span>
            <span className="font-bold text-lg">
              {formatNumber(calculateTotal())} ل.س
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};