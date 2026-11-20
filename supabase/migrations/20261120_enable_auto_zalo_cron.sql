-- Kích hoạt bộ máy tự động nhắc Lịch họp (trước 60 phút) & Báo cáo định kỳ (trước 1 ngày + trước 60 phút)
-- qua Zalo OA Ban Điều Hành Khu Phố 3 (OA ID: 3124278810088361494)
-- Chạy trực tiếp 24/7 trên máy chủ Supabase Cloud (không phụ thuộc máy tính cá nhân, không bị tắt sau 60 ngày).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Xóa lịch cũ nếu đã tồn tại để chạy lại an toàn (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'kp3-auto-zalo-reminders-15m';

-- Chạy mỗi 15 phút trong khung giờ 06:00 -> 21:45 giờ Việt Nam (23, 0-14 UTC)
SELECT cron.schedule(
  'kp3-auto-zalo-reminders-15m',
  '*/15 23,0-14 * * *',
  $$
  SELECT net.http_get(
    url := 'https://bdhkp3.vercel.app/api/keepalive?check_meetings=1',
    headers := '{"Cache-Control":"no-cache"}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);

-- Kiểm tra danh sách job đang hoạt động
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'kp3-auto-zalo-reminders-15m';
