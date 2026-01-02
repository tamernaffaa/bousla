/**
 * Active Trip Storage - Offline-First Trip Management
 * 
 * Manages active trip data locally with automatic sync to Supabase.
 * Supports offline operation during the entire trip lifecycle.
 */

import { supabase } from './supabaseClient';

// =====================================================
// Types
// =====================================================

export type TripStatus = 'on_way' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';

export interface ActiveTripData {
    // IDs
    trip_id: number;
    order_id: number;
    captain_id: number;
    customer_id: number;

    // Status
    status: TripStatus;

    // Timestamps
    accepted_at: string;
    arrived_at?: string;
    started_at?: string;
    completed_at?: string;

    // On Way Tracking
    on_way_distance_km: number;
    on_way_duration_min: number;
    on_way_billable_km: number;

    // Waiting Tracking
    waiting_duration_min: number;
    waiting_billable_min: number;

    // Trip Tracking
    trip_distance_km: number;
    trip_duration_min: number;

    // Billing
    base_cost: number;
    km_price: number;
    min_price: number;
    on_way_cost: number;
    waiting_cost: number;
    trip_cost: number;
    total_cost: number;

    // Location & Route
    last_location?: {
        lat: number;
        lon: number;
        timestamp: number;
        accuracy?: number;
    };
    route_points: Array<{
        lat: number;
        lon: number;
        timestamp: number;
    }>;

    // Customer/Captain Info (for display)
    customer_name?: string;
    customer_phone?: string;
    captain_name?: string;
    captain_phone?: string;
    captain_photo?: string;
    captain_rating?: number;

    // Sync State
    last_synced: number;
    pending_updates: Array<{
        field: string;
        value: any;
        timestamp: number;
    }>;
    sync_status: 'synced' | 'pending' | 'failed';
}

// =====================================================
// Active Trip Storage Class
// =====================================================

class ActiveTripStorage {
    private storageKey = 'bousla_active_trip';
    private syncQueueKey = 'bousla_trip_sync_queue';

    /**
     * Save active trip to localStorage
     */
    saveTrip(tripData: ActiveTripData): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(tripData));
            console.log(`✅ Trip ${tripData.trip_id} saved locally`);
        } catch (error) {
            console.error('❌ Error saving trip:', error);
        }
    }

    /**
     * Get active trip from localStorage
     */
    getTrip(): ActiveTripData | null {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return null;

            const trip = JSON.parse(stored) as ActiveTripData;
            console.log(`📖 Loaded trip ${trip.trip_id} from local storage`);
            return trip;
        } catch (error) {
            console.error('❌ Error loading trip:', error);
            return null;
        }
    }

    /**
     * Update specific fields of the active trip
     */
    updateTrip(updates: Partial<ActiveTripData>): void {
        const trip = this.getTrip();
        if (!trip) {
            console.warn('⚠️ No active trip to update');
            return;
        }

        // Track what changed for sync
        const changedFields = Object.keys(updates).map(field => ({
            field,
            value: updates[field as keyof ActiveTripData],
            timestamp: Date.now()
        }));

        // Merge updates
        const updatedTrip: ActiveTripData = {
            ...trip,
            ...updates,
            pending_updates: [...trip.pending_updates, ...changedFields],
            sync_status: 'pending'
        };

        this.saveTrip(updatedTrip);
        this.addToSyncQueue(trip.trip_id);
    }

    /**
     * Update location and add to route
     */
    updateLocation(lat: number, lon: number, accuracy?: number): void {
        const trip = this.getTrip();
        if (!trip) return;

        const newPoint = {
            lat,
            lon,
            timestamp: Date.now()
        };

        const lastLocation = {
            lat,
            lon,
            timestamp: Date.now(),
            accuracy
        };

        this.updateTrip({
            last_location: lastLocation,
            route_points: [...trip.route_points, newPoint]
        });
    }

    /**
     * Update trip metrics (distance, duration, costs)
     */
    updateMetrics(metrics: {
        on_way_distance_km?: number;
        on_way_duration_min?: number;
        waiting_duration_min?: number;
        trip_distance_km?: number;
        trip_duration_min?: number;
    }): void {
        const trip = this.getTrip();
        if (!trip) return;

        // Calculate billable amounts
        const on_way_billable_km = metrics.on_way_distance_km
            ? Math.max(0, metrics.on_way_distance_km - 1.5)
            : trip.on_way_billable_km;

        const waiting_billable_min = metrics.waiting_duration_min
            ? Math.max(0, metrics.waiting_duration_min - 5)
            : trip.waiting_billable_min;

        // Calculate costs
        const on_way_cost = on_way_billable_km * trip.km_price;
        const waiting_cost = waiting_billable_min * trip.min_price;
        const trip_cost = (metrics.trip_distance_km || trip.trip_distance_km) * trip.km_price +
            (metrics.trip_duration_min || trip.trip_duration_min) * trip.min_price;

        const total_cost = trip.base_cost + on_way_cost + waiting_cost + trip_cost;

        this.updateTrip({
            ...metrics,
            on_way_billable_km,
            waiting_billable_min,
            on_way_cost: Math.round(on_way_cost * 100) / 100,
            waiting_cost: Math.round(waiting_cost * 100) / 100,
            trip_cost: Math.round(trip_cost * 100) / 100,
            total_cost: Math.round(total_cost * 100) / 100
        });
    }

    /**
     * Change trip status
     */
    async changeStatus(newStatus: TripStatus): Promise<boolean> {
        const trip = this.getTrip();
        if (!trip) return false;

        const now = new Date().toISOString();
        const updates: Partial<ActiveTripData> = { status: newStatus };

        // Set appropriate timestamp
        switch (newStatus) {
            case 'waiting':
                updates.arrived_at = now;
                break;
            case 'in_progress':
                updates.started_at = now;
                break;
            case 'completed':
                updates.completed_at = now;
                break;
        }

        // Always update locally first (offline-first approach)
        this.updateTrip(updates);

        // Try to sync in background if online, but don't block on it
        if (navigator.onLine) {
            this.syncTrip(trip.trip_id).catch(err => {
                console.warn('Background sync failed, will retry later:', err);
            });
        }

        // Always return true since local update succeeded
        return true;
    }

    /**
     * Clear active trip (after completion)
     */
    clearTrip(): void {
        localStorage.removeItem(this.storageKey);
        console.log('🗑️ Active trip cleared');
    }

    /**
     * Add trip to sync queue
     */
    private addToSyncQueue(tripId: number): void {
        try {
            const queue = this.getSyncQueue();
            if (!queue.includes(tripId)) {
                queue.push(tripId);
                localStorage.setItem(this.syncQueueKey, JSON.stringify(queue));
            }
        } catch (error) {
            console.error('❌ Error adding to sync queue:', error);
        }
    }

    /**
     * Get sync queue
     */
    private getSyncQueue(): number[] {
        try {
            const stored = localStorage.getItem(this.syncQueueKey);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    /**
     * Remove from sync queue
     */
    private removeFromSyncQueue(tripId: number): void {
        try {
            const queue = this.getSyncQueue().filter(id => id !== tripId);
            localStorage.setItem(this.syncQueueKey, JSON.stringify(queue));
        } catch (error) {
            console.error('❌ Error removing from sync queue:', error);
        }
    }

    /**
     * Sync trip to Supabase active_trips table
     */
    async syncTrip(tripId: number): Promise<boolean> {
        const trip = this.getTrip();
        if (!trip || trip.trip_id !== tripId) {
            console.warn('⚠️ Trip mismatch or not found');
            return false;
        }

        try {
            console.log(`🔄 Syncing trip ${tripId} to database...`);

            // Upsert to active_trips table
            const { error } = await supabase
                .from('active_trips')
                .upsert({
                    trip_id: trip.trip_id,
                    order_id: trip.order_id,
                    captain_id: trip.captain_id,
                    customer_id: trip.customer_id,
                    status: trip.status,
                    accepted_at: trip.accepted_at,
                    arrived_at: trip.arrived_at,
                    started_at: trip.started_at,
                    completed_at: trip.completed_at,
                    on_way_distance_km: trip.on_way_distance_km,
                    on_way_duration_min: trip.on_way_duration_min,
                    waiting_duration_min: trip.waiting_duration_min,
                    trip_distance_km: trip.trip_distance_km,
                    trip_duration_min: trip.trip_duration_min,
                    base_cost: trip.base_cost,
                    km_price: trip.km_price,
                    min_price: trip.min_price,
                    total_cost: trip.total_cost,
                    captain_name: trip.captain_name,
                    captain_phone: trip.captain_phone,
                    captain_photo: trip.captain_photo,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // Mark as synced
            this.updateTrip({
                pending_updates: [],
                last_synced: Date.now(),
                sync_status: 'synced'
            });

            console.log(`✅ Trip ${tripId} synced to database successfully`);
            return true;

        } catch (error) {
            console.error(`❌ Sync failed for trip ${tripId}:`, error);
            this.updateTrip({ sync_status: 'failed' });
            return false;
        }
    }

    /**
     * Sync all pending trips
     */
    async syncAll(): Promise<{ success: number; failed: number }> {
        const queue = this.getSyncQueue();
        let success = 0;
        let failed = 0;

        for (const tripId of queue) {
            const result = await this.syncTrip(tripId);
            if (result) success++;
            else failed++;
        }

        console.log(`📊 Sync complete: ${success} success, ${failed} failed`);
        return { success, failed };
    }

    /**
     * Get sync statistics
     */
    getStats(): {
        hasActiveTrip: boolean;
        tripId: number | null;
        status: TripStatus | null;
        syncStatus: 'synced' | 'pending' | 'failed' | null;
        pendingUpdates: number;
    } {
        const trip = this.getTrip();

        if (!trip) {
            return {
                hasActiveTrip: false,
                tripId: null,
                status: null,
                syncStatus: null,
                pendingUpdates: 0
            };
        }

        return {
            hasActiveTrip: true,
            tripId: trip.trip_id,
            status: trip.status,
            syncStatus: trip.sync_status,
            pendingUpdates: trip.pending_updates.length
        };
    }
}

// =====================================================
// Export singleton instance
// =====================================================

export const activeTripStorage = new ActiveTripStorage();
