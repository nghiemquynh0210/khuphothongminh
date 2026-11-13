import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FolderPlus,
  Plus,
  Save,
  Users,
  X,
} from "lucide-react";
import { Association, AssociationMember, Resident } from "../types";
import { Button, Input, ReportSelect } from "../components/ui";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import {
  ROUTES,
  navigate,
} from "../routes";

export const ASSOC_CATEGORIES = [
  "Đoàn thể nhân dân",
  "Mặt trận & Dân vận",
  "Cấp ủy & Chi bộ",
  "Ban Điều hành & Tổ dân phố",
  "Hội quần chúng & CLB",
  "An ninh - Trật tự địa bàn",
];

export interface PartyAssociationFormPageProps {
  mode: "create" | "edit";
  assocId?: string;
  associations: Association[];
  residents?: Resident[];
  isDataLoading?: boolean;
  basePath?: string;
  onAddAssociation?: (newAssoc: Association) => void;
  onUpdateAssociation?: (updatedAssoc: Association) => void;
  onCancel?: () => void;
  onSaved?: (savedAssoc: Association, mode: "create" | "edit") => void;
}

export default function PartyAssociationFormPage({
  mode,
  assocId,
  associations,
  residents = [],
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_PARTY,
  onAddAssociation,
  onUpdateAssociation,
  onCancel,
  onSaved,
}: PartyAssociationFormPageProps) {
  const normalizedAssocId = useMemo(() => {
    return assocId ? decodeURIComponent(assocId).trim() : "";
  }, [assocId]);

  const targetAssoc = useMemo(() => {
    if (mode !== "edit" || !normalizedAssocId) return null;
    return (
      associations.find(
        (a) =>
          a.id === normalizedAssocId ||
          a.id.toLowerCase() === normalizedAssocId.toLowerCase()
      ) || null
    );
  }, [mode, normalizedAssocId, associations]);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [category, setCategory] = useState("Đoàn thể nhân dân");
  const [description, setDescription] = useState("");
  const [leaderCccd, setLeaderCccd] = useState("");
  const [leaderRole, setLeaderRole] = useState("Chi hội trưởng");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (mode === "edit" && targetAssoc) {
      setName(targetAssoc.name || "");
      setNameError("");
      setCategory(targetAssoc.category || "Đoàn thể nhân dân");
      setDescription(targetAssoc.description || "");
      setLeaderCccd(targetAssoc.leaderCccd !== "N/A" ? targetAssoc.leaderCccd : "");
      const leaderMember = targetAssoc.members?.find((m) => m.cccd === targetAssoc.leaderCccd);
      setLeaderRole(leaderMember ? leaderMember.role : "Chi hội trưởng");
      return;
    }

    if (mode === "create") {
      setName("");
      setNameError("");
      setCategory("Đoàn thể nhân dân");
      setDescription("");
      setLeaderCccd("");
      setLeaderRole("Chi hội trưởng");
    }
  }, [mode, targetAssoc]);

  const leaderCandidates = useMemo(() => {
    return residents
      .filter((r) => r.cccd && r.cccd !== "N/A")
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
  }, [residents]);

  const leaderSelectOptions = useMemo(() => {
    const list = leaderCandidates.map((r) => ({
      value: r.cccd,
      label: `${r.fullName} • CCCD: ${r.cccd} (${r.occupation || "Cư dân"})`,
    }));
    return [
      { value: "", label: "-- Chọn đại diện đứng đầu từ CSDL Cư dân KP3 --" },
      ...list,
    ];
  }, [leaderCandidates]);

  const categoryOptions = useMemo(() => {
    return ASSOC_CATEGORIES.map((cat) => ({
      value: cat,
      label: cat,
    }));
  }, []);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(basePath);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Vui lòng nhập tên chi hội hoặc tổ chức.");
      setNotice({ type: "error", message: "Vui lòng nhập đầy đủ các trường bắt buộc." });
      return;
    }

    const leaderResident = residents.find((r) => r.cccd === leaderCccd);
    const leaderName = leaderResident ? leaderResident.fullName : "Chưa xác định";

    if (mode === "edit") {
      if (!targetAssoc) return;

      let updatedMembers: AssociationMember[] = [...(targetAssoc.members || [])];
      if (leaderResident) {
        const idx = updatedMembers.findIndex((m) => m.cccd === leaderResident.cccd);
        if (idx >= 0) {
          updatedMembers[idx] = {
            ...updatedMembers[idx],
            role: leaderRole || "Chi hội trưởng",
          };
        } else {
          updatedMembers.unshift({
            id: "M" + Date.now(),
            fullName: leaderResident.fullName,
            role: leaderRole || "Chi hội trưởng",
            cccd: leaderResident.cccd,
            phone: leaderResident.phone,
            birthDate: leaderResident.birthDate,
          });
        }
      }

      const updatedAssoc: Association = {
        ...targetAssoc,
        name: name.trim(),
        category,
        description: description.trim() || "Chưa có mô tả chi tiết.",
        leaderName,
        leaderCccd: leaderCccd || "N/A",
        members: updatedMembers,
      };

      if (onUpdateAssociation) {
        onUpdateAssociation(updatedAssoc);
      }
      if (onSaved) {
        onSaved(updatedAssoc, "edit");
      } else {
        navigate(basePath);
      }
      return;
    }

    // Mode create
    const newId = "ASC" + (associations.length + 1).toString().padStart(3, "0");
    const newAssoc: Association = {
      id: newId,
      name: name.trim(),
      category,
      description: description.trim() || "Chưa có mô tả chi tiết.",
      leaderName,
      leaderCccd: leaderCccd || "N/A",
      members: leaderResident
        ? [
            {
              id: "M" + Date.now(),
              fullName: leaderResident.fullName,
              role: leaderRole || "Chi hội trưởng",
              cccd: leaderResident.cccd,
              phone: leaderResident.phone,
              birthDate: leaderResident.birthDate,
            },
          ]
        : [],
    };

    if (onAddAssociation) {
      onAddAssociation(newAssoc);
    }
    if (onSaved) {
      onSaved(newAssoc, "create");
    } else {
      navigate(basePath);
    }
  };

  if (mode === "edit" && isDataLoading && !targetAssoc) {
    return <LoadingFade title="Đang tải dữ liệu Chi hội..." />;
  }

  if (mode === "edit" && !targetAssoc) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Không tìm thấy chi hội</h2>
              <p className="text-xs text-slate-500 mt-1">
                Chi hội có mã <span className="font-mono font-bold text-slate-700">{assocId}</span> không tồn tại hoặc đã bị xóa/giải thể.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Quay lại danh sách chi hội
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <PageHeader
        badgeIcon={<Building2 size={14} className="text-emerald-700 shrink-0" />}
        badgeText={
          mode === "create"
            ? "Thêm Chi hội mới"
            : `Chỉnh sửa Chi hội • ${targetAssoc?.id || assocId}`
        }
        badgeSubtext="MẶT TRẬN & ĐOÀN THỂ KP3"
        title={
          mode === "create"
            ? "Tạo Chi Hội / Tổ Chức Phong Trào Mới"
            : `Chỉnh Sửa Chi Hội: ${targetAssoc?.name || assocId}`
        }
        description="Kiện toàn bộ máy tổ chức, bổ nhiệm người đứng đầu và phân công nhiệm vụ đoàn thể Khu phố 3."
        actions={
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft size={14} />}
            onClick={handleBack}
          >
            Quay lại danh sách
          </Button>
        }
      />

      {notice && (
        <InlineNotice
          type={notice.type}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5"
      >
        <div className="space-y-4">
          <Input
            id="assoc-name-input"
            label="Tên Chi hội / Tổ chức phong trào"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameError("");
            }}
            onBlur={() => {
              if (!name.trim()) setNameError("Vui lòng nhập tên chi hội hoặc tổ chức.");
            }}
            error={nameError}
            placeholder="Ví dụ: Chi hội Khuyến học Khu phố 3, CLB Dưỡng sinh NCT..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Khối trực thuộc / Phân loại tổ chức <span className="text-rose-500">*</span>
              </label>
              <ReportSelect
                aria-label="Khối trực thuộc"
                value={category}
                onChange={(val) => setCategory(val)}
                options={categoryOptions}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Chức danh người đứng đầu
              </label>
              <Input
                id="assoc-leader-role-input"
                value={leaderRole}
                onChange={(e) => setLeaderRole(e.target.value)}
                placeholder="Ví dụ: Chi hội trưởng, Chủ nhiệm CLB, Bí thư..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Người đứng đầu (Chọn từ CSDL Dân cư KP3)
            </label>
            <ReportSelect
              aria-label="Người đứng đầu"
              value={leaderCccd}
              onChange={(val) => setLeaderCccd(val)}
              options={leaderSelectOptions}
            />
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống sẽ tự động thêm nhân sự này vào danh sách hội viên ban đầu của Chi hội.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assoc-desc-input" className="block text-sm font-medium text-slate-700">
              Mô tả chức năng & nhiệm vụ hoạt động
            </label>
            <textarea
              id="assoc-desc-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi rõ tôn chỉ, mục tiêu hoạt động, địa bàn phụ trách trọng điểm hoặc quy chế sinh hoạt..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/90 flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" size="md" onClick={handleBack}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            variant="emerald"
            size="md"
            leftIcon={mode === "edit" ? <Save size={16} /> : <FolderPlus size={16} />}
          >
            {mode === "edit" ? "Lưu thay đổi Chi hội" : "Tạo Chi hội mới"}
          </Button>
        </div>
      </form>
    </div>
  );
}

