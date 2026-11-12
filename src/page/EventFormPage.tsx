import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Save,
  Users,
  X,
} from "lucide-react";
import { CommunityEvent } from "../types";
import { COVER_PRESETS } from "../components/news/newsHelpers";
import { PageHeader } from "../components/common/PageHeader";
import { ReportSelect } from "../components/reports/ReportSelect";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import {
  ROUTES,
  getEventDetailPath,
  navigate,
} from "../routes";

export const CULTURAL_VENUES = [
  "Nhà Văn hóa Khu phố 3 (Hội trường 80 chỗ)",
  "Phòng Sinh hoạt Chi bộ KP3 (30 chỗ)",
  "Sân Nhà Văn hóa Khu phố 3 (120 chỗ)",
  "Điểm sinh hoạt cụm dân cư KP3",
];

export interface EventFormPageProps {
  mode: "create" | "edit";
  eventId?: string;
  events: CommunityEvent[];
  isDataLoading?: boolean;
  basePath?: string;
  onAddEvent?: (newEvent: CommunityEvent) => void;
  onUpdateEvent?: (updatedEvent: CommunityEvent) => void;
  onCancel?: () => void;
  onSaved?: (savedEvent: CommunityEvent, mode: "create" | "edit") => void;
}

export default function EventFormPage({
  mode,
  eventId,
  events,
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_CULTURAL,
  onAddEvent,
  onUpdateEvent,
  onCancel,
  onSaved,
}: EventFormPageProps) {
  const existingEvent = useMemo(() => {
    if (mode === "edit" && eventId) {
      return events.find((e) => e.id === eventId) || null;
    }
    return null;
  }, [mode, eventId, events]);

  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("Ban Điều hành Khu phố 3");
  const [expectedAttendees, setExpectedAttendees] = useState(50);
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState(CULTURAL_VENUES[0]);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<CommunityEvent["status"]>("Sắp diễn ra");

  const [notice, setNotice] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && existingEvent) {
      setTitle(existingEvent.title || "");
      setOrganizer(existingEvent.organizer || "Ban Điều hành Khu phố 3");
      setExpectedAttendees(existingEvent.expectedAttendees || 50);
      setDateTime(existingEvent.dateTime || "");
      setLocation(existingEvent.location || CULTURAL_VENUES[0]);
      setDescription(existingEvent.description || "");
      setImageUrl(existingEvent.imageUrl || COVER_PRESETS[6]?.url || "");
      setStatus(existingEvent.status || "Sắp diễn ra");
    } else if (mode === "create") {
      setTitle("");
      setOrganizer("Ban Điều hành Khu phố 3");
      setExpectedAttendees(50);
      setDateTime("");
      setLocation(CULTURAL_VENUES[0]);
      setDescription("");
      setImageUrl(COVER_PRESETS[6]?.url || "");
      setStatus("Sắp diễn ra");
    }
  }, [mode, existingEvent]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === "edit" && eventId) {
      navigate(getEventDetailPath(eventId, basePath));
    } else {
      navigate(basePath);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setNotice({
        type: "error",
        message: "Vui lòng nhập tên sự kiện / hoạt động phong trào.",
      });
      return;
    }
    if (!dateTime.trim()) {
      setNotice({
        type: "error",
        message: "Vui lòng nhập thời gian tổ chức sự kiện.",
      });
      return;
    }
    if (!description.trim()) {
      setNotice({
        type: "error",
        message: "Vui lòng nhập nội dung chi tiết chương trình.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "edit" && existingEvent) {
        const updatedEvent: CommunityEvent = {
          ...existingEvent,
          title: title.trim(),
          organizer: organizer.trim() || "Ban Điều hành Khu phố 3",
          dateTime: dateTime.trim(),
          location,
          expectedAttendees: Number(expectedAttendees) || 50,
          description: description.trim(),
          imageUrl: imageUrl.trim() || COVER_PRESETS[6]?.url || "",
          status,
        };

        if (onUpdateEvent) {
          onUpdateEvent(updatedEvent);
        }
        if (onSaved) {
          onSaved(updatedEvent, "edit");
        } else {
          navigate(getEventDetailPath(updatedEvent.id, basePath));
        }
      } else {
        const baseNum = events.length + 1;
        let generatedId = "EV" + baseNum.toString().padStart(3, "0");
        if (events.some((ev) => ev.id === generatedId)) {
          generatedId = "EV" + Date.now().toString().slice(-4);
        }

        const newEvent: CommunityEvent = {
          id: generatedId,
          title: title.trim(),
          organizer: organizer.trim() || "Ban Điều hành Khu phố 3",
          dateTime: dateTime.trim(),
          location,
          status: "Sắp diễn ra",
          expectedAttendees: Number(expectedAttendees) || 50,
          description: description.trim(),
          imageUrl: imageUrl.trim() || COVER_PRESETS[6]?.url || "",
        };

        if (onAddEvent) {
          onAddEvent(newEvent);
        }
        if (onSaved) {
          onSaved(newEvent, "create");
        } else {
          navigate(getEventDetailPath(newEvent.id, basePath));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={mode === "edit" ? "Chỉnh sửa Sự Kiện" : "Lên Lịch Hoạt Động & Mượn Hội Trường"}
          description="Quản lý không gian sinh hoạt cộng đồng, hội họp dân cư"
          badgeText="Sự kiện KP3"
        />
        <LoadingFade
          title="Đang tải dữ liệu sự kiện..."
          subtitle="Vui lòng chờ trong giây lát"
        />
      </div>
    );
  }

  if (mode === "edit" && !existingEvent) {
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {notice && (
        <InlineNotice
          type={notice.type}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title={
          mode === "edit"
            ? `Chỉnh sửa sự kiện: ${existingEvent?.title || ""}`
            : "Lên lịch hoạt động & Đặt chỗ Nhà văn hóa"
        }
        description="Quản lý không gian sinh hoạt cộng đồng, hội họp dân cư Khu phố 3"
        badgeText="Sự kiện KP3"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors shadow-sm"
            >
              <ArrowLeft size={15} /> Quay lại
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm cursor-pointer transition-colors disabled:opacity-50"
            >
              <Save size={15} />
              {mode === "edit" ? "Lưu cập nhật" : "Đăng ký Đặt chỗ"}
            </button>
          </div>
        }
      />

      {/* Main Form Container */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-xs"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
            <CalendarDays size={22} />
          </div>
          <div>
            <h3 className="font-black text-base text-slate-800">
              {mode === "edit"
                ? "Thông tin sự kiện & Lịch mượn hội trường"
                : "Đăng ký lịch hội họp & Sinh hoạt cộng đồng"}
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Đảm bảo cơ sở vật chất, âm thanh ánh sáng và bàn giao đúng quy chế KP3
            </p>
          </div>
        </div>

        {/* Event Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Tên sự kiện / Hoạt động phong trào <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ví dụ: Họp chi bộ định kỳ tháng 8, Lớp sinh hoạt kỹ năng hè thiếu nhi..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Organizer & Expected Attendees */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Đơn vị chủ trì <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Ban Điều hành KP3, Chi hội Phụ nữ, Đoàn Thanh niên..."
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Dự kiến số người tham dự <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min={1}
                max={500}
                value={expectedAttendees}
                onChange={(e) => setExpectedAttendees(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                người
              </span>
            </div>
          </div>
        </div>

        {/* Date Time & Cultural Venue Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Thời gian tổ chức <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: 25/07/2026 - 19:00"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Địa điểm / Phòng Nhà Văn hóa <span className="text-rose-500">*</span>
            </label>
            <ReportSelect
              aria-label="Chọn phòng Nhà Văn hóa"
              value={CULTURAL_VENUES.includes(location) ? location : CULTURAL_VENUES[0]}
              onChange={(val) => setLocation(val)}
              options={CULTURAL_VENUES.map((v) => ({ value: v, label: v }))}
            />
          </div>
        </div>

        {/* Status (when editing) */}
        {mode === "edit" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Trạng thái sự kiện
            </label>
            <ReportSelect
              aria-label="Trạng thái sự kiện"
              value={status}
              onChange={(val) => setStatus(val as CommunityEvent["status"])}
              options={[
                { value: "Sắp diễn ra", label: "Sắp diễn ra" },
                { value: "Đang diễn ra", label: "Đang diễn ra" },
                { value: "Đã kết thúc", label: "Đã kết thúc" },
                { value: "Đã hủy", label: "Đã hủy" },
              ]}
            />
          </div>
        )}

        {/* Detailed Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Nội dung chi tiết chương trình <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={5}
            required
            placeholder="Ghi rõ chương trình nghị sự, mục đích, cơ sở vật chất cần mượn (loa kéo, bàn ghế, tivi trình chiếu...)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
          />
        </div>

        {/* Optional Cover Image */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Đường dẫn ảnh bìa sự kiện (URL tùy chọn)
          </label>
          <input
            type="text"
            placeholder="https://images.unsplash.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Rules Reminder Notice */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex gap-3">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Quy định sử dụng cơ sở vật chất Nhà văn hóa KP3:</p>
            <p className="text-amber-700 leading-relaxed">
              Các tổ chức, ban ngành có trách nhiệm giữ gìn vệ sinh chung, tắt toàn bộ điều hòa, thiết bị âm thanh, điện trước khi bàn giao chìa khóa cho Tổ quản lý Nhà văn hóa.
            </p>
          </div>
        </div>

        {/* Form Footer Actions */}
        <div className="pt-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-semibold text-center"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors cursor-pointer text-center shadow-sm disabled:opacity-50"
          >
            {mode === "edit" ? "Lưu cập nhật sự kiện" : "Đăng ký Đặt chỗ"}
          </button>
        </div>
      </form>
    </div>
  );
}
