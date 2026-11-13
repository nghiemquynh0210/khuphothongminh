import { RecurringReminder, ScheduleEvent, TaskItem } from "../../types";

export const TASK_STORAGE_KEY = "kp3_community_tasks";
export const SCHEDULE_STORAGE_KEY = "kp3_community_schedules";
export const REMINDER_STORAGE_KEY = "kp3_recurring_reminders";

export const RECIPIENT_ORGS = [
  "Ủy ban Nhân dân (UBND) Phường An Phú",
  "Đảng ủy Phường An Phú",
  "Ban Xây dựng Đảng - Đảng ủy Phường An Phú",
  "Ủy ban Kiểm tra (UBKT) Đảng ủy Phường An Phú",
  "Công an Phường An Phú",
  "Ủy ban Mặt trận Tổ quốc (MTTQ) Phường An Phú",
  "Ban Điều hành Khu phố 3",
];

export const SCHEDULE_TYPES = [
  "Họp Chi bộ",
  "Họp Ban Điều hành KP3",
  "Họp Giao ban KP3",
  "Tuần tra ANTT",
  "Chủ Nhật Xanh",
  "Tiếp công dân",
  "Hội nghị Khu phố",
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: "TASK-001",
    title: "Tổ chức chiến dịch 'Chủ Nhật Xanh' dọn dẹp hẻm 124 đường KV AP12",
    description:
      "Vận động 100% hộ dân tại tuyến hẻm 124 AP12 tham gia phát quang bụi rậm, khơi thông cống rãnh chống ngập và dịch sốt xuất huyết.",
    unit: "Mạng lưới Tự quản KP3",
    associationId: "ASC_TOTRUONG",
    assignee: {
      name: "Bà Lê Thị Mai",
      role: "Trưởng Khu phố",
      unit: "Mạng lưới Tự quản KP3",
      phone: "0908 123 456",
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
        uploadedAt: "2026-10-10T08:00:00Z",
      },
      {
        id: "ATT-SEED-02",
        name: "Phan_cong_luc_luong_don_dep.docx",
        size: "128 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-10T08:30:00Z",
      },
    ],
  },
  {
    id: "TASK-002",
    title: "Kiểm tra rà soát PCCC tại 14 nhà trọ và cơ sở kinh doanh phế liệu",
    description:
      "Phối hợp Công an phường kiểm tra lối thoát nạn thứ 2, bình chữa cháy mini tại dãy nhà trọ trên đường X1.",
    unit: "Tổ ANTT cơ sở",
    associationId: "ASC_ANTT",
    assignee: {
      name: "Phạm Minh Tuấn",
      role: "Tổ trưởng ANTT",
      unit: "Tổ ANTT cơ sở",
      phone: "0918334455",
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
        uploadedAt: "2026-10-08T09:15:00Z",
      },
      {
        id: "ATT-SEED-04",
        name: "Hien_truong_loi_thoat_nan_co_so.jpg",
        size: "1.2 MB",
        type: "image",
        url: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?w=800",
        uploadedAt: "2026-10-08T10:00:00Z",
      },
    ],
  },
  {
    id: "TASK-003",
    title: "Cập nhật dữ liệu CCCD và mã định danh VNeID mức 2 cho 18 công dân tạm trú",
    description:
      "Hỗ trợ người lao động thuê trọ tại Khu phố 3 hoàn tất xác thực sinh trắc học và khai báo cư trú.",
    unit: "Ban Điều hành KP3",
    assignee: {
      name: "Ông Hoàng Văn Thái",
      role: "Thành viên Ban Điều hành KP3",
      unit: "Ban Điều hành KP3",
      phone: "0977 456 789",
    },
    creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
    priority: "Trung bình",
    status: "Đang thực hiện",
    progressPercent: 40,
    startDate: "2026-10-11",
    deadline: "2026-10-18",
    notes: "Đang liên hệ đại diện chủ nhà trọ lập danh sách.",
  },
  {
    id: "TASK-004",
    title: "Thu nộp Quỹ Vì người nghèo & Quỹ Khuyến học năm 2026 tại Khu phố 3",
    description:
      "Phát hành phiếu thu điện tử có VietQR đến từng hộ gia đình, công khai danh sách ủng hộ trên cổng khu phố.",
    unit: "Ban Công tác Mặt trận KP3",
    assignee: {
      name: "Ông Nguyễn Văn Hùng",
      role: "Bí thư Chi bộ KP3",
      unit: "Ban Công tác Mặt trận KP3",
      phone: "0912 345 678",
    },
    creator: "Trần Quốc Tuấn (Trưởng ban ĐHKP)",
    priority: "Cao",
    status: "Chờ xử lý",
    progressPercent: 15,
    startDate: "2026-10-12",
    deadline: "2026-10-25",
    notes: "Đã nhận mã QR động theo từng hộ gia đình.",
  },
  {
    id: "TASK-005",
    title: "Sửa chữa 2 bóng đèn chiếu sáng năng lượng mặt trời hẻm KV AP29",
    description:
      "Thay pin lưu trữ cho đèn chiếu sáng công cộng do bà con tuyến hẻm KV AP29 phản ánh chập chờn.",
    unit: "Ban Điều hành KP3",
    assignee: {
      name: "Bà Phạm Thị Lan",
      role: "Cán sự phụ trách KV AP28-30",
      unit: "Ban Điều hành KP3",
      phone: "0988 654 321",
    },
    creator: "Trần Quốc Tuấn (Trưởng ban ĐHKP)",
    priority: "Trung bình",
    status: "Hoàn thành",
    progressPercent: 100,
    startDate: "2026-10-05",
    deadline: "2026-10-10",
    completedAt: "2026-10-09",
    notes: "Đã bàn giao nghiệm thu đưa vào chiếu sáng an toàn.",
  },
  {
    id: "TASK-006",
    title: "Tổ chức thăm hỏi, tặng quà cho 3 Mẹ Việt Nam Anh Hùng & Gia đình chính sách",
    description:
      "Nhân dịp kỷ niệm ngày truyền thống, trao quà và kiểm tra điều kiện sinh hoạt gia đình có công.",
    unit: "Hội Phụ nữ",
    assignee: {
      name: "Bà Nguyễn Thu Hà",
      role: "Chi hội trưởng Phụ nữ KP3",
      unit: "Hội Phụ nữ",
      phone: "0934 567 890",
    },
    creator: "Đ/c Nguyễn Văn Hùng (Bí thư Chi bộ)",
    priority: "Cao",
    status: "Hoàn thành",
    progressPercent: 100,
    startDate: "2026-10-01",
    deadline: "2026-10-05",
    completedAt: "2026-10-04",
    notes: "Đã trao 3 phần quà trị giá 3.000.000đ từ Quỹ Đền ơn đáp nghĩa.",
  },
];

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
    description:
      "Đánh giá kết quả công tác tư tưởng, lãnh đạo phát triển kinh tế - xã hội, giữ gìn ANTT cơ sở tháng 9. Thảo luận và thông qua Nghị quyết lãnh đạo tháng 10/2026, trọng tâm thí điểm Chuyển đổi số & Cổng Khu phố thông minh.",
    content:
      "Đánh giá kết quả công tác tư tưởng, lãnh đạo phát triển kinh tế - xã hội, giữ gìn ANTT cơ sở tháng 9. Thảo luận và thông qua Nghị quyết lãnh đạo tháng 10/2026, trọng tâm thí điểm Chuyển đổi số & Cổng Khu phố thông minh.",
    notes: "Đánh giá công tác tháng 9 và triển khai mô hình Khu phố thông minh số hoá.",
    attachments: [
      {
        id: "ATT-SCH-01",
        name: "Du_thao_Nghi_quyet_Chi_bo_thang_10.docx",
        size: "245 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-02T15:00:00Z",
      },
    ],
  },
  {
    id: "SCH-002",
    title: "Họp giao ban Ban Điều hành & Lực lượng nòng cốt Khu phố 3",
    type: "Họp Giao Ban KP3",
    date: "2026-10-14",
    time: "08:30 - 10:30",
    location: "Hội trường Khu phố 3",
    host: "Ông Trần Quốc Tuấn - Trưởng ban Điều hành KP3",
    attendees: "Ban Điều hành KP3, CSKV & Đại diện các Chi hội",
    status: "Sắp diễn ra",
    description:
      "Rà soát tiến độ thu các loại Quỹ công ích; triển khai đợt cao điểm tuyên truyền kiểm tra an toàn PCCC tại các khu nhà trọ, cơ sở sản xuất kinh doanh có nguy cơ cháy nổ cao.",
    content:
      "Rà soát tiến độ thu các loại Quỹ công ích; triển khai đợt cao điểm tuyên truyền kiểm tra an toàn PCCC tại các khu nhà trọ, cơ sở sản xuất kinh doanh có nguy cơ cháy nổ cao.",
    notes: "Rà soát tiến độ thu Quỹ an sinh và triển khai kiểm tra PCCC nhà trọ.",
    attachments: [
      {
        id: "ATT-SCH-02",
        name: "Ke_hoach_PCCC_To1_14.pdf",
        size: "480 KB",
        type: "pdf",
        url: "#",
        uploadedAt: "2026-10-13T08:00:00Z",
      },
    ],
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
    description:
      "Kiểm tra tạm trú, nắm tình hình cư trú tại các dãy nhà trọ công nhân; tuần tra phòng ngừa trộm cắp, đua xe trái phép và tụ tập gây rối trật tự công cộng.",
    notes: "Tập trung kiểm tra các tụ điểm thanh thiếu niên tụ tập đêm khuya.",
  },
  {
    id: "SCH-004",
    title: "Ra quân ngày 'Chủ Nhật Xanh' dọn vệ sinh tuyến hẻm kiểu mẫu KP3",
    type: "Chủ Nhật Xanh",
    date: "2026-10-18",
    time: "06:30 - 09:30",
    location: "Điểm tập kết: Đầu hẻm 124 đường KV AP12",
    host: "Đ/c Bí thư Chi đoàn TN & Ban Điều hành KP3",
    attendees: "Đoàn viên thanh niên, Hội viên Phụ nữ, Cư dân Khu phố 3",
    status: "Sắp diễn ra",
    description:
      "Phát động toàn dân ra quân quét dọn, bóc xóa quảng cáo sai quy định, khơi thông dòng chảy thoát nước chống ngập cục bộ và phòng trừ muỗi sốt xuất huyết.",
    notes: "Chuẩn bị bao đựng rác, chổi cào và xe gom rác chuyên dụng.",
    attachments: [
      {
        id: "ATT-SCH-04",
        name: "So_do_tuyen_hem_don_ve_sinh.jpg",
        size: "820 KB",
        type: "image",
        url: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800",
        uploadedAt: "2026-10-16T14:30:00Z",
      },
    ],
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
    description:
      "Lắng nghe tâm tư, nguyện vọng của nhân dân; giải đáp các thủ tục hành chính liên quan đến đất đai, cư trú, cấp đổi CCCD và hướng dẫn nộp hồ sơ Dịch vụ công qua VNeID.",
    notes: "Hướng dẫn thực hiện dịch vụ công trực tuyến và ký xác nhận đơn thư.",
  },
];

export const INITIAL_REMINDERS: RecurringReminder[] = [
  {
    id: "REM-001",
    title: "Báo cáo tình hình thực hiện nhiệm vụ & trật tự cơ sở tuần",
    description:
      "Tổng hợp tiến độ xử lý phản ánh 1022, thu các loại quỹ công ích, an toàn PCCC nhà trọ và công tác tuần tra bảo đảm ANTT trong tuần để nộp lên Thường trực UBND Phường An Phú.",
    frequency: "weekly",
    frequencyDetail: {
      time: "16:30",
      dayOfWeek: 6,
    },
    recipientOrg: "Ủy ban Nhân dân (UBND) Phường An Phú",
    responsibleUnit: "Ban điều hành khu phố",
    responsiblePerson: {
      name: "Nguyễn Trung Huy",
      role: "Trưởng Ban điều hành",
      phone: "0909123888",
    },
    notifyChannels: ["in_app", "banner", "zalo_sms"],
    isActive: true,
    nextDueDate: "2026-11-14",
    status: "Sắp đến hạn",
    attachments: [
      {
        id: "ATT-REM-01",
        name: "Mau_Bao_cao_tuan_UBND_Phuong_AP.docx",
        size: "142 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-01T08:00:00Z",
      },
    ],
    autoCreateTask: true,
    createdAt: "2026-10-01",
  },
  {
    id: "REM-002",
    title: "Báo cáo công tác tư tưởng & xây dựng tổ chức Đảng định kỳ tháng",
    description:
      "Báo cáo tình hình tư tưởng cán bộ, Đảng viên, kết quả sinh hoạt Chi bộ định kỳ ngày 3, tiến độ bồi dưỡng quần chúng ưu tú tạo nguồn phát triển Đảng viên mới nộp Ban Xây dựng Đảng.",
    frequency: "monthly",
    frequencyDetail: {
      time: "09:00",
      dayOfMonth: 15,
    },
    recipientOrg: "Ban Xây dựng Đảng - Đảng ủy Phường An Phú",
    responsibleUnit: "Chi bộ Đảng",
    responsiblePerson: {
      name: "Nguyễn Văn Hùng",
      role: "Bí thư Chi bộ KP3",
      phone: "0903829112",
    },
    notifyChannels: ["in_app", "banner"],
    isActive: true,
    nextDueDate: "2026-11-15",
    status: "Hôm nay đến hạn",
    attachments: [
      {
        id: "ATT-REM-02",
        name: "De_cuong_Bao_cao_Xay_dung_Dang_Dinh_ky.docx",
        size: "215 KB",
        type: "word",
        url: "#",
        uploadedAt: "2026-10-01T08:00:00Z",
      },
    ],
    autoCreateTask: true,
    createdAt: "2026-10-01",
  },
  {
    id: "REM-003",
    title: "Báo cáo giám sát kỷ luật Đảng & phòng chống tiêu cực định kỳ",
    description:
      "Rà soát việc chấp hành Quy định những điều Đảng viên không được làm, kết quả giải quyết đơn thư khiếu nại tố cáo và giám sát chuyên đề nộp Ủy ban Kiểm tra Đảng ủy Phường.",
    frequency: "monthly",
    frequencyDetail: {
      time: "10:00",
      dayOfMonth: 20,
    },
    recipientOrg: "Ủy ban Kiểm tra (UBKT) Đảng ủy Phường An Phú",
    responsibleUnit: "Chi bộ Đảng",
    responsiblePerson: {
      name: "Lê Văn Sơn",
      role: "Phó Ban điều hành - Phụ trách Kiểm tra",
      phone: "0944112233",
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
        uploadedAt: "2026-10-01T08:00:00Z",
      },
    ],
    autoCreateTask: false,
    createdAt: "2026-10-01",
  },
  {
    id: "REM-004",
    title: "Điểm danh & Giao ban nhanh tình hình ANTT - PCCC cuối ngày",
    description:
      "Cập nhật quân số trực tổ ANTT cơ sở, tình hình trật tự giao thông - đô thị tại trục ĐT.743B và hẻm nhánh, các trường hợp tạm trú mới phát sinh trước 17:00 hàng ngày.",
    frequency: "daily",
    frequencyDetail: {
      time: "17:00",
    },
    recipientOrg: "Công an Phường An Phú & Ban Điều hành KP3",
    responsibleUnit: "Tổ Bảo vệ ANTT",
    responsiblePerson: {
      name: "Đại úy CSKV & Tổ trưởng ANTT",
      role: "Lực lượng bảo đảm ANTT cơ sở",
      phone: "0908 999 888",
    },
    notifyChannels: ["in_app", "zalo_sms"],
    isActive: true,
    nextDueDate: "2026-11-10",
    status: "Hôm nay đến hạn",
    autoCreateTask: false,
    createdAt: "2026-10-01",
  },
  {
    id: "REM-005",
    title: "Báo cáo tổng kết công tác năm & Đăng ký thi đua cơ sở",
    description:
      "Tổng hợp toàn diện kết quả thực hiện các chỉ tiêu kinh tế - xã hội, ANTT, an sinh xã hội, xây dựng đời sống văn hóa toàn Khu phố 3 trong năm để báo cáo Thường trực Đảng ủy - HĐND - UBND Phường.",
    frequency: "yearly",
    frequencyDetail: {
      time: "08:30",
      dayOfMonth: 15,
      monthOfYear: 12,
    },
    recipientOrg: "Thường trực Đảng ủy - UBND Phường An Phú",
    responsibleUnit: "Ban điều hành khu phố",
    responsiblePerson: {
      name: "Trần Quốc Tuấn",
      role: "Trưởng ban ĐHKP",
      phone: "0908 123 456",
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
        uploadedAt: "2026-10-01T08:00:00Z",
      },
    ],
    autoCreateTask: true,
    createdAt: "2026-10-01",
  },
];

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};

export const detectFileType = (file: File): "image" | "pdf" | "word" | "other" => {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
    return "image";
  }
  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (mime.includes("word") || mime.includes("officedocument") || /\.(doc|docx)$/i.test(name)) {
    return "word";
  }
  return "other";
};

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

export function loadStoredTasks(): TaskItem[] {
  try {
    const saved = localStorage.getItem(TASK_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const freshMap = new Map(INITIAL_TASKS.map((t) => [t.id, t]));
        let migrated = false;
        const normalized = (parsed as TaskItem[]).map((item) => {
          const fresh = freshMap.get(item.id);
          if (
            fresh &&
            (/Tổ\s*(?:1[0-4]|[1-9])|Tổ\s*(?:trưởng\s*)?dân\s*phố/i.test(item.title) ||
              /Tổ\s*(?:1[0-4]|[1-9])|Tổ\s*(?:trưởng\s*)?dân\s*phố/i.test(item.description) ||
              /Tổ\s*(?:1[0-4]|[1-9])|Tổ\s*(?:trưởng\s*)?dân\s*phố/i.test(item.unit))
          ) {
            migrated = true;
            return { ...item, title: fresh.title, description: fresh.description, unit: fresh.unit, assignee: fresh.assignee };
          }
          return item;
        });
        if (migrated) saveStoredTasks(normalized);
        return normalized;
      }
    }
  } catch {}
  return INITIAL_TASKS;
}

export function saveStoredTasks(tasks: TaskItem[]): void {
  try {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

export { syncTasksDiffToDb } from "../../utils/supabaseSync";
