import React, { useState, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  User,
  Users,
  MapPin,
  CalendarCheck,
  Flame,
  ArrowRight,
  Sparkles,
  Printer,
  X,
  Edit2,
  Trash2,
  UploadCloud,
  FileText,
  BadgeAlert,
  SlidersHorizontal,
  LayoutGrid,
  ListFilter,
  Layers,
  Phone,
  Paperclip,
  Download,
  Eye,
  Image as ImageIcon,
  Building2,
  ShieldCheck,
  ExternalLink,
  Bell,
  BellRing,
  Repeat,
  Send,
  Check,
  RotateCcw,
  FileCheck,
  CalendarRange,
  Megaphone,
  CheckCheck,
  Building
} from "lucide-react";
import { TaskItem, ScheduleEvent, TaskAttachment, RecurringReminder } from "../types";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { StatCard } from "./common/StatCard";
import { PageHeader } from "./common/PageHeader";
import { formatVNNumber } from "../utils/numberFormat";
import { getStoredAssociations } from "../data/associationsData";
import { Association, AssociationMember } from "../types";

// Default seed data for Community Tasks
export const INITIAL_TASKS: TaskItem[] = [
  {
    id: "TASK-001",
    title: "Tổ chức chiến dịch 'Chủ Nhật Xanh' dọn dẹp hẻm 124 đường KV AP12",
    description: "Vận động 100% hộ dân tại Tổ 12 tham gia phát quang bụi rậm, khơi thông cống rãnh chống ngập và dịch sốt xuất huyết.",
    unit: "Tổ trưởng dân phố",
    associationId: "ASC_TOTRUONG",
    assignee: {
      name: "Bà Lê Thị Mai",
      role: "Tổ trưởng Tổ 12",
      unit: "Tổ trưởng dân phố",
      phone: "0908 123 456"
    },
    creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
    priority: "Cao",
    status: "Đang thực hiện",
    progressPercent: 65,
    startDate: "2026-10-10",
    deadline: "2026-10-15",
    notes: "Đã mượn được xe thu gom rác của Đô thị Phường An Phú.",
    attachments: [
      {
        id: "ATT-SEED-01",
        name: "Ke_hoach_Chu_nhat_xanh_KP3.pdf",
        size: "345 KB",
        type: "pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        uploadedAt: "2026-10-10T08:00:00Z"
      },
      {
        id: "ATT-SEED-02",
        name: "Phan_cong_luc_luong_don_dep.docx",
        size: "128 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-10T08:30:00Z"
      }
    ]
  },
  {
    id: "TASK-002",
    title: "Kiểm tra rà soát PCCC tại 14 nhà trọ và cơ sở kinh doanh phế liệu",
    description: "Phối hợp Công an phường kiểm tra lối thoát nạn thứ 2, bình chữa cháy mini tại dãy nhà trọ trên đường X1.",
    unit: "Tổ ANTT cơ sở",
    associationId: "ASC_ANTT",
    assignee: {
      name: "Phạm Minh Tuấn",
      role: "Tổ trưởng ANTT",
      unit: "Tổ ANTT cơ sở",
      phone: "0918334455"
    },
    creator: "Trần Quốc Tuấn (Trưởng ban ĐHKP)",
    priority: "Khẩn cấp",
    status: "Chờ nghiệm thu",
    progressPercent: 90,
    startDate: "2026-10-08",
    deadline: "2026-10-14",
    notes: "Đã kiểm tra 12/14 cơ sở, lập biên bản nhắc nhở 2 cơ sở bổ sung bình bọt ABC.",
    attachments: [
      {
        id: "ATT-SEED-03",
        name: "Bien_ban_kiem_tra_PCCC_nha_tro.docx",
        size: "186 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-08T09:15:00Z"
      },
      {
        id: "ATT-SEED-04",
        name: "Hien_truong_loi_thoat_nan_co_so.jpg",
        size: "1.2 MB",
        type: "image",
        url: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?w=800",
        uploadedAt: "2026-10-08T10:00:00Z"
      }
    ]
  },
  {
    id: "TASK-003",
    title: "Cập nhật dữ liệu CCCD và mã định danh VNeID mức 2 cho 18 công dân tạm trú",
    description: "Hỗ trợ người lao động thuê trọ tại TDP 15 hoàn tất xác thực sinh trắc học và khai báo cư trú.",
    unit: "Tổ dân phố 15",
    assignee: {
      name: "Ông Hoàng Văn Thái",
      role: "Tổ trưởng Tổ 15",
      unit: "Tổ dân phố 15",
      phone: "0977 456 789"
    },
    creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
    priority: "Trung bình",
    status: "Đang thực hiện",
    progressPercent: 40,
    startDate: "2026-10-11",
    deadline: "2026-10-18",
    notes: "Đang liên hệ đại diện chủ nhà trọ lập danh sách."
  },
  {
    id: "TASK-004",
    title: "Thu nộp Quỹ Vì người nghèo & Quỹ Khuyến học năm 2026 tại TDP 11",
    description: "Phát hành phiếu thu điện tử có VietQR đến từng hộ gia đình, công khai danh sách ủng hộ trên cổng khu phố.",
    unit: "Tổ dân phố 11",
    assignee: {
      name: "Ông Nguyễn Văn Hùng",
      role: "Tổ trưởng TDP 11",
      unit: "Tổ dân phố 11",
      phone: "0912 345 678"
    },
    creator: "Trần Quốc Tuấn (Trưởng ban ĐHKP)",
    priority: "Cao",
    status: "Chờ xử lý",
    progressPercent: 15,
    startDate: "2026-10-12",
    deadline: "2026-10-25",
    notes: "Đã nhận mã QR động theo từng hộ gia đình."
  },
  {
    id: "TASK-005",
    title: "Sửa chữa 2 bóng đèn chiếu sáng năng lượng mặt trời hẻm KV AP29",
    description: "Thay pin lưu trữ cho đèn chiếu sáng công cộng do bà con TDP 14 phản ánh chập chờn.",
    unit: "Tổ dân phố 14",
    assignee: {
      name: "Bà Phạm Thị Lan",
      role: "Tổ trưởng TDP 14",
      unit: "Tổ dân phố 14",
      phone: "0988 654 321"
    },
    creator: "Trần Quốc Tuấn (Trưởng ban ĐHKP)",
    priority: "Trung bình",
    status: "Hoàn thành",
    progressPercent: 100,
    startDate: "2026-10-05",
    deadline: "2026-10-10",
    completedAt: "2026-10-09",
    notes: "Đã bàn giao nghiệm thu đưa vào chiếu sáng an toàn."
  },
  {
    id: "TASK-006",
    title: "Tổ chức thăm hỏi, tặng quà cho 3 Mẹ Việt Nam Anh Hùng & Gia đình chính sách",
    description: "Nhân dịp kỷ niệm ngày truyền thống, trao quà và kiểm tra điều kiện sinh hoạt gia đình có công.",
    unit: "Hội Phụ nữ",
    assignee: {
      name: "Bà Nguyễn Thu Hà",
      role: "Chi hội trưởng Phụ nữ KP3",
      unit: "Hội Phụ nữ",
      phone: "0934 567 890"
    },
    creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
    priority: "Cao",
    status: "Hoàn thành",
    progressPercent: 100,
    startDate: "2026-10-01",
    deadline: "2026-10-05",
    completedAt: "2026-10-04",
    notes: "Đã trao 3 phần quà trị giá 3.000.000đ từ Quỹ Đền ơn đáp nghĩa."
  }
];

// Default seed data for Community Schedules
export const INITIAL_SCHEDULES: ScheduleEvent[] = [
  {
    id: "SCH-001",
    title: "Sinh hoạt Chi bộ định kỳ tháng 10/2026",
    type: "Họp Chi bộ",
    date: "2026-10-03",
    time: "19:00 - 21:00",
    location: "Văn phòng Ban Điều hành KP3 (Số 45, ĐT.743B)",
    host: "Đ/c Nguyễn Văn Hùng - Bí thư Chi bộ",
    attendees: "Toàn thể 42 Đảng viên Chi bộ KP3",
    status: "Đã kết thúc",
    description: "Đánh giá kết quả công tác tư tưởng, lãnh đạo phát triển kinh tế - xã hội, giữ gìn ANTT cơ sở tháng 9. Thảo luận và thông qua Nghị quyết lãnh đạo tháng 10/2026, trọng tâm thí điểm Chuyển đổi số & Cổng Khu phố thông minh.",
    content: "Đánh giá kết quả công tác tư tưởng, lãnh đạo phát triển kinh tế - xã hội, giữ gìn ANTT cơ sở tháng 9. Thảo luận và thông qua Nghị quyết lãnh đạo tháng 10/2026, trọng tâm thí điểm Chuyển đổi số & Cổng Khu phố thông minh.",
    notes: "Đánh giá công tác tháng 9 và triển khai mô hình Khu phố thông minh số hoá.",
    attachments: [
      {
        id: "ATT-SCH-01",
        name: "Du_thao_Nghi_quyet_Chi_bo_thang_10.docx",
        size: "245 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-02T15:00:00Z"
      }
    ]
  },
  {
    id: "SCH-002",
    title: "Họp giao ban Tổ trưởng 5 Tổ dân phố (TDP 11 - 15)",
    type: "Họp Tổ Dân Phố",
    date: "2026-10-14",
    time: "08:30 - 10:30",
    location: "Hội trường Khu phố 3",
    host: "Ông Trần Quốc Tuấn - Trưởng ban Điều hành KP3",
    attendees: "Tổ trưởng & Tổ phó 5 TDP, Đại diện CSKV",
    status: "Sắp diễn ra",
    description: "Rà soát tiến độ thu các loại Quỹ công ích; triển khai đợt cao điểm tuyên truyền kiểm tra an toàn PCCC tại các khu nhà trọ, cơ sở sản xuất kinh doanh có nguy cơ cháy nổ cao.",
    content: "Rà soát tiến độ thu các loại Quỹ công ích; triển khai đợt cao điểm tuyên truyền kiểm tra an toàn PCCC tại các khu nhà trọ, cơ sở sản xuất kinh doanh có nguy cơ cháy nổ cao.",
    notes: "Rà soát tiến độ thu Quỹ an sinh và triển khai kiểm tra PCCC nhà trọ.",
    attachments: [
      {
        id: "ATT-SCH-02",
        name: "Ke_hoach_PCCC_TDP11_15.pdf",
        size: "480 KB",
        type: "pdf",
        url: "#",
        uploadedAt: "2026-10-13T08:00:00Z"
      }
    ]
  },
  {
    id: "SCH-003",
    title: "Tuần tra liên tịch đảm bảo ANTT & trật tự đô thị ban đêm",
    type: "Tuần tra ANTT",
    date: "2026-10-15",
    time: "22:00 - 01:30",
    location: "Các tuyến hẻm trọng điểm ĐT.743B, KV AP12, giáp ranh Dĩ An",
    host: "Đ/c Trung úy CSKV & Tổ trưởng Tổ ANTT cơ sở",
    attendees: "Lực lượng ANTT cơ sở (8 đ/c), Dân quân tự vệ (4 đ/c)",
    status: "Sắp diễn ra",
    description: "Kiểm tra tạm trú, nắm tình hình cư trú tại các dãy nhà trọ công nhân; tuần tra phòng ngừa trộm cắp, đua xe trái phép và tụ tập gây rối trật tự công cộng.",
    notes: "Tập trung kiểm tra các tụ điểm thanh thiếu niên tụ tập đêm khuya."
  },
  {
    id: "SCH-004",
    title: "Ra quân ngày 'Chủ Nhật Xanh' dọn vệ sinh tuyến hẻm kiểu mẫu TDP 12",
    type: "Chủ Nhật Xanh",
    date: "2026-10-18",
    time: "06:30 - 09:30",
    location: "Điểm tập kết: Đầu hẻm 124 đường KV AP12",
    host: "Đ/c Bí thư Chi đoàn TN & Tổ trưởng TDP 12",
    attendees: "Đoàn viên thanh niên, Hội viên Phụ nữ, Cư dân TDP 12",
    status: "Sắp diễn ra",
    description: "Phát động toàn dân ra quân quét dọn, bóc xóa quảng cáo sai quy định, khơi thông dòng chảy thoát nước chống ngập cục bộ và phòng trừ muỗi sốt xuất huyết.",
    notes: "Chuẩn bị bao đựng rác, chổi cào và xe gom rác chuyên dụng.",
    attachments: [
      {
        id: "ATT-SCH-04",
        name: "So_do_tuyen_hem_don_ve_sinh.jpg",
        size: "820 KB",
        type: "image",
        url: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800",
        uploadedAt: "2026-10-16T14:30:00Z"
      }
    ]
  },
  {
    id: "SCH-005",
    title: "Tiếp công dân và giải quyết thủ tục hành chính tại cơ sở",
    type: "Tiếp công dân",
    date: "2026-10-20",
    time: "08:00 - 11:30",
    location: "Bàn tiếp dân điện tử - Văn phòng KP3",
    host: "Trưởng ban Điều hành & Cán bộ tư pháp - hộ tịch Phường An Phú",
    attendees: "Công dân trên địa bàn KP3 có kiến nghị, phản ánh",
    status: "Sắp diễn ra",
    description: "Lắng nghe tâm tư, nguyện vọng của nhân dân; giải đáp các thủ tục hành chính liên quan đến đất đai, cư trú, cấp đổi CCCD và hướng dẫn nộp hồ sơ Dịch vụ công qua VNeID.",
    notes: "Hướng dẫn thực hiện dịch vụ công trực tuyến và ký xác nhận đơn thư."
  }
];

// Helper: Format file size
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// Helper: Detect file type
const detectFileType = (file: File): TaskAttachment["type"] => {
  const nameLower = file.name.toLowerCase();
  if (
    file.type.startsWith("image/") ||
    nameLower.endsWith(".png") ||
    nameLower.endsWith(".jpg") ||
    nameLower.endsWith(".jpeg") ||
    nameLower.endsWith(".webp")
  ) {
    return "image";
  } else if (nameLower.endsWith(".pdf") || file.type.includes("pdf")) {
    return "pdf";
  } else if (
    nameLower.endsWith(".docx") ||
    nameLower.endsWith(".doc") ||
    file.type.includes("word") ||
    file.type.includes("officedocument")
  ) {
    return "word";
  }
  return "other";
};

// Helper: Format Frequency Text in Vietnamese
export const formatFrequencyText = (r: RecurringReminder) => {
  const { frequency, frequencyDetail } = r;
  const time = frequencyDetail.time || "08:00";
  switch (frequency) {
    case "daily":
      return `Hàng ngày lúc ${time}`;
    case "weekly": {
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dName = days[frequencyDetail.dayOfWeek ?? 6] || "Thứ Bảy";
      return `Cứ ${dName} hàng tuần (${time})`;
    }
    case "monthly": {
      const day = frequencyDetail.dayOfMonth ?? 15;
      return `Cứ ngày ${day} hàng tháng (${time})`;
    }
    case "quarterly": {
      const day = frequencyDetail.dayOfMonth ?? 25;
      return `Hàng quý (Ngày ${day} tháng cuối quý - ${time})`;
    }
    case "yearly": {
      const day = frequencyDetail.dayOfMonth ?? 15;
      const month = frequencyDetail.monthOfYear ?? 12;
      return `Hàng năm (Ngày ${day}/${month} - ${time})`;
    }
    default:
      return "Định kỳ";
  }
};

// Helper: Badge for frequency
export const getFrequencyBadge = (f: RecurringReminder["frequency"]) => {
  switch (f) {
    case "daily":
      return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">Hàng ngày</span>;
    case "weekly":
      return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">Hàng tuần</span>;
    case "monthly":
      return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded text-[11px] font-bold">Hàng tháng</span>;
    case "quarterly":
      return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded text-[11px] font-bold">Hàng quý</span>;
    case "yearly":
      return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[11px] font-bold">Hàng năm</span>;
    default:
      return <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-medium">{f}</span>;
  }
};

// Helper: Badge for reminder status
export const getReminderStatusBadge = (s: RecurringReminder["status"]) => {
  switch (s) {
    case "Hôm nay đến hạn":
      return <span className="bg-rose-100 text-rose-700 border border-rose-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold animate-pulse flex items-center gap-1">🚨 Hôm nay đến hạn</span>;
    case "Sắp đến hạn":
      return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">⏳ Sắp đến hạn</span>;
    case "Đã nộp kỳ này":
      return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">✅ Đã nộp kỳ này</span>;
    case "Quá hạn":
      return <span className="bg-red-200 text-red-900 border border-red-400 px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1">⚠️ Quá hạn</span>;
    default:
      return <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2.5 py-0.5 rounded-full text-[11px] font-medium">Đúng hạn</span>;
  }
};

// Default seed data for Recurring Reminders & Reporting Schedules
export const INITIAL_REMINDERS: RecurringReminder[] = [
  {
    id: "REM-001",
    title: "Báo cáo tình hình thực hiện nhiệm vụ & trật tự cơ sở tuần",
    description: "Tổng hợp tiến độ xử lý phản ánh 1022, thu các loại quỹ công ích, an toàn PCCC nhà trọ và công tác tuần tra bảo đảm ANTT trong tuần để nộp lên Thường trực UBND Phường An Phú.",
    frequency: "weekly",
    frequencyDetail: {
      time: "16:30",
      dayOfWeek: 6 // Thứ Bảy hàng tuần
    },
    recipientOrg: "Ủy ban Nhân dân (UBND) Phường An Phú",
    responsibleUnit: "Ban điều hành khu phố",
    responsiblePerson: {
      name: "Nguyễn Trung Huy",
      role: "Trưởng Ban điều hành",
      phone: "0909123888"
    },
    notifyChannels: ["in_app", "banner", "zalo_sms"],
    isActive: true,
    nextDueDate: "2026-11-14", // Thứ Bảy tuần này
    status: "Sắp đến hạn",
    attachments: [
      {
        id: "ATT-REM-01",
        name: "Mau_Bao_cao_tuan_UBND_Phuong_AP.docx",
        size: "142 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-01T08:00:00Z"
      }
    ],
    autoCreateTask: true,
    createdAt: "2026-10-01"
  },
  {
    id: "REM-002",
    title: "Báo cáo công tác tư tưởng & xây dựng tổ chức Đảng định kỳ tháng",
    description: "Báo cáo tình hình tư tưởng cán bộ, Đảng viên, kết quả sinh hoạt Chi bộ định kỳ ngày 3, tiến độ bồi dưỡng quần chúng ưu tú tạo nguồn phát triển Đảng viên mới nộp Ban Xây dựng Đảng.",
    frequency: "monthly",
    frequencyDetail: {
      time: "09:00",
      dayOfMonth: 15 // Ngày 15 hàng tháng
    },
    recipientOrg: "Ban Xây dựng Đảng - Đảng ủy Phường An Phú",
    responsibleUnit: "Chi bộ Đảng",
    responsiblePerson: {
      name: "Nguyễn Văn Hùng",
      role: "Bí thư Chi bộ KP3",
      phone: "0903829112"
    },
    notifyChannels: ["in_app", "banner"],
    isActive: true,
    nextDueDate: "2026-11-15", // Ngày 15 hàng tháng
    status: "Hôm nay đến hạn",
    attachments: [
      {
        id: "ATT-REM-02",
        name: "De_cuong_Bao_cao_Xay_dung_Dang_Dinh_ky.docx",
        size: "215 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-01T08:00:00Z"
      }
    ],
    autoCreateTask: true,
    createdAt: "2026-10-01"
  },
  {
    id: "REM-003",
    title: "Báo cáo giám sát kỷ luật Đảng & phòng chống tiêu cực định kỳ",
    description: "Rà soát việc chấp hành Quy định những điều Đảng viên không được làm, kết quả giải quyết đơn thư khiếu nại tố cáo và giám sát chuyên đề nộp Ủy ban Kiểm tra Đảng ủy Phường.",
    frequency: "monthly",
    frequencyDetail: {
      time: "10:00",
      dayOfMonth: 20 // Ngày 20 hàng tháng
    },
    recipientOrg: "Ủy ban Kiểm tra (UBKT) Đảng ủy Phường An Phú",
    responsibleUnit: "Chi bộ Đảng",
    responsiblePerson: {
      name: "Lê Văn Sơn",
      role: "Phó Ban điều hành - Phụ trách Kiểm tra",
      phone: "0944112233"
    },
    notifyChannels: ["in_app", "banner"],
    isActive: true,
    nextDueDate: "2026-11-20",
    status: "Đúng hạn",
    attachments: [
      {
        id: "ATT-REM-03",
        name: "Mau_Bao_cao_UBKT_giam_sat_co_so.pdf",
        size: "310 KB",
        type: "pdf",
        url: "#",
        uploadedAt: "2026-10-01T08:00:00Z"
      }
    ],
    autoCreateTask: false,
    createdAt: "2026-10-01"
  },
  {
    id: "REM-004",
    title: "Điểm danh & Giao ban nhanh tình hình ANTT - PCCC cuối ngày",
    description: "Cập nhật quân số trực tổ ANTT cơ sở, tình hình trật tự giao thông - đô thị tại trục ĐT.743B và hẻm nhánh, các trường hợp tạm trú mới phát sinh trước 17:00 hàng ngày.",
    frequency: "daily",
    frequencyDetail: {
      time: "17:00"
    },
    recipientOrg: "Công an Phường An Phú & Ban Điều hành KP3",
    responsibleUnit: "Tổ Bảo vệ ANTT",
    responsiblePerson: {
      name: "Đại úy CSKV & Tổ trưởng ANTT",
      role: "Lực lượng bảo đảm ANTT cơ sở",
      phone: "0908 999 888"
    },
    notifyChannels: ["in_app", "zalo_sms"],
    isActive: true,
    nextDueDate: "2026-11-10",
    status: "Hôm nay đến hạn",
    autoCreateTask: false,
    createdAt: "2026-10-01"
  },
  {
    id: "REM-005",
    title: "Báo cáo tổng kết công tác năm & Đăng ký thi đua cơ sở",
    description: "Tổng hợp toàn diện kết quả thực hiện các chỉ tiêu kinh tế - xã hội, ANTT, an sinh xã hội, xây dựng đời sống văn hóa toàn Khu phố 3 trong năm để báo cáo Thường trực Đảng ủy - HĐND - UBND Phường.",
    frequency: "yearly",
    frequencyDetail: {
      time: "08:30",
      dayOfMonth: 15,
      monthOfYear: 12 // Ngày 15/12 hàng năm
    },
    recipientOrg: "Thường trực Đảng ủy - UBND Phường An Phú",
    responsibleUnit: "Ban điều hành khu phố",
    responsiblePerson: {
      name: "Trần Quốc Tuấn",
      role: "Trưởng ban ĐHKP",
      phone: "0908 123 456"
    },
    notifyChannels: ["in_app", "banner", "email"],
    isActive: true,
    nextDueDate: "2026-12-15",
    status: "Đúng hạn",
    attachments: [
      {
        id: "ATT-REM-05",
        name: "De_cuong_Tong_ket_Nam_KP3.docx",
        size: "385 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-01T08:00:00Z"
      }
    ],
    autoCreateTask: true,
    createdAt: "2026-10-01"
  }
];

export default function TaskAndSchedule() {
  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "schedules" | "reminders">("tasks");
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_community_tasks");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TASKS;
  });

  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_community_schedules");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SCHEDULES;
  });

  // Task filter & view controls
  const [taskViewMode, setTaskViewMode] = useState<"kanban" | "list">("kanban");
  const [taskUnitFilter, setTaskUnitFilter] = useState<string>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("");

  // Schedule filter & controls
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<string>("all");
  const [scheduleMonthFilter, setScheduleMonthFilter] = useState<string>("2026-10");

  // Modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Recurring Reminders State
  const [recurringReminders, setRecurringReminders] = useState<RecurringReminder[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_recurring_reminders");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_REMINDERS;
  });

  const saveReminders = (updated: RecurringReminder[]) => {
    setRecurringReminders(updated);
    try {
      localStorage.setItem("kp3_recurring_reminders", JSON.stringify(updated));
    } catch {}
  };

  // Reminders filter & control states
  const [reminderFrequencyFilter, setReminderFrequencyFilter] = useState<string>("all");
  const [reminderRecipientFilter, setReminderRecipientFilter] = useState<string>("all");
  const [reminderSearchQuery, setReminderSearchQuery] = useState<string>("all");

  // Reminders Modals & Toast
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<RecurringReminder | null>(null);
  const [submittingReminder, setSubmittingReminder] = useState<RecurringReminder | null>(null);
  const [reminderToast, setReminderToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  // Form states for creating a new recurring reminder
  const [newRemTitle, setNewRemTitle] = useState("");
  const [newRemDesc, setNewRemDesc] = useState("");
  const [newRemFrequency, setNewRemFrequency] = useState<RecurringReminder["frequency"]>("weekly");
  const [newRemTime, setNewRemTime] = useState("16:30");
  const [newRemDayOfWeek, setNewRemDayOfWeek] = useState<number>(6); // 6 = Saturday (Thứ Bảy)
  const [newRemDayOfMonth, setNewRemDayOfMonth] = useState<number>(15); // Day 15
  const [newRemMonthOfYear, setNewRemMonthOfYear] = useState<number>(12); // Month 12
  const [newRemRecipient, setNewRemRecipient] = useState<string>("Ủy ban Nhân dân (UBND) Phường An Phú");
  const [isCustomRecipient, setIsCustomRecipient] = useState<boolean>(false);
  const [customRecipient, setCustomRecipient] = useState<string>("");

  // Responsible unit & person for new reminder
  const [newRemAssociationId, setNewRemAssociationId] = useState<string>("ASC_BDH");
  const [newRemUnit, setNewRemUnit] = useState<string>("Ban điều hành khu phố");
  const [newRemPersonName, setNewRemPersonName] = useState<string>("Nguyễn Trung Huy");
  const [newRemPersonRole, setNewRemPersonRole] = useState<string>("Trưởng Ban điều hành");
  const [newRemPersonPhone, setNewRemPersonPhone] = useState<string>("0909123888");
  const [isCustomRemPerson, setIsCustomRemPerson] = useState<boolean>(false);

  // Channels, auto-create task & attachments
  const [newRemChannels, setNewRemChannels] = useState<("in_app" | "banner" | "zalo_sms" | "email")[]>(["in_app", "banner", "zalo_sms"]);
  const [newRemAutoCreateTask, setNewRemAutoCreateTask] = useState<boolean>(true);
  const [newRemAttachments, setNewRemAttachments] = useState<TaskAttachment[]>([]);
  const remTemplateFileInputRef = useRef<HTMLInputElement>(null);

  // Submit report modal states
  const [submitReportNotes, setSubmitReportNotes] = useState<string>("");
  const [submitReportFiles, setSubmitReportFiles] = useState<TaskAttachment[]>([]);
  const submitFileInputRef = useRef<HTMLInputElement>(null);

  // New task form state
  const [associationsList] = useState<Association[]>(() => getStoredAssociations());
  const initialAssoc = associationsList[0];
  const initialLeader = initialAssoc?.members[0];

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssociationId, setNewTaskAssociationId] = useState<string>(initialAssoc?.id || "ASC_BDH");
  const [newTaskUnit, setNewTaskUnit] = useState<string>(initialAssoc?.name || "Ban điều hành khu phố");
  const [newTaskAssigneeName, setNewTaskAssigneeName] = useState(initialLeader?.fullName || "Nguyễn Trung Huy");
  const [newTaskAssigneeRole, setNewTaskAssigneeRole] = useState(initialLeader?.role || "Trưởng Ban điều hành");
  const [newTaskAssigneePhone, setNewTaskAssigneePhone] = useState(initialLeader?.phone || "0909123888");
  const [isCustomAssignee, setIsCustomAssignee] = useState<boolean>(false);
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem["priority"]>("Cao");
  const [newTaskDeadline, setNewTaskDeadline] = useState("2026-10-20");
  const [newTaskAttachments, setNewTaskAttachments] = useState<TaskAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic members of the currently selected organization
  const currentAssocMembers = useMemo(() => {
    const found = associationsList.find(a => a.id === newTaskAssociationId || a.name === newTaskUnit);
    return found ? found.members : [];
  }, [associationsList, newTaskAssociationId, newTaskUnit]);

  // Handle unit selection change
  const handleUnitChange = (selectedId: string) => {
    const assoc = associationsList.find(a => a.id === selectedId || a.name === selectedId);
    if (assoc) {
      setNewTaskAssociationId(assoc.id);
      setNewTaskUnit(assoc.name);

      if (assoc.members && assoc.members.length > 0) {
        const leader = assoc.members.find(m => m.fullName === assoc.leaderName) || assoc.members[0];
        setNewTaskAssigneeName(leader.fullName);
        setNewTaskAssigneeRole(leader.role);
        setNewTaskAssigneePhone(leader.phone || "");
        setIsCustomAssignee(false);
      } else {
        setNewTaskAssigneeName(assoc.leaderName || "");
        setNewTaskAssigneeRole("Đại diện chi hội");
        setNewTaskAssigneePhone("");
        setIsCustomAssignee(true);
      }
    } else {
      setNewTaskUnit(selectedId);
      setIsCustomAssignee(true);
    }
  };

  // Handle member selection change
  const handleMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomAssignee(true);
      setNewTaskAssigneeName("");
      setNewTaskAssigneeRole("Cán bộ phụ trách");
      setNewTaskAssigneePhone("");
      return;
    }

    setIsCustomAssignee(false);
    const found = currentAssocMembers.find(m => m.fullName === val || m.id === val);
    if (found) {
      setNewTaskAssigneeName(found.fullName);
      setNewTaskAssigneeRole(found.role);
      setNewTaskAssigneePhone(found.phone || "");
    }
  };

  // Handle attachment file uploads (Image, Word docx, PDF)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`Tệp "${file.name}" vượt quá dung lượng tối đa 20MB!`);
        return;
      }

      let type: TaskAttachment["type"] = "other";
      const nameLower = file.name.toLowerCase();
      if (
        file.type.startsWith("image/") ||
        nameLower.endsWith(".png") ||
        nameLower.endsWith(".jpg") ||
        nameLower.endsWith(".jpeg") ||
        nameLower.endsWith(".webp")
      ) {
        type = "image";
      } else if (nameLower.endsWith(".pdf") || file.type.includes("pdf")) {
        type = "pdf";
      } else if (
        nameLower.endsWith(".docx") ||
        nameLower.endsWith(".doc") ||
        file.type.includes("word") ||
        file.type.includes("officedocument")
      ) {
        type = "word";
      }

      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
      };

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const base64Url = loadEvent.target?.result as string;
        const newAtt: TaskAttachment = {
          id: "ATT-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          name: file.name,
          size: formatSize(file.size),
          type,
          url: base64Url,
          uploadedAt: new Date().toISOString()
        };
        setNewTaskAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = (attId: string) => {
    setNewTaskAttachments(prev => prev.filter(a => a.id !== attId));
  };

  // Add attachments to existing task in Detail Modal
  const handleDetailFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: TaskAttachment[] = [];
    let count = 0;

    Array.from(files).forEach((file: File) => {
      let type: TaskAttachment["type"] = "other";
      const nameLower = file.name.toLowerCase();
      if (
        file.type.startsWith("image/") ||
        nameLower.endsWith(".png") ||
        nameLower.endsWith(".jpg") ||
        nameLower.endsWith(".jpeg") ||
        nameLower.endsWith(".webp")
      ) {
        type = "image";
      } else if (nameLower.endsWith(".pdf") || file.type.includes("pdf")) {
        type = "pdf";
      } else if (
        nameLower.endsWith(".docx") ||
        nameLower.endsWith(".doc") ||
        file.type.includes("word") ||
        file.type.includes("officedocument")
      ) {
        type = "word";
      }

      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
      };

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        newItems.push({
          id: "ATT-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          name: file.name,
          size: formatSize(file.size),
          type,
          url: loadEvent.target?.result as string,
          uploadedAt: new Date().toISOString()
        });
        count++;
        if (count === files.length) {
          const updatedAttachments = [...(selectedTask.attachments || []), ...newItems];
          const updatedTask = { ...selectedTask, attachments: updatedAttachments };
          const updatedTasks = tasks.map(t => t.id === selectedTask.id ? updatedTask : t);
          saveTasks(updatedTasks);
          setSelectedTask(updatedTask);
        }
      };
      reader.readAsDataURL(file);
    });

    if (detailFileInputRef.current) detailFileInputRef.current.value = "";
  };

  const handleDeleteDetailAttachment = (attId: string) => {
    if (!selectedTask) return;
    const updatedAttachments = (selectedTask.attachments || []).filter(a => a.id !== attId);
    const updatedTask = { ...selectedTask, attachments: updatedAttachments };
    const updatedTasks = tasks.map(t => t.id === selectedTask.id ? updatedTask : t);
    saveTasks(updatedTasks);
    setSelectedTask(updatedTask);
  };

  // New schedule form state
  const [newSchTitle, setNewSchTitle] = useState("");
  const [newSchType, setNewSchType] = useState<string>("Họp Tổ Dân Phố");
  const [isCustomSchType, setIsCustomSchType] = useState(false);
  const [customSchType, setCustomSchType] = useState("");
  const [newSchDate, setNewSchDate] = useState("2026-10-22");
  const [newSchTime, setNewSchTime] = useState("08:30 - 10:30");
  const [newSchLocation, setNewSchLocation] = useState("Văn phòng Ban Điều hành KP3");
  const [newSchHost, setNewSchHost] = useState("Ông Trần Quốc Tuấn - Trưởng ban ĐHKP");
  const [isCustomSchHost, setIsCustomSchHost] = useState(false);
  const [customSchHost, setCustomSchHost] = useState("");
  const [newSchAttendees, setNewSchAttendees] = useState("Đại diện các Tổ dân phố");
  const [newSchDesc, setNewSchDesc] = useState("");
  const [newSchNotes, setNewSchNotes] = useState("");
  const [newSchAttachments, setNewSchAttachments] = useState<TaskAttachment[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEvent | null>(null);

  const schFileInputRef = useRef<HTMLInputElement>(null);
  const detailSchFileInputRef = useRef<HTMLInputElement>(null);

  // Danh sách chủ trì: Lãnh đạo cấp trên, Cấp ủy & Ban Điều hành, Trưởng / Phó 23 Chi hội
  const scheduleHostGroups = useMemo(() => {
    const superiors = [
      "Đ/c Lãnh đạo Đảng ủy - UBND Phường An Phú",
      "Đ/c Trưởng / Phó Công an Phường An Phú",
      "Đ/c Chỉ huy Ban Chỉ huy Quân sự Phường An Phú",
      "Admin Quản trị hệ thống KP3"
    ];

    const executive = [
      "Đ/c Nguyễn Văn Hùng - Bí thư Chi bộ KP3",
      "Ông Nguyễn Trung Huy - Trưởng Ban điều hành KP3",
      "Ông Lê Văn Sơn - Phó Trưởng Ban điều hành KP3",
      "Bà Lê Thị Mai - Phó Ban điều hành KP3",
      "Ông Trần Quốc Tuấn - Trưởng ban ĐHKP"
    ];

    const assocLeaders: { label: string; value: string; unit: string }[] = [];
    associationsList.forEach(assoc => {
      (assoc.members || []).forEach(m => {
        const r = (m.role || "").toLowerCase();
        if (
          r.includes("trưởng") ||
          r.includes("phó") ||
          r.includes("bí thư") ||
          r.includes("chủ tịch") ||
          r.includes("chủ nhiệm") ||
          r.includes("đội trưởng") ||
          r.includes("đội phó") ||
          r.includes("tổ trưởng") ||
          r.includes("tổ phó")
        ) {
          const val = `${m.fullName} - ${m.role} (${assoc.name})`;
          assocLeaders.push({
            label: `${m.fullName} • ${m.role} (${assoc.name})`,
            value: val,
            unit: assoc.name
          });
        }
      });
    });

    return { superiors, executive, assocLeaders };
  }, [associationsList]);

  // Save changes to localStorage
  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem("kp3_community_tasks", JSON.stringify(newTasks));
    } catch {}
  };

  const saveSchedules = (newSchedules: ScheduleEvent[]) => {
    setSchedules(newSchedules);
    try {
      localStorage.setItem("kp3_community_schedules", JSON.stringify(newSchedules));
    } catch {}
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchUnit = taskUnitFilter === "all" || t.unit === taskUnitFilter;
      const matchPriority = taskPriorityFilter === "all" || t.priority === taskPriorityFilter;
      const matchSearch =
        taskSearchQuery === "" ||
        t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        t.assignee.name.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(taskSearchQuery.toLowerCase());
      return matchUnit && matchPriority && matchSearch;
    });
  }, [tasks, taskUnitFilter, taskPriorityFilter, taskSearchQuery]);

  // Task KPI calculations
  const taskKpi = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Hoàn thành").length;
    const inProgress = tasks.filter(t => t.status === "Đang thực hiện").length;
    const pendingReview = tasks.filter(t => t.status === "Chờ nghiệm thu").length;
    const urgent = tasks.filter(t => t.priority === "Khẩn cấp" && t.status !== "Hoàn thành").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pendingReview, urgent, completionRate };
  }, [tasks]);

  // Status transitions
  const handleMoveStatus = (taskId: string, nextStatus: TaskItem["status"]) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: nextStatus,
          progressPercent: nextStatus === "Hoàn thành" ? 100 : nextStatus === "Chờ nghiệm thu" ? 90 : t.progressPercent,
          completedAt: nextStatus === "Hoàn thành" ? new Date().toISOString().slice(0, 10) : undefined
        };
      }
      return t;
    });
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated.find(t => t.id === taskId) || null);
    }
  };

  // Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `TASK-${String(tasks.length + 1).padStart(3, "0")}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || "Chưa có mô tả chi tiết.",
      unit: newTaskUnit,
      associationId: newTaskAssociationId,
      assignee: {
        name: newTaskAssigneeName.trim() || "Chưa chỉ định",
        role: newTaskAssigneeRole.trim() || "Thành viên phụ trách",
        unit: newTaskUnit,
        phone: newTaskAssigneePhone.trim() || undefined
      },
      creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
      priority: newTaskPriority,
      status: "Chờ xử lý",
      progressPercent: 0,
      startDate: new Date().toISOString().slice(0, 10),
      deadline: newTaskDeadline,
      attachments: newTaskAttachments.length > 0 ? newTaskAttachments : undefined
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);
    setShowAddTaskModal(false);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskAttachments([]);
  };

  // Schedule file upload
  const handleSchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`Tệp "${file.name}" vượt quá dung lượng tối đa 20MB!`);
        return;
      }

      const type = detectFileType(file);
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const base64Url = loadEvent.target?.result as string;
        const newAtt: TaskAttachment = {
          id: `ATT-SCH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: formatFileSize(file.size),
          type,
          url: base64Url,
          uploadedAt: new Date().toISOString()
        };
        setNewSchAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });

    if (schFileInputRef.current) schFileInputRef.current.value = "";
  };

  const handleRemoveSchAttachment = (attId: string) => {
    setNewSchAttachments(prev => prev.filter(a => a.id !== attId));
  };

  // Add attachment to selected schedule
  const handleDetailSchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSchedule) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: TaskAttachment[] = [];
    let count = 0;

    Array.from(files).forEach((file: File) => {
      const type = detectFileType(file);
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        newItems.push({
          id: `ATT-SCH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: formatFileSize(file.size),
          type,
          url: loadEvent.target?.result as string,
          uploadedAt: new Date().toISOString()
        });
        count++;
        if (count === files.length) {
          const updatedAttachments = [...(selectedSchedule.attachments || []), ...newItems];
          const updatedSchedule = { ...selectedSchedule, attachments: updatedAttachments };
          const updatedSchedules = schedules.map(s => s.id === selectedSchedule.id ? updatedSchedule : s);
          saveSchedules(updatedSchedules);
          setSelectedSchedule(updatedSchedule);
        }
      };
      reader.readAsDataURL(file);
    });

    if (detailSchFileInputRef.current) detailSchFileInputRef.current.value = "";
  };

  const handleRemoveDetailSchAttachment = (attId: string) => {
    if (!selectedSchedule) return;
    const updatedAttachments = (selectedSchedule.attachments || []).filter(a => a.id !== attId);
    const updatedSchedule = { ...selectedSchedule, attachments: updatedAttachments };
    const updatedSchedules = schedules.map(s => s.id === selectedSchedule.id ? updatedSchedule : s);
    saveSchedules(updatedSchedules);
    setSelectedSchedule(updatedSchedule);
  };

  // Update schedule status
  const handleUpdateScheduleStatus = (schId: string, status: ScheduleEvent["status"]) => {
    const updated = schedules.map(s => s.id === schId ? { ...s, status } : s);
    saveSchedules(updated);
    if (selectedSchedule?.id === schId) {
      setSelectedSchedule({ ...selectedSchedule, status });
    }
  };

  // Delete schedule
  const handleDeleteSchedule = (schId: string) => {
    if (confirm("Bạn có chắc muốn xoá sự kiện/lịch họp này?")) {
      const updated = schedules.filter(s => s.id !== schId);
      saveSchedules(updated);
      if (selectedSchedule?.id === schId) setSelectedSchedule(null);
    }
  };

  // Create Schedule
  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchTitle.trim()) return;

    const finalType = isCustomSchType || newSchType === "__CUSTOM__"
      ? (customSchType.trim() || "Sự kiện khác")
      : newSchType;

    const finalHost = isCustomSchHost || newSchHost === "__CUSTOM__"
      ? (customSchHost.trim() || "Chủ trì cuộc họp")
      : newSchHost;

    const newSch: ScheduleEvent = {
      id: `SCH-${String(schedules.length + 1).padStart(3, "0")}`,
      title: newSchTitle.trim(),
      type: finalType,
      date: newSchDate,
      time: newSchTime,
      location: newSchLocation,
      host: finalHost,
      attendees: newSchAttendees,
      status: "Sắp diễn ra",
      description: newSchDesc.trim() || undefined,
      content: newSchDesc.trim() || undefined,
      notes: newSchNotes.trim() || undefined,
      attachments: newSchAttachments.length > 0 ? newSchAttachments : undefined
    };

    const updated = [...schedules, newSch].sort((a, b) => a.date.localeCompare(b.date));
    saveSchedules(updated);
    setShowAddScheduleModal(false);
    setNewSchTitle("");
    setNewSchDesc("");
    setNewSchNotes("");
    setNewSchAttachments([]);
    setIsCustomSchType(false);
    setCustomSchType("");
    setIsCustomSchHost(false);
    setCustomSchHost("");
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    if (confirm("Bạn có chắc muốn xoá nhiệm vụ này?")) {
      const updated = tasks.filter(t => t.id !== id);
      saveTasks(updated);
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };

  // Priority color helper
  const getPriorityBadge = (p: TaskItem["priority"]) => {
    switch (p) {
      case "Khẩn cấp":
        return <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 animate-pulse"><Flame size={12} className="text-rose-600" /> Khẩn cấp</span>;
      case "Cao":
        return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold">Ưu tiên cao</span>;
      case "Trung bình":
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">Bình thường</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px]">Thấp</span>;
    }
  };

  // Status badge helper
  const getStatusBadge = (s: TaskItem["status"]) => {
    switch (s) {
      case "Hoàn thành":
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Đã hoàn thành</span>;
      case "Chờ nghiệm thu":
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"><Clock size={12} /> Chờ nghiệm thu</span>;
      case "Đang thực hiện":
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"><Clock size={12} /> Đang tiến hành</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-medium">Chờ xử lý</span>;
    }
  };

  // Schedule type badge helper
  const getScheduleTypeBadge = (t: ScheduleEvent["type"]) => {
    switch (t) {
      case "Họp Chi bộ":
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[11px] font-bold">Họp Chi bộ</span>;
      case "Họp Tổ Dân Phố":
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded text-[11px] font-bold">Họp TDP</span>;
      case "Tuần tra ANTT":
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">Tuần tra ANTT</span>;
      case "Chủ Nhật Xanh":
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">Chủ Nhật Xanh</span>;
      case "Tiếp công dân":
        return <span className="bg-cyan-100 text-cyan-800 border border-cyan-300 px-2 py-0.5 rounded text-[11px] font-bold">Tiếp công dân</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-medium">{t}</span>;
    }
  };

  const RECIPIENT_ORGS = [
    "Ủy ban Nhân dân (UBND) Phường An Phú",
    "Ban Xây dựng Đảng - Đảng ủy Phường An Phú",
    "Thường trực Đảng ủy Phường An Phú",
    "Ủy ban Kiểm tra (UBKT) Đảng ủy Phường An Phú",
    "Công an Phường An Phú",
    "Ban Chỉ huy Quân sự Phường An Phú",
    "Ủy ban MTTQ Việt Nam Phường An Phú",
    "Ban Điều hành Khu phố 3"
  ];

  // Dynamic members of the currently selected organization for Reminders
  const remAssocMembers = useMemo(() => {
    const found = associationsList.find(a => a.id === newRemAssociationId || a.name === newRemUnit);
    return found ? found.members : [];
  }, [associationsList, newRemAssociationId, newRemUnit]);

  // Handle unit selection change for reminders
  const handleRemUnitChange = (selectedId: string) => {
    const assoc = associationsList.find(a => a.id === selectedId || a.name === selectedId);
    if (assoc) {
      setNewRemAssociationId(assoc.id);
      setNewRemUnit(assoc.name);
      if (assoc.members && assoc.members.length > 0) {
        const leader = assoc.members.find(m => m.fullName === assoc.leaderName) || assoc.members[0];
        setNewRemPersonName(leader.fullName);
        setNewRemPersonRole(leader.role);
        setNewRemPersonPhone(leader.phone || "");
        setIsCustomRemPerson(false);
      } else {
        setNewRemPersonName(assoc.leaderName || "");
        setNewRemPersonRole("Đại diện chi hội");
        setNewRemPersonPhone("");
        setIsCustomRemPerson(true);
      }
    } else {
      setNewRemUnit(selectedId);
      setIsCustomRemPerson(true);
    }
  };

  // Handle member selection change for reminders
  const handleRemMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomRemPerson(true);
      setNewRemPersonName("");
      setNewRemPersonRole("Cán bộ phụ trách");
      setNewRemPersonPhone("");
      return;
    }
    setIsCustomRemPerson(false);
    const found = remAssocMembers.find(m => m.fullName === val || m.id === val);
    if (found) {
      setNewRemPersonName(found.fullName);
      setNewRemPersonRole(found.role);
      setNewRemPersonPhone(found.phone || "");
    }
  };

  // Upload attachment for new reminder template
  const handleRemTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      let type: TaskAttachment["type"] = "other";
      const nameLower = file.name.toLowerCase();
      if (file.type.startsWith("image/") || nameLower.endsWith(".png") || nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) {
        type = "image";
      } else if (nameLower.endsWith(".pdf") || file.type.includes("pdf")) {
        type = "pdf";
      } else if (nameLower.endsWith(".docx") || nameLower.endsWith(".doc") || file.type.includes("word") || file.type.includes("officedocument")) {
        type = "word";
      }
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
      };
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setNewRemAttachments(prev => [
          ...prev,
          {
            id: "ATT-REM-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
            name: file.name,
            size: formatSize(file.size),
            type,
            url: loadEvent.target?.result as string,
            uploadedAt: new Date().toISOString()
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (remTemplateFileInputRef.current) remTemplateFileInputRef.current.value = "";
  };

  // Upload file for report submission
  const handleSubmitReportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      let type: TaskAttachment["type"] = "other";
      const nameLower = file.name.toLowerCase();
      if (file.type.startsWith("image/") || nameLower.endsWith(".png") || nameLower.endsWith(".jpg")) {
        type = "image";
      } else if (nameLower.endsWith(".pdf") || file.type.includes("pdf")) {
        type = "pdf";
      } else if (nameLower.endsWith(".docx") || nameLower.endsWith(".doc") || file.type.includes("word") || file.type.includes("officedocument")) {
        type = "word";
      }
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
      };
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setSubmitReportFiles(prev => [
          ...prev,
          {
            id: "SUB-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
            name: file.name,
            size: formatSize(file.size),
            type,
            url: loadEvent.target?.result as string,
            uploadedAt: new Date().toISOString()
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (submitFileInputRef.current) submitFileInputRef.current.value = "";
  };

  // Toggle Reminder Active
  const handleToggleReminderActive = (remId: string) => {
    const updated = recurringReminders.map(r => {
      if (r.id === remId) {
        const nextState = !r.isActive;
        return { ...r, isActive: nextState, status: (nextState ? "Đúng hạn" : "Tạm dừng") as RecurringReminder["status"] };
      }
      return r;
    });
    saveReminders(updated);
    setReminderToast({
      message: "Đã cập nhật trạng thái lịch nhắc nhở!",
      type: "info"
    });
    setTimeout(() => setReminderToast(null), 3000);
  };

  // Delete Reminder
  const handleDeleteReminder = (remId: string) => {
    if (confirm("Bạn có chắc chắn muốn xoá lịch báo cáo / nhắc việc định kỳ này?")) {
      const updated = recurringReminders.filter(r => r.id !== remId);
      saveReminders(updated);
      if (selectedReminder?.id === remId) setSelectedReminder(null);
      setReminderToast({
        message: "Đã xoá lịch báo cáo thành công!",
        type: "info"
      });
      setTimeout(() => setReminderToast(null), 3000);
    }
  };

  // Manual Trigger Notification Toast
  const handleTriggerManualNotification = (r: RecurringReminder) => {
    setReminderToast({
      message: `🔔 [THÔNG BÁO TỨC THÌ] Đã phát chuông nhắc nộp "${r.title}" tới ${r.responsiblePerson.name} (${r.responsibleUnit}) và cấp trên ${r.recipientOrg}!`,
      type: "warning"
    });
    setTimeout(() => setReminderToast(null), 5000);
  };

  // Create Recurring Reminder
  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim()) return;

    const finalRecipient = isCustomRecipient || newRemRecipient === "__CUSTOM__"
      ? (customRecipient.trim() || "Cơ quan cấp trên")
      : newRemRecipient;

    const finalPersonName = isCustomRemPerson ? newRemPersonName.trim() : newRemPersonName;

    // Calculate initial nextDueDate
    const today = new Date();
    let nextDueStr = today.toISOString().split("T")[0];
    if (newRemFrequency === "weekly") {
      const currentDay = today.getDay();
      let diff = newRemDayOfWeek - currentDay;
      if (diff <= 0) diff += 7;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + diff);
      nextDueStr = targetDate.toISOString().split("T")[0];
    } else if (newRemFrequency === "monthly") {
      let targetMonth = today.getMonth();
      let targetYear = today.getFullYear();
      if (today.getDate() > newRemDayOfMonth) {
        targetMonth += 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear += 1;
        }
      }
      const targetDate = new Date(targetYear, targetMonth, newRemDayOfMonth);
      nextDueStr = targetDate.toISOString().split("T")[0];
    } else if (newRemFrequency === "yearly") {
      let targetYear = today.getFullYear();
      const thisYearTarget = new Date(targetYear, newRemMonthOfYear - 1, newRemDayOfMonth);
      if (today > thisYearTarget) targetYear += 1;
      const targetDate = new Date(targetYear, newRemMonthOfYear - 1, newRemDayOfMonth);
      nextDueStr = targetDate.toISOString().split("T")[0];
    }

    const newReminder: RecurringReminder = {
      id: `REM-${String(recurringReminders.length + 1).padStart(3, "0")}`,
      title: newRemTitle.trim(),
      description: newRemDesc.trim() || undefined,
      frequency: newRemFrequency,
      frequencyDetail: {
        time: newRemTime,
        dayOfWeek: newRemFrequency === "weekly" ? newRemDayOfWeek : undefined,
        dayOfMonth: (newRemFrequency === "monthly" || newRemFrequency === "yearly" || newRemFrequency === "quarterly") ? newRemDayOfMonth : undefined,
        monthOfYear: newRemFrequency === "yearly" ? newRemMonthOfYear : undefined
      },
      recipientOrg: finalRecipient,
      responsibleUnit: newRemUnit,
      responsiblePerson: {
        name: finalPersonName || "Cán bộ phụ trách",
        role: newRemPersonRole,
        phone: newRemPersonPhone
      },
      notifyChannels: newRemChannels,
      isActive: true,
      nextDueDate: nextDueStr,
      status: "Sắp đến hạn",
      attachments: newRemAttachments.length > 0 ? newRemAttachments : undefined,
      autoCreateTask: newRemAutoCreateTask,
      createdAt: today.toISOString().split("T")[0]
    };

    // If autoCreateTask is enabled, automatically create a linked task in tasks list!
    if (newRemAutoCreateTask) {
      const autoTask: TaskItem = {
        id: `TASK-${String(tasks.length + 1).padStart(3, "0")}`,
        title: `[LỊCH ĐỊNH KỲ] ${newReminder.title}`,
        unit: newRemUnit,
        associationId: newRemAssociationId,
        assignee: {
          name: finalPersonName || "Cán bộ phụ trách",
          role: newRemPersonRole,
          unit: newRemUnit,
          phone: newRemPersonPhone
        },
        creator: "Hệ thống nhắc việc tự động KP3",
        startDate: today.toISOString().split("T")[0],
        deadline: nextDueStr,
        priority: "Cao",
        status: "Chờ xử lý",
        progressPercent: 0,
        description: `Nhiệm vụ lập trình tự động theo lịch báo cáo định kỳ nộp cho: ${finalRecipient}.\nGiờ nộp quy định: ${newRemTime}.\nNội dung: ${newRemDesc.trim() || "Thực hiện theo mẫu biểu quy định."}`,
        attachments: newRemAttachments.length > 0 ? newRemAttachments : undefined
      };
      saveTasks([autoTask, ...tasks]);
    }

    const updated = [newReminder, ...recurringReminders];
    saveReminders(updated);
    setShowAddReminderModal(false);
    setNewRemTitle("");
    setNewRemDesc("");
    setNewRemAttachments([]);
    setReminderToast({
      message: `Đã thiết lập lịch báo cáo định kỳ "${newReminder.title}" thành công!`,
      type: "success"
    });
    setTimeout(() => setReminderToast(null), 4000);
  };

  // Confirm Submit Report for the current cycle
  const handleConfirmSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingReminder) return;

    const todayStr = new Date().toISOString().split("T")[0];

    // Compute next cycle date after submission
    const currentDue = new Date(submittingReminder.nextDueDate);
    let nextDate = new Date(currentDue);
    if (submittingReminder.frequency === "daily") {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (submittingReminder.frequency === "weekly") {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (submittingReminder.frequency === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (submittingReminder.frequency === "quarterly") {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (submittingReminder.frequency === "yearly") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    const nextDueStr = nextDate.toISOString().split("T")[0];

    const updated = recurringReminders.map(r => {
      if (r.id === submittingReminder.id) {
        return {
          ...r,
          lastSubmittedDate: todayStr,
          nextDueDate: nextDueStr,
          status: "Đã nộp kỳ này" as const,
          submissionNotes: submitReportNotes.trim() || undefined,
          submittedFiles: [
            ...(r.submittedFiles || []),
            ...submitReportFiles
          ]
        };
      }
      return r;
    });

    saveReminders(updated);
    setSubmittingReminder(null);
    setSubmitReportNotes("");
    setSubmitReportFiles([]);
    setReminderToast({
      message: `✅ Đã nộp báo cáo "${submittingReminder.title}" lên ${submittingReminder.recipientOrg} thành công! Chu kỳ kế tiếp: ${nextDueStr}.`,
      type: "success"
    });
    setTimeout(() => setReminderToast(null), 5000);
  };

  // Reminders Filtered List
  const filteredReminders = useMemo(() => {
    return recurringReminders.filter(r => {
      if (reminderFrequencyFilter !== "all" && r.frequency !== reminderFrequencyFilter) {
        return false;
      }
      if (reminderRecipientFilter !== "all" && !r.recipientOrg.toLowerCase().includes(reminderRecipientFilter.toLowerCase())) {
        return false;
      }
      if (reminderSearchQuery.trim() && reminderSearchQuery !== "all") {
        const q = reminderSearchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchOrg = r.recipientOrg.toLowerCase().includes(q);
        const matchPerson = r.responsiblePerson.name.toLowerCase().includes(q);
        const matchUnit = r.responsibleUnit.toLowerCase().includes(q);
        if (!matchTitle && !matchOrg && !matchPerson && !matchUnit) return false;
      }
      return true;
    });
  }, [recurringReminders, reminderFrequencyFilter, reminderRecipientFilter, reminderSearchQuery]);

  // Reminder KPI metrics
  const reminderKpi = useMemo(() => {
    const total = recurringReminders.length;
    const active = recurringReminders.filter(r => r.isActive).length;
    const due = recurringReminders.filter(r => r.isActive && (r.status === "Hôm nay đến hạn" || r.status === "Sắp đến hạn" || r.status === "Quá hạn")).length;
    const submitted = recurringReminders.filter(r => r.status === "Đã nộp kỳ này").length;
    return { total, active, due, submitted };
  }, [recurringReminders]);

  // Due Reminders for Executive Top Banner
  const dueReminders = useMemo(() => {
    return recurringReminders.filter(r => r.isActive && (r.status === "Hôm nay đến hạn" || r.status === "Sắp đến hạn" || r.status === "Quá hạn"));
  }, [recurringReminders]);

  return (
    <div id="task-and-schedule-module" className="space-y-6">
      {/* Header title & Sub-tab switcher */}
      <PageHeader
        badgeIcon={<Sparkles size={14} className="text-emerald-600" />}
        badgeText="BAN ĐIỀU HÀNH & CÁN BỘ • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext="ĐIỀU HÀNH TÁC NGHIỆP"
        title="Lịch Công Tác Điện Tử & Phân Công Nhiệm Vụ"
        actions={
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              id="btn-subtab-tasks"
              onClick={() => setActiveSubTab("tasks")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "tasks"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <CheckSquare size={14} className={activeSubTab === "tasks" ? "text-emerald-600" : "text-slate-400"} />
              <span>Phân Công Nhiệm Vụ ({tasks.length})</span>
            </button>
            <button
              id="btn-subtab-schedules"
              onClick={() => setActiveSubTab("schedules")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "schedules"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <CalendarIcon size={14} className={activeSubTab === "schedules" ? "text-emerald-600" : "text-slate-400"} />
              <span>Lịch Họp & Sự Kiện ({schedules.length})</span>
            </button>
            <button
              id="btn-subtab-reminders"
              onClick={() => setActiveSubTab("reminders")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
                activeSubTab === "reminders"
                  ? "bg-white text-indigo-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Bell size={14} className={activeSubTab === "reminders" ? "text-indigo-600 fill-indigo-100" : "text-slate-400"} />
              <span>Nhắc Việc & Báo Cáo ({recurringReminders.length})</span>
              {reminderKpi.due > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>
          </div>
        }
      />

      {/* FLOATING TOAST NOTIFICATION */}
      {reminderToast && (
        <div className="fixed top-5 right-5 z-70 max-w-md bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 animate-in slide-in-from-top-4 duration-200 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
            <BellRing size={16} className="animate-bounce" />
          </div>
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-bold block text-indigo-300 mb-0.5">HỆ THỐNG THÔNG BÁO TÁC NGHIỆP</span>
            {reminderToast.message}
          </div>
          <button
            onClick={() => setReminderToast(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* EXECUTIVE REMINDER BANNER FOR DUE REPORTS */}
      {dueReminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border-2 border-amber-400/40 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Megaphone size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                  ⚡ Cảnh Báo Nhắc Hẹn & Báo Cáo Định Kỳ Cấp Trên ({dueReminders.length} nội dung)
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">• Thực hiện theo quy chế điều hành KP3</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 mt-1 flex flex-wrap items-center gap-1.5">
                {dueReminders.slice(0, 2).map((r, i) => (
                  <span key={r.id} className="inline-flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200 text-slate-800 text-[11px]">
                    <strong className="text-rose-700">[{r.status}]</strong> {r.title} ➔ <span className="text-indigo-800 font-bold">{r.recipientOrg}</span>
                    {i === 0 && dueReminders.length > 1 ? " | " : ""}
                  </span>
                ))}
                {dueReminders.length > 2 && (
                  <span className="text-[11px] text-slate-500 font-bold">+{dueReminders.length - 2} báo cáo khác</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                setActiveSubTab("reminders");
                handleTriggerManualNotification(dueReminders[0]);
              }}
              className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 border border-amber-300 px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <BellRing size={13} /> Phát chuông nhắc việc
            </button>
            <button
              onClick={() => setActiveSubTab("reminders")}
              className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
            >
              Xem & Nộp ngay <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 4 KPI Summary Cards - Adapts to current sub-tab */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {activeSubTab === "reminders" ? (
          <>
            <StatCard
              label="Lịch báo cáo định kỳ"
              value={reminderKpi.total}
              badge="lập trình"
              highlighted={true}
              icon={Repeat}
              color="emerald"
              subtext="Quy chế ngày / tuần / tháng / năm"
              subtextRight="Hệ thống số hóa"
            />
            <StatCard
              label="Đang kích hoạt"
              value={reminderKpi.active}
              badge="giám sát 24/7"
              icon={BellRing}
              color="blue"
              subtext="Tự động nhắc hẹn đa kênh"
              subtextRight="Đang chạy"
            />
            <StatCard
              label="Đến hạn nộp cấp trên"
              value={reminderKpi.due}
              badge="cần nộp gấp"
              icon={Flame}
              color="rose"
              subtext="Thứ 7 tuần & Ngày 15 tháng"
              subtextRight="Ưu tiên cao"
            />
            <StatCard
              label="Đã nộp kỳ này"
              value={reminderKpi.submitted}
              badge="đúng hạn"
              icon={FileCheck}
              color="purple"
              subtext="Lưu trữ hồ sơ điện tử có dấu"
              subtextRight="Hoàn tất"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Tổng việc giao"
              value={taskKpi.total}
              badge="nhiệm vụ"
              highlighted={true}
              icon={CheckSquare}
              color="emerald"
              subtext="Nhiệm vụ tác nghiệp toàn KP3"
              subtextRight="Kế hoạch công tác"
            />
            <StatCard
              label="Đang triển khai"
              value={taskKpi.inProgress}
              badge={`${taskKpi.pendingReview} chờ duyệt`}
              icon={Clock}
              color="blue"
              subtext="Tổ dân phố & Lực lượng phụ trách"
              subtextRight="Đang thực hiện"
            />
            <StatCard
              label="Việc khẩn cấp"
              value={taskKpi.urgent}
              badge="ưu tiên cao"
              icon={Flame}
              color="rose"
              subtext="Cần xử lý dứt điểm trong tuần"
              subtextRight="Hạn chót gấp"
            />
            <StatCard
              label="Đã hoàn thành"
              value={taskKpi.completed}
              badge={`Đạt ${taskKpi.completionRate}%`}
              icon={CheckCircle2}
              color="purple"
              subtext="Nghiệm thu đạt chỉ tiêu"
              subtextRight="Hoàn tất"
            />
          </>
        )}
      </div>

      {/* SUB-TAB 1: PHÂN CÔNG NHIỆM VỤ (TASKS) */}
      {activeSubTab === "tasks" && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="task-search-input"
                  name="taskSearchQuery"
                  aria-label="Tìm kiếm nhiệm vụ"
                  type="text"
                  placeholder="Tìm nhiệm vụ, người nhận việc..."
                  value={taskSearchQuery}
                  onChange={e => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filter by unit */}
              <select
                id="task-unit-filter"
                name="taskUnitFilter"
                aria-label="Lọc theo đơn vị nhận"
                value={taskUnitFilter}
                onChange={e => setTaskUnitFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="all">Tất cả đơn vị ({associationsList.length} tổ chức)</option>
                {associationsList.map(assoc => (
                  <option key={assoc.id} value={assoc.name}>{assoc.name}</option>
                ))}
              </select>

              {/* Filter by priority */}
              <select
                id="task-priority-filter"
                name="taskPriorityFilter"
                aria-label="Lọc theo mức độ ưu tiên"
                value={taskPriorityFilter}
                onChange={e => setTaskPriorityFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="all">Mọi mức ưu tiên</option>
                <option value="Khẩn cấp">Khẩn cấp</option>
                <option value="Cao">Ưu tiên cao</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Thấp">Thấp</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Toggle Kanban vs List */}
              <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
                <button
                  id="btn-view-kanban"
                  onClick={() => setTaskViewMode("kanban")}
                  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                    taskViewMode === "kanban" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Chế độ Kanban"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  id="btn-view-list"
                  onClick={() => setTaskViewMode("list")}
                  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                    taskViewMode === "list" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Chế độ Danh sách"
                >
                  <ListFilter size={15} />
                </button>
              </div>

              {/* Add task button */}
              <button
                id="btn-add-task-modal"
                onClick={() => setShowAddTaskModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus size={15} /> Giao nhiệm vụ mới
              </button>
            </div>
          </div>

          {/* KANBAN VIEW */}
          {taskViewMode === "kanban" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["Chờ xử lý", "Đang thực hiện", "Chờ nghiệm thu", "Hoàn thành"] as TaskItem["status"][]).map(statusCol => {
                const columnTasks = filteredTasks.filter(t => t.status === statusCol);
                const colColors = {
                  "Chờ xử lý": "border-slate-300 bg-slate-50 text-slate-700",
                  "Đang thực hiện": "border-sky-300 bg-sky-50 text-sky-800",
                  "Chờ nghiệm thu": "border-purple-300 bg-purple-50 text-purple-800",
                  "Hoàn thành": "border-emerald-300 bg-emerald-50 text-emerald-800"
                }[statusCol];

                return (
                  <div key={statusCol} className="flex flex-col rounded-xl border border-slate-200 bg-slate-100/60 p-3 min-h-[500px]">
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${colColors}`}>
                          {statusCol}
                        </span>
                        <span className="text-xs font-bold text-slate-500">({columnTasks.length})</span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                      {columnTasks.length === 0 ? (
                        <div className="h-32 flex items-center justify-center text-[11px] text-slate-400 italic">
                          Chưa có nhiệm vụ
                        </div>
                      ) : (
                        columnTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="text-[10px] font-mono text-slate-400 font-bold">{task.id}</span>
                              {getPriorityBadge(task.priority)}
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 leading-snug hover:text-emerald-700">
                              {task.title}
                            </h4>

                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {task.description}
                            </p>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                <span>Tiến độ</span>
                                <span className="font-bold text-slate-700">{task.progressPercent}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    task.progressPercent === 100
                                      ? "bg-emerald-500"
                                      : task.progressPercent > 50
                                      ? "bg-sky-500"
                                      : "bg-amber-500"
                                  }`}
                                  style={{ width: `${task.progressPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Footer card info */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <div className="flex items-center gap-1 truncate max-w-[130px]" title={task.assignee.name}>
                                <User size={12} className="text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-700 truncate">{task.assignee.name}</span>
                              </div>

                              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                                <Clock size={11} className="text-slate-400" />
                                <span>Hạn: {task.deadline.slice(5)}</span>
                              </div>
                            </div>

                            {/* Quick status transition buttons */}
                            <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                              {statusCol !== "Chờ xử lý" && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, statusCol === "Hoàn thành" ? "Chờ nghiệm thu" : statusCol === "Chờ nghiệm thu" ? "Đang thực hiện" : "Chờ xử lý")}
                                  className="text-[10px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                                  title="Lùi trạng thái"
                                >
                                  ← Lùi
                                </button>
                              )}
                              {statusCol !== "Hoàn thành" && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, statusCol === "Chờ xử lý" ? "Đang thực hiện" : statusCol === "Đang thực hiện" ? "Chờ nghiệm thu" : "Hoàn thành")}
                                  className="text-[10px] text-white bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 rounded font-bold cursor-pointer"
                                  title="Chuyển bước tiếp theo"
                                >
                                  Tiến →
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW */}
          {taskViewMode === "list" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Mã</th>
                      <th className="py-3 px-3">Tên nhiệm vụ / Nội dung</th>
                      <th className="py-3 px-3">Đơn vị & Người nhận</th>
                      <th className="py-3 px-3">Mức độ</th>
                      <th className="py-3 px-3">Hạn chót</th>
                      <th className="py-3 px-3">Tiến độ</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                          Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500 text-[11px]">{t.id}</td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <div className="font-bold text-slate-900 line-clamp-1">{t.title}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{t.description}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{t.assignee.name}</div>
                            <div className="text-[10px] text-slate-500">{t.unit}</div>
                          </td>
                          <td className="py-2.5 px-3">{getPriorityBadge(t.priority)}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{t.deadline}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.progressPercent}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-slate-700 font-bold">{t.progressPercent}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">{getStatusBadge(t.status)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedTask(t)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded font-bold cursor-pointer"
                              >
                                Chi tiết
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 p-1 rounded cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: LỊCH CÔNG TÁC (SCHEDULES) */}
      {activeSubTab === "schedules" && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Lọc theo loại:</span>
              <select
                id="schedule-type-filter"
                name="scheduleTypeFilter"
                aria-label="Lọc theo loại sự kiện"
                value={scheduleTypeFilter}
                onChange={e => setScheduleTypeFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="all">Tất cả sự kiện ({schedules.length})</option>
                {Array.from(new Set([
                  "Họp Chi bộ",
                  "Họp Ban Điều hành KP3",
                  "Họp Tổ Dân Phố",
                  "Tuần tra ANTT",
                  "Chủ Nhật Xanh",
                  "Tiếp công dân",
                  "Hội nghị Khu phố",
                  ...schedules.map(s => s.type)
                ])).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <span className="text-xs font-bold text-slate-700 ml-2">Tháng:</span>
              <input
                id="schedule-month-filter"
                name="scheduleMonthFilter"
                aria-label="Lọc theo tháng"
                type="month"
                value={scheduleMonthFilter}
                onChange={e => setScheduleMonthFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                title="In lịch công tác tuần/tháng"
              >
                <Printer size={14} /> In Lịch
              </button>
              <button
                id="btn-add-schedule-modal"
                onClick={() => setShowAddScheduleModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus size={15} /> Thêm sự kiện / Lịch họp mới
              </button>
            </div>
          </div>

          {/* Timeline of events */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules
              .filter(s => scheduleTypeFilter === "all" || s.type === scheduleTypeFilter)
              .map(sch => {
                const isPassed = sch.status === "Đã kết thúc";
                return (
                  <div
                    key={sch.id}
                    onClick={() => setSelectedSchedule(sch)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                      isPassed
                        ? "bg-slate-50 border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-300"
                        : "bg-white border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {getScheduleTypeBadge(sch.type)}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sch.status === "Đang diễn ra"
                          ? "bg-emerald-100 text-emerald-800 animate-pulse"
                          : sch.status === "Sắp diễn ra"
                          ? "bg-sky-100 text-sky-800"
                          : sch.status === "Đã hoãn"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {sch.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-2 leading-snug group-hover:text-indigo-700 transition-colors">
                      {sch.title}
                    </h4>

                    {/* Nội dung chương trình / mô tả tóm tắt */}
                    {(sch.description || sch.content) && (
                      <div className="mb-3 p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed line-clamp-2">
                        <div className="text-[10px] uppercase font-bold text-indigo-700 mb-0.5 flex items-center gap-1">
                          <FileText size={11} /> Nội dung chương trình:
                        </div>
                        {sch.description || sch.content}
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-indigo-700 font-bold bg-indigo-50/70 p-1.5 rounded-md">
                        <CalendarIcon size={13} className="shrink-0" />
                        <span>{sch.date} • {sch.time}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{sch.location}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <User size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="font-semibold text-slate-800 line-clamp-1">{sch.host}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-slate-500 line-clamp-2">{sch.attendees}</span>
                      </div>
                    </div>

                    {/* Danh sách tệp đính kèm trên card */}
                    {sch.attachments && sch.attachments.length > 0 && (
                      <div className="pt-2 mt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                          <Paperclip size={11} className="text-indigo-600" /> {sch.attachments.length} tệp đính kèm:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sch.attachments.map(att => (
                            <div
                              key={att.id}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-[11px] text-slate-700 transition-colors"
                            >
                              {att.type === "image" ? (
                                <ImageIcon size={11} className="text-emerald-600 shrink-0" />
                              ) : att.type === "pdf" ? (
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 rounded">PDF</span>
                              ) : (
                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1 rounded">DOC</span>
                              )}
                              <span className="max-w-[110px] truncate font-medium" title={att.name}>{att.name}</span>
                              {att.type === "image" && att.url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer ml-0.5"
                                  title="Xem ảnh"
                                >
                                  <Eye size={11} />
                                </button>
                              )}
                              {att.url && (
                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                                  title="Tải về"
                                >
                                  <Download size={11} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sch.notes && !sch.description && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                        "{sch.notes}"
                      </div>
                    )}

                    {/* Action footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-indigo-600 font-bold group-hover:underline flex items-center gap-1">
                        Chi tiết & Văn bản <ChevronRight size={13} />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSchedule(sch.id);
                        }}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa sự kiện"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: NHẮC HẸN & LỊCH BÁO CÁO ĐỊNH KỲ (REMINDERS) */}
      {activeSubTab === "reminders" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative min-w-[180px] flex-1 max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reminder-search-input"
                  name="reminderSearch"
                  aria-label="Tìm kiếm lịch báo cáo"
                  type="text"
                  value={reminderSearchQuery === "all" ? "" : reminderSearchQuery}
                  onChange={e => setReminderSearchQuery(e.target.value)}
                  placeholder="Tìm theo tiêu đề, cơ quan, cán bộ..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Frequency Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 hidden sm:inline">Chu kỳ:</span>
                <select
                  id="reminder-frequency-filter"
                  name="reminderFrequencyFilter"
                  aria-label="Lọc theo chu kỳ lặp lại"
                  value={reminderFrequencyFilter}
                  onChange={e => setReminderFrequencyFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                >
                  <option value="all">Tất cả chu kỳ ({recurringReminders.length})</option>
                  <option value="daily">Hàng ngày (Daily)</option>
                  <option value="weekly">Hàng tuần [Thứ 7] (Weekly)</option>
                  <option value="monthly">Hàng tháng [Ngày 15] (Monthly)</option>
                  <option value="quarterly">Hàng quý (Quarterly)</option>
                  <option value="yearly">Hàng năm (Yearly)</option>
                </select>
              </div>

              {/* Recipient Org Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 hidden sm:inline">Nơi nhận:</span>
                <select
                  id="reminder-recipient-filter"
                  name="reminderRecipientFilter"
                  aria-label="Lọc theo nơi tiếp nhận báo cáo"
                  value={reminderRecipientFilter}
                  onChange={e => setReminderRecipientFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none max-w-[200px] truncate"
                >
                  <option value="all">Tất cả cấp trên / nơi nhận</option>
                  {RECIPIENT_ORGS.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-add-reminder-modal"
                onClick={() => setShowAddReminderModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus size={15} /> Cài đặt Lịch báo cáo / Nhắc hẹn mới
              </button>
            </div>
          </div>

          {/* Reminders Cards Grid */}
          {filteredReminders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center mb-3">
                <Bell size={26} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Không tìm thấy lịch báo cáo phù hợp</h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto mb-4">
                Hãy điều chỉnh bộ lọc chu kỳ hoặc nơi tiếp nhận để xem danh sách lịch nhắc hẹn tác nghiệp.
              </p>
              <button
                onClick={() => {
                  setReminderFrequencyFilter("all");
                  setReminderRecipientFilter("all");
                  setReminderSearchQuery("");
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredReminders.map(rem => (
                <div
                  key={rem.id}
                  className={`bg-white rounded-2xl border transition-all p-4.5 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md ${
                    rem.status === "Hôm nay đến hạn"
                      ? "border-amber-400/90 ring-1 ring-amber-400/50 bg-gradient-to-b from-amber-50/20 to-white"
                      : rem.status === "Sắp đến hạn"
                      ? "border-indigo-300/80 hover:border-indigo-400"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  {/* Top Header: Frequency & Status & Toggle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                        <Repeat size={12} className="text-indigo-600" />
                        {formatFrequencyText(rem)}
                      </span>
                      {getReminderStatusBadge(rem.status)}
                    </div>

                    {/* Toggle Active Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleReminderActive(rem.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rem.isActive ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      title={rem.isActive ? "Đang bật nhắc hẹn (Bấm để tạm dừng)" : "Đang tạm dừng (Bấm để bật)"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          rem.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-2.5">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-[15px] leading-snug line-clamp-2">
                      {rem.title}
                    </h3>

                    {/* Recipient Agency */}
                    <div className="flex items-start gap-1.5 px-3 py-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
                      <Building size={14} className="text-indigo-700 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-indigo-900/70 block">Cơ quan / Cấp trên tiếp nhận:</span>
                        <span className="font-bold text-indigo-950 truncate block">{rem.recipientOrg}</span>
                      </div>
                    </div>

                    {/* Responsible Unit & Person */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User size={13} className="text-slate-500 shrink-0" />
                        <span className="truncate">
                          <strong className="text-slate-900">{rem.responsiblePerson.name}</strong> • {rem.responsiblePerson.role}
                        </span>
                      </div>
                      {rem.responsiblePerson.phone && (
                        <a
                          href={`tel:${rem.responsiblePerson.phone}`}
                          className="font-mono text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 flex items-center gap-1"
                          title="Gọi hotline"
                        >
                          <Phone size={10} /> {rem.responsiblePerson.phone}
                        </a>
                      )}
                    </div>

                    {/* Description */}
                    {rem.description && (
                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                        {rem.description}
                      </p>
                    )}

                    {/* Next Due Date & Last Submitted Date */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-1">
                      <div className="text-slate-500">
                        Hạn nộp kế tiếp: <strong className="text-rose-700 font-mono font-bold">{rem.nextDueDate}</strong>
                        <span className="text-slate-400 text-[11px] ml-1">({rem.frequencyDetail.time})</span>
                      </div>
                      {rem.lastSubmittedDate ? (
                        <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCheck size={13} /> Đã nộp kỳ trước: {rem.lastSubmittedDate}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">Chưa nộp kỳ nào</div>
                      )}
                    </div>

                    {/* Report Template Document Attachment (if available) */}
                    {rem.attachments && rem.attachments.length > 0 && (
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText size={14} className="text-indigo-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-800 text-[11px] truncate block">
                              Mẫu biểu: {rem.attachments[0].name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {rem.attachments[0].size || "Tài liệu mẫu"}
                            </span>
                          </div>
                        </div>
                        {rem.attachments[0].url && (
                          <a
                            href={rem.attachments[0].url}
                            download={rem.attachments[0].name}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 border border-indigo-200 shrink-0 transition-colors"
                            title="Tải mẫu báo cáo về máy"
                          >
                            <Download size={12} /> Tải mẫu
                          </a>
                        )}
                      </div>
                    )}

                    {/* Submitted Files Badge (if user uploaded submissions) */}
                    {rem.submittedFiles && rem.submittedFiles.length > 0 && (
                      <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center justify-between">
                        <span>Đã lưu trữ hồ sơ: {rem.submittedFiles.length} tệp đã nộp</span>
                        <FileCheck size={13} className="text-emerald-600" />
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      {/* Submit Report Button */}
                      <button
                        type="button"
                        id={`btn-submit-reminder-${rem.id}`}
                        onClick={() => {
                          setSubmittingReminder(rem);
                          setSubmitReportFiles([]);
                          setSubmitReportNotes("");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      >
                        <FileCheck size={13} /> Nộp báo cáo kỳ này
                      </button>

                      {/* Manual Trigger Alert Button */}
                      <button
                        type="button"
                        onClick={() => handleTriggerManualNotification(rem)}
                        className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Phát thông báo nhắc nhở cán bộ phụ trách"
                      >
                        <BellRing size={13} />
                        <span className="hidden sm:inline">Nhắc việc</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Details / History Modal */}
                      <button
                        type="button"
                        onClick={() => setSelectedReminder(rem)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                        title="Xem chi tiết & lịch sử nộp"
                      >
                        Chi tiết
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xoá lịch nhắc"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Header: Dark Navy GovTech Gradient */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {selectedTask.id}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-white truncate">
                    Chi tiết & Điều phối nhiệm vụ
                  </h3>
                  <p className="text-[11px] text-slate-300 font-normal">
                    Quản trị tác nghiệp & Giám sát tiến độ cơ sở Khu phố 3
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors shrink-0 ml-2"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1 divide-y divide-slate-100">
              {/* SECTION 1: TASK TITLE & DESCRIPTION */}
              <div className="space-y-2 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {selectedTask.title}
                  </h2>
                  <div className="shrink-0">
                    {getPriorityBadge(selectedTask.priority)}
                  </div>
                </div>

                {selectedTask.description && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs sm:text-[13px] leading-relaxed">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                      Mô tả nội dung & Mục tiêu
                    </span>
                    <p className="whitespace-pre-line">{selectedTask.description}</p>
                  </div>
                )}
              </div>

              {/* SECTION 2: ASSIGNEE & UNIT EXECUTIVE CARD */}
              <div className="pt-3.5 space-y-2.5">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                  Đơn vị & Cán bộ phụ trách
                </span>
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 border border-emerald-200/80 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    {/* Left: Organization & Leader info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Đơn vị nhận việc</span>
                          <span className="font-bold text-slate-900 text-sm leading-tight block truncate">
                            {selectedTask.unit}
                          </span>
                        </div>
                      </div>

                      <div className="pl-10 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 text-xs">
                            👤 {selectedTask.assignee.name}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            • {selectedTask.assignee.role}
                          </span>
                        </div>
                        {selectedTask.assignee.phone && (
                          <div>
                            <a
                              href={`tel:${selectedTask.assignee.phone}`}
                              className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/70 border border-emerald-300 px-2.5 py-1 rounded-md transition-colors"
                              title="Bấm để gọi hotline cán bộ"
                            >
                              <Phone size={11} /> {selectedTask.assignee.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Creator & Delegation */}
                    <div className="space-y-2 sm:border-l sm:border-slate-200/70 sm:pl-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Người giao nhiệm vụ</span>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800 text-xs">
                            {selectedTask.creator}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Ngày giao:</span>
                          <span className="font-mono font-semibold text-slate-700">{selectedTask.startDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Hạn chót:</span>
                          <span className="font-mono font-bold text-rose-700">{selectedTask.deadline}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: KEY METRICS TILES */}
              <div className="pt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Ngày bắt đầu</span>
                  <div className="flex items-center gap-1 text-slate-700 font-mono font-semibold text-xs">
                    <CalendarIcon size={12} className="text-slate-400" />
                    <span>{selectedTask.startDate}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Hạn chót</span>
                  <div className="flex items-center gap-1 text-slate-700 font-mono font-bold text-xs">
                    <Clock size={12} className="text-amber-500" />
                    <span>{selectedTask.deadline}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Mức ưu tiên</span>
                  <div>{getPriorityBadge(selectedTask.priority)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Trạng thái</span>
                  <div>{getStatusBadge(selectedTask.status)}</div>
                </div>
              </div>

              {/* SECTION 4: NOTES (IF ANY) */}
              {selectedTask.notes && (
                <div className="pt-3.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Ghi chú / Minh chứng hiện trường
                  </span>
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-amber-900 text-xs">
                    "{selectedTask.notes}"
                  </div>
                </div>
              )}

              {/* SECTION 5: ATTACHMENTS (IMAGE, WORD, PDF) */}
              <div className="pt-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Paperclip size={14} className="text-emerald-600" />
                    <span>Tài liệu & Hình ảnh đính kèm ({selectedTask.attachments?.length || 0})</span>
                  </div>
                  <div>
                    <input
                      ref={detailFileInputRef}
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.doc"
                      className="hidden"
                      onChange={handleDetailFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => detailFileInputRef.current?.click()}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Plus size={12} /> Đính kèm thêm tệp...
                    </button>
                  </div>
                </div>

                {(!selectedTask.attachments || selectedTask.attachments.length === 0) ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-slate-400 italic text-[11px]">
                    Chưa có tài liệu hoặc hình ảnh đính kèm. Nhấn nút "+ Đính kèm thêm tệp" phía trên để bổ sung biên bản, hình ảnh hoặc kế hoạch Word/PDF.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedTask.attachments.map(att => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {att.type === "image" ? (
                            <div
                              onClick={() => setPreviewAttachment(att)}
                              className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 relative group shadow-2xs"
                              title="Nhấn để phóng to ảnh"
                            >
                              <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye size={14} className="text-white" />
                              </div>
                            </div>
                          ) : att.type === "pdf" ? (
                            <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs">
                              <span className="text-[10px] font-mono leading-none">PDF</span>
                              <FileText size={13} className="mt-0.5" />
                            </div>
                          ) : att.type === "word" ? (
                            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs">
                              <span className="text-[10px] font-mono leading-none">DOC</span>
                              <FileText size={13} className="mt-0.5" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                              FILE
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-xs truncate" title={att.name}>
                              {att.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {att.size || "Tài liệu"} • {att.type.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {att.type === "image" && (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                              title="Xem ảnh phóng to"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <a
                            href={att.url}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                            title="Tải tệp về máy"
                          >
                            <Download size={14} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteDetailAttachment(att.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Xóa tệp đính kèm này"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 6: PROGRESS & STATUS TRANSITIONS */}
              <div className="pt-3.5 p-4 rounded-xl bg-slate-50/80 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="selected-task-progress-range" className="text-slate-500 uppercase font-bold">
                      Tiến độ hoàn thành
                    </label>
                    <span className="font-mono font-black text-sm text-emerald-700">
                      {selectedTask.progressPercent}%
                    </span>
                  </div>
                  <input
                    id="selected-task-progress-range"
                    name="progressPercent"
                    aria-label="Thanh trượt tiến độ"
                    type="range"
                    min="0"
                    max="100"
                    value={selectedTask.progressPercent}
                    onChange={e => {
                      const val = Number(e.target.value);
                      const updated = tasks.map(t => t.id === selectedTask.id ? { ...t, progressPercent: val } : t);
                      saveTasks(updated);
                      setSelectedTask({ ...selectedTask, progressPercent: val });
                    }}
                    className="w-full cursor-pointer accent-emerald-600"
                  />
                  {/* Quick preset buttons */}
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-500 pt-0.5">
                    {[0, 25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const updated = tasks.map(t => t.id === selectedTask.id ? { ...t, progressPercent: pct, status: pct === 100 ? "Hoàn thành" : t.status } : t);
                          saveTasks(updated);
                          setSelectedTask({ ...selectedTask, progressPercent: pct, status: pct === 100 ? "Hoàn thành" : selectedTask.status });
                        }}
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-bold cursor-pointer transition-colors ${
                          selectedTask.progressPercent === pct
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="selected-task-status-select" className="text-[11px] text-slate-500 uppercase font-bold block">
                    Chuyển trạng thái
                  </label>
                  <select
                    id="selected-task-status-select"
                    name="status"
                    aria-label="Chọn trạng thái"
                    value={selectedTask.status}
                    onChange={e => handleMoveStatus(selectedTask.id, e.target.value as any)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Chờ xử lý">⏳ Chờ xử lý</option>
                    <option value="Đang thực hiện">⚡ Đang thực hiện</option>
                    <option value="Chờ nghiệm thu">📋 Chờ nghiệm thu</option>
                    <option value="Hoàn thành">✅ Hoàn thành</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-200 flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
              >
                <Trash2 size={13} /> Xóa nhiệm vụ
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-5 py-2 rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TASK */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Plus size={16} className="text-emerald-400" /> Phân công nhiệm vụ mới
              </h3>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu đề nhiệm vụ *</label>
                <input
                  id="modal-new-task-title"
                  name="newTaskTitle"
                  aria-label="Tiêu đề nhiệm vụ"
                  type="text"
                  required
                  placeholder="Ví dụ: Rà soát PCCC tại các dãy trọ TDP 12..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả nội dung chi tiết</label>
                <textarea
                  id="modal-new-task-desc"
                  name="newTaskDesc"
                  aria-label="Mô tả nội dung chi tiết"
                  rows={2}
                  placeholder="Nội dung, mục tiêu cụ thể, yêu cầu báo cáo..."
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 leading-relaxed text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Đơn vị nhận việc *</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">23 Chi hội</span>
                  </label>
                  <select
                    id="modal-new-task-unit"
                    name="newTaskUnit"
                    aria-label="Đơn vị nhận việc"
                    value={newTaskAssociationId}
                    onChange={e => handleUnitChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 truncate"
                  >
                    {associationsList.map(assoc => (
                      <option key={assoc.id} value={assoc.id}>
                        {assoc.name} ({assoc.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    id="modal-new-task-priority"
                    name="newTaskPriority"
                    aria-label="Mức độ ưu tiên"
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="Trung bình">Trung bình (Bình thường)</option>
                    <option value="Cao">Ưu tiên cao</option>
                    <option value="Khẩn cấp">Khẩn cấp (Hỏa tốc)</option>
                    <option value="Thấp">Thấp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Người nhận việc chính *</label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Thành viên chi hội</span>
                  </div>
                  {!isCustomAssignee ? (
                    <select
                      id="modal-new-task-assignee-select"
                      value={newTaskAssigneeName}
                      onChange={handleMemberChange}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 truncate"
                    >
                      {currentAssocMembers.map(m => (
                        <option key={m.id || m.fullName} value={m.fullName}>
                          {m.fullName} - {m.role} {m.phone ? `(${m.phone})` : ""}
                        </option>
                      ))}
                      <option value="__CUSTOM__">➕ Nhập cán bộ / thành viên khác...</option>
                    </select>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        id="modal-new-task-assignee-name"
                        name="newTaskAssigneeName"
                        aria-label="Người nhận việc chính"
                        type="text"
                        placeholder="Họ và tên..."
                        value={newTaskAssigneeName}
                        onChange={e => setNewTaskAssigneeName(e.target.value)}
                        className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-bold"
                      />
                      <div className="flex items-center justify-between text-[11px] gap-1">
                        <input
                          type="text"
                          placeholder="Chức vụ..."
                          value={newTaskAssigneeRole}
                          onChange={e => setNewTaskAssigneeRole(e.target.value)}
                          className="p-1 text-xs border border-slate-200 rounded flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomAssignee(false)}
                          className="text-emerald-700 font-bold hover:underline shrink-0 text-[10px]"
                        >
                          ↩ Chi hội
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hạn chót hoàn thành *</label>
                  <input
                    id="modal-new-task-deadline"
                    name="newTaskDeadline"
                    aria-label="Hạn chót hoàn thành"
                    type="date"
                    required
                    value={newTaskDeadline}
                    onChange={e => setNewTaskDeadline(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Tệp đính kèm nhiệm vụ */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip size={13} className="text-emerald-600" />
                    <span>Tài liệu & Hình ảnh đính kèm ({newTaskAttachments.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UploadCloud size={13} /> Thêm tệp (Ảnh, Word, PDF)...
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                  />
                </div>

                {newTaskAttachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    {newTaskAttachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-1.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {att.type === "image" ? (
                            <img src={att.url} alt="" className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0" />
                          ) : att.type === "pdf" ? (
                            <span className="w-7 h-7 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-black text-[9px] border border-rose-200 shrink-0">PDF</span>
                          ) : (
                            <span className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[9px] border border-blue-200 shrink-0">DOC</span>
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 truncate" title={att.name}>{att.name}</div>
                            <div className="text-[10px] text-slate-400">{att.size}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Gỡ tệp"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs cursor-pointer"
                >
                  Giao việc ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SCHEDULE */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Header: Dark Indigo GovTech Gradient */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <CalendarIcon size={16} className="text-indigo-400" /> Thêm sự kiện / Lịch họp mới
              </h3>
              <button
                onClick={() => setShowAddScheduleModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSchedule} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu đề cuộc họp / Sự kiện *</label>
                <input
                  id="modal-new-sch-title"
                  name="newSchTitle"
                  aria-label="Tiêu đề cuộc họp"
                  type="text"
                  required
                  placeholder="Ví dụ: Họp chi bộ triển khai công tác tháng, Sinh hoạt định kỳ..."
                  value={newSchTitle}
                  onChange={e => setNewSchTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
                />
              </div>

              {/* BỔ SUNG PHẦN NHẬP NỘI DUNG CUỘC HỌP / CHƯƠNG TRÌNH CHI TIẾT */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Nội dung cuộc họp / Chương trình chi tiết *</span>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">Chương trình & Báo cáo</span>
                </label>
                <textarea
                  id="modal-new-sch-desc"
                  name="newSchDesc"
                  aria-label="Nội dung cuộc họp"
                  rows={3}
                  required
                  placeholder="Nhập chi tiết chương trình làm việc, dự thảo nghị quyết, báo cáo thảo luận, phân công chuẩn bị tài liệu..."
                  value={newSchDesc}
                  onChange={e => setNewSchDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Loại sự kiện</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSchType(!isCustomSchType)}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      {isCustomSchType ? "↩ Danh mục có sẵn" : "➕ Nhập loại khác"}
                    </button>
                  </div>
                  {!isCustomSchType ? (
                    <select
                      id="modal-new-sch-type"
                      name="newSchType"
                      aria-label="Loại sự kiện"
                      value={newSchType}
                      onChange={e => {
                        if (e.target.value === "__CUSTOM__") {
                          setIsCustomSchType(true);
                        } else {
                          setNewSchType(e.target.value);
                        }
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                    >
                      <option value="Họp Chi bộ">Họp Chi bộ (Ngày 3 hàng tháng)</option>
                      <option value="Họp Ban Điều hành KP3">Họp Ban Điều hành KP3</option>
                      <option value="Họp Tổ Dân Phố">Họp Tổ Dân Phố</option>
                      <option value="Tuần tra ANTT">Tuần tra ANTT ban đêm</option>
                      <option value="Chủ Nhật Xanh">Chủ Nhật Xanh</option>
                      <option value="Tiếp công dân">Tiếp công dân & Đối thoại</option>
                      <option value="Hội nghị Khu phố">Hội nghị Khu phố</option>
                      <option value="Đại hội Chi hội / Đoàn thể">Đại hội Chi hội / Đoàn thể</option>
                      <option value="Tập huấn PCCC & Cứu nạn">Tập huấn PCCC & Cứu nạn</option>
                      <option value="Hoạt động Đền ơn đáp nghĩa">Hoạt động Đền ơn đáp nghĩa / An sinh</option>
                      <option value="__CUSTOM__">➕ Loại sự kiện khác (Nhập tùy chọn)...</option>
                    </select>
                  ) : (
                    <input
                      id="modal-new-sch-custom-type"
                      type="text"
                      placeholder="Nhập loại sự kiện tùy chọn..."
                      value={customSchType}
                      onChange={e => setCustomSchType(e.target.value)}
                      className="w-full p-2 bg-white border border-indigo-300 rounded-lg font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày tổ chức *</label>
                  <input
                    id="modal-new-sch-date"
                    name="newSchDate"
                    aria-label="Ngày tổ chức"
                    type="date"
                    required
                    value={newSchDate}
                    onChange={e => setNewSchDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian (Giờ)</label>
                  <input
                    id="modal-new-sch-time"
                    name="newSchTime"
                    aria-label="Thời gian diễn ra"
                    type="text"
                    value={newSchTime}
                    placeholder="08:30 - 10:30"
                    onChange={e => setNewSchTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Địa điểm</label>
                  <input
                    id="modal-new-sch-location"
                    name="newSchLocation"
                    aria-label="Địa điểm diễn ra"
                    type="text"
                    value={newSchLocation}
                    onChange={e => setNewSchLocation(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Chủ trì *</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSchHost(!isCustomSchHost)}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      {isCustomSchHost ? "↩ Chọn từ 23 Chi hội" : "➕ Nhập khác"}
                    </button>
                  </div>
                  {!isCustomSchHost ? (
                    <select
                      id="modal-new-sch-host"
                      name="newSchHost"
                      aria-label="Người chủ trì"
                      value={newSchHost}
                      onChange={e => {
                        if (e.target.value === "__CUSTOM__") {
                          setIsCustomSchHost(true);
                        } else {
                          setNewSchHost(e.target.value);
                        }
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 truncate"
                    >
                      <optgroup label="⭐ Lãnh đạo cấp trên & Ban Quản trị">
                        {scheduleHostGroups.superiors.map(sup => (
                          <option key={sup} value={sup}>{sup}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🏛️ Lãnh đạo Cấp ủy & Ban Điều hành KP3">
                        {scheduleHostGroups.executive.map(exec => (
                          <option key={exec} value={exec}>{exec}</option>
                        ))}
                      </optgroup>
                      <optgroup label={`👥 Trưởng / Phó 23 Chi hội & Đoàn thể (${scheduleHostGroups.assocLeaders.length} đồng chí)`}>
                        {scheduleHostGroups.assocLeaders.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </optgroup>
                      <option value="__CUSTOM__">➕ Nhập người chủ trì / đại biểu khác (Tùy chọn)...</option>
                    </select>
                  ) : (
                    <input
                      id="modal-new-sch-custom-host"
                      type="text"
                      placeholder="Họ tên và chức vụ người chủ trì..."
                      value={customSchHost}
                      onChange={e => setCustomSchHost(e.target.value)}
                      className="w-full p-2 bg-white border border-indigo-300 rounded-lg font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thành phần tham dự</label>
                  <input
                    id="modal-new-sch-attendees"
                    name="newSchAttendees"
                    aria-label="Thành phần tham dự"
                    type="text"
                    value={newSchAttendees}
                    onChange={e => setNewSchAttendees(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* TỆP ĐÍNH KÈM: HÌNH ẢNH, WORD DOCX, PDF */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip size={13} className="text-indigo-600" />
                    <span>Tài liệu & Tệp đính kèm ({newSchAttachments.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => schFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UploadCloud size={13} /> Đính kèm tệp (Ảnh, Word, PDF)...
                  </button>
                  <input
                    type="file"
                    ref={schFileInputRef}
                    onChange={handleSchFileUpload}
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                  />
                </div>

                {newSchAttachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    {newSchAttachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-1.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {att.type === "image" ? (
                            <img src={att.url} alt="" className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0" />
                          ) : att.type === "pdf" ? (
                            <span className="w-7 h-7 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-black text-[9px] border border-rose-200 shrink-0">PDF</span>
                          ) : (
                            <span className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[9px] border border-blue-200 shrink-0">DOC</span>
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 truncate" title={att.name}>{att.name}</div>
                            <div className="text-[10px] text-slate-400">{att.size}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {att.type === "image" && att.url && (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                              title="Xem ảnh"
                            >
                              <Eye size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSchAttachment(att.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Gỡ tệp"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú bổ sung (tùy chọn)</label>
                <input
                  id="modal-new-sch-notes"
                  name="newSchNotes"
                  type="text"
                  placeholder="Ghi chú thêm về cơ sở vật chất, hậu cần..."
                  value={newSchNotes}
                  onChange={e => setNewSchNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CalendarCheck size={14} /> Lưu vào lịch công tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL / VIEW SCHEDULE */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Header: Indigo GovTech */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  {selectedSchedule.id}
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] uppercase tracking-wider text-indigo-300/80 font-bold block">
                    Chi tiết Sự kiện & Lịch công tác
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-white truncate leading-snug">
                    {selectedSchedule.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedSchedule(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Type & Status Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold">Phân loại:</span>
                  {getScheduleTypeBadge(selectedSchedule.type)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold">Trạng thái:</span>
                  <select
                    value={selectedSchedule.status}
                    onChange={e => handleUpdateScheduleStatus(selectedSchedule.id, e.target.value as any)}
                    className="font-bold text-xs py-1 px-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Sắp diễn ra">Sắp diễn ra</option>
                    <option value="Đang diễn ra">Đang diễn ra</option>
                    <option value="Đã kết thúc">Đã kết thúc</option>
                    <option value="Đã hoãn">Đã hoãn</option>
                  </select>
                </div>
              </div>

              {/* 4 Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1 mb-1">
                    <CalendarIcon size={12} /> Ngày tổ chức
                  </div>
                  <div className="font-black text-slate-900 text-xs sm:text-sm">{selectedSchedule.date}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1">
                    <Clock size={12} /> Thời gian
                  </div>
                  <div className="font-black text-slate-900 text-xs sm:text-sm">{selectedSchedule.time}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1">
                    <MapPin size={12} /> Địa điểm
                  </div>
                  <div className="font-semibold text-slate-900 text-xs truncate" title={selectedSchedule.location}>
                    {selectedSchedule.location}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1 mb-1">
                    <User size={12} /> Chủ trì
                  </div>
                  <div className="font-semibold text-slate-900 text-xs truncate" title={selectedSchedule.host}>
                    {selectedSchedule.host}
                  </div>
                </div>
              </div>

              {/* Host & Attendees Info */}
              <div className="p-3.5 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-start gap-2">
                  <User size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-700">Người chủ trì: </span>
                    <span className="font-black text-indigo-950">{selectedSchedule.host}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-700">Thành phần tham dự: </span>
                    <span className="text-slate-800">{selectedSchedule.attendees}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Agenda / Content */}
              <div>
                <div className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" />
                  <span>Nội dung cuộc họp & Chương trình làm việc chi tiết</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-800 leading-relaxed whitespace-pre-line text-xs font-normal">
                  {selectedSchedule.description || selectedSchedule.content || "Chưa có nội dung mô tả chi tiết cho sự kiện này."}
                </div>
              </div>

              {/* Notes */}
              {selectedSchedule.notes && (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs">
                  <span className="font-bold">Ghi chú hậu cần: </span>
                  {selectedSchedule.notes}
                </div>
              )}

              {/* Attached Files & Documents */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-indigo-600" />
                    <span>Tài liệu & Tệp tin đính kèm ({selectedSchedule.attachments?.length || 0})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => detailSchFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={13} /> Đính kèm thêm tệp...
                  </button>
                  <input
                    type="file"
                    ref={detailSchFileInputRef}
                    onChange={handleDetailSchFileUpload}
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                  />
                </div>

                {selectedSchedule.attachments && selectedSchedule.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedSchedule.attachments.map(att => (
                      <div
                        key={att.id}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {att.type === "image" ? (
                            <img
                              src={att.url}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 cursor-pointer shrink-0"
                              onClick={() => setPreviewAttachment(att)}
                            />
                          ) : att.type === "pdf" ? (
                            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex flex-col items-center justify-center shrink-0">
                              <span className="font-black text-[9px]">PDF</span>
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex flex-col items-center justify-center shrink-0">
                              <span className="font-black text-[9px]">DOC</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-xs truncate" title={att.name}>{att.name}</div>
                            <div className="text-[10px] text-slate-400">{att.size || "Tệp tài liệu"}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {att.type === "image" && att.url && (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white cursor-pointer"
                              title="Xem ảnh phóng to"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                          {att.url && (
                            <a
                              href={att.url}
                              download={att.name}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white cursor-pointer"
                              title="Tải về"
                            >
                              <Download size={13} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveDetailSchAttachment(att.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Xóa tệp"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    Chưa có văn bản hay tệp đính kèm nào cho sự kiện này.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} /> Xóa sự kiện
              </button>
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 1: CÀI ĐẶT NHẮC HẸN / LỊCH BÁO CÁO MỚI */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Header: Indigo GovTech */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <BellRing size={16} className="text-amber-400" /> Cài đặt Lịch Báo Cáo & Nhắc Việc Định Kỳ
              </h3>
              <button
                type="button"
                onClick={() => setShowAddReminderModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateReminder} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Reminder Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu đề báo cáo / Nhiệm vụ định kỳ *
                </label>
                <input
                  id="modal-new-rem-title"
                  name="newRemTitle"
                  type="text"
                  required
                  placeholder="Ví dụ: Báo cáo tuần nộp UBND Phường, Báo cáo công tác Đảng ngày 15..."
                  value={newRemTitle}
                  onChange={e => setNewRemTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Frequency Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tần suất lặp lại *</label>
                  <select
                    id="modal-new-rem-frequency"
                    name="newRemFrequency"
                    value={newRemFrequency}
                    onChange={e => setNewRemFrequency(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="daily">Hàng ngày (Daily)</option>
                    <option value="weekly">Hàng tuần [Ví dụ: Thứ Bảy] (Weekly)</option>
                    <option value="monthly">Hàng tháng [Ví dụ: Ngày 15] (Monthly)</option>
                    <option value="quarterly">Hàng quý (Quarterly)</option>
                    <option value="yearly">Hàng năm (Yearly)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ nhắc / Hạn nộp *</label>
                  <input
                    id="modal-new-rem-time"
                    name="newRemTime"
                    type="time"
                    required
                    value={newRemTime}
                    onChange={e => setNewRemTime(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Frequency Detail: Day of week / Day of month */}
              {newRemFrequency === "weekly" && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200">
                  <label className="block font-bold text-indigo-950 mb-1.5">
                    Chọn ngày trong tuần phải báo cáo:
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { val: 1, label: "T2" },
                      { val: 2, label: "T3" },
                      { val: 3, label: "T4" },
                      { val: 4, label: "T5" },
                      { val: 5, label: "T6" },
                      { val: 6, label: "T7" },
                      { val: 0, label: "CN" }
                    ].map(d => (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => setNewRemDayOfWeek(d.val)}
                        className={`py-2 rounded-lg font-bold text-xs cursor-pointer transition-all border ${
                          newRemDayOfWeek === d.val
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-indigo-700 mt-1.5 font-medium">
                    * Mặc định Thứ Bảy hàng tuần lúc {newRemTime} nộp báo cáo tình hình nhiệm vụ tuần.
                  </p>
                </div>
              )}

              {(newRemFrequency === "monthly" || newRemFrequency === "quarterly") && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200">
                  <label className="block font-bold text-indigo-950 mb-1">
                    Ngày trong tháng phải nộp báo cáo:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">Cứ vào ngày:</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newRemDayOfMonth}
                      onChange={e => setNewRemDayOfMonth(Number(e.target.value))}
                      className="w-20 p-2 text-center rounded-lg border border-slate-300 font-bold font-mono bg-white"
                    />
                    <span className="text-slate-600 font-semibold">hàng tháng (lúc {newRemTime})</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 mt-1.5 font-medium">
                    * Ví dụ: Cứ vào ngày 15 hàng tháng phải nộp báo cáo lên Ban Xây dựng Đảng, Đảng ủy, UBND, UBKT...
                  </p>
                </div>
              )}

              {newRemFrequency === "yearly" && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-indigo-950 mb-1">Ngày nộp:</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newRemDayOfMonth}
                      onChange={e => setNewRemDayOfMonth(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-indigo-950 mb-1">Tháng nộp:</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={newRemMonthOfYear}
                      onChange={e => setNewRemMonthOfYear(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Recipient Organization Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cơ quan / Cấp trên tiếp nhận báo cáo *
                </label>
                <select
                  id="modal-new-rem-recipient"
                  name="newRemRecipient"
                  value={isCustomRecipient ? "__CUSTOM__" : newRemRecipient}
                  onChange={e => {
                    if (e.target.value === "__CUSTOM__") {
                      setIsCustomRecipient(true);
                      setCustomRecipient("");
                    } else {
                      setIsCustomRecipient(false);
                      setNewRemRecipient(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {RECIPIENT_ORGS.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                  <option value="__CUSTOM__">✍️ Nhập cơ quan / đơn vị khác...</option>
                </select>

                {isCustomRecipient && (
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên cơ quan / đơn vị cấp trên tiếp nhận..."
                    value={customRecipient}
                    onChange={e => setCustomRecipient(e.target.value)}
                    className="mt-2 w-full p-2 rounded-xl border border-indigo-300 bg-indigo-50/30 font-medium focus:outline-none focus:border-indigo-600 animate-in fade-in"
                  />
                )}
              </div>

              {/* Responsible Unit & Person from 23 Chi hội */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                  Đơn vị & Cán bộ phụ trách lập báo cáo
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Đơn vị phụ trách:</label>
                    <select
                      id="modal-new-rem-unit"
                      name="newRemUnit"
                      value={newRemAssociationId}
                      onChange={e => handleRemUnitChange(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 text-xs"
                    >
                      {associationsList.map(assoc => (
                        <option key={assoc.id} value={assoc.id}>
                          {assoc.name} ({assoc.leaderName || "Chi hội"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Cán bộ lập báo cáo:</label>
                    <select
                      id="modal-new-rem-person"
                      name="newRemPerson"
                      value={isCustomRemPerson ? "__CUSTOM__" : newRemPersonName}
                      onChange={handleRemMemberChange}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 text-xs"
                    >
                      {remAssocMembers.map(m => (
                        <option key={m.id} value={m.fullName}>
                          {m.fullName} - {m.role}
                        </option>
                      ))}
                      <option value="__CUSTOM__">✍️ Nhập nhân sự khác...</option>
                    </select>
                  </div>
                </div>

                {isCustomRemPerson && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="Họ và tên cán bộ *"
                      required
                      value={newRemPersonName}
                      onChange={e => setNewRemPersonName(e.target.value)}
                      className="p-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Chức vụ"
                      value={newRemPersonRole}
                      onChange={e => setNewRemPersonRole(e.target.value)}
                      className="p-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại"
                      value={newRemPersonPhone}
                      onChange={e => setNewRemPersonPhone(e.target.value)}
                      className="p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Guidelines / Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Đề cương & Hướng dẫn nội dung báo cáo
                </label>
                <textarea
                  id="modal-new-rem-desc"
                  name="newRemDesc"
                  rows={2}
                  placeholder="Yêu cầu số liệu cần tổng hợp, biểu mẫu quy định, nội dung trọng tâm cần làm rõ khi nộp báo cáo..."
                  value={newRemDesc}
                  onChange={e => setNewRemDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Notification Channels & Auto-Task Creation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 text-xs block">Kênh thông báo & Tự động hóa:</span>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={newRemChannels.includes("in_app")}
                      onChange={e => {
                        if (e.target.checked) setNewRemChannels(prev => [...prev, "in_app"]);
                        else setNewRemChannels(prev => prev.filter(c => c !== "in_app"));
                      }}
                      className="rounded accent-indigo-600"
                    />
                    Chuông thông báo in-app
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={newRemChannels.includes("banner")}
                      onChange={e => {
                        if (e.target.checked) setNewRemChannels(prev => [...prev, "banner"]);
                        else setNewRemChannels(prev => prev.filter(c => c !== "banner"));
                      }}
                      className="rounded accent-indigo-600"
                    />
                    Banner đầu trang
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={newRemChannels.includes("zalo_sms")}
                      onChange={e => {
                        if (e.target.checked) setNewRemChannels(prev => [...prev, "zalo_sms"]);
                        else setNewRemChannels(prev => prev.filter(c => c !== "zalo_sms"));
                      }}
                      className="rounded accent-indigo-600"
                    />
                    Tin nhắn Zalo/SMS cán bộ
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200/80">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900">
                    <input
                      type="checkbox"
                      checked={newRemAutoCreateTask}
                      onChange={e => setNewRemAutoCreateTask(e.target.checked)}
                      className="rounded accent-indigo-600 w-4 h-4"
                    />
                    Tự động khởi tạo nhiệm vụ tương ứng trong bảng Phân công nhiệm vụ khi đến chu kỳ
                  </label>
                </div>
              </div>

              {/* Attach Template Document */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">Đính kèm mẫu biểu / Văn bản hướng dẫn</label>
                  <button
                    type="button"
                    onClick={() => remTemplateFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={12} /> Chọn tệp (Word/PDF)...
                  </button>
                  <input
                    type="file"
                    ref={remTemplateFileInputRef}
                    onChange={handleRemTemplateUpload}
                    multiple
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                  />
                </div>

                {newRemAttachments.length > 0 && (
                  <div className="space-y-1.5">
                    {newRemAttachments.map(att => (
                      <div key={att.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={14} className="text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({att.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewRemAttachments(prev => prev.filter(a => a.id !== att.id))}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <BellRing size={14} /> Lưu & Kích hoạt lịch báo cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NỘP BÁO CÁO ĐỊNH KỲ (SUBMIT REPORT) */}
      {submittingReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header: Emerald GovTech */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <h3 className="font-black text-sm flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-400" /> Nộp Báo Cáo Định Kỳ Lên Cấp Trên
              </h3>
              <button
                type="button"
                onClick={() => setSubmittingReminder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmSubmitReport} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Report Summary Card */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-slate-50 rounded-xl border border-emerald-200 space-y-2">
                <div className="font-black text-slate-900 text-sm">{submittingReminder.title}</div>
                <div className="flex items-center gap-1.5 text-indigo-950 font-bold">
                  <Building size={14} className="text-indigo-600" />
                  Nơi tiếp nhận: {submittingReminder.recipientOrg}
                </div>
                <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-emerald-100">
                  <span>Người nộp: <strong>{submittingReminder.responsiblePerson.name}</strong></span>
                  <span>Hạn chót: <strong className="text-rose-700 font-mono">{submittingReminder.nextDueDate}</strong></span>
                </div>
              </div>

              {/* Upload Report Document */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tệp báo cáo hoàn thiện / Bản ký scan có dấu đỏ *
                </label>
                <div
                  onClick={() => submitFileInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30 text-center cursor-pointer transition-colors"
                >
                  <UploadCloud size={24} className="mx-auto text-emerald-600 mb-1.5" />
                  <span className="font-bold text-slate-800 block text-xs">Bấm để tải lên tệp báo cáo (Word, PDF, Ảnh scan)</span>
                  <span className="text-[10px] text-slate-400">Hỗ trợ tối đa 20MB / tệp</span>
                  <input
                    type="file"
                    ref={submitFileInputRef}
                    onChange={handleSubmitReportFileUpload}
                    multiple
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                  />
                </div>

                {submitReportFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {submitReportFiles.map(file => (
                      <div key={file.id} className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck size={14} className="text-emerald-700 shrink-0" />
                          <span className="font-bold text-emerald-950 truncate">{file.name}</span>
                          <span className="text-[10px] text-emerald-600 font-mono">({file.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubmitReportFiles(prev => prev.filter(f => f.id !== file.id))}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submission Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú nộp báo cáo / Mã số công văn
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đã gửi bản cứng có chữ ký của Trưởng Ban ĐHKP qua Văn phòng UBND Phường, đồng thời lưu trữ bản số hóa..."
                  value={submitReportNotes}
                  onChange={e => setSubmitReportNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubmittingReminder(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCheck size={14} /> Xác nhận nộp báo cáo & Hoàn tất chu kỳ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XEM CHI TIẾT & LỊCH SỬ BÁO CÁO (SELECTED REMINDER) */}
      {selectedReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedReminder.id}
                </span>
                <h3 className="font-bold text-sm text-white truncate max-w-sm">
                  {selectedReminder.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReminder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500">Chu kỳ:</span>
                  <span className="font-bold text-indigo-900">{formatFrequencyText(selectedReminder)}</span>
                </div>
                <div>{getReminderStatusBadge(selectedReminder.status)}</div>
              </div>

              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <Building size={14} className="text-indigo-600" />
                  Cơ quan tiếp nhận: {selectedReminder.recipientOrg}
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <User size={13} className="text-slate-500" />
                  Cán bộ chịu trách nhiệm: <strong>{selectedReminder.responsiblePerson.name}</strong> ({selectedReminder.responsiblePerson.role})
                </div>
                {selectedReminder.responsiblePerson.phone && (
                  <div className="text-[11px] text-slate-500">
                    Hotline liên hệ: <a href={`tel:${selectedReminder.responsiblePerson.phone}`} className="font-mono font-bold text-emerald-700">{selectedReminder.responsiblePerson.phone}</a>
                  </div>
                )}
              </div>

              {selectedReminder.description && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Đề cương & Hướng dẫn:</span>
                  <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedReminder.description}
                  </p>
                </div>
              )}

              {/* Template attachments */}
              {selectedReminder.attachments && selectedReminder.attachments.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1.5">Mẫu biểu tải về:</span>
                  <div className="space-y-1.5">
                    {selectedReminder.attachments.map(att => (
                      <div key={att.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={16} className="text-indigo-600 shrink-0" />
                          <span className="font-bold text-slate-800 truncate">{att.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({att.size})</span>
                        </div>
                        {att.url && (
                          <a
                            href={att.url}
                            download={att.name}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1"
                          >
                            <Download size={12} /> Tải mẫu
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous submissions history */}
              {selectedReminder.submittedFiles && selectedReminder.submittedFiles.length > 0 && (
                <div>
                  <span className="font-bold text-emerald-800 block mb-1.5">Hồ sơ báo cáo đã nộp ({selectedReminder.submittedFiles.length} tệp):</span>
                  <div className="space-y-1.5">
                    {selectedReminder.submittedFiles.map(file => (
                      <div key={file.id} className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck size={14} className="text-emerald-700 shrink-0" />
                          <span className="font-bold text-emerald-950 truncate">{file.name}</span>
                          <span className="text-[10px] text-emerald-600 font-mono">({file.size})</span>
                        </div>
                        {file.url && (
                          <a
                            href={file.url}
                            download={file.name}
                            className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px]"
                          >
                            Tải file nộp
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const rem = selectedReminder;
                  setSelectedReminder(null);
                  handleDeleteReminder(rem.id);
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} /> Xóa lịch
              </button>
              <button
                type="button"
                onClick={() => setSelectedReminder(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 truncate text-xs font-bold">
                <ImageIcon size={15} className="text-emerald-400 shrink-0" />
                <span className="truncate">{previewAttachment.name}</span>
                {previewAttachment.size && (
                  <span className="text-[10px] text-slate-400 font-mono">({previewAttachment.size})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download size={13} /> Tải ảnh về máy
                </a>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-auto bg-slate-950/60">
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
