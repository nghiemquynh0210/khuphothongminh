import React, { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Camera,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Paperclip,
  Phone,
  Save,
  ShieldCheck,
  Store,
  Upload,
  UserCheck,
  Users2,
  X
} from "lucide-react";
import { Business } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { ROUTES, getBusinessDetailPath, navigate } from "../routes";
import {
  BUSINESS_STREET_AREAS,
  BusinessFormValues,
  BusinessOrgType,
  BusinessPremisesType,
  BusinessStatus,
  INDUSTRY_SECTORS,
  SUPPORT_NEEDS_OPTIONS,
  businessToFormValues,
  createInitialBusinessFormValues,
  findBusinessByIdOrCode,
  formValuesToBusiness,
  processBusinessFileUpload
} from "../utils/businessFormUtils";

export interface BusinessFormPageProps {
  mode: "create" | "edit";
  businessId?: string;
  businesses: Business[];
  isDataLoading?: boolean;
  onSaveBusiness: (
    savedBusiness: Business,
    isEdit: boolean,
    oldBusiness?: Business
  ) => void;
  onShowToast?: (message: string) => void;
}

interface FieldError {
  id: string;
  label: string;
  message: string;
}

const INPUT_BASE =
  "w-full px-3 py-2 border rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all";
const INPUT_NORMAL = `${INPUT_BASE} border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500`;
const INPUT_ERROR = `${INPUT_BASE} border-rose-500 bg-rose-50/40 focus:ring-rose-500/20 focus:border-rose-600`;

export default function BusinessFormPage({
  mode,
  businessId,
  businesses,
  isDataLoading = false,
  onSaveBusiness,
  onShowToast
}: BusinessFormPageProps) {
  const existingBusiness =
    mode === "edit" && businessId
      ? findBusinessByIdOrCode(businesses, businessId)
      : null;

  const currentSyncKey =
    mode === "edit"
      ? existingBusiness
        ? `edit:${existingBusiness.id}`
        : `edit-pending:${businessId || ""}`
      : "create";

  const [trackedSyncKey, setTrackedSyncKey] = useState(currentSyncKey);
  const [values, setValues] = useState<BusinessFormValues>(() =>
    mode === "edit" && existingBusiness
      ? businessToFormValues(existingBusiness)
      : createInitialBusinessFormValues()
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [dragActiveSoDo, setDragActiveSoDo] = useState(false);
  const [dragActiveImage, setDragActiveImage] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  if (trackedSyncKey !== currentSyncKey) {
    setTrackedSyncKey(currentSyncKey);
    setValues(
      mode === "edit" && existingBusiness
        ? businessToFormValues(existingBusiness)
        : createInitialBusinessFormValues()
    );
    setSubmitAttempted(false);
    setUploadNotice(null);
  }

  const handleBack = () => {
    if (mode === "edit" && existingBusiness) {
      navigate(getBusinessDetailPath(existingBusiness.id));
      return;
    }
    navigate(ROUTES.DASHBOARD_BUSINESSES);
  };

  if (mode === "edit" && !existingBusiness && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-bold text-slate-800">
          Đang tải hồ sơ cơ sở kinh doanh cần chỉnh sửa...
        </p>
      </div>
    );
  }

  if (mode === "edit" && !existingBusiness) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Store size={28} />
        </div>
        <h2 className="text-lg font-black text-slate-900">
          Không tìm thấy cơ sở kinh doanh
        </h2>
        <button
          type="button"
          onClick={() => navigate(ROUTES.DASHBOARD_BUSINESSES)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Quay lại Danh sách Cơ sở Kinh doanh</span>
        </button>
      </div>
    );
  }

  const validate = (formVals: BusinessFormValues): FieldError[] => {
    const errors: FieldError[] = [];
    if (!formVals.name.trim()) {
      errors.push({
        id: "biz-name",
        label: "Tên Cơ sở Kinh doanh",
        message: "Vui lòng nhập tên cơ sở kinh doanh hoặc hộ kinh doanh."
      });
    }
    if (!formVals.type.trim()) {
      errors.push({
        id: "biz-type",
        label: "Lĩnh vực / Loại hình cụ thể",
        message: "Vui lòng nhập lĩnh vực kinh doanh cụ thể (VD: Quán ăn, Tạp hóa, Nhà trọ...)."
      });
    }
    if (!formVals.address.trim()) {
      errors.push({
        id: "biz-address",
        label: "Địa chỉ cơ sở",
        message: "Vui lòng nhập địa chỉ cơ sở kinh doanh."
      });
    }
    if (!formVals.owner.trim()) {
      errors.push({
        id: "biz-owner",
        label: "Chủ cơ sở / Đại diện pháp luật",
        message: "Vui lòng nhập họ tên chủ cơ sở hoặc người đại diện pháp luật."
      });
    }
    if (!formVals.phone.trim()) {
      errors.push({
        id: "biz-phone",
        label: "Số điện thoại liên hệ",
        message: "Vui lòng nhập số điện thoại liên hệ."
      });
    }
    if (formVals.isAccommodation) {
      const tangNum = Number(formVals.soTang);
      const phongNum = Number(formVals.soPhong);
      if (!formVals.soTang.trim() || Number.isNaN(tangNum) || tangNum < 1) {
        errors.push({
          id: "biz-so-tang",
          label: "Số tầng",
          message: "Cơ sở lưu trú phải có số tầng từ 1 trở lên."
        });
      }
      if (!formVals.soPhong.trim() || Number.isNaN(phongNum) || phongNum < 1) {
        errors.push({
          id: "biz-so-phong",
          label: "Số phòng",
          message: "Cơ sở lưu trú phải có số phòng từ 1 trở lên."
        });
      }
    }
    return errors;
  };

  const errors = submitAttempted ? validate(values) : [];
  const getError = (id: string) => errors.find(e => e.id === id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const currentErrors = validate(values);
    if (currentErrors.length > 0) {
      window.setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 0);
      return;
    }

    const fallbackId = existingBusiness?.id || String(Date.now());
    const saved = formValuesToBusiness(values, existingBusiness, fallbackId);
    onSaveBusiness(saved, mode === "edit", existingBusiness || undefined);
    onShowToast?.(
      mode === "edit"
        ? `Đã cập nhật hồ sơ cơ sở "${saved.name}".`
        : `Đã đăng ký cơ sở kinh doanh "${saved.name}" vào hệ thống.`
    );
    navigate(getBusinessDetailPath(saved.id));
  };

  const handlePickSoDo = (file: File) => {
    setUploadNotice(null);
    processBusinessFileUpload(
      file,
      fileObj => setValues(prev => ({ ...prev, soDoFile: fileObj })),
      err => setUploadNotice(err)
    );
  };

  const handlePickCoverImage = (file: File) => {
    setUploadNotice(null);
    processBusinessFileUpload(
      file,
      fileObj => {
        if (fileObj.type !== "image") {
          setUploadNotice("Ảnh đại diện chỉ hỗ trợ định dạng PNG, JPG, WebP hoặc GIF.");
          return;
        }
        setValues(prev => ({ ...prev, image: fileObj.url }));
      },
      err => setUploadNotice(err)
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={14} />
          <span>
            {mode === "edit" ? "Quay lại Chi tiết Cơ sở" : "Quay lại Danh sách"}
          </span>
        </button>
      </div>

      <PageHeader
        badgeIcon={<Store size={14} className="text-emerald-600" />}
        badgeText={
          mode === "edit"
            ? "Cập nhật Hồ sơ Cơ sở KP3"
            : "Đăng ký Cơ sở Kinh doanh Mới"
        }
        title={
          mode === "edit"
            ? `Chỉnh sửa: ${existingBusiness?.name || ""}`
            : "Đăng ký Cơ sở / Hộ Kinh doanh Mới"
        }
        description={
          mode === "edit"
            ? "Cập nhật thông tin giấy phép, ngành nghề, địa chính, nhà trọ lưu trú và đầu mối liên hệ địa phương."
            : "Nhập đầy đủ thông tin hộ kinh doanh / cơ sở dịch vụ mới trên địa bàn Khu phố 3 An Phú."
        }
      />

      {submitAttempted && errors.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="business-form-error-summary-title"
          className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-950 space-y-2 shadow-xs focus:outline-none"
        >
          <div className="flex items-center gap-2 font-black text-sm text-rose-900">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <h2 id="business-form-error-summary-title">
              Vui lòng kiểm tra lại {errors.length} thông tin bắt buộc trước khi lưu:
            </h2>
          </div>
          <ul className="list-disc pl-6 space-y-1 text-xs font-semibold">
            {errors.map(err => (
              <li key={err.id}>
                <a
                  href={`#${err.id}`}
                  className="underline hover:text-rose-700"
                >
                  {err.label}: {err.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploadNotice && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-1.5">
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
            <span>{uploadNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setUploadNotice(null)}
            className="p-1 hover:bg-amber-100 rounded cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-6"
      >
        {/* Group 1: Thông tin Cơ sở & Giấy phép */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Store size={15} className="text-amber-600" />
            1. Thông tin Cơ sở Kinh doanh & Giấy phép
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="biz-name" className="text-xs font-semibold text-slate-700 block">
                Tên Cơ sở Kinh doanh / Hộ kinh doanh *
              </label>
              <input
                id="biz-name"
                type="text"
                placeholder="Hộ KD Phở Bò Gia Truyền, Quán Cà Phê Mộc, Nhà trọ..."
                value={values.name}
                aria-invalid={getError("biz-name") ? "true" : "false"}
                onChange={e => {
                  const val = e.target.value;
                  const matchesAccom = /nhà trọ|nhà nghỉ|khách sạn|homestay/i.test(val);
                  setValues(prev => ({
                    ...prev,
                    name: val,
                    isAccommodation: matchesAccom ? true : prev.isAccommodation,
                    industryGroup: matchesAccom
                      ? "Lưu trú & Cho thuê"
                      : prev.industryGroup
                  }));
                }}
                className={getError("biz-name") ? INPUT_ERROR : INPUT_NORMAL}
              />
              {getError("biz-name") && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {getError("biz-name")?.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-tax" className="text-xs font-semibold text-slate-700 block">
                Số Giấy phép KD / Mã đăng ký
              </label>
              <input
                id="biz-tax"
                type="text"
                placeholder="GP-12345/AP hoặc số ĐKKD"
                value={values.taxCode}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    taxCode: e.target.value,
                    licenseNumber: e.target.value
                  }))
                }
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="biz-org-type" className="text-xs font-semibold text-slate-700 block">
                Loại hình cơ sở *
              </label>
              <select
                id="biz-org-type"
                value={values.businessType}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    businessType: e.target.value as BusinessOrgType
                  }))
                }
                className={`${INPUT_NORMAL} font-medium`}
              >
                <option value="Hộ kinh doanh">Hộ kinh doanh cá thể</option>
                <option value="Cơ sở kinh doanh khác">Cơ sở kinh doanh tại chỗ</option>
                <option value="Doanh nghiệp tư nhân">Cơ sở tư nhân dịch vụ</option>
                <option value="Công ty TNHH">Công ty TNHH</option>
                <option value="Công ty Cổ phần">Công ty Cổ phần</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-start-date" className="text-xs font-semibold text-slate-700 block">
                Ngày bắt đầu hoạt động
              </label>
              <input
                id="biz-start-date"
                type="text"
                placeholder="01/01/2024"
                value={values.startDate}
                onChange={e =>
                  setValues(prev => ({ ...prev, startDate: e.target.value }))
                }
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-status" className="text-xs font-semibold text-slate-700 block">
                Trạng thái hoạt động
              </label>
              <select
                id="biz-status"
                value={values.status}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    status: e.target.value as BusinessStatus
                  }))
                }
                className={`${INPUT_NORMAL} font-medium`}
              >
                <option value="Đang hoạt động">Đang hoạt động</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Tạm ngưng">Tạm ngưng</option>
                <option value="Chuyển địa điểm">Chuyển địa điểm</option>
                <option value="Chưa xác minh">Chưa xác minh</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="biz-sector" className="text-xs font-semibold text-slate-700 block">
                Nhóm ngành nghề phân loại *
              </label>
              <select
                id="biz-sector"
                value={values.industryGroup}
                onChange={e => {
                  const val = e.target.value;
                  setValues(prev => ({
                    ...prev,
                    industryGroup: val,
                    isAccommodation:
                      val === "Lưu trú & Cho thuê" ? true : prev.isAccommodation
                  }));
                }}
                className={`${INPUT_NORMAL} font-medium`}
              >
                {INDUSTRY_SECTORS.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.icon} {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-type" className="text-xs font-semibold text-slate-700 block">
                Lĩnh vực / Loại hình cụ thể *
              </label>
              <input
                id="biz-type"
                type="text"
                placeholder="Quán ăn, Cà phê, Tạp hóa, Nhà trọ cho thuê..."
                value={values.type}
                aria-invalid={getError("biz-type") ? "true" : "false"}
                onChange={e =>
                  setValues(prev => ({ ...prev, type: e.target.value }))
                }
                className={getError("biz-type") ? INPUT_ERROR : INPUT_NORMAL}
              />
              {getError("biz-type") && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {getError("biz-type")?.message}
                </p>
              )}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer text-xs font-bold text-emerald-900">
            <input
              type="checkbox"
              checked={values.safetyCertified}
              onChange={e =>
                setValues(prev => ({ ...prev, safetyCertified: e.target.checked }))
              }
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <ShieldCheck size={15} className="text-emerald-600" />
            <span>Đã kiểm tra & đạt chuẩn an toàn PCCC / ANTT cơ sở</span>
          </label>
        </section>

        {/* Group 2: Địa điểm, Mặt bằng & Lưu trú */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={15} className="text-emerald-600" />
            2. Địa điểm, Mặt bằng Kinh doanh & Nhà trọ Lưu trú
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="biz-address" className="text-xs font-semibold text-slate-700 block">
                Địa chỉ cơ sở kinh doanh *
              </label>
              <input
                id="biz-address"
                type="text"
                placeholder="17/A3 Lương Định Của, Khu phố 3, Phường An Phú"
                value={values.address}
                aria-invalid={getError("biz-address") ? "true" : "false"}
                onChange={e =>
                  setValues(prev => ({ ...prev, address: e.target.value }))
                }
                className={getError("biz-address") ? INPUT_ERROR : INPUT_NORMAL}
              />
              {getError("biz-address") && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {getError("biz-address")?.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-street-area" className="text-xs font-semibold text-slate-700 block">
                Tuyến đường / Phân khu *
              </label>
              <select
                id="biz-street-area"
                value={values.streetArea}
                onChange={e =>
                  setValues(prev => ({ ...prev, streetArea: e.target.value }))
                }
                className={`${INPUT_NORMAL} font-medium`}
              >
                {BUSINESS_STREET_AREAS.map(area => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="biz-premises-type" className="text-xs font-semibold text-slate-700 block">
                Loại mặt bằng *
              </label>
              <select
                id="biz-premises-type"
                value={values.premisesType}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    premisesType: e.target.value as BusinessPremisesType
                  }))
                }
                className={`${INPUT_NORMAL} font-medium`}
              >
                <option value="Nhà phố">Nhà phố</option>
                <option value="Cửa hàng">Cửa hàng</option>
                <option value="Văn phòng">Văn phòng</option>
                <option value="Nhà xưởng">Nhà xưởng</option>
                <option value="Ki-ốt">Ki-ốt</option>
                <option value="Địa điểm thuê">Địa điểm thuê</option>
                <option value="Chung cư / Căn hộ">Chung cư / Căn hộ</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-premises-owner" className="text-xs font-semibold text-slate-700 block">
                Chủ sở hữu / Quản lý mặt bằng
              </label>
              <input
                id="biz-premises-owner"
                type="text"
                placeholder="Tên chủ nhà / chủ mặt bằng"
                value={values.premisesOwner}
                onChange={e =>
                  setValues(prev => ({ ...prev, premisesOwner: e.target.value }))
                }
                className={INPUT_NORMAL}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-hh-code" className="text-xs font-semibold text-slate-700 block">
                Mã hộ dân KP3 liên kết
              </label>
              <input
                id="biz-hh-code"
                type="text"
                placeholder="HK-001, HK-002..."
                value={values.linkedHouseholdCode}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    linkedHouseholdCode: e.target.value
                  }))
                }
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>
          </div>

          {/* Accommodation toggle box */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.isAccommodation}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      isAccommodation: e.target.checked
                    }))
                  }
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                  <Building size={16} className="text-amber-700" />
                  Đây là cơ sở kinh doanh Nhà trọ, Nhà nghỉ, Khách sạn lưu trú
                </span>
              </label>
              <span className="text-[10.5px] font-bold bg-amber-200/70 text-amber-900 px-2.5 py-0.5 rounded-full">
                {values.isAccommodation ? "Đang bật" : "Tắt"}
              </span>
            </div>

            {values.isAccommodation && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-200/60">
                <div className="space-y-1">
                  <label htmlFor="biz-so-tang" className="text-[11px] font-bold text-amber-900 block">
                    Số tầng *
                  </label>
                  <input
                    id="biz-so-tang"
                    type="number"
                    min="1"
                    placeholder="3"
                    value={values.soTang}
                    aria-invalid={getError("biz-so-tang") ? "true" : "false"}
                    onChange={e =>
                      setValues(prev => ({ ...prev, soTang: e.target.value }))
                    }
                    className={getError("biz-so-tang") ? INPUT_ERROR : INPUT_NORMAL}
                  />
                  {getError("biz-so-tang") && (
                    <p className="text-[10.5px] font-semibold text-rose-600">
                      {getError("biz-so-tang")?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="biz-so-phong" className="text-[11px] font-bold text-amber-900 block">
                    Số phòng *
                  </label>
                  <input
                    id="biz-so-phong"
                    type="number"
                    min="1"
                    placeholder="12"
                    value={values.soPhong}
                    aria-invalid={getError("biz-so-phong") ? "true" : "false"}
                    onChange={e =>
                      setValues(prev => ({ ...prev, soPhong: e.target.value }))
                    }
                    className={getError("biz-so-phong") ? INPUT_ERROR : INPUT_NORMAL}
                  />
                  {getError("biz-so-phong") && (
                    <p className="text-[10.5px] font-semibold text-rose-600">
                      {getError("biz-so-phong")?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="biz-so-nguoi" className="text-[11px] font-bold text-amber-900 block">
                    Số người lưu trú
                  </label>
                  <input
                    id="biz-so-nguoi"
                    type="number"
                    min="0"
                    placeholder="24"
                    value={values.soNguoiLuuTru}
                    onChange={e =>
                      setValues(prev => ({
                        ...prev,
                        soNguoiLuuTru: e.target.value
                      }))
                    }
                    className={INPUT_NORMAL}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="biz-gia-thue" className="text-[11px] font-bold text-amber-900 block">
                    Giá thuê tham khảo
                  </label>
                  <input
                    id="biz-gia-thue"
                    type="text"
                    placeholder="2.5 - 3.5 triệu/tháng"
                    value={values.giaThueTrungBinh}
                    onChange={e =>
                      setValues(prev => ({
                        ...prev,
                        giaThueTrungBinh: e.target.value
                      }))
                    }
                    className={INPUT_NORMAL}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Group 3: Chủ cơ sở & Đầu mối Liên hệ */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck size={15} className="text-blue-600" />
            3. Người đại diện & Đầu mối Liên hệ Địa phương
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="biz-owner" className="text-xs font-semibold text-slate-700 block">
                Người đại diện pháp luật / Chủ cơ sở *
              </label>
              <input
                id="biz-owner"
                type="text"
                placeholder="Nguyễn Văn Bình"
                value={values.owner}
                aria-invalid={getError("biz-owner") ? "true" : "false"}
                onChange={e => {
                  const val = e.target.value;
                  setValues(prev => ({
                    ...prev,
                    owner: val,
                    legalRepresentative: prev.legalRepresentative || val,
                    tenChuSuDung: prev.tenChuSuDung || val
                  }));
                }}
                className={getError("biz-owner") ? INPUT_ERROR : INPUT_NORMAL}
              />
              {getError("biz-owner") && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {getError("biz-owner")?.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-phone" className="text-xs font-semibold text-slate-700 block">
                Số điện thoại liên hệ *
              </label>
              <input
                id="biz-phone"
                type="text"
                placeholder="0903xxxxxx"
                value={values.phone}
                aria-invalid={getError("biz-phone") ? "true" : "false"}
                onChange={e => {
                  const val = e.target.value;
                  setValues(prev => ({
                    ...prev,
                    phone: val,
                    legalRepPhone: prev.legalRepPhone || val
                  }));
                }}
                className={`${getError("biz-phone") ? INPUT_ERROR : INPUT_NORMAL} font-mono`}
              />
              {getError("biz-phone") && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {getError("biz-phone")?.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="biz-site-manager" className="text-xs font-semibold text-slate-700 block">
                Người trực tiếp quản lý tại chỗ
              </label>
              <input
                id="biz-site-manager"
                type="text"
                placeholder="Tên quản lý trực tiếp"
                value={values.siteManager}
                onChange={e =>
                  setValues(prev => ({ ...prev, siteManager: e.target.value }))
                }
                className={INPUT_NORMAL}
              />
            </div>
          </div>

          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/80 space-y-2.5">
            <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
              <Phone size={12} className="text-blue-700" />
              Đầu mối phối hợp khi địa phương khảo sát / tuyên truyền / nhiệm vụ:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Họ tên đầu mối</label>
                <input
                  type="text"
                  placeholder="Họ và tên đầu mối"
                  value={values.focalPointName}
                  onChange={e =>
                    setValues(prev => ({ ...prev, focalPointName: e.target.value }))
                  }
                  className={INPUT_NORMAL}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Số điện thoại công vụ</label>
                <input
                  type="text"
                  placeholder="SĐT công vụ"
                  value={values.focalPointPhone}
                  onChange={e =>
                    setValues(prev => ({
                      ...prev,
                      focalPointPhone: e.target.value
                    }))
                  }
                  className={`${INPUT_NORMAL} font-mono`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Vai trò đầu mối</label>
                <input
                  type="text"
                  placeholder="Chủ cơ sở / Quản lý"
                  value={values.focalPointRole}
                  onChange={e =>
                    setValues(prev => ({ ...prev, focalPointRole: e.target.value }))
                  }
                  className={INPUT_NORMAL}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Group 4: Lao động */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
            <Users2 size={15} className="text-purple-600" />
            4. Tình hình Hoạt động & Lực lượng Lao động
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label htmlFor="biz-emp-total" className="text-[11px] font-semibold text-slate-700 block">
                Tổng số lao động
              </label>
              <input
                id="biz-emp-total"
                type="number"
                min="1"
                value={values.employeeCount}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    employeeCount: Number(e.target.value) || 1
                  }))
                }
                className={`${INPUT_NORMAL} font-bold`}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="biz-emp-local" className="text-[11px] font-semibold text-slate-700 block">
                LĐ thường trú KP3
              </label>
              <input
                id="biz-emp-local"
                type="number"
                min="0"
                value={values.localWorkersCount}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    localWorkersCount: Number(e.target.value) || 0
                  }))
                }
                className={INPUT_NORMAL}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="biz-emp-temp" className="text-[11px] font-semibold text-slate-700 block">
                LĐ tạm trú
              </label>
              <input
                id="biz-emp-temp"
                type="number"
                min="0"
                value={values.temporaryWorkersCount}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    temporaryWorkersCount: Number(e.target.value) || 0
                  }))
                }
                className={INPUT_NORMAL}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="biz-emp-foreign" className="text-[11px] font-semibold text-slate-700 block">
                LĐ người nước ngoài
              </label>
              <input
                id="biz-emp-foreign"
                type="number"
                min="0"
                value={values.foreignWorkersCount}
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    foreignWorkersCount: Number(e.target.value) || 0
                  }))
                }
                className={INPUT_NORMAL}
              />
            </div>
          </div>
        </section>

        {/* Group 5: Nhu cầu Hỗ trợ */}
        <section className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle size={15} className="text-amber-600" />
            5. Nhu cầu Hỗ trợ & Khó khăn do Cơ sở Phản ánh
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {SUPPORT_NEEDS_OPTIONS.map((need, idx) => {
              const checked = values.supportNeeds.includes(need);
              return (
                <label
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer text-[11.5px]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      setValues(prev => ({
                        ...prev,
                        supportNeeds: e.target.checked
                          ? [...prev.supportNeeds, need]
                          : prev.supportNeeds.filter(n => n !== need)
                      }));
                    }}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="text-slate-800 font-medium">{need}</span>
                </label>
              );
            })}
          </div>

          <textarea
            rows={2}
            placeholder="Ghi nhận các khó khăn về mặt bằng, giá thuê, tuyển dụng, trật tự đô thị..."
            value={values.supportNotes}
            onChange={e =>
              setValues(prev => ({ ...prev, supportNotes: e.target.value }))
            }
            className={INPUT_NORMAL}
          />
        </section>

        {/* Group 6: Địa chính, Sổ đỏ & Ảnh cơ sở */}
        <section className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet size={15} className="text-indigo-600" />
            6. Thông tin Địa chính, Giấy chứng nhận QSDĐ (Sổ đỏ) & Hình ảnh
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Tờ bản đồ số</label>
              <input
                type="text"
                placeholder="272"
                value={values.toBanDo}
                onChange={e =>
                  setValues(prev => ({ ...prev, toBanDo: e.target.value }))
                }
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Số thửa đất</label>
              <input
                type="text"
                placeholder="55"
                value={values.soThua}
                onChange={e =>
                  setValues(prev => ({ ...prev, soThua: e.target.value }))
                }
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Diện tích (m²)</label>
              <input
                type="text"
                placeholder="150"
                value={values.dienTich}
                onChange={e =>
                  setValues(prev => ({ ...prev, dienTich: e.target.value }))
                }
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Loại đất</label>
              <input
                type="text"
                placeholder="ODT, TMD..."
                value={values.loaiDat}
                onChange={e =>
                  setValues(prev => ({ ...prev, loaiDat: e.target.value }))
                }
                className={INPUT_NORMAL}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Tên chủ sử dụng đất</label>
              <input
                type="text"
                placeholder="Nguyễn Văn Bình"
                value={values.tenChuSuDung}
                onChange={e =>
                  setValues(prev => ({ ...prev, tenChuSuDung: e.target.value }))
                }
                className={INPUT_NORMAL}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Số GCN (Sổ đỏ)</label>
              <input
                type="text"
                placeholder="CH-098234"
                value={values.soGcn}
                onChange={e =>
                  setValues(prev => ({ ...prev, soGcn: e.target.value }))
                }
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Số vào sổ cấp GCN</label>
              <input
                type="text"
                placeholder="CS-2023-112"
                value={values.soVaoSo}
                onChange={e =>
                  setValues(prev => ({ ...prev, soVaoSo: e.target.value }))
                }
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>
          </div>

          {/* Sổ đỏ Upload */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Paperclip size={13} className="text-indigo-600" />
              Tệp Sổ đỏ / Giấy chứng nhận QSDĐ (PDF hoặc Hình ảnh &lt; 25MB)
            </span>
            <div
              onDragEnter={() => setDragActiveSoDo(true)}
              onDragOver={e => {
                e.preventDefault();
                setDragActiveSoDo(true);
              }}
              onDragLeave={() => setDragActiveSoDo(false)}
              onDrop={e => {
                e.preventDefault();
                setDragActiveSoDo(false);
                if (e.dataTransfer.files?.[0]) handlePickSoDo(e.dataTransfer.files[0]);
              }}
              className={`border border-dashed rounded-xl p-3.5 text-center transition-all ${
                dragActiveSoDo
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-300 bg-white"
              }`}
            >
              {values.soDoFile ? (
                <div className="flex items-center justify-between gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 min-w-0">
                    {values.soDoFile.type === "pdf" ? (
                      <FileText size={18} className="text-rose-600 shrink-0" />
                    ) : (
                      <ImageIcon size={18} className="text-blue-600 shrink-0" />
                    )}
                    <div className="text-left min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {values.soDoFile.name}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono">
                        Đã đính kèm • {values.soDoFile.size}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValues(prev => ({ ...prev, soDoFile: null }))}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    aria-label="Xóa tệp Sổ đỏ"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center py-1 text-xs text-slate-700">
                  <Upload size={20} className="text-indigo-500 mb-1" />
                  <span>
                    Kéo thả tệp PDF Sổ đỏ / ảnh tại đây, hoặc{" "}
                    <span className="text-indigo-600 font-bold underline">chọn từ máy</span>
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) handlePickSoDo(e.target.files[0]);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Cover image upload */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Camera size={13} className="text-indigo-600" />
              Hình ảnh mặt tiền thực tế cơ sở kinh doanh
            </span>
            <div
              onDragEnter={() => setDragActiveImage(true)}
              onDragOver={e => {
                e.preventDefault();
                setDragActiveImage(true);
              }}
              onDragLeave={() => setDragActiveImage(false)}
              onDrop={e => {
                e.preventDefault();
                setDragActiveImage(false);
                if (e.dataTransfer.files?.[0]) handlePickCoverImage(e.dataTransfer.files[0]);
              }}
              className={`border border-dashed rounded-xl p-3.5 text-center transition-all ${
                dragActiveImage
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-300 bg-white"
              }`}
            >
              {values.image ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={values.image}
                    alt="Xem trước ảnh cơ sở"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setValues(prev => ({ ...prev, image: "" }))}
                    className="absolute top-2 right-2 bg-slate-900/75 text-white p-1 rounded-full cursor-pointer"
                    aria-label="Xóa ảnh đại diện"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center py-1 text-xs text-slate-700">
                  <Camera size={20} className="text-slate-400 mb-1" />
                  <span>
                    Kéo thả ảnh mặt tiền cơ sở hoặc{" "}
                    <span className="text-emerald-600 font-bold underline">chọn từ thiết bị</span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) handlePickCoverImage(e.target.files[0]);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </section>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Save size={15} />
            <span>
              {mode === "edit" ? "Lưu thay đổi hồ sơ" : "Đăng ký Cơ sở Kinh doanh"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
