// finishTrip.ts
// Shared logic for finishing a trip (used by both ActiveTripModal and OrderTrackingModal)

import { activeTripStorage } from './activeTripStorage';
import { supabase } from './supabaseClient';
import { toast } from 'react-toastify';

/**
 * Finishes the trip using the new logic (from ActiveTripModal)
 * @param tripData - The current trip data
 * @param customerRating - Optional customer rating
 * @param onSuccess - Callback on success (e.g., close modal)
 * @param onError - Callback on error
 */
export async function finishTrip({
  tripData,
  customerRating,
  onSuccess,
  onError
}: {
  tripData: any;
  customerRating?: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) {
  try {
    // Send complete trip command to Flutter (if available)
    if (typeof window !== 'undefined' && (window as any).sendToKotlin) {
      (window as any).sendToKotlin('complete_trip', JSON.stringify({
        trip_id: tripData.trip_id,
        order_id: tripData.order_id,
        customer_rating: customerRating,
        total_cost: tripData.total_cost
      }));
      console.log('tamer ✅ Sent complete_trip to Flutter');
    }

    // Call Supabase RPC to complete trip (if needed)
    if (supabase && tripData.order_id && tripData.total_cost) {
      await supabase.rpc('complete_trip', {
        order_id: tripData.order_id,
        total_cost: tripData.total_cost
      });
    }

    // Clear local storage
    activeTripStorage.clearTrip();

    toast.success('تم إنهاء الرحلة بنجاح! 🎉');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error completing trip:', error);
    toast.error('حدث خطأ أثناء إنهاء الرحلة');
    if (onError) onError(error);
    throw error;
  }
}
