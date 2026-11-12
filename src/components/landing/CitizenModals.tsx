import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Info,
  Save,
  Trash2,
} from "lucide-react";
import {
  AdministrativeForm,
  CommunityEvent,
  LocalNews,
  NewsLinkAttachment,
} from "../../types";
import { formatShortRecordId } from "../../utils/kp3Utils";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ConfirmModal } from "../ui/ConfirmModal";
import { DetailGrid, DetailRow } from "../common/DetailRow";
import { COVER_PRESETS, getNewsImage } from "../news/newsHelpers";
import { NewsMediaAndLinksFields } from "../news/NewsMediaAndLinksFields";

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
  // News Editor State
  const [newsTitle, setNewsTitle] = useState("");
  const [newsCategory, setNewsCategory] =
    useState<LocalNews["category"]>("Hành chính");
  const [newsAuthor, setNewsAuthor] = useState("Ban Điều hành Khu phố 3");
  const [newsDate, setNewsDate] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsPinned, setNewsPinned] = useState(false);
  const [newsContent, setNewsContent] = useState("");
  const [newsImageUrl, setNewsImageUrl] = useState(COVER_PRESETS[1].url);
  const [newsImageGallery, setNewsImageGallery] = useState<string[]>([]);
  const [newsLinks, setNewsLinks] = useState<NewsLinkAttachment[]>([]);
  const [newsError, setNewsError] = useState("");

  useEffect(() => {
    if (!newsEditorState?.open) return;
    const item = newsEditorState.item;
    if (item) {
      setNewsTitle(item.title);
      setNewsCategory(item.category);
      setNewsAuthor(item.author);
      setNewsDate(item.date);
      setNewsSummary(item.summary || "");
      setNewsPinned(Boolean(item.isPinned));
      setNewsContent(item.content);
      setNewsImageUrl(getNewsImage(item));
      setNewsImageGallery(item.imageGallery || []);
      setNewsLinks(item.links || []);
    } else {
      setNewsTitle("");
      setNewsCategory("Hành chính");
      setNewsAuthor("Ban Điều hành Khu phố 3");
      setNewsDate(new Date().toLocaleDateString("vi-VN"));
      setNewsSummary("");
      setNewsPinned(false);
      setNewsContent("");
      setNewsImageUrl(COVER_PRESETS[1].url);
      setNewsImageGallery([]);
      setNewsLinks([]);
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
      summary: newsSummary.trim() || existing?.summary,
      isPinned: newsPinned,
      content: newsContent.trim(),
      imageUrl: newsImageUrl.trim() || existing?.imageUrl,
      image: newsImageUrl.trim() || existing?.image,
      imageGallery: newsImageGallery,
      links: newsLinks,
      attachedFile: existing?.attachedFile,
      readTime: existing?.readTime || "3 phút đọc",
      views: existing?.views,
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
            <div className="rounded-xl overflow-hidden border border-slate-200 max-h-64 bg-slate-100">
              <img
                src={getNewsImage(newsDetail)}
                alt={newsDetail.title}
                className="w-full h-64 object-cover"
              />
            </div>
            <DetailGrid>
              <DetailRow label="Chuyên mục" value={newsDetail.category} />
              <DetailRow label="Ngày công bố" value={newsDetail.date} isMono />
              <DetailRow label="Cơ quan ban hành" value={newsDetail.author} />
              <DetailRow
                label="Trạng thái ghim"
                value={newsDetail.isPinned ? "Ưu tiên hiển thị đầu trang" : "Bản tin thường"}
              />
            </DetailGrid>
            {newsDetail.summary && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border-l-4 border-emerald-700 text-sm font-semibold text-emerald-950 leading-relaxed">
                {newsDetail.summary}
              </div>
            )}
            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-slate-50 border border-slate-200">
              {newsDetail.content}
            </div>
            {newsDetail.imageGallery && newsDetail.imageGallery.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Hình ảnh đính kèm ({newsDetail.imageGallery.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {newsDetail.imageGallery.map((imgUrl, idx) => (
                    <div
                      key={`${idx}-${imgUrl.slice(0, 20)}`}
                      className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={imgUrl}
                        alt={`Ảnh đính kèm ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {newsDetail.links && newsDetail.links.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Liên kết &amp; Tài liệu trực tuyến
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {newsDetail.links.map((lnk) => (
                    <a
                      key={lnk.id}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-between gap-2 text-xs font-semibold text-blue-900 transition-colors"
                    >
                      <span className="truncate">{lnk.label}</span>
                      <ExternalLink size={14} className="shrink-0 text-blue-700" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {newsDetail.attachedFile && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs">
                <FileText size={18} className="text-rose-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">{newsDetail.attachedFile.name}</p>
                  <p className="font-mono text-slate-500">
                    Văn bản đính kèm • {newsDetail.attachedFile.size || "1.2 MB"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 4. Admin Modal: Thêm / Sửa Tin tức */}
      <Modal
        isOpen={Boolean(newsEditorState?.open)}
        onClose={() => onCloseNewsEditor?.()}
        title={newsEditorState?.item ? "Cập nhật Tin tức / Thông báo" : "Đăng Tin tức / Thông báo Mới"}
        description="Hiển thị trực tiếp trên Bản tin & Báo điện tử Khu phố và đồng bộ Kênh Quản trị KP3."
        size="2xl"
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

          <div className="space-y-1.5">
            <label htmlFor="landing-news-summary" className="block text-sm font-medium text-slate-700">
              Sa-pô / Tóm tắt ngắn
            </label>
            <textarea
              id="landing-news-summary"
              rows={2}
              value={newsSummary}
              onChange={(e) => setNewsSummary(e.target.value)}
              placeholder="Đoạn tóm tắt nổi bật từ 1-2 câu xuất hiện trên thẻ bản tin..."
              className="w-full px-3.5 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

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

          <NewsMediaAndLinksFields
            imageUrl={newsImageUrl}
            onChangeImageUrl={setNewsImageUrl}
            imageGallery={newsImageGallery}
            onChangeImageGallery={setNewsImageGallery}
            links={newsLinks}
            onChangeLinks={setNewsLinks}
          />

          <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={newsPinned}
              onChange={(e) => setNewsPinned(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span>Ghim bài viết ưu tiên lên đầu Trang Tin tức</span>
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
