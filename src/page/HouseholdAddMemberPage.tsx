import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Home, ShieldAlert, UserPlus } from "lucide-react";
import { Household, Resident } from "../types";
import { extractKp3Area } from "../utils/kp3Utils";
import { DetailGrid, DetailRow } from "../components/common/DetailRow";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { ReportSelect } from "../components/reports/ReportSelect";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { ROUTES, navigate } from "../routes";

export interface HouseholdAddMemberPageProps {
  householdId: string;
  households: Household[];
  isDataLoading?: boolean;
  onUpdateHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
  onUpdateResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  onCancel?: () => void;
  onSaved?: (household: Household, addedMemberName: string) => void;
}

export default function HouseholdAddMemberPage({
  householdId,
  households,
  isDataLoading = false,
  onUpdateHouseholds,
  onUpdateResidents,
  onCancel,
  onSaved,
}: HouseholdAddMemberPageProps) {
  const targetHousehold = useMemo(
    () =>
      households.find(
        (h) => h.id === householdId || h.code === householdId
      ) || null,
    [households, householdId]
  );

  const [addMemName, setAddMemName] = useState("");
  const [addMemCccd, setAddMemCccd] = useState("");
  const [addMemRelation, setAddMemRelation] = useState("Con trai");
  const [addMemBirthYear, setAddMemBirthYear] = useState<number | "">("");
  const [addMemPhone, setAddMemPhone] = useState("");
  const [notice, setNotice] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  useEffect(() => {
    setNotice(null);
    setAddMemName("");
    setAddMemCccd("");
    setAddMemRelation("Con trai");
    setAddMemBirthYear("");
    setAddMemPhone("");
  }, [householdId]);

  const goBackToList = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
    }
  };

  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHousehold) {
      setNotice({
        message: "Không tìm thấy sổ hộ khẩu để nhập khẩu nhân khẩu mới.",
        type: "error",
      });
      return;
    }

    if (!addMemName.trim() || !addMemCccd.trim() || !addMemBirthYear) {
      setNotice({
        message: "Vui lòng nhập tên, CCCD và năm sinh!",
        type: "warning",
      });
      return;
    }

    const trimmedName = addMemName.trim();
    const trimmedCccd = addMemCccd.trim();
    const trimmedPhone = addMemPhone.trim();

    const newM = {
      name: trimmedName,
      relation: addMemRelation,
      cccd: trimmedCccd,
      birthYear: Number(addMemBirthYear),
      phone: trimmedPhone || undefined,
    };

    const audit = (targetHousehold as any).auditHistory || [];
    const newLog = {
      date: new Date().toLocaleString("vi-VN"),
      action: `Nhập khẩu thêm thành viên: ${trimmedName}`,
      actor: "Cán bộ Tư pháp",
    };

    const updatedHousehold: Household = {
      ...targetHousehold,
      members: [...targetHousehold.members, newM],
      memberCount: targetHousehold.members.length + 1,
      auditHistory: [newLog, ...audit],
    } as Household;

    const newR: Resident = {
      id: "R" + Math.floor(1000 + Math.random() * 9000),
      fullName: trimmedName,
      gender:
        addMemRelation === "Vợ" || addMemRelation === "Con gái" ? "Nữ" : "Nam",
      birthDate: `01/01/${addMemBirthYear}`,
      cccd: trimmedCccd,
      phone: trimmedPhone || "N/A",
      status: targetHousehold.type || "Thường trú",
      occupation: "Thành viên",
      address: targetHousehold.address,
      householdId: targetHousehold.code,
      relationToOwner: addMemRelation,
      joinDate: new Date().toLocaleDateString("vi-VN"),
    };

    onUpdateHouseholds((prev) =>
      prev.map((h) => (h.id === targetHousehold.id ? updatedHousehold : h))
    );
    onUpdateResidents((prev) => [...prev, newR]);

    if (onSaved) {
      onSaved(updatedHousehold, trimmedName);
    } else {
      navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
    }
  };

  if (!targetHousehold) {
    if (isDataLoading) {
      return (
        <LoadingFade
          variant="page"
          title="Đang tải thông tin sổ hộ khẩu..."
          subtitle={`Mã tham số: ${householdId || ""}`}
          className="max-w-4xl mx-auto my-2"
        />
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-4 max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Không tìm thấy sổ hộ khẩu
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Không tìm thấy sổ hộ khẩu với mã tham số{" "}
          <span className="font-mono font-semibold text-slate-800">
            {householdId || "(trống)"}
          </span>{" "}
          để thêm nhân khẩu.
        </p>
        <button
          type="button"
          onClick={goBackToList}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Quay lại Danh sách Hộ gia đình
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto theme-loading-fade">
      <PageHeader
        badgeText={`THÊM NHÂN KHẨU • SỔ HK: ${targetHousehold.code}`}
        badgeSubtext="ĐỀ ÁN 06/CP"
        title={`Thêm Nhân khẩu vào Hộ: ${targetHousehold.ownerName}`}
        description={`Đăng ký nhập khẩu thành viên mới vào Sổ ${targetHousehold.code} (${targetHousehold.address}).`}
        actions={
          <button
            type="button"
            id="btn-household-add-member-back"
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

      {/* Target Household Summary */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
          <Home size={15} className="text-emerald-700" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Thông tin Sổ Hộ Khẩu tiếp nhận
          </h3>
        </div>
        <DetailGrid hideEmpty compact>
          <DetailRow label="Mã sổ hộ khẩu" value={targetHousehold.code} isMono />
          <DetailRow label="Chủ hộ" value={targetHousehold.ownerName} />
          <DetailRow
            label="Loại cư trú"
            value={targetHousehold.type || "Thường trú"}
          />
          <DetailRow
            label="Khu vực KP3"
            value={extractKp3Area(targetHousehold.address)}
          />
          <DetailRow
            label="Nhân khẩu hiện có"
            value={`${targetHousehold.members.length} người`}
            isNumeric
          />
          <DetailRow
            label="Địa chỉ cư trú"
            value={targetHousehold.address}
            colSpan={2}
          />
        </DetailGrid>
      </div>

      {/* Add Member Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus className="text-emerald-600" size={18} />
            <span className="font-bold text-xs sm:text-sm text-slate-800">
              Biểu mẫu Thêm Nhân khẩu vào Hộ tịch
            </span>
          </div>
          <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
            Param household: {householdId}
          </span>
        </div>

        <form
          onSubmit={handleAddNewMember}
          className="p-5 sm:p-6 space-y-5 text-xs text-slate-700"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="add-mem-name"
              className="font-bold text-slate-700 block"
            >
              Họ và tên thành viên *
            </label>
            <input
              id="add-mem-name"
              type="text"
              required
              placeholder="Nguyễn Văn B"
              value={addMemName}
              onChange={(e) => setAddMemName(e.target.value)}
              className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="add-mem-cccd"
                className="font-bold text-slate-700 block"
              >
                Số CCCD gắn chip *
              </label>
              <input
                id="add-mem-cccd"
                type="text"
                required
                placeholder="079XXXXXXXXX"
                value={addMemCccd}
                onChange={(e) => setAddMemCccd(e.target.value)}
                className="w-full px-3 h-10 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="add-mem-year"
                className="font-bold text-slate-700 block"
              >
                Năm sinh *
              </label>
              <input
                id="add-mem-year"
                type="number"
                required
                placeholder="1995"
                value={addMemBirthYear}
                onChange={(e) =>
                  setAddMemBirthYear(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">
                Quan hệ với chủ hộ *
              </label>
              <ReportSelect
                aria-label="Quan hệ với chủ hộ"
                value={addMemRelation}
                onChange={setAddMemRelation}
                options={[
                  { value: "Vợ", label: "Vợ" },
                  { value: "Con trai", label: "Con trai" },
                  { value: "Con gái", label: "Con gái" },
                  { value: "Bố", label: "Bố" },
                  { value: "Mẹ", label: "Mẹ" },
                  { value: "Anh/Em trai", label: "Anh/Em trai" },
                  { value: "Khác", label: "Khác" },
                ]}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="add-mem-phone"
                className="font-bold text-slate-700 block"
              >
                Số điện thoại di động
              </label>
              <input
                id="add-mem-phone"
                type="text"
                placeholder="09XXXXXXXX"
                value={addMemPhone}
                onChange={(e) => setAddMemPhone(e.target.value)}
                className="w-full px-3 h-10 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={goBackToList}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer transition-colors"
            >
              Xác nhận Nhập khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

