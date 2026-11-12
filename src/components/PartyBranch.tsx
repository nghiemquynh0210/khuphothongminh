import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  UserPlus,
  Plus,
  X,
  Search,
  Trash2,
  Edit2,
  Award,
  Flame,
  Calendar,
  Heart,
  MapPin,
  PlusCircle,
  UserCheck,
  CheckCircle,
  FolderPlus,
  HelpCircle,
  FileSpreadsheet,
  Pencil,
  AlertTriangle,
  AlertCircle,
  FileText,
  UploadCloud,
  Download,
  Eye,
  Paperclip,
  FileCheck,
  FileUp,
  File,
  Image as ImageIcon,
  ExternalLink,
  Printer,
  Sparkles,
  CheckSquare,
  Square,
  Layers,
  BadgeCheck,
  CheckCircle2,
  SlidersHorizontal,
  BookmarkPlus,
  Camera,
  LayoutGrid,
  List,
  Phone,
  Home,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Flag,
  ShieldAlert,
  Briefcase,
  ArrowRight,
  Filter,
  Network
} from "lucide-react";
import { Resident, PartyMember, Association, AssociationMember, TaskItem } from "../types";
import Pagination from "./Pagination";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { StatCard } from "./common/StatCard";
import { ReportSelect } from "./reports/ReportSelect";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { Modal } from "./ui/Modal";
import { KP3_AREA_LIST, extractKp3Area } from "../utils/kp3Utils";
import { loadAssociationRecord, saveAssociationRecord } from "../utils/supabaseSync";
import { formatVNNumber } from "../utils/numberFormat";
import {
  INITIAL_ASSOCIATIONS,
  getStoredAssociations,
  saveStoredAssociations
} from "../data/associationsData";

export interface PartyResolution {
  id: string;
  sessionTitle: string;
  meetingDate: string;
  attendance: string;
  title: string;
  summary: string;
  assigneeUnit: string;
  assigneeName: string;
  deadline: string;
  taskCreated?: boolean;
}

const PARTY_RESOLUTIONS_KEY = "kp3_party_resolutions_v1";

const DEFAULT_PARTY_RESOLUTIONS: PartyResolution[] = [
  {
    id: "NQ-KP3-01",
    sessionTitle: "Sinh hoạt Chi bộ định kỳ Tháng 11/2026",
    meetingDate: "2026-11-03",
    attendance: "42/44 đảng viên",
    title: "Kiểm tra Tổ liên gia PCCC toàn Khu phố 3",
    summary: "Đảng viên phụ trách địa bàn phối hợp Ban Bảo vệ ANTT rà soát bình chữa cháy, lối thoát hiểm tại nhà trọ và các tuyến hẻm trước cao điểm cuối năm.",
    assigneeUnit: "Tổ An ninh trật tự & PCCC KP3",
    assigneeName: "Nguyễn Trung Huy",
    deadline: "2026-11-25"
  },
  {
    id: "NQ-KP3-02",
    sessionTitle: "Sinh hoạt Chi bộ định kỳ Tháng 11/2026",
    meetingDate: "2026-11-03",
    attendance: "42/44 đảng viên",
    title: "Rà soát cấp thẻ BHYT & hộ cận nghèo dịp cuối năm",
    summary: "Chi hội Phụ nữ và Ban Công tác Mặt trận phối hợp Ban Điều hành KP3 cập nhật danh sách đối tượng yếu thế đồng bộ sang phân hệ An sinh Xã hội.",
    assigneeUnit: "Ban Công tác Mặt trận KP3",
    assigneeName: "Lê Thị Hồng Sâm",
    deadline: "2026-11-20"
  },
  {
    id: "NQ-KP3-03",
    sessionTitle: "Sinh hoạt chuyên đề Quý IV/2026",
    meetingDate: "2026-10-20",
    attendance: "40/44 đảng viên",
    title: "Ra quân Chủ nhật Xanh dọn dẹp hẻm 42 Lương Định Của",
    summary: "Huy động Đảng viên 213 và Đoàn Thanh niên tham gia tổng vệ sinh, xóa điểm rác tự phát tại tuyến hẻm 42 và đường nội bộ KP3.",
    assigneeUnit: "Đoàn Thanh niên & Đảng viên 213",
    assigneeName: "Phạm Hoàng Long",
    deadline: "2026-11-18"
  }
];

export interface TargetGroupConfig {
  id: string;
  name: string;
  section: "Đảng viên" | "Chính quyền" | "Đoàn thể" | "Chính sách" | "Nhóm khác";
  defaultRole: string;
  roles: string[];
  description: string;
  badgeBg: string;
  badgeText: string;
  category: "Chính trị - Xã hội" | "Chính quyền cơ sở" | "An ninh - Quốc phòng" | "Đoàn thể nhân dân" | "Hội quần chúng" | "Chính sách xã hội" | "Phong trào tự quản";
}

// Group Types & Configuration for Chi hội & Đoàn thể
export type AssocGroupKey = "all" | "gov_party" | "security" | "mass_orgs" | "social_welfare";

export const ASSOC_GROUPS: { key: AssocGroupKey; label: string; icon: any }[] = [
  { key: "all", label: "Tất cả", icon: Layers },
  { key: "gov_party", label: "Cấp ủy & Chính quyền", icon: Building2 },
  { key: "security", label: "An ninh & PCCC", icon: ShieldAlert },
  { key: "mass_orgs", label: "Đoàn thể Nhân dân", icon: Users },
  { key: "social_welfare", label: "An sinh & Tự quản", icon: Heart },
];

export const getAssocGroupKey = (category: string = "", name: string = ""): AssocGroupKey => {
  const cat = (category || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (
    cat.includes("an ninh") ||
    cat.includes("quốc phòng") ||
    n.includes("pccc") ||
    n.includes("antt") ||
    n.includes("hoà giải") ||
    n.includes("khu đội") ||
    n.includes("công an")
  ) {
    return "security";
  }
  if (
    cat.includes("chính quyền") ||
    n.includes("ban điều hành") ||
    n.includes("tổ trưởng") ||
    n.includes("đảng") ||
    n.includes("mặt trận") ||
    cat.includes("chính trị")
  ) {
    return "gov_party";
  }
  if (
    cat.includes("chính sách") ||
    n.includes("nghèo") ||
    n.includes("người có công") ||
    n.includes("liệt sĩ") ||
    n.includes("anh hùng") ||
    n.includes("khuyết tật") ||
    n.includes("trẻ em") ||
    cat.includes("tự quản")
  ) {
    return "social_welfare";
  }
  return "mass_orgs";
};

export const getAssocBadgeStyle = (assoc: Association) => {
  const group = getAssocGroupKey(assoc.category, assoc.name);
  const n = (assoc.name || "").toLowerCase();

  if (n.includes("đảng")) {
    return {
      icon: Flag,
      iconColor: "text-red-600",
      iconBg: "bg-red-50 border border-red-100",
      groupLabel: "Cấp ủy Đảng"
    };
  }
  if (n.includes("điều hành") || n.includes("chính quyền") || n.includes("tổ trưởng")) {
    return {
      icon: Building2,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50 border border-indigo-100",
      groupLabel: "Chính quyền cơ sở"
    };
  }
  if (n.includes("mặt trận")) {
    return {
      icon: Award,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50 border border-amber-100",
      groupLabel: "Mặt trận Tổ quốc"
    };
  }
  if (n.includes("pccc") || n.includes("phòng cháy")) {
    return {
      icon: Flame,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50 border border-orange-100",
      groupLabel: "PCCC cơ sở"
    };
  }
  if (n.includes("antt") || n.includes("trật tự") || n.includes("công an")) {
    return {
      icon: ShieldCheck,
      iconColor: "text-emerald-700",
      iconBg: "bg-emerald-50 border border-emerald-100",
      groupLabel: "An ninh trật tự"
    };
  }
  if (n.includes("hoà giải")) {
    return {
      icon: UserCheck,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50 border border-blue-100",
      groupLabel: "Hòa giải cơ sở"
    };
  }
  if (n.includes("khu đội") || n.includes("dân quân")) {
    return {
      icon: ShieldAlert,
      iconColor: "text-emerald-800",
      iconBg: "bg-emerald-50 border border-emerald-100",
      groupLabel: "Quân sự cơ sở"
    };
  }
  if (n.includes("phụ nữ")) {
    return {
      icon: Heart,
      iconColor: "text-rose-600",
      iconBg: "bg-rose-50 border border-rose-100",
      groupLabel: "Hội Phụ nữ"
    };
  }
  if (n.includes("thanh niên") || n.includes("đoàn")) {
    return {
      icon: Sparkles,
      iconColor: "text-sky-600",
      iconBg: "bg-sky-50 border border-sky-100",
      groupLabel: "Đoàn Thanh niên"
    };
  }
  if (n.includes("cựu chiến binh")) {
    return {
      icon: Award,
      iconColor: "text-emerald-800",
      iconBg: "bg-emerald-50 border border-emerald-100",
      groupLabel: "Cựu chiến binh"
    };
  }
  if (n.includes("người cao tuổi")) {
    return {
      icon: Users,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50 border border-purple-100",
      groupLabel: "Hội Người cao tuổi"
    };
  }
  if (n.includes("chữ thập đỏ")) {
    return {
      icon: Heart,
      iconColor: "text-red-600",
      iconBg: "bg-red-50 border border-red-100",
      groupLabel: "Chữ Thập Đỏ"
    };
  }
  if (group === "social_welfare") {
    return {
      icon: Heart,
      iconColor: "text-teal-600",
      iconBg: "bg-teal-50 border border-teal-100",
      groupLabel: "Chính sách xã hội"
    };
  }
  return {
    icon: Users,
    iconColor: "text-slate-600",
    iconBg: "bg-slate-50 border border-slate-100",
    groupLabel: assoc.category || "Đoàn thể cơ sở"
  };
};

export const TARGET_GROUPS: TargetGroupConfig[] = [
  // 1. Nhóm Đảng
  {
    id: "ASC_DANG",
    name: "Chi bộ Đảng (Đảng viên)",
    section: "Đảng viên",
    defaultRole: "Đảng viên",
    roles: ["Đảng viên", "Bí thư Chi bộ", "Phó Bí thư", "Chi ủy viên", "Đảng viên dự bị"],
    description: "Tổ chức hạt nhân lãnh đạo chính trị tại cơ sở, gương mẫu đi đầu trong mọi phong trào.",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800",
    category: "Chính trị - Xã hội"
  },
  {
    id: "ASC_CTDANG",
    name: "Cảm tình Đảng",
    section: "Đảng viên",
    defaultRole: "Đối tượng bồi dưỡng Đảng",
    roles: ["Đối tượng bồi dưỡng Đảng", "Quần chúng ưu tú", "Học viên lớp nhận thức Đảng"],
    description: "Lực lượng quần chúng ưu tú, hạt giống bồi dưỡng kết nạp Đảng tại khu phố.",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-800",
    category: "Chính trị - Xã hội"
  },
  {
    id: "ASC_DANG213",
    name: "Đảng viên 213",
    section: "Đảng viên",
    defaultRole: "Đảng viên sinh hoạt nơi cư trú",
    roles: ["Đảng viên sinh hoạt nơi cư trú", "Tổ trưởng đảng viên 213", "Tổ phó đảng viên 213"],
    description: "Đảng viên đang công tác tham gia sinh hoạt định kỳ tại nơi cư trú theo Quy định 213.",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    category: "Chính trị - Xã hội"
  },

  // 2. Nhóm Chính quyền
  {
    id: "ASC_BDH",
    name: "Ban điều hành khu phố",
    section: "Chính quyền",
    defaultRole: "Thành viên Ban điều hành",
    roles: ["Trưởng Ban điều hành", "Phó Ban điều hành", "Thành viên Ban điều hành", "Thư ký Ban điều hành"],
    description: "Bộ máy tự quản trực tiếp điều hành mọi hoạt động hành chính, kinh tế - xã hội tại khu phố.",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    category: "Chính quyền cơ sở"
  },
  {
    id: "ASC_TOTRUONG",
    name: "Mạng lưới Tự quản KP3",
    section: "Chính quyền",
    defaultRole: "Thành viên Ban Điều hành",
    roles: ["Thành viên Ban Điều hành", "Cán sự phụ trách tuyến đường", "Cán sự phụ trách cụm liên gia"],
    description: "Cầu nối trực tiếp giữa Ban Điều hành Khu phố 3 và từng hộ gia đình trên địa bàn.",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
    category: "Chính quyền cơ sở"
  },
  {
    id: "ASC_KHUDOI",
    name: "Khu Đội",
    section: "Chính quyền",
    defaultRole: "Chiến sĩ dân quân",
    roles: ["Chỉ huy trưởng DQTV", "Chỉ huy phó DQTV", "Chiến sĩ dân quân cơ động", "Chiến sĩ Y tế dân quân", "Chiến sĩ dân quân"],
    description: "Lực lượng quân sự địa phương, sẵn sàng chiến đấu, tuần tra và phòng chống thiên tai.",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    category: "An ninh - Quốc phòng"
  },

  // 3. Nhóm Đoàn thể
  {
    id: "ASC_MT",
    name: "Ban Công tác Mặt trận",
    section: "Đoàn thể",
    defaultRole: "Ủy viên Ban CTMT",
    roles: ["Trưởng Ban CTMT", "Phó Ban CTMT", "Ủy viên Ban CTMT", "Đại biểu phối hợp"],
    description: "Tập hợp, phát huy khối đại đoàn kết toàn dân tộc, giám sát và phản biện xã hội.",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_PN",
    name: "Chi hội Phụ nữ",
    section: "Đoàn thể",
    defaultRole: "Hội viên Phụ nữ",
    roles: ["Chi hội trưởng", "Chi hội phó", "Ủy viên BCH", "Hội viên nòng cốt", "Hội viên Phụ nữ"],
    description: "Vận động phụ nữ xây dựng gia đình 5 không 3 sạch, bình đẳng giới và phát triển kinh tế.",
    badgeBg: "bg-pink-100",
    badgeText: "text-pink-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_TN",
    name: "Đoàn Thanh niên",
    section: "Đoàn thể",
    defaultRole: "Đoàn viên",
    roles: ["Bí thư Chi đoàn", "Phó Bí thư Chi đoàn", "Ủy viên BCH", "Đoàn viên tích cực", "Đoàn viên"],
    description: "Lực lượng thanh niên xung kích đi đầu trong chuyển đổi số, tình nguyện và văn hóa.",
    badgeBg: "bg-cyan-100",
    badgeText: "text-cyan-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_CCB",
    name: "Chi hội Cựu chiến binh",
    section: "Đoàn thể",
    defaultRole: "Hội viên Cựu chiến binh",
    roles: ["Chi hội trưởng", "Chi hội phó", "Ủy viên BCH", "Hội viên gương mẫu", "Hội viên Cựu chiến binh"],
    description: "Gương mẫu gìn giữ truyền thống anh bộ đội Cụ Hồ, giáo dục lòng yêu nước cho thế hệ trẻ.",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-900",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_NCT",
    name: "Chi hội Người cao tuổi",
    section: "Đoàn thể",
    defaultRole: "Hội viên Người cao tuổi",
    roles: ["Chi hội trưởng", "Chi hội phó", "Ủy viên BCH", "Hội viên tiêu biểu", "Hội viên Người cao tuổi"],
    description: "Phát huy tinh thần Tuổi cao - Gương sáng, sống vui sống khỏe sống có ích cho cộng đồng.",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_CCA",
    name: "Hội Cựu Công An",
    section: "Đoàn thể",
    defaultRole: "Hội viên Cựu Công an",
    roles: ["Chi hội trưởng Cựu CAND", "Chi hội phó", "Cố vấn an ninh", "Hội viên Cựu Công an"],
    description: "Tập hợp cán bộ Công an hưu trí, cố vấn an ninh trật tự và tuyên truyền pháp luật.",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_CTD",
    name: "Chi hội Chữ Thập Đỏ",
    section: "Đoàn thể",
    defaultRole: "Tình nguyện viên Chữ thập đỏ",
    roles: ["Chi hội trưởng", "Chi hội phó", "Tình nguyện viên CTĐ", "Hội viên Chữ thập đỏ"],
    description: "Tổ chức hoạt động nhân đạo, cứu trợ khẩn cấp, chăm sóc sức khỏe cộng đồng.",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    category: "Hội quần chúng"
  },

  // 4. Nhóm Chính sách
  {
    id: "ASC_CS_NCC",
    name: "Người có công",
    section: "Chính sách",
    defaultRole: "Người có công với cách mạng",
    roles: ["Thương binh", "Bệnh binh", "Người có công với cách mạng", "Người hoạt động kháng chiến"],
    description: "Nhóm cư dân có cống hiến cho sự nghiệp cách mạng được nhà nước và khu phố ưu đãi chăm lo.",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_GDCS",
    name: "Gia đình chính sách",
    section: "Chính sách",
    defaultRole: "Gia đình chính sách",
    roles: ["Thân nhân Liệt sĩ", "Gia đình thương binh - liệt sĩ", "Đại diện gia đình chính sách"],
    description: "Hộ gia đình có thân nhân liệt sĩ, thương bệnh binh được hỗ trợ và tri ân thường xuyên.",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-800",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_MVNAH",
    name: "Mẹ Việt Nam Anh hùng",
    section: "Chính sách",
    defaultRole: "Mẹ Việt Nam Anh hùng",
    roles: ["Mẹ Việt Nam Anh hùng", "Người trực tiếp phụng dưỡng Mẹ VNAH"],
    description: "Mẹ Việt Nam Anh hùng và thân nhân phụng dưỡng được toàn khu phố chăm lo chu đáo.",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-900",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_NGHEO",
    name: "Hộ nghèo",
    section: "Chính sách",
    defaultRole: "Thành viên hộ nghèo",
    roles: ["Chủ hộ nghèo", "Chủ hộ cận nghèo", "Thành viên hộ nghèo", "Thành viên hộ cận nghèo"],
    description: "Nhóm hộ gia đình cần hỗ trợ an sinh xã hội, bảo hiểm y tế và phương kế thoát nghèo bền vững.",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-900",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_CANNGHEO",
    name: "Hộ cận nghèo",
    section: "Chính sách",
    defaultRole: "Thành viên hộ cận nghèo",
    roles: ["Chủ hộ cận nghèo", "Thành viên hộ cận nghèo"],
    description: "Hộ gia đình có thu nhập cận chuẩn nghèo được hưởng các chính sách trợ cấp xã hội.",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-900",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_NKT",
    name: "Người khuyết tật",
    section: "Chính sách",
    defaultRole: "Người khuyết tật",
    roles: ["Người khuyết tật đặc biệt nặng", "Người khuyết tật nặng", "Đối tượng bảo trợ xã hội"],
    description: "Nhóm cư dân yếu thế cần sự chăm sóc đặc biệt về y tế, bảo trợ và tiếp cận cộng đồng.",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-800",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_TE",
    name: "Trẻ em",
    section: "Chính sách",
    defaultRole: "Thiếu niên nhi đồng",
    roles: ["Trẻ em có hoàn cảnh đặc biệt", "Trẻ em mồ côi", "Thiếu nhi nòng cốt", "Thiếu niên nhi đồng"],
    description: "Nhóm trẻ em dưới 16 tuổi cần được bảo vệ quyền lợi, hỗ trợ học tập và tạo sân chơi lành mạnh.",
    badgeBg: "bg-lime-100",
    badgeText: "text-lime-800",
    category: "Chính sách xã hội"
  },

  // 5. Nhóm khác / Phong trào tự quản
  {
    id: "ASC_PCCC",
    name: "Tổ liên gia PCCC",
    section: "Nhóm khác",
    defaultRole: "Thành viên Tổ liên gia PCCC",
    roles: ["Tổ trưởng Tổ liên gia PCCC", "Tổ phó Tổ liên gia PCCC", "Thành viên Tổ liên gia PCCC", "Đội viên PCCC xung kích"],
    description: "Mô hình an toàn PCCC liên gia đình, chuông báo động liên thông và phương án chữa cháy tại chỗ.",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    category: "Phong trào tự quản"
  },
  {
    id: "ASC_ANTT",
    name: "Tổ ANTT cơ sở",
    section: "Nhóm khác",
    defaultRole: "Đội viên ANTT cơ sở",
    roles: ["Tổ trưởng ANTT cơ sở", "Tổ phó ANTT cơ sở", "Đội viên ANTT cơ sở"],
    description: "Lực lượng bảo vệ an ninh trật tự ở cơ sở, phối hợp cùng công an khu vực tuần tra khép kín.",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    category: "An ninh - Quốc phòng"
  },
  {
    id: "ASC_HG",
    name: "Tổ hoà giải",
    section: "Nhóm khác",
    defaultRole: "Hòa giải viên cơ sở",
    roles: ["Tổ trưởng Tổ hòa giải", "Tổ phó Tổ hòa giải", "Hòa giải viên cơ sở"],
    description: "Hòa giải kịp thời các mâu thuẫn tranh chấp dân sự nhỏ, giữ vững tình làng nghĩa xóm.",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    category: "Phong trào tự quản"
  }
];

interface PartyBranchProps {
  partyMembers: PartyMember[];
  residents?: Resident[];
  onCreateTask?: (task: TaskItem) => void;
  onNavigate?: (tab: string) => void;
}

export default function PartyBranch({
  partyMembers,
  residents = [],
  onCreateTask,
  onNavigate
}: PartyBranchProps) {
  // Pre-populated default associations (Chi hội) loaded from shared data and synchronized with local storage & Supabase
  const [associations, setAssociations] = useState<Association[]>(() => getStoredAssociations());
  const assocDbHydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadAssociationRecord<Association[]>("associations").then((rows) => {
      if (active && Array.isArray(rows) && rows.length > 0) {
        setAssociations(rows);
        saveStoredAssociations(rows);
      }
      assocDbHydratedRef.current = true;
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveStoredAssociations(associations);
    if (assocDbHydratedRef.current) {
      saveAssociationRecord("associations", associations);
    }
  }, [associations]);

  const [selectedAssociationId, setSelectedAssociationId] = useState<string>("ASC_BDH");
  const [mobileAssocDetailOpen, setMobileAssocDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<AssocGroupKey>("all");
  const [activeSubTab, setActiveSubTab] = useState<"associations" | "meetings" | "multi_role" | "decisions" | "org_chart">("associations");
  // View mode for Associations in Sub-tab 1: "card" (Master-Detail 2-column) or "table" (Comprehensive full-width Table View)
  const [assocViewMode, setAssocViewMode] = useState<"card" | "table">("card");
  const [decisionSearch, setDecisionSearch] = useState("");
  const [decisionAssocFilter, setDecisionAssocFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Party resolutions & 213 party member Tổ 1-14 filter
  const [resolutions, setResolutions] = useState<PartyResolution[]>(() => {
    try {
      const saved = localStorage.getItem(PARTY_RESOLUTIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PARTY_RESOLUTIONS;
  });
  const [newResTitle, setNewResTitle] = useState("");
  const [newResSummary, setNewResSummary] = useState("");
  const [newResUnit, setNewResUnit] = useState("Ban Điều hành Khu phố 3");
  const [newResAssignee, setNewResAssignee] = useState("Nguyễn Trung Huy");
  const [newResDeadline, setNewResDeadline] = useState("2026-11-30");
  const [showAddResolutionForm, setShowAddResolutionForm] = useState(false);
  const [to213Filter, setTo213Filter] = useState<string>("all");
  const [confirmResetRoles, setConfirmResetRoles] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const persistResolutions = (next: PartyResolution[]) => {
    setResolutions(next);
    try {
      localStorage.setItem(PARTY_RESOLUTIONS_KEY, JSON.stringify(next));
    } catch {}
    saveAssociationRecord("party_resolutions", next);
  };

  useEffect(() => {
    let active = true;
    loadAssociationRecord<PartyResolution[]>("party_resolutions").then((rows) => {
      if (active && Array.isArray(rows) && rows.length > 0) {
        setResolutions(rows);
        try {
          localStorage.setItem(PARTY_RESOLUTIONS_KEY, JSON.stringify(rows));
        } catch {}
      }
    });
    loadAssociationRecord<string[]>("association_roles").then((rows) => {
      if (active && Array.isArray(rows) && rows.length > 0) {
        setCustomRoles(rows);
        try {
          localStorage.setItem("kp3_association_roles", JSON.stringify(rows));
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDispatchResolutionTask = (res: PartyResolution) => {
    const newTask: TaskItem = {
      id: `TASK-NQ-${Date.now().toString(36).toUpperCase()}`,
      title: `[Nghị quyết Chi bộ] ${res.title}`,
      description: `${res.sessionTitle} (${res.attendance}) — ${res.summary}`,
      unit: res.assigneeUnit,
      associationId: "ASC_CHIBO",
      assignee: {
        name: res.assigneeName || "Ban Điều hành KP3",
        role: res.assigneeUnit,
        unit: res.assigneeUnit
      },
      creator: "Chi bộ Đảng KP3",
      priority: "Cao",
      status: "Chờ xử lý",
      progressPercent: 0,
      startDate: res.meetingDate,
      deadline: res.deadline
    };

    if (onCreateTask) {
      onCreateTask(newTask);
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem("kp3_tasks_v1") || "[]");
        localStorage.setItem("kp3_tasks_v1", JSON.stringify([newTask, ...(Array.isArray(existing) ? existing : [])]));
      } catch {}
    }

    persistResolutions(resolutions.map(r => (r.id === res.id ? { ...r, taskCreated: true } : r)));
    showToast(`Đã giao việc "${res.title}" sang phân hệ Nhiệm vụ!`, "success");
  };

  const handleCreateResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResTitle.trim()) {
      showToast("Vui lòng nhập nội dung nghị quyết!", "error");
      return;
    }
    const created: PartyResolution = {
      id: `NQ-KP3-${String(resolutions.length + 1).padStart(2, "0")}`,
      sessionTitle: "Sinh hoạt Chi bộ KP3 (Bổ sung)",
      meetingDate: new Date().toISOString().split("T")[0],
      attendance: "42/44 đảng viên",
      title: newResTitle.trim(),
      summary: newResSummary.trim() || "Triển khai thực hiện nghị quyết Chi bộ Khu phố 3.",
      assigneeUnit: newResUnit.trim() || "Ban Điều hành Khu phố 3",
      assigneeName: newResAssignee.trim() || "Nguyễn Trung Huy",
      deadline: newResDeadline || "2026-11-30"
    };
    persistResolutions([created, ...resolutions]);
    setNewResTitle("");
    setNewResSummary("");
    setShowAddResolutionForm(false);
    showToast(`Đã lưu nghị quyết "${created.title}"!`, "success");
  };

  const groupFilterTrackRef = useRef<HTMLDivElement>(null);
  const subTabsTrackRef = useRef<HTMLDivElement>(null);

  const syncScrollFade = (el: HTMLDivElement | null) => {
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.classList.remove("evon-fade-r", "evon-fade-l", "evon-fade-lr");
    if (max <= 2) return;
    if (el.scrollLeft <= 2) el.classList.add("evon-fade-r");
    else if (el.scrollLeft >= max - 2) el.classList.add("evon-fade-l");
    else el.classList.add("evon-fade-lr");
  };

  useEffect(() => {
    const syncAll = () => {
      syncScrollFade(groupFilterTrackRef.current);
      syncScrollFade(subTabsTrackRef.current);
    };
    const raf = requestAnimationFrame(syncAll);
    window.addEventListener("resize", syncAll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncAll);
    };
  }, [associations.length, activeSubTab, assocViewMode]);

  // Search & filter members within selected association
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("Tất cả");

  // Fallback safe association to guarantee no undefined access
  const fallbackAssociation: Association = {
    id: "ASC_BDH",
    name: "Ban điều hành khu phố",
    category: "Chính quyền cơ sở",
    description: "Tổ chức tự quản trực tiếp điều hành mọi hoạt động dân cư và đời sống cơ sở tại Khu phố 3.",
    leaderName: "Nguyễn Trung Huy",
    leaderCccd: "079080009988",
    members: []
  };

  // Selected association derived from ID for single source of truth and instant reactivity
  const selectedAssociation = associations.find(a => a.id === selectedAssociationId) || associations[0] || fallbackAssociation;

  // Modern Toast alert system for cross-origin iframe compliance (replaces window.alert)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Custom modal state for member deletion (replaces window.confirm)
  const [memberToDelete, setMemberToDelete] = useState<{ cccd: string; name: string } | null>(null);

  // Custom modal state for editing member
  const [editingMember, setEditingMember] = useState<AssociationMember | null>(null);
  const [editMemberRole, setEditMemberRole] = useState<string>("");
  const [editMemberJoinDate, setEditMemberJoinDate] = useState<string>("");
  const [editMemberDecisionNumber, setEditMemberDecisionNumber] = useState<string>("");
  const [editMemberDecisionDate, setEditMemberDecisionDate] = useState<string>("");
  const [editMemberDecisionFile, setEditMemberDecisionFile] = useState<{
    name: string;
    url: string;
    type: "image" | "pdf";
    size?: string;
  } | null>(null);

  // Document preview modal state
  const [viewingDecisionDoc, setViewingDecisionDoc] = useState<{
    memberName: string;
    memberRole: string;
    memberCccd: string;
    associationName: string;
    decisionNumber?: string;
    decisionDate?: string;
    joinDate?: string;
    file: {
      name: string;
      url: string;
      type: "image" | "pdf";
      size?: string;
    };
  } | null>(null);

  // File upload processing (Image & PDF supported)
  const handleProcessFileUpload = (
    file: File,
    onSuccess: (fileObj: { name: string; url: string; type: "image" | "pdf"; size: string }) => void
  ) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);

    if (!isPdf && !isImage) {
      showToast("Chỉ hỗ trợ tệp định dạng PDF hoặc hình ảnh (PNG, JPG, WebP)!", "error");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast("Dung lượng tệp tối đa cho phép là 20MB!", "error");
      return;
    }

    const formattedSize = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      onSuccess({
        name: file.name,
        url: reader.result as string,
        type: isPdf ? "pdf" : "image",
        size: formattedSize
      });
      showToast(`Đã tải lên tệp: ${file.name} (${formattedSize})`, "success");
    };
    reader.onerror = () => {
      showToast("Không thể đọc tệp tin đã chọn!", "error");
    };
    reader.readAsDataURL(file);
  };

  // Download attached decision file
  const handleDownloadFile = (fileObj: { name: string; url: string }) => {
    const link = document.createElement("a");
    link.href = fileObj.url;
    link.download = fileObj.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đang tải xuống tệp: ${fileObj.name}`, "success");
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  // Horizontal scroll container reference for associations
  const assocScrollRef = useRef<HTMLDivElement>(null);

  const scrollAssocList = (direction: "left" | "right") => {
    if (assocScrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      assocScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // State for creating new Association
  const [showAddAssocModal, setShowAddAssocModal] = useState(false);
  const [newAssocName, setNewAssocName] = useState("");
  const [newAssocDesc, setNewAssocDesc] = useState("");
  const [newAssocLeaderCccd, setNewAssocLeaderCccd] = useState("");
  const [newAssocLeaderRole, setNewAssocLeaderRole] = useState("Chi hội trưởng");

  // State for adding a member from Residents database
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedResidentCccd, setSelectedResidentCccd] = useState("");
  const [memberRole, setMemberRole] = useState("Hội viên");
  const [memberJoinDate, setMemberJoinDate] = useState("");
  const [memberDecisionNumber, setMemberDecisionNumber] = useState("");
  const [memberDecisionDate, setMemberDecisionDate] = useState("");
  const [memberDecisionFile, setMemberDecisionFile] = useState<{
    name: string;
    url: string;
    type: "image" | "pdf";
    size?: string;
  } | null>(null);
  const [residentSearchTerm, setResidentSearchTerm] = useState("");

  // View mode switcher: "associations" (standard) or "multi-role-matrix" (multi-role overview table)
  const [activeViewMode, setActiveViewMode] = useState<"associations" | "multi-role-matrix">("associations");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixFilterCategory, setMatrixFilterCategory] = useState<string>("Tất cả");

  // Member Display Mode in Association: "card" (cards grid) or "list" (table rows)
  const [memberViewMode, setMemberViewMode] = useState<"card" | "list">("card");

  // State for Quick Multi-Role / Multi-Group Assignment Modal
  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [quickAssignTab, setQuickAssignTab] = useState<"by-resident" | "by-group">("by-resident");
  const [quickAssignResidentCccd, setQuickAssignResidentCccd] = useState<string>("");
  const [quickAssignGroupSelections, setQuickAssignGroupSelections] = useState<Record<string, { selected: boolean; role: string }>>({});
  const [quickAssignTargetGroupId, setQuickAssignTargetGroupId] = useState<string>("ASC_BDH");
  const [quickAssignSelectedResidentCccds, setQuickAssignSelectedResidentCccds] = useState<string[]>([]);
  const [quickAssignResidentSearch, setQuickAssignResidentSearch] = useState<string>("");

  // Member Detail Modal State (Modal chi tiết thành viên chuẩn như phân hệ quản lý cư dân)
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<AssociationMember | null>(null);

  // Dynamic Customizable Roles List (Thêm, Sửa, Xóa chức danh trong dropdown)
  const DEFAULT_ROLES = [
    "Chi hội trưởng",
    "Chi hội phó",
    "Ủy viên Ban chấp hành",
    "Bí thư Chi bộ",
    "Phó Bí thư Chi bộ",
    "Tổ trưởng",
    "Tổ phó",
    "Thư ký",
    "Hội viên",
    "Hội viên tích cực",
    "Hội viên nòng cốt",
    "Đội viên ANTT cơ sở",
    "Chiến sĩ Dân quân tự vệ",
    "Chỉ huy trưởng DQTV",
    "Hòa giải viên cơ sở",
    "Trưởng Ban điều hành",
    "Phó Ban điều hành",
    "Cán bộ Đoàn thanh niên",
    "Cán bộ Hội phụ nữ",
    "Cán bộ Hội Cựu chiến binh",
    "Cán bộ Hội Nông dân",
    "Cộng tác viên Dân số"
  ];

  const [customRoles, setCustomRoles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_association_roles");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_ROLES;
  });

  // Role Manager Modal State (cho phép thêm, sửa, xóa chức danh linh hoạt)
  const [showRoleManagerModal, setShowRoleManagerModal] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState("");
  const [roleSearchFilter, setRoleSearchFilter] = useState("");

  const handleAddCustomRole = (newRoleName: string) => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      showToast("Vui lòng nhập tên chức danh!", "error");
      return false;
    }
    if (customRoles.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      showToast("Chức danh này đã có trong danh mục!", "error");
      return false;
    }
    const updated = [trimmed, ...customRoles];
    setCustomRoles(updated);
    try {
      localStorage.setItem("kp3_association_roles", JSON.stringify(updated));
    } catch (e) { }
    saveAssociationRecord("association_roles", updated);
    showToast(`Đã thêm chức danh "${trimmed}" thành công!`, "success");
    setNewRoleInput("");
    return true;
  };

  const handleEditCustomRole = (oldRole: string, newRole: string) => {
    const trimmed = newRole.trim();
    if (!trimmed || trimmed === oldRole) {
      setEditingRoleIndex(null);
      return;
    }
    const updated = customRoles.map(r => r === oldRole ? trimmed : r);
    setCustomRoles(updated);
    try {
      localStorage.setItem("kp3_association_roles", JSON.stringify(updated));
    } catch (e) { }
    saveAssociationRecord("association_roles", updated);
    // Update members across all associations
    setAssociations(prev => prev.map(a => ({
      ...a,
      members: a.members.map(m => m.role === oldRole ? { ...m, role: trimmed } : m)
    })));
    if (editMemberRole === oldRole) setEditMemberRole(trimmed);
    if (memberRole === oldRole) setMemberRole(trimmed);
    setEditingRoleIndex(null);
    showToast(`Đã cập nhật chức danh thành "${trimmed}"!`, "success");
  };

  const handleDeleteCustomRole = (roleToDelete: string) => {
    if (customRoles.length <= 1) {
      showToast("Phải duy trì ít nhất 01 chức danh trong hệ thống!", "error");
      return;
    }
    const updated = customRoles.filter(r => r !== roleToDelete);
    setCustomRoles(updated);
    try {
      localStorage.setItem("kp3_association_roles", JSON.stringify(updated));
    } catch (e) { }
    saveAssociationRecord("association_roles", updated);
    if (editMemberRole === roleToDelete) setEditMemberRole(updated[0]);
    if (memberRole === roleToDelete) setMemberRole(updated[0]);
    showToast(`Đã xóa chức danh "${roleToDelete}" khỏi danh mục!`, "success");
  };

  // Upload Avatar for a member
  const handleUploadMemberAvatar = (memberCccd: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Chỉ hỗ trợ tệp định dạng hình ảnh (PNG, JPG, WebP)!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAssociations(prev => prev.map(assoc => ({
        ...assoc,
        members: assoc.members.map(m => m.cccd === memberCccd ? { ...m, avatar: dataUrl } : m)
      })));
      setSelectedMemberForDetail(prev => prev && prev.cccd === memberCccd ? { ...prev, avatar: dataUrl } : prev);
      setEditingMember(prev => prev && prev.cccd === memberCccd ? { ...prev, avatar: dataUrl } : prev);
      showToast("Đã cập nhật ảnh đại diện thành viên thành công!", "success");
    };
    reader.onerror = () => {
      showToast("Không thể đọc tệp hình ảnh!", "error");
    };
    reader.readAsDataURL(file);
  };





  // Open Quick Multi-Role Assignment Modal
  const handleOpenQuickAssignModal = (target?: Resident | AssociationMember | string) => {
    let targetCccd = "";
    if (typeof target === "string") {
      targetCccd = target;
    } else if (target && "cccd" in target) {
      targetCccd = target.cccd;
    } else if (residents.length > 0) {
      targetCccd = residents[0].cccd;
    }

    setQuickAssignResidentCccd(targetCccd);

    const initialSelections: Record<string, { selected: boolean; role: string }> = {};
    TARGET_GROUPS.forEach(g => {
      const assoc = associations.find(a => a.id === g.id || a.name.toLowerCase() === g.name.toLowerCase());
      const member = assoc?.members.find(m => m.cccd === targetCccd);
      initialSelections[g.id] = {
        selected: !!member,
        role: member?.role || g.defaultRole
      };
    });
    setQuickAssignGroupSelections(initialSelections);
    setQuickAssignSelectedResidentCccds([]);
    setQuickAssignResidentSearch("");
    setShowQuickAssignModal(true);
  };

  const handleSelectQuickAssignResident = (cccd: string) => {
    setQuickAssignResidentCccd(cccd);
    const initialSelections: Record<string, { selected: boolean; role: string }> = {};
    TARGET_GROUPS.forEach(g => {
      const assoc = associations.find(a => a.id === g.id || a.name.toLowerCase() === g.name.toLowerCase());
      const member = assoc?.members.find(m => m.cccd === cccd);
      initialSelections[g.id] = {
        selected: !!member,
        role: member?.role || g.defaultRole
      };
    });
    setQuickAssignGroupSelections(initialSelections);
  };

  const handleToggleQuickAssignGroup = (groupId: string) => {
    setQuickAssignGroupSelections(prev => {
      const current = prev[groupId] || { selected: false, role: TARGET_GROUPS.find(g => g.id === groupId)?.defaultRole || "Hội viên" };
      return {
        ...prev,
        [groupId]: {
          ...current,
          selected: !current.selected
        }
      };
    });
  };

  const handleUpdateQuickAssignRole = (groupId: string, newRole: string) => {
    setQuickAssignGroupSelections(prev => {
      const current = prev[groupId] || { selected: true, role: newRole };
      return {
        ...prev,
        [groupId]: {
          ...current,
          role: newRole
        }
      };
    });
  };

  const handleToggleBatchResidentCccd = (cccd: string) => {
    setQuickAssignSelectedResidentCccds(prev =>
      prev.includes(cccd) ? prev.filter(c => c !== cccd) : [...prev, cccd]
    );
  };

  const handleSaveQuickAssignByResident = () => {
    const resident = residents.find(r => r.cccd === quickAssignResidentCccd) ||
      associations.flatMap(a => a.members).find(m => m.cccd === quickAssignResidentCccd);

    if (!resident) {
      showToast("Không tìm thấy thông tin cư dân!", "error");
      return;
    }

    setAssociations(prevAssocs => {
      return prevAssocs.map(assoc => {
        const matchedGroup = TARGET_GROUPS.find(g => g.id === assoc.id || g.name.toLowerCase() === assoc.name.toLowerCase());
        if (!matchedGroup) return assoc;

        const selection = quickAssignGroupSelections[matchedGroup.id];
        if (!selection) return assoc;

        const isCurrentlyMember = assoc.members.some(m => m.cccd === resident.cccd);

        if (selection.selected) {
          if (isCurrentlyMember) {
            return {
              ...assoc,
              members: assoc.members.map(m => m.cccd === resident.cccd ? { ...m, role: selection.role } : m)
            };
          } else {
            const newMember: AssociationMember = {
              id: "MEM_" + Date.now().toString().slice(-4) + "_" + Math.floor(Math.random() * 100),
              fullName: resident.fullName,
              role: selection.role,
              cccd: resident.cccd,
              phone: resident.phone,
              birthDate: resident.birthDate,
              joinDate: new Date().toLocaleDateString("vi-VN"),
              decisionNumber: `QĐ-${Math.floor(10 + Math.random() * 90)}/UBND-KP3`,
              avatar: (resident as any).avatar
            };
            return {
              ...assoc,
              members: [newMember, ...assoc.members]
            };
          }
        } else {
          if (isCurrentlyMember) {
            return {
              ...assoc,
              members: assoc.members.filter(m => m.cccd !== resident.cccd)
            };
          }
          return assoc;
        }
      });
    });

    setShowQuickAssignModal(false);
    showToast(`Đã cập nhật phân công đa vai trò cho "${resident.fullName}"!`, "success");
  };

  const handleSaveQuickAssignByGroup = () => {
    const targetGroup = TARGET_GROUPS.find(g => g.id === quickAssignTargetGroupId);
    if (!targetGroup) return;

    if (quickAssignSelectedResidentCccds.length === 0) {
      showToast("Vui lòng tích chọn ít nhất 01 cư dân!", "error");
      return;
    }

    setAssociations(prevAssocs => {
      return prevAssocs.map(assoc => {
        const isMatched = assoc.id === targetGroup.id || assoc.name.toLowerCase() === targetGroup.name.toLowerCase();
        if (!isMatched) return assoc;

        const existingCccds = new Set(assoc.members.map(m => m.cccd));
        const newMembers: AssociationMember[] = [];

        quickAssignSelectedResidentCccds.forEach(cccd => {
          if (!existingCccds.has(cccd)) {
            const res = residents.find(r => r.cccd === cccd);
            if (res) {
              newMembers.push({
                id: "MEM_" + Date.now().toString().slice(-4) + "_" + Math.floor(Math.random() * 100),
                fullName: res.fullName,
                role: targetGroup.defaultRole,
                cccd: res.cccd,
                phone: res.phone,
                birthDate: res.birthDate,
                joinDate: new Date().toLocaleDateString("vi-VN"),
                decisionNumber: `QĐ-${Math.floor(10 + Math.random() * 90)}/UBND-KP3`,
                avatar: res.avatar
              });
            }
          }
        });

        return {
          ...assoc,
          members: [...newMembers, ...assoc.members]
        };
      });
    });

    setShowQuickAssignModal(false);
    showToast(`Đã thêm ${quickAssignSelectedResidentCccds.length} cư dân vào nhóm "${targetGroup.name}"!`, "success");
  };

  // Create new Association
  const handleCreateAssociation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssocName.trim()) {
      showToast("Vui lòng nhập tên chi hội!", "error");
      return;
    }

    // Try to find the leader in residents database
    const leaderResident = residents.find(r => r.cccd === newAssocLeaderCccd);
    const leaderName = leaderResident ? leaderResident.fullName : "Chưa xác định";

    const newAssoc: Association = {
      id: "ASC" + (associations.length + 1).toString().padStart(3, "0"),
      name: newAssocName,
      category: "Đoàn thể nhân dân",
      description: newAssocDesc || "Không có mô tả chi tiết.",
      leaderName: leaderName,
      leaderCccd: newAssocLeaderCccd || "N/A",
      members: leaderResident ? [
        {
          id: "M" + Date.now(),
          fullName: leaderResident.fullName,
          role: newAssocLeaderRole || "Chi hội trưởng",
          cccd: leaderResident.cccd,
          phone: leaderResident.phone,
          birthDate: leaderResident.birthDate
        }
      ] : []
    };

    const updated = [...associations, newAssoc];
    setAssociations(updated);
    setSelectedAssociationId(newAssoc.id);
    setShowAddAssocModal(false);
    showToast("Đã tạo Chi hội mới thành công", "success");

    // Reset Form
    setNewAssocName("");
    setNewAssocDesc("");
    setNewAssocLeaderCccd("");
    setNewAssocLeaderRole("Chi hội trưởng");
  };

  // State for Editing Association
  const [showEditAssocModal, setShowEditAssocModal] = useState(false);
  const [assocToEdit, setAssocToEdit] = useState<Association | null>(null);
  const [editAssocName, setEditAssocName] = useState("");
  const [editAssocDesc, setEditAssocDesc] = useState("");
  const [editAssocLeaderCccd, setEditAssocLeaderCccd] = useState("");
  const [editAssocLeaderRole, setEditAssocLeaderRole] = useState("Chi hội trưởng");

  // State for Deleting / Dissolving Association
  const [assocToDelete, setAssocToDelete] = useState<Association | null>(null);

  // Open Edit Association Modal
  const handleOpenEditAssoc = (assoc: Association) => {
    setAssocToEdit(assoc);
    setEditAssocName(assoc.name);
    setEditAssocDesc(assoc.description);
    setEditAssocLeaderCccd(assoc.leaderCccd !== "N/A" ? assoc.leaderCccd : "");
    const leaderMember = assoc.members.find(m => m.cccd === assoc.leaderCccd);
    setEditAssocLeaderRole(leaderMember ? leaderMember.role : "Chi hội trưởng");
    setShowEditAssocModal(true);
  };

  // Submit Edit Association Form
  const handleUpdateAssociation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assocToEdit) return;
    if (!editAssocName.trim()) {
      showToast("Vui lòng nhập tên chi hội!", "error");
      return;
    }

    const leaderResident = residents.find(r => r.cccd === editAssocLeaderCccd);
    const leaderName = leaderResident
      ? leaderResident.fullName
      : (editAssocLeaderCccd ? assocToEdit.leaderName : "Chưa xác định");

    // Update members list: if new leader is from residents, sync leadership role
    let updatedMembers = [...assocToEdit.members];
    if (leaderResident) {
      const idx = updatedMembers.findIndex(m => m.cccd === leaderResident.cccd);
      if (idx >= 0) {
        updatedMembers[idx] = {
          ...updatedMembers[idx],
          role: editAssocLeaderRole || "Chi hội trưởng"
        };
      } else {
        updatedMembers.unshift({
          id: "M" + Date.now(),
          fullName: leaderResident.fullName,
          role: editAssocLeaderRole || "Chi hội trưởng",
          cccd: leaderResident.cccd,
          phone: leaderResident.phone,
          birthDate: leaderResident.birthDate
        });
      }
    }

    const updatedAssoc: Association = {
      ...assocToEdit,
      name: editAssocName.trim(),
      category: assocToEdit.category,
      description: editAssocDesc.trim() || "Không có mô tả chi tiết.",
      leaderName: leaderName,
      leaderCccd: editAssocLeaderCccd || "N/A",
      members: updatedMembers
    };

    const newAssocs = associations.map(a => a.id === assocToEdit.id ? updatedAssoc : a);
    setAssociations(newAssocs);
    setShowEditAssocModal(false);
    setAssocToEdit(null);
    showToast(`Đã cập nhật Chi hội: "${updatedAssoc.name}" thành công!`, "success");
  };

  // Open Delete / Dissolve Association Confirmation
  const handleOpenDeleteAssoc = (assoc: Association) => {
    setAssocToDelete(assoc);
  };

  // Confirm Delete / Dissolve Association
  const handleConfirmDeleteAssoc = () => {
    if (!assocToDelete) return;
    if (associations.length <= 1) {
      showToast("Hệ thống phải duy trì ít nhất 01 Chi hội trong danh sách!", "error");
      setAssocToDelete(null);
      return;
    }

    const remaining = associations.filter(a => a.id !== assocToDelete.id);
    setAssociations(remaining);

    // If the deleted association was currently active, switch to first remaining
    if (selectedAssociationId === assocToDelete.id) {
      setSelectedAssociationId(remaining[0].id);
    }

    showToast(`Đã xóa / giải thể Chi hội: "${assocToDelete.name}" thành công!`, "success");
    setAssocToDelete(null);
  };

  // Add a member from the existing Residents database
  const handleAddMemberFromResidents = () => {
    if (!selectedResidentCccd) {
      showToast("Vui lòng chọn một cư dân từ danh sách!", "error");
      return;
    }

    // Check if the resident is already a member of this Association
    const alreadyMember = selectedAssociation.members.some(m => m.cccd === selectedResidentCccd);
    if (alreadyMember) {
      showToast("Cư dân này đã là thành viên của chi hội này!", "error");
      return;
    }

    const residentObj = residents.find(r => r.cccd === selectedResidentCccd);
    if (!residentObj) return;

    const newMember: AssociationMember = {
      id: "M" + Date.now(),
      fullName: residentObj.fullName,
      role: memberRole,
      cccd: residentObj.cccd,
      phone: residentObj.phone || "N/A",
      birthDate: residentObj.birthDate,
      joinDate: memberJoinDate.trim() || new Date().toLocaleDateString("vi-VN"),
      decisionNumber: memberDecisionNumber.trim() || undefined,
      decisionDate: memberDecisionDate.trim() || undefined,
      decisionFile: memberDecisionFile || undefined
    };

    const updatedMembers = [...selectedAssociation.members, newMember];

    // Check if the role is a main leader role and we want to auto-assign leadership
    let updatedLeaderName = selectedAssociation.leaderName;
    let updatedLeaderCccd = selectedAssociation.leaderCccd;
    if (["Bí thư", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng"].includes(memberRole)) {
      updatedLeaderName = residentObj.fullName;
      updatedLeaderCccd = residentObj.cccd;
    }

    const updatedAssociation: Association = {
      ...selectedAssociation,
      leaderName: updatedLeaderName,
      leaderCccd: updatedLeaderCccd,
      members: updatedMembers
    };

    const updatedAssociations = associations.map(a => a.id === selectedAssociation.id ? updatedAssociation : a);
    setAssociations(updatedAssociations);
    showToast(`Đã ghi danh ${newMember.fullName} vào ${selectedAssociation.name} thành công!`, "success");
    setShowAddMemberModal(false);

    // Reset Form
    setSelectedResidentCccd("");
    setMemberRole("Hội viên");
    setMemberJoinDate("");
    setMemberDecisionNumber("");
    setMemberDecisionDate("");
    setMemberDecisionFile(null);
    setResidentSearchTerm("");
  };

  // Remove a member from the selected association
  const handleRemoveMember = (memberCccd: string, name: string) => {
    setMemberToDelete({ cccd: memberCccd, name });
  };

  const performRemoveMember = (memberCccd: string) => {
    const updatedMembers = selectedAssociation.members.filter(m => m.cccd !== memberCccd);

    // If the leader is deleted, update leader details
    let updatedLeaderName = selectedAssociation.leaderName;
    let updatedLeaderCccd = selectedAssociation.leaderCccd;
    if (selectedAssociation.leaderCccd === memberCccd) {
      const nextLeader = updatedMembers[0];
      updatedLeaderName = nextLeader ? nextLeader.fullName : "Chưa phân công";
      updatedLeaderCccd = nextLeader ? nextLeader.cccd : "N/A";
    }

    const updatedAssociation: Association = {
      ...selectedAssociation,
      leaderName: updatedLeaderName,
      leaderCccd: updatedLeaderCccd,
      members: updatedMembers
    };

    const updatedAssociations = associations.map(a => a.id === selectedAssociation.id ? updatedAssociation : a);
    setAssociations(updatedAssociations);
    showToast("Đã xóa thành viên khỏi Chi hội thành công!", "success");
  };

  const handleOpenEditMember = (member: AssociationMember) => {
    setEditingMember(member);
    setEditMemberRole(member.role);
    setEditMemberJoinDate(member.joinDate || "");
    setEditMemberDecisionNumber(member.decisionNumber || "");
    setEditMemberDecisionDate(member.decisionDate || "");
    setEditMemberDecisionFile(member.decisionFile || null);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editMemberRole.trim()) {
      showToast("Vui lòng nhập chức vụ / chức danh!", "error");
      return;
    }

    const updatedMembers = selectedAssociation.members.map(m => {
      if (m.cccd === editingMember.cccd) {
        return {
          ...m,
          role: editMemberRole.trim(),
          joinDate: editMemberJoinDate.trim() || undefined,
          decisionNumber: editMemberDecisionNumber.trim() || undefined,
          decisionDate: editMemberDecisionDate.trim() || undefined,
          decisionFile: editMemberDecisionFile || undefined
        };
      }
      return m;
    });

    // Check if we need to update association leadership
    let updatedLeaderName = selectedAssociation.leaderName;
    let updatedLeaderCccd = selectedAssociation.leaderCccd;

    const leaderRoles = ["Bí thư Chi bộ", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng DQTV", "Phó Bí thư", "Chi hội phó"];
    const isNewRoleLeader = leaderRoles.includes(editMemberRole.trim());

    if (isNewRoleLeader) {
      // Promptly promote them as the current leader
      updatedLeaderName = editingMember.fullName;
      updatedLeaderCccd = editingMember.cccd;
    } else if (selectedAssociation.leaderCccd === editingMember.cccd) {
      // If this member was the leader and we demoted them, we can find a new leader from remaining leader-role members or keep it as is
      const alternativeLeader = updatedMembers.find(m => leaderRoles.includes(m.role));
      updatedLeaderName = alternativeLeader ? alternativeLeader.fullName : "Chưa phân công";
      updatedLeaderCccd = alternativeLeader ? alternativeLeader.cccd : "N/A";
    }

    const updatedAssociation: Association = {
      ...selectedAssociation,
      leaderName: updatedLeaderName,
      leaderCccd: updatedLeaderCccd,
      members: updatedMembers
    };

    const updatedAssociations = associations.map(a => a.id === selectedAssociation.id ? updatedAssociation : a);
    setAssociations(updatedAssociations);
    showToast(`Đã cập nhật thông tin & hồ sơ của ${editingMember.fullName} thành công!`, "success");
    setEditingMember(null);
  };

  // Filter Associations (with category group filter)
  const filteredAssociations = useMemo(() => {
    return associations.filter(a => {
      // 1. Group Filter
      if (selectedGroupFilter !== "all") {
        const grp = getAssocGroupKey(a.category, a.name);
        if (grp !== selectedGroupFilter) return false;
      }
      // 2. Search Query
      const query = searchTerm.trim().toLowerCase();
      if (!query) return true;
      return a.name.toLowerCase().includes(query) ||
        (a.description || "").toLowerCase().includes(query) ||
        (a.leaderName || "").toLowerCase().includes(query) ||
        (a.category || "").toLowerCase().includes(query);
    });
  }, [associations, selectedGroupFilter, searchTerm]);

  // Executive KPI Metrics (separating An sinh policy groups from Political/Mass Organizations)
  const coreAssociations = useMemo(() => {
    return associations.filter(a => getAssocGroupKey(a.category, a.name) !== "social_welfare");
  }, [associations]);
  const welfareLinkedCount = associations.length - coreAssociations.length;
  const totalAssocCount = coreAssociations.length;
  const totalMembersCount = useMemo(() => {
    return associations.reduce((acc, curr) => acc + (curr.members?.length || 0), 0);
  }, [associations]);
  const totalDecisionsCount = useMemo(() => {
    let count = 0;
    associations.forEach(a => {
      a.members?.forEach(m => {
        if (m.decisionNumber || m.decisionFile) count++;
      });
    });
    return count;
  }, [associations]);

  // Computed list of all decisions across all associations
  const allDecisionsList = useMemo(() => {
    const list: {
      assocId: string;
      assocName: string;
      assocCategory: string;
      memberId?: string;
      memberName: string;
      memberRole: string;
      memberCccd: string;
      decisionNumber: string;
      decisionDate: string;
      decisionFile?: any;
    }[] = [];

    associations.forEach(a => {
      (a.members || []).forEach(m => {
        if (m.decisionNumber || m.decisionFile) {
          list.push({
            assocId: a.id,
            assocName: a.name,
            assocCategory: a.category,
            memberId: m.id,
            memberName: m.fullName,
            memberRole: m.role,
            memberCccd: m.cccd,
            decisionNumber: m.decisionNumber || "QĐ-01/UBND-AP",
            decisionDate: m.decisionDate || "15/01/2020",
            decisionFile: m.decisionFile
          });
        }
      });
    });

    return list;
  }, [associations]);

  // Filtered decisions list for Sub-tab 3
  const filteredDecisionsList = useMemo(() => {
    return allDecisionsList.filter(d => {
      if (decisionAssocFilter !== "all" && d.assocId !== decisionAssocFilter) return false;
      if (decisionSearch.trim()) {
        const q = decisionSearch.toLowerCase();
        return (
          d.decisionNumber.toLowerCase().includes(q) ||
          d.memberName.toLowerCase().includes(q) ||
          d.assocName.toLowerCase().includes(q) ||
          d.memberRole.toLowerCase().includes(q) ||
          d.memberCccd.includes(q)
        );
      }
      return true;
    });
  }, [allDecisionsList, decisionSearch, decisionAssocFilter]);

  // Pagination Logic
  const totalItems = filteredAssociations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedAssociations = filteredAssociations.slice(startIndex, startIndex + itemsPerPage);

  // Eligible residents search (Memoized and capped at 80 items to prevent DOM bloat)
  const searchedResidents = useMemo(() => {
    if (!residents || residents.length === 0) return [];
    const search = (residentSearchTerm || "").toLowerCase().trim();
    const hasSearch = search.length > 0;
    const existingCccds = new Set((selectedAssociation?.members || []).map(m => m?.cccd).filter(Boolean));

    const list: Resident[] = [];
    for (let i = 0; i < residents.length; i++) {
      const r = residents[i];
      if (!r || existingCccds.has(r.cccd)) continue;
      if (!hasSearch || (r.fullName && r.fullName.toLowerCase().includes(search)) || (r.cccd && r.cccd.includes(search))) {
        list.push(r);
        if (list.length >= 80) break;
      }
    }
    return list;
  }, [residents, residentSearchTerm, selectedAssociation]);

  // Capped leader candidates to eliminate 20,000+ DOM nodes
  const leaderCandidates = useMemo(() => {
    return (residents || []).slice(0, 80);
  }, [residents]);

  // Calculate some analytics
  const totalAssociationsCount = (associations || []).length;
  const totalUniqueMembersCount = new Set(
    (associations || []).flatMap(a => (a?.members || []).map(m => m?.cccd).filter(Boolean))
  ).size;

  // Excel Export functions
  const handleExportToExcel = (targetAssoc?: Association) => {
    const assoc = targetAssoc || selectedAssociation;
    if (!assoc) return;
    const headers = [
      "Mã Chi hội",
      "Tên Chi hội/Tổ chức",
      "Phân nhóm",
      "STT Thành viên",
      "Họ và tên",
      "Chức vụ/Vai trò",
      "Số CCCD",
      "Số điện thoại",
      "Năm sinh",
      "Ngày tham gia",
      "Số Quyết định",
      "Ngày ban hành QĐ",
      "Tệp đính kèm QĐ"
    ];

    const rows = assoc.members.map((member, index) => {
      const birthYear = member.birthDate ? member.birthDate.split("/").pop() : "N/A";
      return [
        assoc.id,
        assoc.name,
        assoc.category,
        index + 1,
        member.fullName,
        member.role,
        `="${member.cccd}"`,
        `="${member.phone || "N/A"}"`,
        birthYear,
        member.joinDate || "Chưa cập nhật",
        member.decisionNumber || "Chưa có",
        member.decisionDate || "N/A",
        member.decisionFile ? `${member.decisionFile.name} (${member.decisionFile.type.toUpperCase()})` : "Chưa đính kèm"
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeName = assoc.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-zA-Z0-9]/g, "_");

    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_thanh_vien_${safeName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllToExcel = () => {
    const headers = [
      "Mã Chi hội",
      "Tên Chi hội/Tổ chức",
      "Phân loại nhóm",
      "Mô tả hoạt động",
      "Người đứng đầu",
      "CCCD Người đứng đầu",
      "STT Thành viên",
      "Họ tên Thành viên",
      "Chức vụ/Vai trò",
      "CCCD Thành viên",
      "SĐT Thành viên",
      "Năm sinh",
      "Ngày tham gia",
      "Số Quyết định",
      "Tệp đính kèm QĐ"
    ];

    const rows: any[] = [];

    associations.forEach(assoc => {
      if (assoc.members.length === 0) {
        rows.push([
          assoc.id,
          assoc.name,
          assoc.category,
          assoc.description,
          assoc.leaderName,
          `="${assoc.leaderCccd}"`,
          "",
          "(Chưa có thành viên)",
          "",
          "",
          "",
          "",
          "",
          "",
          ""
        ]);
      } else {
        assoc.members.forEach((member, idx) => {
          const birthYear = member.birthDate ? member.birthDate.split("/").pop() : "N/A";
          rows.push([
            assoc.id,
            assoc.name,
            assoc.category,
            assoc.description,
            assoc.leaderName,
            `="${assoc.leaderCccd}"`,
            idx + 1,
            member.fullName,
            member.role,
            `="${member.cccd}"`,
            `="${member.phone || "N/A"}"`,
            birthYear,
            member.joinDate || "Chưa cập nhật",
            member.decisionNumber || "Chưa có",
            member.decisionFile ? `${member.decisionFile.name} (${member.decisionFile.type.toUpperCase()})` : "Chưa đính kèm"
          ]);
        });
      }
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Danh_sach_tong_hop_tat_ca_Chi_hoi_Khu_pho_3.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách tất cả các chi hội ra file Excel!", "success");
  };

  // Multi-role Resident Analytics and Matrix:
  // Build resident map from associations members + residents prop to guarantee 100% data fidelity
  const multiRoleSummary = useMemo(() => {
    // 1. Gather all unique people from associations
    const peopleMap = new Map<string, {
      fullName: string;
      cccd: string;
      phone?: string;
      address?: string;
      roles: { groupName: string; groupId: string; role: string; category: string; section: string; joinDate?: string; decisionNumber?: string }[];
    }>();

    (associations || []).forEach(assoc => {
      if (!assoc || !assoc.members) return;
      assoc.members.forEach(member => {
        if (!member || !member.cccd) return;
        const key = member.cccd;
        if (!peopleMap.has(key)) {
          const matchedResident = (residents || []).find(r => r.cccd === member.cccd);
          peopleMap.set(key, {
            fullName: member.fullName || matchedResident?.fullName || "Cán bộ",
            cccd: member.cccd,
            phone: member.phone || matchedResident?.phone || "0903829112",
            address: matchedResident?.address || "Khu phố 3, Phường An Phú",
            roles: []
          });
        }
        const targetConfig = TARGET_GROUPS.find(g => g.id === assoc.id || (assoc.name && g.name.toLowerCase() === assoc.name.toLowerCase()));
        peopleMap.get(key)!.roles.push({
          groupName: assoc.name || "",
          groupId: assoc.id,
          role: member.role || "",
          category: assoc.category || "",
          section: targetConfig?.section || "Nhóm khác",
          joinDate: member.joinDate,
          decisionNumber: member.decisionNumber
        });
      });
    });

    // Also include any residents from props that have roles not yet in map
    (residents || []).forEach(resident => {
      if (!resident || peopleMap.has(resident.cccd)) return;
      const rolesHeld: { groupName: string; groupId: string; role: string; category: string; section: string; joinDate?: string; decisionNumber?: string }[] = [];
      (associations || []).forEach(assoc => {
        if (!assoc || !assoc.members) return;
        const member = assoc.members.find(m => m && m.cccd === resident.cccd);
        if (member) {
          const targetConfig = TARGET_GROUPS.find(g => g.id === assoc.id || (assoc.name && g.name.toLowerCase() === assoc.name.toLowerCase()));
          rolesHeld.push({
            groupName: assoc.name || "",
            groupId: assoc.id,
            role: member.role || "",
            category: assoc.category || "",
            section: targetConfig?.section || "Nhóm khác",
            joinDate: member.joinDate,
            decisionNumber: member.decisionNumber
          });
        }
      });
      if (rolesHeld.length > 0) {
        peopleMap.set(resident.cccd, {
          fullName: resident.fullName,
          cccd: resident.cccd,
          phone: resident.phone,
          address: resident.address,
          roles: rolesHeld
        });
      }
    });

    return Array.from(peopleMap.values()).map(item => ({
      resident: {
        id: item.cccd,
        fullName: item.fullName,
        cccd: item.cccd,
        phone: item.phone || "0903829112",
        address: item.address || "Khu phố 3, Phường An Phú"
      } as Resident,
      roles: item.roles,
      rolesCount: item.roles.length,
      isMultiRole: item.roles.length > 1
    }));
  }, [associations, residents]);

  const multiRoleResidentsCount = multiRoleSummary.filter(s => s.rolesCount > 1).length;
  const anyRoleResidentsCount = multiRoleSummary.filter(s => s.rolesCount > 0).length;

  const filteredMultiRoleSummary = multiRoleSummary.filter(item => {
    const name = item.resident?.fullName || "";
    const cccd = item.resident?.cccd || "";
    const query = matrixSearch.toLowerCase();
    const matchesSearch = name.toLowerCase().includes(query) ||
      cccd.includes(query) ||
      item.roles.some(r => (r.role || "").toLowerCase().includes(query) || (r.groupName || "").toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (matrixFilterCategory === "Đa nhiệm (≥ 2 vai trò)") {
      return item.rolesCount >= 2;
    }
    if (matrixFilterCategory === "Có vai trò (≥ 1 vai trò)") {
      return item.rolesCount >= 1;
    }
    if (matrixFilterCategory === "Chưa tham gia") {
      return item.rolesCount === 0;
    }
    if (matrixFilterCategory !== "Tất cả") {
      return item.roles.some(r => r.section === matrixFilterCategory);
    }
    return true;
  });

  // Export Multi-Role Registry to Excel
  const handleExportMultiRoleReport = () => {
    const headers = [
      "STT",
      "Họ và tên Cư dân",
      "Số CCCD",
      "Số điện thoại",
      "Địa chỉ cư trú",
      "Số lượng vai trò đảm nhiệm",
      "Chi tiết các vai trò & Tổ chức",
      "Đánh giá Đa nhiệm"
    ];

    const rows = multiRoleSummary
      .filter(item => item.rolesCount > 0)
      .map((item, idx) => {
        const rolesDetail = item.roles.map(r => `${r.groupName} (${r.role})`).join("; ");
        return [
          idx + 1,
          item.resident.fullName,
          `="${item.resident.cccd}"`,
          `="${item.resident.phone || "N/A"}"`,
          item.resident.address,
          item.rolesCount,
          rolesDetail,
          item.rolesCount > 1 ? "Cán bộ Đa nhiệm" : "Thành viên đơn nhiệm"
        ];
      });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Danh_sach_phan_cong_da_vai_tro_can_bo_Khu_pho_3.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách phân công đa vai trò ra file Excel!", "success");
  };

  // Helper to determine role styling and classification (Trưởng vs Phó vs Hội viên)
  const getMemberRoleStyle = (role: string) => {
    const r = (role || "").trim();
    const lower = r.toLowerCase();

    // Check if Phó (Chi hội phó, Phó Bí thư, Phó Ban điều hành, Tổ phó, Phó Chỉ huy trưởng, Đội phó...)
    const isDeputy = lower.includes("phó") || lower.includes("pho");

    // Check if Trưởng / Lãnh đạo đứng đầu (Chi hội trưởng, Bí thư, Trưởng ban, Tổ trưởng, Chỉ huy trưởng, Chủ nhiệm, Đội trưởng, Chi ủy viên...)
    const isHead = !isDeputy && (
      lower.includes("trưởng") ||
      lower.includes("truong") ||
      lower.includes("bí thư") ||
      lower.includes("bi thu") ||
      lower.includes("chủ nhiệm") ||
      lower.includes("chu nhiem") ||
      lower.includes("chỉ huy") ||
      lower.includes("đội trưởng") ||
      lower.includes("chi ủy viên")
    );

    if (isHead) {
      return {
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
        cardBorder: "border-rose-200/90 bg-gradient-to-br from-rose-50/20 to-white",
        isHead: true,
        isDeputy: false,
        isLeader: true
      };
    }

    if (isDeputy) {
      return {
        badgeClass: "bg-amber-50 text-amber-900 border-amber-200 font-bold",
        cardBorder: "border-amber-200/90 bg-gradient-to-br from-amber-50/20 to-white",
        isHead: false,
        isDeputy: true,
        isLeader: true
      };
    }

    return {
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
      cardBorder: "border-slate-200/80 bg-white",
      isHead: false,
      isDeputy: false,
      isLeader: false
    };
  };

  // Filter members of selectedAssociation
  const filteredMembers = (selectedAssociation?.members || []).filter(member => {
    if (!member) return false;
    const query = memberSearchTerm.trim().toLowerCase();
    const matchesSearch = !query ||
      (member.fullName || "").toLowerCase().includes(query) ||
      (member.cccd || "").includes(query) ||
      (member.phone || "").includes(query) ||
      (member.role || "").toLowerCase().includes(query) ||
      (member.decisionNumber || "").toLowerCase().includes(query);

    const isLeaderRole = getMemberRoleStyle(member.role).isLeader;
    let matchesRole = true;
    if (memberRoleFilter === "Lãnh đạo / Trưởng phó") {
      matchesRole = isLeaderRole;
    } else if (memberRoleFilter === "Hội viên") {
      matchesRole = !isLeaderRole;
    } else if (memberRoleFilter === "Có Quyết định") {
      matchesRole = Boolean(member.decisionNumber || member.decisionFile);
    }

    return matchesSearch && matchesRole;
  });

  // Helper to normalize and synchronize association name typography & casing
  const formatAssocName = (name: string): string => {
    if (!name) return "";
    return name
      .replace(/\bTỔ\b/g, "Tổ")
      .replace(/\bCHI HỘI\b/g, "Chi hội")
      .replace(/\bChi Hội\b/g, "Chi hội")
      .replace(/\bBAN\b/g, "Ban")
      .replace(/\bĐỘI\b/g, "Đội");
  };

  return (
    <div id="association-management-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header: Executive Government Portal Theme (Light Slate Gradient) */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 p-5 md:p-6 rounded-2xl text-slate-800 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border border-slate-200/60">
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-bold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
            <ShieldCheck size={13} className="text-emerald-700 shrink-0" />
            <span>BỘ MÁY CHÍNH TRỊ - XÃ HỘI &amp; ĐOÀN&nbsp;THỂ</span>
            <span aria-hidden="true" className="text-emerald-700 hidden sm:inline">·</span>
            <span className="font-semibold text-xs text-emerald-800 hidden sm:inline">KHU PHỐ 3, AN&nbsp;PHÚ</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 text-balance">
            Quản lý Chi bộ Đảng &amp; Khối Đoàn&nbsp;thể
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            id="btn-manage-multi-role"
            onClick={() => handleOpenQuickAssignModal()}
            className="flex items-center justify-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            title="Phân công kiêm nhiệm & quản lý đa vai trò cán bộ trong các tổ chức đoàn thể"
          >
            <Sparkles size={14} className="text-amber-100 shrink-0" />
            <span>Quản lý Đa vai trò</span>
            <span className="bg-amber-900 text-amber-50 text-xs font-bold px-1.5 py-0.5 rounded-full font-mono tabular-nums ml-0.5">
              {multiRoleResidentsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportAllToExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-800 px-3.5 py-2 rounded-xl font-semibold text-xs transition-colors border border-slate-200 cursor-pointer shadow-2xs whitespace-nowrap"
            title="Xuất toàn bộ danh sách tổng hợp tất cả chi hội ra file Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-700 shrink-0" />
            <span className="sm:hidden">Xuất Excel</span>
            <span className="hidden sm:inline">Xuất toàn bộ Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddAssocModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <FolderPlus size={15} className="shrink-0" />
            <span>+ Thêm Chi hội mới</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI StatCards: Responsive & Actionable Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Tổ chức & Chi hội"
          value={totalAssocCount}
          badge={welfareLinkedCount > 0 ? `+${welfareLinkedCount} nhóm An sinh` : "100% kiện toàn"}
          highlighted={true}
          icon={Building2}
          color="emerald"
          subtext="Cấp ủy, Chính quyền & Đoàn thể"
          subtextRight="An sinh tách riêng"
        />
        <StatCard
          label="Tổng số Hội viên"
          value={totalMembersCount}
          badge="hội viên cơ sở"
          icon={Users}
          color="blue"
          subtext="Cán bộ, đảng viên & đoàn viên"
          subtextRight="Đã số hóa hồ sơ"
        />
        <StatCard
          label="Hồ sơ & Quyết định"
          value={totalDecisionsCount}
          badge="văn bản pháp lý"
          icon={FileCheck}
          color="indigo"
          subtext="Quyết định phê chuẩn nhân sự"
          subtextRight="Có tệp PDF đính kèm"
        />
        <StatCard
          label="Cán bộ Đa vai trò"
          value={multiRoleResidentsCount}
          badge="đồng chí kiêm nhiệm"
          icon={Sparkles}
          color="amber"
          subtext="Đảm nhiệm từ 2 vai trò trở lên"
          subtextRight="Theo dõi chéo"
        />
      </div>

      {/* Sub-tab Navigation Bar */}
      <div
        role="tablist"
        aria-label="Phân mục quản lý Chi bộ và Đoàn thể"
        className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-nowrap items-stretch lg:items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "associations"}
          onClick={() => setActiveSubTab("associations")}
          className={`px-3 py-2 min-h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center lg:justify-start gap-1.5 border whitespace-nowrap shrink-0 ${activeSubTab === "associations"
              ? "bg-white text-emerald-800 border-emerald-600/25"
              : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-white"
            }`}
        >
          <Building2 size={14} className={activeSubTab === "associations" ? "text-emerald-700" : "text-slate-600"} />
          <span>Tổ chức & Chi hội ({coreAssociations.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "meetings"}
          onClick={() => setActiveSubTab("meetings")}
          className={`px-3 py-2 min-h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center lg:justify-start gap-1.5 border whitespace-nowrap shrink-0 ${activeSubTab === "meetings"
              ? "bg-white text-rose-800 border-rose-600/25"
              : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-white"
            }`}
        >
          <Calendar size={14} className={activeSubTab === "meetings" ? "text-rose-700" : "text-slate-600"} />
          <span>Sinh hoạt Chi bộ ({resolutions.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "multi_role"}
          onClick={() => setActiveSubTab("multi_role")}
          className={`px-3 py-2 min-h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center lg:justify-start gap-1.5 border whitespace-nowrap shrink-0 ${activeSubTab === "multi_role"
              ? "bg-white text-amber-800 border-amber-600/25"
              : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-white"
            }`}
        >
          <Sparkles size={14} className={activeSubTab === "multi_role" ? "text-amber-700" : "text-slate-600"} />
          <span>Kiêm nhiệm ({multiRoleResidentsCount})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "decisions"}
          onClick={() => setActiveSubTab("decisions")}
          className={`px-3 py-2 min-h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center lg:justify-start gap-1.5 border whitespace-nowrap shrink-0 ${activeSubTab === "decisions"
              ? "bg-white text-indigo-800 border-indigo-600/25"
              : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-white"
            }`}
        >
          <FileCheck size={14} className={activeSubTab === "decisions" ? "text-indigo-700" : "text-slate-600"} />
          <span>Quyết định chuẩn y ({totalDecisionsCount})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "org_chart"}
          onClick={() => setActiveSubTab("org_chart")}
          className={`sm:col-span-2 lg:col-span-1 px-3 py-2 min-h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center lg:justify-start gap-1.5 border whitespace-nowrap shrink-0 ${activeSubTab === "org_chart"
              ? "bg-white text-blue-800 border-blue-600/25"
              : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-white"
            }`}
        >
          <Layers size={14} className={activeSubTab === "org_chart" ? "text-blue-700" : "text-slate-600"} />
          <span>Sơ đồ Bộ máy (5 Tầng)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: TỔ CHỨC & CHI HỘI (2-Column Master-Detail or Full Table View)   */}
      {/* ========================================================================= */}
      {activeSubTab === "associations" && (
        <div className="space-y-4">
          {/* Thanh công cụ hợp nhất: Lọc Khối + Tìm kiếm + Chuyển chế độ */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 flex flex-col gap-3">
            <div
              role="tablist"
              aria-label="Lọc theo khối chi hội"
              className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-center gap-1.5 py-0.5 min-w-0"
            >
              {ASSOC_GROUPS.map((grp) => {
                const isGrpActive = selectedGroupFilter === grp.key;
                const count =
                  grp.key === "all"
                    ? associations.length
                    : associations.filter((a) => getAssocGroupKey(a.category, a.name) === grp.key).length;
                return (
                  <button
                    key={grp.key}
                    type="button"
                    role="tab"
                    aria-selected={isGrpActive}
                    onClick={() => setSelectedGroupFilter(grp.key)}
                    className={`group min-h-9 px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border ${isGrpActive
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "bg-slate-50 hover:bg-slate-200 hover:border-slate-300 text-slate-700 border-slate-200"
                      }`}
                  >
                    <span>{grp.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-bold tabular-nums transition-colors ${isGrpActive
                          ? "bg-emerald-900 text-white"
                          : "bg-slate-200/80 text-slate-700 group-hover:bg-white"
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("welfare")}
                  className="min-h-9 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Chuyển sang phân hệ An sinh Xã hội KP3"
                >
                  <Heart size={13} />
                  <span>An sinh Xã hội →</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-between xl:justify-end">
              {/* Search Box in Unified Toolbar (single source of truth) */}
              <div className="relative flex-1 sm:flex-initial sm:w-64 md:w-72">
                <label htmlFor="party-search-input" className="sr-only">
                  Tìm kiếm chi hội, trưởng ban, CCCD
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                <input
                  id="party-search-input"
                  name="partySearch"
                  type="text"
                  placeholder="Tìm chi hội, cán bộ..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 bg-white transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    aria-label="Xóa từ khóa tìm kiếm"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* View Mode Toggle: Card / Master-Detail vs Table View */}
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setAssocViewMode("card")}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${assocViewMode === "card"
                      ? "bg-white text-emerald-800 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                  title="Chế độ xem Thẻ & Chi tiết (2 Cột)"
                >
                  <LayoutGrid size={14} />
                  <span>Thẻ & Chi tiết</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssocViewMode("table")}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${assocViewMode === "table"
                      ? "bg-white text-emerald-800 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                  title="Chế độ xem Bảng tổng hợp (Table view)"
                >
                  <List size={14} />
                  <span>Bảng (Table view)</span>
                </button>
              </div>
            </div>
          </div>

          {/* CHẾ ĐỘ 1: THẺ & CHI TIẾT 2 CỘT TRONG MỘT BỀ MẶT THỐNG NHẤT */}
          {assocViewMode === "card" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col lg:flex-row lg:items-stretch">
              {/* LEFT COLUMN (Master Directory) */}
              <div
                className={`${mobileAssocDetailOpen ? "hidden lg:flex" : "flex"
                  } w-full lg:w-[344px] xl:w-[364px] shrink-0 flex-col border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-white`}
              >
                {/* Slim Directory Subheader (no duplicated + Thêm, search, or pill tabs) */}
                <div className="px-3.5 py-2.5 bg-slate-50/75 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Danh mục Chi hội
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200/75 text-slate-700 font-mono tabular-nums">
                      {filteredAssociations.length}
                    </span>
                  </div>
                  {(searchTerm || selectedGroupFilter !== "all") ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedGroupFilter("all");
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer shrink-0"
                    >
                      Xóa lọc
                    </button>
                  ) : (
                    <span className="hidden lg:inline text-xs text-slate-500">
                      ↑ ↓ chọn nhanh
                    </span>
                  )}
                </div>

                {/* Hairline Listbox with Semantic Icon Tiles & Keyboard Navigation */}
                <div
                  role="listbox"
                  aria-label="Danh sách Chi hội và Đoàn thể"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    if (filteredAssociations.length === 0) return;
                    e.preventDefault();
                    const curIdx = Math.max(
                      0,
                      filteredAssociations.findIndex((a) => a.id === selectedAssociation.id)
                    );
                    const nextIdx =
                      e.key === "ArrowDown"
                        ? Math.min(filteredAssociations.length - 1, curIdx + 1)
                        : Math.max(0, curIdx - 1);
                    const nextAssoc = filteredAssociations[nextIdx];
                    if (nextAssoc) {
                      setSelectedAssociationId(nextAssoc.id);
                      document
                        .getElementById(`assoc-opt-${nextAssoc.id}`)
                        ?.scrollIntoView({ block: "nearest" });
                    }
                  }}
                  className="divide-y divide-slate-100 max-h-[calc(100vh-270px)] min-h-[420px] lg:min-h-[560px] overflow-y-auto evon-scroll focus:outline-none"
                >
                  {filteredAssociations.length === 0 ? (
                    <div className="p-8 text-center space-y-2.5">
                      <p className="text-sm font-semibold text-slate-800">
                        Không tìm thấy chi hội nào
                      </p>
                      <p className="text-xs text-slate-500">
                        Thử đổi từ khóa hoặc chọn lại tất cả khối.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedGroupFilter("all");
                        }}
                        className="inline-flex items-center justify-center min-h-8 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  ) : (
                    filteredAssociations.map((assoc) => {
                      const isSelected = selectedAssociation.id === assoc.id;
                      const displayName = formatAssocName(assoc.name);
                      const badgeStyle = getAssocBadgeStyle(assoc);
                      const IconComp = badgeStyle.icon;
                      const memberCount = assoc.members.length;
                      const hasLeader = Boolean(assoc.leaderName && assoc.leaderName !== "Chưa phân công");

                      return (
                        <div
                          key={assoc.id}
                          id={`assoc-opt-${assoc.id}`}
                          className={`relative group flex items-center gap-2 pr-3 pl-3.5 py-2.5 transition-colors ${isSelected ? "bg-emerald-50/75" : "bg-white hover:bg-slate-50"
                            }`}
                        >
                          {/* Active inner 3px indicator bar */}
                          {isSelected && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 inset-y-0 w-[3px] bg-emerald-700"
                            />
                          )}

                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSelectedAssociationId(assoc.id);
                              setMobileAssocDetailOpen(true);
                            }}
                            className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
                          >
                            <span
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badgeStyle.iconBg} ${badgeStyle.iconColor}`}
                            >
                              <IconComp size={16} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span
                                className={`block text-[13.5px] font-semibold truncate ${isSelected ? "text-emerald-950" : "text-slate-900"
                                  }`}
                                title={displayName}
                              >
                                {displayName}
                              </span>
                              <span className="block text-xs text-slate-600 truncate mt-0.5">
                                {hasLeader ? (
                                  <>
                                    <span className="text-slate-500">Trưởng: </span>
                                    <span className="font-medium text-slate-800">{assoc.leaderName}</span>
                                  </>
                                ) : (
                                  <span className="font-medium text-amber-700">Chưa kiện toàn</span>
                                )}
                                {selectedGroupFilter === "all" && (
                                  <span className="text-slate-500"> · {badgeStyle.groupLabel}</span>
                                )}
                              </span>
                            </span>
                          </button>

                          {/* Non-shifting sibling right column: Quick Edit/Delete + Tabular Member Count */}
                          <div className="flex items-center gap-1 shrink-0 relative">
                            <div
                              className={`flex items-center gap-0.5 lg:opacity-0 lg:pointer-events-none lg:group-hover:opacity-100 lg:group-hover:pointer-events-auto lg:group-focus-within:opacity-100 lg:group-focus-within:pointer-events-auto lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:rounded-lg lg:border lg:border-slate-200 lg:px-0.5 lg:py-0.5 lg:shadow-xs transition-opacity ${isSelected ? "lg:bg-emerald-50/95" : "lg:bg-white/95"
                                }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEditAssoc(assoc)}
                                className="w-8 h-8 inline-flex items-center justify-center text-slate-600 hover:text-emerald-950 hover:bg-emerald-200/80 rounded-md transition-colors cursor-pointer"
                                title={`Sửa ${displayName}`}
                                aria-label={`Sửa ${displayName}`}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteAssoc(assoc)}
                                className="w-8 h-8 inline-flex items-center justify-center text-slate-600 hover:text-rose-800 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                                title={`Xóa ${displayName}`}
                                aria-label={`Xóa ${displayName}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tabular-nums transition-colors ${memberCount === 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : isSelected
                                    ? "bg-emerald-700 text-white"
                                    : "bg-slate-100 text-slate-700 border border-slate-200/80"
                                }`}
                            >
                              {memberCount} tv
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN (Detail Workspace integrated in same surface) */}
              <div
                className={`${mobileAssocDetailOpen ? "flex" : "hidden lg:flex"
                  } flex-1 min-w-0 flex-col bg-slate-50/35 p-4 md:p-5 space-y-4`}
              >
                {/* Mobile Back Navigation */}
                <button
                  type="button"
                  onClick={() => setMobileAssocDetailOpen(false)}
                  className="lg:hidden inline-flex items-center gap-1.5 self-start min-h-9 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <ChevronLeft size={15} />
                  <span>Danh sách Chi hội ({filteredAssociations.length})</span>
                </button>

                {/* Card Thông tin Chi hội được chọn */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  {/* Top row: Category, Code, Title & Actions (never squeezes heading vertically) */}
                  <div className="flex flex-col 2xl:flex-row justify-between items-start gap-3.5 pb-4 border-b border-slate-100">
                    <div className="flex items-start gap-3 min-w-0 w-full 2xl:flex-1">
                      {(() => {
                        const selStyle = getAssocBadgeStyle(selectedAssociation);
                        const SelIcon = selStyle.icon;
                        return (
                          <span
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${selStyle.iconBg} ${selStyle.iconColor}`}
                          >
                            <SelIcon size={20} />
                          </span>
                        );
                      })()}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                          <span className="font-mono whitespace-nowrap">Mã: {selectedAssociation.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Đang hoạt động
                          </span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight text-balance">
                          {formatAssocName(selectedAssociation.name)}
                        </h2>
                        <p className="text-xs font-medium text-slate-600">
                          Khối trực thuộc: <span className="text-slate-800 font-semibold">{selectedAssociation.category}</span>
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 w-full 2xl:w-auto">
                      <button
                        type="button"
                        onClick={() => setShowAddMemberModal(true)}
                        className="h-9 flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <UserPlus size={14} className="shrink-0" />
                        <span>+ Thêm Hội viên</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenQuickAssignModal()}
                        className="h-9 flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        title="Phân công cán bộ kiêm nhiệm & đa vai trò vào chi hội này"
                      >
                        <Sparkles size={13} className="text-amber-700 shrink-0" />
                        <span>Đa vai trò</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportToExcel}
                        className="h-9 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-700 border border-slate-200 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        title="Xuất file danh sách thành viên ra Excel"
                      >
                        <FileSpreadsheet size={13} className="text-emerald-700 shrink-0" />
                        <span>Xuất Excel</span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAssoc(selectedAssociation)}
                          className="w-9 h-9 inline-flex items-center justify-center text-slate-600 hover:text-indigo-700 hover:bg-indigo-100/70 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                          title="Sửa thông tin chi hội"
                          aria-label="Sửa thông tin chi hội"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteAssoc(selectedAssociation)}
                          className="w-9 h-9 inline-flex items-center justify-center text-slate-600 hover:text-rose-700 hover:bg-rose-100/70 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                          title="Xóa / Giải thể chi hội"
                          aria-label="Xóa hoặc giải thể chi hội"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Leader Card & Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80">
                    <div className="sm:col-span-2 flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-base shadow-2xs shrink-0">
                        {selectedAssociation.leaderName ? selectedAssociation.leaderName.split(" ").slice(-1)[0][0] : "★"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-emerald-900 uppercase tracking-wide font-extrabold px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 whitespace-nowrap">
                            Người đứng đầu
                          </span>
                          <span className="text-xs text-slate-600 font-mono whitespace-nowrap">
                            CCCD: {selectedAssociation.leaderCccd || "Chưa cập nhật"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-1">
                          <span className="font-black text-slate-900 text-base">{selectedAssociation.leaderName || "Chưa kiện toàn"}</span>
                          <span className="text-xs text-slate-600 font-medium">({selectedAssociation.category})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:justify-end items-center gap-5 sm:border-l sm:border-slate-200/80 sm:pl-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      <div>
                        <span className="text-xs text-slate-600 font-semibold block">Tổng số hội viên</span>
                        <span className="text-lg font-black text-emerald-800 tabular-nums">{selectedAssociation.members.length} người</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600 font-semibold block">Phạm vi địa bàn</span>
                        <span className="text-xs font-bold text-slate-800 block mt-0.5">Khu phố 3, An Phú</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Members Workspace Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">

                  {/* Toolbar */}
                  <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 shrink-0">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Danh sách hội viên ({formatVNNumber(selectedAssociation.members.length)})
                      </h3>
                      {filteredMembers.length !== selectedAssociation.members.length && (
                        <span className="text-xs text-slate-600 font-normal">
                          (Lọc: {formatVNNumber(filteredMembers.length)})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* View Mode Toggle: Table vs Cards */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setMemberViewMode("list")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${memberViewMode === "list"
                              ? "bg-white text-emerald-800 shadow-2xs font-bold"
                              : "text-slate-600 hover:text-slate-900"
                            }`}
                          title="Hiển thị dạng bảng (Table)"
                        >
                          <List size={13} />
                          <span>Bảng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemberViewMode("card")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${memberViewMode === "card"
                              ? "bg-white text-emerald-800 shadow-2xs font-bold"
                              : "text-slate-600 hover:text-slate-900"
                            }`}
                          title="Hiển thị dạng thẻ (Cards)"
                        >
                          <LayoutGrid size={13} />
                          <span>Thẻ</span>
                        </button>
                      </div>

                      {/* Member Search */}
                      <div className="relative flex-1 min-w-[180px] sm:w-52">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={13} />
                        <input
                          id="party-member-search"
                          name="memberSearchTerm"
                          type="text"
                          placeholder="Lọc thành viên..."
                          value={memberSearchTerm}
                          onChange={(e) => setMemberSearchTerm(e.target.value)}
                          className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 bg-slate-50/70"
                        />
                      </div>

                      {/* Role Filter */}
                      <div className="min-w-[160px] shrink-0">
                        <ReportSelect
                          aria-label="Lọc chức danh thành viên"
                          value={memberRoleFilter}
                          onChange={(val) => setMemberRoleFilter(val)}
                          options={[
                            { value: "Tất cả", label: "Tất cả chức vụ" },
                            { value: "Lãnh đạo / Trưởng phó", label: "Lãnh đạo / Trưởng phó" },
                            { value: "Hội viên", label: "Hội viên" },
                            { value: "Có Quyết định", label: "Có Quyết định" }
                          ]}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Members List rendering: Table View or Card View */}
                  {selectedAssociation.members.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl text-center text-slate-600 text-xs space-y-2">
                      <Users className="mx-auto text-slate-300" size={32} />
                      <p>Chưa có thành viên nào tham gia chi hội này.</p>
                      <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <UserPlus size={13} />
                        <span>Thêm thành viên từ Dữ liệu Dân cư</span>
                      </button>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl text-center text-slate-600 text-xs">
                      Không tìm thấy thành viên nào phù hợp với từ khóa "${memberSearchTerm}".
                    </div>
                  ) : memberViewMode === "list" ? (
                    /* LIST (TABLE) VIEW */
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200/80 text-xs font-bold uppercase tracking-wider">
                              <th className="py-2.5 px-3 w-10 text-center">STT</th>
                              <th className="py-2.5 px-3 min-w-[200px]">Thành viên</th>
                              <th className="py-2.5 px-3 min-w-[140px]">Chức danh / Vai trò</th>
                              <th className="py-2.5 px-3 w-28">Năm sinh & SĐT</th>
                              <th className="py-2.5 px-3 min-w-[170px]">Địa chỉ cư trú</th>
                              <th className="py-2.5 px-3 w-36">Hồ sơ / Quyết định</th>
                              <th className="py-2.5 px-3 w-28 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredMembers.map((member, mIdx) => {
                              const matchedRes = residents.find(r => r.cccd === member.cccd);
                              const roleStyle = getMemberRoleStyle(member.role);
                              const isPartyMem = partyMembers.some(p => p.cccd === member.cccd);
                              const memberAvatar = member.avatar || matchedRes?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";

                              return (
                                <tr key={`${member.cccd}-${mIdx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-xs">
                                    {mIdx + 1}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="relative shrink-0">
                                        <img
                                          src={memberAvatar}
                                          alt={member.fullName}
                                          className="w-8 h-8 rounded-full border border-emerald-500/40 object-cover bg-slate-100"
                                          referrerPolicy="no-referrer"
                                        />
                                        {isPartyMem && (
                                          <span
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-xs font-bold"
                                            title="Đảng viên ĐCSVN"
                                          >
                                            ★
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedMemberForDetail(member)}
                                          className="font-bold text-slate-900 hover:text-emerald-700 text-xs text-left cursor-pointer transition-colors block"
                                        >
                                          {member.fullName}
                                        </button>
                                        <span className="text-xs text-slate-500 font-mono">
                                          CCCD: {member.cccd}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs whitespace-nowrap border ${roleStyle.badgeClass}`}>
                                      {member.role}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-xs text-slate-800 font-mono">
                                      {member.phone || matchedRes?.phone || "N/A"}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      {(member.birthDate || matchedRes?.birthDate) || "N/A"}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="text-xs text-slate-600 line-clamp-1 max-w-[200px]" title={matchedRes?.address || "Khu phố 3, An Phú"}>
                                      {matchedRes?.address || "Khu phố 3, An Phú"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {member.decisionNumber ? (
                                      <div className="space-y-0.5">
                                        <span className="text-xs font-mono font-bold text-blue-700 block truncate" title={member.decisionNumber}>
                                          {member.decisionNumber}
                                        </span>
                                        {member.decisionFile && (
                                          <button
                                            type="button"
                                            onClick={() => setViewingDecisionDoc({
                                              memberName: member.fullName,
                                              memberRole: member.role,
                                              memberCccd: member.cccd,
                                              associationName: selectedAssociation.name,
                                              decisionNumber: member.decisionNumber,
                                              decisionDate: member.decisionDate,
                                              joinDate: member.joinDate,
                                              file: member.decisionFile!
                                            })}
                                            className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                          >
                                            <FileText size={10} /> Xem tệp
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-600 italic">
                                        {member.joinDate ? `Từ ${member.joinDate}` : "Ghi nhận hệ thống"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMemberForDetail(member)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                        title="Xem chi tiết hồ sơ thành viên"
                                      >
                                        <Eye size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditMember(member)}
                                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                        title="Sửa thông tin & Quyết định"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMember(member.cccd, member.fullName)}
                                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                        title="Xóa khỏi Chi hội"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* CARD VIEW */
                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5">
                      {filteredMembers.map((member, mIdx) => {
                        const matchedRes = residents.find(r => r.cccd === member.cccd);
                        const roleStyle = getMemberRoleStyle(member.role);
                        const isPartyMem = partyMembers.some(p => p.cccd === member.cccd);
                        const memberAvatar = member.avatar || matchedRes?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";

                        return (
                          <div
                            key={`${member.cccd}-${mIdx}`}
                            className={`p-3.5 rounded-xl border relative transition-colors hover:border-slate-300 flex flex-col justify-between gap-2.5 ${roleStyle.cardBorder}`}
                          >
                            <div className="space-y-2.5">
                              {/* Member Header with Avatar (Full width for Full Name, zero squeezing) */}
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="relative shrink-0 mt-0.5">
                                  <img
                                    src={memberAvatar}
                                    alt={member.fullName}
                                    className="w-10 h-10 rounded-full border-2 border-emerald-500/40 object-cover bg-slate-100"
                                    referrerPolicy="no-referrer"
                                  />
                                  {isPartyMem && (
                                    <span
                                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-xs font-bold"
                                      title="Đảng viên ĐCSVN"
                                    >
                                      ★
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMemberForDetail(member)}
                                    className="font-bold text-slate-900 text-sm truncate hover:text-emerald-700 cursor-pointer block text-left w-full leading-tight"
                                    title={member.fullName}
                                  >
                                    {member.fullName}
                                  </button>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs whitespace-nowrap border ${roleStyle.badgeClass}`}>
                                      {member.role}
                                    </span>
                                  </div>

                                  <div className="text-xs text-slate-600 font-mono whitespace-nowrap">
                                    CCCD: <span className="text-slate-800 font-medium">{member.cccd}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Member Meta Info */}
                              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-600 pt-1.5 border-t border-slate-100">
                                <div className="whitespace-nowrap">
                                  <span className="text-slate-500">SĐT:</span> <span className="font-mono text-slate-800 font-medium">{member.phone || matchedRes?.phone || "N/A"}</span>
                                </div>
                                <div className="whitespace-nowrap">
                                  <span className="text-slate-500">Năm sinh:</span> <span className="text-slate-800 font-medium">{(member.birthDate || matchedRes?.birthDate)?.split("/").pop() || "N/A"}</span>
                                </div>
                                <div className="w-full flex items-center gap-1.5 text-xs">
                                  <Calendar size={12} className="text-emerald-700 shrink-0" />
                                  <span className="text-slate-500">Tham gia:</span>
                                  <span className="font-semibold text-emerald-800">{member.joinDate || "Chưa cập nhật"}</span>
                                </div>
                              </div>

                              {/* Decision info */}
                              {member.decisionNumber && (
                                <div className="pt-0.5">
                                  <div className="inline-flex flex-wrap items-center gap-1 bg-blue-50/90 border border-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-mono">
                                    <FileCheck size={12} className="text-blue-700 shrink-0" />
                                    <span>QĐ: <strong>{member.decisionNumber}</strong></span>
                                    {member.decisionDate && <span className="text-blue-700 font-sans">({member.decisionDate})</span>}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              {/* File Attachment / Upload Area */}
                              {member.decisionFile ? (
                                <div className="flex items-center justify-between w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors">
                                  <div className="flex items-center gap-1.5 min-w-0 pr-1.5">
                                    {member.decisionFile.type === "pdf" ? (
                                      <FileText size={13} className="text-rose-600 shrink-0" />
                                    ) : (
                                      <ImageIcon size={13} className="text-emerald-600 shrink-0" />
                                    )}
                                    <span className="text-xs font-medium text-slate-800 truncate" title={member.decisionFile.name}>
                                      {member.decisionFile.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setViewingDecisionDoc({
                                        memberName: member.fullName,
                                        memberRole: member.role,
                                        memberCccd: member.cccd,
                                        associationName: selectedAssociation.name,
                                        decisionNumber: member.decisionNumber,
                                        decisionDate: member.decisionDate,
                                        joinDate: member.joinDate,
                                        file: member.decisionFile!
                                      })}
                                      className="text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 border border-slate-200 px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                                      title="Xem trước văn bản"
                                    >
                                      <Eye size={11} className="inline mr-0.5" /> Xem
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadFile(member.decisionFile!)}
                                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 p-1 rounded transition-colors cursor-pointer"
                                      title="Tải về"
                                      aria-label={`Tải về ${member.decisionFile.name}`}
                                    >
                                      <Download size={13} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMember(member)}
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 border border-dashed border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/70 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-900 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <UploadCloud size={12} className="text-slate-500 shrink-0" />
                                  <span>+ Tải lên hồ sơ / QĐ</span>
                                </button>
                              )}

                              {/* Clean Member Card Action Footer */}
                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedMemberForDetail(member)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <Eye size={13} className="text-blue-700 shrink-0" />
                                  <span>Hồ sơ chi tiết</span>
                                </button>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditMember(member)}
                                    className="p-1.5 text-slate-600 hover:text-emerald-900 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                                    title="Sửa thông tin & Quyết định"
                                    aria-label={`Sửa ${member.fullName}`}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(member.cccd, member.fullName)}
                                    className="p-1.5 text-slate-600 hover:text-rose-800 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                                    title="Xóa khỏi Chi hội"
                                    aria-label={`Xóa ${member.fullName}`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHẾ ĐỘ 2: BẢNG TỔNG HỢP CHI HỘI & ĐOÀN THỂ (Table View) */}
          {assocViewMode === "table" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
              {/* Table Header Action Bar */}
              <div className="p-4 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2">
                      <span>Bảng Tổng Hợp Chi Hội & Khối Đoàn Thể Cơ Sở</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                        {filteredAssociations.length}/{associations.length} tổ chức
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Danh bạ 23 tổ chức, đơn vị cơ sở trực thuộc Khu phố 3, Phường An Phú (Nhấp vào hàng để xem chi tiết & danh sách hội viên)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleExportAllToExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                    title="Xuất bảng tổng hợp ra file Excel"
                  >
                    <FileSpreadsheet size={13} className="text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAssocModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus size={13} />
                    <span>Thêm Chi hội mới</span>
                  </button>
                </div>
              </div>

              {/* Table Content */}
              {filteredAssociations.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                    <Search size={20} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Không tìm thấy chi hội phù hợp</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Không có tổ chức chi hội nào khớp với từ khóa tìm kiếm "{searchTerm}" hoặc bộ lọc khối hiện tại.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedGroupFilter("all");
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200/90 text-xs font-bold uppercase tracking-wider">
                        <th className="py-3 px-3.5 w-12 text-center">STT</th>
                        <th className="py-3 px-4 min-w-[240px]">Tổ chức & Chi hội</th>
                        <th className="py-3 px-4 min-w-[140px]">Khối trực thuộc</th>
                        <th className="py-3 px-4 min-w-[210px]">Người đứng đầu / Trưởng ban</th>
                        <th className="py-3 px-4 w-28 text-center">Hội viên</th>
                        <th className="py-3 px-4 min-w-[160px]">Quyết định chuẩn y</th>
                        <th className="py-3 px-4 w-32 text-center">Tình trạng</th>
                        <th className="py-3 px-4 w-40 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssociations.map((assoc, idx) => {
                        const badgeStyle = getAssocBadgeStyle(assoc);
                        const IconComp = badgeStyle.icon;
                        const displayName = formatAssocName(assoc.name);
                        const memberCount = assoc.members?.length || 0;
                        const isSelected = selectedAssociation.id === assoc.id;
                        const hasLeader = !!assoc.leaderName;

                        return (
                          <tr
                            key={assoc.id}
                            onClick={() => {
                              setSelectedAssociationId(assoc.id);
                              setAssocViewMode("card");
                              setMobileAssocDetailOpen(true);
                            }}
                            className={`hover:bg-emerald-50/60 hover:border-l-4 hover:border-l-emerald-600 transition-all cursor-pointer group ${isSelected ? "bg-emerald-50/30" : ""
                              }`}
                            title="Nhấp để mở chi tiết & danh sách hội viên"
                          >
                            {/* STT & Mã */}
                            <td className="py-3 px-3.5 text-center">
                              <span className="font-mono text-slate-600 font-bold text-xs block">
                                {(idx + 1).toString().padStart(2, "0")}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 mt-0.5 inline-block">
                                {assoc.id}
                              </span>
                            </td>

                            {/* Tên Chi hội */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-xl shrink-0 ${badgeStyle.iconBg} ${badgeStyle.iconColor} shadow-2xs`}>
                                  <IconComp size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-black text-slate-900 group-hover:text-emerald-800 text-xs transition-colors">
                                    {displayName}
                                  </div>
                                  {assoc.description && (
                                    <p className="text-xs text-slate-500 truncate max-w-[280px] mt-0.5">
                                      {assoc.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Khối trực thuộc */}
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${badgeStyle.iconBg} ${badgeStyle.iconColor}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                <span>{badgeStyle.groupLabel}</span>
                              </span>
                            </td>

                            {/* Người đứng đầu */}
                            <td className="py-3 px-4">
                              {hasLeader ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                    {assoc.leaderName.split(" ").slice(-1)[0][0]}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 block text-xs truncate">
                                      {assoc.leaderName}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                                      <span className="text-emerald-700 font-semibold">{assoc.category}</span>
                                      <span>•</span>
                                      <span>{assoc.leaderCccd ? `CCCD: ${assoc.leaderCccd.substring(0, 6)}***` : "Chưa có CCCD"}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-amber-600 italic flex items-center gap-1">
                                  <AlertCircle size={12} />
                                  <span>Chưa kiện toàn</span>
                                </span>
                              )}
                            </td>

                            {/* Số lượng hội viên */}
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Users size={12} className="text-emerald-600" />
                                <span>{memberCount} tv</span>
                              </span>
                            </td>

                            {/* Quyết định thành lập / chuẩn y */}
                            <td className="py-3 px-4">
                              {assoc.establishmentDecision ? (
                                <div>
                                  <div className="font-mono text-xs font-bold text-indigo-950 flex items-center gap-1">
                                    <FileCheck size={12} className="text-indigo-600 shrink-0" />
                                    <span>{assoc.establishmentDecision.decisionNumber}</span>
                                  </div>
                                  <div className="text-xs text-slate-600 mt-0.5">
                                    Ban hành: {assoc.establishmentDecision.issuedDate || "Đã lưu trữ"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-600 font-mono">Lưu trữ Chi bộ</span>
                              )}
                            </td>

                            {/* Tình trạng kiện toàn */}
                            <td className="py-3 px-4 text-center">
                              {hasLeader && memberCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  <span>Đã kiện toàn</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <AlertCircle size={11} className="text-amber-600" />
                                  <span>Cần bổ sung</span>
                                </span>
                              )}
                            </td>

                            {/* Thao tác */}
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAssociationId(assoc.id);
                                    setAssocViewMode("card");
                                  }}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 cursor-pointer transition-colors"
                                  title="Xem chi tiết & Quản lý hội viên"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAssociationId(assoc.id);
                                    setShowAddMemberModal(true);
                                  }}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 cursor-pointer transition-colors"
                                  title="Thêm hội viên vào chi hội"
                                >
                                  <UserPlus size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditAssoc(assoc);
                                  }}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 cursor-pointer transition-colors"
                                  title="Chỉnh sửa thông tin chi hội"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportToExcel(assoc);
                                  }}
                                  className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold border border-teal-200 cursor-pointer transition-colors"
                                  title="Xuất Excel chi hội"
                                >
                                  <FileSpreadsheet size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteAssoc(assoc);
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 cursor-pointer transition-colors"
                                  title="Xóa / Giải thể chi hội"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                <span>
                  Đang hiển thị <strong className="text-slate-800">{filteredAssociations.length}</strong> trên tổng số <strong className="text-slate-800">{associations.length}</strong> tổ chức & chi hội đoàn thể
                </span>
                <span className="text-xs text-slate-600">
                  Nhấp vào hàng bất kỳ để chuyển sang không gian quản lý chi tiết
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1B: SINH HOẠT CHI BỘ, NGHỊ QUYẾT & ĐẢNG VIÊN 213 THEO TỔ 1–14      */}
      {/* ========================================================================= */}
      {activeSubTab === "meetings" && (() => {
        const assoc213 = associations.find(a => a.id === "ASC_DANG213");
        const merged213Map = new Map<string, { fullName: string; cccd: string; address: string; role: string; phone?: string; joinDate?: string }>();
        (assoc213?.members || []).forEach(m => {
          const matchedRes = residents.find(r => r.cccd === m.cccd);
          merged213Map.set(m.cccd || m.fullName, {
            fullName: m.fullName,
            cccd: m.cccd,
            address: matchedRes?.address || "Khu phố 3, Phường An Phú",
            role: m.role || "Đảng viên sinh hoạt nơi cư trú",
            phone: matchedRes?.phone,
            joinDate: m.joinDate
          });
        });
        partyMembers
          .filter(pm => (pm.cellGroup || "").includes("213") || (pm.position || "").includes("213"))
          .forEach(pm => {
            const key = pm.cccd || pm.id;
            const matchedRes = residents.find(r => (pm.cccd && r.cccd === pm.cccd) || r.fullName === pm.fullName);
            if (!merged213Map.has(key)) {
              merged213Map.set(key, {
                fullName: pm.fullName,
                cccd: pm.cccd || pm.partyCardNumber || pm.id,
                address: matchedRes?.address || "Khu phố 3, Phường An Phú",
                role: pm.position || "Đảng viên 213",
                phone: matchedRes?.phone,
                joinDate: pm.joinDate
              });
            }
          });
        const all213List = Array.from(merged213Map.values());
        const filtered213List = all213List.filter(item => {
          if (to213Filter === "all") return true;
          const areaLabel = extractKp3Area(item.address);
          return areaLabel === to213Filter;
        });

        return (
          <div className="space-y-4">
            {/* Resolutions & Meetings Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Flag size={16} className="text-rose-600" />
                    <span>Điểm danh &amp; Nghị quyết Sinh hoạt Chi bộ KP3</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Lưu trữ biên bản sinh hoạt Chi bộ định kỳ, tỷ lệ đảng viên dự họp và giao việc trực tiếp sang bảng Nhiệm vụ KP3.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddResolutionForm(v => !v)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <Plus size={14} />
                  <span>{showAddResolutionForm ? "Đóng biểu mẫu" : "Thêm Nghị quyết mới"}</span>
                </button>
              </div>

              {showAddResolutionForm && (
                <form onSubmit={handleCreateResolution} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nội dung Nghị quyết *</label>
                      <input
                        type="text"
                        required
                        value={newResTitle}
                        onChange={e => setNewResTitle(e.target.value)}
                        placeholder="Ví dụ: Ra quân kiểm tra PCCC tại các tuyến hẻm KP3..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Đơn vị / Chi hội thực hiện</label>
                      <input
                        type="text"
                        value={newResUnit}
                        onChange={e => setNewResUnit(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cán bộ chủ trì</label>
                      <input
                        type="text"
                        value={newResAssignee}
                        onChange={e => setNewResAssignee(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Hạn hoàn thành</label>
                      <input
                        type="date"
                        value={newResDeadline}
                        onChange={e => setNewResDeadline(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chi tiết triển khai</label>
                    <textarea
                      rows={2}
                      value={newResSummary}
                      onChange={e => setNewResSummary(e.target.value)}
                      placeholder="Ghi rõ mục tiêu, tuyến đường / khu vực KP3..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Lưu Nghị quyết Chi bộ
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {resolutions.map(res => (
                  <div key={res.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                          {res.id}
                        </span>
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {res.attendance}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{res.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{res.summary}</p>
                      <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                        <div>Đơn vị: <strong className="text-slate-800">{res.assigneeUnit}</strong></div>
                        <div>Chủ trì: <strong className="text-slate-800">{res.assigneeName}</strong> • Hạn: {res.deadline}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleDispatchResolutionTask(res)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${res.taskCreated
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                      >
                        <ArrowRight size={13} />
                        <span>{res.taskCreated ? "Đã giao việc (Giao bổ sung)" : "Giao việc từ Nghị quyết"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Đảng viên 213 theo Tổ 1-14 */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Đảng viên sinh hoạt nơi cư trú (Quy định 213) tại Khu phố 3
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Tổng số {all213List.length} đảng viên đang công tác sinh hoạt hai chiều tại KP3.
                  </p>
                </div>
                <div className="min-w-[165px] shrink-0">
                  <ReportSelect
                    aria-label="Lọc Đảng viên 213 theo khu vực KP3"
                    value={to213Filter}
                    onChange={val => setTo213Filter(val)}
                    options={[
                      { value: "all", label: `Toàn địa bàn KP3 (${all213List.length})` },
                      ...KP3_AREA_LIST.map(area => ({ value: area, label: area }))
                    ]}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">CCCD</th>
                      <th className="py-2.5 px-3">Vai trò 213</th>
                      <th className="py-2.5 px-3">Địa chỉ &amp; Khu vực KP3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered213List.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-600">
                          Không có Đảng viên 213 thuộc khu vực KP3 đang chọn.
                        </td>
                      </tr>
                    ) : (
                      filtered213List.map((m, idx) => {
                        const areaLabel = extractKp3Area(m.address);
                        return (
                          <tr key={`${m.cccd}-${idx}`} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{m.fullName}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">{m.cccd}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-xs">
                                {m.role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              <span>{m.address}</span>
                              {areaLabel && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-xs">
                                  {areaLabel}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: CÁN BỘ ĐA VAI TRÒ & MA TRẬN KIÊM NHIỆM                         */}
      {/* ========================================================================= */}
      {activeSubTab === "multi_role" && (
        <div className="space-y-4">
          {/* Multi-role Header & Action Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Sparkles size={16} />
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Ma Trận Cán Bộ Đa Vai Trò & Phân Công Kiêm Nhiệm
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Theo dõi 100% cán bộ đang nắm giữ từ 2 chức danh trở lên tại KP3, đánh giá mức độ cân đối khối lượng công việc.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleExportMultiRoleReport}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Xuất bảng tổng hợp Excel"
              >
                <FileSpreadsheet size={14} className="text-emerald-700" />
                <span>Xuất Excel Ma Trận</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickAssignTab("by-resident");
                  setShowQuickAssignModal(true);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Phân công kiêm nhiệm</span>
              </button>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: `Tất cả (${multiRoleSummary.length})`, val: "Tất cả" },
                { label: `Kiêm nhiệm ≥ 2 vai trò (${multiRoleResidentsCount})`, val: "Đa nhiệm (≥ 2 vai trò)" },
                { label: `Có vai trò (${anyRoleResidentsCount})`, val: "Có vai trò (≥ 1 vai trò)" },
                { label: "Chính quyền", val: "Chính quyền" },
                { label: "Đoàn thể", val: "Đoàn thể" },
                { label: "Đảng viên", val: "Đảng viên" }
              ].map(pill => (
                <button
                  key={pill.val}
                  type="button"
                  onClick={() => setMatrixFilterCategory(pill.val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${matrixFilterCategory === pill.val
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                    }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="Tìm cán bộ, CCCD, chức danh..."
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Multi-role Grid */}
          {filteredMultiRoleSummary.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center">
              <Users size={36} className="mx-auto text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Không tìm thấy cán bộ phù hợp</h4>
              <p className="text-xs text-slate-500 mt-1">Vui lòng thử từ khóa tìm kiếm hoặc bộ lọc khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredMultiRoleSummary.map(item => {
                const isOverloaded = item.rolesCount >= 4;
                const isMulti = item.rolesCount >= 2;
                return (
                  <div
                    key={item.resident.id || item.resident.cccd}
                    className={`bg-white rounded-2xl border transition-all hover:shadow-md p-4 flex flex-col justify-between ${isOverloaded
                        ? "border-rose-300 bg-rose-50/20 shadow-rose-100"
                        : isMulti
                          ? "border-amber-200/80 shadow-2xs"
                          : "border-slate-200/80 shadow-2xs"
                      }`}
                  >
                    <div>
                      {/* Top Person Info */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${isOverloaded
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isMulti
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                            {item.resident.fullName.trim().split(" ").pop()?.slice(0, 2).toUpperCase() || "CB"}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-slate-900 truncate">
                              {item.resident.fullName}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                              <span>CCCD: {item.resident.cccd || "Chưa cấp"}</span>
                              {item.resident.phone && (
                                <span className="text-slate-600">• {item.resident.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono shrink-0 ${isOverloaded
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : isMulti
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                          {item.rolesCount} vai trò
                        </span>
                      </div>

                      {/* Address */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2.5 mb-3">
                        <MapPin size={12} className="text-slate-600 shrink-0" />
                        <span className="truncate">{item.resident.address || "Khu phố 3, Phường An Phú"}</span>
                      </div>

                      {/* Roles List */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Các vị trí kiêm nhiệm:
                        </span>
                        {item.roles.map((r, rIdx) => (
                          <div
                            key={rIdx}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-semibold text-slate-800 truncate text-xs">
                                {r.groupName}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 bg-white border border-slate-200 text-emerald-800 font-bold rounded-lg text-xs shrink-0">
                              {r.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Workload Indicator & Quick Action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        {isOverloaded ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertTriangle size={12} /> Cảnh báo quá tải
                          </span>
                        ) : isMulti ? (
                          <span className="text-amber-700 font-semibold flex items-center gap-1">
                            <Sparkles size={12} /> Đang kiêm nhiệm
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Đơn nhiệm
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setQuickAssignResidentCccd(item.resident.cccd);
                          setQuickAssignTab("by-resident");
                          setShowQuickAssignModal(true);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Điều chỉnh</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: SỔ QUYẾT ĐỊNH CHUẨN Y & HỒ SƠ PHÁP LÝ                          */}
      {/* ========================================================================= */}
      {activeSubTab === "decisions" && (
        <div className="space-y-4">
          {/* Header & Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <FileCheck size={16} />
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Sổ Quyết Định Chuẩn Y & Văn Bản Pháp Quy
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lưu trữ tập trung {totalDecisionsCount} quyết định chuẩn y thành lập & phê duyệt nhân sự từ UBND Phường An Phú và Đảng ủy.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold font-mono">
                Số hóa: {allDecisionsList.length}/{allDecisionsList.length} văn bản (100%)
              </span>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  placeholder="Tìm theo số QĐ, tên cán bộ, CCCD, chi hội..."
                  value={decisionSearch}
                  onChange={e => setDecisionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="min-w-[210px] shrink-0">
                <ReportSelect
                  aria-label="Lọc quyết định theo chi hội"
                  value={decisionAssocFilter}
                  onChange={val => setDecisionAssocFilter(val)}
                  options={[
                    { value: "all", label: `Tất cả chi hội (${associations.length})` },
                    ...associations.map(a => ({ value: a.id, label: a.name }))
                  ]}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Table of Decisions */}
          {filteredDecisionsList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center">
              <FileCheck size={36} className="mx-auto text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Không tìm thấy quyết định nào</h4>
              <p className="text-xs text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold">
                      <th className="py-3 px-3.5 w-12 text-center">STT</th>
                      <th className="py-3 px-3.5">Số Quyết Định</th>
                      <th className="py-3 px-3.5">Ngày Ban Hành</th>
                      <th className="py-3 px-3.5">Cán Bộ Được Chuẩn Y</th>
                      <th className="py-3 px-3.5">Chức Vụ & Tổ Chức</th>
                      <th className="py-3 px-3.5">Cơ Quan Ban Hành</th>
                      <th className="py-3 px-3.5 text-center">Hiệu Lực</th>
                      <th className="py-3 px-3.5 text-right">Tác Vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDecisionsList.map((dec, idx) => (
                      <tr key={`${dec.assocId}-${dec.memberCccd}-${idx}`} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-3 px-3.5 text-center font-mono text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-700">
                            <FileText size={13} className="text-indigo-500 shrink-0" />
                            <span>{dec.decisionNumber}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-mono">
                          {dec.decisionDate}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{dec.memberName}</div>
                          <div className="text-xs text-slate-600 font-mono">CCCD: {dec.memberCccd}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-800">{dec.memberRole}</span>
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">{dec.assocName}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                            {dec.decisionNumber.includes("ĐU") ? "Đảng ủy Phường" : "UBND Phường An Phú"}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={10} /> Đang hiệu lực
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            onClick={() => {
                              setViewingDecisionDoc({
                                memberName: dec.memberName,
                                memberRole: dec.memberRole,
                                memberCccd: dec.memberCccd,
                                associationName: dec.assocName,
                                decisionNumber: dec.decisionNumber,
                                decisionDate: dec.decisionDate,
                                decisionFile: dec.decisionFile
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Xem QĐ</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: SƠ ĐỒ BỘ MÁY CƠ SỞ KP3 (5 TẦNG)                               */}
      {/* ========================================================================= */}
      {activeSubTab === "org_chart" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Layers size={16} />
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Sơ Đồ Cơ Cấu Tổ Chức Bộ Máy Chính Trị & Xã Hội Cơ Sở
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Mô hình tổ chức 5 tầng vận hành tại Khu phố 3, Phường An Phú. Nhấp vào từng khối để xem chi tiết danh sách nhân sự.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold font-mono">
                Tổng cộng: 23 Tổ chức & Chi hội
              </span>
            </div>
          </div>

          {/* Org Chart 5 Tiers */}
          <div className="p-4 sm:p-6 bg-slate-50/60 rounded-3xl border border-slate-200/80 space-y-6">

            {/* TẦNG 1: LÃNH ĐẠO TOÀN DIỆN */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 mb-2">
                Tầng 1 • Hạt nhân Lãnh đạo toàn diện
              </div>
              <div
                onClick={() => {
                  const target = associations.find(a => a.id === "ASC_PARTY" || a.name.includes("Chi bộ"));
                  if (target) {
                    setSelectedAssociationId(target.id);
                    setActiveSubTab("associations");
                  }
                }}
                className="w-full max-w-md bg-white hover:bg-rose-50/30 rounded-2xl border-2 border-rose-500 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer text-center group"
              >
                <div className="inline-flex p-2 bg-rose-100 text-rose-700 rounded-xl mb-1.5">
                  <Flag size={20} />
                </div>
                <h4 className="font-black text-sm text-slate-900 group-hover:text-rose-700 transition-colors">
                  Chi bộ Đảng Khu phố 3
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Bí thư: <span className="font-bold text-slate-900">Nguyễn Văn Hùng</span>
                </p>
                <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono">
                  13 Đảng viên sinh hoạt • QĐ số 12/ĐU-AP
                </div>
              </div>
            </div>

            {/* Connecting Vertical Line */}
            <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

            {/* TẦNG 2: CHẤP HÀNH & HIỆP THƯƠNG */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
                Tầng 2 • Quản lý Điều hành & Hiệp thương Mặt trận
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {/* BDH */}
                <div
                  onClick={() => {
                    const target = associations.find(a => a.id === "ASC_BDH" || a.name.includes("Ban điều hành"));
                    if (target) {
                      setSelectedAssociationId(target.id);
                      setActiveSubTab("associations");
                    }
                  }}
                  className="bg-white hover:bg-emerald-50/30 rounded-2xl border border-emerald-500 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">
                        Ban Điều Hành Khu Phố 3
                      </h4>
                      <p className="text-xs text-slate-500">Cơ quan chấp hành chính quyền cơ sở</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span>Trưởng ban: <strong>Nguyễn Trung Huy</strong></span>
                    <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                      3 Thành viên
                    </span>
                  </div>
                </div>

                {/* Mặt Trận */}
                <div
                  onClick={() => {
                    const target = associations.find(a => a.id === "ASC_MATTRAN" || a.name.includes("Mặt trận"));
                    if (target) {
                      setSelectedAssociationId(target.id);
                      setActiveSubTab("associations");
                    }
                  }}
                  className="bg-white hover:bg-emerald-50/30 rounded-2xl border border-emerald-500 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">
                        Ban Công Tác Mặt Trận
                      </h4>
                      <p className="text-xs text-slate-500">Đại đoàn kết toàn dân tộc địa bàn</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span>Trưởng ban: <strong>Nguyễn Văn Hùng</strong></span>
                    <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                      3 Thành viên
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connecting Vertical Line */}
            <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

            {/* TẦNG 3: KHỐI AN NINH - TRẬT TỰ & PCCC */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-black uppercase tracking-wider text-sky-800 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 mb-2">
                Tầng 3 • Khối An Ninh - Quốc Phòng & PCCC Địa Bàn
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                {[
                  { id: "ASC_ANTT", name: "Tổ ANTT cơ sở", leader: "Phạm Minh Tuấn", role: "Tổ trưởng", count: "4 TV", icon: ShieldCheck, color: "sky" },
                  { id: "ASC_PCCC", name: "Tổ liên gia PCCC", leader: "Nguyễn Trung Huy", role: "Tổ trưởng", count: "3 TV", icon: Flame, color: "orange" },
                  { id: "ASC_HOAGIAI", name: "Tổ hoà giải cơ sở", leader: "Nguyễn Trung Huy", role: "Tổ trưởng", count: "3 TV", icon: Award, color: "emerald" },
                  { id: "ASC_KHUDOI", name: "Khu Đội Dân quân", leader: "Lê Văn Sơn", role: "Khu đội trưởng", count: "3 TV", icon: ShieldAlert, color: "indigo" },
                ].map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const target = associations.find(a => a.id === item.id || a.name.includes(item.name));
                      if (target) {
                        setSelectedAssociationId(target.id);
                        setActiveSubTab("associations");
                      }
                    }}
                    className="bg-white hover:bg-sky-50/40 rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg group-hover:bg-sky-100 group-hover:text-sky-700 transition-colors">
                        <item.icon size={15} />
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                        {item.name}
                      </h5>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div>{item.role}: <strong className="text-slate-800">{item.leader}</strong></div>
                      <div className="text-xs font-mono text-slate-600">{item.count} phụ trách</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connecting Vertical Line */}
            <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

            {/* TẦNG 4: KHỐI ĐOÀN THỂ NHÂN DÂN & HỘI QUẦN CHÚNG */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-black uppercase tracking-wider text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 mb-2">
                Tầng 4 • Khối Đoàn Thể Chính Trị - Xã Hội & Quần Chúng
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 w-full">
                {[
                  { id: "ASC_PHUNU", name: "Hội Phụ nữ", leader: "Lê Thị Mai", count: "3 TV", icon: Heart },
                  { id: "ASC_CCB", name: "Cựu chiến binh", leader: "Phạm Minh Tuấn", count: "3 TV", icon: Award },
                  { id: "ASC_THANHNIEN", name: "Đoàn thanh niên", leader: "Hoàng Gia Bảo", count: "2 TV", icon: Flame },
                  { id: "ASC_NGUOICAOTUOI", name: "Người cao tuổi", leader: "Nguyễn Thị Loan", count: "2 TV", icon: Users },
                  { id: "ASC_CHUTHAPDO", name: "Chữ thập đỏ", leader: "Đỗ Thị Minh", count: "2 TV", icon: Heart },
                  { id: "ASC_KHUYENHOC", name: "Hội Khuyến học", leader: "Đinh Văn Nghĩa", count: "2 TV", icon: Award },
                ].map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const target = associations.find(a => a.id === item.id || a.name.includes(item.name));
                      if (target) {
                        setSelectedAssociationId(target.id);
                        setActiveSubTab("associations");
                      }
                    }}
                    className="bg-white hover:bg-indigo-50/40 rounded-xl border border-slate-200 p-2.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-center group"
                  >
                    <div className="w-7 h-7 mx-auto rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <item.icon size={14} />
                    </div>
                    <h5 className="font-bold text-xs text-slate-900 group-hover:text-indigo-700 truncate">
                      {item.name}
                    </h5>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.leader}</p>
                    <span className="inline-block mt-1 text-xs font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Connecting Vertical Line */}
            <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

            {/* TẦNG 5: MẠNG LƯỚI TỰ QUẢN & TUYẾN ĐỊA BÀN TRỰC THUỘC KP3 */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-200/80 px-3 py-1 rounded-full border border-slate-300 mb-2">
                Tầng 5 • Mạng Lưới Tự Quản & Tuyến Địa Bàn KP3
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full">
                {[
                  { title: "Trục Lương Định Của", desc: "Thương mại, dịch vụ & tuyến dân cư trung tâm" },
                  { title: "Trục Song Hành & Mai Chí Thọ", desc: "Khu dân cư, chung cư & kết nối cửa ngõ" },
                  { title: "16 Tuyến Hẻm Nội Khu", desc: "Bê tông hóa 100%, đồng bộ camera an ninh" },
                  { title: "Tổ Liên Gia An Toàn PCCC", desc: "Phủ 100% các tuyến hẻm & khu nhà trọ KP3" },
                  { title: "Ban Bảo Vệ ANTT Cơ Sở", desc: "Tuần tra, hỗ trợ giữ gìn trật tự địa bàn" },
                  { title: "Tổ Công Nghệ Số Cộng Đồng", desc: "Hỗ trợ VNeID, dịch vụ công & số hóa KP3" }
                ].map(zone => (
                  <div
                    key={zone.title}
                    onClick={() => {
                      const target = associations.find(a => a.id === "ASC_BQL" || a.id === "ASC_ANTT") || associations[0];
                      if (target) {
                        setSelectedAssociationId(target.id);
                        setActiveSubTab("associations");
                      }
                    }}
                    className="bg-white hover:bg-slate-100 rounded-xl border border-slate-200/90 p-3 text-left shadow-2xs transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-black text-slate-800 group-hover:text-emerald-700">
                      {zone.title}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{zone.desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add New Association (Chi hội) Modal */}
      {showAddAssocModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 text-slate-900 border-b border-slate-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Tạo Chi hội / Tổ chức phong trào mới</h3>
                <p className="text-xs text-slate-600 mt-0.5">Thêm chi hội tự quản thuộc mặt trận ban dân vận địa phương</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAssocModal(false)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssociation} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Tên Chi hội / Tổ chức *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chi hội Khuyến học, Câu lạc bộ dưỡng sinh..."
                  value={newAssocName}
                  onChange={(e) => setNewAssocName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Người đứng đầu (Chọn từ danh sách Cư dân có sẵn) *</label>
                <ReportSelect
                  aria-label="Chọn đại diện đứng đầu"
                  value={newAssocLeaderCccd}
                  onChange={(val) => setNewAssocLeaderCccd(val)}
                  options={[
                    { value: "", label: "-- Chọn đại diện đứng đầu --" },
                    ...leaderCandidates.map(r => ({
                      value: r.cccd,
                      label: `${r.fullName} - CCCD: ${r.cccd} (${r.occupation})`
                    }))
                  ]}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Chức danh của người đứng đầu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chi hội trưởng, Chủ nhiệm CLB, Bí thư..."
                  value={newAssocLeaderRole}
                  onChange={(e) => setNewAssocLeaderRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddAssocModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Tạo chi hội mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Association Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-slate-50 text-slate-900 border-b border-slate-200 p-4 px-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <UserPlus size={16} className="text-emerald-700" />
                  Ghi danh Cư dân vào Chi hội & Tải hồ sơ Quyết định
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">Chi hội: <strong className="text-emerald-800">{selectedAssociation.name}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* 1. Chọn Cư dân */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">1. Tìm kiếm và chọn cư dân *</label>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="text"
                    placeholder="Nhập tên hoặc CCCD để lọc nhanh danh sách..."
                    value={residentSearchTerm}
                    onChange={(e) => setResidentSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <ReportSelect
                  aria-label="Chọn thành viên từ cơ sở dữ liệu"
                  value={selectedResidentCccd}
                  onChange={(val) => setSelectedResidentCccd(val)}
                  options={[
                    { value: "", label: `-- Chọn thành viên từ cơ sở dữ liệu (${searchedResidents.length} cư dân) --` },
                    ...searchedResidents.map(r => ({
                      value: r.cccd,
                      label: `${r.fullName} - CCCD: ${r.cccd} (${r.birthDate ? r.birthDate.split("/").pop() : "N/A"}) - ${r.occupation || "Cư dân"}`
                    }))
                  ]}
                  className="text-xs"
                />
                {searchedResidents.length === 0 && (
                  <span className="text-xs text-rose-600 block">Không tìm thấy cư dân nào hợp lệ chưa tham gia.</span>
                )}
              </div>

              {/* 2. Chức vụ & Ngày tham gia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">2. Chức danh / Vai trò *</label>
                    <button
                      type="button"
                      onClick={() => setShowRoleManagerModal(true)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      title="Thêm, sửa, xóa chức danh linh hoạt trong dropdown"
                    >
                      <Settings size={11} />
                      <span>Quản lý</span>
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="flex-1">
                      <ReportSelect
                        aria-label="Chọn chức danh thành viên"
                        value={memberRole}
                        onChange={(val) => {
                          if (val === "__MANAGE_ROLES__") {
                            setShowRoleManagerModal(true);
                          } else {
                            setMemberRole(val);
                          }
                        }}
                        options={[
                          ...customRoles.map(role => ({ value: role, label: role })),
                          { value: "__MANAGE_ROLES__", label: "+ Thêm / Sửa / Xóa chức danh..." }
                        ]}
                        className="text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRoleManagerModal(true)}
                      className="px-2 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Tùy biến danh mục chức danh"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">3. Ngày tham gia / Kết nạp</label>
                    <button
                      type="button"
                      onClick={() => setMemberJoinDate(new Date().toLocaleDateString("vi-VN"))}
                      className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Hôm nay
                    </button>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY (ví dụ: 15/08/2024)"
                      value={memberJoinDate}
                      onChange={(e) => setMemberJoinDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Số quyết định & Ngày quyết định */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">4. Số Quyết định công nhận</label>
                  <div className="relative">
                    <FileCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
                    <input
                      type="text"
                      placeholder="Ví dụ: QĐ-18/UBND-KP3"
                      value={memberDecisionNumber}
                      onChange={(e) => setMemberDecisionNumber(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">5. Ngày ban hành Quyết định</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY (ví dụ: 10/08/2024)"
                    value={memberDecisionDate}
                    onChange={(e) => setMemberDecisionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* 4. Tải lên tệp Quyết định (Hình ảnh, File PDF) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">
                    6. Đính kèm Quyết định (Hình ảnh, File PDF)
                  </label>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-600">Gắn mẫu test:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const residentObj = residents.find(r => r.cccd === selectedResidentCccd);
                        const name = residentObj ? residentObj.fullName : "Hoi_vien";
                        setMemberDecisionFile({
                          name: `Quyet_dinh_ket_nap_${name.replace(/\s+/g, "_")}.pdf`,
                          type: "pdf",
                          size: "285 KB",
                          url: "data:application/pdf;base64,JVBERi0xLjQKJ"
                        });
                        if (!memberDecisionNumber) setMemberDecisionNumber("QĐ-24/UBND-KP3");
                        if (!memberJoinDate) setMemberJoinDate(new Date().toLocaleDateString("vi-VN"));
                        showToast("Đã gắn mẫu file PDF Quyết định", "success");
                      }}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      [Mẫu PDF]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const residentObj = residents.find(r => r.cccd === selectedResidentCccd);
                        const name = residentObj ? residentObj.fullName : "Hoi_vien";
                        setMemberDecisionFile({
                          name: `Anh_chup_Quyet_dinh_${name.replace(/\s+/g, "_")}.jpg`,
                          type: "image",
                          size: "420 KB",
                          url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=900"
                        });
                        if (!memberDecisionNumber) setMemberDecisionNumber("QĐ-25/UBND-KP3");
                        if (!memberJoinDate) setMemberJoinDate(new Date().toLocaleDateString("vi-VN"));
                        showToast("Đã gắn mẫu ảnh chụp Quyết định", "success");
                      }}
                      className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                    >
                      [Mẫu Ảnh]
                    </button>
                  </div>
                </div>

                {memberDecisionFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {memberDecisionFile.type === "pdf" ? (
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{memberDecisionFile.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="uppercase font-bold text-emerald-700 font-mono">{memberDecisionFile.type}</span>
                          <span>•</span>
                          <span>{memberDecisionFile.size || "Sẵn sàng"}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMemberDecisionFile(null)}
                      className="text-slate-600 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                      title="Gỡ bỏ tệp này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                    <UploadCloud size={24} className="text-slate-600" />
                    <span className="text-xs font-semibold text-slate-700">Kéo thả hoặc nhấp để chọn tệp tải lên</span>
                    <span className="text-xs text-slate-600">Hỗ trợ file PDF hoặc hình ảnh (PNG, JPG, WebP) tối đa 20MB</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFileUpload(file, setMemberDecisionFile);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleAddMemberFromResidents}
                  disabled={!selectedResidentCccd}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <UserPlus size={14} />
                  Ghi danh thành viên
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Notification Bar */}
      <InlineNotice
        message={toast?.message ?? null}
        type={toast?.type ?? "info"}
        onDismiss={() => setToast(null)}
      />

      {/* Member Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => {
          if (memberToDelete) {
            performRemoveMember(memberToDelete.cccd);
            setMemberToDelete(null);
          }
        }}
        title="Xác nhận xóa thành viên"
        description={
          memberToDelete
            ? `Bạn có chắc chắn muốn xóa thành viên "${memberToDelete.name}" khỏi chi hội "${selectedAssociation.name}"?`
            : ""
        }
        confirmLabel="Xác nhận xóa"
        variant="danger"
      />

      {/* Modern Custom Member Edit Dialog (Role, Join Date, Decision Number & File Upload) */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-slate-50 text-slate-900 border-b border-slate-200 p-4 px-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Edit2 size={16} className="text-emerald-700" />
                  Cập nhật Hồ sơ & Quyết định Thành viên
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Thành viên: <strong className="text-slate-900">{editingMember.fullName}</strong> - CCCD: <span className="font-mono text-emerald-800 font-semibold">{editingMember.cccd}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Member overview banner */}
              {/* Member overview banner with Avatar & Upload */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="relative shrink-0">
                  <img
                    src={editingMember.avatar || residents.find(r => r.cccd === editingMember.cccd)?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt={editingMember.fullName}
                    className="w-14 h-14 rounded-full border-2 border-emerald-500/50 object-cover bg-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <label
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md border-2 border-white transition-transform hover:scale-110"
                    title="Tải lên ảnh đại diện mới"
                  >
                    <Camera size={12} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadMemberAvatar(editingMember.cccd, file);
                      }}
                    />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{editingMember.fullName}</span>
                    <span className="text-xs font-mono text-slate-500">CCCD: {editingMember.cccd}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Chi hội: <strong className="text-emerald-800">{selectedAssociation.name}</strong> • Năm sinh: <strong className="text-slate-800">{editingMember.birthDate ? editingMember.birthDate.split("/").pop() : "N/A"}</strong>
                  </div>
                  <label className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1 mt-1">
                    <Camera size={12} />
                    <span>Thay đổi hình đại diện</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadMemberAvatar(editingMember.cccd, file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Chức danh / Vai trò linh hoạt */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">1. Chức danh / Vai trò trong Chi hội *</label>
                  <button
                    type="button"
                    onClick={() => setShowRoleManagerModal(true)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    title="Thêm, sửa, xóa chức danh linh hoạt trong dropdown"
                  >
                    <Settings size={11} />
                    <span>Quản lý chức danh</span>
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <ReportSelect
                      aria-label="Chức danh trong Chi hội"
                      value={editMemberRole}
                      onChange={(val) => {
                        if (val === "__MANAGE_ROLES__") {
                          setShowRoleManagerModal(true);
                        } else {
                          setEditMemberRole(val);
                        }
                      }}
                      options={[
                        ...customRoles.map(role => ({ value: role, label: role })),
                        { value: "__MANAGE_ROLES__", label: "+ Thêm / Sửa / Xóa chức danh..." }
                      ]}
                      className="text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRoleManagerModal(true)}
                    className="px-2.5 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Tùy biến danh mục chức danh"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Hoặc tự gõ chức danh khác..."
                  value={editMemberRole}
                  onChange={(e) => setEditMemberRole(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-medium text-slate-800"
                />
              </div>

              {/* Ngày tham gia & Ngày quyết định */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">2. Ngày tham gia chi hội</label>
                    <button
                      type="button"
                      onClick={() => setEditMemberJoinDate(new Date().toLocaleDateString("vi-VN"))}
                      className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Hôm nay
                    </button>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY (ví dụ: 15/08/2023)"
                      value={editMemberJoinDate}
                      onChange={(e) => setEditMemberJoinDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">3. Số Quyết định công nhận</label>
                  <div className="relative">
                    <FileCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
                    <input
                      type="text"
                      placeholder="Ví dụ: QĐ-12/ĐU-AP"
                      value={editMemberDecisionNumber}
                      onChange={(e) => setEditMemberDecisionNumber(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Ngày ký quyết định */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">4. Ngày ký / ban hành Quyết định</label>
                <input
                  type="text"
                  placeholder="DD/MM/YYYY (ví dụ: 10/08/2023)"
                  value={editMemberDecisionDate}
                  onChange={(e) => setEditMemberDecisionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Tải lên / Thay thế tệp Quyết định */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">
                    5. Tệp Quyết định đính kèm (Hình ảnh, PDF)
                  </label>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-600">Gắn mẫu:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditMemberDecisionFile({
                          name: `Quyet_dinh_chuan_y_${editingMember.fullName.replace(/\s+/g, "_")}.pdf`,
                          type: "pdf",
                          size: "245 KB",
                          url: "data:application/pdf;base64,JVBERi0xLjQKJ"
                        });
                        if (!editMemberDecisionNumber) setEditMemberDecisionNumber("QĐ-08/UBND-KP3");
                        showToast("Đã gắn mẫu Quyết định (file PDF)", "success");
                      }}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      [Mẫu PDF]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditMemberDecisionFile({
                          name: `Anh_chup_QĐ_${editingMember.fullName.replace(/\s+/g, "_")}.jpg`,
                          type: "image",
                          size: "380 KB",
                          url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=900"
                        });
                        if (!editMemberDecisionNumber) setEditMemberDecisionNumber("QĐ-14/UBND-KP3");
                        showToast("Đã gắn mẫu ảnh chụp Quyết định", "success");
                      }}
                      className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                    >
                      [Mẫu Ảnh]
                    </button>
                  </div>
                </div>

                {editMemberDecisionFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {editMemberDecisionFile.type === "pdf" ? (
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{editMemberDecisionFile.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="uppercase font-bold text-emerald-700 font-mono">{editMemberDecisionFile.type}</span>
                          <span>•</span>
                          <span>{editMemberDecisionFile.size || "Sẵn sàng"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingDecisionDoc({
                          memberName: editingMember.fullName,
                          memberRole: editMemberRole,
                          memberCccd: editingMember.cccd,
                          associationName: selectedAssociation.name,
                          decisionNumber: editMemberDecisionNumber,
                          decisionDate: editMemberDecisionDate,
                          joinDate: editMemberJoinDate,
                          file: editMemberDecisionFile!
                        })}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        title="Xem thử tệp này"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditMemberDecisionFile(null)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                        title="Gỡ bỏ tệp này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                    <UploadCloud size={24} className="text-slate-600" />
                    <span className="text-xs font-semibold text-slate-700">Kéo thả hoặc nhấp để tải lên tệp mới</span>
                    <span className="text-xs text-slate-600">Hỗ trợ file PDF hoặc hình ảnh (PNG, JPG, WebP) tối đa 20MB</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFileUpload(file, setEditMemberDecisionFile);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal (Văn bản Quyết định Công nhận / Kết nạp) */}
      {viewingDecisionDoc && (
        <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Header */}
            <div className="bg-slate-50 text-slate-900 border-b border-slate-200 p-4 px-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${viewingDecisionDoc.file.type === 'pdf' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {viewingDecisionDoc.file.type === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                    Hồ sơ Quyết định Công nhận & Kết nạp
                    <span className="uppercase text-xs font-mono px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                      {viewingDecisionDoc.file.type}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Thành viên: <strong className="text-slate-900">{viewingDecisionDoc.memberName}</strong></span>
                    <span>•</span>
                    <span>Chi hội: <strong className="text-slate-900">{viewingDecisionDoc.associationName}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingDecisionDoc.file)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Tải về tệp này"
                >
                  <Download size={13} /> Tải tệp về
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="In văn bản"
                >
                  <Printer size={13} /> In
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDecisionDoc(null)}
                  aria-label="Đóng cửa sổ"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer ml-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Sub-header info bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
              <div className="flex items-center gap-4">
                <span>Số QĐ: <strong className="font-mono text-blue-700">{viewingDecisionDoc.decisionNumber || "QĐ-HĐND-AP"}</strong></span>
                <span>Ngày ký: <strong className="text-slate-800">{viewingDecisionDoc.decisionDate || viewingDecisionDoc.joinDate || "Ghi nhận hệ thống"}</strong></span>
                <span>Chức vụ: <strong className="text-emerald-700">{viewingDecisionDoc.memberRole}</strong></span>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Tệp: {viewingDecisionDoc.file.name} {viewingDecisionDoc.file.size && `(${viewingDecisionDoc.file.size})`}
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70">
              {viewingDecisionDoc.file.type === "image" ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 max-w-full">
                    <img
                      src={viewingDecisionDoc.file.url}
                      alt={viewingDecisionDoc.file.name}
                      className="max-h-[520px] w-auto object-contain rounded-lg mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=900";
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-600">Hình ảnh bản quét / chụp quyết định kết nạp chính thức</span>
                </div>
              ) : (
                /* PDF Display */
                <div className="space-y-4">
                  {viewingDecisionDoc.file.url.startsWith("data:application/pdf") ? (
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                      <iframe
                        src={viewingDecisionDoc.file.url}
                        title={viewingDecisionDoc.file.name}
                        className="w-full h-[520px]"
                      />
                    </div>
                  ) : (
                    /* Standard Official Administrative Decision Certificate Layout */
                    <div className="bg-white p-8 md:p-10 rounded-2xl shadow-md border border-slate-300 max-w-2xl mx-auto space-y-6 text-slate-800 font-serif">
                      {/* National Header */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                        <div className="text-center font-sans text-xs space-y-0.5">
                          <div className="font-bold text-slate-800 uppercase tracking-tight">UBND PHƯỜNG AN PHÚ</div>
                          <div className="font-bold text-emerald-800 uppercase text-xs">KHU PHỐ 3 - BAN ĐIỀU HÀNH</div>
                          <div className="text-xs text-slate-500 font-mono pt-1">Số: {viewingDecisionDoc.decisionNumber || "12/QĐ-UBND-KP3"}</div>
                        </div>

                        <div className="text-center space-y-0.5 font-sans">
                          <div className="font-black text-xs uppercase tracking-wider text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                          <div className="font-bold text-xs text-slate-700 underline decoration-1 underline-offset-4">Độc lập - Tự do - Hạnh phúc</div>
                          <div className="text-xs text-slate-600 italic pt-1">An Phú, ngày {viewingDecisionDoc.decisionDate || viewingDecisionDoc.joinDate || "15 tháng 08 năm 2024"}</div>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="text-center space-y-1.5 py-2 font-sans">
                        <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wide">QUYẾT ĐỊNH</h2>
                        <p className="text-xs font-bold text-slate-700 italic">
                          Về việc công nhận hội viên và chuẩn y nhiệm vụ trong {viewingDecisionDoc.associationName}
                        </p>
                      </div>

                      {/* Content */}
                      <div className="space-y-3 text-xs leading-relaxed font-sans text-slate-700">
                        <p className="italic text-slate-600">
                          - Căn cứ Quy chế tổ chức và hoạt động của Khu phố và các Chi hội Đoàn thể cơ sở;<br />
                          - Căn cứ Điều lệ và Hướng dẫn thực hiện Điều lệ của {viewingDecisionDoc.associationName};<br />
                          - Xét đơn tự nguyện gia nhập và phẩm chất đạo đức, tinh thần trách nhiệm của công dân;
                        </p>

                        <div className="font-bold text-slate-900 text-center uppercase tracking-wider py-1">QUYẾT ĐỊNH:</div>

                        <div className="space-y-2">
                          <p>
                            <strong>Điều 1.</strong> Công nhận Ông/Bà: <strong className="text-slate-900 text-sm font-bold uppercase">{viewingDecisionDoc.memberName}</strong>
                            <br />
                            Số CCCD: <span className="font-mono">{viewingDecisionDoc.memberCccd}</span>.
                            <br />
                            Tham gia sinh hoạt tại: <strong>{viewingDecisionDoc.associationName}</strong> với vai trò/chức danh: <strong className="text-emerald-800">{viewingDecisionDoc.memberRole}</strong>.
                          </p>
                          <p>
                            <strong>Điều 2.</strong> Ngày chính thức tham gia và bắt đầu hưởng quyền lợi, thực hiện nghĩa vụ hội viên từ ngày: <strong>{viewingDecisionDoc.joinDate || "Theo ngày ban hành"}</strong>.
                          </p>
                          <p>
                            <strong>Điều 3.</strong> Ban Điều hành Khu phố, Ban Chấp hành {viewingDecisionDoc.associationName} và Ông/Bà <strong>{viewingDecisionDoc.memberName}</strong> chịu trách nhiệm thi hành Quyết định này.
                          </p>
                        </div>
                      </div>

                      {/* Signature and Seal */}
                      <div className="flex justify-between items-end pt-6 font-sans">
                        <div className="text-xs text-slate-500 italic space-y-0.5">
                          <div><strong>Nơi nhận:</strong></div>
                          <div>- Như Điều 3;</div>
                          <div>- UBND Phường (báo cáo);</div>
                          <div>- Lưu hồ sơ Chi hội.</div>
                        </div>

                        <div className="text-center space-y-1 relative pr-4">
                          <div className="text-xs font-bold text-slate-800 uppercase">TM. BAN ĐIỀU HÀNH / CHI HỘI</div>
                          <div className="text-xs text-slate-500 italic">Trưởng ban / Chi hội trưởng</div>

                          {/* Simulated Red Official Stamp */}
                          <div className="relative py-3 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-rose-600/70 text-rose-600 flex flex-col items-center justify-center font-bold uppercase leading-tight rotate-[-12deg] shadow-2xs pointer-events-none select-none text-xs">
                              <span className="text-xs font-bold">★ KHU PHỐ 3 ★</span>
                              <span className="font-black text-xs text-rose-700">BAN ĐIỀU HÀNH</span>
                              <span className="text-xs text-rose-500 font-bold">ĐÃ CHUẨN Y</span>
                            </div>
                          </div>
                          <div className="font-bold text-xs text-slate-900 pt-1">Đã ký và đóng dấu</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 px-6 bg-white border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
              <span className="text-slate-600 text-xs">
                Hệ thống Quản lý Chi hội & Đoàn thể Khu phố 3 - Phường An Phú
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingDecisionDoc.file)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Tải về máy ({viewingDecisionDoc.file.size || "Tệp"})
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDecisionDoc(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Association (Chi hội) Modal */}
      {showEditAssocModal && assocToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-slate-50 text-slate-900 border-b border-slate-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Pencil size={16} className="text-emerald-700" />
                  Chỉnh sửa Thông tin Chi hội
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">Mã chi hội: {assocToEdit.id}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditAssocModal(false);
                  setAssocToEdit(null);
                }}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAssociation} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Tên Chi hội / Tổ chức *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chi hội Khuyến học, Câu lạc bộ dưỡng sinh..."
                  value={editAssocName}
                  onChange={(e) => setEditAssocName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Người đứng đầu (Chọn từ danh sách Cư dân)</label>
                <ReportSelect
                  aria-label="Chọn người đứng đầu chi hội"
                  value={editAssocLeaderCccd}
                  onChange={(val) => setEditAssocLeaderCccd(val)}
                  options={[
                    { value: "", label: "-- Giữ nguyên hoặc chọn người khác --" },
                    ...leaderCandidates.map(r => ({
                      value: r.cccd,
                      label: `${r.fullName} - CCCD: ${r.cccd} (${r.occupation})`
                    }))
                  ]}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Chức danh người đứng đầu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chi hội trưởng, Chủ nhiệm CLB, Bí thư..."
                  value={editAssocLeaderRole}
                  onChange={(e) => setEditAssocLeaderRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAssocModal(false);
                    setAssocToEdit(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Dissolve Association Confirmation Modal */}
      {assocToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 border border-rose-100">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-rose-100">
                <AlertTriangle size={28} />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-black text-slate-900 text-base">Xác nhận Giải thể / Xóa Chi hội?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bạn đang chuẩn bị giải thể hoặc xóa tổ chức:
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1">
                  <div className="font-bold text-slate-800 text-sm">{assocToDelete.name}</div>
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Quy mô: <strong className="text-rose-600">{assocToDelete.members.length} thành viên</strong></span>
                    <span>Người phụ trách: <strong className="text-slate-700">{assocToDelete.leaderName}</strong></span>
                  </div>
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-left">
                  ⚠️ Lưu ý: Hành động này sẽ gỡ bỏ hồ sơ tổ chức của chi hội khỏi danh sách điều hành khu phố.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAssocToDelete(null)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy giữ lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAssoc}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Xác nhận giải thể
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 1. MODAL CHI TIẾT THÀNH VIÊN CHI HỘI */}
      {selectedMemberForDetail && (() => {
        const member = selectedMemberForDetail;
        const matchedRes = residents.find(r => r.cccd === member.cccd);
        const memberAvatar = member.avatar || matchedRes?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
        const isPartyMem = partyMembers.some(p => p.cccd === member.cccd);
        const navList = filteredMembers.length > 0 ? filteredMembers : selectedAssociation.members;
        const currentIdx = navList.findIndex(m => m.cccd === member.cccd);
        const totalNav = navList.length;
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx >= 0 && currentIdx < totalNav - 1;

        const allAssociatedRoles = associations
          .filter(a => a.members.some(m => m.cccd === member.cccd))
          .map(a => {
            const m = a.members.find(mem => mem.cccd === member.cccd)!;
            return {
              assocName: a.name,
              assocCategory: a.category,
              role: m.role,
              decisionNumber: m.decisionNumber,
              joinDate: m.joinDate,
              isCurrentAssoc: a.id === selectedAssociation.id
            };
          });

        return (
          <Modal
            isOpen={Boolean(selectedMemberForDetail)}
            onClose={() => setSelectedMemberForDetail(null)}
            size="2xl"
            compact
            ariaLabel={`Hồ sơ chi tiết thành viên ${member.fullName}`}
            headerNavigation={
              totalNav > 1 && currentIdx >= 0
                ? {
                    positionText: `Thành viên ${currentIdx + 1}/${totalNav}`,
                    hasPrev,
                    hasNext,
                    onPrev: () => hasPrev && setSelectedMemberForDetail(navList[currentIdx - 1]),
                    onNext: () => hasNext && setSelectedMemberForDetail(navList[currentIdx + 1]),
                    prevLabel: "Thành viên trước",
                    nextLabel: "Thành viên tiếp theo",
                  }
                : undefined
            }
            headerSlot={
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative group shrink-0">
                  <img
                    src={memberAvatar}
                    alt={member.fullName}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-slate-200 object-cover bg-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  {isPartyMem && (
                    <span
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-xs text-white font-bold"
                      title="Đảng viên ĐCSVN"
                    >
                      ★
                    </span>
                  )}
                  <label
                    className="absolute inset-0 rounded-xl bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-[11px] font-semibold gap-0.5"
                    title="Bấm để tải lên ảnh đại diện mới"
                  >
                    <Camera size={15} />
                    <span>Đổi ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadMemberAvatar(member.cccd, file);
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {selectedAssociation.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      {member.role}
                    </span>
                    {isPartyMem && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                        <span>★</span> Đảng viên
                      </span>
                    )}
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                    {member.fullName}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>
                      Tham gia: <strong className="text-slate-800">{member.joinDate || "Hệ thống ghi nhận"}</strong>
                    </span>
                    {member.decisionNumber && (
                      <span>• QĐ: <strong className="text-slate-900 font-mono">{member.decisionNumber}</strong></span>
                    )}
                    {matchedRes?.address && (
                      <span className="truncate max-w-sm">• {matchedRes.address}</span>
                    )}
                  </div>
                </div>
              </div>
            }
            bodyClassName="p-4 sm:p-5 space-y-3 bg-white text-xs"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="min-h-8 inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                  <Camera size={13} className="text-emerald-700" />
                  <span>Đổi ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadMemberAvatar(member.cccd, file);
                    }}
                  />
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMemberForDetail(null)}
                    className="min-h-8 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberForDetail(null);
                      handleOpenEditMember(member);
                    }}
                    className="min-h-8 inline-flex items-center gap-1 px-3.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Chỉnh sửa</span>
                  </button>
                </div>
              </div>
            }
          >

                {/* MỤC 1: Thông tin định danh & Tham gia Chi hội */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                      <CreditCard size={14} className="text-emerald-700" />
                      <span>1. Định danh &amp; Nhiệm vụ Chi hội</span>
                    </div>
                  </div>

                  <DetailGrid hideEmpty compact>
                    <DetailRow label="Số CCCD" value={member.cccd} isMono copyValue={member.cccd} />
                    <DetailRow label="Chức danh / Vai trò" value={<span className="font-bold text-emerald-800">{member.role}</span>} />
                    <DetailRow label="Ngày tham gia" value={member.joinDate} isMono />
                    <DetailRow
                      label="Đảng viên ĐCSVN"
                      value={
                        <span className={isPartyMem ? "font-bold text-rose-700" : "font-semibold text-slate-600"}>
                          {isPartyMem ? "★ Đảng viên chính thức" : "Quần chúng"}
                        </span>
                      }
                    />
                  </DetailGrid>
                </div>

                {/* MỤC 2: Cư trú & Liên hệ */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 pb-1 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <Home size={14} className="text-slate-700" />
                    <span>2. Cư trú &amp; Liên hệ</span>
                  </div>

                  <DetailGrid hideEmpty compact>
                    <DetailRow
                      label="Số điện thoại"
                      value={member.phone || matchedRes?.phone}
                      isMono
                      copyValue={member.phone || matchedRes?.phone}
                      href={(member.phone || matchedRes?.phone) ? `tel:${member.phone || matchedRes?.phone}` : undefined}
                    />
                    <DetailRow label="Ngày / Năm sinh" value={member.birthDate || matchedRes?.birthDate} isMono />
                    <DetailRow label="Địa chỉ cư trú" value={matchedRes?.address || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"} colSpan={2} />
                    <DetailRow label="Mã Hộ gia đình" value={matchedRes?.householdId} isMono copyValue={matchedRes?.householdId} />
                    <DetailRow label="Tình trạng cư trú" value={<span className="font-semibold text-emerald-800">{matchedRes?.status || "Thường trú"}</span>} />
                  </DetailGrid>
                </div>

                {/* MỤC 3: Hồ sơ Quyết định công nhận */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                      <FileCheck size={14} className="text-amber-600" />
                      <span>3. Quyết định công nhận</span>
                    </div>
                    {member.decisionFile && (
                      <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Có tệp đính kèm
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <DetailGrid hideEmpty compact>
                      <DetailRow label="Số Quyết định" value={member.decisionNumber} isMono copyValue={member.decisionNumber} />
                      <DetailRow label="Ngày ký quyết định" value={member.decisionDate} isMono />
                    </DetailGrid>

                    {member.decisionFile ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {member.decisionFile.type === "pdf" ? (
                            <FileText size={16} className="text-rose-600 shrink-0" />
                          ) : (
                            <ImageIcon size={16} className="text-emerald-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate" title={member.decisionFile.name}>
                              {member.decisionFile.name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {member.decisionFile.size || "Tệp văn bản"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberForDetail(null);
                              setViewingDecisionDoc({
                                memberName: member.fullName,
                                memberRole: member.role,
                                memberCccd: member.cccd,
                                associationName: selectedAssociation.name,
                                decisionNumber: member.decisionNumber,
                                decisionDate: member.decisionDate,
                                joinDate: member.joinDate,
                                file: member.decisionFile!
                              });
                            }}
                            className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded text-xs font-bold cursor-pointer transition-colors"
                          >
                            Xem văn bản
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(member.decisionFile!)}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                            title="Tải về máy"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic py-1">
                        Chưa có văn bản Quyết định dạng tệp đính kèm. Bạn có thể bấm "Chỉnh sửa hồ sơ" để tải lên.
                      </p>
                    )}
                  </div>
                </div>

                {/* THẺ 4: Đa vai trò - Các vị trí / Kiêm nhiệm khác tại Khu phố 3 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <Sparkles size={15} className="text-amber-500" />
                      <span>4. Đa vai trò & Kiêm nhiệm tại Khu phố 3</span>
                    </div>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      {allAssociatedRoles.length} tổ chức
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {allAssociatedRoles.map((roleItem, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${roleItem.isCurrentAssoc
                            ? "bg-emerald-50/70 border-emerald-200"
                            : "bg-slate-50/60 border-slate-200"
                          }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {roleItem.assocName}
                            </span>
                            {roleItem.isCurrentAssoc && (
                              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                Hiện tại
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-600 block">
                            Chức danh: <strong className="text-slate-800">{roleItem.role}</strong>
                            {roleItem.decisionNumber ? ` • QĐ: ${roleItem.decisionNumber}` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
          </Modal>
        );
      })()}

      {/* 3. MODAL PHÂN CÔNG ĐA VAI TRÒ & GÁN NHÓM NHANH (QUICK ASSIGN) */}
      {showQuickAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="bg-amber-50/70 text-slate-900 border-b border-amber-200 p-5 flex justify-between items-start shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                    Đa vai trò & Đa nhiệm
                  </span>
                  <span className="text-slate-600 text-xs font-semibold">Khu phố 3</span>
                </div>
                <h3 className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-700" />
                  Phân công Nhanh Đa vai trò - Gán Cư dân vào các Nhóm / Chi hội
                </h3>
                <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
                  01 Cư dân có thể đảm nhiệm nhiều vai trò cùng lúc (Ví dụ: Nguyễn Trung Huy có thể là Đảng viên, Trưởng Ban điều hành, Tổ trưởng Tổ hòa giải, Đội viên ANTT cơ sở...). Chỉ cần đánh dấu hoặc tích chọn để thêm nhanh vào các nhóm khác.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAssignModal(false)}
                className="text-slate-600 hover:text-slate-900 hover:bg-amber-100 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Đóng cửa sổ"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab selection: Gán theo Cư dân VS Gán theo Nhóm */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 pt-3 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setQuickAssignTab("by-resident")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${quickAssignTab === "by-resident"
                    ? "border-amber-600 text-amber-900 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                <UserCheck size={14} />
                <span>1. Phân công theo Cư dân (Chọn cư dân rồi gán các vai trò)</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickAssignTab("by-group")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${quickAssignTab === "by-group"
                    ? "border-amber-600 text-amber-900 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                <Users size={14} />
                <span>2. Gán nhóm hàng loạt (Chọn chi hội rồi tích chọn các cư dân)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {quickAssignTab === "by-resident" ? (
                /* TAB 1: GÁN THEO CƯ DÂN */
                <div className="space-y-4">
                  {/* Select target resident */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Chọn Cư dân để cấu hình Đa vai trò / Đa nhiệm *
                      </label>
                      <input
                        type="text"
                        placeholder="Tìm nhanh theo họ tên hoặc CCCD..."
                        value={quickAssignResidentSearch}
                        onChange={(e) => setQuickAssignResidentSearch(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 font-medium placeholder:text-slate-400"
                      />
                      <ReportSelect
                        aria-label="Chọn cư dân để phân công đa vai trò"
                        value={quickAssignResidentCccd}
                        onChange={(val) => handleSelectQuickAssignResident(val)}
                        options={residents
                          .filter(r => {
                            if (!quickAssignResidentSearch.trim()) return true;
                            const q = quickAssignResidentSearch.toLowerCase();
                            return r.fullName.toLowerCase().includes(q) || r.cccd.includes(q);
                          })
                          .slice(0, 100)
                          .map(r => ({
                            value: r.cccd,
                            label: `${r.fullName} - CCCD: ${r.cccd} (${r.occupation || "Cư dân"})`
                          }))}
                        className="text-xs"
                      />
                      {quickAssignResidentSearch.trim() && (
                        <div className="text-xs text-slate-500 italic">
                          Tìm thấy {residents.filter(r => {
                            const q = quickAssignResidentSearch.toLowerCase();
                            return r.fullName.toLowerCase().includes(q) || r.cccd.includes(q);
                          }).length} kết quả phù hợp (hiển thị tối đa 100).
                        </div>
                      )}
                    </div>

                    {/* Selected resident quick summary */}
                    {(() => {
                      const res = residents.find(r => r.cccd === quickAssignResidentCccd);
                      if (!res) return null;
                      const currentRoles = associations.filter(a => a.members.some(m => m.cccd === res.cccd));

                      return (
                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
                          <img
                            src={res.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                            alt={res.fullName}
                            className="w-10 h-10 rounded-full border border-amber-300 object-cover bg-slate-100 shrink-0"
                          />
                          <div className="text-xs min-w-0">
                            <div className="font-bold text-slate-900 truncate">{res.fullName}</div>
                            <div className="text-slate-500 text-xs font-mono">SĐT: {res.phone || "N/A"} • {res.address}</div>
                            <div className="text-xs text-amber-700 font-semibold mt-0.5">
                              Hiện đang tham gia: <strong>{currentRoles.length}</strong> tổ chức / chi hội
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Target Groups Multi-select Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Tích chọn các Chi hội & Nhóm nhiệm vụ mà cư dân này đảm nhiệm:
                      </label>
                      <span className="text-xs text-slate-500">
                        Đang chọn {Object.values(quickAssignGroupSelections).filter((g: any) => g.selected).length}/{TARGET_GROUPS.length} nhóm
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {TARGET_GROUPS.map(group => {
                        const selection = quickAssignGroupSelections[group.id] || { selected: false, role: group.defaultRole };
                        const isSelected = selection.selected;

                        return (
                          <div
                            key={group.id}
                            className={`p-3.5 rounded-xl border transition-all ${isSelected
                                ? "bg-amber-50/60 border-amber-300 shadow-2xs ring-1 ring-amber-300/60"
                                : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleQuickAssignGroup(group.id)}
                                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                                />
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <span>{group.name}</span>
                                  </div>
                                </div>
                              </label>

                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSelected ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600"
                                }`}>
                                {isSelected ? "Đã gán" : "Chưa tham gia"}
                              </span>
                            </div>

                            {/* Specific role input if selected */}
                            {isSelected && (
                              <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center gap-2">
                                <label className="text-xs font-semibold text-slate-600 shrink-0">Chức vụ đảm nhận:</label>
                                <input
                                  type="text"
                                  value={selection.role}
                                  onChange={(e) => handleUpdateQuickAssignRole(group.id, e.target.value)}
                                  placeholder="Ví dụ: Chi hội phó, Đội viên..."
                                  className="flex-1 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* TAB 2: GÁN THEO NHÓM (CHỌN CHI HỘI RỒI TÍCH NHIỀU CƯ DÂN) */
                <div className="space-y-4">
                  {/* Select target group */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Chọn Chi hội / Tổ chức mục tiêu để nạp cư dân vào *
                    </label>
                    <ReportSelect
                      aria-label="Chọn Chi hội mục tiêu để nạp cư dân"
                      value={quickAssignTargetGroupId}
                      onChange={(val) => setQuickAssignTargetGroupId(val)}
                      options={TARGET_GROUPS.map(g => ({
                        value: g.id,
                        label: `${g.name} - Vai trò mặc định: ${g.defaultRole}`
                      }))}
                      className="text-xs"
                    />
                  </div>

                  {/* Residents search and selection list */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
                        <input
                          type="text"
                          placeholder="Lọc tên cư dân, số CCCD, nghề nghiệp..."
                          value={quickAssignResidentSearch}
                          onChange={(e) => setQuickAssignResidentSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = residents
                              .filter(r => !quickAssignResidentSearch.trim() || r.fullName.toLowerCase().includes(quickAssignResidentSearch.toLowerCase()) || r.cccd.includes(quickAssignResidentSearch))
                              .map(r => r.cccd);
                            setQuickAssignSelectedResidentCccds(filtered);
                          }}
                          className="text-amber-700 hover:underline font-semibold cursor-pointer"
                        >
                          Chọn tất cả lọc ({residents.filter(r => !quickAssignResidentSearch.trim() || r.fullName.toLowerCase().includes(quickAssignResidentSearch.toLowerCase()) || r.cccd.includes(quickAssignResidentSearch)).length})
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setQuickAssignSelectedResidentCccds([])}
                          className="text-slate-500 hover:underline font-semibold cursor-pointer"
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                      {(() => {
                        const filtered = residents.filter(r => {
                          if (!quickAssignResidentSearch.trim()) return true;
                          const q = quickAssignResidentSearch.toLowerCase();
                          return r.fullName.toLowerCase().includes(q) || r.cccd.includes(q) || (r.occupation && r.occupation.toLowerCase().includes(q));
                        });
                        const displayed = filtered.slice(0, 100);

                        return (
                          <>
                            {filtered.length > 100 && (
                              <div className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium text-center sticky top-0 z-10 shadow-xs">
                                Đang hiển thị 100 / {filtered.length} cư dân phù hợp. Hãy nhập thêm tên hoặc CCCD để lọc chính xác.
                              </div>
                            )}
                            {displayed.map((res, idx) => {
                              const isChecked = quickAssignSelectedResidentCccds.includes(res.cccd);

                              const targetGroupAssoc = associations.find(a => a.id === quickAssignTargetGroupId || a.name.toLowerCase() === TARGET_GROUPS.find(g => g.id === quickAssignTargetGroupId)?.name.toLowerCase());
                              const isAlreadyMember = targetGroupAssoc?.members.some(m => m.cccd === res.cccd);
                              const rolesCount = associations.filter(a => a.members.some(m => m.cccd === res.cccd)).length;

                              return (
                                <label
                                  key={`${res.id || res.cccd}-${idx}`}
                                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${isChecked
                                      ? "bg-amber-50 border-amber-300 ring-1 ring-amber-300 shadow-2xs"
                                      : "bg-white border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleBatchResidentCccd(res.cccd)}
                                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        <span className="truncate">{res.fullName}</span>
                                        {isAlreadyMember && (
                                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                                            Đã là thành viên
                                          </span>
                                        )}
                                        {rolesCount > 1 && (
                                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                                            {rolesCount} vai trò khác
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500 flex items-center gap-3">
                                        <span>CCCD: <strong className="font-mono text-slate-700">{res.cccd}</strong></span>
                                        <span>SĐT: <strong className="font-mono text-slate-700">{res.phone || "N/A"}</strong></span>
                                        <span className="truncate">{res.address}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <span className="text-xs text-amber-600 font-bold shrink-0">
                                    {isChecked ? "✓ Đã chọn" : "+ Tích chọn"}
                                  </span>
                                </label>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <div className="text-xs text-slate-600">
                {quickAssignTab === "by-resident" ? (
                  <span>
                    Đang thiết lập: <strong>{Object.values(quickAssignGroupSelections).filter((g: any) => g.selected).length}</strong> nhóm đối tượng cho cư dân đã chọn.
                  </span>
                ) : (
                  <span>
                    Đang chọn: <strong>{quickAssignSelectedResidentCccds.length}</strong> cư dân để thêm vào nhóm <strong>{TARGET_GROUPS.find(g => g.id === quickAssignTargetGroupId)?.name}</strong>.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowQuickAssignModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                {quickAssignTab === "by-resident" ? (
                  <button
                    type="button"
                    onClick={handleSaveQuickAssignByResident}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={16} /> Lưu & Cập nhật phân công
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveQuickAssignByGroup}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={16} /> Thêm {quickAssignSelectedResidentCccds.length} cư dân đã tích
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL QUẢN LÝ DANH MỤC CHỨC DANH / VAI TRÒ (Thêm, Sửa, Xóa chức danh linh hoạt trong Dropdown) */}
      {showRoleManagerModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Header */}
            <div className="bg-slate-50 text-slate-900 border-b border-slate-200 p-4 px-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Quản lý Danh mục Chức danh / Vai trò</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Thêm mới, chỉnh sửa, xóa chức danh linh hoạt hiển thị trong dropdown Chi hội
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRoleManagerModal(false);
                  setEditingRoleIndex(null);
                  setNewRoleInput("");
                }}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Thêm chức danh mới */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <label className="font-bold text-emerald-900 block text-xs flex items-center gap-1.5">
                  <Plus size={14} className="text-emerald-700" />
                  <span>Thêm Chức danh / Vai trò mới vào danh mục:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ví dụ: Trưởng ban thanh tra nhân dân, Thủ quỹ, Phó Chủ nhiệm CLB..."
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomRole(newRoleInput);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomRole(newRoleInput)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Lọc tìm kiếm chức danh */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm chức danh trong danh mục..."
                    value={roleSearchFilter}
                    onChange={(e) => setRoleSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/60 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmResetRoles(true)}
                  className="text-xs text-slate-600 hover:text-emerald-700 hover:underline font-medium shrink-0 cursor-pointer"
                  title="Khôi phục danh sách chức danh mẫu chuẩn"
                >
                  Khôi phục mặc định
                </button>
              </div>

              {/* Danh sách các chức danh */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-1">
                  Danh mục chức danh hiện có ({customRoles.length}):
                </div>
                {customRoles
                  .filter(r => !roleSearchFilter.trim() || r.toLowerCase().includes(roleSearchFilter.trim().toLowerCase()))
                  .map((role, idx) => {
                    const isEditing = editingRoleIndex === idx;
                    // Count how many members are holding this role
                    const membersCount = associations.reduce((acc, a) =>
                      acc + a.members.filter(m => m.role === role).length, 0
                    );

                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-2 transition-colors"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingRoleValue}
                              onChange={(e) => setEditingRoleValue(e.target.value)}
                              className="flex-1 px-2.5 py-1 bg-white border border-emerald-500 rounded-lg text-xs focus:outline-none font-medium"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditCustomRole(role, editingRoleValue);
                                if (e.key === "Escape") setEditingRoleIndex(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleEditCustomRole(role, editingRoleValue)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                              title="Lưu thay đổi"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRoleIndex(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Hủy sửa"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-800 text-xs truncate">
                                {role}
                              </span>
                              {membersCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-xs bg-slate-200 text-slate-700 font-medium shrink-0">
                                  {membersCount} người giữ
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoleIndex(idx);
                                  setEditingRoleValue(role);
                                }}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Sửa tên chức danh"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRoleToDelete(role)}
                                className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Xóa chức danh này"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 px-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0 text-xs">
              <span className="text-slate-600 text-xs">
                Tổng cộng: <strong>{customRoles.length}</strong> chức danh khả dụng
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowRoleManagerModal(false);
                  setEditingRoleIndex(null);
                  setNewRoleInput("");
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Xong & Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Roles Modal */}
      <ConfirmModal
        isOpen={confirmResetRoles}
        onClose={() => setConfirmResetRoles(false)}
        onConfirm={() => {
          setCustomRoles(DEFAULT_ROLES);
          try {
            localStorage.setItem("kp3_association_roles", JSON.stringify(DEFAULT_ROLES));
          } catch {}
          setConfirmResetRoles(false);
          showToast("Đã khôi phục danh mục chức danh mặc định!", "success");
        }}
        title="Khôi phục danh mục chức danh?"
        description="Toàn bộ danh mục chức danh sẽ được đặt lại về bộ chuẩn mặc định của Khu phố 3."
        confirmLabel="Khôi phục mặc định"
        variant="warning"
      />

      {/* Confirm Delete Custom Role Modal */}
      <ConfirmModal
        isOpen={Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={() => {
          if (roleToDelete) {
            handleDeleteCustomRole(roleToDelete);
            setRoleToDelete(null);
          }
        }}
        title="Xác nhận xóa chức danh"
        description={
          roleToDelete
            ? `Bạn có chắc chắn muốn xóa chức danh "${roleToDelete}" khỏi danh mục?`
            : ""
        }
        confirmLabel="Xác nhận xóa"
        variant="danger"
      />
    </div>
  );
}
