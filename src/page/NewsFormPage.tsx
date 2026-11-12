import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Megaphone,
  Pin,
  Save,
  X,
} from "lucide-react";
import { LocalNews, NewsLinkAttachment } from "../types";
import {
  COVER_PRESETS,
  getNewsImage,
} from "../components/news/newsHelpers";
import { NewsMediaAndLinksFields } from "../components/news/NewsMediaAndLinksFields";
import { PageHeader } from "../components/common/PageHeader";
import { ReportSelect } from "../components/reports/ReportSelect";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import {
  ROUTES,
  getNewsDetailPath,
  navigate,
} from "../routes";

export interface NewsFormPageProps {
  mode: "create" | "edit";
  newsId?: string;
  newsList: LocalNews[];
  isDataLoading?: boolean;
  basePath?: string;
  onAddNews?: (newNews: LocalNews) => void;
  onUpdateNews?: (updatedNews: LocalNews) => void;
  onCancel?: () => void;
  onSaved?: (savedNews: LocalNews, mode: "create" | "edit") => void;
}

export default function NewsFormPage({
  mode,
  newsId,
  newsList,
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_CULTURAL,
  onAddNews,
  onUpdateNews,
  onCancel,
  onSaved,
}: NewsFormPageProps) {
  const existingNews = useMemo(() => {
    if (mode === "edit" && newsId) {
      return newsList.find((n) => n.id === newsId) || null;
    }
    return null;
  }, [mode, newsId, newsList]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LocalNews["category"]>("Hành chính");
  const [author, setAuthor] = useState("Ban Điều hành Khu phố 3");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [links, setLinks] = useState<NewsLinkAttachment[]>([]);
  const [fileName, setFileName] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const [notice, setNotice] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && existingNews) {
      setTitle(existingNews.title || "");
      setCategory(existingNews.category || "Hành chính");
      setAuthor(existingNews.author || "Ban Điều hành Khu phố 3");
      setSummary(existingNews.summary || "");
      setContent(existingNews.content || "");
      setImageUrl(getNewsImage(existingNews));
      setImageGallery(existingNews.imageGallery || []);
      setLinks(existingNews.links || []);
      setFileName(existingNews.attachedFile?.name || "");
      setIsPinned(Boolean(existingNews.isPinned));
    } else if (mode === "create") {
      setTitle("");
      setCategory("Hành chính");
      setAuthor("Ban Điều hành Khu phố 3");
      setSummary("");
      setContent("");
      setImageUrl(COVER_PRESETS[1]?.url || "");
      setImageGallery([]);
      setLinks([]);
      setFileName("");
      setIsPinned(false);
    }
  }, [mode, existingNews]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === "edit" && newsId) {
      navigate(getNewsDetailPath(newsId, basePath));
    } else {
      navigate(basePath);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setNotice({
        type: "error",
        message: "Vui lòng nhập tiêu đề bản tin / thông báo.",
      });
      return;
    }
    if (!content.trim()) {
      setNotice({
        type: "error",
        message: "Vui lòng nhập nội dung chi tiết toàn văn.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "edit" && existingNews) {
        const updated: LocalNews = {
          ...existingNews,
          title: title.trim(),
          category,
          summary: summary.trim(),
          content: content.trim(),
          author: author.trim() || "Ban Điều hành Khu phố 3",
          imageUrl: imageUrl.trim(),
          image: imageUrl.trim(),
          imageGallery,
          links,
          isPinned,
          attachedFile: fileName.trim()
            ? {
                name: fileName.trim(),
                size: existingNews.attachedFile?.size || "1.2 MB",
              }
            : undefined,
        };

        if (onUpdateNews) {
          onUpdateNews(updated);
        }
        if (onSaved) {
          onSaved(updated, "edit");
        } else {
          navigate(getNewsDetailPath(updated.id, basePath));
        }
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const baseNum = newsList.length + 1;
        let generatedId = "NEWS" + baseNum.toString().padStart(3, "0");
        if (newsList.some((n) => n.id === generatedId)) {
          generatedId = "NEWS" + Date.now().toString().slice(-4);
        }

        const newNews: LocalNews = {
          id: generatedId,
          title: title.trim(),
          category,
          date: todayStr,
          author: author.trim() || "Ban Điều hành Khu phố 3",
          summary: summary.trim(),
          content: content.trim(),
          isPinned,
          imageUrl: imageUrl.trim(),
          image: imageUrl.trim(),
          imageGallery,
          links,
          readTime: "3 phút đọc",
          views: 1,
          attachedFile: fileName.trim()
            ? { name: fileName.trim(), size: "1.2 MB" }
            : undefined,
        };

        if (onAddNews) {
          onAddNews(newNews);
        }
        if (onSaved) {
          onSaved(newNews, "create");
        } else {
          navigate(getNewsDetailPath(newNews.id, basePath));
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
          title={mode === "edit" ? "Chỉnh sửa Bản Tin" : "Đăng Bản Tin Mới"}
          description="Kênh truyền thông chính thống phát sóng tới toàn thể nhân dân"
          badgeText="Bản tin KP3"
        />
        <LoadingFade
          title="Đang tải dữ liệu bài viết bản tin..."
          subtitle="Vui lòng chờ trong giây lát"
        />
      </div>
    );
  }

  if (mode === "edit" && !existingNews) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Không tìm thấy bài viết"
          description="Bài viết có thể đã bị xóa hoặc đường dẫn không hợp lệ"
          badgeText="Lỗi bài viết"
        />
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Không tìm thấy bản tin có mã #{newsId}
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
            ? `Chỉnh sửa bản tin: ${existingNews?.title || ""}`
            : "Đăng bản tin & Thông báo khu phố mới"
        }
        description="Kênh truyền thông chính thống phát sóng tới toàn thể nhân dân Khu phố 3"
        badgeText="Bản tin KP3"
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
              {mode === "edit" ? "Cập nhật bài viết" : "Phát hành ngay"}
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
            <Megaphone size={22} />
          </div>
          <div>
            <h3 className="font-black text-base text-slate-800">
              {mode === "edit"
                ? "Nội dung & Dữ liệu bài viết bản tin"
                : "Soạn thảo bài viết truyền thông & Thông báo nhân dân"}
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Vui lòng cung cấp thông tin chính xác, kiểm duyệt trước khi phát hành
            </p>
          </div>
        </div>

        {/* News Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Tiêu đề Bản tin / Thông báo <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ví dụ: Kế hoạch triển khai chiến dịch sốt xuất huyết diện rộng..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Category and Author */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Chuyên mục Bản tin
            </label>
            <ReportSelect
              aria-label="Chuyên mục Bản tin"
              value={category}
              onChange={(val) => setCategory(val as LocalNews["category"])}
              options={[
                { value: "Hành chính", label: "Hành chính" },
                { value: "Thông báo khẩn", label: "Thông báo khẩn" },
                { value: "Y tế & Đời sống", label: "Y tế & Đời sống" },
                { value: "Phong trào", label: "Phong trào" },
                { value: "An sinh xã hội", label: "An sinh xã hội" },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Nguồn phát hành / Tác giả <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Ban Điều hành KP3, Trạm Y tế, Công an Phường..."
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>
        </div>

        {/* Summary Snippet */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Đoạn Sa-pô / Tóm tắt ngắn (Lead snippet)
          </label>
          <textarea
            rows={2}
            placeholder="Đoạn tóm tắt nổi bật từ 1-2 câu xuất hiện trên thẻ tin tức..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Full Content */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Nội dung chi tiết toàn văn <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={8}
            required
            placeholder="Nhập nội dung thông báo đầy đủ gửi tới cư dân..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
          />
        </div>

        {/* Media & Links */}
        <NewsMediaAndLinksFields
          imageUrl={imageUrl}
          onChangeImageUrl={setImageUrl}
          imageGallery={imageGallery}
          onChangeImageGallery={setImageGallery}
          links={links}
          onChangeLinks={setLinks}
        />

        {/* Attached Document & Pin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Tệp công văn đính kèm (PDF/Scan)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Ke_hoach_so_42_PCD_KP3_signed.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="news-pinned-check-page"
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label
              htmlFor="news-pinned-check-page"
              className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5"
            >
              <Pin size={13} className="text-rose-600" /> Ghim bản tin lên vị trí Tiêu điểm
            </label>
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
            {mode === "edit" ? "Cập nhật bài viết" : "Phát hành bản tin ngay"}
          </button>
        </div>
      </form>
    </div>
  );
}
