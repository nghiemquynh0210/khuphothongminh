import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Bed,
  Check,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Flame,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Business, Resident } from "../../types";
import { loadPortalSetting, savePortalSetting } from "../../utils/supabaseSync";
import { getStaffAuthHeaders } from "../../utils/imageUpload";
import { formatVNNumber } from "../../utils/numberFormat";
import { recordAuditLog } from "../../utils/auditLogger";

export interface PcccInfrastructurePoint {
  id: string;
  pointType:
    | "Tổ Liên gia An toàn PCCC"
    | "Điểm chữa cháy công cộng"
    | "Trụ nước cứu hỏa"
    | "Hẻm hẹp xe chữa cháy khó tiếp cận (<2.5m)";
  name: string;
  address: string;
  equipmentNote: string;
  contactPerson?: string;
  contactPhone?: string;
  lastCheckedDate: string;
  status: "Hoạt động tốt" | "Cần bảo dưỡng / bổ sung bình";
}

export interface HostelCheckinSubmission {
  id: string;
  hostelId: string;
  hostelName: string;
  hostelAddress?: string;
  roomNumber?: string;
  fullName: string;
  gender: "Nam" | "Nữ";
  birthDate: string;
  cccd: string;
  phone: string;
  permanentAddress: string;
  moveInDate: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedBy?: string;
}

const PCCC_POINTS_KEY = "kp3_pccc_points_v1";

const DEFAULT_PCCC_POINTS: PcccInfrastructurePoint[] = [
  {
    id: "PCCC-TLG-01",
    pointType: "Tổ Liên gia An toàn PCCC",
    name: "Tổ Liên gia An toàn PCCC số 01 — Khu phố 3",
    address: "Trục đường D2 & Hẻm 17/A3, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh",
    equipmentNote: "10 chuông báo cháy liên kết, 12 bình bột ABC MFZ4, 02 kìm cộng lực phá khóa",
    contactPerson: "Ban Điều hành KP3",
    lastCheckedDate: new Date().toLocaleDateString("vi-VN"),
    status: "Hoạt động tốt",
  },
  {
    id: "PCCC-DCC-01",
    pointType: "Điểm chữa cháy công cộng",
    name: "Điểm chữa cháy công cộng Hẻm nhà trọ tập trung Tổ 5",
    address: "Đầu hẻm cụm nhà trọ Tổ 5, Khu phố 3, Phường An Phú, TP. Hồ Chí Minh",
    equipmentNote: "Tủ PCCC ngoài trời gồm 04 bình chữa cháy CO2/Bột, tiêu lệnh PCCC, xà beng",
    contactPerson: "Tổ ANTT Cơ sở KP3",
    lastCheckedDate: new Date().toLocaleDateString("vi-VN"),
    status: "Hoạt động tốt",
  },
  {
    id: "PCCC-TRU-01",
    pointType: "Trụ nước cứu hỏa",
    name: "Trụ nước cứu hỏa trục Song Hành – Lương Định Của",
    address: "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh",
    equipmentNote: "Áp lực nước đạt chuẩn tiếp nước xe chữa cháy chuyên dụng",
    lastCheckedDate: new Date().toLocaleDateString("vi-VN"),
    status: "Hoạt động tốt",
  },
];

export interface FireSafetyAndHostelQrHubProps {
  mode: "pccc" | "hostel_qr";
  businesses: Business[];
  onUpdateBusiness?: (updated: Business) => void;
  onAddApprovedResident?: (newResident: Resident) => void;
  actorName?: string;
}

export function FireSafetyAndHostelQrHub({
  mode,
  businesses,
  onUpdateBusiness,
  onAddApprovedResident,
  actorName = "Cán bộ Ban Điều hành KP3",
}: FireSafetyAndHostelQrHubProps) {
  // PCCC State
  const [pcccPoints, setPcccPoints] = useState<PcccInfrastructurePoint[]>(() => {
    try {
      const saved = localStorage.getItem(PCCC_POINTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PCCC_POINTS;
  });
  const [pcccFilter, setPcccFilter] = useState<"all" | "hostels" | "unpassed" | "passed">("all");
  const [pcccSearch, setPcccSearch] = useState("");
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [ptType, setPtType] = useState<PcccInfrastructurePoint["pointType"]>(
    "Tổ Liên gia An toàn PCCC"
  );
  const [ptName, setPtName] = useState("");
  const [ptAddress, setPtAddress] = useState("");
  const [ptEquip, setPtEquip] = useState("");
  const [ptStatus, setPtStatus] = useState<PcccInfrastructurePoint["status"]>("Hoạt động tốt");

  // Hostel QR & Checkin State
  const hostels = useMemo(
    () => businesses.filter((b) => b.isAccommodation),
    [businesses]
  );
  const [selectedHostelId, setSelectedHostelId] = useState<string>("");
  const [hostelSearch, setHostelSearch] = useState("");
  const [checkins, setCheckins] = useState<HostelCheckinSubmission[]>([]);
  const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
  const [copiedQrLink, setCopiedQrLink] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedHostelId && hostels[0]?.id) {
      setSelectedHostelId(hostels[0].id);
    }
  }, [hostels, selectedHostelId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const cloud = await loadPortalSetting<PcccInfrastructurePoint[]>(PCCC_POINTS_KEY);
      if (active && Array.isArray(cloud) && cloud.length > 0) {
        setPcccPoints(cloud);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persistPcccPoints = async (next: PcccInfrastructurePoint[]) => {
    setPcccPoints(next);
    try {
      localStorage.setItem(PCCC_POINTS_KEY, JSON.stringify(next));
    } catch {}
    await savePortalSetting(PCCC_POINTS_KEY, next, false);
  };

  const loadCheckins = useCallback(async () => {
    setIsLoadingCheckins(true);
    try {
      const authHeaders = await getStaffAuthHeaders();
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "list_hostel_checkins" }),
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data?.items)) {
        setCheckins(data.items);
      }
    } catch {
      // ignore offline
    } finally {
      setIsLoadingCheckins(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "hostel_qr") {
      loadCheckins();
    }
  }, [mode, loadCheckins]);

  const pcccSummary = useMemo(() => {
    const total = businesses.length;
    const passed = businesses.filter((b) => b.safetyCertified !== false).length;
    const unpassed = total - passed;
    const hostelTotal = hostels.length;
    const hostelPassed = hostels.filter((h) => h.safetyCertified !== false).length;
    return { total, passed, unpassed, hostelTotal, hostelPassed };
  }, [businesses, hostels]);

  const filteredPcccBusinesses = useMemo(() => {
    const q = pcccSearch.trim().toLowerCase();
    return businesses.filter((b) => {
      if (pcccFilter === "hostels" && !b.isAccommodation) return false;
      if (pcccFilter === "unpassed" && b.safetyCertified !== false) return false;
      if (pcccFilter === "passed" && b.safetyCertified === false) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.owner || "").toLowerCase().includes(q) ||
        (b.address || "").toLowerCase().includes(q)
      );
    });
  }, [businesses, pcccFilter, pcccSearch]);

  const handleToggleBusinessPccc = (biz: Business) => {
    if (!onUpdateBusiness) return;
    const nextPassed = biz.safetyCertified === false ? true : false;
    onUpdateBusiness({
      ...biz,
      safetyCertified: nextPassed,
    });
    setNotice(
      `Đã cập nhật "${biz.name}" sang trạng thái: ${
        nextPassed ? "Đạt chuẩn PCCC" : "Cần kiểm tra / bổ sung PCCC"
      }`
    );
    setTimeout(() => setNotice(null), 3500);
  };

  const handleAddPcccPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptName.trim() || !ptAddress.trim()) return;
    const newPt: PcccInfrastructurePoint = {
      id: `PCCC-${Date.now().toString().slice(-5)}`,
      pointType: ptType,
      name: ptName.trim(),
      address: ptAddress.trim(),
      equipmentNote: ptEquip.trim() || "Bình chữa cháy xách tay, tiêu lệnh PCCC",
      lastCheckedDate: new Date().toLocaleDateString("vi-VN"),
      status: ptStatus,
    };
    await persistPcccPoints([newPt, ...pcccPoints]);
    setPtName("");
    setPtAddress("");
    setPtEquip("");
    setShowAddPoint(false);
  };

  const handleExportPcccExcel = () => {
    const bizRows = filteredPcccBusinesses.map((b, idx) => ({
      STT: idx + 1,
      "Tên cơ sở / Nhà trọ": b.name,
      "Loại hình": b.isAccommodation ? "Cơ sở nhà trọ lưu trú" : b.type,
      "Chủ cơ sở": b.owner,
      "Số điện thoại": b.phone || "",
      "Địa chỉ": b.address,
      "Quy mô phòng": b.roomCount || "",
      "Trạng thái PCCC": b.safetyCertified === false ? "Cần bổ sung / Kiểm tra" : "Đạt chuẩn PCCC",
    }));

    const ptRows = pcccPoints.map((p, idx) => ({
      STT: idx + 1,
      "Phân loại": p.pointType,
      "Tên điểm PCCC": p.name,
      "Địa chỉ lắp đặt": p.address,
      "Trang thiết bị": p.equipmentNote,
      "Ngày kiểm tra gần nhất": p.lastCheckedDate,
      "Tình trạng": p.status,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bizRows), "CoSo_PCCC");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ptRows), "ToLienGia_DiemChuaChay");
    const fileName = `Bao_cao_PCCC_KP3_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    recordAuditLog({
      actorName,
      actorRole: "Cán bộ BĐH Khu phố 3",
      category: "DATA_EXPORT",
      actionTitle: "Xuất Báo cáo An toàn PCCC cơ sở & Tổ liên gia (.xlsx)",
      targetSummary: `${bizRows.length} cơ sở & ${ptRows.length} điểm PCCC (${fileName})`,
    });
  };

  // Hostel QR helpers
  const selectedHostel = useMemo(
    () => hostels.find((h) => h.id === selectedHostelId) || hostels[0] || null,
    [hostels, selectedHostelId]
  );

  const filteredHostels = useMemo(() => {
    const q = hostelSearch.trim().toLowerCase();
    return hostels.filter(
      (h) =>
        !q ||
        h.name.toLowerCase().includes(q) ||
        (h.owner || "").toLowerCase().includes(q) ||
        (h.address || "").toLowerCase().includes(q)
    );
  }, [hostels, hostelSearch]);

  const checkinUrl = useMemo(() => {
    if (!selectedHostel) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://bdhkp3.vercel.app";
    const params = new URLSearchParams({
      hostel_checkin: selectedHostel.id,
      hostel_name: selectedHostel.name,
      hostel_addr: selectedHostel.address || "",
    });
    return `${origin}/?${params.toString()}`;
  }, [selectedHostel]);

  const qrImgSrc = useMemo(() => {
    if (!checkinUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(
      checkinUrl
    )}`;
  }, [checkinUrl]);

  const handlePrintHostelPoster = () => {
    if (!selectedHostel) return;
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Phiếu QR Khai Báo Lưu Trú — ${selectedHostel.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; text-align: center; }
    .box { border: 3px solid #047857; border-radius: 20px; padding: 28px; max-width: 520px; margin: 0 auto; }
    .sub { font-size: 13px; font-weight: bold; color: #047857; text-transform: uppercase; letter-spacing: 1px; }
    h1 { font-size: 22px; margin: 10px 0 6px; }
    .hostel { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 4px; }
    .addr { font-size: 13px; color: #475569; margin-bottom: 18px; }
    img { width: 260px; height: 260px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; }
    .guide { font-size: 13px; line-height: 1.6; margin-top: 16px; color: #334155; text-align: left; background: #f8fafc; padding: 14px; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="sub">BAN ĐIỀU HÀNH & CÔNG AN KHU VỰC KHU PHỐ 3 • PHƯỜNG AN PHÚ</div>
    <h1>QUÉT MÃ QR KHAI BÁO LƯU TRÚ</h1>
    <div class="hostel">${selectedHostel.name}</div>
    <div class="addr">${selectedHostel.address || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"}</div>
    <img src="${qrImgSrc}" alt="QR Khai báo lưu trú" onload="window.print()" />
    <div class="guide">
      <strong>Hướng dẫn dành cho người mới đến thuê trọ / lưu trú:</strong><br/>
      1. Mở ứng dụng <strong>Zalo</strong> hoặc <strong>Camera điện thoại</strong> quét mã QR phía trên.<br/>
      2. Điền thông tin Căn cước, ngày đến thuê và số phòng (chỉ mất 30 giây).<br/>
      3. Chủ nhà trọ và Cảnh sát khu vực Khu phố 3 tiếp nhận đối chiếu đăng ký tạm trú CT08 đúng quy định Luật Cư trú.
    </div>
  </div>
</body>
</html>`);
    win.document.close();
  };

  const handleReviewCheckin = async (
    item: HostelCheckinSubmission,
    nextStatus: "approved" | "rejected"
  ) => {
    try {
      const authHeaders = await getStaffAuthHeaders();
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          action: "update_hostel_checkin_status",
          id: item.id,
          status: nextStatus,
        }),
      });

      if (nextStatus === "approved" && onAddApprovedResident) {
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 1);
        const newRes: Resident = {
          id: `RES-QR-${Date.now().toString().slice(-6)}`,
          fullName: item.fullName.toUpperCase(),
          gender: item.gender,
          birthDate: item.birthDate || "Chưa cập nhật",
          cccd: item.cccd,
          phone: item.phone,
          status: "Tạm trú",
          occupation: "Lao động / Lưu trú nhà trọ",
          address: `${item.hostelName}${item.roomNumber ? ` (Phòng ${item.roomNumber})` : ""}, ${
            item.hostelAddress || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"
          }`,
          currentAddress: `${item.hostelName}${
            item.roomNumber ? ` (Phòng ${item.roomNumber})` : ""
          }, ${item.hostelAddress || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh"}`,
          permanentAddress: item.permanentAddress || "Chưa cập nhật",
          temporaryRegDate: item.moveInDate || new Date().toLocaleDateString("vi-VN"),
          temporaryExpDate: expDate.toLocaleDateString("vi-VN"),
          householdId: "Tạm trú",
          relationToOwner: "Người thuê trọ",
          ownerName: item.hostelName,
          avatar: "",
        };
        onAddApprovedResident(newRes);
      }

      setCheckins((prev) =>
        prev.map((c) =>
          c.id === item.id ? { ...c, status: nextStatus, reviewedBy: actorName } : c
        )
      );
      setNotice(
        nextStatus === "approved"
          ? `Đã duyệt tờ khai của ${item.fullName} và bổ sung vào danh sách Nhân khẩu Tạm trú!`
          : `Đã từ chối tờ khai lưu trú của ${item.fullName}.`
      );
      setTimeout(() => setNotice(null), 4000);
    } catch {
      // ignore
    }
  };

  if (mode === "pccc") {
    return (
      <div className="space-y-4 text-xs">
        {notice && (
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-medium text-emerald-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              {notice}
            </span>
            <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
              <X size={13} />
            </button>
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 font-medium">Cơ sở Đạt chuẩn PCCC</div>
            <div className="text-lg font-extrabold text-emerald-700 mt-1">
              {pcccSummary.passed}/{pcccSummary.total}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Nhà trọ đạt: {pcccSummary.hostelPassed}/{pcccSummary.hostelTotal}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 font-medium">Cần kiểm tra / Khắc phục</div>
            <div className="text-lg font-extrabold text-rose-700 mt-1">
              {pcccSummary.unpassed} cơ sở
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ưu tiên hậu kiểm bình chữa cháy</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 font-medium">Tổ Liên gia PCCC</div>
            <div className="text-lg font-extrabold text-slate-900 mt-1">
              {pcccPoints.filter((p) => p.pointType === "Tổ Liên gia An toàn PCCC").length} tổ
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Chuông báo cháy liên gia</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 font-medium">Điểm chữa cháy & Trụ nước</div>
            <div className="text-lg font-extrabold text-blue-700 mt-1">
              {pcccPoints.filter((p) => p.pointType !== "Tổ Liên gia An toàn PCCC").length} điểm
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Sẵn sàng ứng cứu ban đầu</div>
          </div>
        </div>

        {/* Section 1: Tổ Liên gia & Điểm chữa cháy công cộng */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-rose-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Mạng lưới Tổ Liên Gia PCCC, Điểm Chữa Cháy Công Cộng & Trụ Nước ({pcccPoints.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPcccExcel}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={13} className="text-emerald-700" />
                <span>Xuất Báo cáo PCCC (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddPoint((v) => !v)}
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Thêm Điểm PCCC</span>
              </button>
            </div>
          </div>

          {showAddPoint && (
            <form
              onSubmit={handleAddPcccPoint}
              className="p-3 rounded-lg bg-rose-50/50 border border-rose-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5"
            >
              <div className="sm:col-span-3">
                <select
                  id="pccc-point-type"
                  name="pcccPointType"
                  value={ptType}
                  onChange={(e) => setPtType(e.target.value as any)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                >
                  <option value="Tổ Liên gia An toàn PCCC">Tổ Liên gia An toàn PCCC</option>
                  <option value="Điểm chữa cháy công cộng">Điểm chữa cháy công cộng</option>
                  <option value="Trụ nước cứu hỏa">Trụ nước cứu hỏa</option>
                  <option value="Hẻm hẹp xe chữa cháy khó tiếp cận (<2.5m)">
                    Hẻm hẹp (&lt;2.5m)
                  </option>
                </select>
              </div>
              <div className="sm:col-span-4">
                <input
                  id="pccc-point-name"
                  name="pcccPointName"
                  type="text"
                  required
                  value={ptName}
                  onChange={(e) => setPtName(e.target.value)}
                  placeholder="Tên Tổ liên gia / Điểm chữa cháy..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  id="pccc-point-addr"
                  name="pcccPointAddr"
                  type="text"
                  required
                  value={ptAddress}
                  onChange={(e) => setPtAddress(e.target.value)}
                  placeholder="Vị trí lắp đặt cụ thể tại Khu phố 3..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>
              <div className="sm:col-span-7">
                <input
                  id="pccc-point-equip"
                  name="pcccPointEquip"
                  type="text"
                  value={ptEquip}
                  onChange={(e) => setPtEquip(e.target.value)}
                  placeholder="Số bình bột, bình CO2, chuông liên gia, kìm phá khóa..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <select
                  id="pccc-point-status"
                  name="pcccPointStatus"
                  value={ptStatus}
                  onChange={(e) => setPtStatus(e.target.value as any)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                >
                  <option value="Hoạt động tốt">Hoạt động tốt</option>
                  <option value="Cần bảo dưỡng / bổ sung bình">Cần bảo dưỡng / nạp bình</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                <button
                  type="submit"
                  className="h-9 px-3 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer w-full"
                >
                  Lưu điểm
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {pcccPoints.map((pt) => (
              <div
                key={pt.id}
                className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1.5 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                      {pt.pointType}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        persistPcccPoints(pcccPoints.filter((x) => x.id !== pt.id))
                      }
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Xóa điểm PCCC"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="font-bold text-slate-900">{pt.name}</div>
                  <div className="text-[11px] text-slate-600 flex items-start gap-1">
                    <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                    <span>{pt.address}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{pt.equipmentNote}</div>
                </div>
                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">KT: {pt.lastCheckedDate}</span>
                  <span
                    className={`font-bold ${
                      pt.status === "Hoạt động tốt" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {pt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Hậu kiểm PCCC 118+ Cơ sở kinh doanh & Nhà trọ */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: `Tất cả (${businesses.length})` },
                  { id: "hostels", label: `Nhà trọ lưu trú (${hostels.length})` },
                  { id: "unpassed", label: `Cần kiểm tra (${pcccSummary.unpassed})` },
                  { id: "passed", label: `Đạt chuẩn (${pcccSummary.passed})` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPcccFilter(t.id)}
                  className={`h-8 px-3 rounded-lg font-semibold cursor-pointer ${
                    pcccFilter === t.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="pccc-biz-search"
                name="pcccBizSearch"
                type="search"
                value={pcccSearch}
                onChange={(e) => setPcccSearch(e.target.value)}
                placeholder="Tìm tên nhà trọ, chủ cơ sở, địa chỉ..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white text-xs"
              />
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Cơ sở / Nhà trọ</th>
                  <th className="py-2.5 px-3">Chủ cơ sở & SĐT</th>
                  <th className="py-2.5 px-3">Quy mô</th>
                  <th className="py-2.5 px-3">Trạng thái PCCC</th>
                  <th className="py-2.5 px-3 text-right">Cập nhật nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPcccBusinesses.slice(0, 120).map((b) => {
                  const passed = b.safetyCertified !== false;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{b.name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                          {b.address}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800">{b.owner}</div>
                        {b.phone && (
                          <a
                            href={`tel:${b.phone}`}
                            className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Phone size={10} />
                            {b.phone}
                          </a>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {b.isAccommodation ? `${b.roomCount || 5} phòng trọ` : b.type}
                      </td>
                      <td className="py-2 px-3">
                        {passed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
                            <ShieldCheck size={12} />
                            Đạt chuẩn PCCC
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-bold text-[11px]">
                            <ShieldAlert size={12} />
                            Cần bổ sung bình / lối thoát
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {onUpdateBusiness && (
                          <button
                            type="button"
                            onClick={() => handleToggleBusinessPccc(b)}
                            className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            {passed ? "Đánh dấu Cần KT" : "Xác nhận Đạt"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // MODE === "hostel_qr"
  const pendingCheckins = checkins.filter((c) => c.status === "pending");

  return (
    <div className="space-y-4 text-xs">
      {notice && (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-medium text-emerald-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <X size={13} />
          </button>
        </div>
      )}

      {/* QR Generator Split */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Hostel Picker */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200/80 p-3.5 space-y-2.5 bg-slate-50/40">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Bed size={15} className="text-amber-600" />
              Chọn Nhà trọ cấp Mã QR ({formatVNNumber(hostels.length)})
            </span>
          </div>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="hostel-qr-search"
              name="hostelQrSearch"
              type="search"
              value={hostelSearch}
              onChange={(e) => setHostelSearch(e.target.value)}
              placeholder="Tìm tên nhà trọ, chủ trọ, địa chỉ..."
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs"
            />
          </div>
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-200/60 bg-white rounded-lg border border-slate-200/80">
            {filteredHostels.map((h) => {
              const active = selectedHostel?.id === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHostelId(h.id)}
                  className={`w-full p-2.5 text-left cursor-pointer transition-colors ${
                    active
                      ? "bg-emerald-50 border-l-2 border-l-emerald-700"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-slate-900 truncate">{h.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Chủ trọ: {h.owner} • {h.roomCount || 5} phòng
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Printable QR Card */}
        <div className="lg:col-span-7 p-5 flex flex-col items-center justify-center text-center space-y-3">
          {selectedHostel ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                <QrCode size={13} />
                MÃ QR TỰ KHAI BÁO LƯU TRÚ DÁN TẠI NHÀ TRỌ
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedHostel.name}
              </h3>
              <p className="text-xs text-slate-500 max-w-md">{selectedHostel.address}</p>

              <div className="p-3 bg-white rounded-2xl border-2 border-emerald-600/30 shadow-xs">
                <img
                  src={qrImgSrc}
                  alt={`QR ${selectedHostel.name}`}
                  className="w-48 h-48 object-contain"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrintHostelPoster}
                  className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>In Bảng QR Dán Cổng Trọ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(checkinUrl);
                    setCopiedQrLink(true);
                    setTimeout(() => setCopiedQrLink(false), 2000);
                  }}
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedQrLink ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                  <span>{copiedQrLink ? "Đã chép link gửi Zalo chủ trọ" : "Sao chép Link Khai báo"}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-slate-500">Chưa có cơ sở nhà trọ nào.</div>
          )}
        </div>
      </div>

      {/* Submitted Checkin Queue */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus size={15} className="text-blue-600" />
            <h3 className="font-bold text-slate-900">
              Tờ Khai Lưu Trú Mới Qua Mã QR Chờ Đối Chiếu CT08 ({pendingCheckins.length} chờ duyệt)
            </h3>
          </div>
          <button
            type="button"
            onClick={loadCheckins}
            disabled={isLoadingCheckins}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={isLoadingCheckins ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>
        </div>

        {checkins.length === 0 ? (
          <div className="py-6 text-center text-slate-500">
            Chưa có tờ khai lưu trú mới nào gửi qua mã QR. Khi người thuê trọ mới quét mã QR và gửi
            thông tin, danh sách sẽ hiển thị tại đây để CSKV &amp; BĐH Khu phố 3 duyệt 1 chạm.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2 px-3">Người khai báo</th>
                  <th className="py-2 px-3">CCCD • SĐT</th>
                  <th className="py-2 px-3">Nhà trọ & Phòng</th>
                  <th className="py-2 px-3">Thường trú gốc</th>
                  <th className="py-2 px-3 text-right">Xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checkins.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{c.fullName}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.gender} • NS: {c.birthDate}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      <div>{c.cccd}</div>
                      <div className="text-slate-500">{c.phone}</div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-800">{c.hostelName}</div>
                      {c.roomNumber && (
                        <div className="text-[11px] text-amber-700">Phòng {c.roomNumber}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate">
                      {c.permanentAddress}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {c.status === "pending" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleReviewCheckin(c, "approved")}
                            className="h-7 px-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                          >
                            Duyệt Tạm trú
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewCheckin(c, "rejected")}
                            className="h-7 px-2 rounded border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                            c.status === "approved"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.status === "approved" ? "Đã duyệt CT08" : "Đã từ chối"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
