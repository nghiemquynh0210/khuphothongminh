import { supabase, isSupabaseConfigured } from "../lib/supabase";

export type StorageBucketName =
  | "field-reports"
  | "cadastral-docs"
  | "task-attachments"
  | "admin-forms";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_IMAGE_RAW_BYTES = 10 * 1024 * 1024; // 10 MB trước nén
export const DEFAULT_MAX_IMAGES_PER_SET = 4;

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return `Tệp "${file.name}" không phải hình ảnh hợp lệ (chỉ hỗ trợ JPG, PNG, WebP).`;
  }
  if (file.size > MAX_IMAGE_RAW_BYTES) {
    return `Ảnh "${file.name}" vượt quá giới hạn 10 MB.`;
  }
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc tệp."));
    reader.readAsDataURL(file);
  });
}

/**
 * Nén ảnh phía trình duyệt để hiển thị nhanh và tiết kiệm băng thông (< 400KB).
 */
export async function compressImageToDataUrl(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.82 } = options;
  const rawDataUrl = await readFileAsDataUrl(file);

  if (typeof Image === "undefined" || typeof document === "undefined") {
    return rawDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          resolve(rawDataUrl);
          return;
        }
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(",");
    if (parts.length !== 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch {
    return null;
  }
}

/**
 * Tải bất kỳ tệp nào (Ảnh đã nén, PDF Sổ đỏ/GPKD, Word Biểu mẫu, Đính kèm Nhiệm vụ)
 * lên Supabase Storage thông qua `/api/upload-storage` (chống lỗi RLS storage.objects),
 * tự động fallback sang client Storage SDK hoặc DataURL gọn nhẹ khi offline.
 */
export async function getStaffAuthHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured || !supabase) return {};
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
}

export async function uploadFileToStorageBucket(
  file: File,
  bucket: StorageBucketName,
  folderPrefix: string = "uploads"
): Promise<string> {
  const isImage = file.type.startsWith("image/");
  const dataUrl = isImage
    ? await compressImageToDataUrl(file, { maxWidth: 1500, maxHeight: 1500, quality: 0.84 })
    : await readFileAsDataUrl(file);

  const resolvedMime = isImage ? "image/jpeg" : file.type || "application/octet-stream";
  const resolvedName = isImage && !/\.jpe?g$/i.test(file.name) ? `${file.name}.jpg` : file.name;

  // 1. Ưu tiên gọi Serverless /api/upload-storage (dưới ngưỡng 4.1 MB)
  if (dataUrl.length <= 5_500_000 && typeof fetch !== "undefined") {
    try {
      const authHeaders = await getStaffAuthHeaders();
      const resp = await fetch("/api/upload-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          bucket,
          folder: folderPrefix,
          fileName: resolvedName,
          mimeType: resolvedMime,
          fileBase64: dataUrl,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json?.ok && json?.publicUrl) {
          return String(json.publicUrl);
        }
      }
    } catch {
      // Fallback sang SDK hoặc DataURL bên dưới
    }
  }

  // 2. Fallback qua Supabase Storage SDK trực tiếp
  if (isSupabaseConfigured && supabase) {
    try {
      const blob = dataUrlToBlob(dataUrl) || file;
      const safeName = resolvedName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${folderPrefix}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, blob, { contentType: resolvedMime, upsert: true });

      if (!uploadError) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        if (pub?.publicUrl) {
          return pub.publicUrl;
        }
      }
    } catch {
      // Fallback xuống DataURL
    }
  }

  return dataUrl;
}

export async function uploadReportImages(
  files: File[],
  folderPrefix: string = "evidence"
): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const err = validateImageFile(file);
    if (err) {
      errors.push(err);
      continue;
    }
    const url = await uploadFileToStorageBucket(file, "field-reports", folderPrefix);
    urls.push(url);
  }

  return { urls, errors };
}

export async function uploadSingleImage(
  file: File,
  folderPrefix: string = "cms",
  options: { maxWidth?: number; maxHeight?: number; quality?: number; bucket?: StorageBucketName } = {}
): Promise<string> {
  const err = validateImageFile(file);
  if (err) {
    throw new Error(err);
  }

  const compressedDataUrl = await compressImageToDataUrl(file, {
    maxWidth: options.maxWidth ?? 1280,
    maxHeight: options.maxHeight ?? 1280,
    quality: options.quality ?? 0.85,
  });

  const bucket = options.bucket || "field-reports";
  if (compressedDataUrl.length <= 5_500_000 && typeof fetch !== "undefined") {
    try {
      const authHeaders = await getStaffAuthHeaders();
      const resp = await fetch("/api/upload-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          bucket,
          folder: folderPrefix,
          fileName: `${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}.jpg`,
          mimeType: "image/jpeg",
          fileBase64: compressedDataUrl,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json?.ok && json?.publicUrl) {
          return String(json.publicUrl);
        }
      }
    } catch {}
  }

  return compressedDataUrl;
}
