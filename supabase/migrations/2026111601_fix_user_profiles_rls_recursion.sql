-- ============================================================================
-- MIGRATION 03: FIX INFINITE RECURSION (42P17) ON public.user_profiles RLS
-- Project: wjdgaobhipkgzveidtra
-- ============================================================================
BEGIN;

-- 1. Hàm kiểm tra Quản trị viên tối cao (SECURITY DEFINER để không đệ quy RLS user_profiles)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
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
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 2. Loại bỏ mọi policy UPDATE/ALL gây đệ quy trực tiếp trên user_profiles
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'public.user_profiles'::regclass
      AND polcmd IN ('u', 'd', '*')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol.polname);
  END LOOP;
END $$;

-- 3. Policy UPDATE không đệ quy: Admin được duyệt/cập nhật toàn bộ hồ sơ cán bộ
CREATE POLICY "Admins manage user_profiles"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

COMMIT;
