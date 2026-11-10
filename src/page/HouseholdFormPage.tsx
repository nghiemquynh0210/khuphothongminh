import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Home,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserPlus
} from "lucide-react";
import { Household, Resident } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { ROUTES, getHouseholdDetailPath, navigate } from "../routes";
import { generateDefaultCoordinatesForAddress } from "../utils/gisUtils";
import {
  appendHouseholdAuditEntry,
  findHouseholdByIdOrCode,
  parseGpsPair
} from "../utils/householdFormUtils";

export interface HouseholdFormPageProps {
  mode: "create" | "edit";
  householdId?: string;
  households: Household[];
  isDataLoading?: boolean;
  onCreateHousehold: (newHousehold: Household, newResidents: Resident[]) => void;
  onUpdateHousehold: (updatedHousehold: Household, oldHousehold: Household) => void;
  onShowToast?: (message: string) => void;
}

interface TempMemberDraft {
  name: string;
  relation: string;
  cccd: string;
  birthYear: number;
  phone?: string;
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

export default function HouseholdFormPage({
  mode,
  householdId,
  households,
  isDataLoading = false,
  onCreateHousehold,
  onUpdateHousehold,
  onShowToast
}: HouseholdFormPageProps) {
  const existingHousehold = useMemo(() => {
    if (mode !== "edit" || !householdId) return null;
    return findHouseholdByIdOrCode(households, householdId);
  }, [mode, householdId, households]);

  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  // Create fields
  const [newHCode, setNewHCode] = useState("");
  const [newHType, setNewHType] = useState<"Thường trú" | "Tạm trú">(
    existingHousehold?.type || "Thường trú"
  );
  const [newOwner, setNewOwner] = useState(existingHousehold?.ownerName || "");
  const [ownerCccd, setOwnerCccd] = useState("");
  const [ownerBirthYear, setOwnerBirthYear] = useState<string>("1980");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [newAddress, setNewAddress] = useState(existingHousehold?.address || "");
  const [coordInput, setCoordInput] = useState(existingHousehold?.coordinates || "");
  const [editNotes, setEditNotes] = useState(existingHousehold?.notes || "");

  // Temporary members in create mode
  const [tempMembers, setTempMembers] = useState<TempMemberDraft[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberCccd, setNewMemberCccd] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("Vợ");
  const [newMemberBirthYear, setNewMemberBirthYear] = useState<string>("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [tempMemberError, setTempMemberError] = useState<string | null>(null);

  const [submitAttempted, setSubmitAttempted] = useState(false);

  const syncedIdRef = useRef<string | null>(
    mode === "edit" && existingHousehold ? existingHousehold.id : null
  );

  useEffect(() => {
    if (mode === "edit" && existingHousehold && syncedIdRef.current !== existingHousehold.id) {
      syncedIdRef.current = existingHousehold.id;
      setNewHType(existingHousehold.type || "Thường trú");
      setNewOwner(existingHousehold.ownerName || "");
      setNewAddress(existingHousehold.address || "");
      setCoordInput(existingHousehold.coordinates || "");
      setEditNotes(existingHousehold.notes || "");
    }
  }, [mode, existingHousehold]);

  const parsedGPS = useMemo(() => parseGpsPair(coordInput), [coordInput]);

  const handleBack = () => {
    if (mode === "edit" && existingHousehold) {
      navigate(getHouseholdDetailPath(existingHousehold.id));
      return;
    }
    navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
  };

  if (mode === "edit" && !existingHousehold && isDataLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
        <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Đang tải thông tin sổ hộ khẩu...</h2>
        <p className="text-xs text-slate-500">
          Hệ thống đang đồng bộ dữ liệu hộ tịch từ cơ sở dữ liệu Khu phố 3.
        </p>
      </div>
    );
  }

  if (mode === "edit" && !existingHousehold) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-4 max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Không tìm thấy Sổ Hộ Khẩu</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Mã sổ <span className="font-mono font-bold text-slate-800">{householdId}</span> không tồn tại hoặc đã bị xóa khỏi danh sách quản lý.
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
    const errors: FieldError[] = [];
    if (mode === "create") {
      const cleanCode = newHCode.trim();
      if (!cleanCode) {
        errors.push({
          id: "household-field-code",
          label: "Mã số Sổ Hộ Khẩu",
          message: "Vui lòng nhập mã số Sổ hộ khẩu (ví dụ: HK-305)."
        });
      } else if (
        households.some(h => h.code.trim().toUpperCase() === cleanCode.toUpperCase())
      ) {
        errors.push({
          id: "household-field-code",
          label: "Mã số Sổ Hộ Khẩu",
          message: `Mã số sổ ${cleanCode} đã tồn tại trong hệ thống.`
        });
      }
    }

    if (!newOwner.trim()) {
      errors.push({
        id: "household-field-owner",
        label: mode === "edit" ? "Chủ hộ đại diện" : "Tên Chủ hộ mới",
        message: "Vui lòng nhập hoặc chọn tên Chủ hộ đại diện."
      });
    }

    if (!newAddress.trim()) {
      errors.push({
        id: "household-field-address",
        label: "Địa chỉ cư trú",
        message: "Vui lòng nhập địa chỉ đăng ký cư trú của hộ gia đình."
      });
    }

    return errors;
  };

  const errors = submitAttempted ? computeErrors() : [];
  const getErrorFor = (id: string) => errors.find(e => e.id === id)?.message;

  const handleAddTempMember = () => {
    const yearNum = Number(newMemberBirthYear);
    if (!newMemberName.trim() || !newMemberCccd.trim() || !newMemberBirthYear || Number.isNaN(yearNum)) {
      setTempMemberError("Vui lòng điền đầy đủ Họ tên, CCCD và Năm sinh thành viên.");
      return;
    }
    setTempMemberError(null);
    setTempMembers(prev => [
      ...prev,
      {
        name: newMemberName.trim(),
        relation: newMemberRelation,
        cccd: newMemberCccd.trim(),
        birthYear: yearNum,
        phone: newMemberPhone.trim() || undefined
      }
    ]);
    setNewMemberName("");
    setNewMemberCccd("");
    setNewMemberPhone("");
    setNewMemberBirthYear("");
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

    const finalCoordinates = parsedGPS ? parsedGPS.formatted : coordInput.trim();

    if (mode === "edit" && existingHousehold) {
      const updatedOwnerName = newOwner.trim();
      const updatedMembers = existingHousehold.members.map(m => {
        if (m.name === updatedOwnerName) {
          return { ...m, relation: "Chủ hộ" };
        }
        if (m.relation === "Chủ hộ" && m.name !== updatedOwnerName) {
          return { ...m, relation: "Thành viên" };
        }
        return m;
      });

      const updatedHousehold: Household = {
        ...existingHousehold,
        address: newAddress.trim(),
        type: newHType,
        ownerName: updatedOwnerName,
        coordinates: finalCoordinates || undefined,
        notes: editNotes.trim() || undefined,
        members: updatedMembers,
        auditHistory: appendHouseholdAuditEntry(
          existingHousehold,
          "Cập nhật thông tin sổ hộ khẩu"
        )
      };

      onUpdateHousehold(updatedHousehold, existingHousehold);
      onShowToast?.(`Đã cập nhật Sổ hộ khẩu ${existingHousehold.code} thành công.`);
      navigate(getHouseholdDetailPath(existingHousehold.id));
      return;
    }

    // Create Mode
    const cleanCode = newHCode.trim();
    const cleanOwner = newOwner.trim();
    const cleanAddress = newAddress.trim();
    const primaryOwnerCccd =
      ownerCccd.trim() || `079${Math.floor(100000000 + Math.random() * 900000000)}`;
    const primaryBirthYear = parseInt(ownerBirthYear, 10) || 1980;
    const primaryPhone = ownerPhone.trim() || "09XXXXXXXX";
    const stamp = Date.now().toString().slice(-4);

    const newH: Household = {
      id: "H" + (households.length + 1).toString().padStart(3, "0") + "-" + stamp,
      code: cleanCode,
      ownerName: cleanOwner,
      address: cleanAddress,
      type: newHType,
      memberCount: tempMembers.length + 1,
      coordinates: finalCoordinates || undefined,
      members: [
        {
          name: cleanOwner,
          relation: "Chủ hộ",
          cccd: primaryOwnerCccd,
          birthYear: primaryBirthYear,
          phone: primaryPhone
        },
        ...tempMembers
      ],
      auditHistory: [
        {
          date: new Date().toLocaleString("vi-VN"),
          action: "Khởi tạo Sổ hộ khẩu điện tử mới",
          actor: "Cán bộ Tư pháp"
        }
      ]
    };

    const todayStr = new Date().toLocaleDateString("vi-VN");
    const newResidents: Resident[] = [
      {
        id: `R${stamp}01`,
        fullName: cleanOwner,
        gender: "Nam",
        birthDate: `15/05/${primaryBirthYear}`,
        cccd: primaryOwnerCccd,
        phone: primaryPhone,
        status: newHType,
        occupation: "Kinh doanh tự do",
        address: cleanAddress,
        householdId: cleanCode,
        relationToOwner: "Chủ hộ",
        joinDate: todayStr
      },
      ...tempMembers.map((m, idx) => ({
        id: `R${stamp}${(idx + 2).toString().padStart(2, "0")}`,
        fullName: m.name,
        gender: (m.relation === "Vợ" || m.relation === "Con gái" ? "Nữ" : "Nam") as
          | "Nam"
          | "Nữ",
        birthDate: `01/01/${m.birthYear}`,
        cccd: m.cccd,
        phone: m.phone || "N/A",
        status: newHType,
        occupation: "Thành viên hộ",
        address: cleanAddress,
        householdId: cleanCode,
        relationToOwner: m.relation,
        joinDate: todayStr
      }))
    ];

    onCreateHousehold(newH, newResidents);
    onShowToast?.(`Đã lập Sổ hộ khẩu mới ${newH.code} (${newH.ownerName}) thành công.`);
    navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
  };

  return (
    <div id="household-form-page" className="space-y-5">
      {/* Breadcrumb & Back link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="btn-back-from-household-form"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>
              {mode === "edit" && existingHousehold
                ? `Quay lại Chi tiết Sổ ${existingHousehold.code}`
                : "Quay lại Danh sách Hộ khẩu"}
            </span>
          </button>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-slate-500 font-medium hidden sm:inline">Quản lý Hộ khẩu</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <span className="font-bold text-emerald-700">
            {mode === "edit" ? "Chỉnh sửa Sổ hộ khẩu" : "Lập Sổ hộ mới"}
          </span>
        </nav>
      </div>

      {/* PageHeader */}
      <PageHeader
        badgeIcon={<Home size={14} className="text-emerald-600" />}
        badgeText="SỔ HỘ TỊCH ĐIỆN TỬ • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext={
          mode === "edit" && existingHousehold
            ? `SỔ: ${existingHousehold.code}`
            : "KHỞI TẠO HỒ SƠ MỚI"
        }
        title={
          mode === "edit" && existingHousehold
            ? `Chỉnh sửa Sổ hộ khẩu: ${existingHousehold.code}`
            : "Lập Sổ Hộ Khẩu Điện Tử Mới"
        }
        description={
          mode === "edit"
            ? "Cập nhật thông tin chủ hộ đại diện, địa chỉ cư trú, tọa độ GIS và lưu vết nhật ký biến động."
            : "Phân khoa số hóa Tư pháp cơ sở — Khởi tạo sổ hộ khẩu điện tử và đồng bộ nhân khẩu."
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
          aria-labelledby="household-error-summary-title"
          className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 space-y-2.5 focus:outline-none shadow-xs"
        >
          <div className="flex items-center gap-2 text-rose-900">
            <AlertCircle size={18} className="text-rose-600 shrink-0" aria-hidden="true" />
            <h2 id="household-error-summary-title" className="text-sm font-extrabold">
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
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
      >
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-700">
          {mode === "create" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="household-field-code" className="font-bold text-slate-700 block">
                    Mã số Sổ Hộ Khẩu <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="household-field-code"
                    type="text"
                    placeholder="HK-XXX"
                    value={newHCode}
                    onChange={e => setNewHCode(e.target.value)}
                    aria-invalid={getErrorFor("household-field-code") ? "true" : "false"}
                    aria-describedby={
                      getErrorFor("household-field-code") ? "household-field-code-error" : undefined
                    }
                    className={`${getErrorFor("household-field-code") ? INPUT_ERROR : INPUT_NORMAL} font-mono`}
                  />
                  {getErrorFor("household-field-code") && (
                    <p
                      id="household-field-code-error"
                      className="text-xs font-semibold text-rose-700 flex items-center gap-1"
                    >
                      <AlertCircle size={12} /> {getErrorFor("household-field-code")}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="household-field-type" className="font-bold text-slate-700 block">
                    Loại cư trú <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="household-field-type"
                    value={newHType}
                    onChange={e => setNewHType(e.target.value as "Thường trú" | "Tạm trú")}
                    className={INPUT_NORMAL}
                  >
                    <option value="Thường trú">Thường trú (KT1, KT2)</option>
                    <option value="Tạm trú">Tạm trú (KT3, KT4)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="household-field-owner" className="font-bold text-slate-700 block">
                    Tên Chủ hộ mới <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="household-field-owner"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={newOwner}
                    onChange={e => setNewOwner(e.target.value)}
                    aria-invalid={getErrorFor("household-field-owner") ? "true" : "false"}
                    aria-describedby={
                      getErrorFor("household-field-owner")
                        ? "household-field-owner-error"
                        : undefined
                    }
                    className={getErrorFor("household-field-owner") ? INPUT_ERROR : INPUT_NORMAL}
                  />
                  {getErrorFor("household-field-owner") && (
                    <p
                      id="household-field-owner-error"
                      className="text-xs font-semibold text-rose-700 flex items-center gap-1"
                    >
                      <AlertCircle size={12} /> {getErrorFor("household-field-owner")}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="household-field-owner-cccd" className="font-bold text-slate-700 block">
                    Số CCCD Chủ hộ
                  </label>
                  <input
                    id="household-field-owner-cccd"
                    type="text"
                    placeholder="079XXXXXXXXX"
                    value={ownerCccd}
                    onChange={e => setOwnerCccd(e.target.value)}
                    className={`${INPUT_NORMAL} font-mono`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="household-field-owner-birthyear"
                      className="font-bold text-slate-700 block"
                    >
                      Năm sinh
                    </label>
                    <input
                      id="household-field-owner-birthyear"
                      type="number"
                      placeholder="1980"
                      value={ownerBirthYear}
                      onChange={e => setOwnerBirthYear(e.target.value)}
                      className={INPUT_NORMAL}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="household-field-owner-phone"
                      className="font-bold text-slate-700 block"
                    >
                      Số ĐT
                    </label>
                    <input
                      id="household-field-owner-phone"
                      type="text"
                      placeholder="09..."
                      value={ownerPhone}
                      onChange={e => setOwnerPhone(e.target.value)}
                      className={`${INPUT_NORMAL} font-mono`}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="household-field-owner" className="font-bold text-slate-700 block">
                  Chủ hộ đại diện <span className="text-rose-600">*</span>
                </label>
                {existingHousehold && existingHousehold.members.length > 0 ? (
                  <select
                    id="household-field-owner"
                    value={newOwner}
                    onChange={e => setNewOwner(e.target.value)}
                    aria-invalid={getErrorFor("household-field-owner") ? "true" : "false"}
                    className={getErrorFor("household-field-owner") ? INPUT_ERROR : INPUT_NORMAL}
                  >
                    {existingHousehold.members.map(m => (
                      <option key={`${m.cccd}-${m.name}`} value={m.name}>
                        {m.name} ({m.relation})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="household-field-owner"
                    type="text"
                    value={newOwner}
                    onChange={e => setNewOwner(e.target.value)}
                    aria-invalid={getErrorFor("household-field-owner") ? "true" : "false"}
                    className={getErrorFor("household-field-owner") ? INPUT_ERROR : INPUT_NORMAL}
                  />
                )}
                {getErrorFor("household-field-owner") && (
                  <p
                    id="household-field-owner-error"
                    className="text-xs font-semibold text-rose-700 flex items-center gap-1"
                  >
                    <AlertCircle size={12} /> {getErrorFor("household-field-owner")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="household-field-type" className="font-bold text-slate-700 block">
                  Phân hệ cư trú
                </label>
                <select
                  id="household-field-type"
                  value={newHType}
                  onChange={e => setNewHType(e.target.value as "Thường trú" | "Tạm trú")}
                  className={INPUT_NORMAL}
                >
                  <option value="Thường trú">Thường trú</option>
                  <option value="Tạm trú">Tạm trú</option>
                </select>
              </div>
            </div>
          )}

          {/* Address */}
          <div className="space-y-1.5">
            <label htmlFor="household-field-address" className="font-bold text-slate-700 block">
              {mode === "edit" ? "Địa chỉ cư trú" : "Địa chỉ Đăng ký Thường trú"}{" "}
              <span className="text-rose-600">*</span>
            </label>
            <input
              id="household-field-address"
              type="text"
              placeholder="Số..., đường Lương Định Của, Phường An Phú"
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              aria-invalid={getErrorFor("household-field-address") ? "true" : "false"}
              aria-describedby={
                getErrorFor("household-field-address") ? "household-field-address-error" : undefined
              }
              className={getErrorFor("household-field-address") ? INPUT_ERROR : INPUT_NORMAL}
            />
            {getErrorFor("household-field-address") && (
              <p
                id="household-field-address-error"
                className="text-xs font-semibold text-rose-700 flex items-center gap-1"
              >
                <AlertCircle size={12} /> {getErrorFor("household-field-address")}
              </p>
            )}
          </div>

          {/* Coordinates */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <label htmlFor="household-field-coords" className="font-bold text-slate-700">
                Tọa độ GPS vệ tinh WGS84 (Vĩ độ, Kinh độ)
              </label>
              <button
                type="button"
                onClick={() => {
                  const auto = generateDefaultCoordinatesForAddress(
                    newAddress || existingHousehold?.address || "Lương Định Của",
                    newHCode || existingHousehold?.code || "HK"
                  );
                  setCoordInput(auto.dms);
                }}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={12} className="text-emerald-600" />
                <span>Tự động nhận diện từ địa chỉ</span>
              </button>
            </div>
            <input
              id="household-field-coords"
              type="text"
              placeholder="Ví dụ: 10.936828, 106.743392"
              value={coordInput}
              onChange={e => setCoordInput(e.target.value)}
              className={`${INPUT_NORMAL} font-mono`}
            />
            {parsedGPS && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-mono">
                ✓ Phát hiện hệ WGS84: Vĩ độ <strong>{parsedGPS.lat}</strong>, Kinh độ{" "}
                <strong>{parsedGPS.lng}</strong>
              </div>
            )}
          </div>

          {/* Notes in Edit mode */}
          {mode === "edit" && (
            <div className="space-y-1.5">
              <label htmlFor="household-field-notes" className="font-bold text-slate-700 block">
                Ghi chú biến động / Nguyên nhân thay đổi
              </label>
              <textarea
                id="household-field-notes"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Nhập ghi chú biến động lưu trữ..."
                rows={3}
                className={INPUT_NORMAL}
              />
            </div>
          )}

          {/* Sub-members registration in Create mode */}
          {mode === "create" && (
            <div className="p-4 sm:p-5 border border-slate-200/80 rounded-2xl bg-slate-50/70 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus size={14} className="text-emerald-600" />
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Đăng ký thêm thành viên hộ (tùy chọn)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <input
                  type="text"
                  placeholder="Tên thành viên"
                  aria-label="Tên thành viên mới"
                  value={newMemberName}
                  onChange={e => {
                    setNewMemberName(e.target.value);
                    setTempMemberError(null);
                  }}
                  className={INPUT_NORMAL}
                />
                <input
                  type="text"
                  placeholder="Số CCCD"
                  aria-label="Số CCCD thành viên mới"
                  value={newMemberCccd}
                  onChange={e => {
                    setNewMemberCccd(e.target.value);
                    setTempMemberError(null);
                  }}
                  className={`${INPUT_NORMAL} font-mono`}
                />
                <select
                  aria-label="Quan hệ với chủ hộ"
                  value={newMemberRelation}
                  onChange={e => setNewMemberRelation(e.target.value)}
                  className={INPUT_NORMAL}
                >
                  <option value="Vợ">Vợ</option>
                  <option value="Chồng">Chồng</option>
                  <option value="Con trai">Con trai</option>
                  <option value="Con gái">Con gái</option>
                  <option value="Bố">Bố</option>
                  <option value="Mẹ">Mẹ</option>
                  <option value="Anh/Em trai">Anh/Em trai</option>
                  <option value="Khác">Khác</option>
                </select>
                <input
                  type="number"
                  placeholder="Năm sinh"
                  aria-label="Năm sinh thành viên mới"
                  value={newMemberBirthYear}
                  onChange={e => {
                    setNewMemberBirthYear(e.target.value);
                    setTempMemberError(null);
                  }}
                  className={INPUT_NORMAL}
                />
                <input
                  type="text"
                  placeholder="Số ĐT"
                  aria-label="Số điện thoại thành viên mới"
                  value={newMemberPhone}
                  onChange={e => setNewMemberPhone(e.target.value)}
                  className={`${INPUT_NORMAL} font-mono`}
                />
              </div>

              {tempMemberError && (
                <p role="alert" className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <AlertCircle size={12} /> {tempMemberError}
                </p>
              )}

              <button
                type="button"
                onClick={handleAddTempMember}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                <Plus size={13} />
                <span>Thêm thành viên vào danh sách tạm</span>
              </button>

              {tempMembers.length > 0 && (
                <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">
                    Danh sách đăng ký tạm ({tempMembers.length})
                  </span>
                  <div className="space-y-1.5">
                    {tempMembers.map((m, idx) => (
                      <div
                        key={`${m.cccd}-${idx}`}
                        className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex justify-between items-center font-mono text-xs"
                      >
                        <span>
                          <strong className="font-sans text-slate-900">{m.name}</strong> ({m.relation}) • {m.cccd} • Sinh {m.birthYear}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTempMembers(prev => prev.filter((_, i) => i !== idx))
                          }
                          className="text-rose-600 hover:text-rose-800 font-sans font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-end gap-2.5">
          <button
            type="button"
            id="btn-cancel-household-form"
            onClick={handleBack}
            className="px-4 py-2 border border-slate-300 bg-white rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            id="btn-submit-household-form"
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
          >
            <Save size={14} />
            <span>{mode === "edit" ? "Lưu thay đổi" : "Lập Sổ Hộ Khẩu"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
