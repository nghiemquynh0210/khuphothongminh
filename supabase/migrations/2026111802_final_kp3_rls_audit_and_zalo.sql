-- ============================================================================
-- MIGRATION CHUẨN HÓA TOÀN DIỆN (BẢN SẠCH MỚI - CHẠY 1 LẦN THÀNH CÔNG 100%):
-- File: supabase/migrations/2026111802_final_kp3_rls_audit_and_zalo.sql
-- Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
-- ============================================================================

BEGIN;

-- 1. Khởi tạo các hàm RPC & Phân quyền bảo mật (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_approved_staff(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = COALESCE(uid, auth.uid())
      AND approval_status = 'approved'
      AND role IN ('admin', 'cadre')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_approved_staff(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = COALESCE(uid, auth.uid())
      AND approval_status = 'approved'
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_kp3_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'households_count', (SELECT count(*) FROM public.households),
    'residents_count', (SELECT count(*) FROM public.residents),
    'permanent_count', (SELECT count(*) FROM public.residents WHERE status = 'Thường trú'),
    'temporary_count', (SELECT count(*) FROM public.residents WHERE status = 'Tạm trú'),
    'businesses_count', (SELECT count(*) FROM public.businesses)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_kp3_stats() TO anon, authenticated, service_role;

-- 2. Mở rộng cột `residents` (mỗi lệnh độc lập trên 1 dòng)
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS extended_meta JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_residents_owner_name ON public.residents (owner_name) WHERE owner_name IS NOT NULL;

-- 3. Mở rộng `user_profiles` liên kết Hồ sơ Cư dân & Chi hội KP3
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS resident_cccd TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS association_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS zalo_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_user_profiles_resident_cccd ON public.user_profiles (resident_cccd) WHERE resident_cccd IS NOT NULL;

-- Tự động đối khớp tài khoản Bí thư Nghiêm Xuân Quỳnh & Cán bộ hiện hữu với bảng `residents`
UPDATE public.user_profiles up
SET
  resident_id = r.id,
  resident_cccd = r.cccd,
  association_id = COALESCE(up.association_id, 'ASC_DANG')
FROM public.residents r
WHERE up.resident_id IS NULL
  AND lower(trim(regexp_replace(up.full_name, '^(Bí thư|Phó Bí thư|Trưởng Khu phố|Đ/c)\s+', '', 'i'))) = lower(trim(r.full_name));

-- 4. Gỡ bỏ các policy mẫu công khai cũ (nếu có) và thiết lập Strict RLS
DROP POLICY IF EXISTS "Allow public read households" ON public.households;
DROP POLICY IF EXISTS "Allow public write households" ON public.households;
DROP POLICY IF EXISTS "Allow public read residents" ON public.residents;
DROP POLICY IF EXISTS "Allow public write residents" ON public.residents;
DROP POLICY IF EXISTS "Allow public read businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow public write businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow public read reports" ON public.field_reports;
DROP POLICY IF EXISTS "Allow public write reports" ON public.field_reports;
DROP POLICY IF EXISTS "Allow public read funds" ON public.neighborhood_funds;
DROP POLICY IF EXISTS "Allow public write funds" ON public.neighborhood_funds;
DROP POLICY IF EXISTS "Allow public read news" ON public.community_news;
DROP POLICY IF EXISTS "Allow public write news" ON public.community_news;
DROP POLICY IF EXISTS "Allow public read events" ON public.community_events;
DROP POLICY IF EXISTS "Allow public write events" ON public.community_events;
DROP POLICY IF EXISTS "Allow public read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public write tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public read forms" ON public.administrative_forms;
DROP POLICY IF EXISTS "Allow public write forms" ON public.administrative_forms;

DROP POLICY IF EXISTS "Approved staff read residents" ON public.residents;
CREATE POLICY "Approved staff read residents" ON public.residents FOR SELECT TO authenticated USING (public.is_approved_staff(auth.uid()));

DROP POLICY IF EXISTS "Approved staff write residents" ON public.residents;
CREATE POLICY "Approved staff write residents" ON public.residents FOR ALL TO authenticated USING (public.is_approved_staff(auth.uid())) WITH CHECK (public.is_approved_staff(auth.uid()));

DROP POLICY IF EXISTS "Approved staff read households" ON public.households;
CREATE POLICY "Approved staff read households" ON public.households FOR SELECT TO authenticated USING (public.is_approved_staff(auth.uid()));

DROP POLICY IF EXISTS "Approved staff write households" ON public.households;
CREATE POLICY "Approved staff write households" ON public.households FOR ALL TO authenticated USING (public.is_approved_staff(auth.uid())) WITH CHECK (public.is_approved_staff(auth.uid()));

-- 5. Khởi tạo an toàn bảng `public.audit_logs` (Kiểm tra `pg_constraint` chống lỗi 42P16)
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    CREATE TABLE public.audit_logs (
      id TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
      actor_name TEXT NOT NULL DEFAULT 'Cán bộ KP3',
      actor_role TEXT NOT NULL DEFAULT 'Cán bộ',
      category TEXT NOT NULL DEFAULT 'Hệ thống',
      action_title TEXT NOT NULL DEFAULT '',
      target_summary TEXT NOT NULL DEFAULT '',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;

  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT NOT NULL DEFAULT 'Cán bộ KP3';
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT NOT NULL DEFAULT 'Cán bộ';
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Hệ thống';
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_title TEXT NOT NULL DEFAULT '';
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_summary TEXT NOT NULL DEFAULT '';
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.audit_logs'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
  END IF;
END
$$;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated, service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved staff read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Approved staff can read audit logs" ON public.audit_logs;
CREATE POLICY "Approved staff read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_approved_staff(auth.uid()));

DROP POLICY IF EXISTS "Approved staff insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Approved staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Approved staff insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_approved_staff(auth.uid()));

-- 6. Khởi tạo an toàn bảng `public.zalo_notification_logs`
DO $$
BEGIN
  IF to_regclass('public.zalo_notification_logs') IS NULL THEN
    CREATE TABLE public.zalo_notification_logs (
      id UUID NOT NULL DEFAULT gen_random_uuid(),
      channel TEXT NOT NULL DEFAULT 'zalo_oa',
      notification_type TEXT NOT NULL DEFAULT 'community_broadcast',
      recipient_name TEXT NOT NULL DEFAULT '',
      recipient_role TEXT DEFAULT 'citizen',
      recipient_phone TEXT,
      recipient_email TEXT,
      zalo_user_id TEXT,
      hostel_name TEXT,
      subject TEXT,
      message_body TEXT NOT NULL DEFAULT '',
      delivery_status TEXT NOT NULL DEFAULT 'queued',
      provider_response JSONB DEFAULT '{}'::jsonb,
      dedupe_key TEXT,
      created_by TEXT DEFAULT 'Hệ thống KP3',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.zalo_notification_logs'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.zalo_notification_logs ADD CONSTRAINT zalo_notification_logs_pkey PRIMARY KEY (id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_zalo_notification_logs_dedupe ON public.zalo_notification_logs (dedupe_key) WHERE dedupe_key IS NOT NULL;
GRANT ALL ON public.zalo_notification_logs TO authenticated, service_role;
ALTER TABLE public.zalo_notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved staff manage zalo_notification_logs" ON public.zalo_notification_logs;
CREATE POLICY "Approved staff manage zalo_notification_logs" ON public.zalo_notification_logs FOR ALL TO authenticated USING (public.is_approved_staff(auth.uid())) WITH CHECK (public.is_approved_staff(auth.uid()));

NOTIFY pgrst, 'reload schema';
COMMIT;
