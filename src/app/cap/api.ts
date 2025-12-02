// api.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { 
  Order, 
  Service, 
  Payment, 
  LastOrder, 
  ApiResponse, 
  OrderStatusResponse,
  OrderDetails 
} from './types'

// تهيئة Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are not set')
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey)

// دوال CRUD أساسية للطلبات
export const ordersApi = {
  // جلب طلب بواسطة ID
  getById: async (orderId: number): Promise<Order | null> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  },

  // جلب آخر الطلبات للكابتن
  getLastOrders: async (capId: number, limit: number = 10): Promise<LastOrder[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          ser_chi_id,
          start_point,
          end_point,
          start_text,
          end_text,
          accept_time,
          real_km,
          real_min,
          real_price,
          comp_percent,
          start_time,
          end_time,
          discount_id
        `)
        .eq('cap_id', capId)
        .order('insert_time', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching last orders:', error)
      return []
    }
  },

  // تحديث حالة الطلب
  updateStatus: async (
    orderId: number, 
    captainId: number, 
    status: string
  ): Promise<OrderStatusResponse> => {
    try {
      // التحقق من حالة الطلب أولاً
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('cap_id, status')
        .eq('id', orderId)
        .single()

      if (fetchError) throw fetchError

      // إذا كان الطلب مأخوذًا من قبل كابتن آخر
      if (existingOrder.cap_id && existingOrder.cap_id !== captainId) {
        return {
          status: 'goodluck',
          message: 'الطلب مأخوذ مسبقًا من قبل كابتن آخر',
          current_captain_id: existingOrder.cap_id
        }
      }

      // تحديث حالة الطلب
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      }

      // إضافة cap_id فقط إذا كان قبول الطلب
      if (status === 'accepted' || status === 'cap_accept') {
        updateData.cap_id = captainId
        updateData.accept_time = new Date().toISOString()
      }

      // إذا كان الطلب مكتملاً
      if (status === 'completed') {
        updateData.end_time = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      return {
        status: 'success',
        message: 'تم تحديث حالة الطلب بنجاح'
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  // جلب الطلبات المتاحة
  getAvailableOrders: async (): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .is('cap_id', null)
        .eq('status', 'pending')
        .order('insert_time', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching available orders:', error)
      return []
    }
  }
}

// دوال الخدمات
export const servicesApi = {
  // جلب خدمات الكابتن
  getCaptainServices: async (capId: number): Promise<Service[]> => {
    try {
      const { data, error } = await supabase
        .from('cap_ser')
        .select('*')
        .eq('cap_id', capId)
        .order('ser_id', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching captain services:', error)
      return []
    }
  },

  // تحديث حالة الخدمة
  updateStatus: async (
    serviceId: number, 
    active: number, 
    capId: number
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cap_ser')
        .update({ 
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .eq('cap_id', capId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating service status:', error)
      return false
    }
  }
}

// دوال المدفوعات
export const paymentsApi = {
  // جلب مدفوعات الكابتن
  getCaptainPayments: async (capId: number): Promise<Payment[]> => {
    try {
      const { data, error } = await supabase
        .from('cap_payment')
        .select('*')
        .eq('cap_id', capId)
        .order('insert_time', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching payments:', error)
      return []
    }
  },

  // جلب المدفوعات حسب الشهر
  getPaymentsByMonth: async (capId: number, month: string): Promise<Payment[]> => {
    try {
      const { data, error } = await supabase
        .from('cap_payment')
        .select('*')
        .eq('cap_id', capId)
        .like('insert_time', `${month}%`)
        .order('insert_time', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching payments by month:', error)
      return []
    }
  }
}

// دوال الكابتن
export const captainApi = {
  // جلب بيانات الكابتن
  getProfile: async (capId: number): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('captains')
        .select('*')
        .eq('id', capId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching captain profile:', error)
      return null
    }
  },

  // تحديث حالة النشاط
  updateActivity: async (capId: number, active: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('captains')
        .update({ 
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', capId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating captain activity:', error)
      return false
    }
  },

  // تغيير كلمة المرور
  changePassword: async (
    capId: number, 
    currentPassword: string, 
    newPassword: string
  ): Promise<ApiResponse> => {
    try {
      // هنا يمكنك إضافة منطق التحقق من كلمة المرور الحالية وتحديثها
      // هذا يعتمد على كيفية تخزين كلمات المرور في قاعدة البيانات
      
      const { error } = await supabase
        .from('captains')
        .update({ 
          password: newPassword, // تأكد من تشفير كلمة المرور
          updated_at: new Date().toISOString()
        })
        .eq('id', capId)

      if (error) throw error

      return {
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'فشل في تغيير كلمة المرور'
      }
    }
  }
}

// دوال التوافق مع الكود القديم (للتحديث التدريجي)
export const fetchData = async <T = any>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<ApiResponse<T>> => {
  try {
    switch (endpoint) {
      case 'cap_ser':
        const services = await servicesApi.getCaptainServices(params.cap_id)
        return { success: true, data: services as T }
      
      case 'get_cap_payment':
        const payments = await paymentsApi.getCaptainPayments(params.cap_id)
        return { success: true, data: payments as T }
      
      case 'get_lastorder':
        const lastOrders = await ordersApi.getLastOrders(params.cap_id)
        return { success: true, data: lastOrders as T }
      
      default:
        throw new Error(`Endpoint ${endpoint} not implemented`)
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export const fetchOrderById = ordersApi.getById

export const updateOrderStatus = ordersApi.updateStatus

export const updateServiceStatus = servicesApi.updateStatus

export const fetchlast_order = async <T = any>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<ApiResponse<T>> => {
  if (endpoint === 'get_lastorder') {
    const lastOrders = await ordersApi.getLastOrders(params.cap_id)
    return { success: true, data: lastOrders as T }
  }
  
  return { success: false, message: 'Endpoint not found' }
}

export const update_order_status = ordersApi.updateStatus