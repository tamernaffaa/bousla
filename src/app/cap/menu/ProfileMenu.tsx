//ProfileMenu.tsx
'use client';

import React from 'react';
import { Profile } from '../types';
import Image from 'next/image';

interface ProfileMenuProps {
  profile: Profile;
  onClose: () => void;
  onShowServices: () => void;
  onShowPayments: () => void;
  onShowLastOrders: () => void;
  onvertioal_order: () => void;
  onlogout_btn: () => void;
  onShowChangePassword: () => void;

}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  profile,
  onClose,
  onShowServices,
  onShowPayments,
  onShowLastOrders,
  onvertioal_order,
  onlogout_btn,
  onShowChangePassword
}) => {
  // دالة للتحقق من صحة URL الصورة
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  // صورة افتراضية
  const defaultAvatar = '/default-avatar.png';

  // SVG Icons
  const Icons = {
    Edit: () => <svg className="w-6 h-6 text-gray-600 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    Payment: () => <svg className="w-6 h-6 text-gray-600 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    History: () => <svg className="w-6 h-6 text-gray-600 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    List: () => <svg className="w-6 h-6 text-gray-600 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    Lock: () => <svg className="w-6 h-6 text-gray-600 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    Logout: () => <svg className="w-6 h-6 text-red-500 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Close: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    ChevronLeft: () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ direction: 'rtl' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-3/4 max-w-xs bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 pt-12 pb-8">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full overflow-hidden border-2 border-white shadow-md">
              {isValidImageUrl(profile.photo) ? (
                <Image
                  src={profile.photo as string}
                  alt="صورة الكابتن"
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = defaultAvatar;
                    target.onerror = null;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl bg-blue-100 text-blue-600 font-bold">
                  {profile.name?.charAt(0) || 'ك'}
                </div>
              )}
            </div>
            <div className="mr-4">
              <h2 className="text-lg font-bold text-white leading-tight">{profile.name || "اسم الكابتن"}</h2>
              <p className="text-blue-100 text-sm mt-1">{profile.phone || "رقم الهاتف غير متوفر"}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="space-y-1">
            <button onClick={onShowServices} className="w-full flex items-center p-4 hover:bg-gray-50 active:bg-blue-50 transition-colors ripple">
              <Icons.Edit />
              <span className="text-gray-800 text-base font-medium flex-1 text-right mr-3">تعديل خدماتي</span>
              <Icons.ChevronLeft />
            </button>

            <button onClick={onShowPayments} className="w-full flex items-center p-4 hover:bg-gray-50 active:bg-blue-50 transition-colors ripple">
              <Icons.Payment />
              <span className="text-gray-800 text-base font-medium flex-1 text-right mr-3">دفعاتي</span>
              <Icons.ChevronLeft />
            </button>

            <button onClick={onShowLastOrders} className="w-full flex items-center p-4 hover:bg-gray-50 active:bg-blue-50 transition-colors ripple">
              <Icons.History />
              <span className="text-gray-800 text-base font-medium flex-1 text-right mr-3">الطلبات السابقة</span>
              <Icons.ChevronLeft />
            </button>

            <button onClick={onvertioal_order} className="w-full flex items-center p-4 hover:bg-gray-50 active:bg-blue-50 transition-colors ripple">
              <Icons.List />
              <span className="text-gray-800 text-base font-medium flex-1 text-right mr-3">طلب افتراضي</span>
              <Icons.ChevronLeft />
            </button>

            <button onClick={onShowChangePassword} className="w-full flex items-center p-4 hover:bg-gray-50 active:bg-blue-50 transition-colors ripple">
              <Icons.Lock />
              <span className="text-gray-800 text-base font-medium flex-1 text-right mr-3">تغيير كلمة المرور</span>
              <Icons.ChevronLeft />
            </button>

            <hr className="my-2 border-gray-100" />

            <button onClick={onlogout_btn} className="w-full flex items-center p-4 hover:bg-red-50 active:bg-red-100 transition-colors ripple">
              <Icons.Logout />
              <span className="text-red-600 text-base font-medium flex-1 text-right mr-3">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};