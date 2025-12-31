// ============================================
// Geo Utils - دوال مساعدة للتحقق من المواقع الجغرافية
// ============================================

import { supabase } from './supabaseClient'

/**
 * التحقق من وجود نقطة داخل منطقة محددة
 */
export const isPointInZone = (
    lat: number,
    lng: number,
    zone: {
        min_lat: number
        max_lat: number
        min_lng: number
        max_lng: number
    }
): boolean => {
    return (
        lat >= zone.min_lat &&
        lat <= zone.max_lat &&
        lng >= zone.min_lng &&
        lng <= zone.max_lng
    )
}

/**
 * التحقق من وجود الطلب في المناطق المحددة
 */
export const checkOrderInZones = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    zoneIds: number[],
    zoneType: 'start' | 'end' | 'any' | 'both'
): Promise<boolean> => {
    if (!zoneIds || zoneIds.length === 0) {
        return true // لا توجد قيود على المناطق
    }

    try {
        // جلب المناطق من قاعدة البيانات
        const { data: zones, error } = await supabase
            .from('zones')
            .select('*')
            .in('id', zoneIds)
            .eq('active', true)

        if (error || !zones || zones.length === 0) {
            console.error('Error fetching zones:', error)
            return false
        }

        // التحقق حسب نوع المنطقة
        switch (zoneType) {
            case 'start':
                // يجب أن تكون نقطة البداية في إحدى المناطق
                return zones.some(zone => isPointInZone(startLat, startLng, zone))

            case 'end':
                // يجب أن تكون نقطة النهاية في إحدى المناطق
                return zones.some(zone => isPointInZone(endLat, endLng, zone))

            case 'any':
                // أي من نقطة البداية أو النهاية في إحدى المناطق
                return zones.some(zone =>
                    isPointInZone(startLat, startLng, zone) ||
                    isPointInZone(endLat, endLng, zone)
                )

            case 'both':
                // كلا النقطتين يجب أن تكونا في المناطق
                const startInZone = zones.some(zone => isPointInZone(startLat, startLng, zone))
                const endInZone = zones.some(zone => isPointInZone(endLat, endLng, zone))
                return startInZone && endInZone

            default:
                return false
        }
    } catch (error) {
        console.error('Error in checkOrderInZones:', error)
        return false
    }
}

/**
 * التحقق من القيود الزمنية
 */
export const checkTimeConstraint = (
    timeStart: string | null,
    timeEnd: string | null
): boolean => {
    if (!timeStart || !timeEnd) {
        return true // لا توجد قيود زمنية
    }

    try {
        const now = new Date()
        const currentTime = now.getHours() * 60 + now.getMinutes() // بالدقائق

        const [startHour, startMin] = timeStart.split(':').map(Number)
        const [endHour, endMin] = timeEnd.split(':').map(Number)

        const startTimeMinutes = startHour * 60 + startMin
        const endTimeMinutes = endHour * 60 + endMin

        return currentTime >= startTimeMinutes && currentTime <= endTimeMinutes
    } catch (error) {
        console.error('Error in checkTimeConstraint:', error)
        return false
    }
}

/**
 * التحقق من قيود أيام الأسبوع
 */
export const checkDayConstraint = (daysOfWeek: number[] | null): boolean => {
    if (!daysOfWeek || daysOfWeek.length === 0) {
        return true // لا توجد قيود على الأيام
    }

    const today = new Date().getDay() // 0-6 (0=الأحد)
    return daysOfWeek.includes(today)
}

/**
 * التحقق من قيود الخدمات
 */
export const checkServiceConstraint = (
    serviceIds: number[] | null,
    orderServiceId: number
): boolean => {
    if (!serviceIds || serviceIds.length === 0) {
        return true // لا توجد قيود على الخدمات
    }

    return serviceIds.includes(orderServiceId)
}

/**
 * التحقق الشامل من جميع القيود
 */
export const validatePromotionConstraints = async (
    promotion: any,
    orderData: {
        startLat: number
        startLng: number
        endLat: number
        endLng: number
        serviceId: number
    }
): Promise<{ valid: boolean; reason?: string }> => {
    // 1. التحقق من القيود الزمنية
    if (!checkTimeConstraint(promotion.time_start, promotion.time_end)) {
        return {
            valid: false,
            reason: `هذا العرض متاح فقط بين الساعة ${promotion.time_start} و ${promotion.time_end}`
        }
    }

    // 2. التحقق من أيام الأسبوع
    if (!checkDayConstraint(promotion.days_of_week)) {
        const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
        const allowedDays = promotion.days_of_week.map((d: number) => dayNames[d]).join(', ')
        return {
            valid: false,
            reason: `هذا العرض متاح فقط في أيام: ${allowedDays}`
        }
    }

    // 3. التحقق من الخدمات
    if (!checkServiceConstraint(promotion.service_ids, orderData.serviceId)) {
        return {
            valid: false,
            reason: 'هذا العرض غير متاح لهذه الخدمة'
        }
    }

    // 4. التحقق من المناطق
    const zoneValid = await checkOrderInZones(
        orderData.startLat,
        orderData.startLng,
        orderData.endLat,
        orderData.endLng,
        promotion.zone_ids,
        promotion.zone_type
    )

    if (!zoneValid) {
        let reason = 'هذا العرض غير متاح في هذه المنطقة'
        if (promotion.zone_type === 'start') {
            reason = 'يجب أن يبدأ الطلب من المنطقة المحددة'
        } else if (promotion.zone_type === 'end') {
            reason = 'يجب أن ينتهي الطلب في المنطقة المحددة'
        } else if (promotion.zone_type === 'both') {
            reason = 'يجب أن يبدأ وينتهي الطلب في المناطق المحددة'
        }
        return { valid: false, reason }
    }

    return { valid: true }
}

/**
 * جلب جميع المناطق النشطة
 */
export const getActiveZones = async () => {
    try {
        const { data, error } = await supabase
            .from('zones')
            .select('*')
            .eq('active', true)
            .order('name_ar')

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching zones:', error)
        return []
    }
}

/**
 * الحصول على اسم المنطقة من الإحداثيات
 */
export const getZoneFromCoordinates = async (
    lat: number,
    lng: number
): Promise<string | null> => {
    try {
        const zones = await getActiveZones()
        const zone = zones.find(z => isPointInZone(lat, lng, z))
        return zone ? zone.name_ar : null
    } catch (error) {
        console.error('Error getting zone from coordinates:', error)
        return null
    }
}
