// localOrderStorage.ts - نظام التخزين المحلي والمزامنة للطلبات
import { supabase } from './supabaseClient';

interface OrderDetails {
    id: number;
    [key: string]: any;
}

interface LocalOrder extends OrderDetails {
    localId: string; // UUID للتعريف المحلي
    syncStatus: 'pending' | 'synced' | 'failed';
    lastModified: number;
    localUpdates: {
        field: string;
        value: any;
        timestamp: number;
    }[];
}

class LocalOrderStorage {
    private readonly STORAGE_KEY = 'bousla_local_orders';
    private readonly SYNC_QUEUE_KEY = 'bousla_sync_queue';
    private readonly ACTIVE_ORDER_KEY = 'bousla_active_order';

    /**
     * حفظ طلب جديد محلياً
     */
    async saveOrder(order: OrderDetails): Promise<void> {
        try {
            const localOrder: LocalOrder = {
                ...order,
                localId: this.generateUUID(),
                syncStatus: 'synced', // مزامن بالفعل لأنه جاء من السيرفر
                lastModified: Date.now(),
                localUpdates: []
            };

            const orders = this.getAllOrders();
            orders[order.id] = localOrder;

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));

            // حفظ كطلب نشط
            localStorage.setItem(this.ACTIVE_ORDER_KEY, order.id.toString());

            console.log(`💾 Order ${order.id} saved locally`);
        } catch (error) {
            console.error('Error saving order locally:', error);
        }
    }

    /**
     * تحديث طلب محلياً
     */
    async updateOrder(
        orderId: number,
        updates: Partial<OrderDetails>
    ): Promise<void> {
        try {
            const orders = this.getAllOrders();
            const order = orders[orderId];

            if (!order) {
                console.error(`Order ${orderId} not found locally`);
                return;
            }

            // تسجيل التحديثات
            Object.entries(updates).forEach(([field, value]) => {
                order.localUpdates.push({
                    field,
                    value,
                    timestamp: Date.now()
                });
            });

            // تطبيق التحديثات
            Object.assign(order, updates);
            order.lastModified = Date.now();
            order.syncStatus = 'pending';

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));

            // إضافة للـ sync queue
            this.addToSyncQueue(orderId);

            console.log(`💾 Order ${orderId} updated locally (pending sync)`);
        } catch (error) {
            console.error('Error updating order locally:', error);
        }
    }

    /**
     * جلب طلب من التخزين المحلي
     */
    getOrder(orderId: number): LocalOrder | null {
        const orders = this.getAllOrders();
        return orders[orderId] || null;
    }

    /**
     * جلب الطلب النشط الحالي
     */
    getActiveOrder(): LocalOrder | null {
        const activeOrderId = localStorage.getItem(this.ACTIVE_ORDER_KEY);
        if (!activeOrderId) return null;

        const order = this.getOrder(parseInt(activeOrderId));

        // التحقق من أن الطلب ليس مكتملاً أو ملغياً
        if (order && (order.status === 'completed' || order.status === 'cancelled')) {
            console.log(`⚠️ Order ${order.id} is ${order.status}, clearing from active storage`);
            this.clearActiveOrder();
            return null;
        }

        return order;
    }

    /**
     * جلب جميع الطلبات
     */
    getAllOrders(): Record<number, LocalOrder> {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error reading local orders:', error);
            return {};
        }
    }

    /**
     * جلب الطلبات التي تحتاج مزامنة
     */
    getPendingSyncOrders(): LocalOrder[] {
        const orders = this.getAllOrders();
        return Object.values(orders).filter(o => o.syncStatus === 'pending');
    }

    /**
     * إضافة للـ sync queue
     */
    private addToSyncQueue(orderId: number): void {
        try {
            const queue = this.getSyncQueue();
            if (!queue.includes(orderId)) {
                queue.push(orderId);
                localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
            }
        } catch (error) {
            console.error('Error adding to sync queue:', error);
        }
    }

    /**
     * جلب sync queue
     */
    private getSyncQueue(): number[] {
        try {
            const data = localStorage.getItem(this.SYNC_QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading sync queue:', error);
            return [];
        }
    }

    /**
     * مسح من sync queue
     */
    private removeFromSyncQueue(orderId: number): void {
        try {
            const queue = this.getSyncQueue().filter(id => id !== orderId);
            localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
        } catch (error) {
            console.error('Error removing from sync queue:', error);
        }
    }

    /**
     * مزامنة طلب واحد
     */
    async syncOrder(orderId: number): Promise<boolean> {
        const order = this.getOrder(orderId);
        if (!order || order.syncStatus === 'synced') return true;

        try {
            console.log(`🔄 Syncing order ${orderId}...`);

            // إرسال التحديثات للسيرفر
            const { error } = await supabase
                .from('orders')
                .update({
                    real_km: order.real_km,
                    real_min: order.real_min,
                    real_price: order.real_price,
                    status: order.status,
                    end_time: order.end_time,
                    waiting_min: order.waiting_min,
                    real_street: order.real_street
                })
                .eq('id', orderId);

            if (error) throw error;

            // تحديث حالة المزامنة
            const orders = this.getAllOrders();
            orders[orderId].syncStatus = 'synced';
            orders[orderId].localUpdates = [];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));

            this.removeFromSyncQueue(orderId);

            console.log(`✅ Order ${orderId} synced successfully`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to sync order ${orderId}:`, error);

            const orders = this.getAllOrders();
            if (orders[orderId]) {
                orders[orderId].syncStatus = 'failed';
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
            }

            return false;
        }
    }

    /**
     * مزامنة جميع الطلبات المعلقة
     */
    async syncAll(): Promise<{ success: number; failed: number }> {
        const pendingOrders = this.getPendingSyncOrders();

        if (pendingOrders.length === 0) {
            return { success: 0, failed: 0 };
        }

        console.log(`🔄 Syncing ${pendingOrders.length} pending orders...`);

        let success = 0;
        let failed = 0;

        for (const order of pendingOrders) {
            const result = await this.syncOrder(order.id);
            if (result) {
                success++;
            } else {
                failed++;
            }
        }

        console.log(`✅ Sync complete: ${success} success, ${failed} failed`);
        return { success, failed };
    }

    /**
     * مسح الطلب النشط
     */
    clearActiveOrder(): void {
        localStorage.removeItem(this.ACTIVE_ORDER_KEY);
        console.log('tamer tamer 🗑️ Active order cleared');
    }

    /**
     * مسح طلب من التخزين المحلي
     */
    deleteOrder(orderId: number): void {
        try {
            const orders = this.getAllOrders();
            delete orders[orderId];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));

            this.removeFromSyncQueue(orderId);

            const activeOrderId = localStorage.getItem(this.ACTIVE_ORDER_KEY);
            if (activeOrderId === orderId.toString()) {
                this.clearActiveOrder();
            }

            console.log(`🗑️ Order ${orderId} deleted from local storage`);
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    }

    /**
     * توليد UUID
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * الحصول على إحصائيات التخزين المحلي
     */
    getStats(): {
        totalOrders: number;
        pendingSync: number;
        failedSync: number;
        syncedOrders: number;
    } {
        const orders = Object.values(this.getAllOrders());

        return {
            totalOrders: orders.length,
            pendingSync: orders.filter(o => o.syncStatus === 'pending').length,
            failedSync: orders.filter(o => o.syncStatus === 'failed').length,
            syncedOrders: orders.filter(o => o.syncStatus === 'synced').length
        };
    }
}

// تصدير instance واحد
export const localOrderStorage = new LocalOrderStorage();
