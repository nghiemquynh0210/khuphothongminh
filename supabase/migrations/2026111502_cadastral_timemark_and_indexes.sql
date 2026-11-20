-- ============================================================================
-- MIGRATION 02: EXTENDED CADASTRAL/TIMEMARK METADATA & PERFORMANCE INDEXES
-- Project: wjdgaobhipkgzveidtra
-- ============================================================================
BEGIN;

-- 1. Mở rộng cột JSONB lưu trữ OCR Sổ đỏ & Xác thực Timemark trên Sổ hộ khẩu
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS cadastral_meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timemark_meta jsonb DEFAULT '{}'::jsonb;

-- 2. Mở rộng cột JSONB lưu trữ OCR Sổ đỏ, Timemark & Liên kết Hộ dân trên Cơ sở kinh doanh
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS cadastral_meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timemark_meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_household_id uuid REFERENCES public.households(id) ON DELETE SET NULL;

-- 3. Composite Indexes tối ưu phân trang cursor/range & lọc cảnh báo tạm trú trên 11.632+ nhân khẩu
CREATE INDEX IF NOT EXISTS idx_residents_created_id ON public.residents (created_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_residents_household_code ON public.residents (household_code);
CREATE INDEX IF NOT EXISTS idx_residents_status_exp ON public.residents (status, temporary_exp_date);

COMMIT;
