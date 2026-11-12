import React, { useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  Image as ImageIcon,
  Images,
  Link2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { NewsLinkAttachment } from "../../types";
import {
  compressImageToDataUrl,
  validateImageFile,
} from "../../utils/imageUpload";
import { COVER_PRESETS, normalizeExternalUrl } from "./newsHelpers";

export interface NewsMediaAndLinksFieldsProps {
  imageUrl: string;
  onChangeImageUrl: (url: string) => void;
  imageGallery: string[];
  onChangeImageGallery: (next: string[]) => void;
  links: NewsLinkAttachment[];
  onChangeLinks: (next: NewsLinkAttachment[]) => void;
}

export const NewsMediaAndLinksFields: React.FC<NewsMediaAndLinksFieldsProps> = ({
  imageUrl,
  onChangeImageUrl,
  imageGallery,
  onChangeImageGallery,
  links,
  onChangeLinks,
}) => {
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);

  const [galleryUrlDraft, setGalleryUrlDraft] = useState("");
  const [linkLabelDraft, setLinkLabelDraft] = useState("");
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const err = validateImageFile(file);
    if (err) {
      setUploadError(err);
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const compressed = await compressImageToDataUrl(file, {
        maxWidth: 1400,
        maxHeight: 1050,
        quality: 0.85,
      });
      onChangeImageUrl(compressed);
    } catch (ex) {
      setUploadError(
        ex instanceof Error ? ex.message : "Không thể xử lý ảnh tải lên."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleUploadGalleryFiles = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;

    setUploadError(null);
    setUploading(true);
    const added: string[] = [];
    try {
      for (const file of files.slice(0, 8)) {
        const err = validateImageFile(file);
        if (err) {
          setUploadError(err);
          continue;
        }
        const compressed = await compressImageToDataUrl(file, {
          maxWidth: 1200,
          maxHeight: 900,
          quality: 0.82,
        });
        added.push(compressed);
      }
      if (added.length > 0) {
        onChangeImageGallery([...imageGallery, ...added]);
      }
    } catch (ex) {
      setUploadError(
        ex instanceof Error ? ex.message : "Lỗi nén hình ảnh đính kèm."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAddGalleryUrl = () => {
    const safeUrl = normalizeExternalUrl(galleryUrlDraft);
    if (!safeUrl) {
      setUploadError("Đường dẫn ảnh đính kèm không hợp lệ.");
      return;
    }
    setUploadError(null);
    onChangeImageGallery([...imageGallery, safeUrl]);
    setGalleryUrlDraft("");
  };

  const handleAddLink = () => {
    const safeUrl = normalizeExternalUrl(linkUrlDraft);
    if (!safeUrl) {
      setUploadError("Vui lòng nhập đường dẫn (URL) hợp lệ.");
      return;
    }
    setUploadError(null);
    const cleanLabel = linkLabelDraft.trim() || safeUrl;
    const newItem: NewsLinkAttachment = {
      id: `lnk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: cleanLabel,
      url: safeUrl,
    };
    onChangeLinks([...links, newItem]);
    setLinkLabelDraft("");
    setLinkUrlDraft("");
  };

  return (
    <div className="space-y-4 pt-3 border-t border-slate-200">
      {uploadError && (
        <div
          role="alert"
          className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2"
        >
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-600 hover:text-rose-800 cursor-pointer"
            aria-label="Đóng thông báo lỗi"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. ẢNH BÌA CHÍNH */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-emerald-700" />
            Ảnh bìa bản tin
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadCover}
              className="hidden"
              id="news-cover-upload-input"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => coverFileInputRef.current?.click()}
              className="min-h-9 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Upload size={13} />
              <span>{uploading ? "Đang tải..." : "Tải ảnh bìa từ máy"}</span>
            </button>
          </div>
        </div>

        {/* Preview selected cover if custom/uploaded */}
        {imageUrl && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <img
              src={imageUrl}
              alt="Ảnh bìa hiện tại"
              className="w-24 h-14 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-xs font-semibold text-slate-700 block">
                Ảnh bìa đang chọn
              </span>
              <input
                type="text"
                aria-label="URL ảnh bìa bản tin"
                placeholder="Hoặc dán URL ảnh bìa (https://...)"
                value={imageUrl.startsWith("data:image/") ? "" : imageUrl}
                onChange={(e) => onChangeImageUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:border-emerald-600 font-mono"
              />
              {imageUrl.startsWith("data:image/") && (
                <span className="text-[11px] text-emerald-700 font-medium block">
                  Đã tải ảnh từ thiết bị (tự động tối ưu dung lượng)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Preset cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COVER_PRESETS.map((preset) => {
            const isSelected = imageUrl === preset.url;
            return (
              <button
                type="button"
                key={preset.id}
                onClick={() => onChangeImageUrl(preset.url)}
                className={`group relative rounded-xl overflow-hidden border-2 text-left cursor-pointer transition-all ${
                  isSelected
                    ? "border-emerald-600 ring-2 ring-emerald-500/30"
                    : "border-slate-200 hover:border-emerald-400"
                }`}
              >
                <div className="aspect-video w-full bg-slate-100">
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-1.5 bg-white text-center">
                  <span className="text-[11px] font-bold text-slate-800 truncate block">
                    {preset.label}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. THƯ VIỆN ẢNH ĐÍNH KÈM (UPLOAD NHIỀU ẢNH HOẶC DÁN LINK ẢNH) */}
      <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Images size={14} className="text-emerald-700" />
            Hình ảnh đính kèm bổ sung ({imageGallery.length})
          </span>
          <div>
            <input
              ref={galleryFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUploadGalleryFiles}
              className="hidden"
              id="news-gallery-upload-input"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => galleryFileInputRef.current?.click()}
              className="min-h-9 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Upload size={13} />
              <span>Tải nhiều ảnh đính kèm</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={galleryUrlDraft}
            onChange={(e) => setGalleryUrlDraft(e.target.value)}
            placeholder="Hoặc dán URL hình ảnh đính kèm (https://...)"
            className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
          />
          <button
            type="button"
            onClick={handleAddGalleryUrl}
            disabled={!galleryUrlDraft.trim()}
            className="min-h-9 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus size={13} /> Thêm ảnh
          </button>
        </div>

        {imageGallery.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {imageGallery.map((imgUrl, idx) => (
              <div
                key={`${idx}-${imgUrl.slice(0, 24)}`}
                className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-video"
              >
                <img
                  src={imgUrl}
                  alt={`Ảnh đính kèm ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Xóa ảnh đính kèm ${idx + 1}`}
                  onClick={() =>
                    onChangeImageGallery(imageGallery.filter((_, i) => i !== idx))
                  }
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. ĐƯỜNG DẪN / LINK ĐÍNH KÈM */}
      <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Link2 size={14} className="text-blue-700" />
          Liên kết đính kèm bài viết ({links.length})
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            value={linkLabelDraft}
            onChange={(e) => setLinkLabelDraft(e.target.value)}
            placeholder="Tên nút / Mô tả link (VD: Tờ khai trực tuyến)"
            className="sm:col-span-5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
          />
          <input
            type="text"
            value={linkUrlDraft}
            onChange={(e) => setLinkUrlDraft(e.target.value)}
            placeholder="Đường dẫn URL (https://...)"
            className="sm:col-span-5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
          />
          <button
            type="button"
            onClick={handleAddLink}
            disabled={!linkUrlDraft.trim()}
            className="sm:col-span-2 min-h-9 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus size={13} /> Thêm link
          </button>
        </div>

        {links.length > 0 && (
          <ul className="space-y-1.5 pt-1">
            {links.map((lnk) => (
              <li
                key={lnk.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <ExternalLink size={13} className="text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 block truncate">
                      {lnk.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 block truncate">
                      {lnk.url}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Xóa liên kết ${lnk.label}`}
                  onClick={() =>
                    onChangeLinks(links.filter((item) => item.id !== lnk.id))
                  }
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
