'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useSearchParams } from 'next/navigation'

export default function CaptainRewardsPage() {
    const searchParams = useSearchParams()
    const userId = searchParams.get('user_id')

    const [rewards, setRewards] = useState<any[]>([])
    const [totalRewards, setTotalRewards] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (userId) {
            fetchRewards()
        }
    }, [userId])

    const fetchRewards = async () => {
        try {
            setLoading(true)

            // جلب العروض من نوع captain_reward
            const { data: promotions } = await supabase
                .from('promotions')
                .select('*')
                .eq('type', 'captain_reward')
                .eq('active', true)
                .gte('end_date', new Date().toISOString())

            setRewards(promotions || [])

            // حساب إجمالي المكافآت المكتسبة
            const { data: usage } = await supabase
                .from('promotion_usage')
                .select('discount_amount')
                .eq('user_id', parseInt(userId!))

            const total = usage?.reduce((sum, u) => sum + u.discount_amount, 0) || 0
            setTotalRewards(total)
        } catch (error) {
            console.error('Error fetching rewards:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
            <h1 className="text-2xl font-bold mb-4">المكافآت والحوافز</h1>

            {/* إجمالي المكافآت */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-6 mb-6 text-white shadow-lg">
                <p className="text-sm opacity-90">إجمالي مكافآتك</p>
                <p className="text-4xl font-bold">{totalRewards.toFixed(0)} ل.س</p>
                <p className="text-xs opacity-75 mt-2">المكافآت المكتسبة من العروض الترويجية</p>
            </div>

            {/* العروض المتاحة */}
            <h2 className="text-lg font-semibold mb-3">العروض المتاحة للكباتن</h2>

            {rewards.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center text-gray-500">
                    لا توجد عروض متاحة حالياً
                </div>
            ) : (
                <div className="space-y-3">
                    {rewards.map(reward => (
                        <div key={reward.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg">{reward.name}</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {reward.description_ar || reward.description}
                                    </p>
                                </div>
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap mr-3">
                                    +{reward.value} ل.س
                                </span>
                            </div>

                            {/* القيود */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {reward.zone_ids && reward.zone_ids.length > 0 && (
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                        📍 {reward.zone_ids.length} منطقة
                                    </span>
                                )}
                                {reward.time_start && reward.time_end && (
                                    <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs">
                                        ⏰ {reward.time_start.slice(0, 5)} - {reward.time_end.slice(0, 5)}
                                    </span>
                                )}
                                {reward.days_of_week && reward.days_of_week.length > 0 && reward.days_of_week.length < 7 && (
                                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                                        📅 {reward.days_of_week.length} أيام
                                    </span>
                                )}
                                {reward.service_ids && reward.service_ids.length > 0 && (
                                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                                        🚗 {reward.service_ids.length} خدمة
                                    </span>
                                )}
                            </div>

                            {/* الفترة */}
                            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                صالح حتى: {new Date(reward.end_date).toLocaleDateString('ar-SA')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
