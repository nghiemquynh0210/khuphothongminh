import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Newspaper,
  Paperclip,
  Printer,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { LocalNews } from "../types";
import {
  getCategoryTheme,
  getNewsImage,
  getNewsReadTime,
  getNewsSummary,
  getNewsViews,
} from "../components/news/newsHelpers";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { ConfirmModal, InlineNotice } from "../components/ui/ConfirmModal";
import { formatShortRecordId } from "../utils/kp3Utils";
import {
  ROUTES,
  getNewsDetailPath,
  getNewsEditPath,
  navigate,
} from "../routes";

export interface NewsDetailPageProps {
  newsId: string;
  newsList: LocalNews[];
  isDataLoading?: boolean;
  basePath?: string;
  onBack?: () => void;
  onEdit?: (news: LocalNews) => void;
  onDelete?: (newsId: string, newsTitle: string) => void;
  onSelectNews?: (news: LocalNews) => void;
}

export default function NewsDetailPage({
  newsId,
  newsList,
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_CULTURAL,
  onBack,
  onEdit,
  onDelete,
  onSelectNews,
}: NewsDetailPageProps) {
  const news = useMemo(() => {
    return newsList.find((n) => n.id === newsId) || null;
  }, [newsList, newsId]);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalNews | null>(null);

  const currentIdx = useMemo(() => {
    if (!news) return -1;
    return newsList.findIndex((n) => n.id === news.id);
  }, [newsList, news]);

  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < newsList.length - 1;

  const handlePrev = () => {
    if (!hasPrev) return;
    const prevNews = newsList[currentIdx - 1];
    if (onSelectNews) {
      onSelectNews(prevNews);
    } else {
      navigate(getNewsDetailPath(prevNews.id, basePath));
    }
  };

  const handleNext = () => {
    if (!hasNext) return;
    const nextNews = newsList[currentIdx + 1];
    if (onSelectNews) {
      onSelectNews(nextNews);
    } else {
      navigate(getNewsDetailPath(nextNews.id, basePath));
    }
  };

  const handleCopyShareLink = (item: LocalNews) => {
    try {
      const shareUrl = `${window.location.origin}${getNewsDetailPath(item.id, basePath)}`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl);
        setNotice({
          type: "success",
          message: `Đã sao chép liên kết bài viết: ${item.title}`,
        });
      } else {
        setNotice({
          type: "success",
          message: `Đã lưu đường dẫn: ${shareUrl}`,
        });
      }
    } catch {
      setNotice({
        type: "error",
        message: "Không thể tự động sao chép liên kết vào bộ nhớ tạm.",
      });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(basePath);
  };

  if (isDataLoading && !news) {
    return <LoadingFade title="Đang tải nội dung bản tin..." />;
  }

  if (!news) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Không tìm thấy bài viết bản tin
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Bản tin có mã{" "}
                <span className="font-mono font-bold text-slate-700">
                  {newsId}
                </span>{" "}
                không tồn tại hoặc đã bị xóa khỏi hệ thống.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Quay lại danh sách tin tức
          </button>
        </div>
      </div>
    );
  }

  const shortNewsId = formatShortRecordId(news.id, "TIN");
  const categoryTheme = getCategoryTheme(news.category);
  const views = getNewsViews(news);
  const readTime = getNewsReadTime(news);
  const summary = getNewsSummary(news);
  const heroImg = getNewsImage(news);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <PageHeader
        badgeIcon={<Newspaper size={14} className="text-emerald-600" />}
        badgeText={`Bản tin điện tử • ${shortNewsId}`}
        badgeSubtext={news.category}
        title={news.title}
        description={`${news.author} • Phát hành ngày ${news.date} • ${readTime} • ${views} lượt đọc`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-white">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!hasPrev}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Bản tin trước"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[11px] font-mono text-slate-500 px-1">
                {currentIdx + 1}/{newsList.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={!hasNext}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Bản tin tiếp theo"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeft size={14} /> Quay lại
            </button>

            <button
              type="button"
              onClick={() => handleCopyShareLink(news)}
              className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Share2 size={14} /> Chia sẻ
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer size={14} /> In bài
            </button>

            <button
              type="button"
              onClick={() => {
                if (onEdit) onEdit(news);
                else navigate(getNewsEditPath(news.id, basePath));
              }}
              className="px-3 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 size={14} /> Chỉnh sửa
            </button>

            <button
              type="button"
              onClick={() => setDeleteTarget(news)}
              className="px-3 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Xóa bài
            </button>
          </div>
        }
      />

      {notice && (
        <InlineNotice
          message={notice.message}
          type={notice.type}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Main Article Container */}
      <article className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Article Header & Meta */}
        <div className="p-5 sm:p-8 space-y-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-semibold px-2.5 py-0.5 rounded-full border text-xs ${categoryTheme.pill}`}
            >
              {news.category}
            </span>
            <span className="text-xs font-mono text-slate-500">
              Mã lưu trữ: {shortNewsId}
            </span>
            <span className="text-xs font-medium text-slate-600">
              • {news.date}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
            {news.title}
          </h1>

          <DetailGrid>
            <DetailRow label="Cơ quan / Tác giả" value={news.author} />
            <DetailRow label="Ngày phát hành" value={news.date} isMono />
            <DetailRow label="Thời gian đọc" value={readTime} />
            <DetailRow
              label="Lượt tiếp cận"
              value={`${views} lượt đọc`}
              isNumeric
            />
          </DetailGrid>
        </div>

        {/* Hero Featured Image */}
        {heroImg && (
          <div className="w-full h-72 sm:h-96 bg-slate-100 overflow-hidden relative border-b border-slate-100">
            <img
              src={heroImg}
              alt={news.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 right-3 bg-slate-950/70 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-xs">
              Ảnh tư liệu hoạt động KP3
            </div>
          </div>
        )}

        {/* Article Body */}
        <div className="p-5 sm:p-8 space-y-6 max-w-4xl">
          {/* Sa-pô (Lead paragraph) */}
          {summary && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border-l-4 border-l-emerald-600 text-sm sm:text-base font-semibold text-slate-800 leading-relaxed italic">
              {summary}
            </div>
          )}

          {/* Full Content */}
          <div className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-4">
            {news.content}
          </div>

          {/* Image Gallery */}
          {news.imageGallery && news.imageGallery.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={14} className="text-emerald-600" />
                Thư viện hình ảnh hoạt động ({news.imageGallery.length} ảnh):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {news.imageGallery.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxImage(imgUrl)}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 h-32 sm:h-40 bg-slate-50 cursor-pointer block text-left"
                  >
                    <img
                      src={imgUrl}
                      alt={`Tư liệu ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                      <Eye
                        size={20}
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Useful Links */}
          {news.links && news.links.length > 0 && (
            <div className="space-y-2.5 pt-6 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark size={14} className="text-emerald-600" />
                Liên kết &amp; Thông tin liên quan ({news.links.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {news.links.map((lnk, idx) => (
                  <a
                    key={idx}
                    href={lnk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors flex items-center justify-between group text-xs"
                  >
                    <span className="font-bold text-slate-800 group-hover:text-emerald-900 truncate">
                      {lnk.title}
                    </span>
                    <ExternalLink
                      size={13}
                      className="text-slate-400 group-hover:text-emerald-700 shrink-0 ml-2"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Attached Document File */}
          {news.attachedFile && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white text-emerald-700 shadow-2xs border border-emerald-100">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {news.attachedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Văn bản đính kèm • {news.attachedFile.size || "1.2 MB"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setNotice({
                    type: "success",
                    message: `Đang tải xuống công văn đính kèm: ${news.attachedFile?.name}`,
                  })
                }
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download size={13} /> Tải văn bản
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Ảnh phóng to"
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl object-contain border border-white/10"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="mt-3 px-4 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold cursor-pointer"
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          if (onDelete) {
            onDelete(target.id, target.title);
          } else {
            navigate(basePath);
          }
        }}
        title="Xác nhận xóa bài viết bản tin"
        description={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa bài viết "${deleteTarget.title}" khỏi hệ thống phát thanh & truyền thông không? Thao tác này không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xác nhận xóa"
        variant="danger"
      />
    </div>
  );
}
