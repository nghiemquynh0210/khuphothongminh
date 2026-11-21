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
  normalizeNewsAuthor,
} from "../components/news/newsHelpers";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { RecordDetailShell } from "../components/common/RecordDetailShell";
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
  const displayAuthor = normalizeNewsAuthor(news.author);

  const zaloArticleUrl =
    news.zaloLinkView ||
    news.links?.find(
      (l) => l.url.includes("officialaccount.me") || l.url.includes("zalo")
    )?.url;

  return (
    <RecordDetailShell
      backLabel="Danh sách bản tin"
      onBack={handleBack}
      navigation={
        newsList.length > 1 && currentIdx >= 0
          ? {
              hasPrev,
              hasNext,
              onPrev: handlePrev,
              onNext: handleNext,
              prevTitle: "Bản tin trước",
              nextTitle: "Bản tin tiếp theo",
              positionLabel: `${currentIdx + 1} / ${newsList.length}`,
            }
          : undefined
      }
      topRightSlot={
        <>
          {zaloArticleUrl && (
            <a
              href={zaloArticleUrl}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-2.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Xem trên Zalo OA</span>
              <ExternalLink size={12} />
            </a>
          )}

          <button
            type="button"
            onClick={() => handleCopyShareLink(news)}
            className="h-8 px-2.5 border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Share2 size={13} className="text-slate-500" />
            <span>Chia sẻ</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-8 px-2.5 border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Printer size={13} className="text-slate-500" />
            <span>In bài</span>
          </button>
        </>
      }
      noticeSlot={
        notice ? (
          <InlineNotice
            message={notice.message}
            type={notice.type}
            onDismiss={() => setNotice(null)}
          />
        ) : undefined
      }
      avatarSlot={
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/90 text-emerald-700 flex items-center justify-center">
          <Newspaper size={20} />
        </div>
      }
      badgesSlot={
        <>
          <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
            {shortNewsId}
          </span>
          <span
            className={`font-semibold px-2.5 py-0.5 rounded-full border ${categoryTheme.pill}`}
          >
            {news.category}
          </span>
          {(news.isFromZalo || news.zaloArticleId) && (
            <span className="font-semibold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Zalo OA KP3</span>
            </span>
          )}
        </>
      }
      title={news.title}
      subtitleSlot={
        <>
          <span>Cơ quan / Tác giả: <strong className="text-slate-800">{displayAuthor}</strong></span>
          <span className="font-mono text-slate-700">{news.date}</span>
          <span>{readTime}</span>
          <span>{views} lượt đọc</span>
        </>
      }
      actionsSlot={
        <>
          <button
            type="button"
            onClick={() => {
              if (onEdit) onEdit(news);
              else navigate(getNewsEditPath(news.id, basePath));
            }}
            className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
          >
            <Edit3 size={13} />
            <span>Chỉnh sửa</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteTarget(news)}
            className="h-9 px-3 border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Trash2 size={13} />
            <span>Xóa bài</span>
          </button>
        </>
      }
      bodyClassName="p-5 sm:p-6 space-y-5"
    >
      {/* Hero Featured Image */}
      {heroImg && (
        <div
          className="w-full bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200/90 group cursor-pointer flex items-center justify-center min-h-[200px] max-h-[480px]"
          onClick={() => setLightboxImage(heroImg)}
          title="Nhấn để phóng to ảnh tư liệu"
        >
          <img
            src={heroImg}
            alt={news.title}
            className="max-h-[480px] w-auto max-w-full object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-300"
          />
          <div className="absolute bottom-3 right-3 bg-slate-950/75 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5">
            <Eye size={12} />
            <span>Xem phóng to</span>
          </div>
        </div>
      )}

      {/* Article Body */}
      <article
        className="space-y-4 max-w-4xl text-xs"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target && target.tagName === "IMG") {
            const src = (target as HTMLImageElement).src;
            if (src) setLightboxImage(src);
          }
        }}
      >
        {summary && (
          <div className="p-3.5 rounded-xl bg-slate-50 border-l-4 border-l-emerald-600 text-xs font-semibold text-slate-800 leading-relaxed">
            {summary}
          </div>
        )}

        {news.content &&
        (news.content.includes("<p>") ||
          news.content.includes("<div>") ||
          news.content.includes("<img")) ? (
          <div
            className="prose prose-slate prose-sm max-w-none text-slate-800 text-xs leading-relaxed space-y-3"
            dangerouslySetInnerHTML={{ __html: news.content }}
          />
        ) : (
          <div className="max-w-none text-slate-800 text-xs leading-relaxed whitespace-pre-line space-y-3">
            {news.content}
          </div>
        )}

        {/* Image Gallery */}
        {news.imageGallery && news.imageGallery.length > 0 && (
          <div className="space-y-3 pt-5 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} className="text-emerald-700" />
              <span>Thư viện hình ảnh hoạt động ({news.imageGallery.length} ảnh)</span>
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
          <div className="space-y-2.5 pt-5 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark size={14} className="text-emerald-700" />
              <span>Liên kết &amp; Thông tin liên quan ({news.links.length})</span>
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
                  <span className="font-semibold text-slate-800 group-hover:text-emerald-900 truncate">
                    {lnk.label || (lnk as any).title || lnk.url}
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
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-emerald-700 border border-slate-200">
                <FileText size={18} />
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
              className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>Tải văn bản</span>
            </button>
          </div>
        )}
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
    </RecordDetailShell>
  );
}
