import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  FileCheck,
  FileText,
  Home,
  MapPin,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import { Household, LandParcelCertificate, Resident } from "../types";
import {
  generateDefaultCoordinatesForAddress,
  parseCoordinates as parseGisCoords,
} from "../utils/gisUtils";
import {
  createEmptyLandParcel,
  normalizeEntityLandParcels,
  summarizeLandParcels,
} from "../utils/landParcelsUtils";
import { extractTimemarkFromImage } from "../utils/timemarkParser";
import { uploadFileToStorageBucket } from "../utils/imageUpload";
import { ResidentSelectModal } from "../components/business/ResidentSelectModal";
import { MultiParcelEditor } from "../components/common/MultiParcelEditor";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingFade } from "../components/common/LoadingFade";
import { ReportSelect } from "../components/reports/ReportSelect";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { ROUTES, navigate } from "../routes";

export interface HouseholdFormPageProps {
  mode: "create" | "edit";
  householdId?: string;
  households: Household[];
  residents: Resident[];
  isDataLoading?: boolean;
  onAddHousehold: (newH: Household) => void;
  onUpdateHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
  onUpdateResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  onCancel?: () => void;
  onSaved?: (savedHousehold: Household, mode: "create" | "edit") => void;
}

type TempMember = {
  name: string;
  relation: string;
  cccd: string;
  birthYear: number;
  phone?: string;
};

function parseGpsPreview(
  input: string
): { lat: number; lng: number; formatted: string } | null {
  if (!input.trim()) return null;

  const parts = input.split(",");
  if (parts.length === 2) {
    const p1 = parseFloat(parts[0].trim());
    const p2 = parseFloat(parts[1].trim());
    if (!isNaN(p1) && !isNaN(p2)) {
      let lat = p1;
      let lng = p2;
      if (p1 > 100 && p2 < 30) {
        lat = p2;
        lng = p1;
      }
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
      }
    }
  }

  const parsedDms = parseGisCoords(input);
  if (parsedDms) {
    return {
      lat: parsedDms.lat,
      lng: parsedDms.lng,
      formatted: `${parsedDms.lat.toFixed(6)}, ${parsedDms.lng.toFixed(6)}`,
    };
  }

  return null;
}

export default function HouseholdFormPage({
  mode,
  householdId,
  households,
  residents,
  isDataLoading = false,
  onAddHousehold,
  onUpdateHouseholds,
  onUpdateResidents,
  onCancel,
  onSaved,
}: HouseholdFormPageProps) {
  const targetHousehold = useMemo(() => {
    if (mode !== "edit" || !householdId) return null;
    return (
      households.find(
        (h) => h.id === householdId || h.code === householdId
      ) || null
    );
  }, [mode, householdId, households]);

  // Create mode state
  const [newHCode, setNewHCode] = useState("");
  const [newHType, setNewHType] = useState<"Thường trú" | "Tạm trú">(
    "Thường trú"
  );
  const [newOwner, setNewOwner] = useState("");
  const [newOwnerCccd, setNewOwnerCccd] = useState("");
  const [newOwnerPhone, setNewOwnerPhone] = useState("");
  const [selectedOwnerResident, setSelectedOwnerResident] = useState<Resident | null>(null);
  const [newAddress, setNewAddress] = useState("");
  const [tempMembers, setTempMembers] = useState<TempMember[]>([]);

  // Sub-member registration inside create form
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberCccd, setNewMemberCccd] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("Vợ");
  const [newMemberBirthYear, setNewMemberBirthYear] = useState<number | "">("");
  const [newMemberPhone, setNewMemberPhone] = useState("");

  // Edit mode state
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState<"Thường trú" | "Tạm trú">(
    "Thường trú"
  );
  const [editOwner, setEditOwner] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Đa Thửa Đất & Nhiều Sổ Đỏ (GCN QSDĐ)
  const [landParcels, setLandParcels] = useState<LandParcelCertificate[]>([
    createEmptyLandParcel(0, { loaiDat: "Đất ở đô thị (ODT)" }),
  ]);

  // Timemark OCR state
  const [houseImage, setHouseImage] = useState<string | undefined>(undefined);
  const [timemarkHash, setTimemarkHash] = useState<string | undefined>(undefined);
  const [timemarkVerified, setTimemarkVerified] = useState<boolean>(false);
  const [photoElevation, setPhotoElevation] = useState<string | undefined>(undefined);
  const [photoDirection, setPhotoDirection] = useState<string | undefined>(undefined);
  const [photoTakenAt, setPhotoTakenAt] = useState<string | undefined>(undefined);
  const [isTimemarkProcessing, setIsTimemarkProcessing] = useState(false);

  // Modal Chọn Cư Dân
  const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);

  // Shared GPS state
  const [coordInput, setCoordInput] = useState("");
  const [parsedGPS, setParsedGPS] = useState<{
    lat: number;
    lng: number;
    formatted: string;
  } | null>(null);

  const [notice, setNotice] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  useEffect(() => {
    setNotice(null);
    if (mode === "edit") {
      if (targetHousehold) {
        setEditAddress(targetHousehold.address || "");
        setEditType(targetHousehold.type || "Thường trú");
        setEditOwner(targetHousehold.ownerName || "");
        setEditNotes((targetHousehold as any).notes || "");
        const coords = targetHousehold.coordinates || "";
        setCoordInput(coords);
        setParsedGPS(parseGpsPreview(coords));
        const normalizedParcels = normalizeEntityLandParcels(targetHousehold);
        setLandParcels(
          normalizedParcels.length > 0
            ? normalizedParcels
            : [
                createEmptyLandParcel(0, {
                  loaiDat: "Đất ở đô thị (ODT)",
                  tenChuSuDung: targetHousehold.ownerName || "",
                  addressNote: targetHousehold.address || "",
                }),
              ]
        );
        setHouseImage(targetHousehold.houseImage);
        setTimemarkHash(targetHousehold.timemarkHash);
        setTimemarkVerified(Boolean(targetHousehold.timemarkVerified));
        setPhotoElevation(targetHousehold.photoElevation);
        setPhotoDirection(targetHousehold.photoDirection);
        setPhotoTakenAt(targetHousehold.photoTakenAt);
      }
    } else {
      setNewHCode("");
      setNewHType("Thường trú");
      setNewOwner("");
      setNewOwnerCccd("");
      setNewOwnerPhone("");
      setSelectedOwnerResident(null);
      setNewAddress("");
      setTempMembers([]);
      setNewMemberName("");
      setNewMemberCccd("");
      setNewMemberRelation("Vợ");
      setNewMemberBirthYear("");
      setNewMemberPhone("");
      setCoordInput("");
      setParsedGPS(null);
      setLandParcels([
        createEmptyLandParcel(0, { loaiDat: "Đất ở đô thị (ODT)" }),
      ]);
      setHouseImage(undefined);
      setTimemarkHash(undefined);
      setTimemarkVerified(false);
      setPhotoElevation(undefined);
      setPhotoDirection(undefined);
      setPhotoTakenAt(undefined);
    }
  }, [mode, householdId, targetHousehold]);

  const handleSelectResident = (res: Resident) => {
    setSelectedOwnerResident(res);
    if (mode === "create") {
      setNewOwner(res.fullName);
      setNewOwnerCccd(res.cccd || "");
      setNewOwnerPhone(res.phone && res.phone !== "N/A" ? res.phone : "");
      if (res.address && !newAddress) {
        setNewAddress(res.address);
      }
    } else {
      setEditOwner(res.fullName);
    }
    setLandParcels((prev) =>
      prev.map((p, idx) =>
        idx === 0 && !p.tenChuSuDung
          ? { ...p, tenChuSuDung: res.fullName }
          : p
      )
    );
    setIsResidentModalOpen(false);
    setNotice({
      message: `Đã chọn Cư dân "${res.fullName}" (CCCD: ${res.cccd || "Chưa cập nhật"}) làm Chủ hộ!`,
      type: "success",
    });
  };

  const handleProcessImageUpload = async (file: File) => {
    setIsTimemarkProcessing(true);
    try {
      const localBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(file);
      });

      let storedUrl = localBase64;
      try {
        storedUrl = await uploadFileToStorageBucket(file, "cadastral-docs", "households");
      } catch {
        storedUrl = localBase64;
      }
      setHouseImage(storedUrl);

      const ocrResult = await extractTimemarkFromImage(file);
      if (ocrResult) {
        handleCoordInputChange(ocrResult.coordinates);
        setTimemarkHash(ocrResult.timemarkHash);
        setTimemarkVerified(ocrResult.isVerified);
        setPhotoElevation(ocrResult.elevation);
        setPhotoDirection(ocrResult.direction);
        setPhotoTakenAt(ocrResult.rawTime || ocrResult.recordedTime);

        if (ocrResult.address && mode === "create" && !newAddress) {
          setNewAddress(ocrResult.address);
        }

        setNotice({
          message: `Trích xuất Timemark thành công: Tọa độ GPS ${ocrResult.coordinates} • Xác thực ${ocrResult.timemarkHash || "OK"}`,
          type: "success",
        });
      }
    } catch (err) {
      setNotice({
        message: "Không thể trích xuất watermark Timemark từ ảnh.",
        type: "error",
      });
    } finally {
      setIsTimemarkProcessing(false);
    }
  };

  const goBackToList = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
    }
  };

  const handleCoordInputChange = (val: string) => {
    setCoordInput(val);
    setParsedGPS(parseGpsPreview(val));
  };

  const handleAddTempMember = () => {
    if (!newMemberName.trim() || !newMemberCccd.trim() || !newMemberBirthYear) {
      setNotice({
        message: "Vui lòng điền tên, CCCD và năm sinh thành viên tạm thời!",
        type: "warning",
      });
      return;
    }
    setTempMembers((prev) => [
      ...prev,
      {
        name: newMemberName.trim(),
        relation: newMemberRelation,
        cccd: newMemberCccd.trim(),
        birthYear: Number(newMemberBirthYear),
        phone: newMemberPhone.trim() || undefined,
      },
    ]);
    setNewMemberName("");
    setNewMemberCccd("");
    setNewMemberPhone("");
    setNewMemberBirthYear("");
  };

  const handleCreateHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHCode.trim() || !newOwner.trim() || !newAddress.trim()) {
      setNotice({
        message: "Vui lòng điền đầy đủ các thông mục có dấu sao (*)",
        type: "warning",
      });
      return;
    }

    const trimmedCode = newHCode.trim();
    const trimmedOwner = newOwner.trim();
    const trimmedAddress = newAddress.trim();

    const matchedExistingResident =
      (selectedOwnerResident &&
      selectedOwnerResident.fullName.trim().toLowerCase() === trimmedOwner.toLowerCase()
        ? selectedOwnerResident
        : null) ||
      (newOwnerCccd.trim()
        ? residents.find((r) => r.cccd === newOwnerCccd.trim()) || null
        : null) ||
      residents.find(
        (r) =>
          r.fullName.trim().toLowerCase() === trimmedOwner.toLowerCase() &&
          (!r.address || r.address.trim().toLowerCase() === trimmedAddress.toLowerCase())
      ) ||
      null;

    const primaryOwnerCccd =
      newOwnerCccd.trim() || matchedExistingResident?.cccd || "";
    const primaryOwnerPhone =
      newOwnerPhone.trim() ||
      (matchedExistingResident?.phone && matchedExistingResident.phone !== "N/A"
        ? matchedExistingResident.phone
        : "") ||
      undefined;
    const primaryOwnerBirthDate = matchedExistingResident?.birthDate || "";
    const primaryOwnerBirthYear = (() => {
      const m = String(primaryOwnerBirthDate).match(/\b(19\d{2}|20\d{2})\b/);
      return m ? parseInt(m[1], 10) : 0;
    })();
    const primaryOwnerOccupation = matchedExistingResident?.occupation || "";
    const primaryOwnerGender = matchedExistingResident?.gender || "Nam";

    const finalCoordinates = parsedGPS ? parsedGPS.formatted : coordInput.trim();

    const candidateId = "H" + (households.length + 1).toString().padStart(3, "0");
    const uniqueId = households.some((h) => h.id === candidateId)
      ? `H-${Date.now()}`
      : candidateId;

    const parcelSummary = summarizeLandParcels(landParcels);

    const newH: Household = {
      id: uniqueId,
      code: trimmedCode,
      ownerName: trimmedOwner,
      address: trimmedAddress,
      type: newHType,
      memberCount: tempMembers.length + 1,
      coordinates: finalCoordinates || undefined,
      landParcels:
        parcelSummary.meaningfulParcels.length > 0
          ? parcelSummary.meaningfulParcels
          : undefined,
      toBanDo: parcelSummary.toBanDoSummary || undefined,
      soThua: parcelSummary.soThuaSummary || undefined,
      dienTich: parcelSummary.totalArea || undefined,
      loaiDat: parcelSummary.loaiDatSummary || undefined,
      tenChuSuDung: parcelSummary.tenChuSuDungSummary || trimmedOwner,
      soGcn: parcelSummary.soGcnSummary || undefined,
      soVaoSo: parcelSummary.soVaoSoSummary || undefined,
      soDoFile: parcelSummary.primarySoDoFile || undefined,
      houseImage,
      timemarkHash,
      timemarkVerified,
      photoElevation,
      photoDirection,
      photoTakenAt,
      members: [
        {
          name: trimmedOwner,
          relation: "Chủ hộ",
          cccd: primaryOwnerCccd,
          birthYear: primaryOwnerBirthYear,
          phone: primaryOwnerPhone,
        },
        ...tempMembers,
      ],
    };

    onAddHousehold(newH);

    onUpdateResidents((prev) => {
      let nextList = [...prev];

      // Update existing owner resident or append if genuinely new
      if (matchedExistingResident) {
        nextList = nextList.map((r) =>
          r.id === matchedExistingResident.id
            ? {
                ...r,
                cccd: primaryOwnerCccd || r.cccd,
                phone: primaryOwnerPhone || r.phone,
                address: trimmedAddress,
                householdId: trimmedCode,
                relationToOwner: "Chủ hộ",
              }
            : r
        );
      } else if (
        primaryOwnerCccd &&
        nextList.some((r) => r.cccd === primaryOwnerCccd)
      ) {
        nextList = nextList.map((r) =>
          r.cccd === primaryOwnerCccd
            ? {
                ...r,
                fullName: trimmedOwner,
                phone: primaryOwnerPhone || r.phone,
                address: trimmedAddress,
                householdId: trimmedCode,
                relationToOwner: "Chủ hộ",
              }
            : r
        );
      } else {
        nextList.push({
          id: `R-${Date.now()}`,
          fullName: trimmedOwner,
          gender: primaryOwnerGender,
          birthDate: primaryOwnerBirthDate,
          cccd: primaryOwnerCccd,
          phone: primaryOwnerPhone || "",
          status: newHType,
          occupation: primaryOwnerOccupation,
          address: trimmedAddress,
          householdId: trimmedCode,
          relationToOwner: "Chủ hộ",
          joinDate: new Date().toLocaleDateString("vi-VN"),
        });
      }

      // Update or append tempMembers preserving real resident fields if already in DB
      tempMembers.forEach((m, idx) => {
        const existingMember = m.cccd
          ? nextList.find((r) => r.cccd === m.cccd)
          : undefined;
        if (existingMember) {
          nextList = nextList.map((r) =>
            r.id === existingMember.id
              ? {
                  ...r,
                  phone: m.phone || r.phone,
                  address: trimmedAddress,
                  householdId: trimmedCode,
                  relationToOwner: m.relation,
                }
              : r
          );
        } else {
          nextList.push({
            id: `R-${Date.now()}-${idx + 1}`,
            fullName: m.name,
            gender:
              m.relation === "Vợ" || m.relation === "Con gái" || m.relation === "Mẹ"
                ? "Nữ"
                : "Nam",
            birthDate: m.birthYear ? `01/01/${m.birthYear}` : "",
            cccd: m.cccd,
            phone: m.phone || "",
            status: newHType,
            occupation: "",
            address: trimmedAddress,
            householdId: trimmedCode,
            relationToOwner: m.relation,
            joinDate: new Date().toLocaleDateString("vi-VN"),
          });
        }
      });

      return nextList;
    });

    if (onSaved) {
      onSaved(newH, "create");
    } else {
      navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
    }
  };

  const handleSaveEditHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHousehold) {
      setNotice({
        message: "Không tìm thấy thông tin sổ hộ khẩu để cập nhật.",
        type: "error",
      });
      return;
    }

    if (!editAddress.trim() || !editOwner.trim()) {
      setNotice({
        message: "Vui lòng điền đầy đủ Địa chỉ cư trú và Chủ hộ đại diện!",
        type: "warning",
      });
      return;
    }

    const finalCoordinates = parsedGPS ? parsedGPS.formatted : coordInput.trim();
    const logs = (targetHousehold as any).auditHistory || [];
    const newLog = {
      date: new Date().toLocaleString("vi-VN"),
      action: "Cập nhật thông tin sổ hộ khẩu",
      actor: "Cán bộ Tư pháp",
    };

    const parcelSummary = summarizeLandParcels(landParcels);

    // Sync members if a resident from outside current household was chosen as owner
    let nextMembers = [...(targetHousehold.members || [])];
    const trimmedEditOwner = editOwner.trim();
    const existingMemberMatch = nextMembers.find(
      (m) => m.name.trim().toLowerCase() === trimmedEditOwner.toLowerCase()
    );
    if (existingMemberMatch) {
      nextMembers = nextMembers.map((m) =>
        m.name.trim().toLowerCase() === trimmedEditOwner.toLowerCase()
          ? { ...m, relation: "Chủ hộ" }
          : m.relation === "Chủ hộ"
          ? { ...m, relation: "Thành viên" }
          : m
      );
    } else if (
      selectedOwnerResident &&
      selectedOwnerResident.fullName.trim().toLowerCase() === trimmedEditOwner.toLowerCase()
    ) {
      const birthMatch = String(selectedOwnerResident.birthDate || "").match(
        /\b(19\d{2}|20\d{2})\b/
      );
      nextMembers = [
        {
          name: selectedOwnerResident.fullName,
          relation: "Chủ hộ",
          cccd: selectedOwnerResident.cccd || "",
          birthYear: birthMatch ? parseInt(birthMatch[1], 10) : 0,
          phone:
            selectedOwnerResident.phone && selectedOwnerResident.phone !== "N/A"
              ? selectedOwnerResident.phone
              : undefined,
        },
        ...nextMembers.map((m) =>
          m.relation === "Chủ hộ" ? { ...m, relation: "Thành viên" } : m
        ),
      ];
    }

    const updatedHousehold: Household = {
      ...targetHousehold,
      address: editAddress.trim(),
      type: editType,
      ownerName: trimmedEditOwner,
      members: nextMembers,
      memberCount: nextMembers.length,
      coordinates: finalCoordinates || undefined,
      landParcels:
        parcelSummary.meaningfulParcels.length > 0
          ? parcelSummary.meaningfulParcels
          : undefined,
      toBanDo: parcelSummary.toBanDoSummary || undefined,
      soThua: parcelSummary.soThuaSummary || undefined,
      dienTich: parcelSummary.totalArea || undefined,
      loaiDat: parcelSummary.loaiDatSummary || undefined,
      tenChuSuDung: parcelSummary.tenChuSuDungSummary || editOwner.trim(),
      soGcn: parcelSummary.soGcnSummary || undefined,
      soVaoSo: parcelSummary.soVaoSoSummary || undefined,
      soDoFile:
        parcelSummary.primarySoDoFile || (targetHousehold as any).soDoFile,
      houseImage: houseImage || (targetHousehold as any).houseImage,
      timemarkHash: timemarkHash || (targetHousehold as any).timemarkHash,
      timemarkVerified: timemarkVerified !== undefined ? timemarkVerified : (targetHousehold as any).timemarkVerified,
      photoElevation: photoElevation || (targetHousehold as any).photoElevation,
      photoDirection: photoDirection || (targetHousehold as any).photoDirection,
      photoTakenAt: photoTakenAt || (targetHousehold as any).photoTakenAt,
      ...(editNotes.trim() ? { notes: editNotes.trim() } : { notes: "" }),
      auditHistory: [newLog, ...logs],
    } as Household;

    onUpdateHouseholds((prev) =>
      prev.map((h) => (h.id === targetHousehold.id ? updatedHousehold : h))
    );

    if (onSaved) {
      onSaved(updatedHousehold, "edit");
    } else {
      navigate(ROUTES.DASHBOARD_HOUSEHOLDS);
    }
  };

  if (mode === "edit" && !targetHousehold) {
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
          trong danh sách hiện tại.
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
        badgeText={
          mode === "edit"
            ? `Chỉnh sửa sổ hộ khẩu • Mã sổ: ${targetHousehold?.code || householdId}`
            : "Lập sổ hộ khẩu điện tử mới"
        }
        badgeSubtext="ĐỀ ÁN 06/CP"
        title={
          mode === "edit"
            ? `Chỉnh sửa Sổ hộ khẩu: ${targetHousehold?.ownerName}`
            : "Lập Sổ Hộ Khẩu Điện Tử Mới"
        }
        description={
          mode === "edit"
            ? "Cập nhật thông tin chủ hộ, địa chỉ cư trú, tọa độ GIS và nhật ký biến động."
            : "Phân khoa số hóa Tư pháp cơ sở — Khởi tạo sổ hộ khẩu điện tử và thành viên ban đầu."
        }
        actions={
          <button
            type="button"
            id="btn-household-form-back"
            onClick={goBackToList}
            className="inline-flex items-center gap-2 min-h-[40px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
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

      {mode === "create" ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 border-b border-slate-200 px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Home className="text-emerald-600" size={18} />
              <span className="font-bold text-xs sm:text-sm text-slate-800">
                Thông tin khởi tạo Sổ hộ khẩu mới
              </span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              Tổng hộ hiện có: {households.length}
            </span>
          </div>

          <form
            onSubmit={handleCreateHousehold}
            className="p-3.5 sm:p-6 space-y-5 text-xs text-slate-700"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="new-h-code"
                  className="font-bold text-slate-700 block"
                >
                  Mã số Sổ Hộ Khẩu *
                </label>
                <input
                  id="new-h-code"
                  type="text"
                  required
                  placeholder="HK-XXX"
                  value={newHCode}
                  onChange={(e) => setNewHCode(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Loại cư trú *
                </label>
                <ReportSelect
                  aria-label="Loại cư trú"
                  value={newHType}
                  onChange={(val) =>
                    setNewHType(val as "Thường trú" | "Tạm trú")
                  }
                  options={[
                    { value: "Thường trú", label: "Thường trú (KT1, KT2)" },
                    { value: "Tạm trú", label: "Tạm trú (KT3, KT4)" },
                  ]}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label
                    htmlFor="new-h-owner"
                    className="font-bold text-slate-700 block"
                  >
                    Tên Chủ hộ mới *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsResidentModalOpen(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <UserCheck size={12} /> Chọn từ 11.632 Cư dân
                  </button>
                </div>
                <input
                  id="new-h-owner"
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-h-owner-cccd"
                    className="font-bold text-slate-700 block"
                  >
                    Số CCCD Chủ hộ
                  </label>
                  <input
                    id="new-h-owner-cccd"
                    type="text"
                    placeholder="Tự động điền khi chọn từ Dân cư hoặc nhập tay..."
                    value={newOwnerCccd}
                    onChange={(e) => setNewOwnerCccd(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-h-owner-phone"
                    className="font-bold text-slate-700 block"
                  >
                    Số điện thoại Chủ hộ
                  </label>
                  <input
                    id="new-h-owner-phone"
                    type="text"
                    placeholder="SĐT liên hệ thực tế (nếu có)..."
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-h-address"
                className="font-bold text-slate-700 block"
              >
                Địa chỉ Đăng ký Thường trú *
              </label>
              <input
                id="new-h-address"
                type="text"
                required
                placeholder="Số..., đường Lương Định Của, Phường An Phú"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <label
                  htmlFor="new-h-coord"
                  className="font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <MapPin size={13} className="text-emerald-600" />
                  <span>Tọa độ GPS WGS84 (Vĩ độ, Kinh độ)</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="font-normal text-slate-500 font-mono">
                    VD: 10.936828, 106.743392
                  </span>
                  {newAddress.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        const auto = generateDefaultCoordinatesForAddress(
                          newAddress,
                          newHCode || "HK-NEW"
                        );
                        handleCoordInputChange(auto.dms);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} className="text-emerald-600" /> Tự động
                      nhận diện
                    </button>
                  )}
                </div>
              </div>
              <input
                id="new-h-coord"
                type="text"
                placeholder="Dán hoặc điền tọa độ GPS có sẵn..."
                value={coordInput}
                onChange={(e) => handleCoordInputChange(e.target.value)}
                className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
              />
              {parsedGPS && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-mono">
                  ✓ Phát hiện hệ WGS84: Vĩ độ <strong>{parsedGPS.lat}</strong>,
                  Kinh độ <strong>{parsedGPS.lng}</strong>
                </div>
              )}
            </div>

            {/* Nhóm Đa Thửa Đất & Nhiều Sổ Đỏ (GCN QSDĐ) */}
            <div className="p-2.5 sm:p-4 border border-indigo-200/80 rounded-xl bg-indigo-50/25">
              <MultiParcelEditor
                sectionTitle="Hồ sơ Địa chính & Giấy chứng nhận QSDĐ (Hỗ trợ Ghép Thửa / Nhiều Sổ Đỏ)"
                parcels={landParcels}
                onChange={setLandParcels}
                defaultOwnerName={newOwner}
                defaultAddress={newAddress}
                onNotice={(n) => setNotice(n)}
              />
            </div>

            {/* Nhóm Hình ảnh Thực tế Nhà ở & Định vị Timemark */}
            <div className="p-4 border border-amber-200/80 rounded-xl bg-amber-50/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Camera size={15} className="text-amber-600" />
                  Hình ảnh Hiện trường &amp; Khảo sát Thực tế Timemark
                </span>
                {timemarkVerified && (
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={11} className="text-emerald-700" /> Đã xác thực Timemark
                  </span>
                )}
              </div>

              {/* Upload Dropzone Timemark */}
              <div className="border-2 border-dashed border-amber-200 hover:border-amber-400 rounded-xl p-3 bg-white text-center transition-colors">
                <input
                  type="file"
                  id="timemark-upload-create"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessImageUpload(file);
                  }}
                />
                <label
                  htmlFor="timemark-upload-create"
                  className="cursor-pointer flex flex-col items-center gap-1 text-xs text-slate-600"
                >
                  <Camera size={18} className="text-amber-600" />
                  <span className="font-bold text-amber-900">
                    {isTimemarkProcessing ? "Đang trích xuất Watermark Timemark..." : "Tải lên ảnh chụp khảo sát Timemark Camera"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Tự động nhận diện Tọa độ GPS, Thời gian chụp, Độ cao, Phương hướng và Mã băm xác thực
                  </span>
                </label>
              </div>

              {houseImage && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-amber-200/70 items-center">
                  <div className="relative h-28 rounded-lg overflow-hidden border border-slate-200">
                    <img src={houseImage} alt="Ảnh thực tế" className="w-full h-full object-cover" />
                    {timemarkHash && (
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/75 text-white px-1.5 py-0.5 rounded">
                        #{timemarkHash}
                      </span>
                    )}
                  </div>
                  <div className="sm:col-span-2 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Tọa độ GPS:</span>
                      <strong className="font-mono text-emerald-800">{coordInput || "Chưa có"}</strong>
                    </div>
                    {photoTakenAt && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Thời gian:</span>
                        <span className="text-slate-800 font-semibold">{photoTakenAt}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-600">
                      {photoElevation && <span>Độ cao: <strong>{photoElevation}</strong></span>}
                      {photoDirection && <span>Hướng: <strong>{photoDirection}</strong></span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-members registration */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-600" />
                  Đăng ký thêm thành viên hộ
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {tempMembers.length} thành viên kèm theo
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  aria-label="Tên thành viên"
                  placeholder="Tên thành viên"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="px-3 h-10 border border-slate-200 rounded-xl bg-white"
                />
                <input
                  type="text"
                  aria-label="Số CCCD"
                  placeholder="Số CCCD"
                  value={newMemberCccd}
                  onChange={(e) => setNewMemberCccd(e.target.value)}
                  className="px-3 h-10 border border-slate-200 rounded-xl bg-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-1">
                  <ReportSelect
                    aria-label="Quan hệ với chủ hộ"
                    value={newMemberRelation}
                    onChange={setNewMemberRelation}
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
                <input
                  type="number"
                  aria-label="Năm sinh"
                  placeholder="Năm sinh"
                  value={newMemberBirthYear}
                  onChange={(e) =>
                    setNewMemberBirthYear(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="sm:col-span-1 px-3 h-10 border border-slate-200 rounded-xl bg-white"
                />
                <input
                  type="text"
                  aria-label="Số điện thoại"
                  placeholder="Số ĐT"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="sm:col-span-1 px-3 h-10 border border-slate-200 rounded-xl bg-white font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleAddTempMember}
                className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl cursor-pointer flex justify-center items-center gap-1.5 text-xs transition-colors"
              >
                <Plus size={14} /> Thêm thành viên vào danh sách tạm
              </button>

              {tempMembers.length > 0 && (
                <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
                  <span className="font-bold text-slate-600 uppercase text-xs block">
                    Danh sách đăng ký tạm ({tempMembers.length})
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {tempMembers.map((m, idx) => (
                      <div
                        key={`${m.cccd}-${idx}`}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl flex justify-between items-center font-mono gap-2"
                      >
                        <span className="truncate">
                          {m.name} ({m.relation}) • {m.cccd} • {m.birthYear}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTempMembers(
                              tempMembers.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer inline-flex items-center gap-1 shrink-0"
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
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
                Lập Sổ Hộ Khẩu
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Home className="text-emerald-600" size={18} />
              <span className="font-bold text-xs sm:text-sm text-slate-800">
                Biểu mẫu chỉnh sửa thông tin Sổ ({targetHousehold?.code})
              </span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              Param edit: {householdId}
            </span>
          </div>

          <form
            onSubmit={handleSaveEditHousehold}
            className="p-3.5 sm:p-6 space-y-5 text-xs text-slate-700"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="edit-h-address"
                className="font-bold text-slate-700 block"
              >
                Địa chỉ cư trú *
              </label>
              <input
                id="edit-h-address"
                type="text"
                required
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="min-h-[24px] flex flex-wrap items-center justify-between gap-1">
                  <label className="font-bold text-slate-700 block">
                    Chủ hộ đại diện *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsResidentModalOpen(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <UserCheck size={12} /> Chọn từ 11.632 Cư dân
                  </button>
                </div>
                {targetHousehold && targetHousehold.members.length > 0 ? (
                  <ReportSelect
                    aria-label="Chủ hộ đại diện"
                    value={editOwner}
                    onChange={setEditOwner}
                    options={[
                      ...targetHousehold.members.map((m) => ({
                        value: m.name,
                        label: `${m.name} (${m.relation})`,
                      })),
                      ...(editOwner &&
                      !targetHousehold.members.some((m) => m.name === editOwner)
                        ? [
                            {
                              value: editOwner,
                              label: `${editOwner} (Cư dân KP3 đã chọn)`,
                            },
                          ]
                        : []),
                    ]}
                    className="w-full"
                  />
                ) : (
                  <input
                    id="edit-h-owner"
                    type="text"
                    required
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="min-h-[24px] flex items-center">
                  <label className="font-bold text-slate-700 block">
                    Phân hệ cư trú
                  </label>
                </div>
                <ReportSelect
                  aria-label="Phân hệ cư trú"
                  value={editType}
                  onChange={(val) =>
                    setEditType(val as "Thường trú" | "Tạm trú")
                  }
                  options={[
                    { value: "Thường trú", label: "Thường trú" },
                    { value: "Tạm trú", label: "Tạm trú" },
                  ]}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <label
                  htmlFor="edit-h-coord"
                  className="font-bold text-slate-700 block"
                >
                  GPS vệ tinh WGS84
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!targetHousehold) return;
                    const auto = generateDefaultCoordinatesForAddress(
                      editAddress || targetHousehold.address,
                      targetHousehold.code
                    );
                    setCoordInput(auto.dms);
                    setParsedGPS(parseGpsPreview(auto.dms));
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={12} className="text-emerald-600" /> Tự động nhận
                  diện từ địa chỉ
                </button>
              </div>
              <input
                id="edit-h-coord"
                type="text"
                placeholder="Dán hoặc chỉnh sửa tọa độ..."
                value={coordInput}
                onChange={(e) => handleCoordInputChange(e.target.value)}
                className="w-full px-3 h-10 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
              {parsedGPS && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-mono">
                  ✓ Phát hiện WGS84: {parsedGPS.lat}, {parsedGPS.lng}
                </div>
              )}
            </div>

            {/* Nhóm Đa Thửa Đất & Nhiều Sổ Đỏ (GCN QSDĐ) */}
            <div className="p-2.5 sm:p-4 border border-indigo-200/80 rounded-xl bg-indigo-50/25">
              <MultiParcelEditor
                sectionTitle="Hồ sơ Địa chính & Giấy chứng nhận QSDĐ (Hỗ trợ Ghép Thửa / Nhiều Sổ Đỏ)"
                parcels={landParcels}
                onChange={setLandParcels}
                defaultOwnerName={editOwner}
                defaultAddress={editAddress}
                onNotice={(n) => setNotice(n)}
              />
            </div>

            {/* Nhóm Hình ảnh Thực tế Nhà ở & Định vị Timemark */}
            <div className="p-4 border border-amber-200/80 rounded-xl bg-amber-50/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Camera size={15} className="text-amber-600" />
                  Hình ảnh Hiện trường &amp; Khảo sát Thực tế Timemark
                </span>
                {timemarkVerified && (
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={11} className="text-emerald-700" /> Đã xác thực Timemark
                  </span>
                )}
              </div>

              {/* Upload Dropzone Timemark */}
              <div className="border-2 border-dashed border-amber-200 hover:border-amber-400 rounded-xl p-3 bg-white text-center transition-colors">
                <input
                  type="file"
                  id="timemark-upload-edit"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessImageUpload(file);
                  }}
                />
                <label
                  htmlFor="timemark-upload-edit"
                  className="cursor-pointer flex flex-col items-center gap-1 text-xs text-slate-600"
                >
                  <Camera size={18} className="text-amber-600" />
                  <span className="font-bold text-amber-900">
                    {isTimemarkProcessing ? "Đang trích xuất Watermark Timemark..." : "Tải lên ảnh chụp khảo sát Timemark Camera"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Tự động nhận diện Tọa độ GPS, Thời gian chụp, Độ cao, Phương hướng và Mã băm xác thực
                  </span>
                </label>
              </div>

              {houseImage && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-amber-200/70 items-center">
                  <div className="relative h-28 rounded-lg overflow-hidden border border-slate-200">
                    <img src={houseImage} alt="Ảnh thực tế" className="w-full h-full object-cover" />
                    {timemarkHash && (
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/75 text-white px-1.5 py-0.5 rounded">
                        #{timemarkHash}
                      </span>
                    )}
                  </div>
                  <div className="sm:col-span-2 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Tọa độ GPS:</span>
                      <strong className="font-mono text-emerald-800">{coordInput || "Chưa có"}</strong>
                    </div>
                    {photoTakenAt && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Thời gian:</span>
                        <span className="text-slate-800 font-semibold">{photoTakenAt}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-600">
                      {photoElevation && <span>Độ cao: <strong>{photoElevation}</strong></span>}
                      {photoDirection && <span>Hướng: <strong>{photoDirection}</strong></span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-h-notes"
                className="font-bold text-slate-600 block"
              >
                Ghi chú biến động / Nguyên nhân thay đổi
              </label>
              <textarea
                id="edit-h-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Nhập ghi chú biến động lưu trữ..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl h-24 focus:outline-none focus:border-emerald-500 bg-white text-sm"
              />
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
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Chọn Cư Dân */}
      <ResidentSelectModal
        isOpen={isResidentModalOpen}
        onClose={() => setIsResidentModalOpen(false)}
        residents={residents}
        targetRole="owner"
        currentValue={mode === "create" ? newOwner : editOwner}
        onSelect={handleSelectResident}
      />
    </div>
  );
}

