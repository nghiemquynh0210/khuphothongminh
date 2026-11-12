import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Edit2,
  Info,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  AdministrativeForm,
  CommunityEvent,
  LandingConfig,
  LocalNews,
} from "../../types";
import { formatShortRecordId } from "../../utils/kp3Utils";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ConfirmModal } from "../ui/ConfirmModal";
import { DetailGrid, DetailRow } from "../common/DetailRow";
import { DEFAULT_LANDING_CONFIG } from "./landingConstants";

export interface CitizenModalsProps {
  previewForm: AdministrativeForm | null;
  setPreviewForm: (f: AdministrativeForm | null) => void;
  allForms?: AdministrativeForm[];
  eventDetail: CommunityEvent | null;
  setEventDetail: (e: CommunityEvent | null) => void;
  allEvents?: CommunityEvent[];
  newsDetail: LocalNews | null;
  setNewsDetail: (n: LocalNews | null) => void;
  allNews?: LocalNews[];
  toast: { msg: string; type: "success" | "error" } | null;
  handleDownloadForm: (form: AdministrativeForm) => void;
  // Admin editing props
  isAdmin?: boolean;
  editingConfigOpen?: boolean;
  onCloseConfigModal?: () => void;
  landingConfig?: LandingConfig;
  onSaveLandingConfig?: (next: LandingConfig) => void;
  newsEditorState?: { open: boolean; item: LocalNews | null };
  onCloseNewsEditor?: () => void;
  onSaveNews?: (news: LocalNews, isEdit: boolean) => void;
  onRequestEditNews?: (news: LocalNews) => void;
  onRequestDeleteNews?: (news: LocalNews) => void;
  eventEditorState?: { open: boolean; item: CommunityEvent | null };
  onCloseEventEditor?: () => void;
  onSaveEvent?: (event: CommunityEvent, isEdit: boolean) => void;
  onRequestEditEvent?: (event: CommunityEvent) => void;
  onRequestDeleteEvent?: (event: CommunityEvent) => void;
  deleteTarget?: { kind: "news" | "event"; id: string; title: string } | null;
  onCloseDeleteConfirm?: () => void;
  onConfirmDelete?: () => void;
}

const NEWS_CATEGORIES: LocalNews["category"][] = [
  "Thông báo khẩn",
  "Hành chính",
  "Y tế & Đời sống",
  "Phong trào",
  "An sinh xã hội",
];

const EVENT_STATUSES: CommunityEvent["status"][] = [
  "Sắp diễn ra",
  "Đang diễn ra",
  "Đã kết thúc",
  "Đã hủy",
];

function buildNavProps<T extends { id: string }>(
  current: T | null,
  list: T[] | undefined,
  setter: (item: T | null) => void,
  label: string
) {
  if (!current || !list || list.length <= 1) return undefined;
  const idx = list.findIndex((item) => item.id === current.id);
  if (idx < 0) return undefined;
  return {
    hasPrev: idx > 0,
    hasNext: idx < list.length - 1,
    prevLabel: `${label} trước`,
    nextLabel: `${label} tiếp theo`,
    onPrev: () => {
      if (idx > 0) setter(list[idx - 1]);
    },
    onNext: () => {
      if (idx < list.length - 1) setter(list[idx + 1]);
    },
  };
}

export default function CitizenModals({
  previewForm,
  setPreviewForm,
  allForms,
  eventDetail,
  setEventDetail,
  allEvents,
  newsDetail,
  setNewsDetail,
  allNews,
  toast,
  handleDownloadForm,
  isAdmin = false,
  editingConfigOpen = false,
  onCloseConfigModal,
  landingConfig = DEFAULT_LANDING_CONFIG,
  onSaveLandingConfig,
  newsEditorState,
  onCloseNewsEditor,
  onSaveNews,
  onRequestEditNews,
  onRequestDeleteNews,
  eventEditorState,
  onCloseEventEditor,
  onSaveEvent,
  onRequestEditEvent,
  onRequestDeleteEvent,
  deleteTarget = null,
  onCloseDeleteConfirm,
  onConfirmDelete,
}: CitizenModalsProps) {
  // 1. Landing Config Editor State
  const [cfgForm, setCfgForm] = useState<LandingConfig>(landingConfig);
  useEffect(() => {
    if (editingConfigOpen) {
      setCfgForm(landingConfig);
    }
  }, [editingConfigOpen, landingConfig]);

  // 2. News Editor State
  const [newsTitle, setNewsTitle] = useState("");
  const [newsCategory, setNewsCategory] =
    useState<LocalNews["category"]>("Hành chính");
  const [newsAuthor, setNewsAuthor] = useState("Ban Điều hành Khu phố 3");
  const [newsDate, setNewsDate] = useState("");
  const [newsPinned, setNewsPinned] = useState(false);
  const [newsContent, setNewsContent] = useState("");
  const [newsImageUrl, setNewsImageUrl] = useState("");
  const [newsError, setNewsError] = useState("");

  useEffect(() => {
    if (!newsEditorState?.open) return;
    const item = newsEditorState.item;
    if (item) {
      setNewsTitle(item.title);
      setNewsCategory(item.category);
      setNewsAuthor(item.author);
      setNewsDate(item.date);
      setNewsPinned(Boolean(item.isPinned));
      setNewsContent(item.content);
      setNewsImageUrl(item.imageUrl || "");
    } else {
      setNewsTitle("");
      setNewsCategory("Hành chính");
      setNewsAuthor("Ban Điều hành Khu phố 3");
      setNewsDate(new Date().toLocaleDateString("vi-VN"));
      setNewsPinned(false);
      setNewsContent("");
      setNewsImageUrl("");
    }
    setNewsError("");
  }, [newsEditorState]);

  // 3. Event Editor State
  const [evTitle, setEvTitle] = useState("");
  const [evDateTime, setEvDateTime] = useState("");
  const [evLocation, setEvLocation] = useState("Nhà Văn hóa Khu phố 3");
  const [evOrganizer, setEvOrganizer] = useState("Ban Điều hành Khu phố 3");
  const [evStatus, setEvStatus] =
    useState<CommunityEvent["status"]>("Sắp diễn ra");
  const [evAttendees, setEvAttendees] = useState("60");
  const [evDescription, setEvDescription] = useState("");
  const [evError, setEvError] = useState("");

  useEffect(() => {
    if (!eventEditorState?.open) return;
    const item = eventEditorState.item;
    if (item) {
      setEvTitle(item.title);
      setEvDateTime(item.dateTime);
      setEvLocation(item.location);
      setEvOrganizer(item.organizer);
      setEvStatus(item.status);
      setEvAttendees(String(item.expectedAttendees || 50));
      setEvDescription(item.description);
    } else {
      setEvTitle("");
      setEvDateTime("08:00 - 11:00, Chủ Nhật tuần này");
      setEvLocation("Nhà Văn hóa Khu phố 3");
      setEvOrganizer("Ban Điều hành Khu phố 3");
      setEvStatus("Sắp diễn ra");
      setEvAttendees("60");
      setEvDescription("");
    }
    setEvError("");
  }, [eventEditorState]);

  const handleNewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) {
      setNewsError("Vui lòng nhập đầy đủ tiêu đề và nội dung bản tin.");
      return;
    }
    const existing = newsEditorState?.item;
    const saved: LocalNews = {
      id: existing?.id || `NEWS-${Date.now().toString().slice(-6)}`,
      title: newsTitle.trim(),
      category: newsCategory,
      author: newsAuthor.trim() || "Ban Điều hành Khu phố 3",
      date: newsDate.trim() || new Date().toLocaleDateString("vi-VN"),
      isPinned: newsPinned,
      content: newsContent.trim(),
      imageUrl: newsImageUrl.trim() || existing?.imageUrl,
    };
    onSaveNews?.(saved, Boolean(existing));
    onCloseNewsEditor?.();
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim() || !evDateTime.trim() || !evLocation.trim()) {
      setEvError("Vui lòng nhập tên sự kiện, thời gian và địa điểm tổ chức.");
      return;
    }
    const existing = eventEditorState?.item;
    const saved: CommunityEvent = {
      id: existing?.id || `EV-${Date.now().toString().slice(-6)}`,
      title: evTitle.trim(),
      dateTime: evDateTime.trim(),
      location: evLocation.trim(),
      organizer: evOrganizer.trim() || "Ban Điều hành Khu phố 3",
      status: evStatus,
      expectedAttendees: Math.max(1, Number(evAttendees) || 50),
      description:
        evDescription.trim() || "Sự kiện cộng đồng Khu phố 3, Phường An Phú.",
      imageUrl: existing?.imageUrl,
    };
    onSaveEvent?.(saved, Boolean(existing));
    onCloseEventEditor?.();
  };

  return (
    <>
      {/* 1. Modal Preview Biểu mẫu (Unified Flat Hairline) */}
      <Modal
        isOpen={Boolean(previewForm)}
        onClose={() => setPreviewForm(null)}
        title={previewForm ? `${previewForm.code} — ${previewForm.title}` : ""}
        description={
          previewForm
            ? `Mã biểu mẫu: ${formatShortRecordId(previewForm.id, "BM")} • ${previewForm.category}`
            : undefined
        }
        size="2xl"
        headerNavigation={buildNavProps(previewForm, allForms, setPreviewForm, "Biểu mẫu")}
        footer={
          previewForm ? (
            <>
              <Button variant="outline" onClick={() => setPreviewForm(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                leftIcon={<Download size={16} />}
                onClick={() => {
                  handleDownloadForm(previewForm);
                  setPreviewForm(null);
                }}
              >
                Tải biểu mẫu
              </Button>
            </>
          ) : null
        }
      >
        {previewForm && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              {previewForm.description}
            </p>
            <DetailGrid>
              <DetailRow label="Nơi tiếp nhận" value={previewForm.issuingBody} />
              <DetailRow label="Thời gian giải quyết" value={previewForm.processingTime} />
              <DetailRow label="Lệ phí" value={previewForm.fee} />
              <DetailRow
                label="Định dạng"
                value={`${previewForm.fileFormat} · ${previewForm.fileSize}`}
                isMono
              />
            </DetailGrid>
            {previewForm.requiredDocuments.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Hồ sơ cần chuẩn bị
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                  {previewForm.requiredDocuments.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 2. Modal Chi tiết Sự kiện / Lịch hoạt động */}
      <Modal
        isOpen={Boolean(eventDetail)}
        onClose={() => setEventDetail(null)}
        title={eventDetail?.title || ""}
        description={
          eventDetail
            ? `Mã sự kiện: ${formatShortRecordId(eventDetail.id, "SK")} • ${eventDetail.organizer}`
            : undefined
        }
        size="2xl"
        headerNavigation={buildNavProps(eventDetail, allEvents, setEventDetail, "Sự kiện")}
        footerClassName="justify-between"
        footer={
          eventDetail ? (
            <>
              <div>
                {isAdmin && onRequestDeleteEvent && (
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => onRequestDeleteEvent(eventDetail)}
                  >
                    Xóa
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setEventDetail(null)}>
                  Đóng
                </Button>
                {isAdmin && onRequestEditEvent && (
                  <Button
                    variant="primary"
                    leftIcon={<Edit2 size={15} />}
                    onClick={() => onRequestEditEvent(eventDetail)}
                  >
                    Sửa sự kiện
                  </Button>
                )}
              </div>
            </>
          ) : null
        }
      >
        {eventDetail && (
          <div className="space-y-4">
            <DetailGrid>
              <DetailRow label="Thời gian" value={eventDetail.dateTime} isMono />
              <DetailRow label="Trạng thái" value={eventDetail.status} />
              <DetailRow label="Địa điểm" value={eventDetail.location} />
              <DetailRow label="Đơn vị phụ trách" value={eventDetail.organizer} />
              <DetailRow
                label="Quy mô dự kiến"
                value={`${eventDetail.expectedAttendees} người`}
                isNumeric
              />
            </DetailGrid>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
              {eventDetail.description}
            </div>
          </div>
        )}
      </Modal>

      {/* 3. Modal Chi tiết Tin tức / Thông báo */}
      <Modal
        isOpen={Boolean(newsDetail)}
        onClose={() => setNewsDetail(null)}
        title={newsDetail?.title || ""}
        description={
          newsDetail
            ? `Mã bản tin: ${formatShortRecordId(newsDetail.id, "TT")} • ${newsDetail.date}`
            : undefined
        }
        size="2xl"
        headerNavigation={buildNavProps(newsDetail, allNews, setNewsDetail, "Bản tin")}
        footerClassName="justify-between"
        footer={
          newsDetail ? (
            <>
              <div>
                {isAdmin && onRequestDeleteNews && (
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => onRequestDeleteNews(newsDetail)}
                  >
                    Xóa
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setNewsDetail(null)}>
                  Đóng
                </Button>
                {isAdmin && onRequestEditNews && (
                  <Button
                    variant="primary"
                    leftIcon={<Edit2 size={15} />}
                    onClick={() => onRequestEditNews(newsDetail)}
                  >
                    Sửa bài viết
                  </Button>
                )}
              </div>
            </>
          ) : null
        }
      >
        {newsDetail && (
          <div className="space-y-4">
            {newsDetail.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56">
                <img
                  src={newsDetail.imageUrl}
                  alt={newsDetail.title}
                  className="w-full h-56 object-cover"
                />
              </div>
            )}
            <DetailGrid>
              <DetailRow label="Chuyên mục" value={newsDetail.category} />
              <DetailRow label="Ngày công bố" value={newsDetail.date} isMono />
              <DetailRow label="Cơ quan ban hành" value={newsDetail.author} />
              <DetailRow
                label="Trạng thái ghim"
                value={newsDetail.isPinned ? "Ưu tiên hiển thị đầu trang" : "Bản tin thường"}
              />
            </DetailGrid>
            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-slate-50 border border-slate-200">
              {newsDetail.content}
            </div>
          </div>
        )}
      </Modal>

      {/* 4. Admin Modal: Sửa thông tin Trang Chủ (LandingConfig) */}
      <Modal
        isOpen={editingConfigOpen}
        onClose={() => onCloseConfigModal?.()}
        title="Chỉnh sửa thông tin Trang Chủ KP3"
        description="Cập nhật tiêu đề cổng cư dân, khẩu hiệu Hero, thông báo nổi bật và thông tin liên hệ chân trang."
        size="2xl"
        closeOnOverlayClick={false}
        footerClassName="justify-between"
        footer={
          <>
            <Button
              variant="outline"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => setCfgForm(DEFAULT_LANDING_CONFIG)}
            >
              Khôi phục mặc định
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => onCloseConfigModal?.()}>
                Hủy
              </Button>
              <Button
                type="submit"
                form="landing-config-form"
                variant="emerald"
                leftIcon={<Save size={15} />}
              >
                Lưu Trang Chủ
              </Button>
            </div>
          </>
        }
      >
        <form
          id="landing-config-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveLandingConfig?.(cfgForm);
            onCloseConfigModal?.();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id="cfg-site-title"
              label="Tên cổng (Header & Footer)"
              required
              value={cfgForm.siteTitle}
              onChange={(e) => setCfgForm({ ...cfgForm, siteTitle: e.target.value })}
            />
            <Input
              id="cfg-site-subtitle"
              label="Mô tả ngắn dưới logo"
              value={cfgForm.siteSubtitle}
              onChange={(e) => setCfgForm({ ...cfgForm, siteSubtitle: e.target.value })}
            />
          </div>

          <Input
            id="cfg-hero-badge"
            label="Nhãn hành chính trên Hero"
            value={cfgForm.heroBadge}
            onChange={(e) => setCfgForm({ ...cfgForm, heroBadge: e.target.value })}
          />

          <Input
            id="cfg-hero-title"
            label="Khẩu hiệu chính trang chủ (H1)"
            required
            value={cfgForm.heroTitle}
            onChange={(e) => setCfgForm({ ...cfgForm, heroTitle: e.target.value })}
          />

          <Input
            id="cfg-hero-address-note"
            label="Ghi chú địa giới hiển thị trong khung thống kê"
            value={cfgForm.heroAddressNote}
            onChange={(e) => setCfgForm({ ...cfgForm, heroAddressNote: e.target.value })}
          />

          <div className="space-y-1.5">
            <label htmlFor="cfg-banner-notice" className="block text-sm font-medium text-slate-700">
              Thông báo khẩn / Banner nổi bật trên đầu trang (để trống nếu ẩn)
            </label>
            <textarea
              id="cfg-banner-notice"
              rows={2}
              value={cfgForm.bannerNotice || ""}
              onChange={(e) => setCfgForm({ ...cfgForm, bannerNotice: e.target.value })}
              placeholder="VD: Thông báo họp Tổ dân phố định kỳ tối Thứ 7 tuần này..."
              className="w-full px-3.5 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id="cfg-contact-address"
              label="Địa chỉ văn phòng KP3"
              value={cfgForm.contactAddress}
              onChange={(e) => setCfgForm({ ...cfgForm, contactAddress: e.target.value })}
            />
            <Input
              id="cfg-contact-hotline"
              label="Số điện thoại / Trực ban"
              value={cfgForm.hotline}
              onChange={(e) => setCfgForm({ ...cfgForm, hotline: e.target.value })}
            />
            <Input
              id="cfg-working-hours"
              label="Giờ tiếp dân"
              value={cfgForm.workingHours}
              onChange={(e) => setCfgForm({ ...cfgForm, workingHours: e.target.value })}
            />
            <Input
              id="cfg-contact-email"
              label="Email tiếp nhận chính thức"
              type="email"
              value={cfgForm.contactEmail}
              onChange={(e) => setCfgForm({ ...cfgForm, contactEmail: e.target.value })}
            />
          </div>

          <Input
            id="cfg-footer-operator"
            label="Đơn vị phụ trách nội dung (Footer)"
            value={cfgForm.footerOperator}
            onChange={(e) => setCfgForm({ ...cfgForm, footerOperator: e.target.value })}
          />
        </form>
      </Modal>

      {/* 5. Admin Modal: Thêm / Sửa Tin tức */}
      <Modal
        isOpen={Boolean(newsEditorState?.open)}
        onClose={() => onCloseNewsEditor?.()}
        title={newsEditorState?.item ? "Cập nhật Tin tức / Thông báo" : "Đăng Tin tức / Thông báo Mới"}
        description="Hiển thị trực tiếp trên Trang Chủ và đồng bộ với Kênh Tin Tức KP3."
        size="xl"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => onCloseNewsEditor?.()}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="landing-news-form"
              variant="emerald"
              leftIcon={<Save size={15} />}
            >
              {newsEditorState?.item ? "Lưu bài viết" : "Đăng ngay"}
            </Button>
          </>
        }
      >
        <form id="landing-news-form" onSubmit={handleNewsSubmit} noValidate className="space-y-4">
          {newsError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {newsError}
            </div>
          )}

          <Input
            id="landing-news-title"
            label="Tiêu đề bài viết"
            required
            aria-invalid={Boolean(newsError && !newsTitle.trim()) ? "true" : "false"}
            value={newsTitle}
            onChange={(e) => {
              setNewsTitle(e.target.value);
              if (newsError) setNewsError("");
            }}
            placeholder="Nhập tiêu đề bản tin hoặc thông báo..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="landing-news-cat" className="block text-sm font-medium text-slate-700">
                Chuyên mục
              </label>
              <select
                id="landing-news-cat"
                value={newsCategory}
                onChange={(e) => setNewsCategory(e.target.value as LocalNews["category"])}
                className="w-full h-10 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
              >
                {NEWS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Input
              id="landing-news-author"
              label="Cơ quan / Tác giả"
              value={newsAuthor}
              onChange={(e) => setNewsAuthor(e.target.value)}
            />
            <Input
              id="landing-news-date"
              label="Ngày công bố"
              value={newsDate}
              onChange={(e) => setNewsDate(e.target.value)}
            />
          </div>

          <Input
            id="landing-news-image"
            label="Đường dẫn ảnh minh họa (tùy chọn)"
            value={newsImageUrl}
            onChange={(e) => setNewsImageUrl(e.target.value)}
            placeholder="https://..."
          />

          <div className="space-y-1.5">
            <label htmlFor="landing-news-content" className="block text-sm font-medium text-slate-700">
              Nội dung chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="landing-news-content"
              rows={5}
              required
              aria-invalid={Boolean(newsError && !newsContent.trim()) ? "true" : "false"}
              value={newsContent}
              onChange={(e) => {
                setNewsContent(e.target.value);
                if (newsError) setNewsError("");
              }}
              placeholder="Nhập đầy đủ nội dung thông báo, thời gian, địa điểm hoặc hướng dẫn cho cư dân..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={newsPinned}
              onChange={(e) => setNewsPinned(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span>Ghim bài viết ưu tiên lên đầu Trang Chủ</span>
          </label>
        </form>
      </Modal>

      {/* 6. Admin Modal: Thêm / Sửa Sự kiện */}
      <Modal
        isOpen={Boolean(eventEditorState?.open)}
        onClose={() => onCloseEventEditor?.()}
        title={eventEditorState?.item ? "Cập nhật Sự kiện Khu phố 3" : "Tạo Sự kiện Cộng đồng Mới"}
        description="Hiển thị ngay tại Kênh Tin Tức & Sự Kiện trên Trang Chủ và Bảng Quản trị."
        size="xl"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => onCloseEventEditor?.()}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="landing-event-form"
              variant="emerald"
              leftIcon={<Save size={15} />}
            >
              {eventEditorState?.item ? "Lưu sự kiện" : "Tạo sự kiện"}
            </Button>
          </>
        }
      >
        <form id="landing-event-form" onSubmit={handleEventSubmit} noValidate className="space-y-4">
          {evError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {evError}
            </div>
          )}

          <Input
            id="landing-ev-title"
            label="Tên sự kiện / hoạt động"
            required
            aria-invalid={Boolean(evError && !evTitle.trim()) ? "true" : "false"}
            value={evTitle}
            onChange={(e) => {
              setEvTitle(e.target.value);
              if (evError) setEvError("");
            }}
            placeholder="VD: Ngày hội Đại đoàn kết toàn dân tộc Khu phố 3"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id="landing-ev-datetime"
              label="Thời gian tổ chức"
              required
              aria-invalid={Boolean(evError && !evDateTime.trim()) ? "true" : "false"}
              value={evDateTime}
              onChange={(e) => setEvDateTime(e.target.value)}
            />
            <Input
              id="landing-ev-location"
              label="Địa điểm"
              required
              aria-invalid={Boolean(evError && !evLocation.trim()) ? "true" : "false"}
              value={evLocation}
              onChange={(e) => setEvLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Input
              id="landing-ev-organizer"
              label="Đơn vị phụ trách"
              value={evOrganizer}
              onChange={(e) => setEvOrganizer(e.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="landing-ev-status" className="block text-sm font-medium text-slate-700">
                Trạng thái
              </label>
              <select
                id="landing-ev-status"
                value={evStatus}
                onChange={(e) => setEvStatus(e.target.value as CommunityEvent["status"])}
                className="w-full h-10 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
              >
                {EVENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Input
              id="landing-ev-attendees"
              label="Số người dự kiến"
              type="number"
              min={1}
              value={evAttendees}
              onChange={(e) => setEvAttendees(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="landing-ev-desc" className="block text-sm font-medium text-slate-700">
              Nội dung & thành phần tham dự
            </label>
            <textarea
              id="landing-ev-desc"
              rows={4}
              value={evDescription}
              onChange={(e) => setEvDescription(e.target.value)}
              placeholder="Mô tả nội dung sự kiện..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </form>
      </Modal>

      {/* 7. Confirm Delete News / Event on Landing Page */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => onCloseDeleteConfirm?.()}
        onConfirm={() => onConfirmDelete?.()}
        title={
          deleteTarget?.kind === "event"
            ? "Xác nhận xóa sự kiện"
            : "Xác nhận xóa bài viết"
        }
        description={
          deleteTarget
            ? `Bạn chắc chắn muốn xóa "${deleteTarget.title}" khỏi Cổng thông tin Khu phố 3?`
            : ""
        }
        confirmLabel="Xóa ngay"
        variant="danger"
      />

      {/* 8. Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] px-4 py-3 rounded-2xl border border-white/25 text-sm font-semibold text-white flex items-center gap-2 ${
            toast.type === "success" ? "bg-gov-navy" : "bg-gov-danger"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <Info size={18} aria-hidden="true" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
