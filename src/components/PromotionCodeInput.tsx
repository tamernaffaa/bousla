'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { validatePromotionConstraints } from '../lib/geoUtils'

interface PromotionCodeInputProps {
    orderValue: number
    userId: number
    serviceId: number
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    onPromotionApplied: (data: { discount: number; promotion: any } | null) => void
}

export default function PromotionCodeInput({
    orderValue,
    userId,
    serviceId,
    startLat,
    startLng,
    endLat,
    endLng,
    onPromotionApplied,
}: PromotionCodeInputProps) {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [appliedPromotion, setAppliedPromotion] = useState<any>(null)
    const [discount, setDiscount] = useState(0)

    const validateAndApplyPromotion = async () => {
        if (!code.trim()) {
            setError('الرجاء إدخال كود الخصم')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // 1. جلب العرض من قاعدة البيانات
            const { data: promotion, error: fetchError } = await supabase
                .from('promotions')
                .select('*')
                .eq('code', code.toUpperCase())
                .eq('active', true)
                .single()

            if (fetchError || !promotion) {
                setError('كود الخصم غير صالح')
                return
            }

            // 2. التحقق من تاريخ الصلاحية
            const now = new Date()
            const startDate = new Date(promotion.start_date)
            const endDate = new Date(promotion.end_date)

            if (now < startDate || now > endDate) {
                setError('كود الخصم منتهي الصلاحية')
                return
            }

            // 3. التحقق من الحد الأدنى للطلب
            if (orderValue < promotion.min_order_value) {
                setError(`الحد الأدنى للطلب ${promotion.min_order_value} ل.س`)
                return
            }

            // 4. التحقق من عدد الاستخدامات
            if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
                setError('تم استنفاد عدد مرات استخدام العرض')
                return
            }

            // 5. التحقق من استخدام المستخدم
            const { count } = await supabase
                .from('promotion_usage')
                .select('*', { count: 'exact', head: true })
                .eq('promotion_id', promotion.id)
                .eq('user_id', userId)

            const usagePerUser = promotion.usage_per_user || 1
            if (count && count >= usagePerUser) {
                setError('لقد استخدمت هذا العرض من قبل')
                return
            }

            // 6. التحقق من القيود المتقدمة (المناطق، الوقت، الخدمات)
            const constraintsCheck = await validatePromotionConstraints(promotion, {
                startLat,
                startLng,
                endLat,
                endLng,
                serviceId
            })

            if (!constraintsCheck.valid) {
                setError(constraintsCheck.reason || 'هذا العرض غير متاح لهذا الطلب')
                return
            }

            // 7. حساب الخصم
            let calculatedDiscount = 0

            switch (promotion.type) {
                case 'percentage':
                    calculatedDiscount = orderValue * (promotion.value / 100)
                    if (promotion.max_discount && calculatedDiscount > promotion.max_discount) {
                        calculatedDiscount = promotion.max_discount
                    }
                    break
                case 'fixed':
                    calculatedDiscount = Math.min(promotion.value, orderValue)
                    break
                case 'captain_reward':
                    calculatedDiscount = 0 // لا يؤثر على سعر العميل
                    break
            }

            setAppliedPromotion(promotion)
            setDiscount(calculatedDiscount)
            onPromotionApplied({ discount: calculatedDiscount, promotion })

        } catch (err) {
            console.error('Error applying promotion:', err)
            setError('حدث خطأ في التحقق من الكود')
        } finally {
            setLoading(false)
        }
    }

    const [isExpanded, setIsExpanded] = useState(false)

    const removePromotion = () => {
        setAppliedPromotion(null)
        setDiscount(0)
        setCode('')
        setError(null)
        onPromotionApplied(null)
        setIsExpanded(false)
    }

    if (appliedPromotion) {
        return (
            <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div className="text-sm">
                        <span className="font-bold text-green-800 ml-1">{appliedPromotion.code}</span>
                        <span className="text-green-700">(-{discount.toFixed(0)} ل.س)</span>
                    </div>
                </div>
                <button onClick={removePromotion} className="text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )
    }

    return (
        <div className="w-full">
            {!isExpanded ? (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-2 text-orange-600 font-medium text-sm hover:underline p-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>لديك كود خصم؟</span>
                </button>
            ) : (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="KOD123"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
                            autoFocus
                        />
                        <button
                            onClick={validateAndApplyPromotion}
                            disabled={loading}
                            className="px-4 py-2 bg-black text-white text-sm rounded-lg font-bold disabled:opacity-50"
                        >
                            {loading ? '...' : 'تطبيق'}
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500 px-1">{error}</p>}
                </div>
            )}
        </div>
    )
}
