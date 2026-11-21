import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  MapPin,
  Printer,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { CommunityEvent } from "../types";
import { COVER_PRESETS } from "../components/news/newsHelpers";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { RecordDetailShell } from "../components/common/RecordDetailShell";
import { ConfirmModal, InlineNotice } from "../components/ui/ConfirmModal";
import { formatShortRecordId } from "../utils/kp3Utils";
import { loadPortalSetting, savePortalSetting } from "../utils/supabaseSync";
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

  useEffect(() => {
    let active = true;
    loadPortalSetting<Record<string, { registered: boolean; extraCount: number }>>(
      "event_rsvp_map"
    ).then((cloudMap) => {
      if (active && cloudMap && typeof cloudMap === "object") {
        setEventRsvpMap(cloudMap);
        try {
          localStorage.setItem(EVENT_RSVP_KEY, JSON.stringify(cloudMap));
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, []);

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
    savePortalSetting("event_rsvp_map", nextMap, true);

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
    <RecordDetailShell
      backLabel="Danh sách sự kiện"
      onBack={handleBack}
      navigation={
        events.length > 1 && currentIdx >= 0
          ? {
              hasPrev,
              hasNext,
              onPrev: handlePrev,
              onNext: handleNext,
              prevTitle: "Sự kiện trước",
              nextTitle: "Sự kiện tiếp theo",
              positionLabel: `${currentIdx + 1} / ${events.length}`,
            }
          : undefined
      }
      topRightSlot={
        <>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <Share2 size={13} className="text-slate-500" />
            <span>Chia sẻ</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <Printer size={13} className="text-slate-500" />
            <span>In sự kiện</span>
          </button>
        </>
      }
      noticeSlot={
        notice ? (
          <InlineNotice
            type={notice.type}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        ) : undefined
      }
      avatarSlot={
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/90 text-emerald-700 flex items-center justify-center">
          <CalendarDays size={20} />
        </div>
      }
      badgesSlot={
        <>
          <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
            {shortEvId}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-semibold border ${
              event.status === "Đã kết thúc" || event.status === "Đã hủy"
                ? "bg-slate-100 text-slate-700 border-slate-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {event.status}
          </span>
        </>
      }
      title={event.title}
      subtitleSlot={
        <>
          <span className="font-mono text-slate-700 font-medium">{event.dateTime}</span>
          <span>Chủ trì: <strong className="text-slate-800">{event.organizer}</strong></span>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span>{event.location}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <Users size={13} className="text-slate-400 shrink-0" />
            <span>{totalAttendees} người tham dự</span>
          </span>
        </>
      }
      actionsSlot={
        <>
          {event.status !== "Đã kết thúc" && event.status !== "Đã hủy" && (
            <button
              type="button"
              onClick={handleToggleRsvp}
              className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                rsvpInfo.registered
                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>{rsvpInfo.registered ? "Đã đăng ký" : "Đăng ký tham dự"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onEdit) {
                onEdit(event);
              } else {
                navigate(getEventEditPath(event.id, basePath));
              }
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs cursor-pointer transition-colors"
          >
            <Edit3 size={13} />
            <span>Sửa sự kiện</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteTarget(event)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-rose-600 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
          >
            <Trash2 size={13} />
            <span>Xóa</span>
          </button>
        </>
      }
      bodyClassName="p-5 sm:p-6 space-y-5"
    >
      {/* Banner Cover Image (Clean, without duplicate title overlay) */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200/90 aspect-[21/9] sm:aspect-[24/9] bg-slate-100">
        <img
          src={eventImg}
          alt={event.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Key-Value Details */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <CalendarDays size={14} />
          </span>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Thông tin tổ chức &amp; Địa điểm
          </h4>
        </div>
        <DetailGrid compact>
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
      <div className="space-y-2.5 pt-3 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
          Nội dung chương trình &amp; Kế hoạch chi tiết
        </h4>
        <div className="bg-slate-50 rounded-xl border border-slate-200/70 p-3.5 text-slate-700 leading-relaxed text-xs whitespace-pre-line">
          {event.description || "Chưa có mô tả chi tiết chương trình sự kiện."}
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
    </RecordDetailShell>
  );
}
