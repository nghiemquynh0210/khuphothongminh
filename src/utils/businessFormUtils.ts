import * as XLSX from "xlsx";
import {
  Business,
  BusinessFile,
  Household,
  InspectionLog,
  Resident,
  TargetGisItem
} from "../types";
import {
  generateDefaultCoordinatesForAddress,
  parseCoordinates as parseGisCoords
} from "./gisUtils";
import {
  getTemporaryResidenceExpiryStatus,
  isResidentInAccommodation
} from "./householdRecognitionUtils";

export type BusinessStatus = Business["status"];
export type BusinessOrgType = NonNullable<Business["businessType"]>;
export type BusinessPremisesType = NonNullable<Business["premisesType"]>;

export interface IndustrySectorDef {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  badgeClass: string;
  cardBg: string;
  borderClass: string;
  barColor: string;
  textColor: string;
  accentHex: string;
  description: string;
}

export const INDUSTRY_SECTORS: IndustrySectorDef[] = [
  {
    id: "Dịch vụ ăn uống",
    name: "Dịch vụ ăn uống",
    shortName: "Ẩm thực & Đồ uống",
    icon: "🍜",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    cardBg: "bg-amber-50/70 hover:bg-amber-50/90",
    borderClass: "border-amber-200",
    barColor: "bg-amber-500",
    textColor: "text-amber-800",
    accentHex: "#f59e0b",
    description: "Nhà hàng, quán ăn, cà phê, trà sữa, phở bò, điểm tâm"
  },
  {
    id: "Dịch vụ đời sống",
    name: "Dịch vụ đời sống",
    shortName: "Dịch vụ đời sống",
    icon: "✂️",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    cardBg: "bg-purple-50/70 hover:bg-purple-50/90",
    borderClass: "border-purple-200",
    barColor: "bg-purple-500",
    textColor: "text-purple-800",
    accentHex: "#a855f7",
    description: "Cắt tóc gội đầu, tiệm giặt ủi, spa thẩm mỹ, sửa xe máy, tiệm may"
  },
  {
    id: "Bán lẻ thương mại",
    name: "Bán lẻ thương mại",
    shortName: "Bán lẻ thương mại",
    icon: "🛒",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    cardBg: "bg-emerald-50/70 hover:bg-emerald-50/90",
    borderClass: "border-emerald-200",
    barColor: "bg-emerald-500",
    textColor: "text-emerald-800",
    accentHex: "#10b981",
    description: "Cửa hàng tiện lợi 24/7, tạp hóa, siêu thị mini, shop thời trang"
  },
  {
    id: "Y tế / Chăm sóc sức khỏe",
    name: "Y tế / Chăm sóc sức khỏe",
    shortName: "Y tế & Sức khỏe",
    icon: "🏥",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    cardBg: "bg-rose-50/70 hover:bg-rose-50/90",
    borderClass: "border-rose-200",
    barColor: "bg-rose-500",
    textColor: "text-rose-800",
    accentHex: "#f43f5e",
    description: "Nhà thuốc GPP, phòng khám nha khoa, trạm y tế, phòng khám chuyên khoa"
  },
  {
    id: "Lưu trú & Cho thuê",
    name: "Lưu trú & Cho thuê",
    shortName: "Nhà trọ & Lưu trú",
    icon: "🏠",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    cardBg: "bg-blue-50/70 hover:bg-blue-50/90",
    borderClass: "border-blue-200",
    barColor: "bg-blue-500",
    textColor: "text-blue-800",
    accentHex: "#3b82f6",
    description: "Nhà trọ công nhân/sinh viên, nhà nghỉ, khách sạn, căn hộ mini"
  },
  {
    id: "Giáo dục & Đào tạo",
    name: "Giáo dục & Đào tạo",
    shortName: "Giáo dục & Đào tạo",
    icon: "🎓",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
    cardBg: "bg-indigo-50/70 hover:bg-indigo-50/90",
    borderClass: "border-indigo-200",
    barColor: "bg-indigo-500",
    textColor: "text-indigo-800",
    accentHex: "#6366f1",
    description: "Lớp mầm non tư thục, trung tâm gia sư, bồi dưỡng ngoại ngữ, năng khiếu"
  },
  {
    id: "Cơ khí & Kỹ thuật số / Khác",
    name: "Cơ khí & Kỹ thuật số / Khác",
    shortName: "Kỹ thuật & Khác",
    icon: "🔧",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    cardBg: "bg-slate-50/70 hover:bg-slate-50/90",
    borderClass: "border-slate-200",
    barColor: "bg-slate-500",
    textColor: "text-slate-800",
    accentHex: "#64748b",
    description: "Sửa máy tính, điện thoại, điện lạnh, hàn cơ khí, quảng cáo, in ấn"
  }
];

export const BUSINESS_STREET_AREAS = [
  "Mặt tiền Lương Định Của",
  "Hẻm 42 Lương Định Của",
  "Hẻm 18 Lương Định Của",
  "Trục đường Song Hành",
  "Đường Mai Chí Thọ",
  "Khu dân cư nội bộ KP3"
] as const;

export const SUPPORT_NEEDS_OPTIONS = [
  "Vốn vay chính sách / ưu đãi",
  "Hướng dẫn PCCC & ANTT",
  "Hướng dẫn An toàn thực phẩm",
  "Mặt bằng & thủ tục thuê đất",
  "Giới thiệu nguồn lao động",
  "Hỗ trợ thủ tục hành chính địa phương"
] as const;

export const BUSINESS_DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600"
];

export const getBusinessIndustryGroup = (b: Business): string => {
  if (b.industryGroup && b.industryGroup.trim()) {
    const ig = b.industryGroup.trim().toLowerCase();
    if (ig.includes("ăn uống") || ig.includes("đồ uống") || ig.includes("ẩm thực")) return "Dịch vụ ăn uống";
    if (ig.includes("đời sống")) return "Dịch vụ đời sống";
    if (ig.includes("bán lẻ") || ig.includes("thương mại")) return "Bán lẻ thương mại";
    if (ig.includes("y tế") || ig.includes("sức khỏe") || ig.includes("dược")) return "Y tế / Chăm sóc sức khỏe";
    if (ig.includes("lưu trú") || ig.includes("nhà trọ") || ig.includes("khách sạn") || ig.includes("nhà nghỉ")) return "Lưu trú & Cho thuê";
    if (ig.includes("giáo dục") || ig.includes("đào tạo")) return "Giáo dục & Đào tạo";
    if (ig.includes("cơ khí") || ig.includes("kỹ thuật") || ig.includes("khác")) return "Cơ khí & Kỹ thuật số / Khác";
    return b.industryGroup;
  }

  const typeLower = (b.type || "").toLowerCase();
  const nameLower = (b.name || "").toLowerCase();
  const combined = `${typeLower} ${nameLower}`;

  if (
    b.isAccommodation ||
    combined.includes("nhà trọ") ||
    combined.includes("nhà nghỉ") ||
    combined.includes("khách sạn") ||
    combined.includes("lưu trú") ||
    combined.includes("homestay")
  ) {
    return "Lưu trú & Cho thuê";
  }
  if (
    combined.includes("ăn uống") ||
    combined.includes("cà phê") ||
    combined.includes("cafe") ||
    combined.includes("phở") ||
    combined.includes("quán ăn") ||
    combined.includes("nhà hàng") ||
    combined.includes("trà sữa") ||
    combined.includes("điểm tâm") ||
    combined.includes("bánh")
  ) {
    return "Dịch vụ ăn uống";
  }
  if (
    combined.includes("đời sống") ||
    combined.includes("giặt ủi") ||
    combined.includes("giặt") ||
    combined.includes("tóc") ||
    combined.includes("gội") ||
    combined.includes("spa") ||
    combined.includes("nail") ||
    combined.includes("may") ||
    combined.includes("sửa xe") ||
    combined.includes("đồ da")
  ) {
    return "Dịch vụ đời sống";
  }
  if (
    combined.includes("bán lẻ") ||
    combined.includes("thương mại") ||
    combined.includes("tiện lợi") ||
    combined.includes("tạp hóa") ||
    combined.includes("siêu thị") ||
    combined.includes("shop") ||
    combined.includes("cửa hàng")
  ) {
    return "Bán lẻ thương mại";
  }
  if (
    combined.includes("y tế") ||
    combined.includes("sức khỏe") ||
    combined.includes("nha khoa") ||
    combined.includes("thuốc") ||
    combined.includes("dược") ||
    combined.includes("phòng khám")
  ) {
    return "Y tế / Chăm sóc sức khỏe";
  }
  if (
    combined.includes("giáo dục") ||
    combined.includes("đào tạo") ||
    combined.includes("mầm non") ||
    combined.includes("gia sư") ||
    combined.includes("học") ||
    combined.includes("trường")
  ) {
    return "Giáo dục & Đào tạo";
  }

  return "Cơ khí & Kỹ thuật số / Khác";
};

export const getSectorMeta = (groupName: string): IndustrySectorDef => {
  return (
    INDUSTRY_SECTORS.find(s => s.id === groupName) || {
      id: groupName,
      name: groupName,
      shortName: groupName,
      icon: "💼",
      badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
      cardBg: "bg-slate-50/70 hover:bg-slate-50/90",
      borderClass: "border-slate-200",
      barColor: "bg-slate-500",
      textColor: "text-slate-800",
      accentHex: "#64748b",
      description: "Ngành nghề kinh doanh khác"
    }
  );
};

export const isAccommodationBusiness = (b: Business): boolean => {
  if (b.isAccommodation) return true;
  const typeLower = (b.type || "").toLowerCase();
  const nameLower = (b.name || "").toLowerCase();
  return (
    typeLower.includes("nhà trọ") ||
    typeLower.includes("nhà nghỉ") ||
    typeLower.includes("khách sạn") ||
    typeLower.includes("homestay") ||
    typeLower.includes("lưu trú") ||
    nameLower.includes("nhà trọ") ||
    nameLower.includes("nhà nghỉ") ||
    nameLower.includes("khách sạn")
  );
};

export const getBusinessImage = (b?: Business | null): string => {
  if (!b) return BUSINESS_DEFAULT_IMAGES[0];
  if (b.image && typeof b.image === "string" && b.image.trim() !== "") {
    return b.image;
  }
  if (
    b.images &&
    Array.isArray(b.images) &&
    b.images.length > 0 &&
    b.images[0] &&
    b.images[0].trim() !== ""
  ) {
    return b.images[0];
  }
  if (isAccommodationBusiness(b)) {
    return BUSINESS_DEFAULT_IMAGES[2];
  }
  const hash = (b.id || b.name || "KD")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BUSINESS_DEFAULT_IMAGES[hash % BUSINESS_DEFAULT_IMAGES.length];
};

export function findBusinessByIdOrCode(
  businesses: Business[],
  idOrCode?: string
): Business | null {
  if (!idOrCode) return null;
  const clean = idOrCode.trim();
  return (
    businesses.find(b => b.id === clean) ||
    businesses.find(
      b =>
        (b.internalCode || "").trim().toUpperCase() === clean.toUpperCase() ||
        (b.licenseNumber || "").trim().toUpperCase() === clean.toUpperCase()
    ) ||
    null
  );
}

export function getLinkedHouseholdForBusiness(
  b: Business,
  households: Household[]
): Household | undefined {
  if (b.linkedHouseholdCode) {
    const byCode = households.find(
      h => h.code.toLowerCase() === b.linkedHouseholdCode?.toLowerCase()
    );
    if (byCode) return byCode;
  }
  if (b.address) {
    const addrLower = b.address.toLowerCase();
    return households.find(
      h =>
        addrLower.includes(h.address.toLowerCase()) ||
        h.address.toLowerCase().includes(addrLower)
    );
  }
  return undefined;
}

export function getLinkedForeignResidentsForBusiness(
  b: Business,
  residents: Resident[]
): Resident[] {
  return (residents || []).filter(r => {
    const isForeign = r.nationality && r.nationality !== "Việt Nam";
    if (!isForeign) return false;
    if (
      r.workplace &&
      b.name &&
      r.workplace.toLowerCase().includes(b.name.toLowerCase())
    ) {
      return true;
    }
    if (b.linkedHouseholdCode && r.householdId === b.linkedHouseholdCode) {
      return true;
    }
    return false;
  });
}

export function getStayingResidentsInBusiness(
  b: Business,
  residents: Resident[]
): Resident[] {
  return (residents || []).filter(r => isResidentInAccommodation(r, b));
}

export const DEFAULT_SAMPLE_INSPECTIONS: InspectionLog[] = [
  {
    id: "INSP-SAMPLE-1",
    date: "14/03/2026",
    result: "Đạt chuẩn",
    inspector: "Đại úy Trần Quốc Hải - Công an khu vực KP3",
    note: "Trang bị đầy đủ bình chữa cháy MFZ4, tiêu lệnh PCCC, niêm yết nội quy lưu trú và sổ theo dõi tạm trú.",
    recommendation: "Tiếp tục duy trì kiểm tra áp suất bình PCCC định kỳ 6 tháng/lần."
  },
  {
    id: "INSP-SAMPLE-2",
    date: "08/11/2025",
    result: "Đạt chuẩn",
    inspector: "Tổ kiểm tra liên ngành P. An Phú & BĐH KP3",
    note: "Hệ thống điện đi âm an toàn, lối thoát nạn thông thoáng, giấy phép kinh doanh đúng địa điểm đăng ký.",
    recommendation: "Nhắc nhở cập nhật kịp thời khi có biến động nhân khẩu tạm trú."
  }
];

export function getBusinessInspections(b: Business): InspectionLog[] {
  if (b.inspections && b.inspections.length > 0) {
    return b.inspections;
  }
  return DEFAULT_SAMPLE_INSPECTIONS;
}

export function buildGisTargetForBusiness(b: Business): {
  target: TargetGisItem;
  resolvedCoordinates: string;
  wasAutoGenerated: boolean;
} {
  let coords = b.coordinates;
  let wasAutoGenerated = false;
  if (!coords || !parseGisCoords(coords)) {
    const autoGeo = generateDefaultCoordinatesForAddress(b.address, b.id);
    coords = autoGeo.dms;
    wasAutoGenerated = true;
  }
  return {
    target: {
      id: b.id,
      type: "business",
      name: b.name,
      address: b.address,
      coordinates: coords,
      navigateRoute: true
    },
    resolvedCoordinates: coords,
    wasAutoGenerated
  };
}

export function exportHostelResidentsToExcel(
  bus: Business,
  hostelResidents: Resident[]
): { ok: boolean; message: string } {
  if (!hostelResidents || hostelResidents.length === 0) {
    return {
      ok: false,
      message: "Không có dữ liệu người lưu trú để xuất file Excel."
    };
  }

  const exportRows = hostelResidents.map((r, i) => {
    const expStatus = getTemporaryResidenceExpiryStatus(r.temporaryExpDate);
    return {
      STT: i + 1,
      "Họ và tên": r.fullName,
      "Giới tính": r.gender,
      "Ngày sinh": r.birthDate,
      "Số CCCD / Định danh": r.cccd,
      "Số điện thoại": r.phone || "Chưa cập nhật",
      "Nơi thường trú gốc (Quê quán)":
        r.permanentAddress || r.hometown || "Chưa cập nhật",
      "Chỗ ở hiện tại / Tạm trú": r.currentAddress || r.address,
      "Ngày đăng ký tạm trú": r.temporaryRegDate || "Chưa cập nhật",
      "Ngày hết hạn tạm trú": r.temporaryExpDate || "Chưa cập nhật",
      "Tình trạng thời hạn": expStatus.label,
      "Cơ sở lưu trú": bus.name,
      "Chủ cơ sở": bus.owner,
      "SĐT chủ cơ sở": bus.phone,
      "Địa chỉ cơ sở": bus.address
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_cu_dan_luu_tru");
  const fileName = `DS_LuuTru_${bus.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return {
    ok: true,
    message: `Đã xuất Excel danh sách ${hostelResidents.length} cư dân lưu trú tại ${bus.name}.`
  };
}

export function processBusinessFileUpload(
  file: File,
  onSuccess: (fileObj: BusinessFile) => void,
  onError: (message: string) => void
) {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage =
    file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);

  if (!isPdf && !isImage) {
    onError("Chỉ hỗ trợ tệp định dạng PDF hoặc hình ảnh (PNG, JPG, WebP)!");
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    onError("Dung lượng tệp tối đa cho phép là 25MB!");
    return;
  }

  const formattedSize =
    file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

  const reader = new FileReader();
  reader.onload = () => {
    onSuccess({
      name: file.name,
      url: reader.result as string,
      type: isPdf ? "pdf" : "image",
      size: formattedSize,
      uploadDate: new Date().toLocaleDateString("vi-VN")
    });
  };
  reader.onerror = () => {
    onError("Không thể đọc tệp tin đã chọn!");
  };
  reader.readAsDataURL(file);
}

export function downloadBusinessFile(fileObj: BusinessFile) {
  const link = document.createElement("a");
  link.href = fileObj.url;
  link.download = fileObj.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface BusinessFormValues {
  name: string;
  taxCode: string;
  licenseNumber: string;
  businessType: BusinessOrgType;
  status: BusinessStatus;
  safetyCertified: boolean;
  startDate: string;
  industryGroup: string;
  type: string;
  address: string;
  streetArea: string;
  premisesType: BusinessPremisesType;
  premisesOwner: string;
  linkedHouseholdCode: string;
  coordinates: string;
  owner: string;
  phone: string;
  legalRepresentative: string;
  legalRepPhone: string;
  legalRepEmail: string;
  siteManager: string;
  focalPointName: string;
  focalPointPhone: string;
  focalPointRole: string;
  employeeCount: number;
  localWorkersCount: number;
  temporaryWorkersCount: number;
  foreignWorkersCount: number;
  supportNeeds: string[];
  supportNotes: string;
  isAccommodation: boolean;
  soTang: string;
  soPhong: string;
  soNguoiLuuTru: string;
  giaThueTrungBinh: string;
  toBanDo: string;
  soThua: string;
  dienTich: string;
  loaiDat: string;
  tenChuSuDung: string;
  soGcn: string;
  soVaoSo: string;
  soDoFile: BusinessFile | null;
  image: string;
}

export function createInitialBusinessFormValues(): BusinessFormValues {
  return {
    name: "",
    taxCode: "",
    licenseNumber: "",
    businessType: "Hộ kinh doanh",
    status: "Đang hoạt động",
    safetyCertified: true,
    startDate: new Date().toLocaleDateString("vi-VN"),
    industryGroup: "Dịch vụ ăn uống",
    type: "",
    address: "",
    streetArea: "Mặt tiền Lương Định Của",
    premisesType: "Nhà phố",
    premisesOwner: "",
    linkedHouseholdCode: "",
    coordinates: "",
    owner: "",
    phone: "",
    legalRepresentative: "",
    legalRepPhone: "",
    legalRepEmail: "",
    siteManager: "",
    focalPointName: "",
    focalPointPhone: "",
    focalPointRole: "Chủ hộ kinh doanh",
    employeeCount: 2,
    localWorkersCount: 1,
    temporaryWorkersCount: 1,
    foreignWorkersCount: 0,
    supportNeeds: [],
    supportNotes: "",
    isAccommodation: false,
    soTang: "",
    soPhong: "",
    soNguoiLuuTru: "",
    giaThueTrungBinh: "",
    toBanDo: "",
    soThua: "",
    dienTich: "",
    loaiDat: "ODT",
    tenChuSuDung: "",
    soGcn: "",
    soVaoSo: "",
    soDoFile: null,
    image: ""
  };
}

export function businessToFormValues(b: Business): BusinessFormValues {
  const validOrgType: BusinessOrgType =
    b.businessType === "Cơ sở kinh doanh khác" ||
    b.businessType === "Doanh nghiệp tư nhân" ||
    b.businessType === "Công ty TNHH" ||
    b.businessType === "Công ty Cổ phần"
      ? b.businessType
      : "Hộ kinh doanh";

  const validPremisesType: BusinessPremisesType =
    b.premisesType === "Cửa hàng" ||
    b.premisesType === "Văn phòng" ||
    b.premisesType === "Nhà xưởng" ||
    b.premisesType === "Ki-ốt" ||
    b.premisesType === "Địa điểm thuê" ||
    b.premisesType === "Chung cư / Căn hộ"
      ? b.premisesType
      : "Nhà phố";

  const isAccom = isAccommodationBusiness(b);

  return {
    name: b.name || "",
    taxCode: b.taxCode || b.licenseNumber || "",
    licenseNumber: b.licenseNumber || "",
    businessType: validOrgType,
    status: b.status || "Đang hoạt động",
    safetyCertified: Boolean(b.safetyCertified),
    startDate: b.startDate || "01/01/2024",
    industryGroup: b.industryGroup || getBusinessIndustryGroup(b),
    type: b.type || "",
    address: b.address || "",
    streetArea: b.streetArea || "Mặt tiền Lương Định Của",
    premisesType: validPremisesType,
    premisesOwner: b.premisesOwner || b.owner || "",
    linkedHouseholdCode: b.linkedHouseholdCode || "",
    coordinates: b.coordinates || "",
    owner: b.owner || "",
    phone: b.phone || "",
    legalRepresentative: b.legalRepresentative || b.owner || "",
    legalRepPhone: b.legalRepPhone || b.phone || "",
    legalRepEmail: b.legalRepEmail || "",
    siteManager: b.siteManager || b.owner || "",
    focalPointName: b.focalPointName || b.owner || "",
    focalPointPhone: b.focalPointPhone || b.phone || "",
    focalPointRole: b.focalPointRole || "Chủ cơ sở",
    employeeCount: b.employeeCount || 1,
    localWorkersCount: b.localWorkersCount ?? 1,
    temporaryWorkersCount: b.temporaryWorkersCount ?? 0,
    foreignWorkersCount: b.foreignWorkersCount ?? (b.foreignWorkers?.length || 0),
    supportNeeds: b.supportNeeds || [],
    supportNotes: b.supportNotes || "",
    isAccommodation: isAccom,
    soTang: b.soTang ? String(b.soTang) : "",
    soPhong: b.soPhong ? String(b.soPhong) : "",
    soNguoiLuuTru: b.soNguoiLuuTru !== undefined ? String(b.soNguoiLuuTru) : "",
    giaThueTrungBinh: b.giaThueTrungBinh || "",
    toBanDo: b.toBanDo || "",
    soThua: b.soThua || "",
    dienTich: b.dienTich !== undefined ? String(b.dienTich) : "",
    loaiDat: b.loaiDat || "ODT",
    tenChuSuDung: b.tenChuSuDung || b.owner || "",
    soGcn: b.soGcn || "",
    soVaoSo: b.soVaoSo || "",
    soDoFile: b.soDoFile || null,
    image: b.image || ""
  };
}

export function formValuesToBusiness(
  values: BusinessFormValues,
  existing: Business | null,
  fallbackId: string
): Business {
  const cleanName = values.name.trim();
  const cleanType =
    values.type.trim() ||
    (values.isAccommodation ? "Nhà trọ cho thuê" : "Kinh doanh dịch vụ");
  const cleanOwner = values.owner.trim() || existing?.owner || "Chưa cập nhật";
  const cleanPhone = values.phone.trim() || existing?.phone || "";
  const cleanAddress = values.address.trim();

  const resolvedIndustryGroup =
    values.industryGroup ||
    getBusinessIndustryGroup({
      name: cleanName,
      type: cleanType,
      isAccommodation: values.isAccommodation
    } as Business);

  const parsedTang = values.soTang.trim() ? Number(values.soTang) : undefined;
  const parsedPhong = values.soPhong.trim() ? Number(values.soPhong) : undefined;
  const parsedNguoi = values.soNguoiLuuTru.trim()
    ? Number(values.soNguoiLuuTru)
    : undefined;

  if (existing) {
    const resolvedImage = values.image || existing.image;
    const updatedImages =
      values.image && !(existing.images || []).includes(values.image)
        ? [values.image, ...(existing.images || [])]
        : existing.images;

    return {
      ...existing,
      name: cleanName,
      taxCode: values.taxCode.trim() || existing.taxCode,
      licenseNumber:
        values.licenseNumber.trim() ||
        values.taxCode.trim() ||
        existing.licenseNumber,
      businessType: values.businessType,
      status: values.status,
      safetyCertified: values.safetyCertified,
      startDate: values.startDate.trim(),
      industryGroup: resolvedIndustryGroup,
      type: cleanType,
      address: cleanAddress,
      streetArea: values.streetArea,
      premisesType: values.premisesType,
      premisesOwner: values.premisesOwner.trim(),
      linkedHouseholdCode: values.linkedHouseholdCode.trim(),
      coordinates: values.coordinates.trim() || existing.coordinates,
      owner: cleanOwner,
      phone: cleanPhone,
      legalRepresentative: values.legalRepresentative.trim() || cleanOwner,
      legalRepPhone: values.legalRepPhone.trim() || cleanPhone,
      legalRepEmail: values.legalRepEmail.trim(),
      siteManager: values.siteManager.trim(),
      focalPointName: values.focalPointName.trim() || cleanOwner,
      focalPointPhone: values.focalPointPhone.trim() || cleanPhone,
      focalPointRole: values.focalPointRole.trim(),
      employeeCount: Math.max(1, Number(values.employeeCount) || 1),
      localWorkersCount: Math.max(0, Number(values.localWorkersCount) || 0),
      temporaryWorkersCount: Math.max(0, Number(values.temporaryWorkersCount) || 0),
      foreignWorkersCount: Math.max(0, Number(values.foreignWorkersCount) || 0),
      supportNeeds: values.supportNeeds,
      supportNotes: values.supportNotes.trim(),
      isAccommodation: values.isAccommodation,
      soTang: values.isAccommodation ? parsedTang : undefined,
      soPhong: values.isAccommodation ? parsedPhong : undefined,
      soNguoiLuuTru: values.isAccommodation ? parsedNguoi : undefined,
      giaThueTrungBinh: values.isAccommodation
        ? values.giaThueTrungBinh.trim()
        : undefined,
      toBanDo: values.toBanDo.trim(),
      soThua: values.soThua.trim(),
      dienTich: values.dienTich.trim(),
      loaiDat: values.loaiDat.trim() || "ODT",
      tenChuSuDung: values.tenChuSuDung.trim() || cleanOwner,
      soGcn: values.soGcn.trim(),
      soVaoSo: values.soVaoSo.trim(),
      soDoFile: values.soDoFile || undefined,
      image: resolvedImage,
      images: updatedImages
    };
  }

  const license =
    values.licenseNumber.trim() ||
    values.taxCode.trim() ||
    `GP-${fallbackId}/AP`;
  const resolvedCoords =
    values.coordinates.trim() ||
    generateDefaultCoordinatesForAddress(cleanAddress, fallbackId).dms;
  const fallbackImg =
    values.image ||
    getBusinessImage({
      id: fallbackId,
      name: cleanName,
      isAccommodation: values.isAccommodation
    } as Business);

  return {
    id: fallbackId,
    internalCode: `HKD-KP3-${fallbackId}`,
    name: cleanName,
    taxCode: values.taxCode.trim(),
    licenseNumber: license,
    businessType: values.businessType,
    status: values.status,
    safetyCertified: values.safetyCertified,
    startDate: values.startDate.trim(),
    industryGroup: resolvedIndustryGroup,
    type: cleanType,
    address: cleanAddress,
    streetArea: values.streetArea,
    premisesType: values.premisesType,
    premisesOwner: values.premisesOwner.trim() || cleanOwner,
    linkedHouseholdCode: values.linkedHouseholdCode.trim(),
    coordinates: resolvedCoords,
    owner: cleanOwner,
    phone: cleanPhone,
    legalRepresentative: values.legalRepresentative.trim() || cleanOwner,
    legalRepPhone: values.legalRepPhone.trim() || cleanPhone,
    legalRepEmail: values.legalRepEmail.trim(),
    siteManager: values.siteManager.trim() || cleanOwner,
    focalPointName: values.focalPointName.trim() || cleanOwner,
    focalPointPhone: values.focalPointPhone.trim() || cleanPhone,
    focalPointRole: values.focalPointRole.trim() || "Chủ cơ sở",
    employeeCount: Math.max(1, Number(values.employeeCount) || 1),
    localWorkersCount: Math.max(0, Number(values.localWorkersCount) || 0),
    temporaryWorkersCount: Math.max(0, Number(values.temporaryWorkersCount) || 0),
    foreignWorkersCount: Math.max(0, Number(values.foreignWorkersCount) || 0),
    supportNeeds: values.supportNeeds,
    supportNotes: values.supportNotes.trim(),
    verificationSource: "Ban Điều hành KP3 ghi nhận",
    isAccommodation: values.isAccommodation,
    soTang: values.isAccommodation ? parsedTang : undefined,
    soPhong: values.isAccommodation ? parsedPhong : undefined,
    soNguoiLuuTru: values.isAccommodation ? parsedNguoi : undefined,
    giaThueTrungBinh: values.isAccommodation
      ? values.giaThueTrungBinh.trim()
      : undefined,
    toBanDo: values.toBanDo.trim(),
    soThua: values.soThua.trim(),
    dienTich: values.dienTich.trim(),
    loaiDat: values.loaiDat.trim() || "ODT",
    tenChuSuDung: values.tenChuSuDung.trim() || cleanOwner,
    soGcn: values.soGcn.trim(),
    soVaoSo: values.soVaoSo.trim(),
    soDoFile: values.soDoFile || undefined,
    image: fallbackImg,
    images: [fallbackImg],
    changeHistory: [
      {
        id: `CHG-${fallbackId}-INIT`,
        date: new Date().toLocaleDateString("vi-VN"),
        type: "Mở mới",
        description: "Đăng ký mới cơ sở kinh doanh tại địa bàn Khu phố 3",
        recordedBy: "Cán bộ quản lý địa bàn KP3"
      }
    ]
  };
}

