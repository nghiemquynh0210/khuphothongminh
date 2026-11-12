import { Household, Resident, TargetGisItem } from "../types";
import { extractBirthYear } from "./householdRecognitionUtils";
import { generateDefaultCoordinatesForAddress, parseCoordinates as parseGisCoords } from "./gisUtils";

export type ResidentFormTab = "basic" | "residence" | "career" | "policy" | "foreigner";

export type VisaCardType = NonNullable<Resident["visaOrCardType"]>;
export type TemporaryRegStatus = NonNullable<Resident["temporaryRegistrationStatus"]>;
export type MaritalStatusType = NonNullable<Resident["maritalStatus"]>;

export interface ResidentFormValues {
  fullName: string;
  gender: "Nam" | "Nữ";
  birthDate: string;
  cccd: string;
  idIssueDate: string;
  idIssuePlace: string;
  ethnicity: string;
  religion: string;
  nationality: string;
  hometown: string;
  fatherName: string;
  motherName: string;
  phone: string;
  status: "Thường trú" | "Tạm trú" | "Tạm vắng";
  occupation: string;
  education: string;
  workplace: string;
  maritalStatus: MaritalStatusType;
  address: string;
  permanentAddress: string;
  temporaryAddress: string;
  householdId: string;
  relationToOwner: string;
  managementStatus: string;
  temporaryRegDate: string;
  temporaryExpDate: string;
  healthInsuranceNumber: string;
  militaryServiceStatus: string;
  policyGroup: string;
  emergencyContact: string;
  notes: string;
  isForeigner: boolean;
  passportNumber: string;
  passportExpiryDate: string;
  visaOrCardType: VisaCardType;
  visaOrCardNumber: string;
  visaValidFrom: string;
  visaValidUntil: string;
  temporaryRegistrationCode: string;
  temporaryRegistrationDate: string;
  temporaryRegistrationStatus: TemporaryRegStatus;
  workPermitNumber: string;
  sponsoringOrganization: string;
  landlordContact: string;
}

export const isForeignResident = (r: Resident): boolean => {
  return r.isForeigner === true || (Boolean(r.nationality) && r.nationality !== "Việt Nam") || Boolean(r.passportNumber);
};

export const getCountryFlag = (nationality?: string): string => {
  if (!nationality) return "🇻🇳";
  const nat = nationality.toLowerCase();
  if (nat.includes("hàn quốc") || nat.includes("korea")) return "🇰🇷";
  if (nat.includes("anh") || nat.includes("uk") || nat.includes("britain")) return "🇬🇧";
  if (nat.includes("nhật") || nat.includes("japan")) return "🇯🇵";
  if (nat.includes("mỹ") || nat.includes("hoa kỳ") || nat.includes("usa") || nat.includes("united states")) return "🇺🇸";
  if (nat.includes("pháp") || nat.includes("france")) return "🇫🇷";
  if (nat.includes("đức") || nat.includes("germany")) return "🇩🇪";
  if (nat.includes("trung quốc") || nat.includes("china")) return "🇨🇳";
  if (nat.includes("đài loan") || nat.includes("taiwan")) return "🇹🇼";
  if (nat.includes("úc") || nat.includes("australia")) return "🇦🇺";
  if (nat.includes("singapore")) return "🇸🇬";
  if (nat.includes("nga") || nat.includes("russia")) return "🇷🇺";
  if (nat.includes("canada")) return "🇨🇦";
  if (nat.includes("việt nam") || nat.includes("vietnam")) return "🇻🇳";
  return "🌍";
};

export const getVisaExpiryStatus = (validUntil?: string) => {
  if (!validUntil) {
    return {
      status: "unknown",
      daysLeft: null,
      label: "Chưa rõ thời hạn",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
    };
  }
  const parts = validUntil.split("/");
  if (parts.length !== 3) {
    return {
      status: "unknown",
      daysLeft: null,
      label: validUntil,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
    };
  }
  const targetDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      status: "expired",
      daysLeft,
      label: `Đã hết hạn (${Math.abs(daysLeft)} ngày trước)`,
      badgeClass: "bg-rose-50 text-rose-700 border-rose-300 font-bold"
    };
  }
  if (daysLeft <= 30) {
    return {
      status: "expiring_soon",
      daysLeft,
      label: `Sắp hết hạn (${daysLeft} ngày)`,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300 font-bold"
    };
  }
  return {
    status: "valid",
    daysLeft,
    label: `Còn hạn đến ${validUntil}`,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300"
  };
};

export const INITIAL_RESIDENT_FORM_VALUES: ResidentFormValues = {
  fullName: "",
  gender: "Nam",
  birthDate: "",
  cccd: "",
  idIssueDate: "10/05/2021",
  idIssuePlace: "Cục Cảnh sát QLHC về TTXH",
  ethnicity: "Kinh",
  religion: "Không",
  nationality: "Việt Nam",
  hometown: "",
  fatherName: "",
  motherName: "",
  phone: "",
  status: "Thường trú",
  occupation: "",
  education: "Đại học",
  workplace: "",
  maritalStatus: "Đã kết hôn",
  address: "42/3 Lương Định Của, Phường An Phú",
  permanentAddress: "42/3 Lương Định Của, KP3, Phường An Phú, TP. Hồ Chí Minh",
  temporaryAddress: "42/3 Lương Định Của, KP3, Phường An Phú, TP. Hồ Chí Minh",
  householdId: "HK-301",
  relationToOwner: "Thành viên",
  managementStatus: "Đang quản lý thực tế",
  temporaryRegDate: "",
  temporaryExpDate: "",
  healthInsuranceNumber: "",
  militaryServiceStatus: "Đã hoàn thành nghĩa vụ quân sự",
  policyGroup: "Bình thường",
  emergencyContact: "",
  notes: "",
  isForeigner: false,
  passportNumber: "",
  passportExpiryDate: "",
  visaOrCardType: "Thẻ tạm trú (TRC)",
  visaOrCardNumber: "",
  visaValidFrom: "",
  visaValidUntil: "",
  temporaryRegistrationCode: "",
  temporaryRegistrationDate: "",
  temporaryRegistrationStatus: "Đã khai báo",
  workPermitNumber: "",
  sponsoringOrganization: "",
  landlordContact: ""
};

export function createInitialFormValues(isForeigner = false): ResidentFormValues {
  if (!isForeigner) {
    return { ...INITIAL_RESIDENT_FORM_VALUES };
  }
  return {
    ...INITIAL_RESIDENT_FORM_VALUES,
    isForeigner: true,
    status: "Tạm trú",
    nationality: "Hàn Quốc",
    ethnicity: "Hàn Quốc",
    religion: "Không",
    hometown: "Seoul, Hàn Quốc",
    idIssuePlace: "Cục Quản lý Xuất nhập cảnh Hàn Quốc",
    visaOrCardType: "Thẻ tạm trú (TRC)",
    temporaryRegistrationStatus: "Đã khai báo"
  };
}

export function residentToFormValues(res: Resident): ResidentFormValues {
  const isForeign = isForeignResident(res);
  return {
    fullName: res.fullName || "",
    gender: res.gender || "Nam",
    birthDate: res.birthDate === "Chưa cập nhật" ? "" : (res.birthDate || ""),
    cccd: res.cccd || "",
    idIssueDate: res.idIssueDate || "15/05/2021",
    idIssuePlace: res.idIssuePlace || "Cục Cảnh sát QLHC về TTXH",
    ethnicity: res.ethnicity || "Kinh",
    religion: res.religion || "Không",
    nationality: res.nationality || "Việt Nam",
    hometown: res.hometown || "",
    fatherName: res.fatherName || "",
    motherName: res.motherName || "",
    phone: res.phone === "N/A" ? "" : (res.phone || ""),
    status: res.status || "Thường trú",
    occupation: res.occupation === "Tự do" ? "" : (res.occupation || ""),
    education: res.education || "Đại học",
    workplace: res.workplace || "",
    maritalStatus: res.maritalStatus || "Đã kết hôn",
    address: res.address || "",
    permanentAddress: res.permanentAddress || res.address || "",
    temporaryAddress: res.currentAddress || res.temporaryAddress || res.address || "",
    householdId: res.householdId || "HK-301",
    relationToOwner: res.relationToOwner || "Thành viên",
    managementStatus: res.managementStatus || "Đang quản lý thực tế",
    temporaryRegDate: res.temporaryRegDate || "",
    temporaryExpDate: res.temporaryExpDate || "",
    healthInsuranceNumber: res.healthInsuranceNumber || "",
    militaryServiceStatus: res.militaryServiceStatus || "Đã hoàn thành nghĩa vụ quân sự",
    policyGroup: res.policyGroup || "Bình thường",
    emergencyContact: res.emergencyContact || "",
    notes: res.notes || "",
    isForeigner: isForeign,
    passportNumber: res.passportNumber || (isForeign ? res.cccd : ""),
    passportExpiryDate: res.passportExpiryDate || "",
    visaOrCardType: res.visaOrCardType || "Thẻ tạm trú (TRC)",
    visaOrCardNumber: res.visaOrCardNumber || "",
    visaValidFrom: res.visaValidFrom || "",
    visaValidUntil: res.visaValidUntil || "",
    temporaryRegistrationCode: res.temporaryRegistrationCode || "",
    temporaryRegistrationDate: res.temporaryRegistrationDate || "",
    temporaryRegistrationStatus: res.temporaryRegistrationStatus || "Đã khai báo",
    workPermitNumber: res.workPermitNumber || "",
    sponsoringOrganization: res.sponsoringOrganization || "",
    landlordContact: res.landlordContact || ""
  };
}

export function formValuesToResident(
  values: ResidentFormValues,
  existing?: Resident | null,
  fallbackId = "R001"
): Resident {
  const finalCccd = (values.isForeigner ? (values.passportNumber || values.cccd) : values.cccd).trim();
  const cleanPhone = values.phone.trim();
  const cleanOccupation = values.occupation.trim();
  const resolvedCurrentAddress = (values.temporaryAddress || values.address || values.permanentAddress).trim();

  const base: Partial<Resident> = existing ? { ...existing } : {};

  return {
    ...base,
    id: existing?.id || fallbackId,
    fullName: values.fullName.trim(),
    gender: values.gender,
    birthDate: values.birthDate.trim() || "01/01/1990",
    cccd: finalCccd,
    idIssueDate: values.idIssueDate.trim(),
    idIssuePlace: values.idIssuePlace.trim(),
    ethnicity: values.ethnicity.trim(),
    religion: values.religion.trim(),
    nationality: values.nationality.trim() || "Việt Nam",
    hometown: values.hometown.trim(),
    fatherName: values.fatherName.trim() || undefined,
    motherName: values.motherName.trim() || undefined,
    phone: cleanPhone || "N/A",
    status: values.status,
    education: values.education.trim(),
    occupation: cleanOccupation || "Tự do",
    workplace: values.workplace.trim() || undefined,
    maritalStatus: values.maritalStatus,
    address: values.address.trim() || resolvedCurrentAddress,
    permanentAddress: values.permanentAddress.trim() || undefined,
    temporaryAddress: values.temporaryAddress.trim() || undefined,
    currentAddress: resolvedCurrentAddress || undefined,
    householdId: values.householdId.trim(),
    relationToOwner: values.relationToOwner.trim() || "Thành viên",
    managementStatus: values.managementStatus.trim() || undefined,
    temporaryRegDate: values.temporaryRegDate.trim() || undefined,
    temporaryExpDate: values.temporaryExpDate.trim() || undefined,
    healthInsuranceNumber: values.healthInsuranceNumber.trim() || undefined,
    militaryServiceStatus: values.militaryServiceStatus.trim() || undefined,
    policyGroup: values.policyGroup.trim() || undefined,
    emergencyContact: values.emergencyContact.trim() || undefined,
    notes: values.notes.trim() || undefined,
    isForeigner: values.isForeigner,
    passportNumber: values.passportNumber.trim() || (values.isForeigner ? finalCccd : undefined),
    passportExpiryDate: values.passportExpiryDate.trim() || undefined,
    visaOrCardType: values.visaOrCardType,
    visaOrCardNumber: values.visaOrCardNumber.trim() || undefined,
    visaValidFrom: values.visaValidFrom.trim() || undefined,
    visaValidUntil: values.visaValidUntil.trim() || undefined,
    temporaryRegistrationCode: values.temporaryRegistrationCode.trim() || undefined,
    temporaryRegistrationDate: values.temporaryRegistrationDate.trim() || undefined,
    temporaryRegistrationStatus: values.temporaryRegistrationStatus,
    workPermitNumber: values.workPermitNumber.trim() || undefined,
    sponsoringOrganization: values.sponsoringOrganization.trim() || undefined,
    landlordContact: values.landlordContact.trim() || undefined,
    avatar:
      existing?.avatar ||
      (values.gender === "Nữ"
        ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
        : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"),
    joinDate: existing?.joinDate || new Date().toLocaleDateString("vi-VN")
  };
}

export function parseBirthDateToIso(birthDate?: string): string | null {
  if (!birthDate) return null;
  const trimmed = birthDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slashParts = trimmed.split("/");
  if (slashParts.length === 3) {
    const [d, m, y] = slashParts;
    if (y.length === 4 && m && d) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  return null;
}

export function residentToSupabasePayload(res: Resident) {
  const birthDateIso = parseBirthDateToIso(res.birthDate);
  const birthYear = birthDateIso ? parseInt(birthDateIso.slice(0, 4), 10) : extractBirthYear(res.birthDate);
  const isElderly = birthYear ? (new Date().getFullYear() - birthYear) >= 60 : false;
  const policyLower = (res.policyGroup || "").toLowerCase();

  return {
    full_name: res.fullName.trim(),
    cccd: res.cccd.trim(),
    gender: res.gender,
    birth_date: birthDateIso,
    phone: res.phone && res.phone !== "N/A" ? res.phone.trim() : null,
    address: (res.address || res.currentAddress || res.permanentAddress || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh").trim(),
    permanent_address: res.permanentAddress?.trim() || null,
    current_address: (res.currentAddress || res.temporaryAddress || res.address)?.trim() || null,
    father_name: res.fatherName?.trim() || null,
    mother_name: res.motherName?.trim() || null,
    temporary_reg_date: res.temporaryRegDate?.trim() || null,
    temporary_exp_date: res.temporaryExpDate?.trim() || null,
    management_status: res.managementStatus?.trim() || null,
    household_code: res.householdId?.trim() || null,
    relation_to_owner: res.relationToOwner?.trim() || "Thành viên",
    status: res.status || "Thường trú",
    occupation: res.occupation && res.occupation !== "Tự do" ? res.occupation.trim() : null,
    workplace: res.workplace?.trim() || null,
    nationality: res.nationality?.trim() || "Việt Nam",
    is_party_member: policyLower.includes("đảng viên"),
    is_policy_household: policyLower.includes("chính sách") || policyLower.includes("thương binh"),
    is_elderly: isElderly,
    is_poor_household: policyLower.includes("nghèo")
  };
}

export function synchronizeHouseholdsOnResidentEdit(
  households: Household[],
  oldRes: Resident,
  updatedRes: Resident
): Household[] {
  const birthYear = extractBirthYear(updatedRes.birthDate) || 1990;
  const updatedMemberEntry = {
    name: updatedRes.fullName,
    relation: updatedRes.relationToOwner,
    cccd: updatedRes.cccd,
    phone: updatedRes.phone || "N/A",
    birthYear
  };

  if (oldRes.householdId !== updatedRes.householdId) {
    return households.map(hh => {
      if (hh.code === oldRes.householdId) {
        const remaining = hh.members.filter(m => m.cccd !== oldRes.cccd);
        return {
          ...hh,
          memberCount: remaining.length,
          members: remaining
        };
      }
      if (hh.code === updatedRes.householdId) {
        const withoutDup = hh.members.filter(m => m.cccd !== updatedRes.cccd);
        const nextMembers = [...withoutDup, updatedMemberEntry];
        return {
          ...hh,
          memberCount: nextMembers.length,
          members: nextMembers
        };
      }
      return hh;
    });
  }

  return households.map(hh => {
    if (hh.code !== updatedRes.householdId) return hh;
    const foundExisting = hh.members.some(m => m.cccd === oldRes.cccd);
    const nextMembers = foundExisting
      ? hh.members.map(m => (m.cccd === oldRes.cccd ? { ...m, ...updatedMemberEntry } : m))
      : [...hh.members, updatedMemberEntry];
    return {
      ...hh,
      memberCount: nextMembers.length,
      members: nextMembers
    };
  });
}

export function buildGisTargetForResident(
  res: Resident,
  households: Household[] = []
): TargetGisItem {
  const hh = households.find(h => h.code === res.householdId || h.id === res.householdId);
  let coords = hh?.coordinates;
  if (!coords || !parseGisCoords(coords)) {
    const autoGeo = generateDefaultCoordinatesForAddress(res.address, res.id);
    coords = autoGeo.dms;
  }
  return {
    id: res.id,
    type: "household",
    name: `${res.fullName} (${isForeignResident(res) ? (res.nationality || "Nước ngoài") : res.status})`,
    address: res.address,
    coordinates: coords,
    navigateRoute: true
  };
}

export function downloadNA17Doc(res: Resident) {
  const docContent = `
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / SOCIALIST REPUBLIC OF VIETNAM
Độc lập - Tự do - Hạnh phúc / Independence - Freedom - Happiness
--------------------------------------------------------------------------------
Mẫu NA17 ban hành kèm theo Thông tư số 53/2016/TT-BCA ngày 28/12/2016 của Bộ Công an

PHIẾU KHAI BÁO TẠM TRÚ CHO NGƯỜI NƯỚC NGOÀI
TEMPORARY RESIDENCE DECLARATION FOR FOREIGNERS

Kính gửi (To): Công an Phường An Phú, TP. Hồ Chí Minh

1. Họ và tên / Full name (in capital letters): ${(res.fullName || "").toUpperCase()}
2. Giới tính / Sex: ${res.gender || "Nam"}
3. Ngày, tháng, năm sinh / Date of birth: ${res.birthDate || ""}
4. Quốc tịch / Nationality: ${res.nationality || "Nước ngoài"}
5. Số Hộ chiếu / Passport number: ${res.passportNumber || res.cccd || ""}
   - Có giá trị đến ngày / Expiry date: ${res.passportExpiryDate || "15/08/2028"}
   - Cơ quan cấp / Issuing authority: ${res.idIssuePlace || "Cục Quản lý Xuất nhập cảnh"}
6. Nghề nghiệp / Occupation: ${res.occupation || "Chuyên gia / Lao động nước ngoài"}
   - Nơi làm việc hoặc cơ quan bảo lãnh / Sponsoring company or organization: ${res.sponsoringOrganization || res.workplace || "Tự do"}
   - Số Giấy phép lao động / Work permit No.: ${res.workPermitNumber || "Miễn GPLĐ / Chưa cấp"}
7. Loại thị thực hoặc Thẻ cư trú / Visa or TRC:
   - Loại / Type: ${res.visaOrCardType || "Thẻ tạm trú (TRC)"}
   - Số hiệu / Number: ${res.visaOrCardNumber || "TRC-KR-2023-0941"}
   - Thời hạn cư trú / Validity: Từ ${res.visaValidFrom || "01/01/2023"} đến ${res.visaValidUntil || "31/12/2026"}
8. Địa chỉ tạm trú tại Việt Nam / Temporary residential address:
   - Địa chỉ: ${res.temporaryAddress || res.address || "42 Lương Định Của, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"}
   - Mã hộ liên kết: ${res.householdId || "HK-301"}
9. Mã số khai báo tạm trú trực tuyến (Cổng Dịch vụ công BCA):
   - Mã hồ sơ: ${res.temporaryRegistrationCode || "KBTT-AP-2024-ONLINE"}
   - Ngày khai báo: ${res.temporaryRegistrationDate || "15/01/2024"}
   - Tình trạng: ${res.temporaryRegistrationStatus || "Đã khai báo"}
10. Chủ cơ sở lưu trú / Người bảo lãnh cho thuê nhà / Host or Guarantor:
   - Họ tên & SĐT: ${res.landlordContact || "Ban Điều hành Khu phố 3 - 0903123456"}

TP. Hồ Chí Minh, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}

NGƯỜI NƯỚC NGOÀI KHAI BÁO       CHỦ CƠ SỞ LƯU TRÚ       XÁC NHẬN CÔNG AN PHƯỜNG AN PHÚ
   (Ký, ghi rõ họ tên)         (Ký, ghi rõ họ tên)               (Ký, đóng dấu)
  `;
  const filename = `Mau_NA17_Khai_Bao_Tam_Tru_${(res.fullName || "NNN").replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
  const blob = new Blob(["\uFEFF" + docContent], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



