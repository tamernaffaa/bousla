/**
 * Finish Trip Helper
 * 
 * Handles the completion of a trip including:
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

export async function finishTrip({
    tripData,
    customerRating,
    onSuccess,
    onError
}: FinishTripParams): Promise<void> {
    try {
        console.log('🏁 Finishing trip:', tripData.trip_id);

        // Get current trip data from storage
        const currentTrip = activeTripStorage.getTrip();

        if (!currentTrip) {
            throw new Error('No active trip found');
        }

        // Update trip status to completed
        await activeTripStorage.changeStatus('completed');

        // Broadcast trip completion
        try {
            await supabase.channel('active_trips').send({
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
            console.log('📡 Broadcasted trip_completed event');
        } catch (broadcastError) {
            console.error('❌ Error broadcasting trip completion:', broadcastError);
            // Don't fail the whole operation if broadcast fails
        }

        // Don't clear trip automatically - let the invoice modal handle it
        // The trip will be cleared when user closes the invoice

        // Call success callback
        if (onSuccess) {
            onSuccess();
        }

        console.log('✅ Trip finished successfully');
    } catch (error) {
        console.error('❌ Error finishing trip:', error);

        // Call error callback
        if (onError) {
            onError(error);
        }

        throw error;
    }
}
