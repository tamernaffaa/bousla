//LastOrdersMenu.tsx
'use client';

import React, { useState } from 'react';
import { LastOrder } from '../types';
import { extractMunicipality } from '../mapUtils';

interface LastOrdersMenuProps {
  orders: LastOrder[];
  isRefreshing: boolean; // إضافة خاصية التحديث
  onClose: () => void;
  onRefresh: () => void; // إضافة دالة التحديث
  onOrderClick: (orderId: number) => void;
}

export const LastOrdersMenu: React.FC<LastOrdersMenuProps> = ({
  orders,
  isRefreshing, // إضافة خاصية التحديث
  onClose,
  onRefresh, // إضافة دالة التحديث
  onOrderClick
}) => { 
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'week' | 'month' | 'custom'>('day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.start_time as string);
    
    if (timeFilter === 'all') return true;
    
    if (timeFilter === 'custom') {
      if (!startDate || !endDate) return false;
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // لتشمل نهاية اليوم
      
      return orderDate >= start && orderDate <= end;
    }
    
    const now = new Date();
    
    if (timeFilter === 'day') {
      return orderDate.toDateString() === now.toDateString();
    } else if (timeFilter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return orderDate >= weekStart;
    } else {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en', {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="fixed inset-0 z-50" dir="ltr">
      {/* خلفية سوداء شفافة */}
      <div className="absolute left-0 right-0 transition-opacity" style={{top: '4rem', height: 'calc(100vh - 4rem)', backgroundColor: 'rgba(0,0,0,0.1)'}} onClick={onClose} />
      {/* القائمة الجانبية */}
      <div className="fixed left-0 top-16 w-3/4 max-w-sm bg-white h-[calc(100vh-4rem)] shadow-xl flex flex-col animate-slide-in-left z-50">
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
            <h2 className="text-xl font-bold">الطلبات السابقة</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-2xl"
          >
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap justify-around mb-4 bg-blue-50 p-2 rounded-lg gap-2">
            <button 
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 rounded text-sm ${timeFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-blue-100'}`}
            >
              الكل
            </button>
            <button 
              onClick={() => setTimeFilter('day')}
              className={`px-3 py-1 rounded text-sm ${timeFilter === 'day' ? 'bg-blue-500 text-white' : 'bg-blue-100'}`}
            >
              اليوم
            </button>
            <button 
              onClick={() => setTimeFilter('week')}
              className={`px-3 py-1 rounded text-sm ${timeFilter === 'week' ? 'bg-blue-500 text-white' : 'bg-blue-100'}`}
            >
              الأسبوع
            </button>
            <button 
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1 rounded text-sm ${timeFilter === 'month' ? 'bg-blue-500 text-white' : 'bg-blue-100'}`}
            >
              الشهر
            </button>
            <button 
              onClick={() => setTimeFilter('custom')}
              className={`px-3 py-1 rounded text-sm ${timeFilter === 'custom' ? 'bg-blue-500 text-white' : 'bg-blue-100'}`}
            >
              مخصص
            </button>
          </div>

          {timeFilter === 'custom' && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex flex-col gap-2">
                <div
                  className="fixed left-0 w-full z-40"
                  style={{ top: '4rem', height: 'calc(100vh - 4rem)', backgroundColor: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)' }}
                  onClick={onClose}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">من تاريخ:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  className="bg-white p-3 rounded-lg shadow border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors text-right"
                  onClick={() => onOrderClick(order.id)}
                >
                  <div className="mb-2">
                    <p className="font-medium">من: {extractMunicipality(order.start_text)}</p>
                    <p className="font-medium">إلى: {extractMunicipality(order.end_text)}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center text-sm border-t pt-2">
                    <span className="font-medium">كم</span>
                    <span className="font-medium">دقيقة</span>
                    <span className="font-medium text-blue-500">ل.س</span>
                    <span className="font-medium">عمولة</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1 text-center text-sm border-t pt-2">
                    <span className="font-medium">{order.real_km}</span>
                    <span className="font-medium">{order.real_min}</span>
                    <span className="font-medium text-blue-500">{order.real_price}</span>
                    <span className="font-medium">{order.comp_percent}</span>
                  </div>
                  
                  {order.start_time && (
                    <div className="text-xs text-gray-500 mt-2 text-left">
                      <span>{formatDate(order.start_time as string)}</span>
                      <span className="mx-2">|</span>
                      <span>{formatTime(order.start_time as string)}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {isRefreshing ? 'جاري تحميل البيانات...' : 'لا توجد طلبات في الفترة المحددة'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};