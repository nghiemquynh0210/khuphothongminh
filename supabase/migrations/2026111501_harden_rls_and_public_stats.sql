-- ============================================================================
-- MIGRATION 01: HARDEN SUPABASE RLS & PUBLIC AGGREGATE RPC (KP3 AN PHU)
-- Project: wjdgaobhipkgzveidtra
-- ============================================================================
BEGIN;

-- 1. Hàm kiểm tra cán bộ đã được phê duyệt (STABLE + SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_approved_staff(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = uid
      AND approval_status = 'approved'
      AND role IN ('admin', 'cadre')
  );
$$;

-- 2. Hàm RPC trả số liệu thống kê tổng hợp an toàn cho Cổng Cư dân (không lộ PII)
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

GRANT EXECUTE ON FUNCTION public.get_public_kp3_stats() TO anon, authenticated;

-- 3. Khóa quyền SELECT bảng nhạy cảm chỉ cho Cán bộ đã duyệt
DROP POLICY IF EXISTS "Cho phép đọc dữ liệu cư dân" ON public.residents;
DROP POLICY IF EXISTS "Allow public read residents" ON public.residents;
DROP POLICY IF EXISTS "Public read residents" ON public.residents;
DROP POLICY IF EXISTS "Approved staff read residents" ON public.residents;
CREATE POLICY "Approved staff read residents"
  ON public.residents FOR SELECT
  TO authenticated
  USING (public.is_approved_staff(auth.uid()));

DROP POLICY IF EXISTS "Cho phép đọc dữ liệu hộ khẩu" ON public.households;
DROP POLICY IF EXISTS "Allow public read households" ON public.households;
DROP POLICY IF EXISTS "Public read households" ON public.households;
DROP POLICY IF EXISTS "Approved staff read households" ON public.households;
CREATE POLICY "Approved staff read households"
  ON public.households FOR SELECT
  TO authenticated
  USING (public.is_approved_staff(auth.uid()));

DROP POLICY IF EXISTS "Allow public read user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.user_profiles;
CREATE POLICY "Users read own profile or admin reads all"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_approved_staff(auth.uid()));

DROP POLICY IF EXISTS "Allow public read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Approved staff read tasks" ON public.tasks;
CREATE POLICY "Approved staff read tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (public.is_approved_staff(auth.uid()));

-- 4. Đảm bảo anon không đọc được cột reporter_phone trên field_reports
REVOKE SELECT (reporter_phone) ON public.field_reports FROM anon;

COMMIT;
