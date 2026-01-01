//ProfileMenu.tsx
'use client';

import React, { useState } from 'react';
import { Profile, Service, Payment, LastOrder } from '../types';
import Image from 'next/image';
import { extractMunicipality } from '../mapUtils';
import { FaUser, FaCreditCard, FaHistory, FaGift, FaList, FaLock, FaSignOutAlt, FaChevronRight, FaTimes, FaCar, FaEdit, FaSync, FaBan } from 'react-icons/fa';

interface ProfileMenuProps {
  profile: Profile;
  onClose: () => void;
  // Services Data
  services: Service[];
  isUpdatingService: number | null;
  isRefreshingServices: boolean;
  onRefreshServices: () => void;
  onToggleService: (service: Service) => void;
  // Payments Data
  payments: Payment[];
  availableMonths: string[];
  filterMonth: string | null;
  isRefreshingPayments: boolean;
  onRefreshPayments: () => void;
  onFilterMonth: (month: string | null) => void;
  // Rewards Data
  rewards: any[];
  totalRewards: number;
  isRefreshingRewards: boolean;
  onRefreshRewards: () => void;
  // Last Orders Data
  lastOrders: LastOrder[];
  isRefreshingLastOrders: boolean;
  onRefreshLastOrders: () => void;
  onOrderClick: (orderId: number) => void;
  // Actions
  onvertioal_order: () => void;
  onlogout_btn: () => void;
  onShowChangePassword: () => void;
  onShowRejectedOrders?: () => void;
  rejectedOrdersCount?: number;
}

type MenuView = 'main' | 'services' | 'payments' | 'history' | 'rewards' | 'rating';

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  profile,
  onClose,
  services, isUpdatingService, isRefreshingServices, onRefreshServices, onToggleService,
  payments, availableMonths, filterMonth, isRefreshingPayments, onRefreshPayments, onFilterMonth,
  rewards, totalRewards, isRefreshingRewards, onRefreshRewards,
  lastOrders, isRefreshingLastOrders, onRefreshLastOrders, onOrderClick,
  onvertioal_order,
  onlogout_btn,
  onShowChangePassword,
  onShowRejectedOrders,
  rejectedOrdersCount = 0
}) => {
  const [currentView, setCurrentView] = useState<MenuView>('main');

  // Swipe Close Logic
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isSwipeRight = distance < -minSwipeDistance;
    if (isSwipeRight) onClose();
  };

  // Helper Functions
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch { return false; }
  };
  const defaultAvatar = '/default-avatar.png';

  // --- Sub Views Rendering ---

  const renderServices = () => (
    <div className="space-y-4">
      {services.map(service => (
        <div key={service.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={service.photo1 && service.photo1.trim() !== '' ? service.photo1 : '/logo.png'}
                alt={service.name1}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-right mr-3">
              <h3 className="font-bold text-gray-800">{service.name1}</h3>
              <p className="text-xs text-gray-500 font-bold mt-1 bg-gray-100 px-2 py-0.5 rounded-full inline-block">{service.m_cost} ل.س/دقيقة</p>
            </div>
          </div>
          <button
            onClick={() => onToggleService(service)}
            disabled={isUpdatingService === service.id}
            className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none ${service.active ? 'bg-black' : 'bg-gray-200'} ${isUpdatingService === service.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block w-5 h-5 transform transition-transform bg-white rounded-full shadow-sm ml-1 ${service.active ? 'translate-x-1' : 'translate-x-[22px]'}`} />
            {isUpdatingService === service.id && <span className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div></span>}
          </button>
        </div>
      ))}
    </div>
  );

  const renderRating = () => (
    <div className="space-y-4">
      {/* التقييم الحالي */}
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
        <div className="text-center">
          <div className="text-6xl font-black text-yellow-600 mb-2">
            {profile.rating_avg || '0.00'}
          </div>
          <div className="flex justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-2xl ${star <= Math.round(parseFloat(profile.rating_avg || '0'))
                  ? 'text-yellow-400'
                  : 'text-gray-300'
                  }`}
              >
                ★
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600 font-bold">تقييمك الحالي</p>
          <p className="text-xs text-gray-500 mt-1">
            بناءً على {profile.rating_count || 0} تقييم
          </p>
        </div>
      </div>

      {/* معدل الرفض */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-red-500">🚫</span>
          معدل رفض الطلبات
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">معدل الرفض:</span>
            <span className={`font-bold ${parseFloat(profile.rejection_rate || '0') > 20
              ? 'text-red-600'
              : parseFloat(profile.rejection_rate || '0') > 10
                ? 'text-orange-600'
                : 'text-green-600'
              }`}>
              {profile.rejection_rate || '0.00'}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">إجمالي الرفض:</span>
            <span className="font-bold text-gray-800">
              {profile.total_rejections || 0} طلب
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              💡 كل 10% رفض = -0.1 نقطة من التقييم
            </p>
          </div>
        </div>
      </div>

      {/* نصائح لتحسين التقييم */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <span>💡</span>
          نصائح لتحسين التقييم
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>قبول الطلبات القريبة منك</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>تقليل معدل رفض الطلبات</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>تقديم خدمة ممتازة للعملاء</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>الالتزام بالمواعيد</span>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderPayments = () => {
    const getPaymentTypeInfo = (type: string) => {
      const typeLower = type.toLowerCase();
      if (typeLower.includes('withdrawal') || typeLower.includes('سحب')) return { text: 'سحب', bgColor: 'bg-red-50', textColor: 'text-red-600', borderColor: 'border-red-100', icon: '⬇️' };
      if (typeLower.includes('payment') || typeLower.includes('دفع') || typeLower.includes('تسديد')) return { text: 'تسديد', bgColor: 'bg-green-50', textColor: 'text-green-600', borderColor: 'border-green-100', icon: '⬆️' };
      return { text: type, bgColor: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-100', icon: '📄' };
    };
    const formatNumber = (num: number) => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(num);
    const calculateTotal = () => {
      let total = 0;
      payments.forEach(p => {
        const amount = parseFloat(p.mony);
        const type = getPaymentTypeInfo(p.type1).text;
        if (type === 'تسديد') total += amount;
        else if (type === 'سحب') total -= amount;
      });
      return total;
    };

    return (
      <div className="space-y-4">
        {/* Month Filter */}
        <div className="mb-4 flex overflow-x-auto pb-2 space-x-2 rtl:space-x-reverse no-scrollbar items-center">
          <span className="text-xs font-bold text-gray-400 ml-2">التاريخ:</span>
          <button onClick={() => onFilterMonth(null)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${!filterMonth ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>الكل</button>
          {availableMonths.map(month => (
            <button key={month} onClick={() => onFilterMonth(month)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterMonth === month ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{month}</button>
          ))}
        </div>

        <div className="bg-black text-white p-5 rounded-2xl shadow-lg mb-4 flex justify-between items-center">
          <div>
            <p className="text-yellow-400 text-xs font-bold mb-1">الرصيد الصافي</p>
            <h3 className="text-2xl font-mono font-bold">{formatNumber(calculateTotal())} <span className="text-sm font-sans">ل.س</span></h3>
          </div>
          <div className="h-10 w-10 bg-yellow-400 rounded-full flex items-center justify-center text-black">
            <FaCreditCard />
          </div>
        </div>

        {/* List */}
        {payments.length > 0 ? payments.map(payment => {
          const typeInfo = getPaymentTypeInfo(payment.type1);
          return (
            <div key={payment.id} className="p-4 rounded-xl shadow-sm border border-gray-100 hover:border-black transition-colors bg-white group">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${typeInfo.bgColor}`}>{typeInfo.icon}</span>
                  <span className="font-bold text-gray-800">{typeInfo.text}</span>
                </div>
                <span className={`font-mono font-bold text-lg ${typeInfo.textColor}`}>{formatNumber(parseFloat(payment.mony))}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400 mt-2 px-1">
                <span>{new Date(payment.insert_time).toLocaleDateString('en-US')}</span>
                {payment.note && <span className="max-w-[150px] truncate">{payment.note}</span>}
              </div>
            </div>
          );
        }) : <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2"><div className="text-4xl">📭</div><div>لا توجد حركات مالية</div></div>}
      </div>
    );
  };

  const renderRewards = () => (
    <div className="space-y-5">
      {/* إجمالي المكافآت */}
      <div className="bg-black text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-2">رصيد المكافآت</p>
          <p className="text-4xl font-mono font-bold mb-4">{totalRewards.toFixed(0)} <span className="text-lg">ل.س</span></p>
          <div className="inline-block bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs border border-white/10">
            المكافآت المكتسبة
          </div>
        </div>
      </div>

      <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
        <FaGift className="text-yellow-500" />
        العروض النشطة
      </h3>

      {rewards.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border-dashed border-2 border-gray-200">
          <p className="text-4xl mb-2">🎁</p>
          <p className="text-gray-500 font-bold opacity-70">لا توجد عروض حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rewards.map(reward => (
            <div key={reward.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:border-yellow-400 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-black text-lg text-gray-800 group-hover:text-yellow-600 transition-colors">{reward.name}</h4>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    {reward.description_ar || reward.description}
                  </p>
                </div>
                <span className="bg-black text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap mr-3 shadow-md">
                  +{reward.value}
                </span>
              </div>

              {/* القيود */}
              <div className="flex flex-wrap gap-2 mt-4 text-xs font-bold">
                {reward.zone_ids && reward.zone_ids.length > 0 && (
                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">📍 {reward.zone_ids.length} منطقة</span>
                )}
                {reward.time_start && (
                  <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-md border border-orange-100">⏰ {reward.time_start.slice(0, 5)}</span>
                )}
                <span className="bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100 ml-auto">
                  ينتهي: {new Date(reward.end_date).toLocaleDateString('ar-SA')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-3">
      {lastOrders.length > 0 ? lastOrders.map(order => (
        <div key={order.id} onClick={() => onOrderClick(order.id)} className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-black cursor-pointer transition-all">
          <div className="flex justify-between items-center mb-3">
            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-500">#{order.id}</span>
            <span className="font-mono font-bold text-lg">{order.real_price} ل.س</span>
          </div>
          <div className="space-y-2 relative border-r-2 border-dashed border-gray-200 pr-4 mr-1">
            <div className="absolute -right-[5px] top-1 w-2 h-2 bg-black rounded-full ring-2 ring-white"></div>
            <p className="font-bold text-sm text-gray-800">{extractMunicipality(order.start_text)}</p>

            <div className="absolute -right-[5px] bottom-1 w-2 h-2 bg-yellow-400 rounded-full ring-2 ring-white"></div>
            <p className="font-bold text-sm text-gray-600">{extractMunicipality(order.end_text)}</p>
          </div>
          <div className="flex justify-end mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1 group-hover:text-black transition-colors">
              التفاصيل <FaChevronRight className="text-[10px]" />
            </span>
          </div>
        </div>
      )) : <div className="text-center py-12 text-gray-400">لا توجد طلبات سابقة</div>}
    </div>
  );

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'services': return 'خدماتي';
      case 'payments': return 'المحفظة';
      case 'history': return 'السجل';
      case 'rewards': return 'المكافآت';
      case 'rating': return 'التقييم والأداء';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 font-sans" dir="rtl">
      {/* Black Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Side Menu Panel */}
      <div
        className="fixed top-0 bottom-0 right-0 w-[85%] max-w-sm bg-gray-50 shadow-2xl flex flex-col animate-slide-in-right z-50 rounded-l-3xl overflow-hidden"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="bg-black text-white p-6 pt-10 pb-8 shadow-2xl relative">
          <div className="absolute top-0 left-0 p-4">
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
              <FaTimes />
            </button>
          </div>

          {currentView === 'main' ? (
            <div className="flex flex-col items-center mt-4">
              <div className="w-20 h-20 bg-white rounded-full p-1 mb-4 shadow-lg relative">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white relative">
                  {isValidImageUrl(profile.photo) ? (
                    <Image src={profile.photo as string} alt="Profile" fill className="object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }} />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center"><FaUser className="text-gray-400 text-3xl" /></div>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
              </div>
              <h2 className="text-2xl font-black">{profile.name || "الكابتن"}</h2>
              <p className="text-gray-400 text-sm mt-1">{profile.phone}</p>

              {/* Quick Stats in Header */}
              <div className="flex gap-4 mt-6 w-full justify-center">
                <div className="bg-white/10 rounded-xl px-4 py-2 text-center backdrop-blur-sm flex-1">
                  <div className="text-yellow-400 font-bold text-lg">4.9</div>
                  <div className="text-[10px] text-gray-400">التقييم</div>
                </div>
                <div className="bg-white/10 rounded-xl px-4 py-2 text-center backdrop-blur-sm flex-1">
                  <div className="text-white font-bold text-lg">95%</div>
                  <div className="text-[10px] text-gray-400">القبول</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentView('main')} className="text-white hover:text-yellow-400 transition-colors">
                  <FaChevronRight className="text-xl rotate-180" />
                </button>
                <h2 className="text-2xl font-black">{getHeaderTitle()}</h2>
              </div>
              <div className="bg-white/10 p-2 rounded-full hover:bg-white/20 cursor-pointer transition-colors" onClick={
                currentView === 'services' ? onRefreshServices :
                  currentView === 'payments' ? onRefreshPayments :
                    currentView === 'history' ? onRefreshLastOrders :
                      currentView === 'rewards' ? onRefreshRewards : undefined
              }>
                <FaSync className={`${(isRefreshingServices || isRefreshingPayments || isRefreshingLastOrders || isRefreshingRewards) ? 'animate-spin' : ''}`} />
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 relative">
          {currentView === 'main' && (
            <div className="p-4 space-y-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <MenuButton icon={<FaCar />} label="خدماتي" onClick={() => setCurrentView('services')} />
                <Divider />
                <MenuButton icon={<FaCreditCard />} label="المحفظة" onClick={() => setCurrentView('payments')} />
                <Divider />
                <MenuButton icon={<FaHistory />} label="سجل الرحلات" onClick={() => setCurrentView('history')} />
                <Divider />
                <MenuButton
                  icon={<span className="text-yellow-500">⭐</span>}
                  label="التقييم والأداء"
                  onClick={() => setCurrentView('rating')}
                  extra={profile.rejection_rate && parseFloat(profile.rejection_rate) > 20 ? (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">تحذير</span>
                  ) : undefined}
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
                <MenuButton icon={<FaGift className="text-yellow-500" />} label="المكافآت والعروض" onClick={() => setCurrentView('rewards')} extra={<span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">جديد</span>} />
                <Divider />
                <MenuButton icon={<FaList />} label="طلب افتراضي" onClick={onvertioal_order} />
                {onShowRejectedOrders && (
                  <>
                    <Divider />
                    <MenuButton
                      icon={<FaBan className="text-red-500" />}
                      label="الطلبات المرفوضة"
                      onClick={onShowRejectedOrders}
                      extra={rejectedOrdersCount > 0 ? (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                          {rejectedOrdersCount}
                        </span>
                      ) : undefined}
                    />
                  </>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
                <MenuButton icon={<FaLock />} label="تغيير كلمة المرور" onClick={onShowChangePassword} />
                <Divider />
                <MenuButton icon={<FaSignOutAlt className="text-red-500" />} label="تسجيل الخروج" onClick={onlogout_btn} isDestructive />
              </div>

              <div className="text-center mt-8 pb-8">
                <p className="text-xs text-gray-300 font-bold">الإصدار 2.4.0 (Beta)</p>
              </div>
            </div>
          )}

          {currentView !== 'main' && (
            <div className="p-5 pb-20 animate-fade-in">
              {currentView === 'services' && renderServices()}
              {currentView === 'payments' && renderPayments()}
              {currentView === 'history' && renderHistory()}
              {currentView === 'rewards' && renderRewards()}
              {currentView === 'rating' && renderRating()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MenuButton = ({ icon, label, onClick, isDestructive = false, extra }: any) => (
  <button onClick={onClick} className="w-full flex items-center p-4 hover:bg-yellow-50 active:bg-yellow-100 transition-colors group">
    <span className={`text-xl ml-4 ${isDestructive ? 'text-red-500' : 'text-gray-400 group-hover:text-black'}`}>{icon}</span>
    <span className={`flex-1 text-right font-bold ${isDestructive ? 'text-red-500' : 'text-gray-700'}`}>{label}</span>
    {extra}
    <FaChevronRight className={`text-gray-300 text-sm mr-2 rotate-180 ${isDestructive ? 'hidden' : ''}`} />
  </button>
);

const Divider = () => <div className="h-[1px] bg-gray-50 mx-4" />;
