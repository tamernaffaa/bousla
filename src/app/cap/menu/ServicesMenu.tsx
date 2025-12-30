//ServicesMenu.tsx
'use client';

import React from 'react';
import { Service } from '../types';
import Image from 'next/image';

interface ServicesMenuProps {
  services: Service[];
  isUpdatingService: number | null;
  isRefreshing: boolean; // إضافة خاصية التحديث
  onClose: () => void;
  onRefresh: () => void; // إضافة دالة التحديث
  onToggleService: (service: Service) => void;
}

export const ServicesMenu: React.FC<ServicesMenuProps> = ({
  services,
  isUpdatingService,
  isRefreshing, // إضافة خاصية التحديث
  onClose,
  onRefresh, // إضافة دالة التحديث
  onToggleService
}) => {
  return (
    <div className="fixed inset-0 z-50" dir="ltr">
      {/* خلفية سوداء شفافة */}
      <div className="absolute left-0 right-0 transition-opacity" style={{top: '4rem', height: 'calc(100vh - 4rem)', backgroundColor: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)'}} onClick={onClose} />
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
            <h2 className="text-xl font-bold">الخدمات</h2>
          </div>
          <button onClick={onClose} className="text-2xl">
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {services.map(service => (
              <div key={service.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <Image
                    src={service.photo1 && service.photo1.trim() !== '' ? service.photo1 : '/logo.png'}
                    alt={service.name1}
                    width={48}
                    height={48}
                    className="object-cover rounded-lg"
                  />
                  <div className="text-right">
                    <h3 className="font-medium text-gray-800">{service.name1}</h3>
                    <p className="text-sm text-gray-500">
                      {service.m_cost} ل.س/دقيقة - {service.km} كم
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => onToggleService(service)}
                  disabled={isUpdatingService === service.id}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none
                    ${service.active ? 'bg-green-500' : 'bg-gray-300'}
                    ${isUpdatingService === service.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span
                    className={`inline-block w-5 h-5 transform transition-transform bg-white rounded-full shadow
                      ${service.active ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                  {isUpdatingService === service.id && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};