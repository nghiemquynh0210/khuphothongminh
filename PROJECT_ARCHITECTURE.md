# BẢN ĐỒ KIẾN TRÚC DỰ ÁN (PROJECT ARCHITECTURE MAP)
**Hệ thống Quản lý Thông minh & Cổng Dịch vụ Cư dân số KP3 An Phú**

---

## 1. SƠ ĐỒ TỔNG THỂ HỆ THỐNG (SYSTEM OVERVIEW)

```mermaid
flowchart TD
    subgraph ClientLayer["Lớp Giao Diện Người Dùng (Frontend Client)"]
        Landing["Cổng Dịch Vụ Cư Dân Số (CitizenLandingPage)"]
        Dashboard["Bàn Làm Việc Điều Hành Cán Bộ (Dashboard)"]
        ResidentModule["Phân Hệ Quản Lý Dân Cư (11.229 Dân)"]
        HouseholdModule["Phân Hệ Sổ Hộ Khẩu (7.815 Hộ)"]
        BusinessModule["Cơ Sở Kinh Doanh & Nhà Trọ (118 Cơ sở)"]
        PartyModule["Tổ Chức Đảng & Chi Hội (PartyBranch)"]
        GisModule["Bản Đồ Số GIS KP3 (Leaflet WGS-84)"]
        NewsModule["Truyền Thông & Tin Tức (Zalo OA Sync)"]
        SettingsModule["Cài Đặt, Phân Quyền & Zalo OA Hub"]
    end

    subgraph ApiLayer["Lớp Serverless API & Backend (Node.js/Express)"]
        ChatApi["/api/chat (Gemini 2.5 Flash)"]
        OcrApi["/api/ocr-document (Multimodal Vision OCR)"]
        NotifyApi["/api/notifications (Zalo OA v2.0 / Email Resend)"]
        StaffApi["/api/staff-admin (Xác thực & Duyệt Cán bộ)"]
        UploadApi["/api/upload-storage (Supabase Storage Token)"]
        KeepaliveApi["/api/keepalive (Tự động nhắc lịch 60m & Giữ ấm CSDL)"]
    end

    subgraph DataLayer["Lớp Dữ Liệu & Điện Toán Đám Mây"]
        SupabasePg[("PostgreSQL CSDL Supabase (RLS Enabled)")]
        StorageBuckets["Supabase Storage Buckets (Ảnh, Scan, PDF)"]
        ZaloPlatform["Zalo OA Platform (OA ID: 3124278810088361494)"]
        GoogleGenAi["Google GenAI API (Gemini Vision / Flash)"]
    end

    ClientLayer --> ApiLayer
    ClientLayer --> SupabasePg
    ApiLayer --> SupabasePg
    ApiLayer --> StorageBuckets
    ApiLayer --> ZaloPlatform
    ApiLayer --> GoogleGenAi
```

---

## 2. KIẾN TRÚC DỮ LIỆU & QUAN HỆ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

```mermaid
erDiagram
    user_profiles ||--o{ field_reports : "gửi/tiếp nhận"
    user_profiles ||--o{ audit_logs : "thực hiện"
    households ||--o{ residents : "chứa các thành viên"
    businesses ||--o{ residents : "lưu trú thực tế (nhà trọ)"
    work_schedules ||--o{ tasks : "giao nhiệm vụ"
    community_news ||--o{ field_reports : "tương tác"

    user_profiles {
        uuid id PK
        string full_name
        string role
        string approval_status
        string cccd
        string phone
        string position
    }
    households {
        string id PK
        string code
        string owner_name
        string address
        string residency_type
        int member_count
    }
    residents {
        uuid id PK
        string full_name
        string cccd
        string phone
        string gender
        date birth_date
        string permanent_address
        string current_address
        string management_status
        date temporary_exp_date
        string household_id FK
    }
    businesses {
        string id PK
        string name
        string owner_name
        string phone
        string address
        boolean is_accommodation
        int room_count
        int guest_count
        boolean pccc_passed
    }
    work_schedules {
        string id PK
        string title
        date meeting_date
        string location
        string attendees
        boolean reminded_zalo_oa
    }
```

---

## 3. CƠ CHẾ ĐIỀU HƯỚNG & PHÂN QUYỀN (ROUTING & ACCESS CONTROL)

1. **Khách / Cư dân (Public / Anonymous):**
   - Truy cập trang chủ Cổng Dịch vụ Cư dân số (`/`).
   - Tra cứu Sổ hộ khẩu điện tử công khai (đã khử PII).
   - Tra cứu Quỹ khu phố công khai, đọc Tin tức cộng đồng (`/news`).
   - Gửi phản ánh hiện trường 1022 và tra cứu tiến độ xử lý.
2. **Cán bộ được phê duyệt (`role: cadre`, `approval_status: approved`):**
   - Đăng nhập qua Supabase Auth.
   - Truy cập toàn bộ Bàn làm việc Điều hành (`/dashboard/*`).
   - Tra cứu và quản lý 11.229 nhân khẩu, 7.815 hộ gia đình, 118 cơ sở kinh doanh.
   - Xem và thao tác Lịch công tác tuần, phân công nhiệm vụ, Quản lý Chi bộ.
3. **Quản trị viên tối cao (`role: admin`, `approval_status: approved`):**
   - Duyệt và phân quyền tài khoản Cán bộ mới đăng ký.
   - Quản trị cấu hình Zalo OA Hub, phát thông báo khẩn cấp toàn khu phố.
   - Kiểm tra nhật ký biến động hệ thống (`audit_logs`).
