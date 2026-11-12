import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building,
  Camera,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Phone,
  Store,
  Upload,
  UserCheck,
  Users2,
  X,
} from "lucide-react";
import { Business, BusinessFile } from "../types";
import {
  INDUSTRY_SECTORS,
  getBusinessIndustryGroup,
  isAccommodationBusiness,
} from "../components/BusinessManagement";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { ReportSelect } from "../components/reports/ReportSelect";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { ROUTES, getBusinessDetailPath, navigate } from "../routes";

export interface BusinessFormPageProps {
  mode: "create" | "edit";
  businessId?: string;
  businesses: Business[];
  isDataLoading?: boolean;
  onUpdateBusinesses?: (businesses: Business[]) => void;
  onCancel?: () => void;
  onSaved?: (savedBusiness: Business, mode: "create" | "edit") => void;
}

const SUPPORT_NEED_OPTIONS = [
  "Vốn vay chính sách / ưu đãi",
  "Hướng dẫn PCCC & ANTT",
  "Hướng dẫn An toàn thực phẩm",
  "Mặt bằng & thủ tục thuê đất",
  "Giới thiệu nguồn lao động",
  "Hỗ trợ thủ tục hành chính địa phương",
];

export default function BusinessFormPage({
  mode,
  businessId,
  businesses,
  isDataLoading = false,
  onUpdateBusinesses,
  onCancel,
  onSaved,
}: BusinessFormPageProps) {
  const targetBusiness = useMemo(() => {
    if (mode !== "edit" || !businessId) return null;
    return (
      businesses.find(
        (b) =>
          b.id === businessId ||
          b.internalCode === businessId ||
          b.licenseNumber === businessId ||
          b.taxCode === businessId
      ) || null
    );
  }, [mode, businessId, businesses]);

  // Group 1: Thông tin Cơ sở Kinh doanh & Giấy phép
  const [name, setName] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [businessType, setBusinessType] =
    useState<NonNullable<Business["businessType"]>>("Hộ kinh doanh");
  const [enterpriseScale, setEnterpriseScale] =
    useState<NonNullable<Business["enterpriseScale"]>>("Nhỏ (5 - 20 LĐ)");
  const [industryGroup, setIndustryGroup] = useState("Dịch vụ ăn uống");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("01/01/2024");
  const [verificationSource, setVerificationSource] = useState(
    "Khảo sát Ban Điều hành KP3 & CSKV"
  );

  // Group 2: Địa điểm, Mặt bằng & Liên kết Địa bàn
  const [address, setAddress] = useState("42 Lương Định Của, Phường An Phú");
  const [streetArea, setStreetArea] = useState("Mặt tiền Lương Định Của");
  const [premisesType, setPremisesType] =
    useState<NonNullable<Business["premisesType"]>>("Cửa hàng");
  const [premisesOwner, setPremisesOwner] = useState("");
  const [premisesOwnerPhone, setPremisesOwnerPhone] = useState("");
  const [linkedHouseholdCode, setLinkedHouseholdCode] = useState("");
  const [linkedBuildingOrHostel, setLinkedBuildingOrHostel] = useState("");
  const [coordinates, setCoordinates] = useState(
    "10°56'07.5\"N 106°44'38.0\"E"
  );

  // Group 3: Người đại diện & Đầu mối Liên hệ
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [legalRep, setLegalRep] = useState("");
  const [legalRepPhone, setLegalRepPhone] = useState("");
  const [legalRepCccd, setLegalRepCccd] = useState("");
  const [legalRepEmail, setLegalRepEmail] = useState("");
  const [siteManager, setSiteManager] = useState("");
  const [siteManagerPhone, setSiteManagerPhone] = useState("");
  const [focalPointName, setFocalPointName] = useState("");
  const [focalPointPhone, setFocalPointPhone] = useState("");
  const [focalPointRole, setFocalPointRole] = useState("Chủ cơ sở / Quản lý");

  // Group 4: Lực lượng Lao động
  const [employeeCount, setEmployeeCount] = useState(3);
  const [localWorkers, setLocalWorkers] = useState(2);
  const [temporaryWorkers, setTemporaryWorkers] = useState(2);
  const [foreignWorkersCount, setForeignWorkersCount] = useState(0);

  // Group 5: Nhu cầu Hỗ trợ
  const [supportNeeds, setSupportNeeds] = useState<string[]>([]);
  const [supportNotes, setSupportNotes] = useState("");

  // Group 6: Nhà trọ / Lưu trú
  const [isAccommodation, setIsAccommodation] = useState(false);
  const [soPhong, setSoPhong] = useState<number | string>(12);
  const [soTang, setSoTang] = useState<number | string>(3);
  const [soNguoiLuuTru, setSoNguoiLuuTru] = useState<number | string>(20);
  const [giaThueTrungBinh, setGiaThueTrungBinh] = useState(
    "2.5 - 3.5 triệu/tháng"
  );

  // Group 7: Địa chính & Sổ đỏ
  const [toBanDo, setToBanDo] = useState("272");
  const [soThua, setSoThua] = useState("55");
  const [dienTich, setDienTich] = useState<number | string>("150");
  const [loaiDat, setLoaiDat] = useState("ODT");
  const [tenChuSuDung, setTenChuSuDung] = useState("");
  const [soGcn, setSoGcn] = useState("");
  const [soVaoSo, setSoVaoSo] = useState("");
  const [soDoFile, setSoDoFile] = useState<BusinessFile | null>(null);
  const [giayPhepFile, setGiayPhepFile] = useState<BusinessFile | null>(null);
  const [pcccFile, setPcccFile] = useState<BusinessFile | null>(null);

  // Group 8: Hình ảnh đại diện
  const [image, setImage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [dragActiveSoDo, setDragActiveSoDo] = useState(false);
  const [dragActiveImage, setDragActiveImage] = useState(false);

  const [formNotice, setFormNotice] = useState<{
    type: "error" | "success" | "warning";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !targetBusiness) return;

    setName(targetBusiness.name);
    setType(targetBusiness.type);
    setIndustryGroup(
      targetBusiness.industryGroup || getBusinessIndustryGroup(targetBusiness)
    );
    setOwner(targetBusiness.owner);
    setPhone(targetBusiness.phone);
    setAddress(targetBusiness.address);
    setEmployeeCount(targetBusiness.employeeCount);
    setImage(targetBusiness.image || "");
    setImages(
      targetBusiness.images ||
        (targetBusiness.image ? [targetBusiness.image] : [])
    );
    setCoordinates(targetBusiness.coordinates || "");

    setInternalCode(targetBusiness.internalCode || `CSKD-${targetBusiness.id}`);
    setTaxCode(targetBusiness.licenseNumber || targetBusiness.taxCode || "");
    setBusinessType(targetBusiness.businessType || "Hộ kinh doanh");
    setEnterpriseScale(targetBusiness.enterpriseScale || "Siêu nhỏ (< 5 LĐ)");
    setStartDate(targetBusiness.startDate || "01/01/2023");
    setVerificationSource(
      targetBusiness.verificationSource || "Khảo sát Ban Điều hành KP3 & CSKV"
    );
    setStreetArea(
      targetBusiness.streetArea ||
        (targetBusiness.address.includes("42")
          ? "Hẻm 42 Lương Định Của"
          : "Mặt tiền Lương Định Của")
    );
    const isAcc = isAccommodationBusiness(targetBusiness);
    setPremisesType(
      targetBusiness.premisesType || (isAcc ? "Nhà phố" : "Cửa hàng")
    );
    setPremisesOwner(targetBusiness.premisesOwner || targetBusiness.owner);
    setPremisesOwnerPhone(
      targetBusiness.premisesOwnerPhone || targetBusiness.phone
    );
    setLinkedHouseholdCode(targetBusiness.linkedHouseholdCode || "");
    setLinkedBuildingOrHostel(targetBusiness.linkedBuildingOrHostel || "");
    setLegalRep(targetBusiness.legalRepresentative || targetBusiness.owner);
    setLegalRepPhone(targetBusiness.legalRepPhone || targetBusiness.phone);
    setLegalRepCccd(targetBusiness.legalRepCccd || "");
    setLegalRepEmail(targetBusiness.legalRepEmail || "");
    setSiteManager(targetBusiness.siteManager || targetBusiness.owner);
    setSiteManagerPhone(
      targetBusiness.siteManagerPhone || targetBusiness.phone
    );
    setFocalPointName(targetBusiness.focalPointName || targetBusiness.owner);
    setFocalPointPhone(targetBusiness.focalPointPhone || targetBusiness.phone);
    setFocalPointRole(targetBusiness.focalPointRole || "Chủ cơ sở");
    setLocalWorkers(
      targetBusiness.localWorkersCount ??
        Math.floor(targetBusiness.employeeCount / 2)
    );
    setTemporaryWorkers(
      targetBusiness.temporaryWorkersCount ??
        Math.ceil(targetBusiness.employeeCount / 2)
    );
    setForeignWorkersCount(
      targetBusiness.foreignWorkersCount ||
        (targetBusiness.foreignWorkers
          ? targetBusiness.foreignWorkers.length
          : 0)
    );
    setSupportNeeds(targetBusiness.supportNeeds || []);
    setSupportNotes(targetBusiness.supportNotes || "");

    setIsAccommodation(isAcc);
    setSoPhong(targetBusiness.soPhong || (isAcc ? 10 : 0));
    setSoTang(targetBusiness.soTang || (isAcc ? 3 : 0));
    setSoNguoiLuuTru(targetBusiness.soNguoiLuuTru || (isAcc ? 15 : 0));
    setGiaThueTrungBinh(
      targetBusiness.giaThueTrungBinh || (isAcc ? "2.5 - 3.5 triệu/tháng" : "")
    );

    setToBanDo(targetBusiness.toBanDo || "272");
    setSoThua(targetBusiness.soThua || "55");
    setDienTich(targetBusiness.dienTich || 120);
    setLoaiDat(targetBusiness.loaiDat || "ODT");
    setTenChuSuDung(targetBusiness.tenChuSuDung || targetBusiness.owner);
    setSoGcn(targetBusiness.soGcn || "");
    setSoVaoSo(targetBusiness.soVaoSo || "CS-2023-099");
    setSoDoFile(targetBusiness.soDoFile || null);
    setGiayPhepFile(targetBusiness.giayPhepFile || null);
    setPcccFile(targetBusiness.pcccFile || null);
  }, [mode, targetBusiness]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === "edit" && targetBusiness) {
      navigate(getBusinessDetailPath(targetBusiness.id));
      return;
    }
    navigate(ROUTES.DASHBOARD_BUSINESSES);
  };

  const handleProcessFileUpload = (
    file: File,
    onSuccess: (fileObj: BusinessFile) => void
  ) => {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setFormNotice({
        type: "error",
        message:
          "Chỉ hỗ trợ tệp định dạng PDF hoặc hình ảnh (PNG, JPG, WebP)!",
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFormNotice({
        type: "error",
        message: "Dung lượng tệp tối đa cho phép là 25MB!",
      });
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
        uploadDate: new Date().toLocaleDateString("vi-VN"),
      });
      setFormNotice({
        type: "success",
        message: `Đã nhận tệp: ${file.name} (${formattedSize})`,
      });
    };
    reader.onerror = () => {
      setFormNotice({
        type: "error",
        message: "Không thể đọc tệp tin đã chọn!",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormNotice(null);

    if (!name.trim() || !owner.trim() || !phone.trim() || !address.trim()) {
      setFormNotice({
        type: "error",
        message: "Vui lòng nhập đầy đủ các trường bắt buộc!",
      });
      return;
    }

    if (mode === "edit") {
      if (!targetBusiness) return;

      const updatedBusiness: Business = {
        ...targetBusiness,
        name: name.trim(),
        type: type.trim() || targetBusiness.type,
        industryGroup: industryGroup || getBusinessIndustryGroup(targetBusiness),
        owner: owner.trim(),
        phone: phone.trim(),
        address: address.trim(),
        employeeCount: Number(employeeCount) || 1,
        image: image || targetBusiness.image,
        images:
          images.length > 0
            ? images
            : image
              ? [image]
              : targetBusiness.images,
        coordinates: coordinates.trim(),

        internalCode: internalCode.trim(),
        taxCode: taxCode.trim(),
        businessType,
        enterpriseScale,
        startDate: startDate.trim(),
        verificationSource: verificationSource.trim(),
        streetArea,
        premisesType,
        premisesOwner: premisesOwner.trim(),
        premisesOwnerPhone: premisesOwnerPhone.trim(),
        linkedHouseholdCode: linkedHouseholdCode.trim(),
        linkedBuildingOrHostel: linkedBuildingOrHostel.trim(),
        legalRepresentative: legalRep.trim(),
        legalRepPhone: legalRepPhone.trim(),
        legalRepCccd: legalRepCccd.trim(),
        legalRepEmail: legalRepEmail.trim(),
        siteManager: siteManager.trim(),
        siteManagerPhone: siteManagerPhone.trim(),
        focalPointName: focalPointName.trim(),
        focalPointPhone: focalPointPhone.trim(),
        focalPointRole: focalPointRole.trim(),
        localWorkersCount: Number(localWorkers) || 0,
        temporaryWorkersCount: Number(temporaryWorkers) || 0,
        foreignWorkersCount: Number(foreignWorkersCount) || 0,
        supportNeeds,
        supportNotes,

        isAccommodation,
        soPhong: isAccommodation ? Number(soPhong) || 0 : undefined,
        soTang: isAccommodation ? Number(soTang) || 0 : undefined,
        soNguoiLuuTru: isAccommodation ? Number(soNguoiLuuTru) || 0 : undefined,
        giaThueTrungBinh: isAccommodation ? giaThueTrungBinh : undefined,

        toBanDo: toBanDo.trim(),
        soThua: soThua.trim(),
        dienTich,
        loaiDat: loaiDat.trim(),
        tenChuSuDung: tenChuSuDung.trim(),
        soGcn: soGcn.trim(),
        soVaoSo: soVaoSo.trim(),

        soDoFile: soDoFile || undefined,
        giayPhepFile: giayPhepFile || undefined,
        pcccFile: pcccFile || undefined,
      };

      if (onUpdateBusinesses) {
        onUpdateBusinesses(
          businesses.map((b) =>
            b.id === targetBusiness.id ? updatedBusiness : b
          )
        );
      }

      if (onSaved) {
        onSaved(updatedBusiness, "edit");
      } else {
        navigate(getBusinessDetailPath(updatedBusiness.id));
      }
      return;
    }

    const newId = "B" + (businesses.length + 1).toString().padStart(3, "0");
    const newLicense =
      taxCode.trim() || "GP-" + Math.floor(100000 + Math.random() * 900000);
    const isAcc =
      isAccommodation ||
      isAccommodationBusiness({ name, type } as Business);

    const newBusiness: Business = {
      id: newId,
      internalCode: internalCode.trim() || `DN-KP3-${newId}`,
      taxCode: taxCode.trim() || "",
      businessType,
      enterpriseScale,
      startDate: startDate.trim(),
      verificationSource,
      streetArea,
      premisesType,
      premisesOwner: premisesOwner.trim() || owner.trim(),
      premisesOwnerPhone: premisesOwnerPhone.trim() || phone.trim(),
      linkedHouseholdCode: linkedHouseholdCode.trim(),
      linkedBuildingOrHostel: linkedBuildingOrHostel.trim(),
      legalRepresentative: legalRep.trim() || owner.trim(),
      legalRepPhone: legalRepPhone.trim() || phone.trim(),
      legalRepCccd: legalRepCccd.trim(),
      legalRepEmail: legalRepEmail.trim(),
      siteManager: siteManager.trim() || owner.trim(),
      siteManagerPhone: siteManagerPhone.trim() || phone.trim(),
      focalPointName: focalPointName.trim() || owner.trim(),
      focalPointPhone: focalPointPhone.trim() || phone.trim(),
      focalPointRole: focalPointRole.trim(),
      localWorkersCount: Number(localWorkers) || 0,
      temporaryWorkersCount: Number(temporaryWorkers) || 0,
      foreignWorkersCount: Number(foreignWorkersCount) || 0,
      supportNeeds,
      supportNotes,

      name: name.trim(),
      type:
        type.trim() ||
        (isAcc ? "Nhà trọ / Cho thuê lưu trú" : "Cửa hàng tiện lợi"),
      industryGroup:
        industryGroup ||
        getBusinessIndustryGroup({ name, type } as Business),
      owner: owner.trim(),
      phone: phone.trim(),
      address: address.trim(),
      licenseNumber: newLicense,
      status: "Chờ duyệt",
      employeeCount: Number(employeeCount) || 1,
      safetyCertified: false,
      coordinates: coordinates.trim(),
      image:
        image ||
        (isAcc
          ? "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500"
          : "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400"),
      images: image ? [image] : [],

      isAccommodation: isAcc,
      soPhong: isAcc ? Number(soPhong) || 0 : undefined,
      soTang: isAcc ? Number(soTang) || 0 : undefined,
      soNguoiLuuTru: isAcc ? Number(soNguoiLuuTru) || 0 : undefined,
      giaThueTrungBinh: isAcc ? giaThueTrungBinh : undefined,

      toBanDo: toBanDo.trim(),
      soThua: soThua.trim(),
      dienTich,
      loaiDat: loaiDat.trim(),
      tenChuSuDung: tenChuSuDung.trim() || owner.trim(),
      soGcn:
        soGcn.trim() || "CH-" + Math.floor(100000 + Math.random() * 900000),
      soVaoSo: soVaoSo.trim() || "CS-2024-001",

      soDoFile: soDoFile || undefined,
      giayPhepFile: giayPhepFile || undefined,
      pcccFile: pcccFile || undefined,
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses([newBusiness, ...businesses]);
    }

    if (onSaved) {
      onSaved(newBusiness, "create");
    } else {
      navigate(getBusinessDetailPath(newBusiness.id));
    }
  };

  if (mode === "edit" && isDataLoading && !targetBusiness) {
    return (
      <LoadingFade title="Đang tải hồ sơ cơ sở kinh doanh để chỉnh sửa..." />
    );
  }

  if (mode === "edit" && !targetBusiness) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Không tìm thấy cơ sở kinh doanh
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Hồ sơ cơ sở kinh doanh có mã{" "}
                <span className="font-mono font-bold text-slate-700">
                  {businessId}
                </span>{" "}
                không tồn tại hoặc đã bị xóa khỏi cơ sở dữ liệu Khu phố 3.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD_BUSINESSES)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Quay lại danh sách Cơ sở Kinh doanh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        badgeIcon={Store}
        badgeText={
          mode === "create"
            ? "Đăng ký cơ sở mới"
            : `Chỉnh sửa hồ sơ • ${targetBusiness?.internalCode || targetBusiness?.id}`
        }
        title={
          mode === "create"
            ? "Đăng ký Cơ sở Kinh doanh mới tại KP3"
            : `Cập nhật hồ sơ: ${targetBusiness?.name}`
        }
        description="Chuẩn hóa thông tin hộ kinh doanh cá thể, nhà trọ lưu trú, người đại diện, địa chính Sổ đỏ và lực lượng lao động tại Khu phố 3"
        actions={
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            {mode === "edit" ? "Quay lại hồ sơ" : "Quay lại danh sách"}
          </button>
        }
      />

      {formNotice && (
        <InlineNotice
          type={formNotice.type}
          message={formNotice.message}
          onDismiss={() => setFormNotice(null)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-6"
      >
        {/* Group 1: Thông tin Cơ sở Kinh doanh & Giấy phép */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
            <Store size={14} className="text-amber-600" />
            1. Thông tin Cơ sở Kinh doanh &amp; Giấy phép
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Tên Cơ sở Kinh doanh / Hộ cá thể *
              </label>
              <input
                type="text"
                required
                placeholder="Hộ KD Phở Bò Gia Truyền, Quán Cà Phê Mộc, Nhà trọ..."
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (
                    mode === "create" &&
                    /nhà trọ|nhà nghỉ|khách sạn|homestay/i.test(val)
                  ) {
                    setIsAccommodation(true);
                    setIndustryGroup("Lưu trú & Cho thuê");
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Mã cơ sở / Mã nội bộ
              </label>
              <input
                type="text"
                placeholder="CSKD-B001 (tự tạo nếu để trống)"
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Số Giấy phép KD / Mã đăng ký
              </label>
              <input
                type="text"
                placeholder="GP-12345/AP hoặc số ĐKKD"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Loại hình cơ sở *
              </label>
              <ReportSelect
                aria-label="Loại hình cơ sở"
                value={businessType}
                onChange={(nextVal) =>
                  setBusinessType(
                    nextVal as NonNullable<Business["businessType"]>
                  )
                }
                options={[
                  { value: "Hộ kinh doanh", label: "Hộ kinh doanh cá thể" },
                  {
                    value: "Cơ sở kinh doanh khác",
                    label: "Cơ sở kinh doanh tại chỗ",
                  },
                  {
                    value: "Doanh nghiệp tư nhân",
                    label: "Cơ sở tư nhân dịch vụ",
                  },
                  { value: "Công ty TNHH", label: "Công ty TNHH" },
                ]}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Ngày bắt đầu hoạt động
              </label>
              <input
                type="text"
                placeholder="01/01/2024"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Nhóm ngành nghề phân loại *
              </label>
              <ReportSelect
                aria-label="Nhóm ngành nghề phân loại"
                value={industryGroup}
                onChange={(nextVal) => {
                  setIndustryGroup(nextVal);
                  if (nextVal === "Lưu trú & Cho thuê") {
                    setIsAccommodation(true);
                  }
                }}
                options={INDUSTRY_SECTORS.map((sec) => ({
                  value: sec.id,
                  label: `${sec.icon} ${sec.name}`,
                }))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Lĩnh vực / Loại hình cụ thể *
              </label>
              <input
                type="text"
                required={mode === "edit"}
                placeholder="Quán ăn, Cà phê, Tạp hóa, Tiệm thuốc, Nhà trọ..."
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Group 2: Địa điểm, Mặt bằng & Liên kết Địa bàn KP3 */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
            <MapPin size={14} className="text-emerald-600" />
            2. Địa điểm, Mặt bằng Kinh doanh &amp; Liên kết Địa bàn
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Địa chỉ cơ sở kinh doanh *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Tuyến đường / Phân khu *
              </label>
              <ReportSelect
                aria-label="Tuyến đường / Phân khu"
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
                    label: "Khu dân cư nội bộ KP3",
                  },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Loại mặt bằng *
              </label>
              <ReportSelect
                aria-label="Loại mặt bằng"
                value={premisesType}
                onChange={(nextVal) =>
                  setPremisesType(
                    nextVal as NonNullable<Business["premisesType"]>
                  )
                }
                options={[
                  { value: "Nhà phố", label: "Nhà phố" },
                  { value: "Cửa hàng", label: "Cửa hàng" },
                  { value: "Văn phòng", label: "Văn phòng" },
                  { value: "Nhà xưởng", label: "Nhà xưởng" },
                  { value: "Ki-ốt", label: "Ki-ốt" },
                  { value: "Địa điểm thuê", label: "Địa điểm thuê" },
                  { value: "Chung cư / Căn hộ", label: "Chung cư / Căn hộ" },
                ]}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Chủ sở hữu / Quản lý mặt bằng
              </label>
              <input
                type="text"
                placeholder="Tên chủ nhà / chủ mặt bằng"
                value={premisesOwner}
                onChange={(e) => setPremisesOwner(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Mã hộ dân KP3 liên kết
              </label>
              <input
                type="text"
                placeholder="HK-01, HK-02..."
                value={linkedHouseholdCode}
                onChange={(e) => setLinkedHouseholdCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Tọa độ GPS (nếu có)
              </label>
              <input
                type="text"
                placeholder="10.7935, 106.7445"
                value={coordinates}
                onChange={(e) => setCoordinates(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Group 3: Người đại diện & Đầu mối Liên hệ Địa phương */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
            <UserCheck size={14} className="text-blue-600" />
            3. Người đại diện &amp; Đầu mối Liên hệ Địa phương
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Người đại diện pháp luật / Chủ cơ sở *
              </label>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn Bình"
                value={owner}
                onChange={(e) => {
                  setOwner(e.target.value);
                  if (!legalRep) setLegalRep(e.target.value);
                  if (!tenChuSuDung) setTenChuSuDung(e.target.value);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Số điện thoại liên hệ *
              </label>
              <input
                type="text"
                required
                placeholder="0903xxxxxx"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (!legalRepPhone) setLegalRepPhone(e.target.value);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Người trực tiếp quản lý cơ sở tại chỗ
              </label>
              <input
                type="text"
                placeholder="Tên quản lý trực tiếp"
                value={siteManager}
                onChange={(e) => setSiteManager(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
            <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
              <Phone size={12} className="text-blue-700" />
              Đầu mối phối hợp khi địa phương tổ chức khảo sát / tuyên truyền /
              nhiệm vụ:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 block">
                  Họ tên đầu mối
                </label>
                <input
                  type="text"
                  placeholder="Họ và tên đầu mối"
                  value={focalPointName}
                  onChange={(e) => setFocalPointName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">
                  Số điện thoại công vụ
                </label>
                <input
                  type="text"
                  placeholder="SĐT công vụ tiếp nhận"
                  value={focalPointPhone}
                  onChange={(e) => setFocalPointPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">
                  Vai trò đầu mối
                </label>
                <input
                  type="text"
                  placeholder="Chủ cơ sở / Quản lý"
                  value={focalPointRole}
                  onChange={(e) => setFocalPointRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Group 4: Tình hình Hoạt động & Lực lượng Lao động */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
            <Users2 size={14} className="text-purple-600" />
            4. Tình hình Hoạt động &amp; Lực lượng Lao động
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Tổng số lao động *
              </label>
              <input
                type="number"
                min={1}
                value={employeeCount}
                onChange={(e) => setEmployeeCount(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:border-purple-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">
                LĐ thường trú KP3
              </label>
              <input
                type="number"
                min={0}
                value={localWorkers}
                onChange={(e) => setLocalWorkers(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">
                LĐ tạm trú
              </label>
              <input
                type="number"
                min={0}
                value={temporaryWorkers}
                onChange={(e) =>
                  setTemporaryWorkers(Number(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">
                LĐ người nước ngoài
              </label>
              <input
                type="number"
                min={0}
                value={foreignWorkersCount}
                onChange={(e) =>
                  setForeignWorkersCount(Number(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-purple-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Group 5: Nhu cầu Hỗ trợ */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 pb-1">
            <HelpCircle size={14} className="text-amber-600" />
            5. Nhu cầu Hỗ trợ &amp; Khó khăn do Cơ sở Tự nguyện Phản ánh
          </h4>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-700 block">
              Lĩnh vực cơ sở đề xuất hỗ trợ (chọn nhanh):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {SUPPORT_NEED_OPTIONS.map((need, idx) => {
                const checked = supportNeeds.includes(need);
                return (
                  <label
                    key={idx}
                    className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer text-[11px]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSupportNeeds([...supportNeeds, need]);
                        } else {
                          setSupportNeeds(
                            supportNeeds.filter((n) => n !== need)
                          );
                        }
                      }}
                      className="w-3.5 h-3.5 text-indigo-600 rounded"
                    />
                    <span className="text-slate-800 font-medium">{need}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 block">
              Ý kiến khó khăn / Kiến nghị gửi Chi bộ &amp; Ban ĐH KP3:
            </label>
            <textarea
              rows={2}
              placeholder="Ghi nhận các khó khăn về mặt bằng, giá thuê, tuyển dụng, trật tự đô thị..."
              value={supportNotes}
              onChange={(e) => setSupportNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>
        </div>

        {/* Group 6: Chuyên biệt Nhà trọ / Nhà nghỉ */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAccommodation}
                onChange={(e) => setIsAccommodation(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-300"
              />
              <span className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                <Building size={16} className="text-amber-700" />
                Đây là cơ sở kinh doanh Nhà trọ, Nhà nghỉ, Khách sạn lưu trú
              </span>
            </label>
            <span className="text-[10px] text-amber-800 font-bold bg-amber-200/60 px-2 py-0.5 rounded-full shrink-0">
              {isAccommodation ? "Đang bật" : "Tắt"}
            </span>
          </div>

          {isAccommodation && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-200/60">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-900 block">
                  Số tầng *
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="3"
                  value={soTang}
                  onChange={(e) => setSoTang(e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-900 block">
                  Số phòng *
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="12"
                  value={soPhong}
                  onChange={(e) => setSoPhong(e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-900 block">
                  Số người lưu trú
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="24"
                  value={soNguoiLuuTru}
                  onChange={(e) => setSoNguoiLuuTru(e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-900 block">
                  Giá thuê tham khảo
                </label>
                <input
                  type="text"
                  placeholder="2.5 - 3.5 triệu/tháng"
                  value={giaThueTrungBinh}
                  onChange={(e) => setGiaThueTrungBinh(e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Group 7: Thông tin Địa chính & Sổ đỏ */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet size={14} className="text-indigo-600" />
            6. Thông tin Địa chính &amp; Giấy chứng nhận QSDĐ (Sổ đỏ)
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Tờ bản đồ số
              </label>
              <input
                type="text"
                placeholder="272"
                value={toBanDo}
                onChange={(e) => setToBanDo(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Số thửa đất
              </label>
              <input
                type="text"
                placeholder="55"
                value={soThua}
                onChange={(e) => setSoThua(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Diện tích (m²)
              </label>
              <input
                type="text"
                placeholder="150"
                value={dienTich}
                onChange={(e) => setDienTich(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Loại đất
              </label>
              <input
                type="text"
                placeholder="ODT, TMD..."
                value={loaiDat}
                onChange={(e) => setLoaiDat(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Tên chủ sử dụng đất
              </label>
              <input
                type="text"
                placeholder="Nguyễn Văn Bình"
                value={tenChuSuDung}
                onChange={(e) => setTenChuSuDung(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Số GCN (Sổ đỏ)
              </label>
              <input
                type="text"
                placeholder="CH-098234"
                value={soGcn}
                onChange={(e) => setSoGcn(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Số vào sổ cấp GCN
              </label>
              <input
                type="text"
                placeholder="CS-2023-112"
                value={soVaoSo}
                onChange={(e) => setSoVaoSo(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-700 block flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Paperclip size={13} className="text-indigo-600" />
                Tải lên tệp Sổ đỏ / Giấy chứng nhận QSDĐ (Hỗ trợ PDF hoặc Hình
                ảnh)
              </span>
              <span className="text-[10px] text-slate-400">
                PDF, JPG, PNG &lt; 25MB
              </span>
            </label>

            <div
              className={`border border-dashed rounded-xl p-3.5 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
                dragActiveSoDo
                  ? "border-indigo-500 bg-indigo-50/50"
                  : "border-slate-300 hover:border-indigo-400 bg-white"
              }`}
              onDragEnter={() => setDragActiveSoDo(true)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActiveSoDo(true);
              }}
              onDragLeave={() => setDragActiveSoDo(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActiveSoDo(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleProcessFileUpload(e.dataTransfer.files[0], (fileObj) => {
                    setSoDoFile(fileObj);
                  });
                }
              }}
            >
              {soDoFile ? (
                <div className="flex items-center justify-between w-full p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2">
                    {soDoFile.type === "pdf" ? (
                      <FileText size={20} className="text-rose-600" />
                    ) : (
                      <ImageIcon size={20} className="text-blue-600" />
                    )}
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">
                        {soDoFile.name}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono">
                        Đã tải lên • {soDoFile.size}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoDoFile(null)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full py-2">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProcessFileUpload(
                          e.target.files[0],
                          (fileObj) => {
                            setSoDoFile(fileObj);
                          }
                        );
                      }
                    }}
                  />
                  <Upload size={22} className="text-indigo-500 mb-1" />
                  <p className="text-xs font-semibold text-slate-700">
                    Kéo thả tệp PDF Sổ đỏ hoặc ảnh tại đây, hoặc{" "}
                    <span className="text-indigo-600 hover:underline font-bold">
                      chọn tệp từ máy
                    </span>
                  </p>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Group 8: Hình ảnh đại diện */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
            <Camera size={14} className="text-indigo-600" />
            7. Hình ảnh thực tế mặt tiền cơ sở kinh doanh
          </label>

          <div
            className={`border border-dashed rounded-xl p-3.5 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
              dragActiveImage
                ? "border-emerald-500 bg-emerald-50/30"
                : "border-slate-300 hover:border-slate-400 bg-white"
            }`}
            onDragEnter={() => setDragActiveImage(true)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActiveImage(true);
            }}
            onDragLeave={() => setDragActiveImage(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActiveImage(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleProcessFileUpload(e.dataTransfer.files[0], (fileObj) => {
                  setImage(fileObj.url);
                });
              }
            }}
          >
            {image ? (
              <div className="relative w-full flex flex-col items-center">
                <div className="relative w-full max-w-md h-36 rounded-lg overflow-hidden border border-slate-100">
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="absolute top-1.5 right-1.5 bg-slate-900/75 hover:bg-slate-900 text-white p-1 rounded-full shadow transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center w-full py-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessFileUpload(e.target.files[0], (fileObj) => {
                        setImage(fileObj.url);
                      });
                    }
                  }}
                />
                <Camera size={22} className="text-slate-400 mb-1" />
                <p className="text-xs font-semibold text-slate-700">
                  Kéo thả ảnh mặt tiền cơ sở hoặc{" "}
                  <span className="text-emerald-600 hover:underline font-bold">
                    chọn từ thiết bị
                  </span>
                </p>
              </label>
            )}
          </div>
        </div>

        {/* Form Buttons */}
        <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5 text-sm">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-xs sm:text-sm font-semibold"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className={`px-5 py-2 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs sm:text-sm shadow-sm ${
              mode === "create"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {mode === "create" ? "Đăng ký Cơ sở" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
