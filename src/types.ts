export interface Resident {
  id: string;
  fullName: string;
  gender: "Nam" | "Nữ";
  birthDate: string;
  cccd: string;
  phone: string;
  status: "Thường trú" | "Tạm trú" | "Tạm vắng";
  occupation: string;
  address: string;
  householdId: string;
  relationToOwner: string;
  avatar?: string;
  joinDate?: string;
  
  // Extended demographic & administrative fields (CSDL Quốc gia về Dân cư / Đề án 06)
  ethnicity?: string;              // Dân tộc (Kinh, Hoa, Tày...)
  religion?: string;               // Tôn giáo (Không, Phật giáo, Công giáo...)
  nationality?: string;            // Quốc tịch (Việt Nam, Hàn Quốc, Anh...)
  hometown?: string;               // Quê quán
  permanentAddress?: string;       // Nơi thường trú gốc (Cột H ở Thường trú, Cột J ở Tạm trú)
  temporaryAddress?: string;       // Nơi ở hiện nay / Tạm trú (Cột J ở Thường trú, Cột G ở Tạm trú)
  currentAddress?: string;         // Chỗ ở hiện tại
  education?: string;              // Trình độ học vấn
  fatherName?: string;             // Họ tên cha (Cột K ở Thường trú)
  motherName?: string;             // Họ tên mẹ (Cột L ở Thường trú)
  temporaryRegDate?: string;       // Ngày đăng ký tạm trú (Cột H ở Tạm trú)
  temporaryExpDate?: string;       // Ngày hết hạn tạm trú (Cột I ở Tạm trú)
  managementStatus?: string;       // Tình trạng quản lý
  maritalStatus?: "Độc thân" | "Đã kết hôn" | "Ly hôn" | "Góa"; // Tình trạng hôn nhân
  workplace?: string;              // Nơi làm việc / Cơ quan công tác
  idIssueDate?: string;            // Ngày cấp CCCD / Hộ chiếu
  idIssuePlace?: string;           // Nơi cấp CCCD / Hộ chiếu
  healthInsuranceNumber?: string;  // Mã BHYT
  militaryServiceStatus?: string;  // Tình trạng nghĩa vụ quân sự
  policyGroup?: string;            // Nhóm chính sách / Đoàn thể (Đảng viên, Thương binh, Người cao tuổi...)
  emergencyContact?: string;       // Người liên hệ khẩn cấp (Họ tên - SĐT)
  notes?: string;                  // Ghi chú cư trú

  // Quản lý Dân cư Người nước ngoài cư trú (Foreign Resident Management)
  isForeigner?: boolean;                           // Là người nước ngoài cư trú
  passportNumber?: string;                         // Số hộ chiếu
  passportExpiryDate?: string;                     // Ngày hết hạn hộ chiếu
  visaOrCardType?: "Thẻ tạm trú (TRC)" | "Thẻ thường trú (PRC)" | "Thị thực LĐ" | "Thị thực ĐT" | "Thị thực TT" | "Miễn thị thực / E-Visa"; // Loại thị thực / Thẻ cư trú
  visaOrCardNumber?: string;                       // Số thẻ tạm trú / Thị thực
  visaValidFrom?: string;                          // Giá trị từ ngày
  visaValidUntil?: string;                         // Thời hạn cư trú đến ngày
  temporaryRegistrationCode?: string;              // Mã khai báo tạm trú trực tuyến CA Phường
  temporaryRegistrationDate?: string;              // Ngày khai báo tạm trú
  temporaryRegistrationStatus?: "Đã khai báo" | "Chờ xác nhận" | "Chưa khai báo" | "Hết hạn"; // Tình trạng khai báo tạm trú
  workPermitNumber?: string;                       // Số giấy phép lao động (GPLĐ) hoặc Miễn GPLĐ
  sponsoringOrganization?: string;                 // Cơ quan / Doanh nghiệp bảo lãnh
  landlordContact?: string;                        // Chủ nhà / Quản lý cơ sở lưu trú (Họ tên - SĐT)
}

export interface Household {
  id: string;
  code: string; // e.g. HK-301
  ownerName: string;
  address: string;
  memberCount: number;
  type?: "Thường trú" | "Tạm trú";
  coordinates?: string;
  members: {
    name: string;
    relation: string;
    cccd: string;
    phone?: string;
    birthYear: number;
  }[];
}

export interface BusinessFile {
  name: string;
  url: string;
  type: "image" | "pdf";
  size?: string;
  uploadDate?: string;
}

export interface InspectionLog {
  id: string;
  date: string;
  result: "Đạt chuẩn" | "Cảnh cáo" | "Không đạt" | "Yêu cầu khắc phục";
  inspector: string;
  note: string;
  recommendation?: string;
  penalties?: string;
}

export interface ForeignWorker {
  name: string;
  nationality: string;
  passportOrCode: string;
  position: string;
  temporaryResidenceStatus: "Đã khai báo tạm trú" | "Chưa khai báo" | "Đang làm thủ tục";
}

export interface BusinessChangeLog {
  id: string;
  date: string;
  type: "Mở mới" | "Chuyển địa điểm" | "Thay đổi ngành nghề" | "Thay đổi người đại diện" | "Tạm ngừng" | "Hoạt động trở lại" | "Khác";
  description: string;
  recordedBy: string;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  industryGroup?: string; // Nhóm phân loại ngành nghề (Ăn uống, Đời sống, Bán lẻ, Y tế, Lưu trú...)
  owner: string;
  phone: string;
  address: string;
  licenseNumber: string;
  status: "Đang hoạt động" | "Tạm ngưng" | "Chờ duyệt" | "Chuyển địa điểm" | "Chưa xác minh";
  employeeCount: number;
  safetyCertified: boolean;
  image?: string;
  images?: string[];
  coordinates?: string;

  // 1. Hồ sơ doanh nghiệp & Doanh nghiệp vừa và nhỏ (DNNVV)
  internalCode?: string;          // Mã hồ sơ nội bộ KP3 (ví dụ: DN-KP3-001)
  taxCode?: string;               // Mã số thuế / Mã số doanh nghiệp
  businessType?: "Công ty TNHH" | "Công ty Cổ phần" | "Doanh nghiệp tư nhân" | "Hộ kinh doanh" | "Cơ sở kinh doanh khác"; // Loại hình tổ chức
  enterpriseScale?: "Siêu nhỏ (< 5 LĐ)" | "Nhỏ (5 - 20 LĐ)" | "Vừa (20 - 50 LĐ)" | "Lớn (> 50 LĐ)"; // Phân loại quy mô
  startDate?: string;             // Ngày bắt đầu hoạt động tại địa chỉ
  verificationSource?: string;    // Nguồn xác minh (Khảo sát tổ dân phố, CSKV, Doanh nghiệp tự khai)

  // 2. Địa điểm, mặt bằng kinh doanh & Liên kết địa bàn
  streetArea?: string;            // Tuyến đường / Khu vực (Lương Định Của, Hẻm 42, Hẻm 18, Tổ 1, Tổ 2...)
  premisesType?: "Nhà phố" | "Văn phòng" | "Cửa hàng" | "Nhà xưởng" | "Ki-ốt" | "Địa điểm thuê" | "Chung cư / Căn hộ";
  premisesOwner?: string;         // Chủ sở hữu / người cho thuê mặt bằng
  premisesOwnerPhone?: string;    // SĐT chủ mặt bằng
  premisesOwnerCccd?: string;     // CCCD chủ mặt bằng
  linkedHouseholdCode?: string;   // Mã hộ dân liên kết (ví dụ: HK-301)
  linkedHouseholdOwner?: string;  // Tên chủ hộ liên kết
  linkedBuildingOrHostel?: string;// Liên kết cơ sở lưu trú / nhà trọ / tòa nhà

  // 3. Người đại diện và đầu mối liên hệ
  legalRepresentative?: string;   // Người đại diện theo pháp luật / Phụ trách
  legalRepPhone?: string;         // SĐT người đại diện
  legalRepCccd?: string;          // CCCD / Hộ chiếu người đại diện
  legalRepEmail?: string;         // Email liên hệ công vụ
  siteManager?: string;           // Người trực tiếp quản lý cơ sở tại chỗ
  siteManagerPhone?: string;      // SĐT người trực tiếp quản lý
  focalPointName?: string;        // Đầu mối phối hợp địa phương (tuyên truyền, khảo sát...)
  focalPointPhone?: string;       // SĐT đầu mối phối hợp
  focalPointRole?: string;        // Chức vụ / vai trò đầu mối

  // 4. Lao động & Quản lý Người nước ngoài
  localWorkersCount?: number;     // Lao động thường trú tại địa phương (KP3)
  temporaryWorkersCount?: number; // Lao động tạm trú
  foreignWorkersCount?: number;   // Số lượng lao động người nước ngoài
  foreignWorkers?: ForeignWorker[]; // Chi tiết chuyên gia / lao động người nước ngoài

  // 5. Nhu cầu hỗ trợ, khó khăn tự nguyện cung cấp
  supportNeeds?: string[];        // Danh mục nhu cầu hỗ trợ (Vốn vay chính sách, Thủ tục địa phương, PCCC, Mặt bằng, ANTT...)
  supportNotes?: string;          // Nội dung kiến nghị, khó khăn phản ánh

  // 6. Lịch sử biến động địa bàn
  changeHistory?: BusinessChangeLog[];

  // Địa chính & Giấy chứng nhận quyền sử dụng đất (Trích lục Tờ BĐ, Thửa, GCN)
  toBanDo?: string;             // Tờ BĐ (ví dụ: 272)
  soThua?: string;              // Số thửa (ví dụ: 55)
  dienTich?: number | string;   // Diện tích m² (ví dụ: 150)
  loaiDat?: string;             // Loại đất (ví dụ: ODT, TMD...)
  mapUrl?: string;              // Link Google Maps (https://maps.app.goo.gl/...)
  tenChuSuDung?: string;        // Tên chủ sử dụng đất
  soGcn?: string;               // Số GCN (Giấy chứng nhận QSDĐ / Sổ đỏ)
  soVaoSo?: string;             // Số vào sổ cấp GCN

  // Thông tin chuyên biệt cho cơ sở Nhà trọ, Nhà nghỉ, Khách sạn
  isAccommodation?: boolean;    // Đánh dấu cơ sở lưu trú / nhà trọ / nhà nghỉ
  soPhong?: number;             // Số phòng
  soTang?: number;              // Số tầng
  soNguoiLuuTru?: number;       // Số người đang lưu trú / thuê trọ
  giaThueTrungBinh?: string;    // Giá thuê tham khảo

  // Tệp tin đính kèm (Sổ đỏ, GPKD, PCCC...)
  soDoFile?: BusinessFile;      // File PDF / Hình ảnh Sổ đỏ
  giayPhepFile?: BusinessFile;  // File PDF / Hình ảnh Giấy phép kinh doanh
  pcccFile?: BusinessFile;      // File PDF / Hình ảnh chứng nhận PCCC

  // Nhật ký Kiểm tra định kỳ (Thanh tra PCCC, Vệ sinh ATTP, Trật tự đô thị...)
  inspections?: InspectionLog[];
}

export type ReportCategory =
  | "Rác thải"
  | "Lấn chiếm lòng đường"
  | "Tiếng ồn"
  | "An ninh trật tự"
  | "Hạ tầng đô thị"
  | "Trật tự đô thị"
  | "Ngập nước";

export type ReportPriority = "Bình thường" | "Cao" | "Khẩn cấp";
export type ReportStatus = "Đã tiếp nhận" | "Đang xử lý" | "Đã giải quyết";

export interface ReportMessage {
  id: string;
  senderRole: "canbo" | "citizen" | "system";
  senderName: string;
  senderTitle?: string;
  content: string;
  images?: string[];
  createdAt: string;
  isInternal?: boolean;
}

export interface ReportFeedback {
  rating: number;
  comment?: string;
  satisfied: boolean;
  submittedAt: string;
}

export interface FieldReport {
  id: string;
  title: string;
  category: ReportCategory;
  reporterName: string;
  reporterPhone: string;
  isAnonymous?: boolean;
  reportedAt: string;
  createdAt?: string;
  location: string;
  alleyGroup?: string;
  coordinates: { x: number; y: number };
  lat?: number;
  lng?: number;
  description: string;
  status: ReportStatus;
  priority?: ReportPriority;
  slaHours?: number;
  slaDeadline?: string;
  assignedUnit?: string;
  assignedOfficer?: string;
  resolvedAt?: string;
  timeline: {
    time: string;
    title: string;
    description: string;
    actor: string;
  }[];
  beforeImage?: string;
  afterImage?: string;
  beforeImages?: string[];
  afterImages?: string[];
  images?: string[];
  messages?: ReportMessage[];
  citizenFeedback?: ReportFeedback;
}

export interface PartyMember {
  id: string;
  fullName: string;
  partyCardNumber: string;
  position: string; // e.g. Bí thư, Đảng viên, Phó bí thư
  joinDate: string;
  cellGroup: string; // Tổ Đảng
  birthDate: string;
  status: "Đang sinh hoạt" | "Miễn sinh hoạt" | "Chuyển sinh hoạt";
  cccd?: string;
}

export interface WelfareBenefit {
  id: string;
  name: string;
  category: string;
  description: string;
  standardValue: string; // e.g. "100% Thẻ BHYT", "Miễn phí tiền điện 50kWh/tháng", "2.500.000đ/tháng"
  frequency: "Hàng tháng" | "Hàng quý" | "Hàng năm" | "Dịp Lễ/Tết" | "Đột xuất";
}

export interface WelfareRecipient {
  id: string;
  fullName: string;
  category: string;
  subCategoryId?: string;
  address: string;
  cccd: string;
  phone?: string;
  supportLevel: string;
  status: "Đang nhận trợ cấp" | "Chờ duyệt hồ sơ" | "Đã tạm ngưng";
  notes?: string;
  benefits?: string[]; // Danh sách Chế độ chính sách & Quyền lợi cụ thể
  gender?: string;
  birthDate?: string;
  householdId?: string;
  joinedDate?: string;
  disbursedTotal?: number; // Tổng số tiền đã nhận hỗ trợ
}

export interface WelfareSubCategory {
  id: string;
  name: string;
  code: string;
  iconName?: string;
  color: string;
  description: string;
  criteria: string;
  standardBenefits: string[];
  isCustom?: boolean;
  createdAt?: string;
}

export interface WelfareCampaign {
  id: string;
  title: string;
  type: "batch" | "emergency"; // đợt hỗ trợ định kỳ hoặc hỗ trợ ngay
  targetCategories: string[]; // Các phân hệ con được hưởng
  cashAmountPerPerson: number; // Số tiền mặt hỗ trợ mỗi người
  giftDescription?: string; // Hiện vật đính kèm (gạo, quà Tết, học bổng...)
  totalBudget: number;
  fundingSource: string; // Quỹ Vì người nghèo KP3, Ngân sách Phường, Mạnh thường quân...
  disbursementDate: string;
  location: string;
  status: "Đang đề xuất" | "Đã duyệt chi" | "Đang trao tặng" | "Đã hoàn tất";
  recipientIds: string[];
  recipientCount: number;
  notes?: string;
  createdAt: string;
}

export interface EmergencySupportRecord {
  id: string;
  recipientId: string;
  recipientName: string;
  cccd: string;
  address: string;
  category: string;
  amount: number;
  giftItems?: string;
  reason: string;
  disbursedDate: string;
  disbursedBy: string;
  approver: string;
  fundingSource: string;
  status: "Đã hỗ trợ ngay" | "Chờ xuất quỹ";
  notes?: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  organizer: string;
  dateTime: string;
  location: string;
  status: "Sắp diễn ra" | "Đang diễn ra" | "Đã kết thúc" | "Đã hủy";
  expectedAttendees: number;
  description: string;
  imageUrl?: string;
}

export interface LocalNews {
  id: string;
  title: string;
  category: "Thông báo khẩn" | "Hành chính" | "Y tế & Đời sống" | "Phong trào" | "An sinh xã hội";
  date: string;
  author: string;
  content: string;
  isPinned?: boolean;
  image?: string;
  imageUrl?: string;
  imageGallery?: string[];
  summary?: string;
  readTime?: string;
  views?: number;
  attachedFile?: {
    name: string;
    url?: string;
    size?: string;
  };
}

export type FundGroup =
  | "Bắt buộc / Chỉ tiêu"
  | "Vận động tự nguyện"
  | "Quỹ tự quản khu phố";

export type FundAudience =
  | "Hộ dân"
  | "Doanh nghiệp & Tổ chức"
  | "Hộ dân & Tổ chức";

export type FundStatus = "Đang vận động" | "Tạm dừng" | "Đã khóa sổ";

export interface FundCategory {
  id: string;
  code: string;
  name: string;
  aliases?: string[];
  group: FundGroup;
  targetAudience: FundAudience;
  defaultAmount: number;
  annualTarget: number;
  openingBalance: number;
  status: FundStatus;
  description?: string;
  bankId?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface FundExpenditure {
  id: string;
  voucherCode?: string;
  fundName: string;
  title: string;
  amount: number;
  spentAt: string;
  receiver: string;
  evidence?: string;
  approvedBy: string;
}

export interface FundContribution {
  id: string;
  receiptCode?: string;
  householdCode: string;
  ownerName: string;
  payerType?: "household" | "organization" | "enterprise" | "sponsor";
  fundName: string;
  amount: number;
  status: "Đã nộp" | "Chưa nộp";
  paymentMethod?: "Tiền mặt" | "VietQR" | "Chuyển khoản";
  paidAt?: string;
  note?: string;
}

export interface AdministrativeForm {
  id: string;
  code: string;
  title: string;
  category: "Cư trú & Hộ khẩu" | "Địa chính & Nhà ở" | "Hộ kinh doanh" | "Hộ tịch & Tư pháp" | "An sinh xã hội" | "Tổ dân phố & Chi bộ";
  issuingBody: string;
  description: string;
  requiredDocuments: string[];
  processingTime: string;
  fee: string;
  fileFormat: "DOCX" | "PDF" | "DOCX / PDF";
  fileSize: string;
  downloadCount: number;
  templateContent: string;
}

export interface AssociationMember {
  id: string;
  fullName: string;
  role: string;
  cccd: string;
  phone?: string;
  birthDate?: string;
  joinDate?: string; // Ngày tham gia chi hội / kết nạp
  decisionNumber?: string; // Số quyết định chuẩn y / công nhận
  decisionDate?: string; // Ngày ban hành quyết định
  decisionFile?: {
    name: string;
    url: string; // Base64 Data URL or preview link
    type: "image" | "pdf";
    size?: string;
    uploadDate?: string;
  };
  avatar?: string; // Hình ảnh đại diện thành viên (Base64 hoặc URL)
}

export interface Association {
  id: string;
  name: string;
  category: "Chính trị - Xã hội" | "Chính quyền cơ sở" | "An ninh - Quốc phòng" | "Đoàn thể nhân dân" | "Hội quần chúng" | "Chính sách xã hội" | "Phong trào tự quản";
  description: string;
  leaderName: string;
  leaderCccd: string;
  members: AssociationMember[];
}

export type ActiveTab = 
  | "dashboard"
  | "residents"
  | "households"
  | "enterprises"
  | "businesses"
  | "gis"
  | "tasks"
  | "ai"
  | "reports"
  | "forms"
  | "party"
  | "welfare"
  | "cultural"
  | "finance"
  | "plan"
  | "settings";

export interface TargetGisItem {
  id?: string;
  type?:
    | "household"
    | "business"
    | "enterprise"
    | "custom"
    | "camera"
    | "fire"
    | "light"
    | "report"
    | "civic";
  name: string;
  address?: string;
  coordinates?: string;
  lat?: number;
  lng?: number;
  navigateRoute?: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size?: string;
  type: "image" | "pdf" | "word" | "other";
  url: string; // Base64 data URL or preview link
  uploadedAt?: string;
}

export interface TaskAssignee {
  name: string;
  role: string;
  unit: string;
  phone?: string;
  avatar?: string;
  memberId?: string;
  cccd?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  unit: string;
  associationId?: string; // ID của Chi hội / Tổ chức liên kết
  assignee: TaskAssignee;
  creator: string;
  priority: "Thấp" | "Trung bình" | "Cao" | "Khẩn cấp";
  status: "Chờ xử lý" | "Đang thực hiện" | "Chờ nghiệm thu" | "Hoàn thành";
  progressPercent: number;
  startDate: string;
  deadline: string;
  completedAt?: string;
  proofImages?: string[];
  attachments?: TaskAttachment[]; // File đính kèm hình ảnh, word docx, pdf
  notes?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  type: "Họp Chi bộ" | "Họp Tổ Dân Phố" | "Tuần tra ANTT" | "Chủ Nhật Xanh" | "Tiếp công dân" | "Hội nghị Khu phố" | "Khác" | (string & {});
  date: string; // YYYY-MM-DD
  time: string; // HH:mm - HH:mm
  location: string;
  host: string;
  attendees: string;
  status: "Sắp diễn ra" | "Đang diễn ra" | "Đã kết thúc" | "Đã hoãn";
  notes?: string;
  description?: string; // Nội dung cuộc họp / Chương trình chi tiết
  content?: string;
  attachments?: TaskAttachment[]; // File đính kèm hình ảnh, word docx, pdf
}

export interface RecurringReminder {
  id: string; // e.g. REM-001
  title: string; // Tiêu đề báo cáo / nội dung nhắc hẹn
  description?: string; // Hướng dẫn chi tiết / đề cương báo cáo
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"; // Chu kỳ lặp lại
  frequencyDetail: {
    time: string; // HH:mm (VD: 17:00, 09:00)
    dayOfWeek?: number; // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7 (VD: 6 cho Thứ 7 hàng tuần)
    dayOfMonth?: number; // 1 - 31 (VD: 15 cho ngày 15 hàng tháng)
    monthOfYear?: number; // 1 - 12 (VD: 12 cho tháng 12 hàng năm)
  };
  recipientOrg: string; // Đơn vị cấp trên nhận báo cáo (VD: Ban Xây dựng Đảng, UBND Phường, UBKT...)
  responsibleUnit: string; // Đơn vị phụ trách thực hiện (VD: Chi bộ Đảng KP3, Ban điều hành, TDP 12...)
  responsiblePerson: {
    name: string;
    role: string;
    phone?: string;
  };
  notifyChannels: ("in_app" | "banner" | "zalo_sms" | "email")[];
  isActive: boolean;
  nextDueDate: string; // YYYY-MM-DD
  lastSubmittedDate?: string; // YYYY-MM-DD
  status: "Đúng hạn" | "Sắp đến hạn" | "Hôm nay đến hạn" | "Quá hạn" | "Đã nộp kỳ này";
  attachments?: TaskAttachment[]; // Mẫu đề cương hoặc file đính kèm
  submittedFiles?: TaskAttachment[]; // File báo cáo đã nộp
  submissionNotes?: string; // Ghi chú khi nộp báo cáo
  autoCreateTask?: boolean; // Tự động tạo Task trong danh mục Nhiệm vụ khi đến hạn
  createdAt: string;
}

export interface LandingConfig {
  siteTitle: string;
  siteSubtitle: string;
  heroBadge: string;
  heroTitle: string;
  heroAddressNote: string;
  bannerNotice?: string;
  contactEmail: string;
  contactAddress: string;
  workingHours: string;
  hotline: string;
  footerOperator: string;
}

