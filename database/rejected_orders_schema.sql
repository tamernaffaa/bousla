-- SQL Script لإنشاء جدول الطلبات المرفوضة ونظام العقوبات
-- يجب تنفيذه في Supabase SQL Editor

-- ==========================================
-- 1. إنشاء جدول rejected_orders
-- ==========================================
CREATE TABLE IF NOT EXISTS rejected_orders (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  captain_id INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL,
  rejected_at TIMESTAMP DEFAULT NOW(),
  
  -- معلومات إضافية للتحليل
  distance_km DECIMAL(10,2),
  service_id INTEGER,
  
  -- فهرسة للأداء
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_captain FOREIGN KEY (captain_id) REFERENCES users(id) ON DELETE CASCADE
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_rejected_captain_id ON rejected_orders(captain_id);
CREATE INDEX IF NOT EXISTS idx_rejected_order_id ON rejected_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_rejected_at ON rejected_orders(rejected_at);

-- ==========================================
-- 2. التحقق من الأعمدة في جدول users
-- ==========================================
-- الأعمدة موجودة بالفعل في جدول users:
-- - rejection_rate DECIMAL(5,2) DEFAULT 0.00
-- - total_rejections INTEGER DEFAULT 0
-- - original_rating DECIMAL(3,2)

-- نسخ التقييم الحالي كتقييم أصلي (تنفذ مرة واحدة فقط)
UPDATE users 
SET original_rating = COALESCE(rating_avg, 0.00)
WHERE original_rating IS NULL AND cap = 1;

-- ==========================================
-- 3. دالة حساب معدل الرفض وتحديث التقييم
-- ==========================================
CREATE OR REPLACE FUNCTION update_captain_rejection_stats(p_captain_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_total_rejections INTEGER;
  v_total_orders INTEGER;
  v_rejection_rate DECIMAL(5,2);
  v_penalty DECIMAL(3,2);
  v_original_rating DECIMAL(3,2);
BEGIN
  -- حساب عدد الطلبات المرفوضة (آخر 30 يوم)
  SELECT COUNT(*) INTO v_total_rejections
  FROM rejected_orders
  WHERE captain_id = p_captain_id
    AND rejected_at >= NOW() - INTERVAL '30 days';
  
  -- حساب إجمالي الطلبات المقبولة (آخر 30 يوم)
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE cap_id = p_captain_id
    AND insert_time >= NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'cap_accept', 'accepted');
  
  -- حساب معدل الرفض
  IF (v_total_orders + v_total_rejections) > 0 THEN
    v_rejection_rate := (v_total_rejections::DECIMAL / (v_total_orders + v_total_rejections)) * 100;
  ELSE
    v_rejection_rate := 0;
  END IF;
  
  -- حساب العقوبة على التقييم
  -- كل 10% رفض = -0.1 نقطة (بحد أقصى -1.0)
  v_penalty := LEAST(v_rejection_rate / 10 * 0.1, 1.0);
  
  -- الحصول على التقييم الأصلي
  SELECT COALESCE(original_rating, rating_avg, 0.00) INTO v_original_rating
  FROM users
  WHERE id = p_captain_id;
  
  -- تحديث بيانات الكابتن
  UPDATE users
  SET 
    total_rejections = v_total_rejections,
    rejection_rate = v_rejection_rate,
    -- تقليل التقييم بناءً على معدل الرفض (بحد أدنى 0.00)
    rating_avg = GREATEST(
      v_original_rating - v_penalty,
      0.00
    )
  WHERE id = p_captain_id;
  
  -- تسجيل في الـ log
  RAISE NOTICE 'Captain % stats updated: rejections=%, rate=%, penalty=%', 
    p_captain_id, v_total_rejections, v_rejection_rate, v_penalty;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. Trigger لتحديث الإحصائيات تلقائياً
-- ==========================================
CREATE OR REPLACE FUNCTION trigger_update_rejection_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث إحصائيات الكابتن عند إضافة رفض جديد
  PERFORM update_captain_rejection_stats(NEW.captain_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الـ trigger
DROP TRIGGER IF EXISTS after_reject_order ON rejected_orders;
CREATE TRIGGER after_reject_order
  AFTER INSERT ON rejected_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_rejection_stats();

-- ==========================================
-- 5. استعلامات مفيدة للتقارير
-- ==========================================

-- عرض الكباتن حسب معدل الرفض
-- SELECT 
--   u.id,
--   u.u_name as name,
--   u.phone,
--   u.rating_avg as current_rating,
--   u.original_rating,
--   u.total_rejections,
--   u.rejection_rate,
--   COUNT(o.id) as total_accepted_orders
-- FROM users u
-- LEFT JOIN orders o ON o.cap_id = u.id AND o.status = 'completed'
-- WHERE u.cap = 1 AND u.rejection_rate > 0
-- GROUP BY u.id
-- ORDER BY u.rejection_rate DESC;

-- أكثر أسباب الرفض شيوعاً
-- SELECT 
--   reason,
--   COUNT(*) as count,
--   ROUND(AVG(distance_km), 2) as avg_distance
-- FROM rejected_orders
-- WHERE rejected_at >= NOW() - INTERVAL '30 days'
-- GROUP BY reason
-- ORDER BY count DESC;

-- ==========================================
-- 6. منح الصلاحيات (إذا لزم الأمر)
-- ==========================================
-- GRANT SELECT, INSERT ON rejected_orders TO authenticated;
-- GRANT EXECUTE ON FUNCTION update_captain_rejection_stats TO authenticated;

-- ==========================================
-- تم الانتهاء من السكريبت
-- ==========================================
-- ملاحظات:
-- 1. تأكد من تعديل أسماء الجداول والأعمدة حسب بنية قاعدة البيانات الخاصة بك
-- 2. قد تحتاج لتعديل الـ foreign keys حسب العلاقات الموجودة
-- 3. يمكن تعديل فترة الـ 30 يوم حسب الحاجة
-- 4. العقوبة قابلة للتعديل في دالة update_captain_rejection_stats
