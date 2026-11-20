import {
  AlertTriangle,
  Award,
  BookOpen,
  Newspaper,
  Sparkles,
  Users,
} from "lucide-react";
import { CommunityEvent, LocalNews } from "../../types";

export interface NewsCoverPreset {
  id: string;
  label: string;
  category: LocalNews["category"];
  url: string;
  desc: string;
}

export const COVER_PRESETS: NewsCoverPreset[] = [
  {
    id: "med",
    label: "Y tế & Phòng dịch",
    category: "Thông báo khẩn",
    url: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=1200&auto=format&fit=crop&q=80",
    desc: "Phun thuốc diệt muỗi, phòng chống dịch sốt xuất huyết",
  },
  {
    id: "id_card",
    label: "Căn cước & VNeID",
    category: "Hành chính",
    url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80",
    desc: "Làm thẻ căn cước mới, chuyển đổi số & định danh VNeID",
  },
  {
    id: "meeting",
    label: "Tiếp dân & Họp Chi bộ",
    category: "Hành chính",
    url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=80",
    desc: "Hội nghị đối thoại, tiếp công dân định kỳ tại Nhà văn hóa",
  },
  {
    id: "charity",
    label: "An sinh & Đền ơn đáp nghĩa",
    category: "An sinh xã hội",
    url: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1200&auto=format&fit=crop&q=80",
    desc: "Trao quà tình nghĩa, trợ cấp hộ nghèo & gia đình chính sách",
  },
  {
    id: "sport",
    label: "Thể thao & Hội thi hè",
    category: "Phong trào",
    url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&auto=format&fit=crop&q=80",
    desc: "Hội thao cộng đồng, tiếng hát thiếu nhi & sinh hoạt hè",
  },
  {
    id: "pccc",
    label: "Diễn tập PCCC hẻm",
    category: "Hành chính",
    url: "https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=1200&auto=format&fit=crop&q=80",
    desc: "Tổ liên gia an toàn PCCC, tập huấn cứu nạn & bình bọt dập lửa",
  },
  {
    id: "green",
    label: "Chủ nhật Xanh & Môi trường",
    category: "Phong trào",
    url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop&q=80",
    desc: "Ngày hội vệ sinh hẻm, dọn rác khai thông cống rãnh",
  },
];

export function getNewsImage(news: LocalNews): string {
  // Prioritize uploaded Data URLs or explicitly chosen images
  if (news.imageUrl && news.imageUrl.startsWith("data:image/")) {
    return news.imageUrl;
  }
  const t = news.title.toLowerCase();
  if (news.imageUrl && !news.imageUrl.includes("1450133064473")) {
    return news.imageUrl;
  }
  if (t.includes("sốt xuất huyết") || t.includes("phun thuốc") || t.includes("muỗi") || t.includes("dịch") || t.includes("y tế")) {
    return COVER_PRESETS[0].url;
  }
  if (t.includes("căn cước") || t.includes("cccd") || t.includes("vneid") || t.includes("hành chính") || t.includes("cài đặt")) {
    return COVER_PRESETS[1].url;
  }
  if (t.includes("tiếp công dân") || t.includes("tiếp dân") || t.includes("chi bộ") || t.includes("đối thoại") || t.includes("lịch tiếp")) {
    return COVER_PRESETS[2].url;
  }
  if (t.includes("nghèo") || t.includes("đền ơn") || t.includes("tình nghĩa") || t.includes("an sinh") || t.includes("cứu trợ") || t.includes("quỹ")) {
    return COVER_PRESETS[3].url;
  }
  if (t.includes("thể thao") || t.includes("tiếng hát") || t.includes("thiếu nhi") || t.includes("hè") || t.includes("văn nghệ")) {
    return COVER_PRESETS[4].url;
  }
  if (t.includes("chữa cháy") || t.includes("pccc") || t.includes("cứu nạn") || t.includes("bình gas") || t.includes("cháy")) {
    return COVER_PRESETS[5].url;
  }
  if (t.includes("môi trường") || t.includes("chủ nhật xanh") || t.includes("rác") || t.includes("vệ sinh")) {
    return COVER_PRESETS[6].url;
  }
  if (news.image && !news.image.includes("1450133064473")) return news.image;

  switch (news.category) {
    case "Thông báo khẩn":
      return COVER_PRESETS[0].url;
    case "Hành chính":
      return COVER_PRESETS[1].url;
    case "Y tế & Đời sống":
      return COVER_PRESETS[0].url;
    case "An sinh xã hội":
      return COVER_PRESETS[3].url;
    case "Phong trào":
      return COVER_PRESETS[4].url;
    default:
      return COVER_PRESETS[2].url;
  }
}

export function getNewsSummary(news: LocalNews): string {
  if (news.summary && news.summary.trim().length > 0) return news.summary;
  const cleanContent = news.content.replace(/\n+/g, " ");
  return cleanContent.length > 130 ? `${cleanContent.substring(0, 130)}...` : cleanContent;
}

export function getNewsReadTime(news: LocalNews): string {
  if (news.readTime) return news.readTime;
  const wordCount = news.content.split(/\s+/).length;
  return `${Math.max(2, Math.ceil(wordCount / 50))} phút đọc`;
}

export function getNewsViews(news: LocalNews): number {
  if (news.views) return news.views;
  const charCodeSum = news.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 100);
  return ((charCodeSum * 3) % 400) + 180;
}

export function getCategoryTheme(category: LocalNews["category"]) {
  switch (category) {
    case "Thông báo khẩn":
      return {
        pill: "bg-rose-50 text-rose-700 border-rose-200",
        solid: "bg-rose-600 text-white",
        dot: "bg-rose-500",
        ring: "ring-rose-500/20",
        border: "border-rose-200",
        icon: AlertTriangle,
      };
    case "Hành chính":
      return {
        pill: "bg-blue-50 text-blue-700 border-blue-200",
        solid: "bg-blue-600 text-white",
        dot: "bg-blue-500",
        ring: "ring-blue-500/20",
        border: "border-blue-200",
        icon: BookOpen,
      };
    case "Y tế & Đời sống":
      return {
        pill: "bg-teal-50 text-teal-700 border-teal-200",
        solid: "bg-teal-600 text-white",
        dot: "bg-teal-500",
        ring: "ring-teal-500/20",
        border: "border-teal-200",
        icon: Sparkles,
      };
    case "An sinh xã hội":
      return {
        pill: "bg-pink-50 text-pink-700 border-pink-200",
        solid: "bg-pink-600 text-white",
        dot: "bg-pink-500",
        ring: "ring-pink-500/20",
        border: "border-pink-200",
        icon: Award,
      };
    case "Phong trào":
      return {
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
        solid: "bg-emerald-600 text-white",
        dot: "bg-emerald-500",
        ring: "ring-emerald-500/20",
        border: "border-emerald-200",
        icon: Users,
      };
    default:
      return {
        pill: "bg-slate-50 text-slate-700 border-slate-200",
        solid: "bg-slate-700 text-white",
        dot: "bg-slate-500",
        ring: "ring-slate-500/20",
        border: "border-slate-200",
        icon: Newspaper,
      };
  }
}

export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeNewsAuthor(author?: string): string {
  const trimmed = (author || "").trim();
  if (
    !trimmed ||
    /nguyễn văn hùng\s*-\s*bí thư chi bộ/i.test(trimmed) ||
    /^nguyễn văn hùng$/i.test(trimmed)
  ) {
    return "Ban Điều hành Khu phố 3";
  }
  return trimmed;
}

export function normalizeNewsItem(item: LocalNews): LocalNews {
  const cleanAuthor = normalizeNewsAuthor(item.author);
  return cleanAuthor === item.author ? item : { ...item, author: cleanAuthor };
}

export function doesEventMatchVenue(eventLocation: string, venueFullName: string): boolean {
  const loc = (eventLocation || "").trim().toLowerCase();
  const venueLower = (venueFullName || "").trim().toLowerCase();
  if (!loc || !venueLower) return false;
  if (loc === venueLower) return true;

  const venueShort = venueLower.split("(")[0].trim();
  if (loc === venueShort) return true;

  if (venueShort.startsWith("sân ")) {
    return loc.includes("sân nhà văn hóa") || loc.includes("sân nvh");
  }
  if (venueShort.startsWith("phòng sinh hoạt")) {
    return loc.includes("phòng sinh hoạt");
  }
  if (venueShort.startsWith("điểm sinh hoạt")) {
    return loc.includes("điểm sinh hoạt");
  }
  if (venueShort.startsWith("nhà văn hóa")) {
    return (loc.includes("nhà văn hóa") || loc.includes("hội trường")) && !loc.includes("sân ");
  }
  return loc.includes(venueShort);
}

function extractNormalizedEventSchedule(rawDateTime: string): {
  dateKey: string | null;
  startMin: number;
  endMin: number;
  rawNorm: string;
} {
  const raw = (rawDateTime || "").trim();
  const rawNorm = raw.toLowerCase().replace(/\s+/g, " ");
  let dateKey: string | null = null;
  let strippedForTime = raw;

  const dmyMatch = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  const ymdMatch = raw.match(/\b(20\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, "0");
    const mm = dmyMatch[2].padStart(2, "0");
    const yyyy = dmyMatch[3];
    dateKey = `${yyyy}-${mm}-${dd}`;
    strippedForTime = raw.replace(dmyMatch[0], " ");
  } else if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, "0");
    const dd = ymdMatch[3].padStart(2, "0");
    dateKey = `${yyyy}-${mm}-${dd}`;
    strippedForTime = raw.replace(ymdMatch[0], " ");
  }

  const timeMatches = Array.from(
    strippedForTime.matchAll(/\b([01]?\d|2[0-3])(?:[:hHg]([0-5]\d)|\s*[hHg])\b/g)
  );
  if (timeMatches.length >= 2) {
    const startMin = Number(timeMatches[0][1]) * 60 + Number(timeMatches[0][2] || 0);
    const endMin = Number(timeMatches[1][1]) * 60 + Number(timeMatches[1][2] || 0);
    return {
      dateKey,
      startMin: Math.min(startMin, endMin),
      endMin: Math.max(endMin, startMin + 30),
      rawNorm,
    };
  }
  if (timeMatches.length === 1) {
    const startMin = Number(timeMatches[0][1]) * 60 + Number(timeMatches[0][2] || 0);
    return {
      dateKey,
      startMin,
      endMin: startMin + 120,
      rawNorm,
    };
  }

  return {
    dateKey,
    startMin: 0,
    endMin: 24 * 60,
    rawNorm,
  };
}

export function findVenueScheduleConflicts(
  candidateLocation: string,
  candidateDateTime: string,
  allEvents: CommunityEvent[],
  excludeEventId?: string
): CommunityEvent[] {
  const cleanLoc = (candidateLocation || "").trim();
  const cleanTime = (candidateDateTime || "").trim();
  if (!cleanLoc || !cleanTime) return [];

  const candSched = extractNormalizedEventSchedule(cleanTime);

  return allEvents.filter((ev) => {
    if (excludeEventId && ev.id === excludeEventId) return false;
    if (ev.status === "Đã kết thúc" || ev.status === "Đã hủy") return false;

    const sameVenue =
      doesEventMatchVenue(ev.location, cleanLoc) ||
      doesEventMatchVenue(cleanLoc, ev.location);
    if (!sameVenue) return false;

    const evSched = extractNormalizedEventSchedule(ev.dateTime);
    if (candSched.dateKey && evSched.dateKey) {
      if (candSched.dateKey !== evSched.dateKey) return false;
      return candSched.startMin < evSched.endMin && evSched.startMin < candSched.endMin;
    }

    return candSched.rawNorm.length >= 5 && candSched.rawNorm === evSched.rawNorm;
  });
}

