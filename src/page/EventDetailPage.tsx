import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  MapPin,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { CommunityEvent } from "../types";
import { COVER_PRESETS } from "../components/news/newsHelpers";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { ConfirmModal, InlineNotice } from "../components/ui/ConfirmModal";
import { formatShortRecordId } from "../utils/kp3Utils";
import {
  ROUTES,
  getEventDetailPath,
  getEventEditPath,
  navigate,
} from "../routes";

const EVENT_RSVP_KEY = "kp3_event_rsvp_v1";

export interface EventDetailPageProps {
  eventId: string;
  events: CommunityEvent[];
  isDataLoading?: boolean;
  basePath?: string;
  onBack?: () => void;
  onEdit?: (event: CommunityEvent) => void;
  onDelete?: (eventId: string, eventTitle: string) => void;
  onSelectEvent?: (event: CommunityEvent) => void;
}

export default function EventDetailPage({
  eventId,
  events,
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_CULTURAL,
  onBack,
  onEdit,
  onDelete,
  onSelectEvent,
}: EventDetailPageProps) {
  const event = useMemo(() => {
    return events.find((e) => e.id === eventId) || null;
  }, [events, eventId]);

  const [notice, setNotice] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommunityEvent | null>(null);

  const [eventRsvpMap, setEventRsvpMap] = useState<
    Record<string, { registered: boolean; extraCount: number }>
  >(() => {
    try {
      const saved = localStorage.getItem(EVENT_RSVP_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const currentIdx = useMemo(() => {
    if (!event) return -1;
    return events.findIndex((e) => e.id === event.id);
  }, [events, event]);

  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < events.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      const prev = events[currentIdx - 1];
      if (onSelectEvent) {
        onSelectEvent(prev);
      } else {
        navigate(getEventDetailPath(prev.id, basePath));
      }
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const next = events[currentIdx + 1];
      if (onSelectEvent) {
        onSelectEvent(next);
      } else {
        navigate(getEventDetailPath(next.id, basePath));
      }
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(basePath);
    }
  };

  const handleToggleRsvp = () => {
    if (!event) return;
    const current = eventRsvpMap[event.id] || { registered: false, extraCount: 0 };
    const nextRegistered = !current.registered;
    const nextMap = {
      ...eventRsvpMap,
      [event.id]: {
        registered: nextRegistered,
        extraCount: Math.max(0, current.extraCount + (nextRegistered ? 1 : -1)),
      },
    };
    setEventRsvpMap(nextMap);
    try {
      localStorage.setItem(EVENT_RSVP_KEY, JSON.stringify(nextMap));
    } catch {}

    setNotice({
      type: "success",
      message: nextRegistered
        ? `Đã đăng ký tham dự sự kiện "${event.title}".`
        : `Đã hủy đăng ký tham dự sự kiện "${event.title}".`,
    });
  };

  const handleShare = async () => {
    if (!event) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Sự kiện Khu phố 3: ${event.title}`,
          url,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice({
        type: "success",
        message: "Đã sao chép liên kết sự kiện vào khay nhớ tạm.",
      });
    } catch {
      setNotice({
        type: "warning",
        message: "Không thể sao chép liên kết.",
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetTitle = deleteTarget.title;
    setDeleteTarget(null);

    if (onDelete) {
      onDelete(targetId, targetTitle);
    } else {
      navigate(basePath);
    }
  };

  if (isDataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Đang tải sự kiện..."
          description="Hệ thống đang đồng bộ dữ liệu sự kiện & lịch hội trường KP3"
          badgeText="Sự kiện KP3"
        />
        <LoadingFade
          title="Đang tải dữ liệu sự kiện..."
          subtitle="Vui lòng chờ trong giây lát"
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Không tìm thấy sự kiện"
          description="Sự kiện có thể đã bị xóa hoặc đường dẫn không hợp lệ"
          badgeText="Lỗi sự kiện"
        />
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Không tìm thấy sự kiện có mã #{eventId}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Vui lòng kiểm tra lại liên kết hoặc quay lại trang danh sách Bản tin &amp; Sự kiện.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const shortEvId = formatShortRecordId(event.id, "EV");
  const rsvpInfo = eventRsvpMap[event.id] || { registered: false, extraCount: 0 };
  const totalAttendees = (event.expectedAttendees || 0) + (rsvpInfo.extraCount || 0);
  const eventImg =
    event.imageUrl && !event.imageUrl.includes("1555696958")
      ? event.imageUrl
      : COVER_PRESETS[6]?.url || "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {notice && (
        <InlineNotice
          type={notice.type}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title={event.title}
        description="Lịch hội họp, phong trào & Hoạt động văn hóa - cộng đồng Khu phố 3"
        badgeText={`Sự kiện KP3 • ${event.status}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {events.length > 1 && currentIdx >= 0 && (
              <div className="hidden sm:inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  title="Sự kiện trước"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 text-xs font-mono font-medium text-slate-500">
                  {currentIdx + 1}/{events.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext}
                  title="Sự kiện tiếp theo"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors shadow-sm"
            >
              <ArrowLeft size={15} /> Quay lại
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors shadow-sm"
            >
              <Share2 size={15} /> Chia sẻ
            </button>

            <button
              type="button"
              onClick={() => {
                if (onEdit) {
                  onEdit(event);
                } else {
                  navigate(getEventEditPath(event.id, basePath));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm cursor-pointer transition-colors"
            >
              <Edit3 size={15} /> Sửa sự kiện
            </button>

            <button
              type="button"
              onClick={() => setDeleteTarget(event)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl cursor-pointer transition-colors"
            >
              <Trash2 size={15} /> Xóa
            </button>
          </div>
        }
      />

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
        {/* Banner Cover Image */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[21/9] sm:aspect-[24/9] bg-slate-900 group">
          <img
            src={eventImg}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3 text-white">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white border border-white/30">
                  MÃ: {shortEvId}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/80 backdrop-blur-md text-white border border-emerald-400/40">
                  {event.status}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black drop-shadow-md text-white">
                {event.title}
              </h1>
            </div>

            {event.status !== "Đã kết thúc" && event.status !== "Đã hủy" && (
              <button
                type="button"
                onClick={handleToggleRsvp}
                className={`min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-lg cursor-pointer transition-colors ${
                  rsvpInfo.registered
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-400/40"
                    : "bg-white hover:bg-slate-100 text-slate-900 border border-white"
                }`}
              >
                <CheckCircle2 size={16} />
                <span>{rsvpInfo.registered ? "Đã đăng ký tham dự" : "Đăng ký tham dự"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Key-Value Details */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <CalendarDays size={14} className="text-emerald-600" /> Thông tin tổ chức &amp; Địa điểm
          </h3>
          <DetailGrid>
            <DetailRow label="Thời gian tổ chức" value={event.dateTime} isMono />
            <DetailRow label="Đơn vị chủ trì" value={event.organizer} />
            <DetailRow label="Địa điểm tổ chức" value={event.location} colSpan={2} />
            <DetailRow
              label="Số lượng dự kiến"
              value={`${totalAttendees} người tham dự`}
              isNumeric
            />
            <DetailRow label="Trạng thái" value={event.status} />
          </DetailGrid>
        </div>

        {/* Content Description */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Nội dung chương trình &amp; Kế hoạch chi tiết
          </span>
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 text-slate-800 leading-relaxed text-sm whitespace-pre-line font-medium">
            {event.description || "Chưa có mô tả chi tiết chương trình sự kiện."}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {hasPrev && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
              >
                <ChevronLeft size={14} /> Sự kiện trước
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
              >
                Sự kiện kế tiếp <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Xác nhận xóa sự kiện"
          description={`Bạn có chắc chắn muốn xóa sự kiện "${deleteTarget.title}" không? Thao tác này sẽ gỡ bỏ sự kiện khỏi lịch sinh hoạt khu phố.`}
          confirmLabel="Xóa sự kiện"
          cancelLabel="Hủy bỏ"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
