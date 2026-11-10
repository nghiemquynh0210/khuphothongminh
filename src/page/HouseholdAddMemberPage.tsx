import React, { useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, Save, UserPlus } from "lucide-react";
import { Household, Resident } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { ROUTES, getHouseholdDetailPath, navigate } from "../routes";
import { findHouseholdByIdOrCode } from "../utils/householdFormUtils";

export interface HouseholdAddMemberPageProps {
  householdId: string;
  households: Household[];
  isDataLoading?: boolean;
  onAddMember: (
    householdId: string,
    member: {
      name: string;
      relation: string;
      cccd: string;
      birthYear: number;
      phone?: string;
    },
    newResident: Resident
  ) => void;
  onShowToast?: (message: string) => void;
}

interface FieldError {
  id: string;
  label: string;
  message: string;
}

const INPUT_BASE =
  "w-full px-3 py-2 border rounded-xl text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all";
const INPUT_NORMAL =
  `${INPUT_BASE} border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600`;
const INPUT_ERROR =
  `${INPUT_BASE} border-rose-500 bg-rose-50/40 focus:ring-rose-500/20 focus:border-rose-600`;

export default function HouseholdAddMemberPage({
  householdId,
  households,
  isDataLoading = false,
  onAddMember,
  onShowToast
}: HouseholdAddMemberPageProps) {
  const household = useMemo(
    () => findHouseholdByIdOrCode(households, householdId),
    [households, householdId]
  );

  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  const [fullName, setFullName] = useState("");
  const [cccd, setCccd] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [relation, setRelation] = useState("Con trai");
  const [gender, setGender] = useState<"Nam" | "Nữ">("Nam");
  const [phone, setPhone] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleBack = () => {
    if (household) {
      navigate(getHouseholdDetailPath(household.id));
    } else {
      navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
    }
  };

  if (!household && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Đang tải sổ hộ khẩu...</h2>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-4 max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Không tìm thấy Sổ Hộ Khẩu</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Mã sổ <span className="font-mono font-bold text-slate-800">{householdId}</span> không tồn tại hoặc đã bị xóa.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD_HOUSEHOLDS)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={15} />
            <span>Quay lại Danh sách Hộ khẩu</span>
          </button>
        </div>
      </div>
    );
  }

  const computeErrors = (): FieldError[] => {
    const errs: FieldError[] = [];
    if (!fullName.trim()) {
      errs.push({
        id: "member-field-name",
        label: "Họ và tên thành viên",
        message: "Vui lòng nhập họ và tên thành viên."
      });
    }
    const cleanCccd = cccd.trim();
    if (!cleanCccd) {
      errs.push({
        id: "member-field-cccd",
        label: "Số CCCD gắn chip",
        message: "Vui lòng nhập số CCCD / định danh cá nhân."
      });
    } else if (household.members.some(m => m.cccd.trim() === cleanCccd)) {
      errs.push({
        id: "member-field-cccd",
        label: "Số CCCD gắn chip",
        message: `Nhân khẩu có CCCD ${cleanCccd} đã có mặt trong sổ ${household.code}.`
      });
    }
    const yearNum = Number(birthYear);
    if (!birthYear.trim() || Number.isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear()) {
      errs.push({
        id: "member-field-birthyear",
        label: "Năm sinh",
        message: "Vui lòng nhập năm sinh hợp lệ (ví dụ: 1995)."
      });
    }
    return errs;
  };

  const errors = submitAttempted ? computeErrors() : [];
  const getErrorFor = (id: string) => errors.find(e => e.id === id)?.message;

  const handleRelationChange = (val: string) => {
    setRelation(val);
    if (val === "Vợ" || val === "Con gái" || val === "Mẹ") {
      setGender("Nữ");
    } else if (val === "Chồng" || val === "Con trai" || val === "Bố") {
      setGender("Nam");
    }
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

    const cleanName = fullName.trim();
    const cleanCccd = cccd.trim();
    const yearNum = Number(birthYear);
    const cleanPhone = phone.trim();

    const newMember = {
      name: cleanName,
      relation,
      cccd: cleanCccd,
      birthYear: yearNum,
      phone: cleanPhone || undefined
    };

    const newResident: Resident = {
      id: "R" + Date.now().toString().slice(-5),
      fullName: cleanName,
      gender,
      birthDate: `01/01/${yearNum}`,
      cccd: cleanCccd,
      phone: cleanPhone || "N/A",
      status: household.type || "Thường trú",
      occupation: "Thành viên",
      address: household.address,
      householdId: household.code,
      relationToOwner: relation,
      joinDate: new Date().toLocaleDateString("vi-VN")
    };

    onAddMember(household.id, newMember, newResident);
    onShowToast?.(
      `Đã nhập khẩu thành viên ${cleanName} vào Sổ ${household.code} thành công.`
    );
    navigate(getHouseholdDetailPath(household.id));
  };

  return (
    <div id="household-add-member-page" className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="btn-back-from-add-member"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Chi tiết Sổ {household.code}</span>
          </button>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-slate-500 font-medium hidden sm:inline">
            Hộ {household.ownerName}
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <span className="font-bold text-emerald-700">Thêm nhân khẩu</span>
        </nav>
      </div>

      {/* PageHeader */}
      <PageHeader
        badgeIcon={<UserPlus size={14} className="text-emerald-600" />}
        badgeText="NHẬP KHẨU ĐIỆN TỬ • SỔ HỘ TỊCH KP3"
        badgeSubtext={`SỔ HK: ${household.code}`}
        title={`Thêm Nhân khẩu vào Hộ tịch ${household.code}`}
        description={`Chủ hộ: ${household.ownerName} • Địa chỉ: ${household.address}`}
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
          aria-labelledby="add-member-error-summary-title"
          className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 space-y-2.5 focus:outline-none shadow-xs"
        >
          <div className="flex items-center gap-2 text-rose-900">
            <AlertCircle size={18} className="text-rose-600 shrink-0" aria-hidden="true" />
            <h2 id="add-member-error-summary-title" className="text-sm font-extrabold">
              Vui lòng kiểm tra lại thông tin nhập khẩu ({errors.length} mục)
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
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden max-w-3xl"
      >
        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-700">
          <div className="space-y-1.5">
            <label htmlFor="member-field-name" className="font-bold text-slate-700 block">
              Họ và tên thành viên <span className="text-rose-600">*</span>
            </label>
            <input
              id="member-field-name"
              type="text"
              placeholder="Nguyễn Văn B"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              aria-invalid={getErrorFor("member-field-name") ? "true" : "false"}
              aria-describedby={
                getErrorFor("member-field-name") ? "member-field-name-error" : undefined
              }
              className={getErrorFor("member-field-name") ? INPUT_ERROR : INPUT_NORMAL}
            />
            {getErrorFor("member-field-name") && (
              <p
                id="member-field-name-error"
                className="text-xs font-semibold text-rose-700 flex items-center gap-1"
              >
                <AlertCircle size={12} /> {getErrorFor("member-field-name")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="member-field-cccd" className="font-bold text-slate-700 block">
                Số CCCD gắn chip <span className="text-rose-600">*</span>
              </label>
              <input
                id="member-field-cccd"
                type="text"
                placeholder="079XXXXXXXXX"
                value={cccd}
                onChange={e => setCccd(e.target.value)}
                aria-invalid={getErrorFor("member-field-cccd") ? "true" : "false"}
                aria-describedby={
                  getErrorFor("member-field-cccd") ? "member-field-cccd-error" : undefined
                }
                className={`${getErrorFor("member-field-cccd") ? INPUT_ERROR : INPUT_NORMAL} font-mono`}
              />
              {getErrorFor("member-field-cccd") && (
                <p
                  id="member-field-cccd-error"
                  className="text-xs font-semibold text-rose-700 flex items-center gap-1"
                >
                  <AlertCircle size={12} /> {getErrorFor("member-field-cccd")}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="member-field-birthyear" className="font-bold text-slate-700 block">
                Năm sinh <span className="text-rose-600">*</span>
              </label>
              <input
                id="member-field-birthyear"
                type="number"
                placeholder="1995"
                value={birthYear}
                onChange={e => setBirthYear(e.target.value)}
                aria-invalid={getErrorFor("member-field-birthyear") ? "true" : "false"}
                aria-describedby={
                  getErrorFor("member-field-birthyear")
                    ? "member-field-birthyear-error"
                    : undefined
                }
                className={getErrorFor("member-field-birthyear") ? INPUT_ERROR : INPUT_NORMAL}
              />
              {getErrorFor("member-field-birthyear") && (
                <p
                  id="member-field-birthyear-error"
                  className="text-xs font-semibold text-rose-700 flex items-center gap-1"
                >
                  <AlertCircle size={12} /> {getErrorFor("member-field-birthyear")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="member-field-relation" className="font-bold text-slate-700 block">
                Quan hệ với chủ hộ <span className="text-rose-600">*</span>
              </label>
              <select
                id="member-field-relation"
                value={relation}
                onChange={e => handleRelationChange(e.target.value)}
                className={INPUT_NORMAL}
              >
                <option value="Vợ">Vợ</option>
                <option value="Chồng">Chồng</option>
                <option value="Con trai">Con trai</option>
                <option value="Con gái">Con gái</option>
                <option value="Bố">Bố</option>
                <option value="Mẹ">Mẹ</option>
                <option value="Anh/Em trai">Anh/Em trai</option>
                <option value="Cháu">Cháu</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="member-field-gender" className="font-bold text-slate-700 block">
                Giới tính
              </label>
              <select
                id="member-field-gender"
                value={gender}
                onChange={e => setGender(e.target.value as "Nam" | "Nữ")}
                className={INPUT_NORMAL}
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="member-field-phone" className="font-bold text-slate-700 block">
                Số điện thoại di động
              </label>
              <input
                id="member-field-phone"
                type="text"
                placeholder="09XXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={`${INPUT_NORMAL} font-mono`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            id="btn-cancel-add-member"
            onClick={handleBack}
            className="px-4 py-2 border border-slate-300 bg-white rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            id="btn-submit-add-member"
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
          >
            <Save size={14} />
            <span>Xác nhận Nhập khẩu</span>
          </button>
        </div>
      </form>
    </div>
  );
}

