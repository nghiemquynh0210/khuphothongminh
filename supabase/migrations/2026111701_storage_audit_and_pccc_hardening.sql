-- ============================================================================
-- Migration: 2026111701_storage_audit_and_pccc_hardening.sql
-- Khu phố 3, Phường An Phú — Chuẩn hóa Storage Buckets, Nhật ký Kiểm toán & Bảo vệ PII
-- ============================================================================

-- 1. Đảm bảo 04 Storage Buckets cho tệp đính kèm thực địa, địa chính, nhiệm vụ & biểu mẫu
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('field-reports', 'field-reports', true, 15728640),
  ('cadastral-docs', 'cadastral-docs', true, 20971520),
  ('task-attachments', 'task-attachments', true, 20971520),
  ('admin-forms', 'admin-forms', true, 20971520)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- 2. Mở rộng cột JSONB lưu trữ thông tin mở rộng cư dân & địa chính doanh nghiệp
alter table if exists public.residents
  add column if not exists extended_meta jsonb default '{}'::jsonb;

alter table if exists public.businesses
  add column if not exists cadastral_meta jsonb default '{}'::jsonb,
  add column if not exists timemark_meta jsonb default '{}'::jsonb,
  add column if not exists linked_household_id uuid references public.households(id) on delete set null;

-- 3. Bảng Nhật ký Kiểm toán dữ liệu công dân (Nghị định 13/2023/NĐ-CP)
create table if not exists public.audit_logs (
  id text primary key,
  actor_name text not null,
  actor_role text not null default 'Cán bộ',
  category text not null,
  action_title text not null,
  target_summary text not null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "Approved staff can read audit logs" on public.audit_logs;
create policy "Approved staff can read audit logs"
  on public.audit_logs for select
  using (public.is_approved_staff(auth.uid()));

drop policy if exists "Approved staff can insert audit logs" on public.audit_logs;
create policy "Approved staff can insert audit logs"
  on public.audit_logs for insert
  with check (public.is_approved_staff(auth.uid()));
