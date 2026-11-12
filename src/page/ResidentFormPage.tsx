import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Globe,
  GraduationCap,
  Home,
  Loader2,
  Save,
  UserCheck
} from "lucide-react";
import { Household, Resident } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { ROUTES, navigate } from "../routes";
import {
  ResidentFormTab,
  ResidentFormValues,
  createInitialFormValues,
  formValuesToResident,
  getCountryFlag,
  residentToFormValues
} from "../utils/residentFormUtils";

export interface ResidentFormPageProps {
  mode: "create" | "edit";
  residentId?: string;
  initialIsForeigner?: boolean;
  residents: Resident[];
  households: Household[];
  isDataLoading?: boolean;
  onSaveResident: (
    savedResident: Resident,
    isEdit: boolean,
    oldResident?: Resident
  ) => Promise<void> | void;
  onCancel?: () => void;
}

type ValidatedFieldName = "fullName" | "cccd" | "passportNumber";

interface FieldErrorEntry {
  field: ValidatedFieldName;
  inputId: string;
  tab: ResidentFormTab;
  label: string;
  message: string;
}

const FORM_TABS: { id: ResidentFormTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "basic", label: "1. Định danh", icon: CreditCard },
  { id: "residence", label: "2. Cư trú & Hộ", icon: Home },
  { id: "career", label: "3. Việc làm", icon: GraduationCap },
  { id: "policy", label: "4. Chính sách", icon: Award },
  { id: "foreigner", label: "5. Hộ chiếu & Thị thực", icon: Globe }
];

const NATIONALITY_OPTIONS = [
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
  { value: "Khác", label: "🌍 Quốc gia khác" }
];

const INPUT_BASE_CLASS =
  "w-full px-3 py-2.5 border rounded-xl text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all";
const INPUT_NORMAL_CLASS =
  `${INPUT_BASE_CLASS} border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600`;
const INPUT_PURPLE_CLASS =
  `${INPUT_BASE_CLASS} border-slate-300 focus:ring-purple-500/20 focus:border-purple-600`;
const INPUT_ERROR_CLASS =
  `${INPUT_BASE_CLASS} border-rose-500 bg-rose-50/40 focus:ring-rose-500/20 focus:border-rose-600`;

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: (ariaProps: {
    id: string;
    "aria-invalid": "true" | "false";
    "aria-describedby"?: string;
  }) => React.ReactNode;
}

function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  className = "",
  children
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">
        {label}
        {required && (
          <span className="text-rose-600 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-[11px] text-slate-500 leading-snug">
          {hint}
        </p>
      )}
      {children({
        id,
        "aria-invalid": error ? "true" : "false",
        "aria-describedby": describedBy
      })}
      {error && (
        <p id={errorId} className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 pt-0.5">
          <AlertCircle size={13} className="shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function computeValidationErrors(values: ResidentFormValues): FieldErrorEntry[] {
  const errors: FieldErrorEntry[] = [];

  if (!values.fullName.trim()) {
    errors.push({
      field: "fullName",
      inputId: "resident-field-fullName",
      tab: "basic",
      label: "Họ và Tên",
      message: "Lỗi: Vui lòng nhập đầy đủ họ và tên cư dân."
    });
  }

  const idValue = (values.isForeigner ? (values.passportNumber || values.cccd) : values.cccd).trim();
  if (!idValue) {
    errors.push({
      field: values.isForeigner ? "passportNumber" : "cccd",
      inputId: values.isForeigner ? "resident-field-passportNumber" : "resident-field-cccd",
      tab: "basic",
      label: values.isForeigner ? "Số Hộ chiếu" : "Số CCCD",
      message: values.isForeigner
        ? "Lỗi: Vui lòng nhập số Hộ chiếu của cư dân nước ngoài."
        : "Lỗi: Vui lòng nhập số CCCD / định danh cá nhân."
    });
  }

  return errors;
}

export default function ResidentFormPage({
  mode,
  residentId,
  initialIsForeigner = false,
  residents,
  households,
  isDataLoading = false,
  onSaveResident,
  onCancel
}: ResidentFormPageProps) {
  const headingId = useId();
  const householdDatalistId = useId();
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  const existingResident = useMemo(() => {
    if (mode !== "edit" || !residentId) return null;
    return residents.find(r => r.id === residentId) || null;
  }, [mode, residentId, residents]);

  const [formActiveTab, setFormActiveTab] = useState<ResidentFormTab>(() =>
    mode === "create" && initialIsForeigner ? "foreigner" : "basic"
  );
  const [formData, setFormData] = useState<ResidentFormValues>(() => {
    if (mode === "edit" && existingResident) {
      return residentToFormValues(existingResident);
    }
    return createInitialFormValues(initialIsForeigner);
  });

  const [touched, setTouched] = useState<Partial<Record<ValidatedFieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const pendingFocusInputIdRef = useRef<string | null>(null);

  // Focus target input after switching tabs (e.g., from error summary link)
  useEffect(() => {
    const targetId = pendingFocusInputIdRef.current;
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      el.focus();
      pendingFocusInputIdRef.current = null;
    }
  }, [formActiveTab]);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) {
        window.clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  const allErrors = useMemo(() => computeValidationErrors(formData), [formData]);

  const getFieldError = (field: ValidatedFieldName): string | undefined => {
    if (!submitAttempted && !touched[field]) return undefined;
    if (field === "cccd" || field === "passportNumber") {
      const target = formData.isForeigner ? "passportNumber" : "cccd";
      if (field !== target && !(field === "cccd" && formActiveTab === "basic")) {
        return undefined;
      }
      return allErrors.find(e => e.field === "cccd" || e.field === "passportNumber")?.message;
    }
    return allErrors.find(e => e.field === field)?.message;
  };

  const visibleSummaryErrors = submitAttempted ? allErrors : [];

  const handleBackToList = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate(ROUTES.DASHBOARD_RESIDENTS);
  };

  const announcePolite = (message: string) => {
    if (announceTimerRef.current) window.clearTimeout(announceTimerRef.current);
    setLiveAnnouncement("");
    announceTimerRef.current = window.setTimeout(() => {
      setLiveAnnouncement(message);
    }, 350);
  };

  const handleFieldBlur = (field: ValidatedFieldName) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = computeValidationErrors(formData).find(
      e => e.field === field || (field === "cccd" && e.field === "passportNumber")
    );
    if (err) {
      announcePolite(`${err.label}: ${err.message}`);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (saveError) setSaveError(null);
  };

  const handleJumpToField = (tab: ResidentFormTab, inputId: string) => {
    if (formActiveTab !== tab) {
      pendingFocusInputIdRef.current = inputId;
      setFormActiveTab(tab);
    } else {
      document.getElementById(inputId)?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setSaveError(null);

    const errors = computeValidationErrors(formData);
    if (errors.length > 0) {
      setTouched(prev => ({
        ...prev,
        fullName: true,
        cccd: true,
        passportNumber: true
      }));
      window.requestAnimationFrame(() => {
        errorSummaryRef.current?.focus();
      });
      return;
    }

    setIsSaving(true);
    try {
      const nextFallbackId =
        "R" + (residents.length + 1).toString().padStart(3, "0") + "-" + Date.now().toString().slice(-4);
      const savedResident = formValuesToResident(
        formData,
        mode === "edit" ? existingResident : null,
        nextFallbackId
      );
      await onSaveResident(savedResident, mode === "edit", existingResident || undefined);
      navigate(ROUTES.DASHBOARD_RESIDENTS);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Không thể lưu hồ sơ cư dân. Vui lòng thử lại."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const visibleTabs = FORM_TABS;
  const currentTabIndex = visibleTabs.findIndex(t => t.id === formActiveTab);
  const canGoPrev = currentTabIndex > 0;
  const lastTabId: ResidentFormTab = formData.isForeigner ? "foreigner" : "policy";
  const canGoNext =
    formActiveTab !== lastTabId && currentTabIndex < visibleTabs.length - 1;

  // Loading state while fetching residents in edit mode
  if (mode === "edit" && !existingResident && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Đang tải hồ sơ cư dân...</h2>
        <p className="text-xs text-slate-500">
          Hệ thống đang đồng bộ dữ liệu nhân khẩu từ cơ sở dữ liệu Khu phố 3.
        </p>
      </div>
    );
  }

  // Not found state in edit mode
  if (mode === "edit" && !existingResident) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-4 max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Không tìm thấy hồ sơ cư dân</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Mã hồ sơ <span className="font-mono font-bold text-slate-800">{residentId}</span> không tồn tại hoặc đã bị xóa khỏi danh sách nhân khẩu.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={15} />
            <span>Quay lại Quản lý Dân cư</span>
          </button>
        </div>
      </div>
    );
  }

  const pageTitle =
    mode === "edit"
      ? `Cập nhật hồ sơ cư dân: ${existingResident?.fullName || formData.fullName}`
      : formData.isForeigner
        ? "Thêm mới Hồ sơ Người nước ngoài"
        : "Thêm Hồ sơ Cư dân Mới";

  return (
    <div id="resident-form-page" className="space-y-5">
      {/* Breadcrumb & Back link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="btn-back-to-residents"
            onClick={handleBackToList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Danh sách Dân cư</span>
          </button>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-slate-500 font-medium hidden sm:inline">Quản lý Dân cư</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <span className="font-bold text-emerald-700">
            {mode === "edit" ? "Chỉnh sửa hồ sơ" : "Thêm mới hồ sơ"}
          </span>
        </nav>
      </div>

      {/* Standardized PageHeader */}
      <PageHeader
        badgeIcon={<UserCheck size={14} className="text-emerald-600" />}
        badgeText="CSDL DÂN CƯ ĐỀ ÁN 06/CP • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext={
          mode === "edit"
            ? `MÃ HỒ SƠ: ${existingResident?.id}`
            : formData.isForeigner
              ? "NGƯỜI NƯỚC NGOÀI"
              : "CHUẨN 26 TRƯỜNG CSDL"
        }
        title={pageTitle}
        description={
          mode === "edit"
            ? "Điều chỉnh thông tin nhân thân, hộ khẩu liên kết, tình trạng cư trú và đồng bộ trực tiếp vào sổ hộ tịch."
            : "Khai báo đầy đủ thông tin nhân khẩu mới theo chuẩn CSDL Quốc gia về Dân cư."
        }
        actions={
          <button
            type="button"
            onClick={handleBackToList}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} /> Hủy & Quay lại
          </button>
        }
      />

      {/* Single polite live region for dynamic blur/change announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* GOV.UK style Error Summary on failed submit */}
      {visibleSummaryErrors.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="resident-error-summary-title"
          className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 space-y-2.5 focus:outline-none shadow-xs"
        >
          <div className="flex items-center gap-2 text-rose-900">
            <AlertCircle size={18} className="text-rose-600 shrink-0" aria-hidden="true" />
            <h2 id="resident-error-summary-title" className="text-sm font-extrabold">
              Vui lòng kiểm tra lại thông tin bắt buộc ({visibleSummaryErrors.length} mục)
            </h2>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-rose-800">
            {visibleSummaryErrors.map(err => (
              <li key={err.field}>
                <button
                  type="button"
                  onClick={() => handleJumpToField(err.tab, err.inputId)}
                  className="underline font-bold hover:text-rose-950 cursor-pointer text-left"
                >
                  {err.label}: {err.message.replace(/^Lỗi:\s*/, "")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2"
        >
          <AlertCircle size={16} className="text-rose-600 shrink-0" aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Form Step Tabs */}
        <div
          role="tablist"
          aria-label="Các phân mục hồ sơ cư dân"
          className="flex border-b border-slate-200 bg-slate-50/80 text-xs font-semibold overflow-x-auto"
        >
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = formActiveTab === tab.id;
            const isForeignerTab = tab.id === "foreigner";
            const hasTabError =
              submitAttempted && allErrors.some(err => err.tab === tab.id);

            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tab-panel-${tab.id}`}
                onClick={() => setFormActiveTab(tab.id)}
                className={`flex-1 min-w-[140px] py-3.5 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? isForeignerTab
                      ? "border-purple-600 text-purple-700 bg-white font-bold"
                      : "border-emerald-600 text-emerald-700 bg-white font-bold"
                    : isForeignerTab && formData.isForeigner
                      ? "border-transparent text-purple-600 hover:text-purple-800 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon
                  size={14}
                  className={isForeignerTab && formData.isForeigner ? "text-purple-600" : ""}
                />
                <span>{tab.label}</span>
                {isForeignerTab && formData.isForeigner && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" aria-hidden="true" />
                )}
                {hasTabError && (
                  <span
                    className="w-2 h-2 rounded-full bg-rose-600"
                    title="Có trường bắt buộc chưa hợp lệ"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Form Element */}
        <form
          noValidate
          onSubmit={handleSubmit}
          aria-labelledby={headingId}
          className="p-5 sm:p-6 space-y-6"
        >
          <h2 id={headingId} className="sr-only">
            {pageTitle}
          </h2>

          {/* TAB 1: BASIC & IDENTITY */}
          {formActiveTab === "basic" && (
            <div
              id="tab-panel-basic"
              role="tabpanel"
              aria-labelledby="tab-btn-basic"
              className="space-y-5 animate-in fade-in duration-150"
            >
              {/* Foreigner Switch Toggle */}
              <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Globe className="text-purple-600 shrink-0" size={18} />
                  <div>
                    <label
                      htmlFor="resident-toggle-foreigner"
                      className="font-bold text-slate-900 text-xs block cursor-pointer"
                    >
                      Là Người cư trú nước ngoài (Foreign Resident)
                    </label>
                    <span className="text-[11px] text-slate-500 block">
                      Sử dụng Hộ chiếu, theo dõi thị thực, thẻ tạm trú TRC & khai báo Công an Phường
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id="resident-toggle-foreigner"
                    name="isForeigner"
                    type="checkbox"
                    checked={formData.isForeigner}
                    onChange={e => {
                      const checked = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        isForeigner: checked,
                        status:
                          checked && prev.status === "Thường trú" ? "Tạm trú" : prev.status,
                        nationality:
                          checked && prev.nationality === "Việt Nam"
                            ? "Hàn Quốc"
                            : prev.nationality
                      }));
                      if (checked) {
                        setFormActiveTab("foreigner");
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              <fieldset className="space-y-4">
                <legend className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 w-full">
                  Thông tin định danh công dân
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="resident-field-fullName"
                    label="Họ và Tên"
                    required
                    error={getFieldError("fullName")}
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="fullName"
                        required
                        autoComplete="name"
                        enterKeyHint="next"
                        placeholder={
                          formData.isForeigner
                            ? "Park Min-ho, Johnathan Miller..."
                            : "Nguyễn Văn A"
                        }
                        value={formData.fullName}
                        onChange={handleInputChange}
                        onBlur={() => handleFieldBlur("fullName")}
                        className={`${
                          getFieldError("fullName") ? INPUT_ERROR_CLASS : INPUT_NORMAL_CLASS
                        } font-semibold`}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-cccd"
                    label={
                      formData.isForeigner
                        ? "Số Hộ chiếu (Passport No.)"
                        : "Số CCCD (12 số)"
                    }
                    required
                    hint={
                      formData.isForeigner
                        ? "Nhập đúng số hộ chiếu đang còn hiệu lực"
                        : "Gồm 12 chữ số định danh cá nhân"
                    }
                    error={getFieldError("cccd")}
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="cccd"
                        required
                        inputMode={formData.isForeigner ? "text" : "numeric"}
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="next"
                        placeholder={
                          formData.isForeigner ? "M89210452, UK55981240..." : "0790xxxxxxxx"
                        }
                        value={formData.cccd}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            cccd: val,
                            passportNumber: prev.isForeigner ? val : prev.passportNumber
                          }));
                          if (saveError) setSaveError(null);
                        }}
                        onBlur={() => handleFieldBlur("cccd")}
                        className={`${
                          getFieldError("cccd") ? INPUT_ERROR_CLASS : INPUT_NORMAL_CLASS
                        } font-mono`}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="resident-field-idIssueDate" label="Ngày cấp CCCD">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="idIssueDate"
                        placeholder="15/05/2021"
                        value={formData.idIssueDate}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                  <FormField id="resident-field-idIssuePlace" label="Nơi cấp CCCD">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="idIssuePlace"
                        placeholder="Cục Cảnh sát QLHC về TTXH"
                        value={formData.idIssuePlace}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField id="resident-field-gender" label="Giới tính">
                    {ariaProps => (
                      <select
                        {...ariaProps}
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    )}
                  </FormField>
                  <FormField
                    id="resident-field-birthDate"
                    label="Ngày sinh"
                    hint="Định dạng DD/MM/YYYY"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="birthDate"
                        autoComplete="bday"
                        placeholder="DD/MM/YYYY"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        className={`${INPUT_NORMAL_CLASS} font-mono`}
                      />
                    )}
                  </FormField>
                  <FormField id="resident-field-ethnicity" label="Dân tộc">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="ethnicity"
                        placeholder="Kinh, Hoa..."
                        value={formData.ethnicity}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField id="resident-field-religion" label="Tôn giáo">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="religion"
                        placeholder="Không, Phật giáo..."
                        value={formData.religion}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                  <FormField id="resident-field-nationality" label="Quốc tịch">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="nationality"
                        autoComplete="country-name"
                        placeholder="Việt Nam"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                  <FormField id="resident-field-hometown" label="Quê quán">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="hometown"
                        placeholder="Tỉnh/Thành phố quê hương"
                        value={formData.hometown}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="resident-field-fatherName" label="Họ tên cha">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="fatherName"
                        placeholder="Nhập họ tên cha (nếu có)"
                        value={formData.fatherName}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                  <FormField id="resident-field-motherName" label="Họ tên mẹ">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="motherName"
                        placeholder="Nhập họ tên mẹ (nếu có)"
                        value={formData.motherName}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                </div>
              </fieldset>
            </div>
          )}

          {/* TAB 2: RESIDENCE & HOUSEHOLD */}
          {formActiveTab === "residence" && (
            <div
              id="tab-panel-residence"
              role="tabpanel"
              aria-labelledby="tab-btn-residence"
              className="space-y-5 animate-in fade-in duration-150"
            >
              <fieldset className="space-y-4">
                <legend className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 w-full">
                  Đăng ký cư trú & Liên kết Sổ hộ khẩu
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField id="resident-field-status" label="Diện cư trú" required>
                    {ariaProps => (
                      <select
                        {...ariaProps}
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className={`${INPUT_NORMAL_CLASS} font-bold`}
                      >
                        <option value="Thường trú">Thường trú</option>
                        <option value="Tạm trú">Tạm trú</option>
                        <option value="Tạm vắng">Tạm vắng</option>
                      </select>
                    )}
                  </FormField>

                  <FormField id="resident-field-householdId" label="Mã Hộ khẩu liên kết">
                    {ariaProps => (
                      <>
                        <input
                          {...ariaProps}
                          type="text"
                          name="householdId"
                          list={householdDatalistId}
                          autoCorrect="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          placeholder="HK-301"
                          value={formData.householdId}
                          onChange={handleInputChange}
                          className={`${INPUT_NORMAL_CLASS} font-mono`}
                        />
                        <datalist id={householdDatalistId}>
                          {households.slice(0, 200).map(hh => (
                            <option key={hh.id} value={hh.code}>
                              {hh.code} — {hh.ownerName}
                            </option>
                          ))}
                        </datalist>
                      </>
                    )}
                  </FormField>

                  <FormField id="resident-field-relationToOwner" label="Quan hệ với chủ hộ">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="relationToOwner"
                        placeholder="Chủ hộ, Vợ, Con trai..."
                        value={formData.relationToOwner}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                </div>

                {(formData.status === "Tạm trú" ||
                  formData.temporaryRegDate ||
                  formData.temporaryExpDate) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200/80">
                    <FormField
                      id="resident-field-temporaryRegDate"
                      label="Ngày đăng ký tạm trú"
                      hint="Định dạng DD/MM/YYYY"
                    >
                      {ariaProps => (
                        <input
                          {...ariaProps}
                          type="text"
                          name="temporaryRegDate"
                          placeholder="DD/MM/YYYY"
                          value={formData.temporaryRegDate}
                          onChange={handleInputChange}
                          className={`${INPUT_NORMAL_CLASS} font-mono`}
                        />
                      )}
                    </FormField>
                    <FormField
                      id="resident-field-temporaryExpDate"
                      label="Ngày hết hạn tạm trú"
                      hint="Định dạng DD/MM/YYYY"
                    >
                      {ariaProps => (
                        <input
                          {...ariaProps}
                          type="text"
                          name="temporaryExpDate"
                          placeholder="DD/MM/YYYY"
                          value={formData.temporaryExpDate}
                          onChange={handleInputChange}
                          className={`${INPUT_NORMAL_CLASS} font-mono`}
                        />
                      )}
                    </FormField>
                    <FormField id="resident-field-managementStatus" label="Tình trạng quản lý">
                      {ariaProps => (
                        <input
                          {...ariaProps}
                          type="text"
                          name="managementStatus"
                          placeholder="Đang quản lý thực tế"
                          value={formData.managementStatus}
                          onChange={handleInputChange}
                          className={INPUT_NORMAL_CLASS}
                        />
                      )}
                    </FormField>
                  </div>
                )}

                <FormField
                  id="resident-field-address"
                  label="Địa chỉ cư trú hiện tại (Khu phố 3)"
                >
                  {ariaProps => (
                    <input
                      {...ariaProps}
                      type="text"
                      name="address"
                      autoComplete="street-address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={INPUT_NORMAL_CLASS}
                    />
                  )}
                </FormField>

                <FormField
                  id="resident-field-permanentAddress"
                  label="Nơi thường trú gốc (Địa chỉ trên sổ hộ khẩu)"
                >
                  {ariaProps => (
                    <input
                      {...ariaProps}
                      type="text"
                      name="permanentAddress"
                      value={formData.permanentAddress}
                      onChange={handleInputChange}
                      className={INPUT_NORMAL_CLASS}
                    />
                  )}
                </FormField>

                <FormField
                  id="resident-field-temporaryAddress"
                  label="Nơi ở hiện nay / Nơi tạm trú (Nếu khác)"
                >
                  {ariaProps => (
                    <input
                      {...ariaProps}
                      type="text"
                      name="temporaryAddress"
                      value={formData.temporaryAddress}
                      onChange={handleInputChange}
                      className={INPUT_NORMAL_CLASS}
                    />
                  )}
                </FormField>
              </fieldset>
            </div>
          )}

          {/* TAB 3: CAREER & EDUCATION */}
          {formActiveTab === "career" && (
            <div
              id="tab-panel-career"
              role="tabpanel"
              aria-labelledby="tab-btn-career"
              className="space-y-5 animate-in fade-in duration-150"
            >
              <fieldset className="space-y-4">
                <legend className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 w-full">
                  Học vấn, Hôn nhân & Nghề nghiệp
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="resident-field-education" label="Trình độ học vấn">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="education"
                        placeholder="12/12, Đại học, Thạc sĩ..."
                        value={formData.education}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>
                  <FormField id="resident-field-maritalStatus" label="Tình trạng hôn nhân">
                    {ariaProps => (
                      <select
                        {...ariaProps}
                        name="maritalStatus"
                        value={formData.maritalStatus}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      >
                        <option value="Đã kết hôn">Đã kết hôn</option>
                        <option value="Độc thân">Độc thân</option>
                        <option value="Ly hôn">Ly hôn</option>
                        <option value="Góa">Góa</option>
                      </select>
                    )}
                  </FormField>
                </div>

                <FormField id="resident-field-occupation" label="Nghề nghiệp hiện nay">
                  {ariaProps => (
                    <input
                      {...ariaProps}
                      type="text"
                      name="occupation"
                      autoComplete="organization-title"
                      placeholder="Kỹ sư, Giáo viên, Kinh doanh, Cán bộ..."
                      value={formData.occupation}
                      onChange={handleInputChange}
                      className={INPUT_NORMAL_CLASS}
                    />
                  )}
                </FormField>

                <FormField
                  id="resident-field-workplace"
                  label="Nơi làm việc / Cơ quan công tác"
                >
                  {ariaProps => (
                    <input
                      {...ariaProps}
                      type="text"
                      name="workplace"
                      autoComplete="organization"
                      placeholder="Tên công ty, trường học, cơ quan..."
                      value={formData.workplace}
                      onChange={handleInputChange}
                      className={INPUT_NORMAL_CLASS}
                    />
                  )}
                </FormField>
              </fieldset>
            </div>
          )}

          {/* TAB 4: POLICY, HEALTH & CONTACT */}
          {formActiveTab === "policy" && (
            <div
              id="tab-panel-policy"
              role="tabpanel"
              aria-labelledby="tab-btn-policy"
              className="space-y-5 animate-in fade-in duration-150"
            >
              <fieldset className="space-y-4">
                <legend className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 w-full">
                  Chính sách, Y tế & Thông tin liên hệ
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="resident-field-policyGroup"
                    label="Diện chính sách / Đoàn thể"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="policyGroup"
                        placeholder="Đảng viên, Cựu chiến binh, Thương binh, Người cao tuổi..."
                        value={formData.policyGroup}
                        onChange={handleInputChange}
                        className={`${INPUT_NORMAL_CLASS} font-semibold text-rose-700`}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-healthInsuranceNumber"
                    label="Mã số thẻ BHYT"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="healthInsuranceNumber"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="DN479xxxxxxxxx"
                        value={formData.healthInsuranceNumber}
                        onChange={handleInputChange}
                        className={`${INPUT_NORMAL_CLASS} font-mono`}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="resident-field-militaryServiceStatus"
                    label="Nghĩa vụ quân sự"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="militaryServiceStatus"
                        placeholder="Đã hoàn thành, Sĩ quan dự bị, Tạm hoãn..."
                        value={formData.militaryServiceStatus}
                        onChange={handleInputChange}
                        className={INPUT_NORMAL_CLASS}
                      />
                    )}
                  </FormField>

                  <FormField id="resident-field-phone" label="Số điện thoại liên lạc">
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="09xxxxxxxx"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`${INPUT_NORMAL_CLASS} font-mono`}
                      />
                    )}
                  </FormField>
                </div>

                <FormField
                  id="resident-field-emergencyContact"
                  label="Người liên hệ khẩn cấp (Họ tên & SĐT)"
                >
                  {ariaProps => (
                    <input
                      {...ariaProps}
                      type="text"
                      name="emergencyContact"
                      placeholder="Nguyễn Văn B (Cha) - 0903xxxxxx"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      className={INPUT_NORMAL_CLASS}
                    />
                  )}
                </FormField>

                <FormField id="resident-field-notes" label="Ghi chú quản lý cư trú">
                  {ariaProps => (
                    <textarea
                      {...ariaProps}
                      name="notes"
                      rows={3}
                      placeholder="Ghi chú thêm về nhân khẩu..."
                      value={formData.notes}
                      onChange={handleInputChange}
                      className={INPUT_NORMAL_CLASS}
                    />
                  )}
                </FormField>
              </fieldset>
            </div>
          )}

          {/* TAB 5: FOREIGNER & VISA / RESIDENCE CARD */}
          {formActiveTab === "foreigner" && (
            <div
              id="tab-panel-foreigner"
              role="tabpanel"
              aria-labelledby="tab-btn-foreigner"
              className="space-y-5 animate-in fade-in duration-150"
            >
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="text-purple-600 shrink-0" size={16} />
                  <span className="font-bold text-purple-900 text-xs">
                    Hồ sơ Cư trú & Thị thực Người nước ngoài (Bộ Công an & QLXNC)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!formData.isForeigner && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          isForeigner: true,
                          status: prev.status === "Thường trú" ? "Tạm trú" : prev.status,
                          nationality:
                            prev.nationality === "Việt Nam" ? "Hàn Quốc" : prev.nationality
                        }))
                      }
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      Kích hoạt diện Người nước ngoài
                    </button>
                  )}
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                    Luật 47/2014 & TT 53/2016
                  </span>
                </div>
              </div>

              <fieldset className="space-y-4">
                <legend className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 w-full">
                  Thông tin Hộ chiếu, Thị thực & Khai báo lưu trú
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="resident-field-foreignNationality"
                    label="Quốc tịch (Nationality)"
                    required={formData.isForeigner}
                  >
                    {ariaProps => (
                      <div className="flex gap-2">
                        <select
                          {...ariaProps}
                          name="nationality"
                          value={formData.nationality}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              nationality: val,
                              ethnicity: val
                            }));
                          }}
                          className={`${INPUT_PURPLE_CLASS} flex-1 font-medium`}
                        >
                          {NATIONALITY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <span
                          className="w-11 flex items-center justify-center bg-slate-100 rounded-xl text-lg border border-slate-200 shrink-0"
                          aria-hidden="true"
                        >
                          {getCountryFlag(formData.nationality)}
                        </span>
                      </div>
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-passportNumber"
                    label="Số Hộ chiếu (Passport No.)"
                    required={formData.isForeigner}
                    error={formData.isForeigner ? getFieldError("passportNumber") : undefined}
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="passportNumber"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="M89210452, UK55981240..."
                        value={formData.passportNumber}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            passportNumber: val,
                            cccd: prev.isForeigner ? val : prev.cccd
                          }));
                          if (saveError) setSaveError(null);
                        }}
                        onBlur={() => handleFieldBlur("passportNumber")}
                        className={`${
                          formData.isForeigner && getFieldError("passportNumber")
                            ? INPUT_ERROR_CLASS
                            : INPUT_PURPLE_CLASS
                        } font-mono font-bold`}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="resident-field-passportExpiryDate"
                    label="Ngày hết hạn Hộ chiếu"
                    hint="Định dạng DD/MM/YYYY"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="passportExpiryDate"
                        placeholder="DD/MM/YYYY"
                        value={formData.passportExpiryDate}
                        onChange={handleInputChange}
                        className={INPUT_PURPLE_CLASS}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-foreignIssuePlace"
                    label="Cơ quan cấp Hộ chiếu"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="idIssuePlace"
                        placeholder="Cục Quản lý Xuất nhập cảnh, Bộ Ngoại giao..."
                        value={formData.idIssuePlace}
                        onChange={handleInputChange}
                        className={INPUT_PURPLE_CLASS}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="resident-field-visaOrCardType"
                    label="Loại thị thực / Thẻ cư trú"
                  >
                    {ariaProps => (
                      <select
                        {...ariaProps}
                        name="visaOrCardType"
                        value={formData.visaOrCardType}
                        onChange={handleInputChange}
                        className={`${INPUT_PURPLE_CLASS} font-semibold`}
                      >
                        <option value="Thẻ tạm trú (TRC)">
                          Thẻ tạm trú (TRC - Temporary Residence Card)
                        </option>
                        <option value="Thẻ thường trú (PRC)">
                          Thẻ thường trú (PRC - Permanent Residence Card)
                        </option>
                        <option value="Thị thực LĐ">Thị thực Lao động (Visa LĐ)</option>
                        <option value="Thị thực ĐT">Thị thực Đầu tư (Visa ĐT)</option>
                        <option value="Thị thực TT">Thị thực Thăm thân (Visa TT)</option>
                        <option value="Miễn thị thực / E-Visa">
                          Miễn thị thực / E-Visa
                        </option>
                      </select>
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-visaOrCardNumber"
                    label="Số thẻ / Số thị thực"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="visaOrCardNumber"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="TRC-KR-2023-0941..."
                        value={formData.visaOrCardNumber}
                        onChange={handleInputChange}
                        className={`${INPUT_PURPLE_CLASS} font-mono`}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="resident-field-visaValidFrom"
                    label="Thời hạn từ ngày"
                    hint="Định dạng DD/MM/YYYY"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="visaValidFrom"
                        placeholder="DD/MM/YYYY"
                        value={formData.visaValidFrom}
                        onChange={handleInputChange}
                        className={INPUT_PURPLE_CLASS}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-visaValidUntil"
                    label="Thời hạn đến ngày (Hạn cư trú)"
                    hint="Định dạng DD/MM/YYYY"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="visaValidUntil"
                        placeholder="DD/MM/YYYY"
                        value={formData.visaValidUntil}
                        onChange={handleInputChange}
                        className={`${INPUT_PURPLE_CLASS} font-bold`}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    id="resident-field-temporaryRegistrationCode"
                    label="Mã khai báo CA Phường"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="temporaryRegistrationCode"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="KBTT-AP-2024-xxxx"
                        value={formData.temporaryRegistrationCode}
                        onChange={handleInputChange}
                        className={`${INPUT_PURPLE_CLASS} font-mono`}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-temporaryRegistrationDate"
                    label="Ngày khai báo"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="temporaryRegistrationDate"
                        placeholder="DD/MM/YYYY"
                        value={formData.temporaryRegistrationDate}
                        onChange={handleInputChange}
                        className={INPUT_PURPLE_CLASS}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-temporaryRegistrationStatus"
                    label="Tình trạng khai báo"
                  >
                    {ariaProps => (
                      <select
                        {...ariaProps}
                        name="temporaryRegistrationStatus"
                        value={formData.temporaryRegistrationStatus}
                        onChange={handleInputChange}
                        className={INPUT_PURPLE_CLASS}
                      >
                        <option value="Đã khai báo">Đã khai báo (Hợp pháp)</option>
                        <option value="Chờ xác nhận">Chờ xác nhận</option>
                        <option value="Chưa khai báo">Chưa khai báo</option>
                        <option value="Hết hạn">Hết hạn</option>
                      </select>
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="resident-field-workPermitNumber"
                    label="Số Giấy phép LĐ (GPLĐ) / Miễn"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="workPermitNumber"
                        placeholder="GPLĐ-2023-xxxx/SLĐTBXH"
                        value={formData.workPermitNumber}
                        onChange={handleInputChange}
                        className={INPUT_PURPLE_CLASS}
                      />
                    )}
                  </FormField>

                  <FormField
                    id="resident-field-sponsoringOrganization"
                    label="Cơ quan / Doanh nghiệp bảo lãnh"
                  >
                    {ariaProps => (
                      <input
                        {...ariaProps}
                        type="text"
                        name="sponsoringOrganization"
                        placeholder="Công ty TNHH..., Trường Quốc tế..."
                        value={formData.sponsoringOrganization}
                        onChange={handleInputChange}
                        className={INPUT_PURPLE_CLASS}
                      />
                    )}
                  </FormField>
                </div>

                <FormField
                  id="resident-field-landlordContact"
                  label="Chủ nhà / Cơ sở lưu trú cho thuê (Họ tên & SĐT)"
                >
                  {ariaProps => (
                    <input
                      {...ariaProps}
                      type="text"
                      name="landlordContact"
                      placeholder="Nguyễn Văn A (Chủ nhà 42/3 LĐC) - 0903xxxxxx"
                      value={formData.landlordContact}
                      onChange={handleInputChange}
                      className={INPUT_PURPLE_CLASS}
                    />
                  )}
                </FormField>
              </fieldset>
            </div>
          )}

          {/* Form Navigation & Submit Footer */}
          <div className="pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {canGoPrev && (
                <button
                  type="button"
                  onClick={() => setFormActiveTab(visibleTabs[currentTabIndex - 1].id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer font-semibold text-xs transition-colors"
                >
                  <ChevronLeft size={14} /> Bước trước
                </button>
              )}
              {canGoNext && (
                <button
                  type="button"
                  onClick={() => {
                    if (formActiveTab === "basic") setFormActiveTab("residence");
                    else if (formActiveTab === "residence") setFormActiveTab("career");
                    else if (formActiveTab === "career") setFormActiveTab("policy");
                    else if (formActiveTab === "policy" && formData.isForeigner) {
                      setFormActiveTab("foreigner");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl cursor-pointer font-bold text-xs transition-colors"
                >
                  Tiếp theo <ChevronRight size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleBackToList}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-submit-resident-form"
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl cursor-pointer shadow-xs text-xs transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang lưu hồ sơ...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>
                      {mode === "edit" ? "Lưu thay đổi" : "Lưu vào Danh sách Cư dân"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
