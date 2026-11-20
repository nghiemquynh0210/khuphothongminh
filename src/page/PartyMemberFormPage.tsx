import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  FileCheck,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Association, AssociationMember, Resident } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { ReportSelect } from "../components/ui";
import {
  assignMemberRoleInAssociation,
  getAssociationRolePresets,
} from "../utils/leadershipSync";
import {
  DecisionAppointeeOcr,
  DecisionDocumentOcrResult,
  extractDecisionDocumentViaOcr,
} from "../utils/decisionDocumentOcr";
import { uploadFileToStorageBucket } from "../utils/imageUpload";
import {
  ROUTES,
  getPartyMemberDetailPath,
  navigate,
} from "../routes";

export const COMMON_MEMBER_ROLES = [
  "Chi hội trưởng",
  "Chi hội phó",
  "Ủy viên Ban Chấp Hành",
  "Tổ trưởng",
  "Tổ phó",
  "Hội viên nòng cốt",
  "Hội viên",
  "Thư ký",
  "Cán bộ kiêm nhiệm",
  "Cố vấn phong trào",
];

export interface PartyMemberFormPageProps {
  mode: "create" | "edit";
  cccd?: string;
  assocId?: string;
  associations: Association[];
  residents?: Resident[];
  isDataLoading?: boolean;
  basePath?: string;
  onAddMember?: (assocId: string, newMember: AssociationMember) => void;
  onUpdateMember?: (assocId: string, updatedMember: AssociationMember) => void;
  onUpdateAssociations?: (next: Association[]) => void;
  onCancel?: () => void;
  onSaved?: (savedMember: AssociationMember, assoc: Association, mode: "create" | "edit") => void;
}

export default function PartyMemberFormPage({
  mode,
  cccd,
  assocId,
  associations,
  residents = [],
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_PARTY,
  onAddMember,
  onUpdateMember,
  onUpdateAssociations,
  onCancel,
  onSaved,
}: PartyMemberFormPageProps) {
  const normalizedCccd = useMemo(() => {
    return cccd ? decodeURIComponent(cccd).trim() : "";
  }, [cccd]);

  const normalizedAssocId = useMemo(() => {
    return assocId ? decodeURIComponent(assocId).trim() : "";
  }, [assocId]);

  // Determine initial selected association
  const initialAssoc = useMemo(() => {
    if (normalizedAssocId) {
      const match = associations.find(
        (a) =>
          a.id === normalizedAssocId ||
          a.id.toLowerCase() === normalizedAssocId.toLowerCase()
      );
      if (match) return match;
    }
    if (normalizedCccd) {
      const match = associations.find((a) =>
        a.members?.some((m) => m.cccd === normalizedCccd)
      );
      if (match) return match;
    }
    return associations[0] || null;
  }, [associations, normalizedAssocId, normalizedCccd]);

  const [selectedAssocId, setSelectedAssocId] = useState<string>(
    initialAssoc?.id || associations[0]?.id || ""
  );

  const currentAssociation = useMemo(() => {
    return (
      associations.find((a) => a.id === selectedAssocId) ||
      associations[0] ||
      null
    );
  }, [associations, selectedAssocId]);

  // Locate existing member when in edit mode
  const existingMember = useMemo(() => {
    if (mode !== "edit" || !normalizedCccd) return null;
    if (currentAssociation) {
      const m = currentAssociation.members?.find((x) => x.cccd === normalizedCccd);
      if (m) return m;
    }
    for (const a of associations) {
      const m = a.members?.find((x) => x.cccd === normalizedCccd);
      if (m) return m;
    }
    return null;
  }, [mode, normalizedCccd, currentAssociation, associations]);

  // Form states
  const [memberFullName, setMemberFullName] = useState("");
  const [memberCccd, setMemberCccd] = useState("");
  const [memberRole, setMemberRole] = useState("Hội viên");
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberBirthDate, setMemberBirthDate] = useState("");
  const [memberJoinDate, setMemberJoinDate] = useState("");
  const [memberDecisionNumber, setMemberDecisionNumber] = useState("");
  const [memberDecisionDate, setMemberDecisionDate] = useState("");
  const [memberAvatar, setMemberAvatar] = useState("");
  const [decisionFile, setDecisionFile] = useState<AssociationMember["decisionFile"] | null>(null);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrResult, setOcrResult] = useState<DecisionDocumentOcrResult | null>(null);
  const ocrAppliedRef = useRef(false);

  // Resident search filter for create mode
  const [residentSearchQuery, setResidentSearchQuery] = useState("");
  const [showResidentSuggestions, setShowResidentSuggestions] = useState(false);

  // Notice & Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Initialize form fields
  const availableRoleOptions = useMemo(() => {
    const presetRoles = currentAssociation
      ? getAssociationRolePresets(currentAssociation).allSuggestedRoles
      : [];
    const seen = new Set<string>();
    const combined: string[] = [];
    for (const r of [...presetRoles, ...COMMON_MEMBER_ROLES]) {
      if (!seen.has(r)) {
        seen.add(r);
        combined.push(r);
      }
    }
    return combined;
  }, [currentAssociation]);

  useEffect(() => {
    if (ocrAppliedRef.current) {
      ocrAppliedRef.current = false;
      return;
    }
    if (mode === "edit" && existingMember) {
      setMemberFullName(existingMember.fullName || "");
      setMemberCccd(existingMember.cccd || "");
      if (availableRoleOptions.includes(existingMember.role)) {
        setMemberRole(existingMember.role);
        setCustomRoleInput("");
      } else {
        setMemberRole("custom");
        setCustomRoleInput(existingMember.role || "");
      }
      setMemberPhone(existingMember.phone || "");
      setMemberBirthDate(existingMember.birthDate || "");
      setMemberJoinDate(existingMember.joinDate || "");
      setMemberDecisionNumber(existingMember.decisionNumber || "");
      setMemberDecisionDate(existingMember.decisionDate || "");
      setMemberAvatar(existingMember.avatar || "");
      setDecisionFile(existingMember.decisionFile || null);
    } else if (mode === "create") {
      const defMemberRole = currentAssociation
        ? getAssociationRolePresets(currentAssociation).memberRoles[0] || "Hội viên"
        : "Hội viên";
      setMemberFullName("");
      setMemberCccd("");
      setMemberRole(defMemberRole);
      setCustomRoleInput("");
      setMemberPhone("");
      setMemberBirthDate("");
      setMemberJoinDate(new Date().toLocaleDateString("vi-VN"));
      setMemberDecisionNumber("");
      setMemberDecisionDate("");
      setMemberAvatar("");
      setDecisionFile(null);
    }
  }, [mode, existingMember, availableRoleOptions, currentAssociation]);

  // Filtered residents for quick picking in create mode
  const filteredResidents = useMemo(() => {
    if (!residentSearchQuery.trim()) return [];
    const q = residentSearchQuery.toLowerCase();
    return residents
      .filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.cccd.toLowerCase().includes(q) ||
          (r.phone && r.phone.includes(q))
      )
      .slice(0, 8);
  }, [residents, residentSearchQuery]);

  const handleSelectResident = (res: Resident) => {
    setMemberFullName(res.fullName);
    setMemberCccd(res.cccd);
    setMemberPhone(res.phone || "");
    setMemberBirthDate(res.birthDate || "");
    if (res.avatar) setMemberAvatar(res.avatar);
    setShowResidentSuggestions(false);
    setResidentSearchQuery("");
  };

  const applyAppointeeToForm = (person: DecisionAppointeeOcr) => {
    if (mode === "create") {
      if (person.fullName) setMemberFullName(person.fullName);
      if (person.cccd) setMemberCccd(person.cccd);
      if (person.phone) setMemberPhone(person.phone);
      if (person.birthDate) setMemberBirthDate(person.birthDate);
      if (person.matchedResident?.avatar) setMemberAvatar(person.matchedResident.avatar);
    }
    if (person.role) {
      if (availableRoleOptions.includes(person.role)) {
        setMemberRole(person.role);
        setCustomRoleInput("");
      } else {
        setMemberRole("custom");
        setCustomRoleInput(person.role);
      }
    }
  };

  const handleProcessFileUpload = async (file: File) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setNotice({ type: "error", message: "Chỉ hỗ trợ tệp định dạng PDF hoặc hình ảnh (PNG, JPG, WebP)!" });
      return;
    }

    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });

    setDecisionFile({
      name: file.name,
      type: isPdf ? "pdf" : "image",
      size: sizeStr,
      url: dataUrl,
      uploadDate: new Date().toLocaleDateString("vi-VN"),
    });

    setIsScanningOcr(true);
    try {
      const [uploadedUrl, scanned] = await Promise.all([
        uploadFileToStorageBucket(file, "admin-forms", "decisions"),
        extractDecisionDocumentViaOcr(file, associations, residents),
      ]);

      if (uploadedUrl) {
        setDecisionFile((prev) => (prev ? { ...prev, url: uploadedUrl } : prev));
      }

      setOcrResult(scanned);

      const filledFields: string[] = [];
      if (scanned.decisionNumber) {
        setMemberDecisionNumber(scanned.decisionNumber);
        filledFields.push(`Số QĐ (${scanned.decisionNumber})`);
      }
      if (scanned.decisionDate) {
        setMemberDecisionDate(scanned.decisionDate);
        if (!memberJoinDate) setMemberJoinDate(scanned.decisionDate);
        filledFields.push(`Ngày ký (${scanned.decisionDate})`);
      }
      if (mode === "create" && scanned.matchedAssocId) {
        ocrAppliedRef.current = true;
        setSelectedAssocId(scanned.matchedAssocId);
        filledFields.push("Chi hội mục tiêu");
      }

      if (scanned.appointees.length > 0) {
        const matchedTarget =
          mode === "edit" && existingMember
            ? scanned.appointees.find(
                (p) =>
                  (p.cccd && p.cccd === existingMember.cccd) ||
                  p.fullName.toLowerCase() === existingMember.fullName.toLowerCase()
              ) || scanned.appointees[0]
            : scanned.appointees[0];
        applyAppointeeToForm(matchedTarget);
        filledFields.push(`Nhân sự (${matchedTarget.fullName} — ${matchedTarget.role})`);
      }

      setNotice({
        type: "success",
        message:
          filledFields.length > 0
            ? `AI OCR đã đọc "${file.name}" và tự điền: ${filledFields.join(", ")}.`
            : `Đã đính kèm tệp "${file.name}". Vui lòng kiểm tra số hiệu Quyết định bên dưới.`,
      });
    } catch {
      setNotice({
        type: "success",
        message: `Đã đính kèm tệp "${file.name}" (${sizeStr}).`,
      });
    } finally {
      setIsScanningOcr(false);
    }
  };

  const handleAvatarFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setNotice({ type: "error", message: "Vui lòng chọn tệp hình ảnh hợp lệ làm avatar!" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMemberAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedAssocId) {
      errs.assoc = "Vui lòng chọn Chi hội / Tổ chức sinh hoạt.";
    }
    if (!memberFullName.trim()) {
      errs.fullName = "Họ và tên hội viên không được để trống.";
    }
    if (!memberCccd.trim()) {
      errs.cccd = "Số CCCD / Mã định danh không được để trống.";
    } else if (memberCccd.trim().length < 9) {
      errs.cccd = "Số CCCD / CMND phải có ít nhất 9 chữ số.";
    }
    const effectiveRole = memberRole === "custom" ? customRoleInput.trim() : memberRole;
    if (!effectiveRole) {
      errs.role = "Vui lòng chỉ định chức danh / vai trò của hội viên.";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setNotice({ type: "error", message: "Vui lòng kiểm tra lại các trường dữ liệu bắt buộc." });
      return;
    }

    if (!currentAssociation) {
      setNotice({ type: "error", message: "Không tìm thấy Chi hội hợp lệ để lưu." });
      return;
    }

    const effectiveRole = memberRole === "custom" ? customRoleInput.trim() : memberRole;

    const memberPayload: AssociationMember = {
      id: existingMember?.id || `mem-${Date.now()}`,
      fullName: memberFullName.trim(),
      cccd: memberCccd.trim(),
      role: effectiveRole,
      phone: memberPhone.trim() || undefined,
      birthDate: memberBirthDate.trim() || undefined,
      joinDate: memberJoinDate.trim() || undefined,
      decisionNumber: memberDecisionNumber.trim() || undefined,
      decisionDate: memberDecisionDate.trim() || undefined,
      avatar: memberAvatar || undefined,
      decisionFile: decisionFile || undefined,
    };

    if (mode === "create") {
      if (onAddMember) {
        onAddMember(currentAssociation.id, memberPayload);
      } else if (onUpdateAssociations) {
        const baseNext = associations.map((assoc) => {
          if (assoc.id !== currentAssociation.id) return assoc;
          const prevMembers = assoc.members || [];
          const exists = prevMembers.some((m) => m.cccd === memberPayload.cccd);
          if (exists) {
            return {
              ...assoc,
              members: prevMembers.map((m) =>
                m.cccd === memberPayload.cccd ? memberPayload : m
              ),
            };
          }
          return {
            ...assoc,
            members: [...prevMembers, memberPayload],
          };
        });
        onUpdateAssociations(
          assignMemberRoleInAssociation(baseNext, currentAssociation.id, memberPayload.cccd, memberPayload.role)
        );
      }

      if (onSaved) {
        onSaved(memberPayload, currentAssociation, "create");
      } else {
        navigate(
          getPartyMemberDetailPath(memberPayload.cccd, currentAssociation.id, basePath)
        );
      }
    } else {
      // Edit mode
      if (onUpdateMember) {
        onUpdateMember(currentAssociation.id, memberPayload);
      } else if (onUpdateAssociations) {
        const baseNext = associations.map((assoc) => {
          if (assoc.id !== currentAssociation.id) return assoc;
          return {
            ...assoc,
            members: (assoc.members || []).map((m) =>
              m.cccd === memberPayload.cccd ? memberPayload : m
            ),
          };
        });
        onUpdateAssociations(
          assignMemberRoleInAssociation(baseNext, currentAssociation.id, memberPayload.cccd, memberPayload.role)
        );
      }

      if (onSaved) {
        onSaved(memberPayload, currentAssociation, "edit");
      } else {
        navigate(
          getPartyMemberDetailPath(memberPayload.cccd, currentAssociation.id, basePath)
        );
      }
    }
  };

  if (isDataLoading && mode === "edit" && !existingMember) {
    return <LoadingFade title="Đang tải dữ liệu hồ sơ hội viên..." />;
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        badgeText={
          mode === "create"
            ? "Thêm mới Hội viên Chi hội"
            : `Cập nhật: ${existingMember?.fullName || "Hội viên"}`
        }
        title={
          mode === "create"
            ? "Tiếp nhận & Bổ nhiệm Hội viên mới"
            : "Chỉnh sửa Hồ sơ & Quyết định Thành viên"
        }
        description={
          mode === "create"
            ? `Chi hội: ${currentAssociation?.name || "Chọn chi hội"} • Phân công vai trò & lưu trữ quyết định`
            : `Chi hội: ${currentAssociation?.name} • CCCD: ${existingMember?.cccd} • Điều chỉnh thông tin & quyết định`
        }
        onBackClick={onCancel || (() => navigate(basePath))}
      />

      {/* Notice Message */}
      {notice && (
        <InlineNotice
          type={notice.type}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
        {/* Khối Quét AI OCR Quyết định thông minh ngay đầu biểu mẫu */}
        <div className="p-4 rounded-2xl border border-indigo-200/90 bg-indigo-50/45 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-950 uppercase tracking-wide">
                <Sparkles size={15} className="text-indigo-700 shrink-0" />
                <span>AI Vision OCR — Đọc Quyết định &amp; Tự động điền biểu mẫu</span>
              </div>
              <p className="text-xs text-slate-600">
                Tải ảnh chụp hoặc PDF Quyết định chuẩn y / công nhận nhân sự để AI tự bóc tách Số QĐ, Ngày ký, Chi hội, Họ tên, CCCD và Chức vụ.
              </p>
            </div>

            <label
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                isScanningOcr
                  ? "bg-indigo-200 text-indigo-900 cursor-wait"
                  : "bg-indigo-700 hover:bg-indigo-800 text-white shadow-2xs"
              }`}
            >
              {isScanningOcr ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang đọc OCR Quyết định...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>Tải Quyết định &amp; Tự điền (PDF/Ảnh)</span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,image/*"
                disabled={isScanningOcr}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleProcessFileUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {ocrResult && (
            <div className="p-3 rounded-xl bg-white border border-indigo-200/90 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>
                    Kết quả trích xuất OCR ({ocrResult.source === "gemini_vision" ? "Gemini Vision AI" : "Bộ đọc văn bản"}):
                  </span>
                </span>
                {ocrResult.issuingAuthority && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                    {ocrResult.issuingAuthority}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
                <div>
                  Số QĐ: <strong className="font-mono text-slate-900">{ocrResult.decisionNumber || "Chưa rõ"}</strong>
                </div>
                <div>
                  Ngày ký: <strong className="font-mono text-slate-900">{ocrResult.decisionDate || "Chưa rõ"}</strong>
                </div>
                <div className="truncate" title={ocrResult.summary}>
                  Trích yếu: <strong className="text-slate-900">{ocrResult.summary || ocrResult.organizationName || "Đã nhận diện"}</strong>
                </div>
              </div>

              {ocrResult.appointees.length > 1 && (
                <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Phát hiện {ocrResult.appointees.length} nhân sự trong Quyết định (nhấp để điền):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ocrResult.appointees.map((p, idx) => (
                      <button
                        key={`${p.fullName}-${idx}`}
                        type="button"
                        onClick={() => applyAppointeeToForm(p)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold cursor-pointer transition-colors"
                      >
                        {p.fullName} — {p.role}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 1: Chi hội sinh hoạt */}
        <div className="space-y-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
            <Users size={15} className="text-emerald-700" />
            <span>1. Chi hội / Tổ chức phong trào sinh hoạt *</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Thuộc Chi hội / Tổ chức *
              </label>
              <ReportSelect
                value={selectedAssocId}
                onChange={(val) => setSelectedAssocId(val)}
                options={associations.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.members?.length || 0} hội viên)`,
                }))}
              />
              {formErrors.assoc && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.assoc}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Phân loại Chi hội
              </label>
              <input
                type="text"
                disabled
                value={currentAssociation?.category || "Chính trị - Xã hội"}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Định danh Hội viên */}
        <div className="space-y-4 pb-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <User size={15} className="text-emerald-700" />
              <span>2. Thông tin định danh Hội viên *</span>
            </div>
            {mode === "create" && (
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Tìm nhanh từ CSDL 11.632 Cư dân KP3
              </span>
            )}
          </div>

          {/* Quick Search from CSDL in create mode */}
          {mode === "create" && (
            <div className="relative">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tìm kiếm cư dân KP3 để tự động điền nhanh
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Nhập họ tên, số CCCD hoặc SĐT cư dân..."
                  value={residentSearchQuery}
                  onChange={(e) => {
                    setResidentSearchQuery(e.target.value);
                    setShowResidentSuggestions(true);
                  }}
                  onFocus={() => setShowResidentSuggestions(true)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200/90 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showResidentSuggestions && filteredResidents.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredResidents.map((res) => (
                    <button
                      key={res.cccd}
                      type="button"
                      onClick={() => handleSelectResident(res)}
                      className="w-full p-2.5 text-left hover:bg-emerald-50/70 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{res.fullName}</span>
                        <span className="text-slate-500 font-mono text-[11px]">CCCD: {res.cccd} • {res.address}</span>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        Chọn
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Identity Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Họ và tên Hội viên *
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Nguyễn Văn A"
                value={memberFullName}
                onChange={(e) => setMemberFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200/90 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-medium"
              />
              {formErrors.fullName && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Số CCCD / Mã định danh *
              </label>
              <input
                type="text"
                placeholder="12 chữ số CCCD gắn chip"
                value={memberCccd}
                onChange={(e) => setMemberCccd(e.target.value)}
                disabled={mode === "edit"}
                className={`w-full px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-mono outline-none ${
                  mode === "edit"
                    ? "bg-slate-50 text-slate-600 cursor-not-allowed"
                    : "focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                }`}
              />
              {formErrors.cccd && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.cccd}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Số điện thoại liên hệ
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 0912345678"
                value={memberPhone}
                onChange={(e) => setMemberPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Ngày / Năm sinh
              </label>
              <input
                type="text"
                placeholder="DD/MM/YYYY (ví dụ: 12/05/1985)"
                value={memberBirthDate}
                onChange={(e) => setMemberBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          {/* Avatar Upload Preview */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="relative shrink-0">
              <img
                src={
                  memberAvatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
                }
                alt={memberFullName || "Avatar"}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900">Ảnh đại diện hội viên</div>
              <div className="text-[11px] text-slate-500">
                {memberAvatar ? "Đã có ảnh đại diện" : "Đang dùng ảnh mặc định hệ thống"}
              </div>
            </div>
            <label className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
              <Camera size={13} className="text-emerald-700" />
              <span>Tải ảnh lên</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarFile(file);
                }}
              />
            </label>
          </div>
        </div>

        {/* Section 3: Chức vụ & Vai trò */}
        <div className="space-y-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={15} className="text-amber-500" />
            <span>3. Chức danh / Vai trò trong Chi hội *</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Chức danh quy chuẩn *
              </label>
              <ReportSelect
                value={memberRole}
                onChange={(val) => setMemberRole(val)}
                options={[
                  ...availableRoleOptions.map((r) => ({ value: r, label: r })),
                  { value: "custom", label: "+ Chức danh khác..." },
                ]}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Ngày tham gia Chi hội
                </label>
                <button
                  type="button"
                  onClick={() => setMemberJoinDate(new Date().toLocaleDateString("vi-VN"))}
                  className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  Hôm nay
                </button>
              </div>
              <div className="relative">
                <Calendar
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="DD/MM/YYYY (ví dụ: 15/08/2023)"
                  value={memberJoinDate}
                  onChange={(e) => setMemberJoinDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200/90 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>
          </div>

          {memberRole === "custom" && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tự nhập chức danh / nhiệm vụ đặc thù *
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Phụ trách Đội phản ứng nhanh PCCC"
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200/90 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-medium"
              />
              {formErrors.role && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.role}</p>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Quyết định công nhận & Tệp đính kèm */}
        <div className="space-y-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <FileCheck size={15} className="text-emerald-700" />
              <span>4. Quyết định công nhận &amp; Tệp đính kèm</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 hidden sm:inline">Gắn mẫu thử:</span>
              <button
                type="button"
                onClick={() => {
                  setDecisionFile({
                    name: `Quyet_dinh_chuan_y_${(memberFullName || "Hoi_vien").replace(/\s+/g, "_")}.pdf`,
                    type: "pdf",
                    size: "265 KB",
                    url: "data:application/pdf;base64,JVBERi0xLjQKJ",
                  });
                  if (!memberDecisionNumber) setMemberDecisionNumber("QĐ-12/UBND-KP3");
                  if (!memberDecisionDate) setMemberDecisionDate(new Date().toLocaleDateString("vi-VN"));
                  setNotice({ type: "success", message: "Đã gắn mẫu văn bản Quyết định PDF!" });
                }}
                className="text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                [Mẫu PDF]
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecisionFile({
                    name: `Anh_chup_Quyet_dinh_${(memberFullName || "Hoi_vien").replace(/\s+/g, "_")}.jpg`,
                    type: "image",
                    size: "410 KB",
                    url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=900",
                  });
                  if (!memberDecisionNumber) setMemberDecisionNumber("QĐ-18/UBND-KP3");
                  if (!memberDecisionDate) setMemberDecisionDate(new Date().toLocaleDateString("vi-VN"));
                  setNotice({ type: "success", message: "Đã gắn mẫu ảnh chụp Quyết định!" });
                }}
                className="text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                [Mẫu Ảnh]
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Số Quyết định công nhận / chuẩn y
              </label>
              <input
                type="text"
                placeholder="Ví dụ: QĐ-08/UBND-KP3"
                value={memberDecisionNumber}
                onChange={(e) => setMemberDecisionNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Ngày ký / ban hành Quyết định
              </label>
              <input
                type="text"
                placeholder="DD/MM/YYYY (ví dụ: 10/08/2023)"
                value={memberDecisionDate}
                onChange={(e) => setMemberDecisionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          {/* Attachment Box */}
          {decisionFile ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <div className="flex items-center gap-3 min-w-0">
                {decisionFile.type === "pdf" ? (
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <ImageIcon size={20} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {decisionFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {decisionFile.type.toUpperCase()} • {decisionFile.size || "Sẵn sàng"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setDecisionFile(null)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  title="Gỡ bỏ tệp này"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
              <UploadCloud size={28} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">
                Kéo thả hoặc nhấp để tải lên tệp Quyết định mới
              </span>
              <span className="text-[11px] text-slate-500">
                Hỗ trợ tệp PDF hoặc hình ảnh (PNG, JPG, WebP)
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessFileUpload(file);
                }}
              />
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel || (() => navigate(basePath))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Save size={14} />
            <span>
              {mode === "create" ? "Lưu & Bổ nhiệm Hội viên" : "Lưu thay đổi"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

