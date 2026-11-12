import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Camera,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Save,
  UserCheck,
  Users2
} from "lucide-react";
import { Business } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { ROUTES, getEnterpriseDetailPath, navigate } from "../routes";
import {
  EnterpriseBusinessType,
  EnterpriseFormValues,
  EnterprisePremisesType,
  EnterpriseScaleType,
  SUPPORT_NEEDS_OPTIONS,
  createInitialEnterpriseFormValues,
  enterpriseToFormValues,
  findEnterpriseByIdOrCode,
  formValuesToEnterprise
} from "../utils/enterpriseFormUtils";

export interface EnterpriseFormPageProps {
  mode: "create" | "edit";
  enterpriseId?: string;
  businesses: Business[];
  isDataLoading?: boolean;
  onSaveEnterprise: (
    savedEnterprise: Business,
    isEdit: boolean,
    oldEnterprise?: Business
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
const INPUT_NORMAL =
  `${INPUT_BASE} border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500`;
const INPUT_ERROR =
  `${INPUT_BASE} border-rose-500 bg-rose-50/40 focus:ring-rose-500/20 focus:border-rose-600`;

export default function EnterpriseFormPage({
  mode,
  enterpriseId,
  businesses,
  isDataLoading = false,
  onSaveEnterprise,
  onShowToast
}: EnterpriseFormPageProps) {
  const existingEnterprise = useMemo(() => {
    if (mode !== "edit" || !enterpriseId) return null;
    return findEnterpriseByIdOrCode(businesses, enterpriseId);
  }, [mode, enterpriseId, businesses]);

  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const syncedIdRef = useRef<string | null>(
    mode === "edit" && existingEnterprise ? existingEnterprise.id : null
  );

  const [values, setValues] = useState<EnterpriseFormValues>(() =>
    mode === "edit" && existingEnterprise
      ? enterpriseToFormValues(existingEnterprise)
      : createInitialEnterpriseFormValues()
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (mode === "edit" && existingEnterprise && syncedIdRef.current !== existingEnterprise.id) {
      syncedIdRef.current = existingEnterprise.id;
      setValues(enterpriseToFormValues(existingEnterprise));
    }
  }, [mode, existingEnterprise]);

  const handleBack = () => {
    if (mode === "edit" && existingEnterprise) {
      navigate(getEnterpriseDetailPath(existingEnterprise.id));
      return;
    }
    navigate(ROUTES.DASHBOARD_ENTERPRISES);
  };

  if (mode === "edit" && !existingEnterprise && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-indigo-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Đang tải hồ sơ doanh nghiệp...</h2>
      </div>
    );
  }

  if (mode === "edit" && !existingEnterprise) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-4 max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">
          Không tìm thấy hồ sơ Doanh nghiệp
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Mã hồ sơ <span className="font-mono font-bold text-slate-800">{enterpriseId}</span> không tồn tại hoặc đã bị xóa.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD_ENTERPRISES)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={15} />
            <span>Quay lại Danh mục Doanh nghiệp</span>
          </button>
        </div>
      </div>
    );
  }

  const computeErrors = (): FieldError[] => {
    const errs: FieldError[] = [];
    if (!values.name.trim()) {
      errs.push({
        id: "enterprise-field-name",
        label: "Tên Doanh nghiệp",
        message: "Vui lòng nhập tên doanh nghiệp."
      });
    }
    if (mode === "create" && !values.taxCode.trim()) {
      errs.push({
        id: "enterprise-field-taxcode",
        label: "Mã số thuế / MSDN",
        message: "Vui lòng nhập mã số thuế hoặc mã số doanh nghiệp."
      });
    }
    if (mode === "create" && !values.type.trim()) {
      errs.push({
        id: "enterprise-field-type",
        label: "Ngành nghề chính",
        message: "Vui lòng nhập ngành nghề hoạt động chính."
      });
    }
    if (!values.address.trim()) {
      errs.push({
        id: "enterprise-field-address",
        label: "Địa chỉ trụ sở",
        message: "Vui lòng nhập địa chỉ trụ sở doanh nghiệp."
      });
    }
    if (!values.legalRepresentative.trim()) {
      errs.push({
        id: "enterprise-field-legalrep",
        label: "Đại diện pháp luật",
        message: "Vui lòng nhập họ tên người đại diện theo pháp luật."
      });
    }
    if (!values.legalRepPhone.trim()) {
      errs.push({
        id: "enterprise-field-legalrep-phone",
        label: "SĐT đại diện",
        message: "Vui lòng nhập số điện thoại liên hệ của người đại diện."
      });
    }
    return errs;
  };

  const errors = submitAttempted ? computeErrors() : [];
  const getErrorFor = (id: string) => errors.find(e => e.id === id)?.message;

  const updateField = <K extends keyof EnterpriseFormValues>(
    field: K,
    value: EnterpriseFormValues[K]
  ) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const currentErrors = computeErrors();
    if (currentErrors.length > 0) {
      window.requestAnimationFrame(() => {
        errorSummaryRef.current?.focus();
      });
      return;
    }

    const fallbackId =
      "B" +
      (businesses.length + 1).toString().padStart(3, "0") +
      "-" +
      Date.now().toString().slice(-3);

    const saved = formValuesToEnterprise(
      values,
      mode === "edit" ? existingEnterprise : null,
      fallbackId
    );

    onSaveEnterprise(saved, mode === "edit", existingEnterprise || undefined);
    if (mode === "edit" && existingEnterprise) {
      onShowToast?.(`Đã cập nhật hồ sơ doanh nghiệp "${saved.name}" thành công!`);
      navigate(getEnterpriseDetailPath(existingEnterprise.id));
    } else {
      onShowToast?.(`Đã thêm mới hồ sơ doanh nghiệp "${saved.name}" thành công!`);
      navigate(ROUTES.DASHBOARD_ENTERPRISES);
    }
  };

  return (
    <div id="enterprise-form-page" className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="btn-back-from-enterprise-form"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>
              {mode === "edit" && existingEnterprise
                ? "Quay lại Hồ sơ Doanh nghiệp"
                : "Quay lại Danh mục Doanh nghiệp"}
            </span>
          </button>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-slate-500 font-medium hidden sm:inline">
            Quản lý Doanh nghiệp
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <span className="font-bold text-indigo-700">
            {mode === "edit" ? "Chỉnh sửa hồ sơ" : "Đăng ký doanh nghiệp mới"}
          </span>
        </nav>
      </div>

      {/* PageHeader */}
      <PageHeader
        badgeIcon={<Building2 size={14} className="text-indigo-600" />}
        badgeText="CSDL DOANH NGHIỆP • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext={
          mode === "edit" && existingEnterprise
            ? existingEnterprise.internalCode || `DN-KP3-${existingEnterprise.id}`
            : "ĐĂNG KÝ MỚI"
        }
        title={
          mode === "edit" && existingEnterprise
            ? `Chỉnh sửa Hồ sơ Doanh nghiệp: ${existingEnterprise.name}`
            : "Đăng ký Doanh nghiệp Vừa & Nhỏ Mới"
        }
        description={
          mode === "edit"
            ? "Cập nhật thông tin pháp lý, mặt bằng, đầu mối công vụ, lao động và nhu cầu hỗ trợ trên địa bàn KP3."
            : "Khai báo hồ sơ doanh nghiệp mới hoạt động trên địa bàn Khu phố 3, Phường An Phú."
        }
        actions={
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Hủy & Quay lại</span>
          </button>
        }
      />

      {/* GOV.UK Error Summary */}
      {errors.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="enterprise-error-summary-title"
          className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 space-y-2.5 focus:outline-none shadow-xs"
        >
          <div className="flex items-center gap-2 text-rose-900">
            <AlertCircle size={18} className="text-rose-600 shrink-0" aria-hidden="true" />
            <h2 id="enterprise-error-summary-title" className="text-sm font-extrabold">
              Vui lòng kiểm tra lại thông tin bắt buộc ({errors.length} mục)
            </h2>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-rose-800">
            {errors.map(err => (
              <li key={err.id}>
                <button
                  type="button"
                  onClick={() => document.getElementById(err.id)?.focus()}
                  className="underline font-bold hover:text-rose-950 cursor-pointer text-left"
                >
                  {err.label}: {err.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden text-slate-800"
      >
        <div className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Group 1: Pháp lý */}
          <div className="space-y-3">
            <h2 className="font-bold text-indigo-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <Briefcase size={14} className="text-indigo-600" />
              1. Thông tin Doanh nghiệp & Pháp lý
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label
                  htmlFor="enterprise-field-name"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Tên Doanh nghiệp <span className="text-rose-600">*</span>
                </label>
                <input
                  id="enterprise-field-name"
                  type="text"
                  placeholder="Công ty TNHH Giải pháp ..., Công ty CP ..."
                  value={values.name}
                  onChange={e => updateField("name", e.target.value)}
                  aria-invalid={getErrorFor("enterprise-field-name") ? "true" : "false"}
                  className={`${getErrorFor("enterprise-field-name") ? INPUT_ERROR : INPUT_NORMAL} font-semibold`}
                />
                {getErrorFor("enterprise-field-name") && (
                  <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                    <AlertCircle size={12} /> {getErrorFor("enterprise-field-name")}
                  </p>
                )}
              </div>

              {mode === "edit" ? (
                <div className="space-y-1">
                  <label
                    htmlFor="enterprise-field-internalcode"
                    className="text-[11px] font-bold text-slate-700 block"
                  >
                    Mã nội bộ
                  </label>
                  <input
                    id="enterprise-field-internalcode"
                    type="text"
                    value={values.internalCode}
                    onChange={e => updateField("internalCode", e.target.value)}
                    className={`${INPUT_NORMAL} font-mono`}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label
                    htmlFor="enterprise-field-taxcode"
                    className="text-[11px] font-bold text-slate-700 block"
                  >
                    Mã số thuế / MSDN <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="enterprise-field-taxcode"
                    type="text"
                    placeholder="031xxxxxxx"
                    value={values.taxCode}
                    onChange={e => updateField("taxCode", e.target.value)}
                    aria-invalid={getErrorFor("enterprise-field-taxcode") ? "true" : "false"}
                    className={`${getErrorFor("enterprise-field-taxcode") ? INPUT_ERROR : INPUT_NORMAL} font-mono`}
                  />
                  {getErrorFor("enterprise-field-taxcode") && (
                    <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                      <AlertCircle size={12} /> {getErrorFor("enterprise-field-taxcode")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Hình ảnh Trụ sở / Văn phòng */}
            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ImageIcon size={13} className="text-indigo-600" />
                <span>Hình ảnh Trụ sở / Văn phòng Doanh nghiệp</span>
              </span>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 shadow-2xs flex items-center justify-center">
                  {values.image ? (
                    <img
                      src={values.image}
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
                    <span>{values.image ? "Đổi ảnh khác" : "Chọn ảnh từ thiết bị"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          const reader = new FileReader();
                          reader.onload = () =>
                            updateField("image", reader.result as string);
                          reader.readAsDataURL(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {values.image && (
                    <button
                      type="button"
                      onClick={() => updateField("image", "")}
                      className="text-[11px] text-rose-600 hover:text-rose-800 ml-2 font-medium cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {mode === "edit"
                      ? "Ảnh trụ sở, văn phòng hoặc biển hiệu nhận diện doanh nghiệp."
                      : "Nếu để trống, hệ thống sẽ tự động gán hình ảnh văn phòng hiện đại chuẩn mực."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {mode === "edit" && (
                <div className="space-y-1">
                  <label
                    htmlFor="enterprise-field-taxcode"
                    className="text-[11px] font-bold text-slate-700 block"
                  >
                    Mã số thuế / MSDN
                  </label>
                  <input
                    id="enterprise-field-taxcode"
                    type="text"
                    value={values.taxCode}
                    onChange={e => updateField("taxCode", e.target.value)}
                    className={`${INPUT_NORMAL} font-mono`}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-businesstype"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Loại hình tổ chức *
                </label>
                <select
                  id="enterprise-field-businesstype"
                  value={values.businessType}
                  onChange={e =>
                    updateField("businessType", e.target.value as EnterpriseBusinessType)
                  }
                  className={`${INPUT_NORMAL} font-bold`}
                >
                  <option value="Công ty TNHH">Công ty TNHH</option>
                  <option value="Công ty Cổ phần">Công ty Cổ phần</option>
                  <option value="Doanh nghiệp tư nhân">Doanh nghiệp tư nhân</option>
                  <option value="Cơ sở kinh doanh khác">Cơ sở khác</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-scale"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Quy mô lao động (NĐ 80) *
                </label>
                <select
                  id="enterprise-field-scale"
                  value={values.enterpriseScale}
                  onChange={e =>
                    updateField("enterpriseScale", e.target.value as EnterpriseScaleType)
                  }
                  className={`${INPUT_NORMAL} font-bold`}
                >
                  <option value="Siêu nhỏ (< 5 LĐ)">Siêu nhỏ (&lt; 5 LĐ)</option>
                  <option value="Nhỏ (5 - 20 LĐ)">Nhỏ (5 - 20 LĐ)</option>
                  <option value="Vừa (20 - 50 LĐ)">Vừa (20 - 50 LĐ)</option>
                  <option value="Lớn (> 50 LĐ)">Lớn (&gt; 50 LĐ)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-type"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Ngành nghề chính {mode === "create" && <span className="text-rose-600">*</span>}
                </label>
                <input
                  id="enterprise-field-type"
                  type="text"
                  placeholder="Phần mềm, Thương mại, Y tế..."
                  value={values.type}
                  onChange={e => updateField("type", e.target.value)}
                  aria-invalid={getErrorFor("enterprise-field-type") ? "true" : "false"}
                  className={getErrorFor("enterprise-field-type") ? INPUT_ERROR : INPUT_NORMAL}
                />
                {getErrorFor("enterprise-field-type") && (
                  <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                    <AlertCircle size={12} /> {getErrorFor("enterprise-field-type")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Group 2: Địa điểm */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h2 className="font-bold text-emerald-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-600" />
              2. Trụ sở, Mặt bằng Kinh doanh & Tuyến đường
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label
                  htmlFor="enterprise-field-address"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Địa chỉ trụ sở <span className="text-rose-600">*</span>
                </label>
                <input
                  id="enterprise-field-address"
                  type="text"
                  placeholder="Số nhà, hẻm, Lương Định Của..."
                  value={values.address}
                  onChange={e => updateField("address", e.target.value)}
                  aria-invalid={getErrorFor("enterprise-field-address") ? "true" : "false"}
                  className={getErrorFor("enterprise-field-address") ? INPUT_ERROR : INPUT_NORMAL}
                />
                {getErrorFor("enterprise-field-address") && (
                  <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                    <AlertCircle size={12} /> {getErrorFor("enterprise-field-address")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-street"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Tuyến đường *
                </label>
                <select
                  id="enterprise-field-street"
                  value={values.streetArea}
                  onChange={e => updateField("streetArea", e.target.value)}
                  className={`${INPUT_NORMAL} font-semibold`}
                >
                  <option value="Mặt tiền Lương Định Của">Mặt tiền Lương Định Của</option>
                  <option value="Hẻm 42 Lương Định Của">Hẻm 42 Lương Định Của</option>
                  <option value="Hẻm 18 Lương Định Của">Hẻm 18 Lương Định Của</option>
                  <option value="Khu dân cư nội bộ KP3">KDC nội bộ KP3</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-premisestype"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Loại mặt bằng
                </label>
                <select
                  id="enterprise-field-premisestype"
                  value={values.premisesType}
                  onChange={e =>
                    updateField("premisesType", e.target.value as EnterprisePremisesType)
                  }
                  className={`${INPUT_NORMAL} font-medium`}
                >
                  <option value="Văn phòng">Văn phòng</option>
                  <option value="Nhà phố">Nhà phố</option>
                  <option value="Cửa hàng">Cửa hàng</option>
                  <option value="Nhà xưởng">Nhà xưởng</option>
                  <option value="Ki-ốt">Ki-ốt</option>
                  <option value="Địa điểm thuê">Địa điểm thuê</option>
                  <option value="Chung cư / Căn hộ">Chung cư / Căn hộ</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-premisesowner"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Chủ sở hữu mặt bằng
                </label>
                <input
                  id="enterprise-field-premisesowner"
                  type="text"
                  placeholder="Tên chủ nhà / chủ mặt bằng"
                  value={values.premisesOwner}
                  onChange={e => updateField("premisesOwner", e.target.value)}
                  className={INPUT_NORMAL}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-household"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Mã hộ dân KP3 liên kết
                </label>
                <input
                  id="enterprise-field-household"
                  type="text"
                  placeholder="HK-301, HK-302..."
                  value={values.linkedHouseholdCode}
                  onChange={e => updateField("linkedHouseholdCode", e.target.value)}
                  className={`${INPUT_NORMAL} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* Group 3: Người đại diện & Đầu mối */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h2 className="font-bold text-blue-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <UserCheck size={14} className="text-blue-600" />
              3. Người đại diện & Đầu mối Công vụ
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-legalrep"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Đại diện pháp luật <span className="text-rose-600">*</span>
                </label>
                <input
                  id="enterprise-field-legalrep"
                  type="text"
                  placeholder="Họ và tên người ĐDPL"
                  value={values.legalRepresentative}
                  onChange={e => updateField("legalRepresentative", e.target.value)}
                  aria-invalid={getErrorFor("enterprise-field-legalrep") ? "true" : "false"}
                  className={
                    getErrorFor("enterprise-field-legalrep") ? INPUT_ERROR : INPUT_NORMAL
                  }
                />
                {getErrorFor("enterprise-field-legalrep") && (
                  <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                    <AlertCircle size={12} /> {getErrorFor("enterprise-field-legalrep")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-legalrep-phone"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  SĐT đại diện <span className="text-rose-600">*</span>
                </label>
                <input
                  id="enterprise-field-legalrep-phone"
                  type="text"
                  placeholder="0903xxxxxx"
                  value={values.legalRepPhone}
                  onChange={e => updateField("legalRepPhone", e.target.value)}
                  aria-invalid={getErrorFor("enterprise-field-legalrep-phone") ? "true" : "false"}
                  className={`${
                    getErrorFor("enterprise-field-legalrep-phone") ? INPUT_ERROR : INPUT_NORMAL
                  } font-mono`}
                />
                {getErrorFor("enterprise-field-legalrep-phone") && (
                  <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                    <AlertCircle size={12} /> {getErrorFor("enterprise-field-legalrep-phone")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-email"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Email công vụ
                </label>
                <input
                  id="enterprise-field-email"
                  type="email"
                  placeholder="contact@doanhnghiep.vn"
                  value={values.legalRepEmail}
                  onChange={e => updateField("legalRepEmail", e.target.value)}
                  className={INPUT_NORMAL}
                />
              </div>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
              <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                <Phone size={12} className="text-blue-700" />
                Đầu mối phối hợp công vụ địa phương:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  aria-label="Họ tên đầu mối"
                  placeholder="Họ tên đầu mối"
                  value={values.focalPointName}
                  onChange={e => updateField("focalPointName", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                />
                <input
                  type="text"
                  aria-label="SĐT công vụ tiếp nhận"
                  placeholder="SĐT công vụ tiếp nhận"
                  value={values.focalPointPhone}
                  onChange={e => updateField("focalPointPhone", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs font-mono bg-white"
                />
                <input
                  type="text"
                  aria-label="Vai trò đầu mối"
                  placeholder="Vai trò (Giám đốc, Quản lý...)"
                  value={values.focalPointRole}
                  onChange={e => updateField("focalPointRole", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Group 4: Lao động */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h2 className="font-bold text-purple-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <Users2 size={14} className="text-purple-600" />
              4. Lực lượng Lao động & Nước ngoài
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-employees"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  Tổng số lao động *
                </label>
                <input
                  id="enterprise-field-employees"
                  type="number"
                  min={1}
                  value={values.employeeCount}
                  onChange={e => updateField("employeeCount", Number(e.target.value))}
                  className={`${INPUT_NORMAL} font-bold`}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-localworkers"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  LĐ thường trú KP3
                </label>
                <input
                  id="enterprise-field-localworkers"
                  type="number"
                  min={0}
                  value={values.localWorkersCount}
                  onChange={e => updateField("localWorkersCount", Number(e.target.value))}
                  className={`${INPUT_NORMAL} font-mono`}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-tempworkers"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  LĐ tạm trú
                </label>
                <input
                  id="enterprise-field-tempworkers"
                  type="number"
                  min={0}
                  value={values.temporaryWorkersCount}
                  onChange={e =>
                    updateField("temporaryWorkersCount", Number(e.target.value))
                  }
                  className={`${INPUT_NORMAL} font-mono`}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="enterprise-field-foreignworkers"
                  className="text-[11px] font-bold text-slate-700 block"
                >
                  LĐ người nước ngoài
                </label>
                <input
                  id="enterprise-field-foreignworkers"
                  type="number"
                  min={0}
                  value={values.foreignWorkersCount}
                  onChange={e =>
                    updateField("foreignWorkersCount", Number(e.target.value))
                  }
                  className={`${INPUT_NORMAL} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* Group 5: Nhu cầu hỗ trợ */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h2 className="font-bold text-amber-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-amber-600" />
              5. Nhu cầu Hỗ trợ & Ý kiến Khó khăn (Tự nguyện)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUPPORT_NEEDS_OPTIONS.map((need, idx) => {
                const checked = values.supportNeeds.includes(need);
                return (
                  <label
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-[11px] hover:bg-slate-100/80 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        if (e.target.checked) {
                          updateField("supportNeeds", [...values.supportNeeds, need]);
                        } else {
                          updateField(
                            "supportNeeds",
                            values.supportNeeds.filter(n => n !== need)
                          );
                        }
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
                aria-label="Ghi chú khó khăn, kiến nghị"
                placeholder="Ghi nhận các khó khăn về mặt bằng, giá thuê, tuyển dụng, trật tự đô thị..."
                value={values.supportNotes}
                onChange={e => updateField("supportNotes", e.target.value)}
                className={INPUT_NORMAL}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-end gap-2.5">
          <button
            type="button"
            id="btn-cancel-enterprise-form"
            onClick={handleBack}
            className="px-4 py-2 border border-slate-300 bg-white rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer font-bold text-xs"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            id="btn-submit-enterprise-form"
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs text-xs"
          >
            <Save size={14} />
            <span>{mode === "edit" ? "Lưu thay đổi" : "Đăng ký Doanh nghiệp"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

