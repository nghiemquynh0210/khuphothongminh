import React, { useRef } from "react";
import { Download, Eye, FileText, Image as ImageIcon, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { TaskAttachment } from "../../types";
import { detectFileType, formatFileSize } from "./tasksData";
import { Button } from "../ui";

interface AttachmentGalleryProps {
  attachments: TaskAttachment[];
  onAddFiles: (newFiles: TaskAttachment[]) => void;
  onRemoveFile?: (id: string) => void;
  onPreviewFile: (att: TaskAttachment) => void;
  onFileError?: (msg: string) => void;
  readOnly?: boolean;
  label?: string;
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  attachments,
  onAddFiles,
  onRemoveFile,
  onPreviewFile,
  onFileError,
  readOnly = false,
  label = "Tệp đính kèm (Ảnh, Word, PDF — tối đa 20MB)",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const accepted: TaskAttachment[] = [];
    Array.from<File>(files).forEach((file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        onFileError?.(`Tệp "${file.name}" vượt quá dung lượng tối đa 20MB.`);
        return;
      }
      const fType = detectFileType(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = (ev.target?.result as string) || "#";
        accepted.push({
          id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: formatFileSize(file.size),
          type: fType,
          url: result,
          uploadedAt: new Date().toISOString(),
        });
        if (accepted.length > 0) {
          onAddFiles([...accepted]);
          accepted.length = 0;
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5">
          <Paperclip size={14} className="text-slate-600" aria-hidden="true" />
          {label}
        </span>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="sr-only"
              aria-label={label}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<UploadCloud size={14} />}
              onClick={() => inputRef.current?.click()}
            >
              Tải tệp lên
            </Button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-slate-600 bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-2.5">
          Chưa có văn bản hoặc ảnh đính kèm.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                {att.type === "image" ? (
                  <ImageIcon size={15} className="text-emerald-700 shrink-0" aria-hidden="true" />
                ) : (
                  <FileText size={15} className="text-indigo-700 shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{att.name}</div>
                  <div className="text-xs text-slate-600">{att.size || "Tài liệu"}</div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {att.url && att.url !== "#" && (
                  <>
                    <button
                      type="button"
                      onClick={() => onPreviewFile(att)}
                      className="p-1.5 rounded-md text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer"
                      aria-label={`Xem nhanh ${att.name}`}
                      title="Xem nhanh"
                    >
                      <Eye size={14} />
                    </button>
                    <a
                      href={att.url}
                      download={att.name}
                      className="p-1.5 rounded-md text-slate-700 hover:bg-white border border-transparent hover:border-slate-200"
                      aria-label={`Tải về ${att.name}`}
                      title="Tải về"
                    >
                      <Download size={14} />
                    </a>
                  </>
                )}
                {!readOnly && onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(att.id)}
                    className="p-1.5 rounded-md text-rose-700 hover:bg-rose-50 cursor-pointer"
                    aria-label={`Xóa tệp ${att.name}`}
                    title="Xóa tệp"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
