import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Award,
  CreditCard,
  Globe,
  GraduationCap,
  Home,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { Household, Resident } from "../types";
import { isForeignResident, getCountryFlag } from "../components/CitizenManagement";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingFade } from "../components/common/LoadingFade";
import { ReportSelect } from "../components/reports/ReportSelect";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { ROUTES, navigate } from "../routes";

export type ResidentFormTab = "basic" | "residence" | "career" | "policy" | "foreigner";

export interface ResidentFormPageProps {
  mode: "create" | "edit";
  residentId?: string;
  initialForeigner?: boolean;
  residents: Resident[];
  households?: Household[];
  isDataLoading?: boolean;
  onAddResident: (resident: Resident) => void;
  onUpdateResidents?: React.Dispatch<React.SetStateAction<Resident[]>>;
  onUpdateHouseholds?: React.Dispatch<React.SetStateAction<Household[]>>;
  onCancel?: () => void;
  onSaved?: (savedResident: Resident, mode: "create" | "edit") => void;
}

const DEFAULT_FORM_STATE = {
  fullName: "",
  gender: "Nam" as "Nam" | "Nữ",
  birthDate: "",
  cccd: "",
  idIssueDate: "10/05/2021",
  idIssuePlace: "Cục Cảnh sát QLHC về TTXH",
  ethnicity: "Kinh",
  religion: "Không",
  nationality: "Việt Nam",
  hometown: "",
  phone: "",
  status: "Thường trú" as "Thường trú" | "Tạm trú" | "Tạm vắng",
  occupation: "",
  education: "Đại học",
  workplace: "",
  maritalStatus: "Đã kết hôn" as "Độc thân" | "Đã kết hôn" | "Ly hôn" | "Góa",
  address: "42/3 Lương Định Của, Phường An Phú",
  permanentAddress: "42/3 Lương Định Của, KP3, Phường An Phú, TP. Hồ Chí Minh",
  temporaryAddress: "42/3 Lương Định Của, KP3, Phường An Phú, TP. Hồ Chí Minh",
  householdId: "HK-301",
  relationToOwner: "Thành viên",
  healthInsuranceNumber: "",
  militaryServiceStatus: "Đã hoàn thành nghĩa vụ quân sự",
  policyGroup: "Bình thường",
  emergencyContact: "",
  notes: "",
  // Foreign resident fields
  isForeigner: false,
  passportNumber: "",
  passportExpiryDate: "",
  visaOrCardType: "Thẻ tạm trú (TRC)" as
    | "Thẻ tạm trú (TRC)"
    | "Thẻ thường trú (PRC)"
    | "Thị thực LĐ"
    | "Thị thực ĐT"
    | "Thị thực TT"
    | "Miễn thị thực / E-Visa",
  visaOrCardNumber: "",
  visaValidFrom: "",
  visaValidUntil: "",
  temporaryRegistrationCode: "",
  temporaryRegistrationDate: "",
  temporaryRegistrationStatus: "Đã khai báo" as
    | "Đã khai báo"
    | "Chờ xác nhận"
    | "Chưa khai báo"
    | "Hết hạn",
  workPermitNumber: "",
  sponsoringOrganization: "",
  landlordContact: "",
};

type ResidentFormState = typeof DEFAULT_FORM_STATE;

function mapResidentToFormState(res: Resident): ResidentFormState {
  const isForeign = isForeignResident(res);
  return {
    fullName: res.fullName || "",
    gender: res.gender || "Nam",
    birthDate: res.birthDate || "",
    cccd: res.cccd || "",
    idIssueDate: res.idIssueDate || "15/05/2021",
    idIssuePlace: res.idIssuePlace || "Cục Cảnh sát QLHC về TTXH",
    ethnicity: res.ethnicity || "Kinh",
    religion: res.religion || "Không",
    nationality: res.nationality || "Việt Nam",
    hometown: res.hometown || "",
    phone: res.phone === "N/A" ? "" : res.phone || "",
    status: res.status || "Thường trú",
    occupation: res.occupation === "Tự do" ? "" : res.occupation || "",
    education: res.education || "Đại học",
    workplace: res.workplace || "",
    maritalStatus: res.maritalStatus || "Đã kết hôn",
    address: res.address || "",
    permanentAddress: res.permanentAddress || res.address || "",
    temporaryAddress: res.temporaryAddress || res.address || "",
    householdId: res.householdId || "HK-301",
    relationToOwner: res.relationToOwner || "Thành viên",
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
    landlordContact: res.landlordContact || "",
  };
}

function buildCreateInitialState(initialForeigner: boolean): ResidentFormState {
  if (!initialForeigner) return DEFAULT_FORM_STATE;
  return {
    ...DEFAULT_FORM_STATE,
    isForeigner: true,
    status: "Tạm trú",
    nationality: "Hàn Quốc",
    ethnicity: "Hàn Quốc",
    religion: "Không",
    hometown: "Seoul, Hàn Quốc",
    idIssuePlace: "Cục Quản lý Xuất nhập cảnh Hàn Quốc",
    visaOrCardType: "Thẻ tạm trú (TRC)",
    temporaryRegistrationStatus: "Đã khai báo",
  };
}

export default function ResidentFormPage({
  mode,
  residentId,
  initialForeigner = false,
  residents,
  households = [],
  isDataLoading = false,
  onAddResident,
  onUpdateResidents,
  onUpdateHouseholds,
  onCancel,
  onSaved,
}: ResidentFormPageProps) {
  const targetResident = useMemo(() => {
    if (mode !== "edit" || !residentId) return null;
    return residents.find((r) => r.id === residentId || r.cccd === residentId) || null;
  }, [mode, residentId, residents]);

  const [formActiveTab, setFormActiveTab] = useState<ResidentFormTab>(() =>
    mode === "create" && initialForeigner ? "foreigner" : "basic"
  );
  const [formData, setFormData] = useState<ResidentFormState>(() => {
    if (mode === "edit" && targetResident) {
      return mapResidentToFormState(targetResident);
    }
    return buildCreateInitialState(initialForeigner);
  });
  const [notice, setNotice] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  // Đồng bộ form khi tham số route/params thay đổi hoặc dữ liệu cư dân vừa tải xong từ Supabase
  useEffect(() => {
    setNotice(null);
    if (mode === "edit") {
      setFormActiveTab("basic");
      if (targetResident) {
        setFormData(mapResidentToFormState(targetResident));
      }
    } else {
      setFormActiveTab(initialForeigner ? "foreigner" : "basic");
      setFormData(buildCreateInitialState(initialForeigner));
    }
  }, [mode, residentId, initialForeigner, targetResident]);

  const goBackToList = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(ROUTES.DASHBOARD_RESIDENTS);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCccd = formData.isForeigner
      ? formData.passportNumber || formData.cccd
      : formData.cccd;

    if (!formData.fullName.trim() || !finalCccd.trim()) {
      setNotice({
        message: "Vui lòng điền đầy đủ Họ tên và số CCCD / Hộ chiếu bắt buộc!",
        type: "warning",
      });
      return;
    }

    if (mode === "edit") {
      if (!targetResident) {
        setNotice({
          message: "Không tìm thấy hồ sơ cư dân để cập nhật.",
          type: "error",
        });
        return;
      }

      const updatedRes: Resident = {
        ...targetResident,
        fullName: formData.fullName,
        gender: formData.gender,
        birthDate: formData.birthDate || "01/01/1990",
        cccd: finalCccd,
        idIssueDate: formData.idIssueDate,
        idIssuePlace: formData.idIssuePlace,
        ethnicity: formData.ethnicity,
        religion: formData.religion,
        nationality: formData.nationality,
        hometown: formData.hometown,
        phone: formData.phone || "N/A",
        status: formData.status,
        education: formData.education,
        occupation: formData.occupation || "Tự do",
        workplace: formData.workplace,
        maritalStatus: formData.maritalStatus,
        address: formData.address,
        permanentAddress: formData.permanentAddress,
        temporaryAddress: formData.temporaryAddress,
        householdId: formData.householdId,
        relationToOwner: formData.relationToOwner,
        healthInsuranceNumber: formData.healthInsuranceNumber,
        militaryServiceStatus: formData.militaryServiceStatus,
        policyGroup: formData.policyGroup,
        emergencyContact: formData.emergencyContact,
        notes: formData.notes,
        isForeigner: formData.isForeigner,
        passportNumber:
          formData.passportNumber || (formData.isForeigner ? finalCccd : undefined),
        passportExpiryDate: formData.passportExpiryDate,
        visaOrCardType: formData.visaOrCardType,
        visaOrCardNumber: formData.visaOrCardNumber,
        visaValidFrom: formData.visaValidFrom,
        visaValidUntil: formData.visaValidUntil,
        temporaryRegistrationCode: formData.temporaryRegistrationCode,
        temporaryRegistrationDate: formData.temporaryRegistrationDate,
        temporaryRegistrationStatus: formData.temporaryRegistrationStatus,
        workPermitNumber: formData.workPermitNumber,
        sponsoringOrganization: formData.sponsoringOrganization,
        landlordContact: formData.landlordContact,
      };

      if (onUpdateResidents) {
        onUpdateResidents((prev) =>
          prev.map((r) => (r.id === targetResident.id ? updatedRes : r))
        );
      }

      if (onUpdateHouseholds && households) {
        onUpdateHouseholds((prevHouseholds) => {
          let updatedHouseholds = [...prevHouseholds];

          if (targetResident.householdId !== formData.householdId) {
            updatedHouseholds = updatedHouseholds.map((hh) => {
              if (hh.code === targetResident.householdId) {
                const remainingMembers = hh.members.filter(
                  (m) => m.cccd !== targetResident.cccd
                );
                return {
                  ...hh,
                  memberCount: remainingMembers.length,
                  members: remainingMembers,
                };
              }
              return hh;
            });

            updatedHouseholds = updatedHouseholds.map((hh) => {
              if (hh.code === formData.householdId) {
                const newMember = {
                  name: formData.fullName,
                  relation: formData.relationToOwner,
                  cccd: finalCccd,
                  phone: formData.phone || "N/A",
                  birthYear: parseInt(formData.birthDate.split("/")[2]) || 1990,
                };
                return {
                  ...hh,
                  memberCount: hh.memberCount + 1,
                  members: [...hh.members, newMember],
                };
              }
              return hh;
            });
          } else {
            updatedHouseholds = updatedHouseholds.map((hh) => {
              if (hh.code === formData.householdId) {
                const updatedMembers = hh.members.map((m) => {
                  if (m.cccd === targetResident.cccd) {
                    return {
                      ...m,
                      name: formData.fullName,
                      relation: formData.relationToOwner,
                      cccd: finalCccd,
                      phone: formData.phone || "N/A",
                      birthYear: parseInt(formData.birthDate.split("/")[2]) || 1990,
                    };
                  }
                  return m;
                });
                return {
                  ...hh,
                  members: updatedMembers,
                };
              }
              return hh;
            });
          }
          return updatedHouseholds;
        });
      }

      if (onSaved) {
        onSaved(updatedRes, "edit");
      } else {
        navigate(ROUTES.DASHBOARD_RESIDENTS);
      }
      return;
    }

    const candidateId = "R" + (residents.length + 1).toString().padStart(3, "0");
    const uniqueId = residents.some((r) => r.id === candidateId)
      ? `R-${Date.now()}`
      : candidateId;

    const newRes: Resident = {
      id: uniqueId,
      fullName: formData.fullName,
      gender: formData.gender,
      birthDate: formData.birthDate || "01/01/1990",
      cccd: finalCccd,
      idIssueDate: formData.idIssueDate,
      idIssuePlace: formData.idIssuePlace,
      ethnicity: formData.ethnicity,
      religion: formData.religion,
      nationality: formData.nationality,
      hometown: formData.hometown,
      phone: formData.phone || "N/A",
      status: formData.status,
      education: formData.education,
      occupation: formData.occupation || "Tự do",
      workplace: formData.workplace,
      maritalStatus: formData.maritalStatus,
      address: formData.address,
      permanentAddress: formData.permanentAddress,
      temporaryAddress: formData.temporaryAddress,
      householdId: formData.householdId,
      relationToOwner: formData.relationToOwner,
      healthInsuranceNumber: formData.healthInsuranceNumber,
      militaryServiceStatus: formData.militaryServiceStatus,
      policyGroup: formData.policyGroup,
      emergencyContact: formData.emergencyContact,
      notes: formData.notes,
      isForeigner: formData.isForeigner,
      passportNumber:
        formData.passportNumber || (formData.isForeigner ? finalCccd : undefined),
      passportExpiryDate: formData.passportExpiryDate,
      visaOrCardType: formData.visaOrCardType,
      visaOrCardNumber: formData.visaOrCardNumber,
      visaValidFrom: formData.visaValidFrom,
      visaValidUntil: formData.visaValidUntil,
      temporaryRegistrationCode: formData.temporaryRegistrationCode,
      temporaryRegistrationDate: formData.temporaryRegistrationDate,
      temporaryRegistrationStatus: formData.temporaryRegistrationStatus,
      workPermitNumber: formData.workPermitNumber,
      sponsoringOrganization: formData.sponsoringOrganization,
      landlordContact: formData.landlordContact,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      joinDate: new Date().toLocaleDateString("vi-VN"),
    };

    onAddResident(newRes);
    if (onSaved) {
      onSaved(newRes, "create");
    } else {
      navigate(ROUTES.DASHBOARD_RESIDENTS);
    }
  };

  if (mode === "edit" && !targetResident) {
    if (isDataLoading) {
      return (
        <LoadingFade
          variant="page"
          title="Đang tải thông tin hồ sơ cư dân..."
          subtitle={`Mã hồ sơ: ${residentId || ""}`}
          className="max-w-5xl mx-auto my-2"
        />
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-4 max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Không tìm thấy hồ sơ cư dân
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Không tìm thấy nhân khẩu với mã tham số{" "}
          <span className="font-mono font-semibold text-slate-800">
            {residentId || "(trống)"}
          </span>{" "}
          trong danh sách hiện tại.
        </p>
        <button
          type="button"
          onClick={goBackToList}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Quay lại Danh sách Cư dân
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto theme-loading-fade">
      <PageHeader
        badgeText={
          mode === "edit"
            ? `Cập nhật hồ sơ • ID: ${targetResident?.id || residentId}`
            : formData.isForeigner
              ? "Thêm người nước ngoài cư trú"
              : "Thêm mới nhân khẩu KP3"
        }
        title={
          mode === "edit"
            ? `Cập nhật hồ sơ cư dân: ${formData.fullName || targetResident?.fullName}`
            : "Thêm mới hồ sơ cư dân (Chuẩn 26 trường CSDL)"
        }
        description={
          mode === "edit"
            ? "Chỉnh sửa thông tin nhân khẩu và tự động đồng bộ liên kết sổ hộ khẩu."
            : "Nhập đầy đủ thông tin định danh, cư trú, việc làm, chính sách hoặc hộ chiếu/thị thực."
        }
        actions={
          <button
            type="button"
            id="btn-resident-form-back"
            onClick={goBackToList}
            className="inline-flex items-center gap-2 min-h-[40px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Quay lại danh sách</span>
          </button>
        }
      />

      {notice && (
        <InlineNotice
          message={notice.message}
          type={notice.type}
          onDismiss={() => setNotice(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Card Header Bar */}
        <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="text-emerald-600" size={18} />
            <span className="font-bold text-xs sm:text-sm text-slate-800">
              {mode === "edit"
                ? `Biểu mẫu cập nhật nhân khẩu (${targetResident?.cccd || ""})`
                : "Biểu mẫu tiếp nhận hồ sơ nhân khẩu mới"}
            </span>
          </div>
          {mode === "edit" && (
            <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              Param edit: {residentId}
            </span>
          )}
        </div>

        {/* Form Step Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFormActiveTab("basic")}
            className={`flex-1 min-w-[130px] py-3 px-2 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              formActiveTab === "basic"
                ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard size={14} /> 1. Định danh
          </button>
          <button
            type="button"
            onClick={() => setFormActiveTab("residence")}
            className={`flex-1 min-w-[130px] py-3 px-2 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              formActiveTab === "residence"
                ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Home size={14} /> 2. Cư trú & Hộ
          </button>
          <button
            type="button"
            onClick={() => setFormActiveTab("career")}
            className={`flex-1 min-w-[130px] py-3 px-2 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              formActiveTab === "career"
                ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap size={14} /> 3. Việc làm
          </button>
          <button
            type="button"
            onClick={() => setFormActiveTab("policy")}
            className={`flex-1 min-w-[130px] py-3 px-2 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              formActiveTab === "policy"
                ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award size={14} /> 4. Chính sách
          </button>
          <button
            type="button"
            onClick={() => setFormActiveTab("foreigner")}
            className={`flex-1 min-w-[150px] py-3 px-2 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              formActiveTab === "foreigner"
                ? "border-purple-600 text-purple-700 bg-white font-bold"
                : formData.isForeigner
                  ? "border-transparent text-purple-600 hover:text-purple-800 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe size={14} className={formData.isForeigner ? "text-purple-600" : ""} />
            <span>5. Hộ chiếu & Thị thực</span>
            {formData.isForeigner && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs">
          {/* TAB 1: BASIC & IDENTITY */}
          {formActiveTab === "basic" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Foreigner Switch Toggle */}
              <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Globe className="text-purple-600 shrink-0" size={18} />
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">
                      Là Người cư trú nước ngoài (Foreign Resident)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Sử dụng Hộ chiếu, theo dõi thị thực, thẻ tạm trú TRC & khai báo Công an Phường
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.isForeigner}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        isForeigner: checked,
                        status:
                          checked && prev.status === "Thường trú"
                            ? "Tạm trú"
                            : prev.status,
                        nationality:
                          checked && prev.nationality === "Việt Nam"
                            ? "Hàn Quốc"
                            : prev.nationality,
                      }));
                      if (checked) {
                        setFormActiveTab("foreigner");
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Họ và Tên *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder={
                      formData.isForeigner
                        ? "Park Min-ho, Johnathan Miller..."
                        : "Nguyễn Văn A"
                    }
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    {formData.isForeigner
                      ? "Số Hộ chiếu (Passport No.) *"
                      : "Số CCCD (12 số) *"}
                  </label>
                  <input
                    type="text"
                    name="cccd"
                    required
                    placeholder={
                      formData.isForeigner
                        ? "M89210452, UK55981240..."
                        : "0790xxxxxxxx"
                    }
                    value={formData.cccd}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        cccd: val,
                        passportNumber: prev.isForeigner ? val : prev.passportNumber,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Ngày cấp CCCD
                  </label>
                  <input
                    type="text"
                    name="idIssueDate"
                    placeholder="15/05/2021"
                    value={formData.idIssueDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Nơi cấp CCCD
                  </label>
                  <input
                    type="text"
                    name="idIssuePlace"
                    placeholder="Cục Cảnh sát QLHC về TTXH"
                    value={formData.idIssuePlace}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Giới tính</label>
                  <ReportSelect
                    aria-label="Giới tính"
                    value={formData.gender}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, gender: val as "Nam" | "Nữ" }))
                    }
                    options={[
                      { value: "Nam", label: "Nam" },
                      { value: "Nữ", label: "Nữ" },
                    ]}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Ngày sinh</label>
                  <input
                    type="text"
                    name="birthDate"
                    placeholder="DD/MM/YYYY"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Dân tộc</label>
                  <input
                    type="text"
                    name="ethnicity"
                    placeholder="Kinh, Hoa..."
                    value={formData.ethnicity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Tôn giáo</label>
                  <input
                    type="text"
                    name="religion"
                    placeholder="Không, Phật giáo..."
                    value={formData.religion}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Quốc tịch</label>
                  <input
                    type="text"
                    name="nationality"
                    placeholder="Việt Nam"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Quê quán</label>
                  <input
                    type="text"
                    name="hometown"
                    placeholder="Tỉnh/Thành phố quê hương"
                    value={formData.hometown}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESIDENCE & HOUSEHOLD */}
          {formActiveTab === "residence" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Diện cư trú *
                  </label>
                  <ReportSelect
                    aria-label="Diện cư trú"
                    value={formData.status}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: val as "Thường trú" | "Tạm trú" | "Tạm vắng",
                      }))
                    }
                    options={[
                      { value: "Thường trú", label: "Thường trú" },
                      { value: "Tạm trú", label: "Tạm trú" },
                      { value: "Tạm vắng", label: "Tạm vắng" },
                    ]}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Mã Hộ khẩu liên kết
                  </label>
                  <input
                    type="text"
                    name="householdId"
                    placeholder="HK-301"
                    value={formData.householdId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Quan hệ với chủ hộ
                  </label>
                  <input
                    type="text"
                    name="relationToOwner"
                    placeholder="Chủ hộ, Vợ, Con trai..."
                    value={formData.relationToOwner}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Địa chỉ cư trú hiện tại (Khu phố 3)
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Nơi thường trú gốc (Địa chỉ trên sổ hộ khẩu)
                </label>
                <input
                  type="text"
                  name="permanentAddress"
                  value={formData.permanentAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Nơi ở hiện nay / Nơi tạm trú (Nếu khác)
                </label>
                <input
                  type="text"
                  name="temporaryAddress"
                  value={formData.temporaryAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: CAREER & EDUCATION */}
          {formActiveTab === "career" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Trình độ học vấn
                  </label>
                  <input
                    type="text"
                    name="education"
                    placeholder="12/12, Đại học, Thạc sĩ..."
                    value={formData.education}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Tình trạng hôn nhân
                  </label>
                  <ReportSelect
                    aria-label="Tình trạng hôn nhân"
                    value={formData.maritalStatus || "Đã kết hôn"}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        maritalStatus: val as "Độc thân" | "Đã kết hôn" | "Ly hôn" | "Góa",
                      }))
                    }
                    options={[
                      { value: "Đã kết hôn", label: "Đã kết hôn" },
                      { value: "Độc thân", label: "Độc thân" },
                      { value: "Ly hôn", label: "Ly hôn" },
                      { value: "Góa", label: "Góa" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Nghề nghiệp hiện nay
                </label>
                <input
                  type="text"
                  name="occupation"
                  placeholder="Kỹ sư, Giáo viên, Kinh doanh, Cán bộ..."
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Nơi làm việc / Cơ quan công tác
                </label>
                <input
                  type="text"
                  name="workplace"
                  placeholder="Tên công ty, trường học, cơ quan..."
                  value={formData.workplace}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: POLICY, HEALTH & CONTACT */}
          {formActiveTab === "policy" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Diện chính sách / Đoàn thể
                  </label>
                  <input
                    type="text"
                    name="policyGroup"
                    placeholder="Đảng viên, Cựu chiến binh, Thương binh, Người cao tuổi..."
                    value={formData.policyGroup}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-semibold text-rose-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Mã số thẻ BHYT
                  </label>
                  <input
                    type="text"
                    name="healthInsuranceNumber"
                    placeholder="DN479xxxxxxxxx"
                    value={formData.healthInsuranceNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Nghĩa vụ quân sự
                  </label>
                  <input
                    type="text"
                    name="militaryServiceStatus"
                    placeholder="Đã hoàn thành, Sĩ quan dự bị, Tạm hoãn..."
                    value={formData.militaryServiceStatus}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Số điện thoại liên lạc
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="09xxxxxxxx"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Người liên hệ khẩn cấp (Họ tên & SĐT)
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  placeholder="Nguyễn Văn B (Cha) - 0903xxxxxx"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Ghi chú quản lý cư trú
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Ghi chú thêm về nhân khẩu..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* TAB 5: FOREIGNER & VISA / RESIDENCE CARD */}
          {formActiveTab === "foreigner" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="text-purple-600" size={16} />
                  <span className="font-bold text-purple-900 text-xs">
                    Hồ sơ Cư trú & Thị thực Người nước ngoài (Bộ Công an & QLXNC)
                  </span>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                  Luật 47/2014 & TT 53/2016
                </span>
              </div>

              {/* Nationality & Country Flag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Quốc tịch (Nationality) *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <ReportSelect
                        aria-label="Quốc tịch"
                        value={formData.nationality || "Hàn Quốc"}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            nationality: val,
                            ethnicity: val,
                          }))
                        }
                        options={[
                          { value: "Hàn Quốc", label: "🇰🇷 Hàn Quốc (Republic of Korea)" },
                          { value: "Vương quốc Anh", label: "🇬🇧 Vương quốc Anh (United Kingdom)" },
                          { value: "Nhật Bản", label: "🇯🇵 Nhật Bản (Japan)" },
                          { value: "Hoa Kỳ", label: "🇺🇸 Hoa Kỳ (United States)" },
                          { value: "Úc", label: "🇦🇺 Úc (Australia)" },
                          { value: "Đài Loan", label: "🇹🇼 Đài Loan (Taiwan)" },
                          { value: "Trung Quốc", label: "🇨🇳 Trung Quốc (China)" },
                          { value: "Pháp", label: "🇫🇷 Pháp (France)" },
                          { value: "Đức", label: "🇩🇪 Đức (Germany)" },
                          { value: "Singapore", label: "🇸🇬 Singapore" },
                          { value: "Canada", label: "🇨🇦 Canada" },
                          { value: "Nga", label: "🇷🇺 Nga (Russia)" },
                          { value: "Việt Nam", label: "🇻🇳 Việt Nam" },
                          { value: "Khác", label: "🌍 Quốc gia khác" },
                        ]}
                        className="w-full"
                      />
                    </div>
                    <span className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg text-lg border border-slate-200 shrink-0">
                      {getCountryFlag(formData.nationality)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Số Hộ chiếu (Passport No.) *
                  </label>
                  <input
                    type="text"
                    name="passportNumber"
                    placeholder="M89210452, UK55981240..."
                    value={formData.passportNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        passportNumber: val,
                        cccd: val,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Passport Expiry & Issuing Authority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Ngày hết hạn Hộ chiếu
                  </label>
                  <input
                    type="text"
                    name="passportExpiryDate"
                    placeholder="DD/MM/YYYY"
                    value={formData.passportExpiryDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Cơ quan cấp Hộ chiếu
                  </label>
                  <input
                    type="text"
                    name="idIssuePlace"
                    placeholder="Cục Quản lý Xuất nhập cảnh, Bộ Ngoại giao..."
                    value={formData.idIssuePlace}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Visa / Card Type & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Loại thị thực / Thẻ cư trú
                  </label>
                  <ReportSelect
                    aria-label="Loại thị thực hoặc thẻ cư trú"
                    value={formData.visaOrCardType || "Thẻ tạm trú (TRC)"}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        visaOrCardType: val as ResidentFormState["visaOrCardType"],
                      }))
                    }
                    options={[
                      { value: "Thẻ tạm trú (TRC)", label: "Thẻ tạm trú (TRC)" },
                      { value: "Thẻ thường trú (PRC)", label: "Thẻ thường trú (PRC)" },
                      { value: "Thị thực LĐ", label: "Thị thực Lao động (Visa LĐ)" },
                      { value: "Thị thực ĐT", label: "Thị thực Đầu tư (Visa ĐT)" },
                      { value: "Thị thực TT", label: "Thị thực Thăm thân (Visa TT)" },
                      { value: "Miễn thị thực / E-Visa", label: "Miễn thị thực / E-Visa" },
                    ]}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Số thẻ / Số thị thực
                  </label>
                  <input
                    type="text"
                    name="visaOrCardNumber"
                    placeholder="TRC-KR-2023-0941..."
                    value={formData.visaOrCardNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Validity range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Thời hạn từ ngày
                  </label>
                  <input
                    type="text"
                    name="visaValidFrom"
                    placeholder="DD/MM/YYYY"
                    value={formData.visaValidFrom}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Thời hạn đến ngày (Hạn cư trú)
                  </label>
                  <input
                    type="text"
                    name="visaValidUntil"
                    placeholder="DD/MM/YYYY"
                    value={formData.visaValidUntil}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500 font-bold"
                  />
                </div>
              </div>

              {/* Police Temporary Registration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Mã khai báo CA Phường
                  </label>
                  <input
                    type="text"
                    name="temporaryRegistrationCode"
                    placeholder="KBTT-AP-2024-xxxx"
                    value={formData.temporaryRegistrationCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Ngày khai báo
                  </label>
                  <input
                    type="text"
                    name="temporaryRegistrationDate"
                    placeholder="DD/MM/YYYY"
                    value={formData.temporaryRegistrationDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Tình trạng khai báo
                  </label>
                  <ReportSelect
                    aria-label="Tình trạng khai báo"
                    value={formData.temporaryRegistrationStatus || "Đã khai báo"}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        temporaryRegistrationStatus:
                          val as ResidentFormState["temporaryRegistrationStatus"],
                      }))
                    }
                    options={[
                      { value: "Đã khai báo", label: "Đã khai báo (Hợp pháp)" },
                      { value: "Chờ xác nhận", label: "Chờ xác nhận" },
                      { value: "Chưa khai báo", label: "Chưa khai báo" },
                      { value: "Hết hạn", label: "Hết hạn" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Work permit & Sponsoring org */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Số Giấy phép LĐ (GPLĐ) / Miễn
                  </label>
                  <input
                    type="text"
                    name="workPermitNumber"
                    placeholder="GPLĐ-2023-xxxx/SLĐTBXH"
                    value={formData.workPermitNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Cơ quan / Doanh nghiệp bảo lãnh
                  </label>
                  <input
                    type="text"
                    name="sponsoringOrganization"
                    placeholder="Công ty TNHH..., Trường Quốc tế..."
                    value={formData.sponsoringOrganization}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Landlord Contact */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Chủ nhà / Cơ sở lưu trú cho thuê (Họ tên & SĐT)
                </label>
                <input
                  type="text"
                  name="landlordContact"
                  placeholder="Nguyễn Văn A (Chủ nhà 42/3 LĐC) - 0903xxxxxx"
                  value={formData.landlordContact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* Form Navigation & Submit */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {formActiveTab !== "basic" && (
                <button
                  type="button"
                  onClick={() => {
                    if (formActiveTab === "foreigner") setFormActiveTab("policy");
                    else if (formActiveTab === "policy") setFormActiveTab("career");
                    else if (formActiveTab === "career") setFormActiveTab("residence");
                    else if (formActiveTab === "residence") setFormActiveTab("basic");
                  }}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Quay lại bước trước
                </button>
              )}
              {formActiveTab !== (formData.isForeigner ? "foreigner" : "policy") && (
                <button
                  type="button"
                  onClick={() => {
                    if (formActiveTab === "basic") setFormActiveTab("residence");
                    else if (formActiveTab === "residence") setFormActiveTab("career");
                    else if (formActiveTab === "career") setFormActiveTab("policy");
                    else if (formActiveTab === "policy" && formData.isForeigner)
                      setFormActiveTab("foreigner");
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer font-semibold"
                >
                  Tiếp theo
                </button>
              )}
            </div>

            <div className="flex gap-2.5 ml-auto">
              <button
                type="button"
                onClick={goBackToList}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                id="btn-resident-form-submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
              >
                {mode === "edit" ? "Lưu thay đổi" : "Lưu vào Danh sách Cư dân"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
