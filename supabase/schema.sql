-- =========================================================================
-- HỆ THỐNG QUẢN LÝ THÔNG MINH KHU PHỐ 3, PHƯỜNG AN PHÚ, TP. THỦ ĐỨC
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG SỔ HỘ KHẨU (Households)
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,                  -- Ví dụ: HK-301, HK-302
  owner_name VARCHAR(255) NOT NULL,                  -- Tên chủ hộ
  owner_cccd VARCHAR(20) NOT NULL,                   -- Số CCCD chủ hộ
  phone VARCHAR(20),                                 -- Số điện thoại
  address TEXT NOT NULL,                             -- Địa chỉ nhà
  area VARCHAR(100),                                 -- Khu vực / Tuyến hẻm
  member_count INT DEFAULT 1,                        -- Số nhân khẩu
  coordinates VARCHAR(100),                          -- Tọa độ định vị GPS / DMS
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG DÂN CƯ / NHÂN KHẨU (Residents)
CREATE TABLE IF NOT EXISTS residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  household_code VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  cccd VARCHAR(20) UNIQUE NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('Nam', 'Nữ')),
  birth_date DATE,
  phone VARCHAR(20),
  address TEXT NOT NULL,
  relation_to_owner VARCHAR(50) DEFAULT 'Chủ hộ',     -- Chủ hộ, Vợ, Chồng, Con, v.v.
  status VARCHAR(50) DEFAULT 'Thường trú',            -- Thường trú, Tạm trú, Tạm vắng
  occupation VARCHAR(100),
  workplace TEXT,
  nationality VARCHAR(100) DEFAULT 'Việt Nam',
  is_party_member BOOLEAN DEFAULT FALSE,              -- Đảng viên
  is_policy_household BOOLEAN DEFAULT FALSE,          -- Gia đình chính sách
  is_elderly BOOLEAN DEFAULT FALSE,                   -- Người cao tuổi
  is_poor_household BOOLEAN DEFAULT FALSE,            -- Hộ nghèo/Cận nghèo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG CƠ SỞ KINH DOANH & DOANH NGHIỆP (Businesses)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code VARCHAR(50) UNIQUE NOT NULL,          -- HKD-KP3-001, DN-KP3-001
  name VARCHAR(255) NOT NULL,                         -- Tên cơ sở / công ty
  tax_code VARCHAR(50),                               -- Mã số thuế
  business_type VARCHAR(100) DEFAULT 'Hộ kinh doanh', -- Hộ kinh doanh, TNHH, Cổ phần
  industry_group VARCHAR(100),                        -- Nhóm ngành nghề
  owner_name VARCHAR(255),                            -- Đại diện pháp luật / Chủ hộ
  phone VARCHAR(20),
  address TEXT NOT NULL,
  license_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Đang hoạt động',        -- Đang hoạt động, Tạm ngưng, Chờ duyệt
  safety_certified BOOLEAN DEFAULT TRUE,              -- Đạt an toàn PCCC & VSATTP
  employee_count INT DEFAULT 1,
  image_url TEXT,
  coordinates VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG PHẢN ÁNH HIỆN TRƯỜNG 1022 (Field Reports)
CREATE TABLE IF NOT EXISTS field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,                     -- Rác thải, Tiếng ồn, Trật tự đô thị, Ngập nước
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  reporter_name VARCHAR(255),
  reporter_phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'Đã tiếp nhận',          -- Đã tiếp nhận, Đang xử lý, Đã giải quyết
  priority VARCHAR(50) DEFAULT 'Bình thường',         -- Bình thường, Khẩn cấp
  image_urls TEXT[],
  response_content TEXT,                              -- Phản hồi từ Ban điều hành khu phố
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 5. BẢNG QUỸ KHU PHỐ & THU CHI (Funds & Transactions)
CREATE TABLE IF NOT EXISTS neighborhood_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('thu', 'chi')),
  fund_name VARCHAR(100) NOT NULL,                    -- Quỹ Khuyến học, Quỹ Vì người nghèo...
  household_code VARCHAR(50),
  payer_or_receiver VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  evidence_code VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Đã nộp',                -- Đã nộp, Chưa nộp
  approved_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Bật RLS và cấp quyền đọc công khai (hoặc qua service role)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_funds ENABLE ROW LEVEL SECURITY;

-- Cấp quyền truy cập cho Anon / Authenticated Users
CREATE POLICY "Cho phép đọc dữ liệu công khai" ON businesses FOR SELECT USING (true);
CREATE POLICY "Cho phép cư dân gửi phản ánh" ON field_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép đọc phản ánh hiện trường" ON field_reports FOR SELECT USING (true);
CREATE POLICY "Cho phép cán bộ quản lý đầy đủ hộ khẩu" ON households FOR ALL USING (true);
CREATE POLICY "Cho phép cán bộ quản lý đầy đủ dân cư" ON residents FOR ALL USING (true);
CREATE POLICY "Cho phép đọc và quản lý quỹ" ON neighborhood_funds FOR ALL USING (true);
