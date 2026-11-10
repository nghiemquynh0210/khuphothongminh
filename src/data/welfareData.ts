import { WelfareSubCategory, WelfareBenefit, WelfareCampaign, EmergencySupportRecord } from "../types";

export const DEFAULT_WELFARE_SUBCATEGORIES: WelfareSubCategory[] = [
  {
    id: "SUB_NCC",
    name: "Người có công",
    code: "NCC",
    color: "rose",
    iconName: "Medal",
    description: "Thương binh, bệnh binh, người hoạt động kháng chiến, người có công giúp đỡ cách mạng và thân nhân được hưởng định suất.",
    criteria: "Có Huân/Huy chương kháng chiến, Giấy chứng nhận thương binh, bệnh binh, hồ sơ lưu trữ tại Phòng LĐ-TB&XH.",
    standardBenefits: [
      "Trợ cấp ưu đãi hàng tháng theo Pháp lệnh Người có công",
      "Thẻ BHYT miễn phí 100% (Mã quyền lợi cao nhất)",
      "Quà tặng Chủ tịch nước & UBND TP dịp 27/7 và Tết Nguyên Đán",
      "Hỗ trợ xây dựng & sửa chữa Nhà tình nghĩa (Mức 80.000.000đ)",
      "Chế độ điều dưỡng phục hồi sức khỏe định kỳ hàng năm",
      "Hỗ trợ phương tiện trợ giúp sinh hoạt (xe lăn, dụng cụ chỉnh hình)"
    ],
    isCustom: false,
    createdAt: "2026-01-01"
  },
  {
    id: "SUB_HN",
    name: "Hộ nghèo/Cận nghèo",
    code: "HN",
    color: "amber",
    iconName: "HeartHandshake",
    description: "Hộ gia đình có mức thu nhập bình quân và thiếu hụt các dịch vụ xã hội cơ bản theo chuẩn nghèo đa chiều TP.HCM.",
    criteria: "Được bình xét dân chủ tại Tổ dân phố, có mã số quản lý hộ nghèo/cận nghèo cấp phường phê duyệt.",
    standardBenefits: [
      "Trợ cấp tiền mặt bảo trợ xã hội hàng tháng",
      "Cấp thẻ BHYT hộ nghèo miễn phí 100%",
      "Hỗ trợ tiền điện sinh hoạt 50 kWh/tháng",
      "Miễn giảm 100% học phí & học bổng khuyến học cho con em",
      "Cấp phát túi quà an sinh & gạo cứu trợ định kỳ hàng quý",
      "Hỗ trợ vay vốn ưu đãi Ngân hàng CSXH lãi suất 0% tạo sinh kế",
      "Hỗ trợ chi phí sửa chữa chống dột Nhà đại đoàn kết"
    ],
    isCustom: false,
    createdAt: "2026-01-01"
  },
  {
    id: "SUB_NCT",
    name: "Người cao tuổi",
    code: "NCT",
    color: "emerald",
    iconName: "Smile",
    description: "Công dân từ 75-80 tuổi trở lên không có lương hưu hoặc người cao tuổi neo đơn, tàn tật không nơi nương tựa.",
    criteria: "Độ tuổi theo CCCD (từ 75-80 tuổi trở lên không có lương hưu hoặc từ 60 tuổi neo đơn có xác nhận của khu phố).",
    standardBenefits: [
      "Trợ cấp xã hội người cao tuổi hàng tháng",
      "Cấp thẻ BHYT bảo trợ người cao tuổi miễn phí",
      "Mừng thọ & quà tặng Ngày Người cao tuổi 1/10 và Tết Nguyên Đán",
      "Chi hội Chữ thập đỏ & Phụ nữ KP3 cử cán bộ chăm sóc tại nhà",
      "Khám sức khỏe tổng quát và cấp phát thuốc định kỳ miễn phí",
      "Hỗ trợ mai táng phí khi từ trần theo quy định"
    ],
    isCustom: false,
    createdAt: "2026-01-01"
  },
  {
    id: "SUB_TEMC",
    name: "Trẻ em mồ côi",
    code: "TEMC",
    color: "cyan",
    iconName: "Baby",
    description: "Trẻ em dưới 16 tuổi (hoặc dưới 22 tuổi đang học đại học) mồ côi cả cha và mẹ hoặc mồ côi cha/mẹ có hoàn cảnh đặc biệt khó khăn.",
    criteria: "Có Giấy chứng tử của cha/mẹ, biên bản thẩm tra hoàn cảnh gia đình của Hội Bảo trợ Trẻ em & Tổ dân phố.",
    standardBenefits: [
      "Trợ cấp nuôi dưỡng hàng tháng theo Nghị định 20/2021/NĐ-CP",
      "Cấp thẻ BHYT trẻ em miễn phí 100%",
      "Miễn toàn bộ học phí và các khoản thu tại các trường công lập",
      "Học bổng 'Nâng bước em tới trường' hàng năm (3.000.000đ/suất)",
      "Chương trình Mẹ đỡ đầu từ Chi hội Phụ nữ & Đoàn Thanh niên KP3",
      "Tặng quà dịp Quốc tế Thiếu nhi 1/6 và Tết Trung thu"
    ],
    isCustom: false,
    createdAt: "2026-01-01"
  },
  {
    id: "SUB_GDCS",
    name: "Gia đình chính sách",
    code: "GDCS",
    color: "indigo",
    iconName: "ShieldCheck",
    description: "Gia đình Liệt sĩ, Mẹ Việt Nam Anh hùng, gia đình thương binh nặng, gia đình có công bảo bọc cán bộ cách mạng.",
    criteria: "Hồ sơ chính sách lưu trữ tại UBND Phường, có Bằng Tổ quốc ghi công hoặc Quyết định công nhận của Nhà nước.",
    standardBenefits: [
      "Trợ cấp tuất ưu đãi hàng tháng theo chế độ chính sách",
      "Cấp thẻ BHYT thân nhân người có công",
      "Phụng dưỡng hàng tháng (Mẹ Việt Nam Anh hùng)",
      "Được ưu tiên giao đất, thuê nhà ở xã hội hoặc miễn thuế đất",
      "Thăm hỏi, tặng quà trọng thể của Đoàn công tác Thành phố và Phường",
      "Hỗ trợ học nghề, giải quyết việc làm cho con em gia đình chính sách"
    ],
    isCustom: false,
    createdAt: "2026-01-01"
  }
];

export const ALL_STANDARD_BENEFITS: WelfareBenefit[] = [
  {
    id: "BEN-01",
    name: "Trợ cấp tiền mặt thường xuyên hàng tháng",
    category: "Trợ cấp trực tiếp",
    description: "Chi trả tiền mặt hoặc chuyển khoản định kỳ vào ngày 5 đến ngày 10 hàng tháng qua tài khoản An sinh xã hội.",
    standardValue: "Theo mức quy định (1.000.000đ - 3.500.000đ/tháng)",
    frequency: "Hàng tháng"
  },
  {
    id: "BEN-02",
    name: "Cấp thẻ Bảo hiểm Y tế (BHYT) miễn phí 100%",
    category: "Y tế & Sức khỏe",
    description: "Nhà nước và Ngân sách chi trả 100% kinh phí cấp thẻ BHYT có mã quyền lợi cao nhất cho đối tượng bảo trợ.",
    standardValue: "100% chi phí thẻ BHYT",
    frequency: "Hàng năm"
  },
  {
    id: "BEN-03",
    name: "Tặng quà dịp Tết Nguyên Đán & Lễ lớn",
    category: "Chăm lo lễ tết",
    description: "Gồm tiền mặt và phần quà nhu yếu phẩm (bánh mứt, gạo, dầu ăn) từ Thành phố, Phường và Quỹ Vì người nghèo KP3.",
    standardValue: "1.000.000đ - 2.500.000đ / dịp",
    frequency: "Dịp Lễ/Tết"
  },
  {
    id: "BEN-04",
    name: "Hỗ trợ tiền điện sinh hoạt hộ nghèo/chính sách",
    category: "Hỗ trợ đời sống",
    description: "Hỗ trợ tiền điện sinh hoạt hàng tháng tương đương mức sử dụng 50 kWh/hộ/tháng theo biểu giá quy định.",
    standardValue: "60.000đ/hộ/tháng",
    frequency: "Hàng tháng"
  },
  {
    id: "BEN-05",
    name: "Học bổng khuyến học & Miễn giảm học phí",
    category: "Giáo dục",
    description: "Miễn giảm 100% học phí công lập và trao tặng học bổng 'Tiếp sức đến trường' đầu năm học mới.",
    standardValue: "2.000.000đ - 3.000.000đ / năm",
    frequency: "Hàng năm"
  },
  {
    id: "BEN-06",
    name: "Hỗ trợ xây dựng & Sửa chữa Nhà tình nghĩa / Đại đoàn kết",
    category: "Nhà ở",
    description: "Kinh phí vận động từ các nguồn lực xã hội hóa và Quỹ Đền ơn đáp nghĩa xây mới hoặc chống dột nhà ở.",
    standardValue: "40.000.000đ - 80.000.000đ / căn",
    frequency: "Đột xuất"
  },
  {
    id: "BEN-07",
    name: "Khám bệnh & Cấp phát thuốc miễn phí tận nhà",
    category: "Y tế & Sức khỏe",
    description: "Trạm y tế Phường phối hợp Chi hội Thầy thuốc tình nguyện khám sàng lọc định kỳ cho người cao tuổi, tàn tật.",
    standardValue: "Miễn phí 100%",
    frequency: "Hàng quý"
  },
  {
    id: "BEN-08",
    name: "Hỗ trợ chi phí mai táng khi từ trần",
    category: "Bảo trợ xã hội",
    description: "Thân nhân hoặc người lo mai táng cho đối tượng hưởng trợ cấp được hỗ trợ chi phí mai táng theo Nghị định 20.",
    standardValue: "10.000.000đ - 18.000.000đ / trường hợp",
    frequency: "Đột xuất"
  }
];

export const INITIAL_CAMPAIGNS: WelfareCampaign[] = [
  {
    id: "CAM-001",
    title: "Chương trình 'Tết Nhân Ái 2026 - Xuân Ấm Tình Khu Phố 3'",
    type: "batch",
    targetCategories: ["Hộ nghèo/Cận nghèo", "Người có công", "Trẻ em mồ côi", "Gia đình chính sách"],
    cashAmountPerPerson: 1000000,
    giftDescription: "Túi quà Tết cao cấp: 10kg Gạo ST25, 2L Dầu ăn Tường An, Hộp bánh Danisa, Hạt điều, Nước ngọt (Trị giá 500.000đ)",
    totalBudget: 36000000,
    fundingSource: "Quỹ Vì người nghèo KP3 & Ngân sách UBND Phường An Phú",
    disbursementDate: "2026-01-25",
    location: "Nhà văn hóa Khu phố 3 (Số 42 Lương Định Của)",
    status: "Đã hoàn tất",
    recipientIds: ["WF001", "WF002", "WF003", "WF004"],
    recipientCount: 24,
    notes: "Đã tổ chức trao trực tiếp 20 phần tại hội trường, 4 phần của các cụ già yếu cán bộ đến tận nhà trao tặng.",
    createdAt: "2026-01-10"
  },
  {
    id: "CAM-002",
    title: "Đợt trao tặng Gạo & Nhu yếu phẩm Quý 4/2026",
    type: "batch",
    targetCategories: ["Hộ nghèo/Cận nghèo", "Người cao tuổi"],
    cashAmountPerPerson: 300000,
    giftDescription: "25kg Gạo thơm Lúa Vàng + 1 Thùng mì tôm Omachi + 1 Lốc sữa Vinamilk",
    totalBudget: 15600000,
    fundingSource: "Chi hội Chữ thập đỏ KP3 & Tập đoàn Novaland tài trợ",
    disbursementDate: "2026-11-15",
    location: "Văn phòng Ban Điều hành Khu phố 3",
    status: "Đã duyệt chi",
    recipientIds: ["WF002", "WF003"],
    recipientCount: 18,
    notes: "Đã chuẩn bị sẵn phiếu nhận quà và danh sách ký nhận, dự kiến phát quà từ 08:30 sáng ngày 15/11/2026.",
    createdAt: "2026-11-01"
  },
  {
    id: "CAM-003",
    title: "Đợt trao tặng Học bổng Khuyến học 'Nâng bước em tới trường' Năm học 2026 - 2027",
    type: "batch",
    targetCategories: ["Trẻ em mồ côi", "Hộ nghèo/Cận nghèo"],
    cashAmountPerPerson: 2000000,
    giftDescription: "1 Bộ Balo học sinh chống gù + 20 Quyển tập cao cấp + Bộ dụng cụ học tập Deli",
    totalBudget: 22000000,
    fundingSource: "Chi hội Khuyến học & Chi hội Doanh nghiệp Phường An Phú",
    disbursementDate: "2026-08-28",
    location: "Hội trường UBND Phường An Phú",
    status: "Đã hoàn tất",
    recipientIds: ["WF004"],
    recipientCount: 11,
    notes: "Khen thưởng động viên các em học sinh có hoàn cảnh khó khăn đạt học sinh giỏi, vượt khó học tốt.",
    createdAt: "2026-08-15"
  },
  {
    id: "CAM-004",
    title: "Đợt Thăm hỏi, Tri ân & Tặng quà Kỷ niệm Ngày Thương binh - Liệt sĩ 27/7",
    type: "batch",
    targetCategories: ["Người có công", "Gia đình chính sách"],
    cashAmountPerPerson: 1500000,
    giftDescription: "Hộp quà tri ân của Đảng ủy - HĐND - UBND - UBMTTQVN Phường An Phú",
    totalBudget: 28500000,
    fundingSource: "Ngân sách Nhà nước chi trả ưu đãi người có công",
    disbursementDate: "2026-07-26",
    location: "Đoàn lãnh đạo thăm hỏi trực tiếp tại tư gia các gia đình thương binh, liệt sĩ",
    status: "Đã hoàn tất",
    recipientIds: ["WF001"],
    recipientCount: 19,
    notes: "Đoàn do Bí thư Chi bộ và Trưởng Ban điều hành dẫn đầu, ân cần thăm hỏi sức khỏe các đồng chí thương binh, bệnh binh.",
    createdAt: "2026-07-15"
  }
];

export const INITIAL_EMERGENCY_RECORDS: EmergencySupportRecord[] = [
  {
    id: "EMG-001",
    recipientId: "WF003",
    recipientName: "Nguyễn Thị Đào",
    cccd: "079035002244",
    address: "56/2 Lương Định Của, Phường An Phú",
    category: "Người cao tuổi",
    amount: 5000000,
    giftItems: "Hộp sữa dinh dưỡng Ensure Gold + Tã người lớn và thuốc bổ",
    reason: "Cụ bà 85 tuổi neo đơn bị té ngã gãy xương đùi, cần viện phí phẫu thuật khẩn cấp tại Bệnh viện Lê Văn Thịnh.",
    disbursedDate: "2026-11-02",
    disbursedBy: "Nguyễn Trung Huy (Trưởng ban ĐHKP)",
    approver: "Trần Quốc Tuấn (Bí thư Chi bộ)",
    fundingSource: "Quỹ Cứu trợ khẩn cấp & Tương thân tương ái KP3",
    status: "Đã hỗ trợ ngay",
    notes: "Đã trao tiền mặt tận tay cho người giám hộ tại bệnh viện, có biên nhận đầy đủ."
  },
  {
    id: "EMG-002",
    recipientId: "WF002",
    recipientName: "Lê Văn Hộ",
    cccd: "079055009988",
    address: "18/5 Lương Định Của, Phường An Phú",
    category: "Hộ nghèo/Cận nghèo",
    amount: 3500000,
    giftItems: "50kg Gạo + 2 Thùng mì tôm + Nhu yếu phẩm sinh hoạt",
    reason: "Hộ nghèo bị chập điện gây cháy một phần mái tôn và gian bếp, hư hỏng đồ dùng gia đình đột xuất.",
    disbursedDate: "2026-10-18",
    disbursedBy: "Lê Văn Sơn (Phó Ban điều hành KP3)",
    approver: "Nguyễn Trung Huy (Trưởng ban ĐHKP)",
    fundingSource: "Quỹ Vì người nghèo & Vận động đột xuất tổ dân phố",
    status: "Đã hỗ trợ ngay",
    notes: "Đồng thời Chi đoàn Thanh niên đã cử lực lượng hỗ trợ lợp lại mái tôn và dọn dẹp hiện trường an toàn."
  },
  {
    id: "EMG-003",
    recipientId: "WF004",
    recipientName: "Phạm Hoàng Sơn",
    cccd: "079109001234",
    address: "42/15 Lương Định Của, Phường An Phú",
    category: "Trẻ em mồ côi",
    amount: 2500000,
    giftItems: "Bộ quần áo mới + Đôi giày học sinh + BHYT bổ sung",
    reason: "Chi phí nhập học đầu năm và phát sinh viện phí sốt xuất huyết nhập viện điều trị.",
    disbursedDate: "2026-09-05",
    disbursedBy: "Chi hội Trưởng Phụ nữ KP3",
    approver: "Nguyễn Văn Hùng (Bí thư Chi bộ)",
    fundingSource: "Quỹ Bảo trợ Trẻ em & Chương trình Mẹ đỡ đầu KP3",
    status: "Đã hỗ trợ ngay",
    notes: "Cháu đã hồi phục sức khỏe và tiếp tục đi học chuyên cần."
  }
];

// LocalStorage helpers
export const getStoredSubCategories = (): WelfareSubCategory[] => {
  try {
    const saved = localStorage.getItem("kp3_welfare_subcategories");
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_WELFARE_SUBCATEGORIES;
};

export const saveStoredSubCategories = (data: WelfareSubCategory[]) => {
  try {
    localStorage.setItem("kp3_welfare_subcategories", JSON.stringify(data));
  } catch {}
};

export const getStoredCampaigns = (): WelfareCampaign[] => {
  try {
    const saved = localStorage.getItem("kp3_welfare_campaigns");
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_CAMPAIGNS;
};

export const saveStoredCampaigns = (data: WelfareCampaign[]) => {
  try {
    localStorage.setItem("kp3_welfare_campaigns", JSON.stringify(data));
  } catch {}
};

export const getStoredEmergencyRecords = (): EmergencySupportRecord[] => {
  try {
    const saved = localStorage.getItem("kp3_welfare_emergency");
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_EMERGENCY_RECORDS;
};

export const saveStoredEmergencyRecords = (data: EmergencySupportRecord[]) => {
  try {
    localStorage.setItem("kp3_welfare_emergency", JSON.stringify(data));
  } catch {}
};
