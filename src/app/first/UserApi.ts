// جلب الخدمات الفرعية حسب serviceId
import type { Order } from '../cap/types';
export async function fetchChildServices(serviceId: number) {
  try {
    const { data, error } = await supabase
      .from('ser_chi')
      .select('*')
      .eq('ser_id', serviceId);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('تنسيق البيانات غير صحيح');
    return data;
  } catch (err) {
    throw err;
  }
}
// إرسال الطلب إلى قاعدة بيانات Supabase
export async function submitOrder(orderData: Order) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select();
    if (error) throw error;
    return data && data[0] ? { success: true, order_id: data[0].id } : { success: false };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'خطأ غير معروف' };
  }
}
// UserApi.ts





//first.tsx api
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchTrips(userId: number) {
  try {
   //جلب الرحلات الخاصة بالمستخدم
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('تنسيق البيانات غير صحيح');
    return data;
  } catch (err) {
    throw err;
  }
}

export async function fetchServices() {
  try {
    //جلب الخدمات الاساسية
    const { data, error } = await supabase
      .from('tser')
      .select('*');
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('تنسيق البيانات غير صحيح');
    return data;
  } catch (err) {
    throw err;
  }
}
