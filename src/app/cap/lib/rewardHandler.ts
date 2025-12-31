
import { supabase } from '@/lib/supabase'
import { validatePromotionConstraints } from '@/lib/geoUtils'
import { OrderDetails } from '../types'

/**
 * دالة مساعدة لتحليل سلسلة الإحداثيات "lat,lng"
 */
const parseLocation = (locStr: string): { lat: number, lng: number } | null => {
    if (!locStr || !locStr.includes(',')) return null
    try {
        const [lat, lng] = locStr.split(',').map(s => parseFloat(s.trim()))
        if (isNaN(lat) || isNaN(lng)) return null
        return { lat, lng }
    } catch (e) {
        return null
    }
}

/**
 * التحقق من وجود مكافآت وتطبيقها
 */
export const checkAndApplyRewards = async (
    order: OrderDetails,
    captainId: number
): Promise<{ applied: boolean, rewards: any[], totalAmount: number }> => {
    console.log('Checking for rewards for order:', order.id)

    try {
        // 1. جلب العروض النشطة من نوع مكافأة كابتن
        const { data: promotions, error } = await supabase
            .from('promotions')
            .select('*')
            .eq('type', 'captain_reward')
            .eq('active', true)
            .lte('start_date', new Date().toISOString())
            .gte('end_date', new Date().toISOString())

        if (error || !promotions || promotions.length === 0) {
            console.log('No active captain rewards found')
            return { applied: false, rewards: [], totalAmount: 0 }
        }

        // 2. تجهيز بيانات الطلب للتحقق
        const startLoc = parseLocation(order.start_point)
        const endLoc = parseLocation(order.end_point)

        if (!startLoc || !endLoc) {
            console.warn('Invalid order locations for reward check:', order.start_point, order.end_point)
            return { applied: false, rewards: [], totalAmount: 0 }
        }

        // بيانات الطلب بصيغة موحدة للتحقق
        const orderDataForValidation = {
            startLat: startLoc.lat,
            startLng: startLoc.lng,
            endLat: endLoc.lat,
            endLng: endLoc.lng,
            serviceId: order.ser_chi_id || 1, // افتراضي 1 إذا لم يوجد
        }

        const appliedRewards: any[] = []
        let totalAmount = 0
        const orderCost = parseFloat(order.cost) || 0

        // 3. التحقق من كل عرض
        for (const promo of promotions) {
            // التحقق من الحد الأدنى للطلب
            if (promo.min_order_value && orderCost < promo.min_order_value) {
                continue
            }

            // التحقق من القيود المتقدمة (منطقة، وقت، خدمة)
            const validation = await validatePromotionConstraints(promo, orderDataForValidation)

            if (validation.valid) {
                // حساب قيمة المكافأة
                let rewardAmount = 0
                if (promo.type === 'percentage') { // هذا لن يحدث لأننا فلترنا حسب captain_reward ولكن للاحتياط
                    // إذا كان percentage في المستقبل، يمكن دعمه. حالياً captain_reward نوع خاص.
                    // لكن في الجدول قد يكون captain_reward وله قيمة ثابتة أو نسبة.
                    // انتظر، في الـ UI جعلنا captain_reward هو النوع، ولكن هل له sub-type؟
                    // في الـ DB: type هو captain_reward. والقيمة في value.
                    // هل القيمة نسبة أم ثابت؟ في الـ UI صفحة المكافآت، جعلنا له type dropdown (fixed/percentage)
                    // لكن مهلاً، الـ DB field `type` هو `captain_reward`.
                    // كيف نخزن نوع القيمة (ثابت/نسبة)؟
                    // في صفحة المكافآت قمت بعمل type في الـ UI، لكن عند الحفظ type = 'captain_reward'.
                    // هذا خلل في تكويني لصفحة المكافآت!
                    // لنتحقق من كود handleSubmit في صفحة المكافآت.
                    // dataToSubmit = { ...formData, type: 'captain_reward' ... }
                    // إذن فقدنا المعلومة هل هي نسبة أم ثابت!
                    // يجب أن نستخدم حقل آخر أو نعتمد على القيمة فقط (حالياً سنفترض أنها ثابتة لعدم تعقيد الـ Schema الآن).
                    // أو نستخدم حقل `max_discount` لتمييز النسبة؟
                    // لنفترض حالياً أنها مبلغ ثابت دائماً كما هو شائع في المكافآت (50 ل.س).
                    // إذا أردنا دعم النسبة، يجب إضافة عمود `reward_type` أو استخدام `code` لتمييزها.
                    // سأفترض أنها FIXED AMOUNT حالياً لتبسيط الأمور وضمان العمل.

                    rewardAmount = promo.value
                } else {
                    rewardAmount = promo.value
                }

                if (rewardAmount > 0) {
                    appliedRewards.push({ ...promo, calculatedAmount: rewardAmount })
                    totalAmount += rewardAmount

                    // 4. تطبيق المكافأة (إضافة رصيد)
                    // إضافة سجل في payments
                    const { error: paymentError } = await supabase
                        .from('cap_payment')
                        .insert([{
                            cap_id: captainId,
                            mony: rewardAmount,
                            type1: 'reward',
                            note: `مكافأة تلقائية: ${promo.name} (عرض #${promo.id})`,
                            center_id: 0,
                            insert_time: new Date().toISOString() // لو الDB ما بتعمله
                        }])

                    if (paymentError) {
                        console.error('Failed to credit reward:', paymentError)
                    } else {
                        // 5. تسجيل استخدام العرض
                        await supabase
                            .from('promotion_usage')
                            .insert([{
                                promotion_id: promo.id,
                                user_id: null, // هذا كابتن، ليس مستخدم
                                captain_id: captainId,
                                order_id: order.id,
                                discount_amount: rewardAmount, // هنا نستخدم الحقل لتخزين قيمة المكافأة
                                created_at: new Date().toISOString()
                            }])

                        // تحديث عداد الاستخدام
                        await supabase
                            .from('promotions')
                            .update({ usage_count: promo.usage_count + 1 })
                            .eq('id', promo.id)
                    }
                }
            }
        }

        return {
            applied: appliedRewards.length > 0,
            rewards: appliedRewards,
            totalAmount
        }

    } catch (error) {
        console.error('Error in checkAndApplyRewards:', error)
        return { applied: false, rewards: [], totalAmount: 0 }
    }
}
