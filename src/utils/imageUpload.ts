import { supabase, isSupabaseConfigured } from "../lib/supabase";

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
    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh."));
    reader.readAsDataURL(file);
  });
}

/**
 * Nén ảnh phía trình duyệt để hiển thị nhanh và tiết kiệm bộ nhớ / băng thông.
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
 * Nén ảnh và tải lên Supabase Storage (bucket "field-reports") nếu khả dụng,
 * fallback an toàn về DataURL đã nén để hoạt động mượt kể cả khi offline hoặc chạy cục bộ.
 */
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

    const compressedDataUrl = await compressImageToDataUrl(file);

    if (isSupabaseConfigured && supabase) {
      try {
        const blob = dataUrlToBlob(compressedDataUrl);
        if (blob) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${folderPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("field-reports")
            .upload(path, blob, { contentType: "image/jpeg", upsert: false });

          if (!uploadError) {
            const { data: pub } = supabase.storage.from("field-reports").getPublicUrl(path);
            if (pub?.publicUrl) {
              urls.push(pub.publicUrl);
              continue;
            }
          }
        }
      } catch {
        // Fallback xuống DataURL nén bên dưới khi bucket chưa khởi tạo
      }
    }

    urls.push(compressedDataUrl);
  }

  return { urls, errors };
}

