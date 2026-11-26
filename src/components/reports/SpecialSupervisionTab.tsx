import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileSpreadsheet,
  HeartHandshake,
  Lock,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus,
  X,
} from "lucide-react";
import { Resident } from "../../types";
import { loadPortalSetting, savePortalSetting } from "../../utils/supabaseSync";
import { recordAuditLog } from "../../utils/auditLogger";
import { getStaffAuthHeaders } from "../../utils/imageUpload";
import {
  SUPERVISION_CATEGORIES,
  SpecialSupervisionRecord,
  SupervisionCategoryId,
  SupervisionCheckinLog,
  SupervisionGroupKey,
  SupervisionRecordStatus,
  computeDaysUntilEnd,
  getSupervisionCategoryMeta,
  maskCccdNumber,
  maskPersonName,
  matchesSmartResidentSearch,
  resolveLiveSupervisionRecord,
} from "../../utils/specialSupervisionUtils";

const SUPERVISION_STORAGE_KEY = "kp3_special_supervision_v1";

interface SpecialSupervisionTabProps {
  residents?: Resident[];
  onOpenResidentDetail?: (residentId: string) => void;
  currentUser?: {
    username?: string;
    fullName?: string;
    role?: string;
    title?: string;
  } | null;
}

const CHECKIN_TYPE_LABELS: Record<
  SupervisionCheckinLog["type"],
  { label: string; color: string }
> = {
  trinh_dien: { label: "Trình diện định kỳ", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  tiep_xuc_cam_hoa: { label: "Tiếp xúc cảm hóa / Hỗ trợ", color: "bg-blue-50 text-blue-800 border-blue-200" },
  test_nhanh_am_tinh: { label: "Xét nghiệm nhanh: Âm tính", color: "bg-teal-50 text-teal-800 border-teal-200" },
  test_nhanh_duong_tinh: { label: "Xét nghiệm nhanh: Dương tính", color: "bg-rose-50 text-rose-800 border-rose-200" },
  vang_mat_luu_y: { label: "Vắng mặt / Cần lưu ý", color: "bg-amber-50 text-amber-800 border-amber-200" },
};

const STATUS_META: Record<SupervisionRecordStatus, { label: string; cls: string }> = {
  active: { label: "Đang quản lý", cls: "bg-blue-50 text-blue-800 border-blue-200" },
  warning_absent: { label: "Cần lưu ý / Vắng mặt", cls: "bg-rose-50 text-rose-800 border-rose-200" },
  completed: { label: "Đã hoàn thành quản lý", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  expunged: { label: "Đã xóa án tích / Kết thúc", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

export const SpecialSupervisionTab: React.FC<SpecialSupervisionTabProps> = ({
  residents = [],
  onOpenResidentDetail,
  currentUser,
}) => {
  const actorName = currentUser?.fullName || "Bí thư / Cán bộ ANTT KP3";

  const [records, setRecords] = useState<SpecialSupervisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | SupervisionGroupKey>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SupervisionRecordStatus>("all");

  // Create / Edit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [residentQuery, setResidentQuery] = useState("");
  const [formResidentId, setFormResidentId] = useState<string | undefined>(undefined);
  const [formFullName, setFormFullName] = useState("");
  const [formBirthYear, setFormBirthYear] = useState("");
  const [formCccd, setFormCccd] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formResidenceType, setFormResidenceType] = useState("Thường trú");
  const [formCategories, setFormCategories] = useState<SupervisionCategoryId[]>(["an_treo"]);
  const [formDecisionNumber, setFormDecisionNumber] = useState("");
  const [formIssuingAuthority, setFormIssuingAuthority] = useState("TAND / Công an Phường An Phú");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState("");
  const [formAssignedOfficer, setFormAssignedOfficer] = useState(
    "Đại úy Trần Quốc Hải (CSKV) & Tổ ANTT KP3"
  );
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Detail & Check-in Modal
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [checkinType, setCheckinType] = useState<SupervisionCheckinLog["type"]>("trinh_dien");
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkinNote, setCheckinNote] = useState("");
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const saved = await loadPortalSetting<SpecialSupervisionRecord[]>(
          SUPERVISION_STORAGE_KEY
        );
        if (active && Array.isArray(saved)) {
          setRecords(saved);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((prev) => (prev === msg ? null : prev)), 5000);
  };

  const persistRecords = async (next: SpecialSupervisionRecord[]) => {
    setRecords(next);
    await savePortalSetting(SUPERVISION_STORAGE_KEY, next, false);
  };

  const handleToggleUnlock = () => {
    const next = !isUnlocked;
    setIsUnlocked(next);
    if (next) {
      recordAuditLog({
        actorName,
        actorRole: currentUser?.role || "admin",
        category: "PII_ACCESS",
        actionTitle: "Mở khóa xem hồ sơ Đối tượng Đặc thù (NĐ 13/2023)",
        targetSummary: `Mở chế độ hiển thị rõ danh tính cho ${records.length} hồ sơ nội bộ.`,
      });
    }
  };

  const residentsById = useMemo(() => {
    const map = new Map<string, Resident>();
    for (const r of residents) {
      map.set(r.id, r);
    }
    return map;
  }, [residents]);

  const liveRecords = useMemo(
    () => records.map((rec) => resolveLiveSupervisionRecord(rec, residentsById)),
    [records, residentsById]
  );

  const matchedResidents = useMemo(() => {
    const q = residentQuery.trim();
    if (q.length < 2) return [];
    return residents
      .filter((r) =>
        matchesSmartResidentSearch(q, [
          r.fullName,
          r.cccd,
          r.phone,
          r.currentAddress,
          r.permanentAddress,
          r.address,
          r.householdId,
        ])
      )
      .slice(0, 8);
  }, [residentQuery, residents]);

  const handlePickResident = (r: Resident) => {
    setFormResidentId(r.id);
    setFormFullName(r.fullName || "");
    const dobYear = String(r.birthDate || "").match(/(19|20)\d{2}/)?.[0] || "";
    setFormBirthYear(dobYear);
    setFormCccd(r.cccd || "");
    setFormPhone(r.phone || "");
    setFormAddress(r.currentAddress || r.permanentAddress || r.address || "");
    setFormResidenceType(r.status || "Thường trú");
    setResidentQuery("");
  };

  const toggleCategory = (catId: SupervisionCategoryId) => {
    setFormCategories((prev) =>
      prev.includes(catId)
        ? prev.length > 1
          ? prev.filter((c) => c !== catId)
          : prev
        : [...prev, catId]
    );
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formAddress.trim()) {
      flashNotice("Vui lòng nhập đầy đủ Họ tên và Địa chỉ cư trú.");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const newRec: SpecialSupervisionRecord = {
        id: `ANTT-QL-${Date.now().toString().slice(-6)}`,
        residentId: formResidentId,
        fullName: formFullName.trim(),
        birthYear: formBirthYear.trim() || undefined,
        cccd: formCccd.trim() || undefined,
        phone: formPhone.trim() || undefined,
        address: formAddress.trim(),
        residenceType: formResidenceType,
        categories: formCategories,
        decisionNumber: formDecisionNumber.trim() || undefined,
        issuingAuthority: formIssuingAuthority.trim() || undefined,
        startDateIso: formStartDate,
        endDateIso: formEndDate || undefined,
        assignedOfficer: formAssignedOfficer.trim() || "CSKV & Tổ ANTT KP3",
        status: "active",
        reintegration: {
          cccdAndResidency: false,
          jobReferral: false,
          policyLoan: false,
          legalCounseling: false,
        },
        checkins: [
          {
            id: `chk_${Date.now()}`,
            dateIso: formStartDate,
            type: "tiep_xuc_cam_hoa",
            note: "Khởi tạo hồ sơ phối hợp quản lý, giáo dục, cảm hóa tại Khu phố 3.",
            recordedBy: actorName,
          },
        ],
        notes: formNotes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        updatedBy: actorName,
      };
      await persistRecords([newRec, ...records]);
      recordAuditLog({
        actorName,
        actorRole: currentUser?.role || "admin",
        category: "RESIDENT_CRUD",
        actionTitle: "Thêm hồ sơ Quản lý Đối tượng Đặc thù",
        targetSummary: `Khởi tạo hồ sơ ${newRec.id} (${formCategories.join(", ")})`,
      });
      setShowCreateModal(false);
      setFormResidentId(undefined);
      setFormFullName("");
      setFormBirthYear("");
      setFormCccd("");
      setFormPhone("");
      setFormAddress("");
      setFormDecisionNumber("");
      setFormEndDate("");
      setFormNotes("");
      flashNotice(`Đã lưu hồ sơ bảo mật [${newRec.id}] lên Supabase Cloud!`);
    } finally {
      setSaving(false);
    }
  };

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  const handleAddCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !checkinNote.trim()) return;
    const newLog: SupervisionCheckinLog = {
      id: `chk_${Date.now()}`,
      dateIso: checkinDate,
      type: checkinType,
      note: checkinNote.trim(),
      recordedBy: actorName,
    };
    const nextStatus: SupervisionRecordStatus =
      checkinType === "vang_mat_luu_y" || checkinType === "test_nhanh_duong_tinh"
        ? "warning_absent"
        : selectedRecord.status;
    const next = records.map((r) =>
      r.id === selectedRecord.id
        ? {
            ...r,
            status: nextStatus,
            checkins: [newLog, ...(r.checkins || [])],
            updatedAt: new Date().toISOString(),
            updatedBy: actorName,
          }
        : r
    );
    await persistRecords(next);
    setCheckinNote("");
    flashNotice("Đã ghi nhận nhật ký tiếp xúc / trình diện vào hồ sơ bảo mật.");
  };

  const handleUpdateStatus = async (recId: string, status: SupervisionRecordStatus) => {
    const next = records.map((r) =>
      r.id === recId
        ? { ...r, status, updatedAt: new Date().toISOString(), updatedBy: actorName }
        : r
    );
    await persistRecords(next);
    recordAuditLog({
      actorName,
      actorRole: currentUser?.role || "admin",
      category: "RESIDENT_CRUD",
      actionTitle: "Cập nhật trạng thái hồ sơ Đối tượng Đặc thù",
      targetSummary: `Hồ sơ ${recId} -> ${STATUS_META[status].label}`,
    });
    flashNotice(`Đã cập nhật trạng thái hồ sơ thành "${STATUS_META[status].label}".`);
  };

  const handleToggleReintegration = async (
    recId: string,
    field: keyof SpecialSupervisionRecord["reintegration"]
  ) => {
    const next = records.map((r) =>
      r.id === recId
        ? {
            ...r,
            reintegration: {
              ...r.reintegration,
              [field]: !r.reintegration[field],
            },
            updatedAt: new Date().toISOString(),
            updatedBy: actorName,
          }
        : r
    );
    await persistRecords(next);
  };

  const handleDeleteRecord = async (recId: string) => {
    const next = records.filter((r) => r.id !== recId);
    await persistRecords(next);
    if (selectedRecordId === recId) setSelectedRecordId(null);
    recordAuditLog({
      actorName,
      actorRole: currentUser?.role || "admin",
      category: "RESIDENT_CRUD",
      actionTitle: "Xóa hồ sơ Đối tượng Đặc thù",
      targetSummary: `Đã xóa hồ sơ ${recId}`,
    });
    flashNotice(`Đã xóa hồ sơ [${recId}].`);
  };

  const handleAlertCskvZalo = async (rec: SpecialSupervisionRecord) => {
    try {
      setSendingAlert(true);
      const authHeaders = await getStaffAuthHeaders();
      const catNames = rec.categories
        .map((c) => getSupervisionCategoryMeta(c).shortLabel)
        .join(", ");
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "send_patrol_urgent_alert",
          teamMembers: `Nội bộ ANTT (${actorName})`,
          shiftLabel: `Cảnh báo phối hợp CSKV [${rec.id}]`,
          routeArea: rec.address,
          result: STATUS_META[rec.status].label,
          note: `Hồ sơ ${rec.id} (${maskPersonName(rec.fullName)}, diện: ${catNames}) cần CSKV & Tổ ANTT kiểm tra, nắm tình hình địa bàn.`,
        }),
      });
      const json = await res.json();
      if (json?.ok) {
        flashNotice(
          `Đã gửi cảnh báo nội bộ qua Zalo OA tới ${json.sentCount || 0} cán bộ Thường trực & CSKV.`
        );
      }
    } catch {
      flashNotice("Không gửi được cảnh báo Zalo OA lúc này.");
    } finally {
      setSendingAlert(false);
    }
  };

  const handleExportExcel = () => {
    const detailRows = filteredRecords.map((r, idx) => {
      const daysLeft = computeDaysUntilEnd(r.endDateIso);
      return {
        STT: idx + 1,
        "Mã hồ sơ": r.id,
        "Họ và tên": isUnlocked ? r.fullName : maskPersonName(r.fullName),
        "Năm sinh": r.birthYear || "",
        CCCD: isUnlocked ? r.cccd || "" : maskCccdNumber(r.cccd),
        "Cư trú": r.residenceType || "",
        "Địa chỉ": r.address,
        "Diện quản lý": r.categories
          .map((c) => getSupervisionCategoryMeta(c).shortLabel)
          .join("; "),
        "Số QĐ / Bản án": r.decisionNumber || "",
        "Từ ngày": r.startDateIso,
        "Đến ngày": r.endDateIso || "",
        "Còn lại (ngày)": daysLeft ?? "",
        "Trạng thái": STATUS_META[r.status].label,
        "Cán bộ phụ trách": r.assignedOfficer,
        "Lượt tiếp xúc": r.checkins?.length || 0,
      };
    });

    const summaryRows = SUPERVISION_CATEGORIES.map((cat) => ({
      "Nhóm pháp lý": cat.groupLabel,
      "Diện quản lý": cat.label,
      "Căn cứ pháp lý": cat.legalBasis,
      "Đang quản lý": records.filter(
        (r) =>
          (r.status === "active" || r.status === "warning_absent") &&
          r.categories.includes(cat.id)
      ).length,
      "Đã hoàn thành / Xóa án tích": records.filter(
        (r) =>
          (r.status === "completed" || r.status === "expunged") &&
          r.categories.includes(cat.id)
      ).length,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "DanhSach_QL_DacThu");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "TongHop_TheoDien");
    XLSX.writeFile(
      wb,
      `KP3_AnPhu_QL_DoiTuong_ANTT_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    recordAuditLog({
      actorName,
      actorRole: currentUser?.role || "admin",
      category: "DATA_EXPORT",
      actionTitle: "Xuất Excel danh sách Đối tượng Đặc thù",
      targetSummary: `Xuất ${detailRows.length} hồ sơ (Chế độ: ${isUnlocked ? "Hiện đầy đủ" : "Che danh tính"}).`,
    });
    flashNotice("Đã xuất file Excel 2 sheet (kèm ghi Nhật ký kiểm toán bảo mật)!");
  };

  const stats = useMemo(() => {
    const activeList = records.filter(
      (r) => r.status === "active" || r.status === "warning_absent"
    );
    const criminal = activeList.filter((r) =>
      r.categories.some((c) => {
        const g = getSupervisionCategoryMeta(c).group;
        return g === "thi_hanh_an" || g === "tai_hoa_nhap";
      })
    ).length;
    const drug = activeList.filter((r) =>
      r.categories.some(
        (c) => getSupervisionCategoryMeta(c).group === "phong_chong_ma_tuy"
      )
    ).length;
    const expiring30 = activeList.filter((r) => {
      const d = computeDaysUntilEnd(r.endDateIso);
      return d !== null && d <= 30;
    }).length;
    return {
      totalActive: activeList.length,
      criminal,
      drug,
      expiring30,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return liveRecords.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (
        groupFilter !== "all" &&
        !r.categories.some((c) => getSupervisionCategoryMeta(c).group === groupFilter)
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        if (
          !matchesSmartResidentSearch(searchTerm, [
            r.id,
            r.fullName,
            r.cccd,
            r.phone,
            r.address,
            r.decisionNumber,
            r.assignedOfficer,
          ])
        ) {
          return false;
        }
      }
      return true;
    });
  }, [liveRecords, statusFilter, groupFilter, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Security Compliance Banner (Nghị định 13/2023/NĐ-CP) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                Quản lý Đối tượng Đặc thù &amp; Tái hòa nhập Cộng đồng (Nội bộ ANTT)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-400/30">
                Mật • NĐ 13/2023/NĐ-CP
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Chỉ mở cho Bí thư Chi bộ / Quản trị viên &amp; Công an khu vực (CSKV). Dữ liệu tách riêng khỏi Cổng Cư dân, tự động ghi Audit Log khi mở khóa hoặc xuất tệp.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleUnlock}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              isUnlocked
                ? "bg-amber-400 hover:bg-amber-300 text-slate-950"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
          >
            {isUnlocked ? <Unlock size={13} /> : <Eye size={13} />}
            <span>{isUnlocked ? "Đang hiện rõ (Bấm để che)" : "Mở khóa xem chi tiết"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={13} className="text-emerald-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Thêm hồ sơ quản lý</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="text-[11px] font-bold uppercase text-slate-500">Đang phối hợp quản lý</div>
          <div className="mt-1 text-2xl font-black text-slate-900 font-mono">{stats.totalActive}</div>
          <div className="text-[11px] text-slate-500">Tổng hồ sơ lưu trữ: {records.length}</div>
        </div>
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5">
          <div className="text-[11px] font-bold uppercase text-rose-800">Án treo • Cấm đi khỏi nơi CT • Đặc xá</div>
          <div className="mt-1 text-2xl font-black text-rose-900 font-mono">{stats.criminal}</div>
          <div className="text-[11px] text-rose-700">Luật THAHS &amp; NĐ 49/2020</div>
        </div>
        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5">
          <div className="text-[11px] font-bold uppercase text-purple-800">Sử dụng MT • Sau cai nghiện</div>
          <div className="mt-1 text-2xl font-black text-purple-900 font-mono">{stats.drug}</div>
          <div className="text-[11px] text-purple-700">Luật Phòng, chống ma túy 2021</div>
        </div>
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
          <div className="text-[11px] font-bold uppercase text-amber-800">Sắp hết hạn quản lý (≤ 30n)</div>
          <div className="mt-1 text-2xl font-black text-amber-900 font-mono">{stats.expiring30}</div>
          <div className="text-[11px] text-amber-700">Cần phối hợp CSKV rà soát</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã hồ sơ, CCCD, địa chỉ, số QĐ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              { id: "all", label: "Tất cả diện" },
              { id: "thi_hanh_an", label: "Thi hành án / Án treo" },
              { id: "tai_hoa_nhap", label: "Tha tù / Đặc xá" },
              { id: "phong_chong_ma_tuy", label: "Ma túy / Sau cai" },
              { id: "hanh_chinh", label: "Giáo dục tại phường" },
            ] as const
          ).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupFilter(g.id)}
              className={`h-8 px-2.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                groupFilter === g.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {g.label}
            </button>
          ))}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang quản lý</option>
            <option value="warning_absent">Cần lưu ý / Vắng mặt</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="expunged">Đã xóa án tích</option>
          </select>
        </div>
      </div>

      {/* Records List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
          Đang tải kho dữ liệu nội bộ ANTT...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
            <ShieldCheck size={22} />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900">
            Chưa có hồ sơ đối tượng đặc thù nào trong danh sách
          </h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Bấm <strong>&quot;Thêm hồ sơ quản lý&quot;</strong> để liên kết trực tiếp từ 11.229 nhân khẩu Khu phố 3 (Thường trú &amp; Tạm trú nhà trọ), chọn 10 diện pháp lý chuẩn (Án treo, Cấm đi khỏi nơi cư trú, Sau cai nghiện, Đặc xá...) và theo dõi lịch trình diện cùng CSKV.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-2 h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Tạo hồ sơ đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRecords.map((rec) => {
            const daysLeft = computeDaysUntilEnd(rec.endDateIso);
            const displayName = isUnlocked ? rec.fullName : maskPersonName(rec.fullName);
            const displayCccd = isUnlocked ? rec.cccd || "Chưa cập nhật" : maskCccdNumber(rec.cccd);
            const stMeta = STATUS_META[rec.status];

            return (
              <div
                key={rec.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 transition-colors space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {rec.id}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {displayName}
                        {rec.birthYear ? ` (${rec.birthYear})` : ""}
                      </h4>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${stMeta.cls}`}
                      >
                        {stMeta.label}
                      </span>
                      {rec.isLinkedToResidentDb && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ Trích từ CSDL Dân cư
                        </span>
                      )}
                      {daysLeft !== null && rec.status === "active" && (
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            daysLeft < 0
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : daysLeft <= 30
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {daysLeft < 0
                            ? `Quá hạn ${Math.abs(daysLeft)} ngày`
                            : `Còn ${daysLeft} ngày`}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {rec.categories.map((catId) => {
                        const meta = getSupervisionCategoryMeta(catId);
                        return (
                          <span
                            key={catId}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${meta.badgeColor}`}
                          >
                            {meta.shortLabel}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>CCCD: <strong className="font-mono">{displayCccd}</strong></span>
                      <span>•</span>
                      <span>Địa chỉ: <strong className="text-slate-800">{isUnlocked ? rec.address : "Đã che (bấm Mở khóa để xem)"}</strong></span>
                      {rec.decisionNumber && (
                        <>
                          <span>•</span>
                          <span>Số QĐ: <strong className="font-mono">{rec.decisionNumber}</strong></span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>Phụ trách: <strong className="text-slate-700">{rec.assignedOfficer}</strong></span>
                      <span>•</span>
                      <span>
                        Thời hạn: <strong>{rec.startDateIso}</strong> →{" "}
                        <strong>{rec.endDateIso || "Chưa xác định"}</strong>
                      </span>
                      <span>•</span>
                      <span>Nhật ký tiếp xúc: <strong>{rec.checkins?.length || 0} lượt</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {rec.residentId && onOpenResidentDetail && (
                      <button
                        type="button"
                        onClick={() => onOpenResidentDetail(rec.residentId!)}
                        className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="Mở hồ sơ nhân khẩu gốc trong CSDL Dân cư KP3"
                      >
                        <Eye size={12} />
                        <span>Hồ sơ dân cư</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedRecordId(rec.id)}
                      className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardCheck size={13} />
                      <span>Nhật ký &amp; Tái hòa nhập</span>
                    </button>
                    <button
                      type="button"
                      disabled={sendingAlert}
                      onClick={() => void handleAlertCskvZalo(rec)}
                      className="h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      title="Đẩy thông báo phối hợp nhanh qua Zalo OA cho CSKV & Thường trực"
                    >
                      <Send size={12} />
                      <span>Báo CSKV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteRecord(rec.id)}
                      className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-700 inline-flex items-center justify-center cursor-pointer"
                      title="Xóa hồ sơ"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-amber-600" />
                  Thêm Hồ sơ Quản lý Đối tượng Đặc thù (Nội bộ ANTT)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu bảo mật nội bộ (`is_public = false`), tách biệt khỏi danh sách dân cư công khai.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-5 space-y-4">
              {/* Quick Link from 11.229 KP3 Residents */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <label className="block text-xs font-bold text-blue-900">
                  Liên kết nhanh từ CSDL 11.229 nhân khẩu Khu phố 3 (không bắt buộc):
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-blue-500" />
                  <input
                    type="text"
                    placeholder="Gõ họ tên, CCCD hoặc địa chỉ nhà trọ để tự điền..."
                    value={residentQuery}
                    onChange={(e) => setResidentQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-blue-200 text-xs text-slate-900"
                  />
                </div>
                {matchedResidents.length > 0 && (
                  <div className="bg-white border border-blue-200 rounded-lg divide-y divide-slate-100 max-h-44 overflow-y-auto">
                    {matchedResidents.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handlePickResident(r)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {r.fullName} ({r.birthDate || "?"})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {r.status} • {r.currentAddress || r.permanentAddress || r.address}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-blue-700 shrink-0">
                          {maskCccdNumber(r.cccd)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Năm sinh</label>
                  <input
                    type="text"
                    placeholder="VD: 1995"
                    value={formBirthYear}
                    onChange={(e) => setFormBirthYear(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số CCCD</label>
                  <input
                    type="text"
                    value={formCccd}
                    onChange={(e) => setFormCccd(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SĐT liên hệ</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại cư trú</label>
                  <select
                    value={formResidenceType}
                    onChange={(e) => setFormResidenceType(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                  >
                    <option value="Thường trú">Thường trú (CT01)</option>
                    <option value="Tạm trú">Tạm trú (CT08 / Nhà trọ)</option>
                    <option value="Lưu trú khác">Lưu trú khác</option>
                  </select>
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">
                  Địa chỉ cư trú / Nhà trọ tại Khu phố 3 *
                </label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              {/* 10 Legal Categories Multi-select */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Diện quản lý theo quy định pháp luật (có thể chọn nhiều diện đồng thời) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUPERVISION_CATEGORIES.map((cat) => {
                    const checked = formCategories.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(cat.id)}
                          className="mt-0.5 accent-emerald-500"
                        />
                        <div>
                          <div className="font-bold">{cat.label}</div>
                          <div className={`text-[10px] ${checked ? "text-slate-300" : "text-slate-500"}`}>
                            {cat.legalBasis}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Bản án / Quyết định</label>
                  <input
                    type="text"
                    placeholder="VD: 125/2026/QĐ-THAHS"
                    value={formDecisionNumber}
                    onChange={(e) => setFormDecisionNumber(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cơ quan ban hành</label>
                  <input
                    type="text"
                    value={formIssuingAuthority}
                    onChange={(e) => setFormIssuingAuthority(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu quản lý *</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày hết hạn quản lý (dự kiến)</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">
                  Cán bộ CSKV / Tổ ANTT phân công theo dõi, cảm hóa
                </label>
                <input
                  type="text"
                  value={formAssignedOfficer}
                  onChange={(e) => setFormAssignedOfficer(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">Ghi chú phối hợp</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu hồ sơ bảo mật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL / CHECK-IN & REINTEGRATION MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Hồ sơ {selectedRecord.id} •{" "}
                  {isUnlocked ? selectedRecord.fullName : maskPersonName(selectedRecord.fullName)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật trạng thái, hỗ trợ tái hòa nhập (NĐ 49/2020) &amp; nhật ký trình diện định kỳ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordId(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Status Switcher */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-slate-600">
                  Trạng thái quản lý (Tự xóa cảnh báo khi hoàn thành / xóa án tích):
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_META) as SupervisionRecordStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => void handleUpdateStatus(selectedRecord.id, st)}
                      className={`h-8 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                        selectedRecord.status === st
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {STATUS_META[st].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reintegration Support (Nghị định 49/2020) */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2.5">
                <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <HeartHandshake size={15} />
                  Hỗ trợ Tái hòa nhập Cộng đồng (Nghị định 49/2020/NĐ-CP)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      { key: "cccdAndResidency", label: "Hỗ trợ cấp CCCD & đăng ký cư trú" },
                      { key: "jobReferral", label: "Giới thiệu học nghề / việc làm" },
                      { key: "policyLoan", label: "Hỗ trợ vay vốn tín dụng chính sách (NHCSXH)" },
                      { key: "legalCounseling", label: "Tư vấn tâm lý, trợ giúp pháp lý" },
                    ] as const
                  ).map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 bg-white border border-emerald-200/80 rounded-lg px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selectedRecord.reintegration?.[item.key])}
                        onChange={() =>
                          void handleToggleReintegration(selectedRecord.id, item.key)
                        }
                        className="accent-emerald-700"
                      />
                      <span className="font-semibold text-slate-800">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Add Check-in Log */}
              <form
                onSubmit={handleAddCheckin}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
              >
                <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-700" />
                  Ghi nhận Nhật ký Trình diện / Tiếp xúc / Xét nghiệm nhanh
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <select
                    value={checkinType}
                    onChange={(e) => setCheckinType(e.target.value as any)}
                    className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                  >
                    {(Object.keys(CHECKIN_TYPE_LABELS) as SupervisionCheckinLog["type"][]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {CHECKIN_TYPE_LABELS[k].label}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    type="date"
                    value={checkinDate}
                    onChange={(e) => setCheckinDate(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-300 bg-white font-mono text-slate-900"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nhập nhận xét tình hình chấp hành, thái độ, địa điểm gặp gỡ..."
                    value={checkinNote}
                    onChange={(e) => setCheckinNote(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                  />
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    Ghi nhận
                  </button>
                </div>
              </form>

              {/* Check-in History */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-slate-600">
                  Lịch sử theo dõi ({selectedRecord.checkins?.length || 0} lượt):
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(selectedRecord.checkins || []).map((c) => {
                    const meta = CHECKIN_TYPE_LABELS[c.type] || CHECKIN_TYPE_LABELS.trinh_dien;
                    return (
                      <div
                        key={c.id}
                        className="border border-slate-200 rounded-xl p-3 bg-white text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {c.dateIso} • {c.recordedBy}
                          </span>
                        </div>
                        <p className="text-slate-700">{c.note}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
