/**
 * Timemark OCR & EXIF GPS Parser Utility
 * Bóc tách tự động Tọa độ GPS thật, Địa chỉ, Thời gian thực và Mã xác thực
 * từ ảnh chụp watermark Timemark Camera (Gemini 2.5 Flash Vision) + EXIF GPS dự phòng.
 * Tuyệt đối không trả về tọa độ giả lập cứng khi ảnh không có thông tin định vị.
 */

export interface TimemarkOcrResult {
  coordinates: string;
  lat: number;
  lng: number;
  rawCoordinates?: string;
  address?: string;
  streetArea?: string;
  landmark?: string;
  recordedTime?: string;
  rawTime?: string;
  elevation?: string;
  direction?: string;
  timemarkHash?: string;
  isVerified: boolean;
}

export function parseTimemarkText(text: string): TimemarkOcrResult | null {
  if (!text) return null;

  const gpsRegex = /([0-9]{1,2}\.[0-9]+)\s*°?\s*N[,\s]+([0-9]{2,3}\.[0-9]+)\s*°?\s*E/i;
  const simpleGpsRegex = /([0-9]{1,2}\.[0-9]{4,})[,\s]+([0-9]{2,3}\.[0-9]{4,})/;

  let lat: number | null = null;
  let lng: number | null = null;
  let rawCoordinates: string | undefined = undefined;

  const gpsMatch = text.match(gpsRegex);
  if (gpsMatch) {
    lat = parseFloat(gpsMatch[1]);
    lng = parseFloat(gpsMatch[2]);
    rawCoordinates = `${gpsMatch[1]}°N, ${gpsMatch[2]}°E`;
  } else {
    const simpleMatch = text.match(simpleGpsRegex);
    if (simpleMatch) {
      lat = parseFloat(simpleMatch[1]);
      lng = parseFloat(simpleMatch[2]);
      rawCoordinates = `${simpleMatch[1]}, ${simpleMatch[2]}`;
    }
  }

  const timeRegex =
    /(?:Thứ\s+[^\s,]+|Chủ\s+nhật)[,\s]+(\d{1,2})\s+Tháng\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}:\d{2})/i;
  let recordedTime: string | undefined = undefined;
  let rawTime: string | undefined = undefined;

  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    rawTime = timeMatch[0].trim();
    const day = timeMatch[1].padStart(2, "0");
    const month = timeMatch[2].padStart(2, "0");
    const year = timeMatch[3];
    const hour = timeMatch[4];
    recordedTime = `${year}-${month}-${day} ${hour}`;
  }

  const hashRegex = /([A-Z0-9]{10,24})\s+Timemark\s+Verified/i;
  const simpleHashRegex = /Timemark\s+Verified\s*[:\s]*([A-Z0-9]{10,24})/i;
  let timemarkHash: string | undefined = undefined;

  const hashMatch = text.match(hashRegex) || text.match(simpleHashRegex);
  if (hashMatch) {
    timemarkHash = hashMatch[1].trim();
  }

  const elevationRegex = /Độ\s*cao\s*([0-9.]+\s*m)/i;
  const directionRegex = /Phương\s*hướng\s*([0-9.]+\s*°?\s*[A-Z]+)/i;
  const elevationMatch = text.match(elevationRegex);
  const directionMatch = text.match(directionRegex);

  const addressRegex =
    /(?:Đường|Hẻm|Số|Khu\s*phố)\s+[^\n,]+(?:[,\s]+Thành\s*Phố[^\n,]+)?(?:[,\s]+P\.\s*An\s*Phú)?/i;
  const addrMatch = text.match(addressRegex);
  const address: string | undefined = addrMatch ? addrMatch[0].trim() : undefined;
  let streetArea: string | undefined = undefined;

  if (address) {
    const streetMatch = address.match(/(Đường\s+[^,]+|Hẻm\s+[^,]+)/i);
    if (streetMatch) {
      streetArea = streetMatch[1].trim();
    }
  }

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  return {
    coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    lat,
    lng,
    rawCoordinates,
    address,
    streetArea,
    recordedTime,
    rawTime,
    elevation: elevationMatch ? elevationMatch[1].trim() : undefined,
    direction: directionMatch ? directionMatch[1].trim() : undefined,
    timemarkHash,
    isVerified: Boolean(timemarkHash || text.toLowerCase().includes("timemark")),
  };
}

/**
 * Đọc trực tiếp tọa độ EXIF GPS (TIFF IFD GPSInfo tag 0x8825) từ tệp JPEG nhị phân làm dự phòng khi offline
 */
function parseExifGpsFromBuffer(buffer: ArrayBuffer): { lat: number; lng: number } | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffda || marker === 0xffd9) break;
      const segLength = view.getUint16(offset, false);
      if (marker === 0xffe1 && offset + 8 < view.byteLength) {
        const exifHeader =
          String.fromCharCode(view.getUint8(offset + 2)) +
          String.fromCharCode(view.getUint8(offset + 3)) +
          String.fromCharCode(view.getUint8(offset + 4)) +
          String.fromCharCode(view.getUint8(offset + 5));
        if (exifHeader === "Exif") {
          const tiffStart = offset + 8;
          const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
          const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
          const ifd0 = tiffStart + firstIfdOffset;
          if (ifd0 + 2 >= view.byteLength) return null;

          const entries = view.getUint16(ifd0, littleEndian);
          let gpsIfdOffset = 0;
          for (let i = 0; i < entries; i++) {
            const entryOffset = ifd0 + 2 + i * 12;
            if (entryOffset + 12 > view.byteLength) break;
            const tag = view.getUint16(entryOffset, littleEndian);
            if (tag === 0x8825) {
              gpsIfdOffset = view.getUint32(entryOffset + 8, littleEndian);
              break;
            }
          }
          if (!gpsIfdOffset) return null;

          const gpsDir = tiffStart + gpsIfdOffset;
          if (gpsDir + 2 >= view.byteLength) return null;
          const gpsEntries = view.getUint16(gpsDir, littleEndian);

          let latRef = "N";
          let lngRef = "E";
          let latVals: number[] | null = null;
          let lngVals: number[] | null = null;

          const readRationals = (valOffset: number): number[] | null => {
            const abs = tiffStart + valOffset;
            if (abs + 24 > view.byteLength) return null;
            const out: number[] = [];
            for (let k = 0; k < 3; k++) {
              const num = view.getUint32(abs + k * 8, littleEndian);
              const den = view.getUint32(abs + k * 8 + 4, littleEndian);
              out.push(den ? num / den : 0);
            }
            return out;
          };

          for (let i = 0; i < gpsEntries; i++) {
            const eOff = gpsDir + 2 + i * 12;
            if (eOff + 12 > view.byteLength) break;
            const tag = view.getUint16(eOff, littleEndian);
            if (tag === 0x0001) {
              latRef = String.fromCharCode(view.getUint8(eOff + 8));
            } else if (tag === 0x0002) {
              latVals = readRationals(view.getUint32(eOff + 8, littleEndian));
            } else if (tag === 0x0003) {
              lngRef = String.fromCharCode(view.getUint8(eOff + 8));
            } else if (tag === 0x0004) {
              lngVals = readRationals(view.getUint32(eOff + 8, littleEndian));
            }
          }

          if (latVals && lngVals) {
            let lat = latVals[0] + latVals[1] / 60 + latVals[2] / 3600;
            let lng = lngVals[0] + lngVals[1] / 60 + lngVals[2] / 3600;
            if (latRef === "S") lat = -lat;
            if (lngRef === "W") lng = -lng;
            if (Math.abs(lat) > 0.01 && Math.abs(lng) > 0.01) {
              return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
            }
          }
          return null;
        }
      }
      offset += segLength;
    }
  } catch {
    return null;
  }
  return null;
}

export async function extractTimemarkFromImage(
  fileOrBase64: File | string,
  fileNameHint?: string
): Promise<TimemarkOcrResult | null> {
  let base64DataUrl: string;
  let mimeType = "image/jpeg";
  let exifFallback: { lat: number; lng: number } | null = null;

  try {
    if (typeof fileOrBase64 === "string") {
      base64DataUrl = fileOrBase64;
      const mimeMatch = fileOrBase64.match(/^data:([^;]+);base64,/i);
      if (mimeMatch) mimeType = mimeMatch[1];
    } else {
      mimeType = fileOrBase64.type || "image/jpeg";
      const arrayBuffer = await fileOrBase64.arrayBuffer();
      exifFallback = parseExifGpsFromBuffer(arrayBuffer);
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      base64DataUrl = `data:${mimeType};base64,${btoa(binary)}`;
    }

    // 1. Gọi Gemini 2.5 Flash Vision qua /api/ocr-document (docType: "timemark_photo")
    if (base64DataUrl && typeof fetch === "function") {
      const resp = await fetch("/api/ocr-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: "timemark_photo",
          fileBase64: base64DataUrl,
          mimeType,
          fileName: typeof fileOrBase64 === "string" ? fileNameHint || "timemark.jpg" : fileOrBase64.name,
        }),
      });

      if (resp.ok) {
        const payload = await resp.json();
        if (payload?.available && payload?.data) {
          const d = payload.data;
          let lat = Number(d.lat);
          let lng = Number(d.lng);
          if ((!lat || !lng) && typeof d.rawCoordinates === "string") {
            const fromRaw = parseTimemarkText(d.rawCoordinates);
            if (fromRaw) {
              lat = fromRaw.lat;
              lng = fromRaw.lng;
            }
          }
          if (lat && lng && Math.abs(lat) > 0.01 && Math.abs(lng) > 0.01) {
            return {
              coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              lat: Number(lat.toFixed(6)),
              lng: Number(lng.toFixed(6)),
              rawCoordinates: String(d.rawCoordinates || `${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`).trim(),
              address: String(d.address || "").trim() || undefined,
              streetArea: String(d.streetArea || "").trim() || undefined,
              landmark: String(d.landmark || "").trim() || undefined,
              recordedTime: String(d.recordedTime || "").trim() || undefined,
              rawTime: String(d.rawTime || "").trim() || undefined,
              elevation: String(d.elevation || "").trim() || undefined,
              direction: String(d.direction || "").trim() || undefined,
              timemarkHash: String(d.timemarkHash || "").trim() || undefined,
              isVerified: Boolean(d.isVerified || d.timemarkHash),
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("[TimemarkParser] Vision OCR failed, trying EXIF GPS fallback:", err);
  }

  // 2. Dự phòng EXIF GPS thật từ header ảnh gốc (nếu ảnh có gắn thẻ định vị GPS)
  if (exifFallback) {
    return {
      coordinates: `${exifFallback.lat.toFixed(6)}, ${exifFallback.lng.toFixed(6)}`,
      lat: exifFallback.lat,
      lng: exifFallback.lng,
      rawCoordinates: `${exifFallback.lat.toFixed(6)}°N, ${exifFallback.lng.toFixed(6)}°E`,
      isVerified: false,
    };
  }

  return null;
}
