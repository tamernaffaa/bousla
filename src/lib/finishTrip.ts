/**
 * Finish Trip Helper
 * 
 * Handles the completion of a trip including:
 * - Calling Flutter to complete trip and transfer data
 * - Updating trip status to completed
 * - Saving final metrics
 * - Clearing local storage
 * - Broadcasting completion event
 */

import { activeTripStorage, ActiveTripData } from './activeTripStorage';
import { supabase } from './supabaseClient';

interface FinishTripParams {
    tripData: Partial<ActiveTripData> & {
        trip_id: number;
        order_id: number;
        total_cost: number;
    };
    customerRating?: number;
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

// Helper to send messages to Kotlin/Flutter
const sendToKotlin = (action: string, data: any) => {
    if (typeof window !== 'undefined' && (window as any).Android) {
        try {
            const message = JSON.stringify({
                action,
                data: typeof data === 'string' ? data : JSON.stringify(data)
            });
            (window as any).Android.postMessage(message);
            console.log(`✅ Sent to Flutter: ${action}`, data);
            return true;
        } catch (e) {
            console.error('❌ Failed to send to Flutter:', e);
            return false;
        }
    } else {
        console.warn('⚠️ Android interface not available');
        return false;
    }
};

export async function finishTrip({
    tripData,
    customerRating = 5,
    onSuccess,
    onError
}: FinishTripParams): Promise<void> {
    try {
        console.log('🏁 ========== FINISHING TRIP ==========');
        console.log('🏁 Trip ID:', tripData.trip_id);
        console.log('🏁 Order ID:', tripData.order_id);
        console.log('🏁 Customer Rating:', customerRating);
        console.log('🏁 Total Cost:', tripData.total_cost);

        // Get current trip data from storage
        const currentTrip = activeTripStorage.getTrip();

        if (!currentTrip) {
            throw new Error('No active trip found');
        }

        // CRITICAL: Call Flutter to complete trip and transfer data to orders table
        console.log('📍 Step 1: Calling Flutter to complete trip...');
        const flutterCalled = sendToKotlin('complete_trip', {
            trip_id: tripData.trip_id,
            order_id: tripData.order_id,
            customer_rating: customerRating,
            total_cost: tripData.total_cost
        });

        if (!flutterCalled) {
            console.warn('⚠️ Flutter call failed, but continuing with local update');
        } else {
            console.log('✅ Flutter called successfully');
        }

        // Update trip status to completed locally
        console.log('📍 Step 2: Updating local storage...');
        await activeTripStorage.changeStatus('completed');
        console.log('✅ Local storage updated');

        // Broadcast trip completion on correct channel
        console.log('📍 Step 3: Broadcasting completion...');
        try {
            await supabase.channel(`active_trip_${tripData.trip_id}`).send({
                type: 'broadcast',
                event: 'trip_completed',
                payload: {
                    trip_id: tripData.trip_id,
                    order_id: tripData.order_id,
                    total_cost: tripData.total_cost,
                    customer_rating: customerRating,
                    completed_at: new Date().toISOString()
                }
            });
            console.log('✅ Broadcasted trip_completed event');
        } catch (broadcastError) {
            console.error('❌ Error broadcasting trip completion:', broadcastError);
            // Don't fail the whole operation if broadcast fails
        }

        // Don't clear trip automatically - let Flutter handle it after database operations
        // The trip will be cleared when Flutter completes the transfer

        // Call success callback
        if (onSuccess) {
            onSuccess();
        }

        console.log('✅ ========== TRIP FINISH INITIATED ==========');
        console.log('ℹ️ Flutter will handle database operations and cleanup');
    } catch (error) {
        console.error('❌ ========== ERROR FINISHING TRIP ==========');
        console.error('❌ Error:', error);

        // Call error callback
        if (onError) {
            onError(error);
        }

        throw error;
    }
}
