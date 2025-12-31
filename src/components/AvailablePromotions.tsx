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
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-green-50 rounded-xl border border-green-200 p-2.5 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-sm">🎉</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-900 text-sm">{selectedPromotion.code}</span>
                                    <span className="bg-green-200 text-green-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        -{selectedPromotion.calculatedDiscount.toFixed(0)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-green-700 leading-tight mt-0.5 opacity-80">
                                    {selectedPromotion.description_ar || selectedPromotion.description}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={removePromotion}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white rounded-full transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* العروض المتاحة الأخرى */}
            {!selectedPromotion && availablePromotions.length > 0 && (
                <div className="space-y-2 mt-2">
                    {availablePromotions.slice(0, 3).map((promo) => (
                        <motion.button
                            key={promo.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => applyPromotion(promo)}
                            className="w-full flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg p-2 hover:border-orange-300 transition-all text-right group"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg grayscale group-hover:grayscale-0 transition-all">✨</span>
                                <div>
                                    <p className="font-bold text-gray-800 text-xs">{promo.name}</p>
                                    <p className="text-[10px] text-gray-500">{promo.description_ar}</p>
                                </div>
                            </div>
                            <div className="bg-white text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-100 shadow-sm">
                                توفير {promo.calculatedDiscount.toFixed(0)}
                            </div>
                        </motion.button>
                    ))}

                    {availablePromotions.length > 3 && (
                        <p className="text-[10px] text-gray-400 text-center">
                            +{availablePromotions.length - 3} عروض إضافية
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
