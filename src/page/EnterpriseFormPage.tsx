import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  Camera,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Phone,
  UserCheck,
  Users2,
} from "lucide-react";
import { Business } from "../types";
import {
  getEnterpriseImage,
  getEnterpriseScaleLabel,
} from "../components/EnterpriseManagement";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { ReportSelect } from "../components/reports/ReportSelect";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { ROUTES, getEnterpriseDetailPath, navigate } from "../routes";

export interface EnterpriseFormPageProps {
  mode: "create" | "edit";
  enterpriseId?: string;
  businesses: Business[];
  isDataLoading?: boolean;
  onUpdateBusinesses?: (businesses: Business[]) => void;
  onCancel?: () => void;
  onSaved?: (savedEnterprise: Business, mode: "create" | "edit") => void;
}

const SUPPORT_NEED_OPTIONS = [
  "Vốn vay chính sách / ưu đãi",
  "Hướng dẫn PCCC & ANTT",
  "Hướng dẫn An toàn thực phẩm",
  "Mặt bằng & thủ tục thuê đất",
  "Giới thiệu nguồn lao động",
  "Hỗ trợ thủ tục hành chính địa phương",
];

export default function EnterpriseFormPage({
  mode,
  enterpriseId,
  businesses,
  isDataLoading = false,
  onUpdateBusinesses,
  onCancel,
  onSaved,
}: EnterpriseFormPageProps) {
  const targetEnterprise = useMemo(() => {
    if (mode !== "edit" || !enterpriseId) return null;
    return (
      businesses.find(
        (b) =>
          b.id === enterpriseId ||
          b.internalCode === enterpriseId ||
          b.taxCode === enterpriseId
      ) || null
    );
  }, [mode, enterpriseId, businesses]);

  const [name, setName] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [businessType, setBusinessType] =
    useState<Business["businessType"]>("Công ty TNHH");
  const [enterpriseScale, setEnterpriseScale] =
    useState<Business["enterpriseScale"]>("Nhỏ (5 - 20 LĐ)");
  const [type, setType] = useState("Thương mại dịch vụ");
  const [startDate, setStartDate] = useState(
    new Date().toLocaleDateString("vi-VN")
  );
  const [address, setAddress] = useState("");
  const [streetArea, setStreetArea] = useState("Mặt tiền Lương Định Của");
  const [premisesType, setPremisesType] =
    useState<Business["premisesType"]>("Văn phòng");
  const [premisesOwner, setPremisesOwner] = useState("");
  const [premisesOwnerPhone, setPremisesOwnerPhone] = useState("");
  const [linkedHouseholdCode, setLinkedHouseholdCode] = useState("");
  const [legalRep, setLegalRep] = useState("");
  const [legalRepPhone, setLegalRepPhone] = useState("");
  const [legalRepEmail, setLegalRepEmail] = useState("");
  const [siteManager, setSiteManager] = useState("");
  const [siteManagerPhone, setSiteManagerPhone] = useState("");
  const [focalPointName, setFocalPointName] = useState("");
  const [focalPointPhone, setFocalPointPhone] = useState("");
  const [focalPointRole, setFocalPointRole] = useState("Đại diện phối hợp");
  const [employeeCount, setEmployeeCount] = useState(5);
  const [localWorkers, setLocalWorkers] = useState(2);
  const [temporaryWorkers, setTemporaryWorkers] = useState(3);
  const [foreignWorkersCount, setForeignWorkersCount] = useState(0);
  const [supportNeeds, setSupportNeeds] = useState<string[]>([]);
  const [supportNotes, setSupportNotes] = useState("");
  const [image, setImage] = useState("");

  const [formNotice, setFormNotice] = useState<{
    message: string;
    type: "warning" | "info" | "success";
  } | null>(null);

  useEffect(() => {
    setFormNotice(null);
    if (mode === "edit" && targetEnterprise) {
      setName(targetEnterprise.name || "");
      setInternalCode(
        targetEnterprise.internalCode || `DN-KP3-${targetEnterprise.id}`
      );
      setTaxCode(targetEnterprise.taxCode || "");
      setBusinessType(
        (targetEnterprise.businessType as Business["businessType"]) ||
          "Công ty TNHH"
      );
      setEnterpriseScale(getEnterpriseScaleLabel(targetEnterprise));
      setType(targetEnterprise.type || "Thương mại dịch vụ");
      setStartDate(targetEnterprise.startDate || "01/01/2024");
      setAddress(targetEnterprise.address || "");
      setStreetArea(
        targetEnterprise.streetArea ||
          (targetEnterprise.address?.includes("42")
            ? "Hẻm 42 Lương Định Của"
            : "Mặt tiền Lương Định Của")
      );
      setPremisesType(
        (targetEnterprise.premisesType as Business["premisesType"]) ||
          "Văn phòng"
      );
      setPremisesOwner(targetEnterprise.premisesOwner || "");
      setPremisesOwnerPhone(targetEnterprise.premisesOwnerPhone || "");
      setLinkedHouseholdCode(targetEnterprise.linkedHouseholdCode || "");
      setLegalRep(
        targetEnterprise.legalRepresentative || targetEnterprise.owner || ""
      );
      setLegalRepPhone(
        targetEnterprise.legalRepPhone || targetEnterprise.phone || ""
      );
      setLegalRepEmail(targetEnterprise.legalRepEmail || "");
      setSiteManager(
        targetEnterprise.siteManager || targetEnterprise.owner || ""
      );
      setSiteManagerPhone(
        targetEnterprise.siteManagerPhone || targetEnterprise.phone || ""
      );
      setFocalPointName(
        targetEnterprise.focalPointName || targetEnterprise.owner || ""
      );
      setFocalPointPhone(
        targetEnterprise.focalPointPhone || targetEnterprise.phone || ""
      );
      setFocalPointRole(targetEnterprise.focalPointRole || "Đại diện phối hợp");
      setEmployeeCount(targetEnterprise.employeeCount || 5);
      setLocalWorkers(
        targetEnterprise.localWorkersCount ??
          Math.floor((targetEnterprise.employeeCount || 5) / 2)
      );
      setTemporaryWorkers(
        targetEnterprise.temporaryWorkersCount ??
          Math.ceil((targetEnterprise.employeeCount || 5) / 2)
      );
      setForeignWorkersCount(
        targetEnterprise.foreignWorkersCount ||
          targetEnterprise.foreignWorkers?.length ||
          0
      );
      setSupportNeeds(targetEnterprise.supportNeeds || []);
      setSupportNotes(targetEnterprise.supportNotes || "");
      setImage(targetEnterprise.image || "");
    } else if (mode === "create") {
      setName("");
      setInternalCode("");
      setTaxCode("");
      setBusinessType("Công ty TNHH");
      setEnterpriseScale("Nhỏ (5 - 20 LĐ)");
      setType("Thương mại dịch vụ");
      setStartDate(new Date().toLocaleDateString("vi-VN"));
      setAddress("");
      setStreetArea("Mặt tiền Lương Định Của");
      setPremisesType("Văn phòng");
      setPremisesOwner("");
      setPremisesOwnerPhone("");
      setLinkedHouseholdCode("");
      setLegalRep("");
      setLegalRepPhone("");
      setLegalRepEmail("");
      setSiteManager("");
      setSiteManagerPhone("");
      setFocalPointName("");
      setFocalPointPhone("");
      setFocalPointRole("Đại diện phối hợp");
      setEmployeeCount(5);
      setLocalWorkers(2);
      setTemporaryWorkers(3);
      setForeignWorkersCount(0);
      setSupportNeeds([]);
      setSupportNotes("");
      setImage("");
    }
  }, [mode, targetEnterprise?.id]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === "edit" && targetEnterprise) {
      navigate(getEnterpriseDetailPath(targetEnterprise.id));
    } else {
      navigate(ROUTES.DASHBOARD_ENTERPRISES);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormNotice({
        message: "Vui lòng nhập tên doanh nghiệp!",
        type: "warning",
      });
      return;
    }

    if (mode === "create") {
      let nextSeq = businesses.length + 1;
      let nextId = "B" + nextSeq.toString().padStart(3, "0");
      while (businesses.some((b) => b.id === nextId)) {
        nextSeq += 1;
        nextId = "B" + nextSeq.toString().padStart(3, "0");
      }
      const code = internalCode.trim() || `DN-KP3-${nextId}`;
      const defaultImg = getEnterpriseImage({
        id: nextId,
        name: name.trim(),
      } as Business);

      const newEnt: Business = {
        id: nextId,
        internalCode: code,
        name: name.trim(),
        taxCode:
          taxCode.trim() ||
          "03" + Math.floor(10000000 + Math.random() * 90000000),
        businessType,
        enterpriseScale,
        type: type.trim() || "Dịch vụ thương mại",
        industryGroup: "Kinh doanh & Dịch vụ",
        owner: legalRep.trim() || "Chưa cập nhật",
        phone: legalRepPhone.trim() || "0900000000",
        address: address.trim() || "Lương Định Của, Phường An Phú",
        licenseNumber: `GP-DN-${nextId}/AP`,
        status: "Đang hoạt động",
        startDate,
        verificationSource: "Ban Điều hành & Chi bộ KP3 ghi nhận",
        streetArea,
        premisesType,
        premisesOwner: premisesOwner.trim(),
        premisesOwnerPhone: premisesOwnerPhone.trim(),
        linkedHouseholdCode: linkedHouseholdCode.trim(),
        legalRepresentative: legalRep.trim() || "Chưa cập nhật",
        legalRepPhone: legalRepPhone.trim(),
        legalRepEmail: legalRepEmail.trim(),
        siteManager: siteManager.trim(),
        siteManagerPhone: siteManagerPhone.trim(),
        focalPointName: focalPointName.trim() || legalRep.trim(),
        focalPointPhone: focalPointPhone.trim() || legalRepPhone.trim(),
        focalPointRole: focalPointRole.trim(),
        employeeCount: employeeCount || 1,
        localWorkersCount: localWorkers,
        temporaryWorkersCount: temporaryWorkers,
        foreignWorkersCount,
        supportNeeds,
        supportNotes: supportNotes.trim(),
        safetyCertified: true,
        image: image || defaultImg,
        images: image ? [image] : [defaultImg],
        changeHistory: [
          {
            id: `CHG-${nextId}-INIT`,
            date: new Date().toLocaleDateString("vi-VN"),
            type: "Mở mới",
            description:
              "Ghi nhận thành lập & đăng ký hoạt động doanh nghiệp trên địa bàn KP3",
            recordedBy: "Cán bộ quản trị địa bàn",
          },
        ],
      };

      if (onUpdateBusinesses) {
        onUpdateBusinesses([newEnt, ...businesses]);
      }

      if (onSaved) {
        onSaved(newEnt, "create");
      } else {
        navigate(getEnterpriseDetailPath(newEnt.id));
      }
      return;
    }

    if (!targetEnterprise) return;

    const updated: Business = {
      ...targetEnterprise,
      name: name.trim(),
      internalCode: internalCode.trim(),
      taxCode: taxCode.trim(),
      businessType,
      enterpriseScale,
      type: type.trim(),
      startDate,
      address: address.trim(),
      streetArea,
      premisesType,
      premisesOwner: premisesOwner.trim(),
      premisesOwnerPhone: premisesOwnerPhone.trim(),
      linkedHouseholdCode: linkedHouseholdCode.trim(),
      legalRepresentative: legalRep.trim(),
      legalRepPhone: legalRepPhone.trim(),
      legalRepEmail: legalRepEmail.trim(),
      siteManager: siteManager.trim(),
      siteManagerPhone: siteManagerPhone.trim(),
      focalPointName: focalPointName.trim(),
      focalPointPhone: focalPointPhone.trim(),
      focalPointRole: focalPointRole.trim(),
      employeeCount,
      localWorkersCount: localWorkers,
      temporaryWorkersCount: temporaryWorkers,
      foreignWorkersCount,
      supportNeeds,
      supportNotes: supportNotes.trim(),
      image: image || targetEnterprise.image,
      images:
        image && !(targetEnterprise.images || []).includes(image)
          ? [image, ...(targetEnterprise.images || [])]
          : targetEnterprise.images,
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map((b) => (b.id === updated.id ? updated : b))
      );
    }

    if (onSaved) {
      onSaved(updated, "edit");
    } else {
      navigate(getEnterpriseDetailPath(updated.id));
    }
  };

  if (mode === "edit" && isDataLoading && !targetEnterprise) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <LoadingFade title="Đang tải thông tin doanh nghiệp..." />
      </div>
    );
  }

  if (mode === "edit" && !targetEnterprise) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Không tìm thấy hồ sơ doanh nghiệp để chỉnh sửa
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Mã hồ sơ{" "}
            <span className="font-mono font-semibold text-slate-800">
              {enterpriseId}
            </span>{" "}
            không tồn tại trong hệ thống.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(ROUTES.DASHBOARD_ENTERPRISES)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Quay lại Danh sách Doanh nghiệp</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>
            {mode === "edit" && targetEnterprise
              ? "Quay lại Chi tiết Doanh nghiệp"
              : "Quay lại Danh sách Doanh nghiệp"}
          </span>
        </button>
      </div>

      <PageHeader
        badgeIcon={Building2}
        badgeText={
          mode === "create"
            ? "Đăng ký doanh nghiệp mới"
            : `Cập nhật hồ sơ • ${targetEnterprise?.internalCode || targetEnterprise?.id}`
        }
        title={
          mode === "create"
            ? "Đăng ký Doanh nghiệp Mới trên địa bàn KP3"
            : `Chỉnh sửa Hồ sơ: ${targetEnterprise?.name}`
        }
        description="Cập nhật thông tin pháp lý, trụ sở mặt bằng, người đại diện, lực lượng lao động và nhu cầu hỗ trợ tại Khu phố 3"
      />

      {formNotice && (
        <InlineNotice
          message={formNotice.message}
          type={formNotice.type}
          onDismiss={() => setFormNotice(null)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6 text-xs text-slate-800"
      >
        {/* Group 1: Pháp lý */}
        <div className="space-y-3">
          <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Briefcase size={14} className="text-indigo-600" /> 1. Thông tin
            Doanh nghiệp &amp; Pháp lý
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tên Doanh nghiệp *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Công ty TNHH Công nghệ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Mã nội bộ
              </label>
              <input
                type="text"
                placeholder="DN-KP3-..."
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Hình ảnh Trụ sở / Văn phòng Doanh nghiệp */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <ImageIcon size={13} className="text-indigo-600" />
              <span>Hình ảnh Trụ sở / Văn phòng Doanh nghiệp</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 shadow-2xs flex items-center justify-center">
                {image ? (
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 size={24} className="text-slate-300" />
                )}
              </div>
              <div className="space-y-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                  <Camera size={13} className="text-indigo-600" />
                  <span>{image ? "Đổi ảnh khác" : "Chọn ảnh từ thiết bị"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = () => setImage(reader.result as string);
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="text-[11px] text-rose-600 hover:text-rose-800 ml-2 font-medium cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                )}
                <p className="text-[10px] text-slate-400">
                  {mode === "create"
                    ? "Nếu để trống, hệ thống sẽ tự động gán hình ảnh văn phòng hiện đại chuẩn mực."
                    : "Ảnh trụ sở, văn phòng hoặc biển hiệu nhận diện doanh nghiệp."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Mã số thuế / MSDN {mode === "create" ? "*" : ""}
              </label>
              <input
                type="text"
                required={mode === "create"}
                placeholder="031xxxxxxx"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Loại hình tổ chức *
              </label>
              <ReportSelect
                aria-label="Loại hình tổ chức"
                value={businessType || "Công ty TNHH"}
                onChange={(nextVal) => setBusinessType(nextVal as any)}
                options={[
                  { value: "Công ty TNHH", label: "Công ty TNHH" },
                  { value: "Công ty Cổ phần", label: "Công ty Cổ phần" },
                  {
                    value: "Doanh nghiệp tư nhân",
                    label: "Doanh nghiệp tư nhân",
                  },
                  { value: "Cơ sở kinh doanh khác", label: "Cơ sở khác" },
                ]}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Quy mô lao động (NĐ 80) *
              </label>
              <ReportSelect
                aria-label="Quy mô lao động (NĐ 80)"
                value={enterpriseScale || "Nhỏ (5 - 20 LĐ)"}
                onChange={(nextVal) => setEnterpriseScale(nextVal as any)}
                options={[
                  { value: "Siêu nhỏ (< 5 LĐ)", label: "Siêu nhỏ (< 5 LĐ)" },
                  { value: "Nhỏ (5 - 20 LĐ)", label: "Nhỏ (5 - 20 LĐ)" },
                  { value: "Vừa (20 - 50 LĐ)", label: "Vừa (20 - 50 LĐ)" },
                  { value: "Lớn (> 50 LĐ)", label: "Lớn (> 50 LĐ)" },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ngành nghề chính *
              </label>
              <input
                type="text"
                required
                placeholder="Phần mềm, Thương mại, Y tế..."
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ngày bắt đầu hoạt động
              </label>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Group 2: Địa điểm */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-emerald-600" /> 2. Trụ sở, Mặt
            bằng Kinh doanh &amp; Tuyến đường
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Địa chỉ trụ sở *
              </label>
              <input
                type="text"
                required
                placeholder="Số nhà, hẻm, Lương Định Của..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tuyến đường *
              </label>
              <ReportSelect
                aria-label="Tuyến đường"
                value={streetArea}
                onChange={(nextVal) => setStreetArea(nextVal)}
                options={[
                  {
                    value: "Mặt tiền Lương Định Của",
                    label: "Mặt tiền Lương Định Của",
                  },
                  {
                    value: "Hẻm 42 Lương Định Của",
                    label: "Hẻm 42 Lương Định Của",
                  },
                  {
                    value: "Hẻm 18 Lương Định Của",
                    label: "Hẻm 18 Lương Định Của",
                  },
                  {
                    value: "Khu dân cư nội bộ KP3",
                    label: "KDC nội bộ KP3",
                  },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Loại mặt bằng
              </label>
              <ReportSelect
                aria-label="Loại mặt bằng"
                value={premisesType || "Văn phòng"}
                onChange={(nextVal) => setPremisesType(nextVal as any)}
                options={[
                  { value: "Văn phòng", label: "Văn phòng" },
                  { value: "Nhà phố", label: "Nhà phố" },
                  { value: "Cửa hàng", label: "Cửa hàng" },
                  { value: "Nhà xưởng", label: "Nhà xưởng" },
                  { value: "Ki-ốt", label: "Ki-ốt" },
                  { value: "Địa điểm thuê", label: "Địa điểm thuê" },
                  { value: "Chung cư / Căn hộ", label: "Chung cư / Căn hộ" },
                ]}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Chủ sở hữu mặt bằng
              </label>
              <input
                type="text"
                placeholder="Tên chủ nhà / chủ mặt bằng"
                value={premisesOwner}
                onChange={(e) => setPremisesOwner(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Mã hộ dân KP3 liên kết
              </label>
              <input
                type="text"
                placeholder="HK-301, HK-302..."
                value={linkedHouseholdCode}
                onChange={(e) => setLinkedHouseholdCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Group 3: Người đại diện & Đầu mối */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-blue-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <UserCheck size={14} className="text-blue-600" /> 3. Người đại diện
            &amp; Đầu mối Công vụ
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Đại diện pháp luật *
              </label>
              <input
                type="text"
                required
                placeholder="Họ và tên người ĐDPL"
                value={legalRep}
                onChange={(e) => setLegalRep(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                SĐT đại diện *
              </label>
              <input
                type="text"
                required
                placeholder="0903xxxxxx"
                value={legalRepPhone}
                onChange={(e) => setLegalRepPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Email công vụ
              </label>
              <input
                type="email"
                placeholder="contact@doanhnghiep.vn"
                value={legalRepEmail}
                onChange={(e) => setLegalRepEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
          </div>

          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
            <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
              <Phone size={12} className="text-blue-700" /> Đầu mối phối hợp
              công vụ địa phương:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <input
                  type="text"
                  placeholder="Họ tên đầu mối"
                  value={focalPointName}
                  onChange={(e) => setFocalPointName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="SĐT công vụ tiếp nhận"
                  value={focalPointPhone}
                  onChange={(e) => setFocalPointPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Vai trò (Giám đốc, Quản lý...)"
                  value={focalPointRole}
                  onChange={(e) => setFocalPointRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Group 4: Lao động */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-purple-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Users2 size={14} className="text-purple-600" /> 4. Lực lượng Lao
            động &amp; Nước ngoài
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tổng số lao động *
              </label>
              <input
                type="number"
                min="1"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                LĐ thường trú KP3
              </label>
              <input
                type="number"
                min="0"
                value={localWorkers}
                onChange={(e) => setLocalWorkers(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                LĐ tạm trú
              </label>
              <input
                type="number"
                min="0"
                value={temporaryWorkers}
                onChange={(e) => setTemporaryWorkers(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                LĐ người nước ngoài
              </label>
              <input
                type="number"
                min="0"
                value={foreignWorkersCount}
                onChange={(e) => setForeignWorkersCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Group 5: Nhu cầu hỗ trợ */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-amber-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-amber-600" /> 5. Nhu cầu Hỗ
            trợ &amp; Ý kiến Khó khăn (Tự nguyện)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SUPPORT_NEED_OPTIONS.map((need, idx) => {
              const checked = supportNeeds.includes(need);
              return (
                <label
                  key={idx}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-[11px]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSupportNeeds([...supportNeeds, need]);
                      else
                        setSupportNeeds(
                          supportNeeds.filter((n) => n !== need)
                        );
                    }}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span>{need}</span>
                </label>
              );
            })}
          </div>
          <div>
            <textarea
              rows={2}
              placeholder="Ghi nhận các khó khăn về mặt bằng, giá thuê, tuyển dụng, trật tự đô thị..."
              value={supportNotes}
              onChange={(e) => setSupportNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer shadow-sm"
          >
            {mode === "create" ? "Đăng ký Doanh nghiệp" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
