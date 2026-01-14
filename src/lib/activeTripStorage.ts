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
    free_on_way_km: number;
    free_waiting_min: number;
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

    // Route Points (for Yandex navigation)
    start_point?: string;
    end_point?: string;

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
    private broadcastChannel: any = null;

    /**
     * Get or create broadcast channel
     */
    private getBroadcastChannel() {
        if (!this.broadcastChannel) {
            this.broadcastChannel = supabase.channel('active_trips');
            this.broadcastChannel.subscribe((status: string) => {
                console.log('tamer 📡 Broadcast channel status:', status);
            });
        }
        return this.broadcastChannel;
    }

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

            // Validate trip data is not stale (more than 24 hours old)
            if (this.isTripStale(trip)) {
                console.warn('⚠️ Trip data is stale, clearing...');
                this.clearTrip();
                return null;
            }

            console.log(`📖 Loaded trip ${trip.trip_id} from local storage`);
            return trip;
        } catch (error) {
            console.error('❌ Error loading trip:', error);
            return null;
        }
    }

    /**
     * Check if trip data is stale (older than 24 hours)
     */
    private isTripStale(trip: ActiveTripData): boolean {
        const lastSynced = trip.last_synced || 0;
        const hoursSinceSync = (Date.now() - lastSynced) / (1000 * 60 * 60);
        return hoursSinceSync > 24;
    }

    /**
     * Validate and restore trip from database
     */
    async restoreTrip(tripId: number): Promise<ActiveTripData | null> {
        try {
            console.log(`🔄 Restoring trip ${tripId} from database...`);

            // Fetch from database
            const { data, error } = await supabase
                .from('active_trips')
                .select('*')
                .eq('id', tripId)
                .maybeSingle();

            if (error || !data) {
                console.log('tamer ⚠️ Trip not found in database');
                this.clearTrip();
                return null;
            }

            // Check if trip is already completed or cancelled
            if (data.status === 'completed' || data.status === 'cancelled') {
                console.log(`⚠️ Trip already ${data.status}, clearing local storage`);
                this.clearTrip();
                return null;
            }

            // Convert database format to ActiveTripData format
            const restoredTrip: ActiveTripData = {
                trip_id: data.id,
                order_id: data.order_id,
                captain_id: data.captain_id,
                customer_id: data.customer_id,
                status: data.status,
                accepted_at: data.accepted_at,
                arrived_at: data.arrived_at,
                started_at: data.started_at,
                completed_at: data.completed_at,
                on_way_distance_km: data.on_way_distance_km || 0,
                on_way_duration_min: data.on_way_duration_min || 0,
                on_way_billable_km: data.on_way_billable_km || 0,
                waiting_duration_min: data.waiting_duration_min || 0,
                waiting_billable_min: data.waiting_billable_min || 0,
                trip_distance_km: data.trip_distance_km || 0,
                trip_duration_min: data.trip_duration_min || 0,
                base_cost: data.base_cost || 0,
                km_price: data.km_price || 0,
                min_price: data.min_price || 0,
                free_on_way_km: data.free_on_way_km || 0,
                free_waiting_min: data.free_waiting_min || 0,
                on_way_cost: data.on_way_cost || 0,
                waiting_cost: data.waiting_cost || 0,
                trip_cost: data.trip_cost || 0,
                total_cost: data.total_cost || 0,
                last_location: data.last_location,
                route_points: data.route_points || [],
                last_synced: Date.now(),
                pending_updates: [],
                sync_status: 'synced'
            };

            // Save to local storage
            this.saveTrip(restoredTrip);

            console.log(`✅ Trip ${tripId} restored successfully`);
            return restoredTrip;
        } catch (error) {
            console.error('❌ Error restoring trip:', error);
            return null;
        }
    }

    /**
     * Update specific fields of the active trip
     */
    updateTrip(updates: Partial<ActiveTripData>, skipSync: boolean = false): void {
        const trip = this.getTrip();
        if (!trip) {
            console.warn('⚠️ No active trip to update');
            return;
        }

        // Track what changed for sync (only if not skipping sync)
        const changedFields = skipSync ? [] : Object.keys(updates).map(field => ({
            field,
            value: updates[field as keyof ActiveTripData],
            timestamp: Date.now()
        }));

        // Merge updates
        const updatedTrip: ActiveTripData = {
            ...trip,
            ...updates,
            pending_updates: skipSync ? trip.pending_updates : [...trip.pending_updates, ...changedFields],
            sync_status: skipSync ? trip.sync_status : 'pending'
        };

        this.saveTrip(updatedTrip);

        if (!skipSync) {
            this.addToSyncQueue(trip.trip_id);
        }
    }

    /**
     * Update location and add to route
     */
    updateLocation(lat: number, lon: number, accuracy?: number, skipSync: boolean = false): void {
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
        }, skipSync);
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
    }, skipSync: boolean = false): void {
        const trip = this.getTrip();
        if (!trip) return;

        // Calculate billable amounts (Dynamic calculation with free limits)
        // 1. On Way (Pickup)
        const free_on_way_km = trip.free_on_way_km || 0;
        const current_on_way_km = metrics.on_way_distance_km !== undefined ? metrics.on_way_distance_km : trip.on_way_distance_km;
        const on_way_billable_km = Math.max(0, current_on_way_km - free_on_way_km);

        // 2. Waiting
        const free_waiting_min = trip.free_waiting_min || 0;
        const current_waiting_min = metrics.waiting_duration_min !== undefined ? metrics.waiting_duration_min : trip.waiting_duration_min;
        const waiting_billable_min = Math.max(0, current_waiting_min - free_waiting_min);

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
        }, skipSync);
    }

    /**
     * Change trip status
     */
    async changeStatus(newStatus: TripStatus): Promise<boolean> {
        const trip = this.getTrip();
        if (!trip) return false;

        console.log(`🔄 Changing trip status from "${trip.status}" to "${newStatus}"`);

        const now = new Date().toISOString();
        const updates: Partial<ActiveTripData> = { status: newStatus };

        // Set appropriate timestamp
        switch (newStatus) {
            case 'waiting':
                updates.arrived_at = now;
                console.log(`⏰ Setting arrived_at: ${now}`);
                break;
            case 'in_progress':
                updates.started_at = now;
                console.log(`⏰ Setting started_at: ${now}`);
                break;
            case 'completed':
                updates.completed_at = now;
                console.log(`⏰ Setting completed_at: ${now}`);
                break;
        }

        // Always update locally first (offline-first approach)
        this.updateTrip(updates);
        console.log(`💾 Status updated locally to: ${newStatus}`);

        // IMPORTANT: For 'completed' status, DON'T update database here
        // Let Flutter handle the database operations (update orders, delete active_trips)
        if (newStatus === 'completed') {
            console.log('⏭️ Skipping database update for completed status - Flutter will handle it');
            return true;
        }

        // Update database directly for other statuses
        try {
            const dbUpdates: any = {
                status: newStatus,
                updated_at: now
            };

            // Add timestamp fields
            if (newStatus === 'waiting') dbUpdates.arrived_at = now;
            if (newStatus === 'in_progress') dbUpdates.started_at = now;

            const { error } = await supabase
                .from('active_trips')
                .update(dbUpdates)
                .eq('order_id', trip.order_id);

            if (error) {
                console.error('❌ Error updating database:', error);
            } else {
                console.log(`✅ Database updated successfully: ${newStatus}`);
            }
        } catch (dbError) {
            console.error('❌ Database update failed:', dbError);
        }

        // Broadcast status change to customer
        try {
            const channel = this.getBroadcastChannel();
            await channel.send({
                type: 'broadcast',
                event: 'status_changed',
                payload: {
                    trip_id: trip.trip_id,
                    order_id: trip.order_id,
                    new_status: newStatus,
                    timestamp: now
                }
            });
            console.log(`📡 Broadcasted status_changed: ${newStatus}`);
        } catch (broadcastError) {
            console.error('❌ Error broadcasting status change:', broadcastError);
            // Don't fail the operation if broadcast fails
        }

        // Try to sync in background if online, but don't block on it
        if (navigator.onLine) {
            console.log(`🌐 Online - attempting background sync...`);
            this.syncTrip(trip.trip_id).catch(err => {
                console.warn('Background sync failed, will retry later:', err);
            });
        } else {
            console.log(`📴 Offline - sync will happen when connection is restored`);
        }

        // Always return true since local update succeeded
        return true;
    }

    /**
     * Clear active trip (after completion)
     */
    clearTrip(): void {
        localStorage.removeItem(this.storageKey);
        console.log('tamer tamer 🗑️ Active trip cleared');
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
            console.log(`📊 Trip Status: ${trip.status}`);
            console.log(`📏 Distances: OnWay=${trip.on_way_distance_km}km, Trip=${trip.trip_distance_km}km`);
            console.log(`⏱️ Durations: OnWay=${trip.on_way_duration_min}min, Waiting=${trip.waiting_duration_min}min, Trip=${trip.trip_duration_min}min`);
            console.log(`💰 Total Cost: ${trip.total_cost}`);

            const dataToSync = {
                id: trip.trip_id,  // ✅ Use 'id' column name for active_trips table
                order_id: trip.order_id,
                // Only include captain_id and customer_id if they exist (don't overwrite with null)
                ...(trip.captain_id && { captain_id: trip.captain_id }),
                ...(trip.customer_id && { customer_id: trip.customer_id }),
                status: trip.status,
                accepted_at: trip.accepted_at,
                arrived_at: trip.arrived_at,
                started_at: trip.started_at,
                completed_at: trip.completed_at,
                on_way_distance_km: trip.on_way_distance_km,
                on_way_duration_min: Math.round(trip.on_way_duration_min),  // ✅ Convert to integer
                waiting_duration_min: Math.round(trip.waiting_duration_min),  // ✅ Convert to integer
                trip_distance_km: trip.trip_distance_km,
                trip_duration_min: Math.round(trip.trip_duration_min),  // ✅ Convert to integer
                base_cost: trip.base_cost,
                km_price: trip.km_price,
                min_price: trip.min_price,
                free_on_way_km: trip.free_on_way_km,
                free_waiting_min: trip.free_waiting_min,
                total_cost: trip.total_cost,
                captain_name: trip.captain_name,
                captain_phone: trip.captain_phone,
                captain_photo: trip.captain_photo,
                updated_at: new Date().toISOString()
            };

            console.log('tamer tamer 📤 Sending to active_trips:', JSON.stringify(dataToSync, null, 2));

            // Upsert to active_trips table
            console.log('🔄 Executing upsert...');
            const { data, error } = await supabase
                .from('active_trips')
                .upsert(dataToSync)
                .select();

            console.log('📥 Upsert response:', { data, error });

            if (error) {
                console.error('❌ Upsert error detected:', error);
                throw error;
            }

            console.log('✅ Upsert completed successfully');

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
            console.error('📋 Error details:', JSON.stringify(error, null, 2));
            if (error instanceof Error) {
                console.error('📝 Error message:', error.message);
                console.error('📚 Error stack:', error.stack);
            }
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
