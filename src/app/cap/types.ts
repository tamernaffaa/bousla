// types.ts
export type Position = [number, number];

// أنواع الجداول الرئيسية في Supabase 2026
export interface Order {
  id: number;
  user_id: number;
  caption_id: number | null;
  start_point: string;
  start_text: string;
  end_point: string;
  end_text: string;
  cost: string;
  distance_km: string;
  duration_min: number;
  status: string;
  other_phone: string;
  notes: string;
  ser_id: number;
  startplacetxt: string;
  endplacetxt: string;
  ser_chi_id: number;
  user_rate: number;
  start_detlis: string;
  end_detlis: string;
  insert_time: string;
  updated_at: string;
  discount: string;
  km_price: string;
  min_price: string;
  add1: string;
  f_km: string;
  real_km: string;
  real_min: string;
  real_price: string;
  real_street: string;
  waiting_min: string;
  end_time: string;
  accept_time?: string;
  start_time?: string;
}

export type OrderDetails = Pick<Order,
  'id' | 'ser_chi_id' | 'start_text' | 'end_text' | 'distance_km' |
  'duration_min' | 'cost' | 'user_rate' | 'start_detlis' | 'end_detlis' |
  'notes' | 'discount' | 'km_price' | 'min_price' | 'add1' | 'f_km' |
  'start_time' | 'status' | 'real_km' | 'real_min' | 'real_price' |
  'real_street' | 'waiting_min' | 'end_time' | 'start_point' | 'end_point'
>;

export interface Service {
  id: number;
  cap_id: number;
  ser_id: number;
  name1: string;
  f_km: string;
  km: string;
  m_cost: string;
  add_cost: string;
  dis_cost: string;
  photo1: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  cap_id: number;
  mony: string;
  type1: string;
  center_id: number;
  note: string;
  insert_time: string;
  update_time: string;
  date_formatted: string;
}

export interface Captain {
  id: number;
  name: string;
  phone: string;
  photo: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  name: string;
  phone: string;
  photo: string;
  rating_avg?: string;
  rating_count?: number;
  rejection_rate?: string;
  total_rejections?: number;
  original_rating?: string;
}

export interface TrackingData {
  distance: string;
  time: string;
  price: string;
}

export type LastOrder = Pick<Order,
  'id' | 'ser_chi_id' | 'start_point' | 'end_point' | 'start_text' |
  'end_text' | 'accept_time' | 'real_km' | 'real_min' | 'real_price' |
  'start_time' | 'end_time'
> & {
  discount_id: string;
  comp_percent: string;
};

export interface CaptainData {
  id: number;
  name: string;
  phone: string;
  photo?: string | null;
}

export interface KotlinOrderData {
  id: number;
  ser_chi_id?: number;
  start_text?: string;
  end_text?: string;
  distance_km?: string;
  duration_min?: string | number;
  cost?: string;
  user_rate?: string | number;
  start_detlis?: string;
  end_detlis?: string;
  notes?: string;
  km_price?: string;
  min_price?: string;
  discount?: string;
  add1?: string;
  f_km?: string;
  start_point?: string;
  end_point?: string;
  status?: string;
  start_time?: string;
  real_km: string;
  real_min: string;
  real_price: string;
  real_street: string;
  waiting_min: string;
  end_time: string;
  current_lat?: number;
  current_lng?: number;
  route_points?: Position[];
}

// أنواع الردود من API
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface OrderStatusResponse {
  status: 'success' | 'goodluck' | 'error';
  message?: string;
  current_captain_id?: number;
}

declare global {
  interface Window {
    handleBackButton?: () => boolean;
    handleNewOrder?: (orderId: number) => void;
    onOrderUpdate?: (order: any) => void;
    updateLocation?: (lat: number, lng: number) => void;
    update_cost?: (km: string, min: string, cost: string) => void;
    updateOrderLocation?: (orderId: number, lat: number, lng: number) => void;

    // Additional properties moved from page.tsx
    setCaptainData?: (data: CaptainData) => void;
    handleOpenOrder?: (orderData: KotlinOrderData) => void;
    handleOpenOrderResponse?: (response: string) => void;
    openYandexNavigation?: (startLat: number, startLng: number, endLat: number, endLng: number) => void;
    handleStopTrackingButton?: () => void;
    updateOrderRoute?: (orderId: number, routeData: string) => void;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };

    Android?: {
      receiveMessage: (action: string, message: string) => void;
      postMessage: (message: string) => void;
    }
  }
}