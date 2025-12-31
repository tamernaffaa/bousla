'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { validatePromotionConstraints } from '../lib/geoUtils'
import { motion, AnimatePresence } from 'framer-motion'

interface AvailablePromotionsProps {
    orderValue: number
    userId: number
    serviceId: number
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    onPromotionSelected: (data: { discount: number; promotion: any } | null) => void
}

export default function AvailablePromotions({
    orderValue,
    userId,
    serviceId,
    startLat,
    startLng,
    endLat,
    endLng,
    onPromotionSelected,
}: AvailablePromotionsProps) {
    const [availablePromotions, setAvailablePromotions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPromotion, setSelectedPromotion] = useState<any>(null)

    useEffect(() => {
        fetchAvailablePromotions()
    }, [orderValue, serviceId, startLat, startLng, endLat, endLng])

    const fetchAvailablePromotions = async () => {
        try {
            setLoading(true)

            // جلب جميع العروض النشطة
            const { data: promotions, error } = await supabase
                .from('promotions')
                .select('*')
                .eq('active', true)
                .lte('start_date', new Date().toISOString())
                .gte('end_date', new Date().toISOString())
                .neq('type', 'captain_reward') // استبعاد مكافآت الكباتن

            if (error) throw error

            // فلترة العروض المتاحة
            const validPromotions = []

            for (const promo of promotions || []) {
                // التحقق من الحد الأدنى للطلب
                if (orderValue < promo.min_order_value) continue

                // التحقق من عدد الاستخدامات
                if (promo.usage_limit && promo.usage_count >= promo.usage_limit) continue

                // التحقق من استخدام المستخدم
                const { count } = await supabase
                    .from('promotion_usage')
                    .select('*', { count: 'exact', head: true })
                    .eq('promotion_id', promo.id)
                    .eq('user_id', userId)

                const usagePerUser = promo.usage_per_user || 1
                if (count && count >= usagePerUser) continue

                // التحقق من القيود المتقدمة
                const constraintsCheck = await validatePromotionConstraints(promo, {
                    startLat,
                    startLng,
                    endLat,
                    endLng,
                    serviceId
                })

                if (!constraintsCheck.valid) continue

                // حساب الخصم
                let discount = 0
                if (promo.type === 'percentage') {
                    discount = orderValue * (promo.value / 100)
                    if (promo.max_discount && discount > promo.max_discount) {
                        discount = promo.max_discount
                    }
                } else if (promo.type === 'fixed') {
                    discount = Math.min(promo.value, orderValue)
                }

                validPromotions.push({
                    ...promo,
                    calculatedDiscount: discount
                })
            }

            // ترتيب حسب قيمة الخصم (الأعلى أولاً)
            validPromotions.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)

            setAvailablePromotions(validPromotions)

            // تطبيق أفضل عرض تلقائياً
            if (validPromotions.length > 0 && !selectedPromotion) {
                applyPromotion(validPromotions[0])
            }
        } catch (error) {
            console.error('Error fetching promotions:', error)
        } finally {
            setLoading(false)
        }
    }

    const applyPromotion = (promo: any) => {
        setSelectedPromotion(promo)
        onPromotionSelected({
            discount: promo.calculatedDiscount,
            promotion: promo
        })
    }

    const removePromotion = () => {
        setSelectedPromotion(null)
        onPromotionSelected(null)
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                </div>
            </div>
        )
    }

    if (availablePromotions.length === 0) {
        return null
    }

    return (
        <div className="space-y-3">
            {/* العرض المطبق */}
            <AnimatePresence>
                {selectedPromotion && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-2xl">🎉</span>
                                    <h3 className="font-bold text-green-900">تم تطبيق العرض!</h3>
                                </div>
                                <p className="text-sm text-green-800 font-semibold">
                                    {selectedPromotion.name}
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                    {selectedPromotion.description_ar || selectedPromotion.description}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                                        وفرت {selectedPromotion.calculatedDiscount.toFixed(0)} ل.س
                                    </span>
                                    <span className="text-xs text-green-600 font-mono">
                                        {selectedPromotion.code}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={removePromotion}
                                className="text-green-600 hover:text-green-800 p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* العروض المتاحة الأخرى */}
            {!selectedPromotion && availablePromotions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">✨</span>
                        <h3 className="font-bold text-orange-900">عروض متاحة لك!</h3>
                    </div>

                    <div className="space-y-2">
                        {availablePromotions.slice(0, 3).map((promo) => (
                            <motion.button
                                key={promo.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => applyPromotion(promo)}
                                className="w-full bg-white border border-orange-200 rounded-lg p-3 text-right hover:border-orange-400 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-sm">
                                            {promo.name}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {promo.description_ar || promo.description}
                                        </p>
                                    </div>
                                    <div className="mr-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                                        وفر {promo.calculatedDiscount.toFixed(0)} ل.س
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {availablePromotions.length > 3 && (
                        <p className="text-xs text-orange-600 mt-2 text-center">
                            +{availablePromotions.length - 3} عروض أخرى متاحة
                        </p>
                    )}
                </motion.div>
            )}
        </div>
    )
}
