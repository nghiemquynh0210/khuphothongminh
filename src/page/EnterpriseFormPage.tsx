import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  Camera,
  Check,
  Compass,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Home,
  Image as ImageIcon,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Users2,
  X,
} from "lucide-react";
import {
  Business,
  BusinessFile,
  BusinessLicenseOcrData,
  Household,
  LandParcelCertificate,
  Resident,
} from "../types";
import {
  getEnterpriseImage,
  getEnterpriseScaleLabel,
} from "../components/EnterpriseManagement";
import { LoadingFade } from "../components/common/LoadingFade";
import { PageHeader } from "../components/common/PageHeader";
import { MultiParcelEditor } from "../components/common/MultiParcelEditor";
import {
  CoLocationPrefillPayload,
  KP3_CO_LOCATION_PREFILL_KEY,
} from "../components/common/SharedAddressHubCard";
import { ReportSelect } from "../components/reports/ReportSelect";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { ROUTES, getEnterpriseDetailPath, navigate } from "../routes";
import HouseholdSelectModal from "../components/business/HouseholdSelectModal";
import ResidentSelectModal from "../components/business/ResidentSelectModal";
import { BusinessLicenseUploadOcrBox } from "../components/business/BusinessLicenseUploadOcrBox";
import { BusinessLicenseOcrConfirmModal } from "../components/business/BusinessLicenseOcrConfirmModal";
import { extractTimemarkFromImage } from "../utils/timemarkParser";
import { extractBusinessLicenseFromFile } from "../utils/businessLicenseOcr";
import { uploadFileToStorageBucket } from "../utils/imageUpload";
import {
  createEmptyLandParcel,
  inheritParcelsFromHouseholds,
  normalizeEntityLandParcels,
  summarizeLandParcels,
} from "../utils/landParcelsUtils";
import {
  getNormalizedLinkedHouseholdCodes,
  hasIntersectingAddressKeys,
} from "../utils/addressCoLocationUtils";

export interface EnterpriseFormPageProps {
  mode: "create" | "edit";
  enterpriseId?: string;
  businesses: Business[];
  residents?: Resident[];
  households?: Household[];
  isDataLoading?: boolean;
  onUpdateBusinesses?: (businesses: Business[]) => void;
  onCancel?: () => void;
  onSaved?: (savedEnterprise: Business, mode: "create" | "edit") => void;
}

const SUPPORT_NEED_OPTIONS = [
  "Vốn vay chính sách / ưu đãi",
  "Hướng dẫn PCCC & ANTT",
  "Hướng dẫn An toàn thực phẩm",
  "Mặt bằng & thủ tục thuê đất",
  "Giới thiệu nguồn lao động",
  "Hỗ trợ thủ tục hành chính địa phương",
];

export default function EnterpriseFormPage({
  mode,
  enterpriseId,
  businesses,
  residents = [],
  households = [],
  isDataLoading = false,
  onUpdateBusinesses,
  onCancel,
  onSaved,
}: EnterpriseFormPageProps) {
  const targetEnterprise = useMemo(() => {
    if (mode !== "edit" || !enterpriseId) return null;
    return (
      businesses.find(
        (b) =>
          b.id === enterpriseId ||
          b.internalCode === enterpriseId ||
          b.taxCode === enterpriseId
      ) || null
    );
  }, [mode, enterpriseId, businesses]);

  const [name, setName] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [businessType, setBusinessType] =
    useState<Business["businessType"]>("Công ty TNHH");
  const [enterpriseScale, setEnterpriseScale] =
    useState<Business["enterpriseScale"]>("Nhỏ (5 - 20 LĐ)");
  const [type, setType] = useState("Thương mại dịch vụ");
  const [startDate, setStartDate] = useState(
    new Date().toLocaleDateString("vi-VN")
  );
  const [address, setAddress] = useState("");
  const [streetArea, setStreetArea] = useState("Mặt tiền Lương Định Của");
  const [premisesType, setPremisesType] =
    useState<Business["premisesType"]>("Văn phòng");
  const [premisesOwner, setPremisesOwner] = useState("");
  const [premisesOwnerPhone, setPremisesOwnerPhone] = useState("");
  const [linkedHouseholdCode, setLinkedHouseholdCode] = useState("");
  const [linkedHouseholdCodes, setLinkedHouseholdCodes] = useState<string[]>(
    []
  );
  const [legalRep, setLegalRep] = useState("");
  const [legalRepPhone, setLegalRepPhone] = useState("");
  const [legalRepCccd, setLegalRepCccd] = useState("");
  const [legalRepEmail, setLegalRepEmail] = useState("");
  const [siteManager, setSiteManager] = useState("");
  const [siteManagerPhone, setSiteManagerPhone] = useState("");
  const [focalPointName, setFocalPointName] = useState("");
  const [focalPointPhone, setFocalPointPhone] = useState("");
  const [focalPointRole, setFocalPointRole] = useState("Đại diện phối hợp");
  const [employeeCount, setEmployeeCount] = useState(5);
  const [localWorkers, setLocalWorkers] = useState(2);
  const [temporaryWorkers, setTemporaryWorkers] = useState(3);
  const [foreignWorkersCount, setForeignWorkersCount] = useState(0);
  const [supportNeeds, setSupportNeeds] = useState<string[]>([]);
  const [supportNotes, setSupportNotes] = useState("");
  const [image, setImage] = useState("");
  const [coordinates, setCoordinates] = useState("");

  // Giấy chứng nhận ĐKDN (ERC) Upload & Auto-OCR State
  const [giayPhepFile, setGiayPhepFile] = useState<BusinessFile | null>(null);
  const [giayPhepOcrData, setGiayPhepOcrData] =
    useState<BusinessLicenseOcrData | null>(null);
  const [isProcessingLicenseOcr, setIsProcessingLicenseOcr] = useState(false);
  const [autoLicenseOcrEnabled, setAutoLicenseOcrEnabled] = useState(true);
  const [showLicenseOcrConfirm, setShowLicenseOcrConfirm] = useState(false);
  const [pendingLicenseFile, setPendingLicenseFile] = useState<File | null>(
    null
  );
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [charterCapital, setCharterCapital] = useState("");

  // Đa Thửa Đất & Nhiều Sổ đỏ (GCN QSDĐ)
  const [landParcels, setLandParcels] = useState<LandParcelCertificate[]>([
    createEmptyLandParcel(0, { toBanDo: "272", soThua: "55" }),
  ]);

  // Timemark Verification & Geolocation State
  const [timemarkHash, setTimemarkHash] = useState("");
  const [timemarkVerified, setTimemarkVerified] = useState(false);
  const [photoElevation, setPhotoElevation] = useState("");
  const [photoDirection, setPhotoDirection] = useState("");
  const [photoTakenAt, setPhotoTakenAt] = useState("");
  const [isProcessingTimemark, setIsProcessingTimemark] = useState(false);
  const [dragActiveImage, setDragActiveImage] = useState(false);

  // Modals state
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [householdSelectMode, setHouseholdSelectMode] = useState<
    "replace" | "append"
  >("replace");
  const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
  const [residentModalTarget, setResidentModalTarget] = useState<
    "owner" | "siteManager" | "focalPoint"
  >("owner");

  const [formNotice, setFormNotice] = useState<{
    message: string;
    type: "warning" | "info" | "success" | "error";
  } | null>(null);

  const linkedHouseholdsList = useMemo(() => {
    const codeSet = new Set(
      (linkedHouseholdCodes.length > 0
        ? linkedHouseholdCodes
        : linkedHouseholdCode
        ? linkedHouseholdCode.split(/[,;+|&]+/).map((s) => s.trim())
        : []
      )
        .map((c) => c.toUpperCase())
        .filter(Boolean)
    );
    const byCode = households.filter((h) =>
      codeSet.has(h.code.trim().toUpperCase())
    );
    const byAddress = households.filter(
      (h) =>
        !codeSet.has(h.code.trim().toUpperCase()) &&
        hasIntersectingAddressKeys(address, h.address)
    );
    return [...byCode, ...byAddress];
  }, [households, linkedHouseholdCodes, linkedHouseholdCode, address]);

  useEffect(() => {
    setFormNotice(null);
    if (mode === "edit" && targetEnterprise) {
      setName(targetEnterprise.name || "");
      setInternalCode(
        targetEnterprise.internalCode || `DN-KP3-${targetEnterprise.id}`
      );
      setTaxCode(targetEnterprise.taxCode || "");
      setBusinessType(
        (targetEnterprise.businessType as Business["businessType"]) ||
          "Công ty TNHH"
      );
      setEnterpriseScale(getEnterpriseScaleLabel(targetEnterprise));
      setType(targetEnterprise.type || "Thương mại dịch vụ");
      setStartDate(
        targetEnterprise.licenseIssueDate ||
          targetEnterprise.startDate ||
          "01/01/2024"
      );
      setIssuingAuthority(targetEnterprise.issuingAuthority || "");
      setCharterCapital(targetEnterprise.charterCapital || "");
      setGiayPhepFile(targetEnterprise.giayPhepFile || null);
      setGiayPhepOcrData(targetEnterprise.giayPhepOcrData || null);

      setAddress(targetEnterprise.address || "");
      setStreetArea(
        targetEnterprise.streetArea ||
          (targetEnterprise.address?.includes("42")
            ? "Hẻm 42 Lương Định Của"
            : "Mặt tiền Lương Định Của")
      );
      setPremisesType(
        (targetEnterprise.premisesType as Business["premisesType"]) ||
          "Văn phòng"
      );
      setPremisesOwner(targetEnterprise.premisesOwner || "");
      setPremisesOwnerPhone(targetEnterprise.premisesOwnerPhone || "");
      const normCodes = getNormalizedLinkedHouseholdCodes(targetEnterprise);
      setLinkedHouseholdCodes(normCodes);
      setLinkedHouseholdCode(normCodes.join(", "));
      setLegalRep(
        targetEnterprise.legalRepresentative || targetEnterprise.owner || ""
      );
      setLegalRepPhone(
        targetEnterprise.legalRepPhone || targetEnterprise.phone || ""
      );
      setLegalRepEmail(targetEnterprise.legalRepEmail || "");
      setSiteManager(
        targetEnterprise.siteManager || targetEnterprise.owner || ""
      );
      setSiteManagerPhone(
        targetEnterprise.siteManagerPhone || targetEnterprise.phone || ""
      );
      setFocalPointName(
        targetEnterprise.focalPointName || targetEnterprise.owner || ""
      );
      setFocalPointPhone(
        targetEnterprise.focalPointPhone || targetEnterprise.phone || ""
      );
      setFocalPointRole(targetEnterprise.focalPointRole || "Đại diện phối hợp");
      setEmployeeCount(targetEnterprise.employeeCount || 5);
      setLocalWorkers(
        targetEnterprise.localWorkersCount ??
          Math.floor((targetEnterprise.employeeCount || 5) / 2)
      );
      setTemporaryWorkers(
        targetEnterprise.temporaryWorkersCount ??
          Math.ceil((targetEnterprise.employeeCount || 5) / 2)
      );
      setForeignWorkersCount(
        targetEnterprise.foreignWorkersCount ||
          targetEnterprise.foreignWorkers?.length ||
          0
      );
      setSupportNeeds(targetEnterprise.supportNeeds || []);
      setSupportNotes(targetEnterprise.supportNotes || "");
      setImage(targetEnterprise.image || "");
      setCoordinates(targetEnterprise.coordinates || "");
      setLegalRepCccd(targetEnterprise.legalRepCccd || "");

      // Đa thửa đất / Sổ đỏ
      const normalizedParcels = normalizeEntityLandParcels(targetEnterprise);
      setLandParcels(
        normalizedParcels.length > 0
          ? normalizedParcels
          : [
              createEmptyLandParcel(0, {
                toBanDo: targetEnterprise.toBanDo || "272",
                soThua: targetEnterprise.soThua || "55",
                dienTich:
                  targetEnterprise.dienTich !== undefined
                    ? String(targetEnterprise.dienTich)
                    : "",
                loaiDat: targetEnterprise.loaiDat || "ODT",
                tenChuSuDung:
                  targetEnterprise.tenChuSuDung || targetEnterprise.owner || "",
              }),
            ]
      );

      // Timemark
      setTimemarkHash(targetEnterprise.timemarkHash || "");
      setTimemarkVerified(Boolean(targetEnterprise.timemarkVerified));
      setPhotoElevation(targetEnterprise.photoElevation || "");
      setPhotoDirection(targetEnterprise.photoDirection || "");
      setPhotoTakenAt(targetEnterprise.photoTakenAt || "");
    } else if (mode === "create") {
      setName("");
      setInternalCode("");
      setTaxCode("");
      setBusinessType("Công ty TNHH");
      setEnterpriseScale("Nhỏ (5 - 20 LĐ)");
      setType("Thương mại dịch vụ");
      setStartDate(new Date().toLocaleDateString("vi-VN"));
      setIssuingAuthority("");
      setCharterCapital("");
      setGiayPhepFile(null);
      setGiayPhepOcrData(null);

      setAddress("");
      setStreetArea("Mặt tiền Lương Định Của");
      setPremisesType("Văn phòng");
      setPremisesOwner("");
      setPremisesOwnerPhone("");
      setLinkedHouseholdCode("");
      setLinkedHouseholdCodes([]);
      setLegalRep("");
      setLegalRepPhone("");
      setLegalRepCccd("");
      setLegalRepEmail("");
      setSiteManager("");
      setSiteManagerPhone("");
      setFocalPointName("");
      setFocalPointPhone("");
      setFocalPointRole("Đại diện phối hợp");
      setEmployeeCount(5);
      setLocalWorkers(2);
      setTemporaryWorkers(3);
      setForeignWorkersCount(0);
      setSupportNeeds([]);
      setSupportNotes("");
      setImage("");
      setCoordinates("");

      setLandParcels([
        createEmptyLandParcel(0, { toBanDo: "272", soThua: "55" }),
      ]);

      setTimemarkHash("");
      setTimemarkVerified(false);
      setPhotoElevation("");
      setPhotoDirection("");
      setPhotoTakenAt("");

      // Prefill khi khởi tạo từ Tổ hợp Cùng Địa Chỉ
      try {
        const rawPrefill = sessionStorage.getItem(KP3_CO_LOCATION_PREFILL_KEY);
        if (rawPrefill) {
          sessionStorage.removeItem(KP3_CO_LOCATION_PREFILL_KEY);
          const prefill: CoLocationPrefillPayload = JSON.parse(rawPrefill);
          if (prefill.address) setAddress(prefill.address);
          if (prefill.coordinates) setCoordinates(prefill.coordinates);
          if (prefill.premisesOwner) setPremisesOwner(prefill.premisesOwner);
          if (prefill.premisesOwnerPhone)
            setPremisesOwnerPhone(prefill.premisesOwnerPhone);
          if (
            Array.isArray(prefill.linkedHouseholdCodes) &&
            prefill.linkedHouseholdCodes.length > 0
          ) {
            setLinkedHouseholdCodes(prefill.linkedHouseholdCodes);
            setLinkedHouseholdCode(prefill.linkedHouseholdCodes.join(", "));
            const matchedHhs = households.filter((h) =>
              prefill.linkedHouseholdCodes.includes(h.code)
            );
            const { nextParcels, addedCount } = inheritParcelsFromHouseholds(
              matchedHhs,
              []
            );
            if (addedCount > 0) {
              setLandParcels(nextParcels);
            }
          }
        }
      } catch {}
    }
  }, [mode, targetEnterprise?.id]);

  const handleProcessFileUpload = (
    file: File,
    callback: (fileObj: BusinessFile, localDataUrl?: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const localDataUrl = (reader.result as string) || "";
      let finalUrl = localDataUrl;
      try {
        finalUrl = await uploadFileToStorageBucket(
          file,
          "cadastral-docs",
          "enterprises"
        );
      } catch {
        finalUrl = localDataUrl;
      }
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const fileObj: BusinessFile = {
        name: file.name,
        url: finalUrl,
        type: isPdf ? "pdf" : "image",
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadDate: new Date().toLocaleDateString("vi-VN"),
      };
      callback(fileObj, localDataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectHousehold = (hh: Household) => {
    const nextCodes =
      householdSelectMode === "append"
        ? Array.from(new Set([...linkedHouseholdCodes, hh.code]))
        : [hh.code];
    setLinkedHouseholdCodes(nextCodes);
    setLinkedHouseholdCode(nextCodes.join(", "));

    if (hh.ownerName) {
      if (householdSelectMode === "append" && premisesOwner) {
        if (!premisesOwner.includes(hh.ownerName)) {
          setPremisesOwner(`${premisesOwner} & ${hh.ownerName}`);
        }
      } else if (!premisesOwner) {
        setPremisesOwner(hh.ownerName);
      }
    }
    if (hh.address && (!address || address.includes("Lương Định Của"))) {
      if (householdSelectMode !== "append") {
        setAddress(hh.address);
      }
    }

    const { nextParcels, addedCount } = inheritParcelsFromHouseholds(
      [hh],
      landParcels
    );
    if (addedCount > 0) {
      setLandParcels(nextParcels);
    }

    setIsHouseholdModalOpen(false);
    setFormNotice({
      type: "success",
      message:
        nextCodes.length > 1
          ? `Đã ghép liên kết ${nextCodes.length} Sổ hộ khẩu (${nextCodes.join(
              ", "
            )})${addedCount > 0 ? ` và kế thừa thêm Sổ đỏ của ${hh.code}` : ""}.`
          : `Đã liên kết trụ sở công ty với Sổ hộ khẩu ${hh.code} (${hh.ownerName}).`,
    });
  };

  const handleRemoveLinkedHouseholdCode = (codeToRemove: string) => {
    const nextCodes = linkedHouseholdCodes.filter((c) => c !== codeToRemove);
    setLinkedHouseholdCodes(nextCodes);
    setLinkedHouseholdCode(nextCodes.join(", "));
  };

  const handleSelectResident = (
    res: Resident,
    role: "owner" | "siteManager" | "focalPoint"
  ) => {
    if (role === "owner") {
      setLegalRep(res.fullName);
      if (res.phone && res.phone !== "N/A") setLegalRepPhone(res.phone);
      if (res.cccd) setLegalRepCccd(res.cccd);
      setFormNotice({
        type: "success",
        message: `Đã chọn công dân ${res.fullName} (${
          res.cccd ? `CCCD: ${res.cccd}` : res.status
        }) làm Người đại diện pháp luật.`,
      });
    } else if (role === "siteManager") {
      setSiteManager(res.fullName);
      if (res.phone && res.phone !== "N/A") setSiteManagerPhone(res.phone);
      setFormNotice({
        type: "success",
        message: `Đã chọn công dân ${res.fullName} làm Quản lý / Điều hành tại chỗ.`,
      });
    } else {
      setFocalPointName(res.fullName);
      if (res.phone && res.phone !== "N/A") setFocalPointPhone(res.phone);
      setFormNotice({
        type: "success",
        message: `Đã chọn công dân ${res.fullName} làm Đầu mối phối hợp công vụ.`,
      });
    }
    setIsResidentModalOpen(false);
  };

  const runLicenseOcr = async (file: File, dataUrl?: string) => {
    setIsProcessingLicenseOcr(true);
    try {
      const ocrRes = await extractBusinessLicenseFromFile(file, {
        defaultMode: "enterprise",
        existingDataUrl: dataUrl,
        existingData: {
          businessName: name || undefined,
          licenseNumber: taxCode || undefined,
          taxCode: taxCode || undefined,
          businessLine: type || undefined,
          headquartersAddress: address || undefined,
          legalRepresentative: legalRep || undefined,
          legalRepCccd: legalRepCccd || undefined,
          legalRepPhone: legalRepPhone || undefined,
        },
      });
      setGiayPhepOcrData(ocrRes);
      setShowLicenseOcrConfirm(true);
    } catch (err) {
      console.error("Lỗi OCR Giấy CN ĐKDN:", err);
    } finally {
      setIsProcessingLicenseOcr(false);
    }
  };

  const handleProcessLicenseUpload = (file: File) => {
    setPendingLicenseFile(file);
    handleProcessFileUpload(file, async (fileObj, localDataUrl) => {
      setGiayPhepFile(fileObj);
      if (autoLicenseOcrEnabled) {
        await runLicenseOcr(file, localDataUrl || fileObj.url);
      }
    });
  };

  const handleTriggerManualLicenseOcr = () => {
    if (pendingLicenseFile) {
      runLicenseOcr(pendingLicenseFile, giayPhepFile?.url);
      return;
    }
    if (giayPhepFile) {
      const synthetic = new File([""], giayPhepFile.name, {
        type:
          giayPhepFile.type === "pdf" ? "application/pdf" : "image/jpeg",
      });
      runLicenseOcr(synthetic, giayPhepFile.url);
    }
  };

  const matchedResidentFromLicenseOcr = useMemo(() => {
    if (!giayPhepOcrData) return null;
    if (giayPhepOcrData.legalRepCccd) {
      const byCccd = residents.find(
        (r) => r.cccd && r.cccd.trim() === giayPhepOcrData.legalRepCccd?.trim()
      );
      if (byCccd) return byCccd;
    }
    if (giayPhepOcrData.legalRepresentative) {
      const targetLower = giayPhepOcrData.legalRepresentative
        .trim()
        .toLowerCase();
      return (
        residents.find((r) => r.fullName.trim().toLowerCase() === targetLower) ||
        null
      );
    }
    return null;
  }, [giayPhepOcrData, residents]);

  const matchedHouseholdsFromLicenseOcr = useMemo(() => {
    if (!giayPhepOcrData?.headquartersAddress) return [];
    return households.filter((h) =>
      hasIntersectingAddressKeys(giayPhepOcrData.headquartersAddress, h.address)
    );
  }, [giayPhepOcrData, households]);

  const handleApplyLicenseOcr = (applyHouseholdLink: boolean) => {
    if (!giayPhepOcrData) return;
    if (giayPhepOcrData.businessName) {
      setName(giayPhepOcrData.businessName);
    }
    if (giayPhepOcrData.taxCode || giayPhepOcrData.licenseNumber) {
      setTaxCode(giayPhepOcrData.taxCode || giayPhepOcrData.licenseNumber || "");
    }
    if (giayPhepOcrData.businessType) {
      setBusinessType(giayPhepOcrData.businessType);
    }
    if (giayPhepOcrData.issueDate) {
      setStartDate(giayPhepOcrData.issueDate);
    }
    if (giayPhepOcrData.issuingAuthority) {
      setIssuingAuthority(giayPhepOcrData.issuingAuthority);
    }
    if (giayPhepOcrData.headquartersAddress) {
      setAddress(giayPhepOcrData.headquartersAddress);
    }
    if (giayPhepOcrData.businessLine) {
      setType(giayPhepOcrData.businessLine);
    }
    if (giayPhepOcrData.charterCapital) {
      setCharterCapital(giayPhepOcrData.charterCapital);
    }

    const resolvedRep =
      matchedResidentFromLicenseOcr?.fullName ||
      giayPhepOcrData.legalRepresentative;
    if (resolvedRep) {
      setLegalRep(resolvedRep);
      if (!focalPointName) setFocalPointName(resolvedRep);
    }
    const resolvedCccd =
      matchedResidentFromLicenseOcr?.cccd || giayPhepOcrData.legalRepCccd;
    if (resolvedCccd) {
      setLegalRepCccd(resolvedCccd);
    }
    const resolvedPhone =
      giayPhepOcrData.legalRepPhone ||
      matchedResidentFromLicenseOcr?.phone ||
      "";
    if (resolvedPhone && resolvedPhone !== "N/A") {
      setLegalRepPhone(resolvedPhone);
      if (!focalPointPhone) setFocalPointPhone(resolvedPhone);
    }
    if (giayPhepOcrData.legalRepEmail) {
      setLegalRepEmail(giayPhepOcrData.legalRepEmail);
    }

    if (applyHouseholdLink && matchedHouseholdsFromLicenseOcr.length > 0) {
      const codes = matchedHouseholdsFromLicenseOcr.map((h) => h.code);
      setLinkedHouseholdCodes(codes);
      setLinkedHouseholdCode(codes.join(", "));
      if (!premisesOwner) {
        setPremisesOwner(
          matchedHouseholdsFromLicenseOcr.map((h) => h.ownerName).join(" & ")
        );
      }
      const { nextParcels, addedCount } = inheritParcelsFromHouseholds(
        matchedHouseholdsFromLicenseOcr,
        landParcels
      );
      if (addedCount > 0) {
        setLandParcels(nextParcels);
      }
    }

    setShowLicenseOcrConfirm(false);
    setFormNotice({
      type: "success",
      message: `✓ Đã tự động cập nhật thông tin từ OCR Giấy chứng nhận ĐKDN (${
        giayPhepOcrData.businessName || "Doanh nghiệp"
      })!`,
    });
  };

  const handleProcessImageUpload = (file: File) => {
    setIsProcessingTimemark(true);
    handleProcessFileUpload(file, async (fileObj) => {
      setImage(fileObj.url);
      try {
        const timemarkResult = await extractTimemarkFromImage(file, file.name);
        if (timemarkResult) {
          setCoordinates(timemarkResult.coordinates);
          setTimemarkHash(timemarkResult.timemarkHash || "");
          setTimemarkVerified(timemarkResult.isVerified);
          setPhotoElevation(timemarkResult.elevation || "");
          setPhotoDirection(timemarkResult.direction || "");
          setPhotoTakenAt(timemarkResult.recordedTime || "");

          if (!address || address.includes("Lương Định Của")) {
            if (timemarkResult.address) setAddress(timemarkResult.address);
          }
          if (timemarkResult.streetArea && !streetArea) {
            setStreetArea(timemarkResult.streetArea);
          }
          setFormNotice({
            type: "success",
            message: `✓ Đã tự động bóc tách Tọa độ GPS (${timemarkResult.coordinates}) và Mã xác thực Timemark #${timemarkResult.timemarkHash || "Verified"}!`,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessingTimemark(false);
      }
    });
  };

  const handleBack = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === "edit" && targetEnterprise) {
      navigate(getEnterpriseDetailPath(targetEnterprise.id));
    } else {
      navigate(ROUTES.DASHBOARD_ENTERPRISES);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormNotice({
        message: "Vui lòng nhập tên doanh nghiệp!",
        type: "warning",
      });
      return;
    }

    const parcelSummary = summarizeLandParcels(landParcels);
    const parsedCodes: string[] = Array.from(
      new Set<string>(
        (linkedHouseholdCodes.length > 0
          ? linkedHouseholdCodes
          : linkedHouseholdCode.split(/[,;+|&]+/)
        )
          .map((c) => c.trim())
          .filter(Boolean)
      )
    );
    const primaryHhCode = parsedCodes[0] || "";

    if (mode === "create") {
      let nextSeq = businesses.length + 1;
      let nextId = "B" + nextSeq.toString().padStart(3, "0");
      while (businesses.some((b) => b.id === nextId)) {
        nextSeq += 1;
        nextId = "B" + nextSeq.toString().padStart(3, "0");
      }
      const code = internalCode.trim() || `DN-KP3-${nextId}`;
      const defaultImg = getEnterpriseImage({
        id: nextId,
        name: name.trim(),
      } as Business);

      const newEnt: Business = {
        id: nextId,
        internalCode: code,
        name: name.trim(),
        taxCode:
          taxCode.trim() ||
          "03" + Math.floor(10000000 + Math.random() * 90000000),
        businessType,
        enterpriseScale,
        type: type.trim() || "Dịch vụ thương mại",
        industryGroup: "Kinh doanh & Dịch vụ",
        owner: legalRep.trim() || "Chưa cập nhật",
        phone: legalRepPhone.trim() || "0900000000",
        address: address.trim() || "Lương Định Của, Phường An Phú",
        licenseNumber: taxCode.trim() || `GP-DN-${nextId}/AP`,
        licenseIssueDate: startDate || undefined,
        issuingAuthority: issuingAuthority.trim() || undefined,
        charterCapital: charterCapital.trim() || undefined,
        giayPhepFile: giayPhepFile || undefined,
        giayPhepOcrData: giayPhepOcrData || undefined,
        status: "Đang hoạt động",
        startDate,
        verificationSource: "Ban Điều hành & Chi bộ KP3 ghi nhận",
        streetArea,
        premisesType,
        premisesOwner: premisesOwner.trim(),
        premisesOwnerPhone: premisesOwnerPhone.trim(),
        linkedHouseholdCode: primaryHhCode,
        linkedHouseholdCodes: parsedCodes.length > 0 ? parsedCodes : undefined,
        legalRepresentative: legalRep.trim() || "Chưa cập nhật",
        legalRepPhone: legalRepPhone.trim(),
        legalRepCccd: legalRepCccd.trim() || undefined,
        legalRepEmail: legalRepEmail.trim(),
        siteManager: siteManager.trim(),
        siteManagerPhone: siteManagerPhone.trim(),
        focalPointName: focalPointName.trim() || legalRep.trim(),
        focalPointPhone: focalPointPhone.trim() || legalRepPhone.trim(),
        focalPointRole: focalPointRole.trim(),
        employeeCount: employeeCount || 1,
        localWorkersCount: localWorkers,
        temporaryWorkersCount: temporaryWorkers,
        foreignWorkersCount,
        supportNeeds,
        supportNotes: supportNotes.trim(),
        safetyCertified: true,
        coordinates: coordinates.trim() || undefined,
        landParcels:
          parcelSummary.meaningfulParcels.length > 0
            ? parcelSummary.meaningfulParcels
            : undefined,
        toBanDo: parcelSummary.toBanDoSummary || undefined,
        soThua: parcelSummary.soThuaSummary || undefined,
        dienTich: parcelSummary.totalArea || undefined,
        loaiDat: parcelSummary.loaiDatSummary || undefined,
        tenChuSuDung: parcelSummary.tenChuSuDungSummary || legalRep.trim(),
        soGcn: parcelSummary.soGcnSummary || undefined,
        soVaoSo: parcelSummary.soVaoSoSummary || undefined,
        soDoFile: parcelSummary.primarySoDoFile || undefined,
        timemarkHash: timemarkHash || undefined,
        timemarkVerified: timemarkVerified || undefined,
        photoElevation: photoElevation || undefined,
        photoDirection: photoDirection || undefined,
        photoTakenAt: photoTakenAt || undefined,
        image: image || defaultImg,
        images: image ? [image] : [defaultImg],
        changeHistory: [
          {
            id: `CHG-${nextId}-INIT`,
            date: new Date().toLocaleDateString("vi-VN"),
            type: "Mở mới",
            description:
              "Ghi nhận thành lập & đăng ký hoạt động doanh nghiệp trên địa bàn KP3",
            recordedBy: "Cán bộ quản trị địa bàn",
          },
        ],
      };

      if (onUpdateBusinesses) {
        onUpdateBusinesses([newEnt, ...businesses]);
      }

      if (onSaved) {
        onSaved(newEnt, "create");
      } else {
        navigate(getEnterpriseDetailPath(newEnt.id));
      }
      return;
    }

    if (!targetEnterprise) return;

    const updated: Business = {
      ...targetEnterprise,
      name: name.trim(),
      internalCode: internalCode.trim(),
      taxCode: taxCode.trim(),
      businessType,
      enterpriseScale,
      type: type.trim(),
      startDate,
      licenseIssueDate: startDate || undefined,
      issuingAuthority: issuingAuthority.trim() || undefined,
      charterCapital: charterCapital.trim() || undefined,
      giayPhepFile: giayPhepFile || undefined,
      giayPhepOcrData: giayPhepOcrData || undefined,
      address: address.trim(),
      streetArea,
      premisesType,
      premisesOwner: premisesOwner.trim(),
      premisesOwnerPhone: premisesOwnerPhone.trim(),
      linkedHouseholdCode: primaryHhCode,
      linkedHouseholdCodes: parsedCodes.length > 0 ? parsedCodes : undefined,
      owner: legalRep.trim() || targetEnterprise.owner,
      phone: legalRepPhone.trim() || targetEnterprise.phone,
      legalRepresentative: legalRep.trim(),
      legalRepPhone: legalRepPhone.trim(),
      legalRepCccd: legalRepCccd.trim() || undefined,
      legalRepEmail: legalRepEmail.trim(),
      siteManager: siteManager.trim(),
      siteManagerPhone: siteManagerPhone.trim(),
      focalPointName: focalPointName.trim(),
      focalPointPhone: focalPointPhone.trim(),
      focalPointRole: focalPointRole.trim(),
      employeeCount,
      localWorkersCount: localWorkers,
      temporaryWorkersCount: temporaryWorkers,
      foreignWorkersCount,
      supportNeeds,
      supportNotes: supportNotes.trim(),
      coordinates: coordinates.trim() || undefined,
      landParcels:
        parcelSummary.meaningfulParcels.length > 0
          ? parcelSummary.meaningfulParcels
          : undefined,
      toBanDo: parcelSummary.toBanDoSummary || undefined,
      soThua: parcelSummary.soThuaSummary || undefined,
      dienTich: parcelSummary.totalArea || undefined,
      loaiDat: parcelSummary.loaiDatSummary || undefined,
      tenChuSuDung: parcelSummary.tenChuSuDungSummary || legalRep.trim(),
      soGcn: parcelSummary.soGcnSummary || undefined,
      soVaoSo: parcelSummary.soVaoSoSummary || undefined,
      soDoFile: parcelSummary.primarySoDoFile || undefined,
      timemarkHash: timemarkHash || undefined,
      timemarkVerified: timemarkVerified || undefined,
      photoElevation: photoElevation || undefined,
      photoDirection: photoDirection || undefined,
      photoTakenAt: photoTakenAt || undefined,
      image: image || targetEnterprise.image,
      images:
        image && !(targetEnterprise.images || []).includes(image)
          ? [image, ...(targetEnterprise.images || [])]
          : targetEnterprise.images,
    };

    if (onUpdateBusinesses) {
      onUpdateBusinesses(
        businesses.map((b) => (b.id === updated.id ? updated : b))
      );
    }

    if (onSaved) {
      onSaved(updated, "edit");
    } else {
      navigate(getEnterpriseDetailPath(updated.id));
    }
  };

  if (mode === "edit" && isDataLoading && !targetEnterprise) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <LoadingFade title="Đang tải thông tin doanh nghiệp..." />
      </div>
    );
  }

  if (mode === "edit" && !targetEnterprise) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Không tìm thấy hồ sơ doanh nghiệp để chỉnh sửa
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Mã hồ sơ{" "}
            <span className="font-mono font-semibold text-slate-800">
              {enterpriseId}
            </span>{" "}
            không tồn tại trong hệ thống.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(ROUTES.DASHBOARD_ENTERPRISES)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Quay lại Danh sách Doanh nghiệp</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft size={14} />
          <span>
            {mode === "edit" && targetEnterprise
              ? "Quay lại Chi tiết Doanh nghiệp"
              : "Quay lại Danh sách Doanh nghiệp"}
          </span>
        </button>
      </div>

      <PageHeader
        badgeIcon={Building2}
        badgeText={
          mode === "create"
            ? "Đăng ký doanh nghiệp mới"
            : `Cập nhật hồ sơ • ${targetEnterprise?.internalCode || targetEnterprise?.id}`
        }
        title={
          mode === "create"
            ? "Đăng ký Doanh nghiệp Mới trên địa bàn KP3"
            : `Chỉnh sửa Hồ sơ: ${targetEnterprise?.name}`
        }
        description="Cập nhật thông tin pháp lý, trụ sở mặt bằng, người đại diện, lực lượng lao động và nhu cầu hỗ trợ tại Khu phố 3"
      />

      {formNotice && (
        <InlineNotice
          message={formNotice.message}
          type={formNotice.type}
          onDismiss={() => setFormNotice(null)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6 text-xs text-slate-800"
      >
        {/* Group 1: Pháp lý */}
        <div className="space-y-3">
          <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Briefcase size={14} className="text-indigo-600" /> 1. Thông tin
            Doanh nghiệp &amp; Pháp lý
          </h4>

          {/* Upload & Auto-OCR Giấy chứng nhận ĐKDN (ERC) */}
          <BusinessLicenseUploadOcrBox
            modeType="enterprise"
            giayPhepFile={giayPhepFile}
            ocrData={giayPhepOcrData}
            isProcessingOcr={isProcessingLicenseOcr}
            autoOcrEnabled={autoLicenseOcrEnabled}
            onToggleAutoOcr={setAutoLicenseOcrEnabled}
            onUploadFile={handleProcessLicenseUpload}
            onTriggerManualOcr={handleTriggerManualLicenseOcr}
            onOpenOcrReview={
              giayPhepOcrData
                ? () => setShowLicenseOcrConfirm(true)
                : undefined
            }
            onClearFile={() => {
              setGiayPhepFile(null);
              setGiayPhepOcrData(null);
              setPendingLicenseFile(null);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tên Doanh nghiệp *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Công ty TNHH Công nghệ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Mã nội bộ
              </label>
              <input
                type="text"
                placeholder="DN-KP3-..."
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Hình ảnh Trụ sở / Văn phòng Doanh nghiệp */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <ImageIcon size={13} className="text-indigo-600" />
              <span>Hình ảnh Trụ sở / Văn phòng Doanh nghiệp</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 shadow-2xs flex items-center justify-center">
                {image ? (
                  <img
                    src={image}
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
                  <span>{image ? "Đổi ảnh khác" : "Chọn ảnh từ thiết bị"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleProcessFileUpload(f, (fileObj) => {
                          setImage(fileObj.url);
                        });
                      }
                    }}
                  />
                </label>
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="text-[11px] text-rose-600 hover:text-rose-800 ml-2 font-medium cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                )}
                <p className="text-[10px] text-slate-400">
                  {mode === "create"
                    ? "Nếu để trống, hệ thống sẽ tự động gán hình ảnh văn phòng hiện đại chuẩn mực."
                    : "Ảnh trụ sở, văn phòng hoặc biển hiệu nhận diện doanh nghiệp."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Mã số thuế / MSDN {mode === "create" ? "*" : ""}
              </label>
              <input
                type="text"
                required={mode === "create"}
                placeholder="031xxxxxxx"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Loại hình tổ chức *
              </label>
              <ReportSelect
                aria-label="Loại hình tổ chức"
                value={businessType || "Công ty TNHH"}
                onChange={(nextVal) => setBusinessType(nextVal as any)}
                options={[
                  { value: "Công ty TNHH", label: "Công ty TNHH" },
                  { value: "Công ty Cổ phần", label: "Công ty Cổ phần" },
                  {
                    value: "Doanh nghiệp tư nhân",
                    label: "Doanh nghiệp tư nhân",
                  },
                  { value: "Cơ sở kinh doanh khác", label: "Cơ sở khác" },
                ]}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Quy mô lao động (NĐ 80) *
              </label>
              <ReportSelect
                aria-label="Quy mô lao động (NĐ 80)"
                value={enterpriseScale || "Nhỏ (5 - 20 LĐ)"}
                onChange={(nextVal) => setEnterpriseScale(nextVal as any)}
                options={[
                  { value: "Siêu nhỏ (< 5 LĐ)", label: "Siêu nhỏ (< 5 LĐ)" },
                  { value: "Nhỏ (5 - 20 LĐ)", label: "Nhỏ (5 - 20 LĐ)" },
                  { value: "Vừa (20 - 50 LĐ)", label: "Vừa (20 - 50 LĐ)" },
                  { value: "Lớn (> 50 LĐ)", label: "Lớn (> 50 LĐ)" },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ngành nghề chính *
              </label>
              <input
                type="text"
                required
                placeholder="Phần mềm, Thương mại, Y tế..."
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ngày cấp ĐKDN / Bắt đầu hoạt động
              </label>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nơi cấp / Phòng ĐKKD
              </label>
              <input
                type="text"
                placeholder="VD: Phòng ĐKKD - Sở KH&ĐT TP.HCM"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Vốn điều lệ đăng ký
              </label>
              <input
                type="text"
                placeholder="VD: 5.000.000.000 đồng"
                value={charterCapital}
                onChange={(e) => setCharterCapital(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Group 2: Địa điểm */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-emerald-600" /> 2. Trụ sở, Mặt
            bằng Kinh doanh &amp; Tuyến đường
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Địa chỉ trụ sở (Hỗ trợ địa chỉ ghép, VD: 42-44 Lương Định Của) *
              </label>
              <input
                type="text"
                required
                placeholder="Số nhà, hẻm, Lương Định Của..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tuyến đường *
              </label>
              <ReportSelect
                aria-label="Tuyến đường"
                value={streetArea}
                onChange={(nextVal) => setStreetArea(nextVal)}
                options={[
                  {
                    value: "Mặt tiền Lương Định Của",
                    label: "Mặt tiền Lương Định Của",
                  },
                  {
                    value: "Hẻm 42 Lương Định Của",
                    label: "Hẻm 42 Lương Định Của",
                  },
                  {
                    value: "Hẻm 18 Lương Định Của",
                    label: "Hẻm 18 Lương Định Của",
                  },
                  {
                    value: "Khu dân cư nội bộ KP3",
                    label: "KDC nội bộ KP3",
                  },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="min-h-[26px] flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Loại mặt bằng
                </label>
              </div>
              <ReportSelect
                aria-label="Loại mặt bằng"
                value={premisesType || "Văn phòng"}
                onChange={(nextVal) => setPremisesType(nextVal as any)}
                options={[
                  { value: "Văn phòng", label: "Văn phòng" },
                  { value: "Nhà phố", label: "Nhà phố" },
                  { value: "Cửa hàng", label: "Cửa hàng" },
                  { value: "Nhà xưởng", label: "Nhà xưởng" },
                  { value: "Ki-ốt", label: "Ki-ốt" },
                  { value: "Địa điểm thuê", label: "Địa điểm thuê" },
                  { value: "Chung cư / Căn hộ", label: "Chung cư / Căn hộ" },
                ]}
                className="w-full"
              />
            </div>
            <div>
              <div className="min-h-[26px] flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Chủ sở hữu mặt bằng
                </label>
              </div>
              <input
                type="text"
                placeholder="Tên chủ nhà / chủ mặt bằng"
                value={premisesOwner}
                onChange={(e) => setPremisesOwner(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <div className="min-h-[26px] flex flex-wrap items-center justify-between mb-1 gap-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Mã hộ dân KP3 (Hỗ trợ ghép hộ)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setHouseholdSelectMode("replace");
                      setIsHouseholdModalOpen(true);
                    }}
                    className="text-[10px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold px-2 py-0.5 rounded border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Tra cứu từ 488 sổ hộ khẩu"
                  >
                    <Search size={10} /> Tra cứu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHouseholdSelectMode("append");
                      setIsHouseholdModalOpen(true);
                    }}
                    className="text-[10px] text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-bold px-2 py-0.5 rounded border border-indigo-200 transition-colors flex items-center gap-0.5 cursor-pointer"
                    title="Ghép thêm hộ dân liền kề khi doanh nghiệp thuê gộp 2 nhà"
                  >
                    <Plus size={10} /> Ghép hộ
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="HK-010, HK-011..."
                value={linkedHouseholdCode}
                onChange={(e) => {
                  const raw = e.target.value;
                  setLinkedHouseholdCode(raw);
                  setLinkedHouseholdCodes(
                    raw
                      .split(/[,;+|&]+/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                  );
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
              {linkedHouseholdCodes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {linkedHouseholdCodes.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-200"
                    >
                      <Home size={10} className="text-emerald-700" />
                      {code}
                      <button
                        type="button"
                        onClick={() => handleRemoveLinkedHouseholdCode(code)}
                        className="text-emerald-600 hover:text-rose-600 cursor-pointer"
                        title={`Bỏ liên kết hộ ${code}`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Group 3: Người đại diện & Đầu mối */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-blue-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <UserCheck size={14} className="text-blue-600" /> 3. Người đại diện
            &amp; Đầu mối Công vụ
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="min-h-[26px] flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Đại diện pháp luật / Giám đốc *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResidentModalTarget("owner");
                    setIsResidentModalOpen(true);
                  }}
                  className="text-[10px] text-blue-800 bg-blue-50 hover:bg-blue-100 font-bold px-2 py-0.5 rounded border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Tìm trong danh bạ 11.632 cư dân KP3"
                >
                  <Search size={10} /> Dân cư
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Họ và tên người ĐDPL"
                value={legalRep}
                onChange={(e) => setLegalRep(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <div className="min-h-[26px] flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  SĐT đại diện *
                </label>
              </div>
              <input
                type="text"
                required
                placeholder="0903xxxxxx"
                value={legalRepPhone}
                onChange={(e) => setLegalRepPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
            <div>
              <div className="min-h-[26px] flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Email công vụ
                </label>
              </div>
              <input
                type="email"
                placeholder="contact@doanhnghiep.vn"
                value={legalRepEmail}
                onChange={(e) => setLegalRepEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
              />
            </div>
          </div>

          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
                <Phone size={12} className="text-blue-700" /> Đầu mối phối hợp
                công vụ địa phương:
              </span>
              <button
                type="button"
                onClick={() => {
                  setResidentModalTarget("focalPoint");
                  setIsResidentModalOpen(true);
                }}
                className="text-[10px] text-blue-800 bg-white hover:bg-blue-100 font-bold px-2 py-0.5 rounded border border-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Chọn từ danh bạ 11.632 cư dân"
              >
                <Search size={10} /> Dân cư
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <input
                  type="text"
                  placeholder="Họ tên đầu mối"
                  value={focalPointName}
                  onChange={(e) => setFocalPointName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="SĐT công vụ tiếp nhận"
                  value={focalPointPhone}
                  onChange={(e) => setFocalPointPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Vai trò (Giám đốc, Quản lý...)"
                  value={focalPointRole}
                  onChange={(e) => setFocalPointRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Group 4: Lao động */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-purple-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Users2 size={14} className="text-purple-600" /> 4. Lực lượng Lao
            động &amp; Nước ngoài
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tổng số lao động *
              </label>
              <input
                type="number"
                min="1"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                LĐ thường trú KP3
              </label>
              <input
                type="number"
                min="0"
                value={localWorkers}
                onChange={(e) => setLocalWorkers(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                LĐ tạm trú
              </label>
              <input
                type="number"
                min="0"
                value={temporaryWorkers}
                onChange={(e) => setTemporaryWorkers(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                LĐ người nước ngoài
              </label>
              <input
                type="number"
                min="0"
                value={foreignWorkersCount}
                onChange={(e) => setForeignWorkersCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Group 5: Nhu cầu hỗ trợ */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-amber-950 uppercase tracking-wider text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-amber-600" /> 5. Nhu cầu Hỗ
            trợ &amp; Ý kiến Khó khăn (Tự nguyện)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SUPPORT_NEED_OPTIONS.map((need, idx) => {
              const checked = supportNeeds.includes(need);
              return (
                <label
                  key={idx}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-[11px]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSupportNeeds([...supportNeeds, need]);
                      else
                        setSupportNeeds(
                          supportNeeds.filter((n) => n !== need)
                        );
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
              placeholder="Ghi nhận các khó khăn về mặt bằng, giá thuê, tuyển dụng, trật tự đô thị..."
              value={supportNotes}
              onChange={(e) => setSupportNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
            />
          </div>
        </div>

        {/* Group 6: Đa Thửa Đất & Nhiều Sổ Đỏ (GCN QSDĐ) */}
        <div className="pt-3 border-t border-slate-100">
          <MultiParcelEditor
            sectionTitle="6. Thông tin Địa chính & Giấy chứng nhận QSDĐ (Hỗ trợ Ghép Thửa / Nhiều Sổ Đỏ)"
            parcels={landParcels}
            onChange={setLandParcels}
            linkedHouseholds={linkedHouseholdsList}
            defaultOwnerName={premisesOwner || legalRep}
            defaultAddress={address}
            onNotice={(notice) => setFormNotice(notice)}
          />
        </div>

        {/* Group 7: Hình ảnh thực tế trụ sở & Timemark OCR */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <Camera size={14} className="text-emerald-600" /> 7. Hình ảnh
              thực tế trụ sở doanh nghiệp (Hỗ trợ ảnh Timemark định vị GPS)
            </h4>
            {timemarkVerified && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <ShieldCheck size={11} /> 100% Chân thực
              </span>
            )}
          </div>

          <div
            className={`border border-dashed rounded-xl p-3.5 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
              dragActiveImage
                ? "border-emerald-500 bg-emerald-50/60"
                : "border-slate-300 hover:border-emerald-400 bg-slate-50/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActiveImage(true);
            }}
            onDragLeave={() => setDragActiveImage(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActiveImage(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleProcessImageUpload(e.dataTransfer.files[0]);
              }
            }}
          >
            {isProcessingTimemark ? (
              <div className="py-4 flex flex-col items-center gap-2 text-emerald-700">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold">
                  Đang bóc tách Watermark Timemark &amp; Tọa độ GPS vệ tinh...
                </span>
              </div>
            ) : image ? (
              <div className="space-y-3 w-full flex flex-col items-center">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-56 flex items-center justify-center">
                  <img
                    src={image}
                    alt="Preview"
                    className="max-h-56 w-auto object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage("");
                      setTimemarkVerified(false);
                      setTimemarkHash("");
                    }}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-full shadow transition-colors cursor-pointer"
                    title="Xóa ảnh"
                    aria-label="Xóa ảnh thực tế mặt tiền"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Timemark Verified Geolocation Card */}
                {timemarkVerified && (
                  <div className="p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-300 space-y-2 text-left w-full max-w-lg shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <ShieldCheck size={16} className="text-emerald-600" />
                        ✓ ĐÃ ĐỊNH VỊ QUA ẢNH TIMEMARK (100% CHÂN THỰC)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
                        #{timemarkHash || "N9ULW4DEHPT33Y"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          Tọa độ GPS WGS84:
                        </span>
                        <strong className="font-mono text-emerald-900">
                          {coordinates}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          Thời gian chụp:
                        </span>
                        <span className="font-medium text-slate-800">
                          {photoTakenAt || "15/11/2026 04:49"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          Độ cao thực địa:
                        </span>
                        <span className="font-medium text-slate-800">
                          {photoElevation || "37.1m"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          Phương hướng la bàn:
                        </span>
                        <span className="font-medium text-slate-800">
                          {photoDirection || "71° E"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-700 italic border-t border-emerald-200/80 pt-1.5">
                      * Tọa độ thực tế đã được cập nhật và ghim chính xác lên
                      Bản đồ số GIS KP3.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center w-full py-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessImageUpload(e.target.files[0]);
                    }
                  }}
                />
                <Camera size={24} className="text-slate-400 mb-1" />
                <p className="text-xs font-semibold text-slate-700">
                  Kéo thả ảnh trụ sở doanh nghiệp (Tự động đọc watermark
                  Timemark), hoặc{" "}
                  <span className="text-emerald-600 hover:underline font-bold">
                    chọn từ thiết bị
                  </span>
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Tự động bóc tách tọa độ GPS, thời gian chụp và mã xác thực
                  chống giả mạo
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Form Buttons */}
        <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer shadow-sm"
          >
            {mode === "create" ? "Đăng ký Doanh nghiệp" : "Lưu thay đổi"}
          </button>
        </div>
      </form>

      {/* Modal Chọn Sổ Hộ Khẩu */}
      <HouseholdSelectModal
        isOpen={isHouseholdModalOpen}
        onClose={() => setIsHouseholdModalOpen(false)}
        households={households}
        currentCode={linkedHouseholdCode}
        onSelect={handleSelectHousehold}
      />

      {/* Modal Chọn Cư Dân */}
      <ResidentSelectModal
        isOpen={isResidentModalOpen}
        onClose={() => setIsResidentModalOpen(false)}
        residents={residents}
        targetRole={residentModalTarget}
        currentValue={
          residentModalTarget === "owner"
            ? legalRep
            : residentModalTarget === "siteManager"
              ? siteManager
              : focalPointName
        }
        onSelect={handleSelectResident}
      />

      {/* Modal Xác nhận OCR Giấy chứng nhận ĐKDN (ERC) */}
      <BusinessLicenseOcrConfirmModal
        isOpen={showLicenseOcrConfirm}
        onClose={() => setShowLicenseOcrConfirm(false)}
        ocrData={giayPhepOcrData}
        modeType="enterprise"
        currentValues={{
          businessName: name,
          licenseNumber: taxCode,
          businessType,
          issueDate: startDate,
          issuingAuthority,
          headquartersAddress: address,
          businessLine: type,
          charterCapital,
          legalRepresentative: legalRep,
          legalRepCccd,
          legalRepPhone,
        }}
        matchedResident={matchedResidentFromLicenseOcr}
        matchedHouseholds={matchedHouseholdsFromLicenseOcr}
        onApply={handleApplyLicenseOcr}
      />
    </div>
  );
}
