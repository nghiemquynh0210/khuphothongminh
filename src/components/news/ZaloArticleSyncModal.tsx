import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { getStaffAuthHeaders } from "../../utils/imageUpload";
import { Button } from "../ui/Button";

export interface ZaloArticlePreviewItem {
  id: string;
  title: string;
  status?: string;
  thumb?: string | null;
  createDate?: number;
  createDateFormatted: string;
  totalView: number;
  totalShare: number;
  totalLike: number;
  linkView: string;
  isSynced: boolean;
  existingNewsId?: string | null;
  existingCategory?: string | null;
  suggestedCategory: "Thông báo khẩn" | "Hành chính" | "Y tế & Đời sống" | "Phong trào" | "An sinh xã hội";
}

interface ZaloArticleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

const CATEGORY_OPTIONS: Array<ZaloArticlePreviewItem["suggestedCategory"]> = [
  "Hành chính",
  "Phong trào",
  "Y tế & Đời sống",
  "An sinh xã hội",
  "Thông báo khẩn",
];

export default function ZaloArticleSyncModal({
  isOpen,
  onClose,
  onSyncSuccess,
}: ZaloArticleSyncModalProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<ZaloArticlePreviewItem[]>([]);
  const [totalZaloArticles, setTotalZaloArticles] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unsynced" | "synced">("unsynced");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customCategories, setCustomCategories] = useState<Record<string, ZaloArticlePreviewItem["suggestedCategory"]>>({});
  const [forceOverwrite, setForceOverwrite] = useState(false);

  const [syncResultBanner, setSyncResultBanner] = useState<{
    type: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  // Tải danh sách bài viết từ Zalo OA để xem trước (Preview)
  const fetchPreviewArticles = async () => {
    setLoading(true);
    setError(null);
    setSyncResultBanner(null);
    try {
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          action: "fetch_zalo_articles_preview",
          limit: 50,
          offset: 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Không thể tải danh sách bài viết từ Zalo OA.");
      }

      const list: ZaloArticlePreviewItem[] = Array.isArray(data.articles) ? data.articles : [];
      setArticles(list);
      setTotalZaloArticles(Number(data.total) || list.length);

      // Mặc định chọn tất cả các bài chưa đồng bộ
      const unsyncedSet = new Set(list.filter((a) => !a.isSynced).map((a) => a.id));
      setSelectedIds(unsyncedSet);

      // Khởi tạo danh mục đề xuất
      const cats: Record<string, ZaloArticlePreviewItem["suggestedCategory"]> = {};
      list.forEach((a) => {
        cats[a.id] = a.suggestedCategory;
      });
      setCustomCategories(cats);
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi kết nối Zalo OA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      void (async () => {
        await Promise.resolve();
        if (!ignore) {
          fetchPreviewArticles();
        }
      })();
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  const syncedCount = useMemo(() => articles.filter((a) => a.isSynced).length, [articles]);
  const unsyncedCount = useMemo(() => articles.filter((a) => !a.isSynced).length, [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((a) => {
      if (filterMode === "unsynced" && a.isSynced) return false;
      if (filterMode === "synced" && !a.isSynced) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q);
    });
  }, [articles, filterMode, searchQuery]);

  const toggleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    const visibleIds = filteredArticles.map((a) => a.id);
    const allSelected = visibleIds.every((id) => next.has(id));

    if (allSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCategoryChange = (id: string, cat: ZaloArticlePreviewItem["suggestedCategory"]) => {
    setCustomCategories((prev) => ({ ...prev, [id]: cat }));
  };

  // Thực hiện đồng bộ các bài đã chọn
  const handlePerformSync = async (specificIds?: string[]) => {
    const targetIds = specificIds || Array.from(selectedIds);
    if (targetIds.length === 0) return;

    setSyncing(true);
    setError(null);
    setSyncResultBanner(null);

    try {
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          action: "sync_zalo_articles",
          articleIds: targetIds,
          customCategories,
          forceOverwrite,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Quá trình đồng bộ bài viết thất bại.");
      }

      setSyncResultBanner({
        type: "success",
        message: `Đồng bộ thành công! Đã nạp ${data.insertedCount} bài mới và cập nhật ${data.updatedCount} bài trên Web App.`,
      });

      // Tải lại preview và gọi callback cho trang tin ngoài cập nhật
      await fetchPreviewArticles();
      if (onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (err: any) {
      setSyncResultBanner({
        type: "error",
        message: err?.message || "Đã xảy ra lỗi trong quá trình đồng bộ.",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zalo-sync-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <MessageCircle size={22} className="fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="zalo-sync-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 truncate"
                >
                  Đồng Bộ Bài Viết Zalo OA Ban Điều Hành
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                  OA Cơ quan Nhà nước
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Tự động kéo bài viết, hình ảnh và phân loại từ Zalo OA vào Cổng Cư Dân Số Khu Phố 3
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stat strip & Controls */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium inline-flex items-center gap-1.5 shadow-2xs">
              <span className="font-bold text-slate-900">{totalZaloArticles}</span> bài viết trên Zalo OA
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium inline-flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span className="font-bold">{syncedCount}</span> đã có trên Web
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-medium inline-flex items-center gap-1.5 shadow-2xs">
              <Sparkles size={13} className="text-blue-600" />
              <span className="font-bold">{unsyncedCount}</span> sẵn sàng nạp
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchPreviewArticles}
              disabled={loading || syncing}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin text-blue-600" : ""} />
              Làm mới danh sách
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết theo tiêu đề..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto shrink-0 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterMode("unsynced")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === "unsynced"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Chưa nạp ({unsyncedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === "all"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả ({articles.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("synced")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === "synced"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đã có ({syncedCount})
            </button>
          </div>
        </div>

        {/* Sync Result Banner */}
        {syncResultBanner && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
              syncResultBanner.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {syncResultBanner.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{syncResultBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncResultBanner(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Main Content Area / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 evon-scroll">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium">Đang kết nối Zalo OA và tải danh sách bài viết...</p>
            </div>
          ) : error ? (
            <div className="py-12 px-6 rounded-xl bg-rose-50/70 border border-rose-200 text-center text-rose-800 space-y-2">
              <AlertCircle size={28} className="mx-auto text-rose-600" />
              <p className="text-xs sm:text-sm font-semibold">{error}</p>
              <Button size="xs" variant="outline" onClick={fetchPreviewArticles}>
                Thử lại
              </Button>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-medium">Không tìm thấy bài viết nào phù hợp.</p>
            </div>
          ) : (
            <>
              {/* Select all header */}
              <div className="flex items-center justify-between pb-2 px-1 text-xs text-slate-500 border-b border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      filteredArticles.length > 0 &&
                      filteredArticles.every((a) => selectedIds.has(a.id))
                    }
                    onChange={toggleSelectAllVisible}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Chọn tất cả ({filteredArticles.length} bài trong danh sách)</span>
                </label>
                <span>Đã chọn: <strong className="text-blue-700">{selectedIds.size}</strong> bài</span>
              </div>

              {/* Articles Grid / List */}
              <div className="space-y-2">
                {filteredArticles.map((art) => {
                  const isChecked = selectedIds.has(art.id);
                  const currentCat = customCategories[art.id] || art.suggestedCategory;

                  return (
                    <div
                      key={art.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isChecked
                          ? "bg-blue-50/30 border-blue-200 shadow-2xs"
                          : art.isSynced
                          ? "bg-slate-50/40 border-slate-200 opacity-80"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Checkbox + Thumbnail + Title */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(art.id)}
                          aria-label={`Chọn bài viết ${art.title}`}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-1 shrink-0"
                        />

                        {art.thumb ? (
                          <img
                            src={art.thumb}
                            alt=""
                            className="w-14 h-14 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText size={20} />
                          </div>
                        )}

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {art.isSynced ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <Check size={10} /> Đã có trên Web
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                🟢 Mới (Chưa nạp)
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock size={11} /> {art.createDateFormatted}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Eye size={11} /> {art.totalView} lượt đọc
                            </span>
                          </div>

                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {art.title}
                          </h3>

                          {art.linkView && (
                            <a
                              href={art.linkView}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 hover:underline"
                            >
                              <span>Xem bài gốc trên Zalo OA</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Category Selector */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                        <div className="flex flex-col items-end">
                          <label className="text-[10px] text-slate-400 font-medium">Chuyên mục nạp:</label>
                          <select
                            value={currentCat}
                            onChange={(e) =>
                              handleCategoryChange(
                                art.id,
                                e.target.value as ZaloArticlePreviewItem["suggestedCategory"]
                              )
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                          >
                            {CATEGORY_OPTIONS.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={forceOverwrite}
              onChange={(e) => setForceOverwrite(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Ghi đè/cập nhật lại bài đã có trên Web App</span>
          </label>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={syncing}
            >
              Đóng
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const recentUnsynced = articles
                  .filter((a) => !a.isSynced)
                  .slice(0, 10)
                  .map((a) => a.id);
                handlePerformSync(recentUnsynced.length > 0 ? recentUnsynced : articles.slice(0, 10).map((a) => a.id));
              }}
              disabled={syncing || articles.length === 0}
              className="text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              Đồng bộ nhanh 10 bài mới nhất
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handlePerformSync()}
              disabled={syncing || selectedIds.size === 0}
              leftIcon={
                syncing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )
              }
              className="font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {syncing
                ? "Đang nạp bài viết..."
                : `Đồng bộ (${selectedIds.size} bài đã chọn)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
