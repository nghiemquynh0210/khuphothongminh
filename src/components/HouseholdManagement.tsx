import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Home, 
  Users, 
  Search, 
  GitBranch, 
  UserPlus, 
  MapPin, 
  BookOpen, 
  ChevronRight,
  Plus,
  X,
  Trash2,
  AlertCircle,
  LayoutGrid,
  List,
  Edit3,
  Undo2,
  Sparkles,
  Info,
  Calendar,
  Layers,
  History,
  Navigation,
  Compass,
  ExternalLink,
  Globe,
  Check,
  Copy,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { Household, Resident, TargetGisItem } from "../types";
import { 
  KP3_CENTER, 
  decimalToDMS, 
  parseCoordinates as parseGisCoords, 
  generateDefaultCoordinatesForAddress, 
  getGoogleMapsDirectionUrl 
} from "../utils/gisUtils";
import Pagination from "./Pagination";
import { DetailRow, DetailGrid } from "./common/DetailRow";
import { PageHeader } from "./common/PageHeader";
import { StatCard } from "./common/StatCard";
import { ReportSelect } from "./reports/ReportSelect";
import { Modal } from "./ui/Modal";
import { ConfirmModal, InlineNotice } from "./ui/ConfirmModal";
import { formatVNNumber } from "../utils/numberFormat";
import { KP3_AREA_LIST, extractKp3Area, maskCccd, maskPhone } from "../utils/kp3Utils";

// Sub-component imports
import HouseholdDashboard from "./household/HouseholdDashboard";
import HouseholdDuplicates, { normalizeAddress } from "./household/HouseholdDuplicates";
import HouseholdMemberProfile from "./household/HouseholdMemberProfile";
import HouseholdFamilyTree from "./household/HouseholdFamilyTree";
import HouseholdBusinesses from "./household/HouseholdBusinesses";
import HouseholdAutoRecognition from "./household/HouseholdAutoRecognition";

interface HouseholdManagementProps {
  households: Household[];
  onAddHousehold: (newH: Household) => void;
  residents: Resident[];
  onUpdateHouseholds: (households: Household[]) => void;
  onUpdateResidents: (residents: Resident[]) => void;
  onNavigateToGis?: (item: TargetGisItem) => void;
}

const HouseholdSearchInput = React.memo(function HouseholdSearchInput({
  defaultValue,
  onSearch
}: {
  defaultValue: string;
  onSearch: (value: string) => void;
}) {
  const [val, setVal] = useState(defaultValue);

  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(val);
    }, 200);
    return () => clearTimeout(timer);
  }, [val, onSearch]);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input 
        id="household-search-input"
        name="householdSearchTerm"
        type="text" 
        placeholder="Tìm kiếm theo chủ hộ, mã số sổ, địa chỉ, CCCD..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400"
      />
      {val && (
        <button
          type="button"
          onClick={() => {
            setVal("");
            onSearch("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          title="Xóa tìm kiếm"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});

export default function HouseholdManagement({ 
  households, 
  onAddHousehold,
  residents = [],
  onUpdateHouseholds,
  onUpdateResidents,
  onNavigateToGis
}: HouseholdManagementProps) {
  // Navigation & Sub-views tabs
  const [activeTab, setActiveTab] = useState<"list" | "recognition" | "dashboard" | "audit">("list");
  
  // Selected Household details tab
  const [detailTab, setDetailTab] = useState<"members" | "businesses" | "history">("members");
  
  // Basic states
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, []);
  const [typeFilter, setTypeFilter] = useState<"Tất cả" | "Thường trú" | "Tạm trú">("Tất cả");
  const [toFilter, setToFilter] = useState<string>("all");
  const [showFullPii, setShowFullPii] = useState<boolean>(false);
  const [showSoftDeleted, setShowSoftDeleted] = useState(false); // Recycle bin toggle
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "card">("card");
  const itemsPerPage = 8;

  // Notice & Confirm states
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "primary";
    onConfirm: () => void;
  } | null>(null);

  const showNotice = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setNotice({ message, type });
  }, []);

  // Modal displays
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  
  // Profile View modal
  const [profileViewMember, setProfileViewMember] = useState<{ name: string; relation: string; cccd: string } | null>(null);

  // Live GPS coordinate parser state
  const [coordInput, setCoordInput] = useState("");
  const [parsedGPS, setParsedGPS] = useState<{ lat: number; lng: number; formatted: string } | null>(null);

  // GIS Coordinate Pinning & Navigation Modal States
  const [gisPinModalHousehold, setGisPinModalHousehold] = useState<Household | null>(null);
  const [gisPinInput, setGisPinInput] = useState("");

  const handleDirections = (h: Household) => {
    let coords = h.coordinates;
    if (!coords || !parseGisCoords(coords)) {
      // Auto-geolocate based on address
      const autoGeo = generateDefaultCoordinatesForAddress(h.address, h.code);
      coords = autoGeo.dms;
      // Auto-save this coordinate to household so GIS map has it permanently
      const updated = households.map(item => item.id === h.id ? { ...item, coordinates: coords } : item);
      onUpdateHouseholds(updated);
    }
    if (onNavigateToGis) {
      onNavigateToGis({
        id: h.id,
        type: "household",
        name: `Hộ ${h.ownerName} (${h.code})`,
        address: h.address,
        coordinates: coords,
        navigateRoute: true
      });
    }
  };

  const openPinModal = (h: Household) => {
    setGisPinModalHousehold(h);
    if (h.coordinates) {
      setGisPinInput(h.coordinates);
    } else {
      const auto = generateDefaultCoordinatesForAddress(h.address, h.code);
      setGisPinInput(auto.dms);
    }
  };

  const handleSavePinCoordinates = (andNavigate: boolean = false) => {
    if (!gisPinModalHousehold) return;
    const finalCoord = gisPinInput.trim();
    if (!finalCoord) {
      showNotice("Vui lòng nhập hoặc lấy tọa độ GIS!", "warning");
      return;
    }

    const updated = households.map(h => {
      if (h.id === gisPinModalHousehold.id) {
        return { ...h, coordinates: finalCoord };
      }
      return h;
    });

    onUpdateHouseholds(updated);
    if (selectedHousehold && selectedHousehold.id === gisPinModalHousehold.id) {
      setSelectedHousehold({ ...selectedHousehold, coordinates: finalCoord });
    }

    const targetH = { ...gisPinModalHousehold, coordinates: finalCoord };
    setGisPinModalHousehold(null);

    if (andNavigate && onNavigateToGis) {
      onNavigateToGis({
        id: targetH.id,
        type: "household",
        name: `Hộ ${targetH.ownerName} (${targetH.code})`,
        address: targetH.address,
        coordinates: finalCoord,
        navigateRoute: true
      });
    } else {
      showNotice(`Đã đồng bộ tọa độ Hộ ${targetH.ownerName} (${finalCoord}) lên bản đồ GIS!`, "success");
    }
  };

  // Form states for creating new Household
  const [newHCode, setNewHCode] = useState("");
  const [newHType, setNewHType] = useState<"Thường trú" | "Tạm trú">("Thường trú");
  const [newOwner, setNewOwner] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [tempMembers, setTempMembers] = useState<{ name: string; relation: string; cccd: string; birthYear: number; phone?: string }[]>([]);
  
  // Member registration inside creation modal
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberCccd, setNewMemberCccd] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("Vợ");
  const [newMemberBirthYear, setNewMemberBirthYear] = useState<number | "">("");
  const [newMemberPhone, setNewMemberPhone] = useState("");

  // Edit Household form states
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState<"Thường trú" | "Tạm trú">("Thường trú");
  const [editOwner, setEditOwner] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Move member states
  const [moveTargetMember, setMoveTargetMember] = useState<{ name: string; cccd: string } | null>(null);
  const [moveTargetHCode, setMoveTargetHCode] = useState("");

  // Split household states
  const [splitSelectedCccds, setSplitSelectedCccds] = useState<string[]>([]);
  const [splitNewHCode, setSplitNewHCode] = useState("");
  const [splitNewOwner, setSplitNewOwner] = useState("");
  const [splitNewAddress, setSplitNewAddress] = useState("");
  const [splitNewCoordinates, setSplitNewCoordinates] = useState("");

  // Responsive default layout
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode("card");
    }
  }, []);

  const handleOpenDetailModal = (h: Household) => {
    setSelectedHousehold(h);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
  };

  // Close detail modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showDetailModal) {
        setShowDetailModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDetailModal]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showDetailModal || showAddModal || showEditModal || showAddMemberModal || showTreeModal || showMoveModal || showSplitModal || !!profileViewMember) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDetailModal, showAddModal, showEditModal, showAddMemberModal, showTreeModal, showMoveModal, showSplitModal, profileViewMember]);

  // Sync selected household if globally updated
  useEffect(() => {
    if (selectedHousehold) {
      const match = households.find(h => h.id === selectedHousehold.id);
      if (match) {
        setSelectedHousehold(match);
      }
    }
  }, [households]);

  // Combined GPS parsing logic live
  const parseCoordinates = (input: string) => {
    if (!input) return null;
    const parts = input.split(",");
    if (parts.length === 2) {
      const p1 = parseFloat(parts[0].trim());
      const p2 = parseFloat(parts[1].trim());
      if (!isNaN(p1) && !isNaN(p2)) {
        let lat = p1;
        let lng = p2;
        // Normal Vietnam coordinate bounds
        if (p1 > 100 && p2 < 30) {
          lat = p2;
          lng = p1;
        }
        return { lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
      }
    }
    return null;
  };

  const handleCoordInputChange = (val: string) => {
    setCoordInput(val);
    const parsed = parseCoordinates(val);
    setParsedGPS(parsed);
  };

  // Filter households by search, type, area, and soft-delete status (Memoized)
  const filteredHouseholds = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const hasQuery = q.length > 0;

    return households.filter((h) => {
      const isDeleted = !!(h as any).deletedAt;
      if (showSoftDeleted !== isDeleted) return false;

      const matchesType = typeFilter === "Tất cả" || (h.type || "Thường trú") === typeFilter;
      if (!matchesType) return false;

      if (toFilter !== "all" && extractKp3Area(h.address) !== toFilter) return false;

      if (!hasQuery) return true;

      return (
        h.ownerName.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        (h.members && h.members.some(m => (m.name && m.name.toLowerCase().includes(q)) || (m.cccd && m.cccd.includes(q))))
      );
    });
  }, [households, searchTerm, showSoftDeleted, typeFilter, toFilter]);

  // Paginated selection
  const paginatedHouseholds = filteredHouseholds.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalItems = filteredHouseholds.length;

  // Handle Create Household
  const handleCreateHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHCode || !newOwner || !newAddress) {
      showNotice("Vui lòng điền đầy đủ các thông mục có dấu sao (*)", "warning");
      return;
    }

    const primaryOwnerCccd = newMemberCccd || `079${Math.floor(100000000 + Math.random() * 900000000)}`;
    const finalCoordinates = parsedGPS ? parsedGPS.formatted : coordInput;

    const newH: Household = {
      id: "H" + (households.length + 1).toString().padStart(3, "0"),
      code: newHCode,
      ownerName: newOwner,
      address: newAddress,
      type: newHType,
      memberCount: tempMembers.length + 1,
      coordinates: finalCoordinates || undefined,
      members: [
        {
          name: newOwner,
          relation: "Chủ hộ",
          cccd: primaryOwnerCccd,
          birthYear: 1980, // default placeholder
          phone: "09XXXXXXXX"
        },
        ...tempMembers
      ]
    };

    onAddHousehold(newH);

    // Synchronize into residents roster
    const newResidents: Resident[] = [
      {
        id: "R" + Math.floor(1000 + Math.random() * 9000),
        fullName: newOwner,
        gender: "Nam",
        birthDate: "15/05/1980",
        cccd: primaryOwnerCccd,
        phone: "09XXXXXXXX",
        status: newHType,
        occupation: "Kinh doanh tự do",
        address: newAddress,
        householdId: newHCode,
        relationToOwner: "Chủ hộ",
        joinDate: new Date().toLocaleDateString("vi-VN")
      },
      ...tempMembers.map(m => ({
        id: "R" + Math.floor(1000 + Math.random() * 9000),
        fullName: m.name,
        gender: m.relation === "Vợ" || m.relation === "Con gái" ? "Nữ" : "Nam",
        birthDate: `01/01/${m.birthYear}`,
        cccd: m.cccd,
        phone: m.phone || "N/A",
        status: newHType,
        occupation: "Học sinh / Thành viên",
        address: newAddress,
        householdId: newHCode,
        relationToOwner: m.relation,
        joinDate: new Date().toLocaleDateString("vi-VN")
      }))
    ];

    onUpdateResidents([...residents, ...newResidents]);

    // Reset Creation form states
    setShowAddModal(false);
    setNewHCode("");
    setNewOwner("");
    setNewAddress("");
    setCoordInput("");
    setParsedGPS(null);
    setTempMembers([]);
  };

  const handleAddTempMember = () => {
    if (!newMemberName || !newMemberCccd || !newMemberBirthYear) {
      showNotice("Vui lòng điền tên, CCCD và năm sinh thành viên tạm thời!", "warning");
      return;
    }
    setTempMembers([
      ...tempMembers,
      {
        name: newMemberName,
        relation: newMemberRelation,
        cccd: newMemberCccd,
        birthYear: Number(newMemberBirthYear),
        phone: newMemberPhone || undefined
      }
    ]);
    setNewMemberName("");
    setNewMemberCccd("");
    setNewMemberPhone("");
    setNewMemberBirthYear("");
  };

  // Soft Delete Household Book
  const handleSoftDeleteHousehold = (id: string) => {
    const target = households.find(h => h.id === id);
    if (!target) return;

    if (target.members.length > 0) {
      showNotice("Cảnh báo: Không thể xóa sổ hộ khẩu khi vẫn còn thành viên cư ngụ! Vui lòng thực hiện tách hộ hoặc chuyển thành viên trước.", "warning");
      return;
    }

    setConfirmDialog({
      title: "Chuyển Sổ hộ khẩu vào lưu trữ",
      description: `Bạn có chắc chắn muốn xóa (Soft Delete) Sổ hộ khẩu ${target.code}? Sổ sẽ được chuyển vào mục lưu trữ.`,
      confirmLabel: "Chuyển vào lưu trữ",
      variant: "danger",
      onConfirm: () => {
        const updated = households.map(h => {
          if (h.id === id) {
            return {
              ...h,
              deletedAt: new Date().toISOString(),
              deletedBy: "Cán bộ Hành chính Phường"
            };
          }
          return h;
        });

        onUpdateHouseholds(updated);
        if (selectedHousehold?.id === id) {
          setSelectedHousehold(updated.find(h => !(h as any).deletedAt) || null);
        }
        setShowDetailModal(false);
        setConfirmDialog(null);
        showNotice(`Đã chuyển Sổ ${target.code} vào thùng rác lưu trữ.`, "info");
      }
    });
  };

  // Restore Soft Deleted Household Book
  const handleRestoreHousehold = (id: string) => {
    const updated = households.map(h => {
      if (h.id === id) {
        const copy = { ...h };
        delete (copy as any).deletedAt;
        delete (copy as any).deletedBy;
        return copy;
      }
      return h;
    });

    onUpdateHouseholds(updated);
    showNotice("Khôi phục sổ hộ khẩu thành công!", "success");
    setShowSoftDeleted(false);
  };

  // Edit Sổ Hộ Khẩu details
  const startEditHousehold = () => {
    if (!selectedHousehold) return;
    setEditAddress(selectedHousehold.address);
    setEditType(selectedHousehold.type || "Thường trú");
    setEditOwner(selectedHousehold.ownerName);
    setEditNotes((selectedHousehold as any).notes || "");
    setCoordInput(selectedHousehold.coordinates || "");
    setParsedGPS(parseCoordinates(selectedHousehold.coordinates || ""));
    setShowEditModal(true);
  };

  const handleSaveEditHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHousehold) return;

    const finalCoordinates = parsedGPS ? parsedGPS.formatted : coordInput;

    const updated = households.map(h => {
      if (h.id === selectedHousehold.id) {
        // Build audit log entry
        const logs = (h as any).auditHistory || [];
        const newLog = {
          date: new Date().toLocaleString("vi-VN"),
          action: "Cập nhật thông tin sổ hộ khẩu",
          actor: "Cán bộ Tư pháp"
        };

        return {
          ...h,
          address: editAddress,
          type: editType,
          ownerName: editOwner,
          coordinates: finalCoordinates,
          notes: editNotes,
          auditHistory: [newLog, ...logs]
        };
      }
      return h;
    });

    onUpdateHouseholds(updated);
    setShowEditModal(false);
  };

  // Remove individual member from current household book
  const handleRemoveMember = (cccd: string) => {
    if (!selectedHousehold) return;
    const member = selectedHousehold.members.find(m => m.cccd === cccd);
    if (!member) return;

    if (member.relation === "Chủ hộ") {
      showNotice("Không thể xóa chủ hộ khỏi sổ! Hãy chỉ định một chủ hộ mới bằng cách Sửa sổ trước.", "warning");
      return;
    }

    setConfirmDialog({
      title: "Xóa thành viên khỏi sổ",
      description: `Bạn chắc chắn muốn xóa thành viên ${member.name} khỏi sổ hộ tịch ${selectedHousehold.code}?`,
      confirmLabel: "Xóa thành viên",
      variant: "danger",
      onConfirm: () => {
        const updatedMembers = selectedHousehold.members.filter(m => m.cccd !== cccd);
        const updatedHouseholds = households.map(h => {
          if (h.id === selectedHousehold.id) {
            return {
              ...h,
              members: updatedMembers,
              memberCount: updatedMembers.length
            };
          }
          return h;
        });

        const updatedResidents = residents.map(r => {
          if (r.cccd === cccd) {
            return {
              ...r,
              householdId: "N/A",
              relationToOwner: "Tự do"
            };
          }
          return r;
        });

        onUpdateHouseholds(updatedHouseholds);
        onUpdateResidents(updatedResidents);
        setConfirmDialog(null);
        showNotice(`Đã xóa thành viên ${member.name} khỏi sổ ${selectedHousehold.code}.`, "info");
      }
    });
  };

  // Add Member into selected household
  const [addMemName, setAddMemName] = useState("");
  const [addMemCccd, setAddMemCccd] = useState("");
  const [addMemRelation, setAddMemRelation] = useState("Con trai");
  const [addMemBirthYear, setAddMemBirthYear] = useState<number | "">("");
  const [addMemPhone, setAddMemPhone] = useState("");

  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHousehold || !addMemName || !addMemCccd || !addMemBirthYear) {
      showNotice("Vui lòng nhập tên, CCCD và năm sinh!", "warning");
      return;
    }

    const newM = {
      name: addMemName,
      relation: addMemRelation,
      cccd: addMemCccd,
      birthYear: Number(addMemBirthYear),
      phone: addMemPhone || undefined
    };

    const updatedHouseholds = households.map(h => {
      if (h.id === selectedHousehold.id) {
        const audit = (h as any).auditHistory || [];
        const newLog = {
          date: new Date().toLocaleString("vi-VN"),
          action: `Nhập khẩu thêm thành viên: ${addMemName}`,
          actor: "Cán bộ Tư pháp"
        };

        return {
          ...h,
          members: [...h.members, newM],
          memberCount: h.members.length + 1,
          auditHistory: [newLog, ...audit]
        };
      }
      return h;
    });

    // Point resident profile
    const newR: Resident = {
      id: "R" + Math.floor(1000 + Math.random() * 9000),
      fullName: addMemName,
      gender: addMemRelation === "Vợ" || addMemRelation === "Con gái" ? "Nữ" : "Nam",
      birthDate: `01/01/${addMemBirthYear}`,
      cccd: addMemCccd,
      phone: addMemPhone || "N/A",
      status: selectedHousehold.type || "Thường trú",
      occupation: "Thành viên",
      address: selectedHousehold.address,
      householdId: selectedHousehold.code,
      relationToOwner: addMemRelation,
      joinDate: new Date().toLocaleDateString("vi-VN")
    };

    onUpdateHouseholds(updatedHouseholds);
    onUpdateResidents([...residents, newR]);

    // Reset
    setShowAddMemberModal(false);
    setAddMemName("");
    setAddMemCccd("");
    setAddMemBirthYear("");
    setAddMemPhone("");
  };

  // Move member (Chuyển hộ)
  const startMoveMember = (name: string, cccd: string) => {
    setMoveTargetMember({ name, cccd });
    setMoveTargetHCode(households.find(h => h.id !== selectedHousehold?.id)?.code || "");
    setShowMoveModal(true);
  };

  const handlePerformMoveMember = () => {
    if (!selectedHousehold || !moveTargetMember || !moveTargetHCode) return;

    const targetH = households.find(h => h.code === moveTargetHCode);
    if (!targetH) {
      showNotice("Hộ tịch đích không tồn tại!", "error");
      return;
    }

    const memberToMove = selectedHousehold.members.find(m => m.cccd === moveTargetMember.cccd);
    if (!memberToMove) return;

    // 1. Remove from source household
    const updatedSourceMembers = selectedHousehold.members.filter(m => m.cccd !== moveTargetMember.cccd);
    
    // 2. Add to target household
    const updatedTargetMembers = [
      ...targetH.members,
      {
        ...memberToMove,
        relation: "Thành viên mới chuyển đến"
      }
    ];

    const updatedHouseholds = households.map(h => {
      if (h.id === selectedHousehold.id) {
        return {
          ...h,
          members: updatedSourceMembers,
          memberCount: updatedSourceMembers.length
        };
      }
      if (h.id === targetH.id) {
        return {
          ...h,
          members: updatedTargetMembers,
          memberCount: updatedTargetMembers.length
        };
      }
      return h;
    });

    // 3. Update resident profile pointers
    const updatedResidents = residents.map(r => {
      if (r.cccd === moveTargetMember.cccd) {
        return {
          ...r,
          householdId: targetH.code,
          address: targetH.address,
          relationToOwner: "Thành viên mới chuyển đến"
        };
      }
      return r;
    });

    onUpdateHouseholds(updatedHouseholds);
    onUpdateResidents(updatedResidents);
    setShowMoveModal(false);
    showNotice(`Đã chuyển nhân khẩu ${moveTargetMember.name} cư trú sang sổ ${targetH.code} thành công.`, "success");
  };

  // Split household (Tách hộ)
  const startSplitHousehold = () => {
    setSplitSelectedCccds([]);
    setSplitNewHCode(`HK-${Math.floor(300 + Math.random() * 100)}`);
    setSplitNewAddress(selectedHousehold?.address || "");
    setSplitNewCoordinates(selectedHousehold?.coordinates || "");
    setShowSplitModal(true);
  };

  const handlePerformSplitHousehold = () => {
    if (!selectedHousehold || splitSelectedCccds.length === 0 || !splitNewHCode || !splitNewOwner) {
      showNotice("Vui lòng tích chọn thành viên tách và nhập mã sổ mới + chủ hộ mới!", "warning");
      return;
    }

    const membersToSplit = selectedHousehold.members.filter(m => splitSelectedCccds.includes(m.cccd));
    
    // 1. Create split household book
    const newHMembers = membersToSplit.map(m => ({
      ...m,
      relation: m.cccd === splitNewOwner ? "Chủ hộ" : "Thành viên tách hộ"
    }));

    const newH: Household = {
      id: "H" + (households.length + 1).toString().padStart(3, "0"),
      code: splitNewHCode,
      ownerName: selectedHousehold.members.find(m => m.cccd === splitNewOwner)?.name || "Chưa xác định",
      address: splitNewAddress,
      type: selectedHousehold.type || "Thường trú",
      memberCount: newHMembers.length,
      coordinates: splitNewCoordinates || undefined,
      members: newHMembers
    };

    // 2. Remove those split members from original household
    const updatedOriginalMembers = selectedHousehold.members.filter(m => !splitSelectedCccds.includes(m.cccd));

    const updatedHouseholds = households.map(h => {
      if (h.id === selectedHousehold.id) {
        return {
          ...h,
          members: updatedOriginalMembers,
          memberCount: updatedOriginalMembers.length
        };
      }
      return h;
    });

    // Add split household book
    onUpdateHouseholds([...updatedHouseholds, newH]);

    // 3. Update Residents profile pointer
    const updatedResidents = residents.map(r => {
      if (splitSelectedCccds.includes(r.cccd)) {
        return {
          ...r,
          householdId: splitNewHCode,
          address: splitNewAddress,
          relationToOwner: r.cccd === splitNewOwner ? "Chủ hộ" : "Thành viên tách hộ"
        };
      }
      return r;
    });

    onUpdateResidents(updatedResidents);
    setShowSplitModal(false);
    showNotice(`Tách hộ tịch thành công! Sổ mới ${splitNewHCode} đã được khởi tạo.`, "success");
  };

  const toggleSelectSplitMember = (cccd: string) => {
    if (splitSelectedCccds.includes(cccd)) {
      setSplitSelectedCccds(splitSelectedCccds.filter(c => c !== cccd));
      if (splitNewOwner === cccd) setSplitNewOwner("");
    } else {
      setSplitSelectedCccds([...splitSelectedCccds, cccd]);
      if (!splitNewOwner) setSplitNewOwner(cccd); // default select owner
    }
  };

  return (
    <div id="household-management-view" className="space-y-6">
      
      {/* Top Banner Navigation & Actions */}
      <PageHeader
        badgeIcon={<Layers className="text-emerald-600 animate-pulse" size={13} />}
        badgeText="SỔ HỘ TỊCH ĐIỆN TỬ • KHU PHỐ 3, PHƯỜNG AN PHÚ"
        badgeSubtext="ĐỀ ÁN 06/CP"
        title="Hệ thống Quản lý Hộ tịch thông minh"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Main Module Selection */}
            <div className="flex flex-wrap items-center border border-slate-200 rounded-xl p-1 bg-slate-100/80 text-xs text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "list" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Home size={13} className={activeTab === "list" ? "text-emerald-600" : "text-slate-500"} />
                <span>Hộ Gia Đình</span>
              </button>
              <button
                type="button"
                id="btn-tab-auto-recognition"
                onClick={() => setActiveTab("recognition")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "recognition" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                title="Quét dữ liệu dân cư thường trú để tự động nhận diện chủ hộ và thành viên"
              >
                <Sparkles size={13} className={activeTab === "recognition" ? "text-emerald-600" : "text-slate-500"} />
                <span>Nhận Diện Tự Động</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "dashboard" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                title="Báo cáo chuyên sâu và thống kê cơ cấu hộ"
              >
                <Layers size={13} className={activeTab === "dashboard" ? "text-emerald-600" : "text-slate-500"} />
                <span>Báo Cáo Thống Kê</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "audit" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                title="Rà soát hồ sơ trùng lặp và công cụ gộp sổ"
              >
                <GitBranch size={13} className={activeTab === "audit" ? "text-emerald-600" : "text-slate-500"} />
                <span>Trùng Lặp & Gộp Sổ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ml-auto md:ml-0 whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Lập Sổ Hộ Mới</span>
            </button>
          </div>
        }
      />

      {notice && !showAddModal && !showEditModal && !showAddMemberModal && !showMoveModal && !showSplitModal && !gisPinModalHousehold && (
        <InlineNotice
          message={notice.message}
          type={notice.type}
          onDismiss={() => setNotice(null)}
        />
      )}

        {/* RENDER BY ACTIVE MODULE TAB */}
      {activeTab === "recognition" && (
        <HouseholdAutoRecognition
          households={households}
          residents={residents}
          onUpdateHouseholds={onUpdateHouseholds}
          onUpdateResidents={onUpdateResidents}
          onSelectHousehold={(h) => {
            setSelectedHousehold(h);
            setActiveTab("list");
          }}
        />
      )}

      {activeTab === "dashboard" && (
        <HouseholdDashboard households={households} residents={residents} />
      )}

      {activeTab === "audit" && (
        <HouseholdDuplicates 
          households={households} 
          residents={residents} 
          onUpdateHouseholds={onUpdateHouseholds}
          onUpdateResidents={onUpdateResidents}
        />
      )}

      {activeTab === "list" && (
        <div className="space-y-5">
          {/* KPI SUMMARY CARDS - Đồng bộ chuẩn Executive với Quản lý Dân cư */}
            {(() => {
              const activeH = households.filter(h => !(h as any).deletedAt);
              const totalH = activeH.length;
              const ttCount = activeH.filter(h => (h.type || "Thường trú") === "Thường trú").length;
              const tamCount = activeH.filter(h => h.type === "Tạm trú").length;
              const gisCount = activeH.filter(h => h.coordinates).length;
              const totalResidentsInHh = activeH.reduce((acc, h) => acc + (h.members?.length || h.memberCount || 0), 0);

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in duration-200">
                  <StatCard
                    label="Tổng số hộ quản lý"
                    value={totalH}
                    badge="hộ điện tử"
                    highlighted={true}
                    subtext={`Quy mô ${formatVNNumber(totalResidentsInHh)} nhân khẩu`}
                    subtextRight={`TB ${(totalResidentsInHh / (totalH || 1)).toFixed(1)} người/hộ`}
                    icon={Home}
                    color="emerald"
                  />
                  <StatCard
                    label="Sổ hộ thường trú"
                    value={ttCount}
                    badge={`${((ttCount / (totalH || 1)) * 100).toFixed(0)}%`}
                    subtext="CSDL Đề án 06/CP"
                    subtextRight="Hộ khẩu gốc"
                    icon={Check}
                    color="blue"
                  />
                  <StatCard
                    label="Sổ hộ tạm trú"
                    value={tamCount}
                    badge={`${((tamCount / (totalH || 1)) * 100).toFixed(0)}%`}
                    subtext="Lưu trú, thuê trọ địa bàn"
                    subtextRight="Biến động cư trú"
                    icon={Calendar}
                    color="amber"
                  />
                  <StatCard
                    label="Số hóa mốc GIS"
                    value={gisCount}
                    badge={`${((gisCount / (totalH || 1)) * 100).toFixed(0)}%`}
                    subtext="Tọa độ không gian GIS"
                    subtextRight="100% đã ghim mốc"
                    icon={Compass}
                    color="purple"
                  />
                </div>
              );
            })()}

            {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-white p-4 rounded-xl border border-slate-200">
            {/* Search Box */}
            <HouseholdSearchInput defaultValue={searchTerm} onSearch={handleSearchChange} />

            {/* Quick selectors */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex flex-wrap items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5">
                <button
                  type="button"
                  onClick={() => { setTypeFilter("Tất cả"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${typeFilter === "Tất cả" ? "bg-white text-slate-900 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Tất cả ({households.filter(h => !(h as any).deletedAt).length})
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter("Thường trú"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${typeFilter === "Thường trú" ? "bg-white text-emerald-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Thường trú ({households.filter(h => !(h as any).deletedAt && (h.type || "Thường trú") === "Thường trú").length})
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter("Tạm trú"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${typeFilter === "Tạm trú" ? "bg-white text-amber-800 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Tạm trú ({households.filter(h => !(h as any).deletedAt && h.type === "Tạm trú").length})
                </button>
              </div>

              <div className="w-48">
                <ReportSelect
                  aria-label="Lọc theo tuyến / khu vực KP3"
                  value={toFilter}
                  onChange={(val) => {
                    setToFilter(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "all", label: "Toàn Khu phố 3" },
                    ...KP3_AREA_LIST.map((area) => ({ value: area, label: area })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Recycle bin trash toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowSoftDeleted(!showSoftDeleted);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 h-10 border rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  showSoftDeleted 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <Trash2 size={13} />
                {showSoftDeleted ? "Thùng rác Sổ" : "Xem hộ đã xóa"}
              </button>

              {/* View switches */}
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded transition-colors cursor-pointer ${viewMode === "list" ? "bg-white text-emerald-700 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                  title="Xem dạng Danh sách"
                  aria-label="Xem dạng Danh sách"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-2 rounded transition-colors cursor-pointer ${viewMode === "card" ? "bg-white text-emerald-700 border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                  title="Xem dạng Thẻ Grid"
                  aria-label="Xem dạng Thẻ Grid"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Container: Toàn bộ chiều rộng cho danh sách Sổ Hộ Khẩu */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {showSoftDeleted ? "Lưu trữ thùng rác sổ hộ khẩu" : "Danh sách sổ chính thống"} ({formatVNNumber(filteredHouseholds.length)})
              </span>
            </div>

            {viewMode === "list" ? (
              <div className="divide-y divide-slate-100 overflow-y-auto">
                {filteredHouseholds.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                    Không tìm thấy sổ hộ khẩu phù hợp bộ lọc
                  </div>
                ) : (
                  paginatedHouseholds.map((h) => {
                    const isSelected = selectedHousehold?.id === h.id && showDetailModal;
                    const hType = h.type || "Thường trú";
                    return (
                      <div 
                        key={h.id}
                        id={`household-row-${h.id}`}
                        className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all group border-b border-slate-100 last:border-b-0 ${
                          isSelected ? "bg-emerald-50/60 border-l-4 border-emerald-500" : "hover:bg-slate-50/90"
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Line 1: Mã hộ, Tên chủ hộ, Tổ KP3, Loại hộ, Tag GIS gọn gàng */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                              {h.code}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                              {extractKp3Area(h.address)}
                            </span>
                            <h3 
                              onClick={() => handleOpenDetailModal(h)}
                              className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors cursor-pointer hover:underline"
                            >
                              Hộ gia đình: {h.ownerName}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                              hType === "Tạm trú"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}>
                              {hType}
                            </span>
                            {h.coordinates ? (
                              <span 
                                title={`Tọa độ GPS mốc ranh giới: ${h.coordinates}`}
                                className="text-xs text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-help"
                              >
                                <MapPin size={12} className="text-indigo-600" />
                                <span>Đã định vị GIS</span>
                              </span>
                            ) : (
                              <span className="text-xs text-amber-800 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>Chưa có tọa độ</span>
                              </span>
                            )}
                          </div>

                          {/* Line 2: Địa chỉ vật lý & Preview danh sách nhân khẩu */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-1 font-medium text-slate-700">
                              <MapPin size={13} className="text-emerald-600 shrink-0" />
                              <span className="truncate max-w-md">{h.address}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Users size={12} className="text-slate-500" />
                              <span className="font-semibold text-slate-700">{h.memberCount} nhân khẩu</span>
                              {h.members && h.members.length > 0 && (
                                <span className="text-slate-500 hidden lg:inline">
                                  ({h.members.map(m => m.name).slice(0, 3).join(", ")}{h.members.length > 3 ? `, +${h.members.length - 3}` : ""})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Cân bằng phân cấp hành động */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto pt-2 md:pt-0">
                          <button
                            type="button"
                            onClick={() => handleDirections(h)}
                            className="px-2.5 py-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Chỉ đường tới hộ trên bản đồ số GIS"
                          >
                            <Navigation size={12} className="text-emerald-600" />
                            <span>Chỉ đường</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openPinModal(h)}
                            className="px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title={h.coordinates ? `Đã ghim: ${h.coordinates}` : "Ghim tọa độ bản đồ"}
                          >
                            <MapPin size={12} className="text-indigo-600" />
                            <span>Ghim GIS</span>
                          </button>

                          {/* PRIMARY CALL TO ACTION: XEM SỔ HỘ TỊCH */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(h)}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                            title="Mở Sổ hộ khẩu điện tử chi tiết"
                          >
                            <span>Xem sổ</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );                  })
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5 max-h-[640px] overflow-y-auto bg-slate-50/10">
                {filteredHouseholds.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 col-span-full">
                    <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                    Không tìm thấy sổ hộ khẩu nào
                  </div>
                ) : (
                  paginatedHouseholds.map((h) => {
                    const isSelected = selectedHousehold?.id === h.id && showDetailModal;
                    const hType = h.type || "Thường trú";
                    return (
                      <div 
                        key={h.id}
                        id={`household-card-${h.id}`}
                        onClick={() => handleOpenDetailModal(h)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-colors flex flex-col justify-between gap-3 bg-white group
                          ${isSelected 
                            ? "border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/20" 
                            : "border-slate-200 hover:border-slate-300"
                          }
                        `}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{h.code}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">{extractKp3Area(h.address)}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 border ${hType === "Tạm trú" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                              {hType}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">Chủ hộ: {h.ownerName}</h3>
                          <p className="text-xs text-slate-600 flex items-center gap-1">
                            <MapPin size={12} className="shrink-0 text-slate-500" /> <span className="truncate">{h.address}</span>
                          </p>
                        </div>
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDirections(h)}
                              className="min-h-[34px] px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                              title="Chỉ đường trên bản đồ GIS"
                            >
                              <Navigation size={12} />
                              <span>Dẫn đường</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openPinModal(h)}
                              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-0.5 border cursor-pointer ${
                                h.coordinates 
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              }`}
                              title={h.coordinates ? `Tọa độ: ${h.coordinates}` : "Thêm tọa độ GIS"}
                              aria-label="Ghim tọa độ GIS"
                            >
                              <MapPin size={12} />
                            </button>
                          </div>
                          <span className="text-xs text-emerald-700 font-bold group-hover:underline flex items-center gap-0.5 cursor-pointer" onClick={() => handleOpenDetailModal(h)}>
                            Chi tiết ➜
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-auto border-t border-slate-100 p-3.5 bg-slate-50/50">
              <Pagination
                id="household-pagination"
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>

          {/* MODAL CHI TIẾT SỔ HỘ KHẨU (Chuẩn Flat Hairline • Neo đỉnh • ‹ › chuyển sổ) */}
          {selectedHousehold && (() => {
            const hhIdx = filteredHouseholds.findIndex((h) => h.id === selectedHousehold.id);
            const hasPrev = hhIdx > 0;
            const hasNext = hhIdx >= 0 && hhIdx < filteredHouseholds.length - 1;

            return (
              <Modal
                isOpen={showDetailModal}
                onClose={handleCloseDetailModal}
                title={`Hộ gia đình: ${selectedHousehold.ownerName}`}
                size="4xl"
                bodyClassName="p-4 sm:p-6 space-y-4 bg-slate-50"
                footerClassName="justify-between"
                headerNavigation={{
                  hasPrev,
                  hasNext,
                  prevLabel: "Sổ hộ trước",
                  nextLabel: "Sổ hộ sau",
                  onPrev: () => hasPrev && handleOpenDetailModal(filteredHouseholds[hhIdx - 1]),
                  onNext: () => hasNext && handleOpenDetailModal(filteredHouseholds[hhIdx + 1]),
                }}
                headerSlot={
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                      <Home size={22} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {selectedHousehold.code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold border ${
                          selectedHousehold.type === "Tạm trú"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}>
                          {selectedHousehold.type || "Thường trú"}
                        </span>
                        <span className="font-semibold text-slate-600">
                          {extractKp3Area(selectedHousehold.address)} · {selectedHousehold.members.length} nhân khẩu
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                        Hộ gia đình: {selectedHousehold.ownerName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <MapPin size={13} className="text-emerald-700 shrink-0" aria-hidden="true" />
                          <span className="truncate max-w-md">{selectedHousehold.address}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                }
                subHeader={
                  <div className="flex px-5 sm:px-6 gap-6 text-xs font-bold overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setDetailTab("members")}
                      className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        detailTab === "members" ? "text-emerald-800 font-extrabold" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Users size={15} aria-hidden="true" />
                      <span>Thông tin & Thành viên ({selectedHousehold.members.length})</span>
                      {detailTab === "members" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab("businesses")}
                      className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        detailTab === "businesses" ? "text-emerald-800 font-extrabold" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Home size={15} aria-hidden="true" />
                      <span>Hộ kinh doanh tại địa chỉ</span>
                      {detailTab === "businesses" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-700" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab("history")}
                      className={`py-3 transition-colors relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        detailTab === "history" ? "text-slate-900 font-extrabold" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <History size={15} aria-hidden="true" />
                      <span>Nhật ký biến động</span>
                      {detailTab === "history" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900" />}
                    </button>
                  </div>
                }
                footer={
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        id="btn-modal-tree"
                        onClick={() => setShowTreeModal(true)}
                        className="min-h-9 flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <GitBranch size={14} className="text-emerald-700" aria-hidden="true" />
                        <span>Sơ đồ Phả Hệ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDirections(selectedHousehold);
                          setShowDetailModal(false);
                        }}
                        className="min-h-9 flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <Navigation size={13} className="text-emerald-700" aria-hidden="true" />
                        <span>Chỉ đường GIS</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {showSoftDeleted ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleRestoreHousehold(selectedHousehold.id);
                            setShowDetailModal(false);
                          }}
                          className="min-h-9 flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Undo2 size={13} aria-hidden="true" /> Khôi phục sổ
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSoftDeleteHousehold(selectedHousehold.id)}
                          className="min-h-9 flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <span>Đóng sổ / Chuyển đi</span>
                        </button>
                      )}
                      <button
                        type="button"
                        id="btn-close-household-footer"
                        onClick={handleCloseDetailModal}
                        className="min-h-9 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        id="btn-modal-edit-household"
                        onClick={startEditHousehold}
                        className="min-h-9 flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Edit3 size={13} aria-hidden="true" />
                        <span>Chỉnh sửa sổ hộ</span>
                      </button>
                    </div>
                  </>
                }
              >
                {detailTab === "members" && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Thông tin Sổ Hộ Khẩu</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPinModal(selectedHousehold)}
                            className="min-h-8 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <MapPin size={12} className="text-indigo-600" aria-hidden="true" />
                            <span>{selectedHousehold.coordinates ? "Sửa tọa độ" : "Ghim tọa độ"}</span>
                          </button>
                          {selectedHousehold.coordinates && (
                            <a
                              href={getGoogleMapsDirectionUrl(
                                parseGisCoords(selectedHousehold.coordinates)?.lat || 10.936997,
                                parseGisCoords(selectedHousehold.coordinates)?.lng || 106.744645,
                                selectedHousehold.address
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-8 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} aria-hidden="true" />
                              <span>Google Maps</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <DetailGrid>
                        <DetailRow label="Mã sổ hộ khẩu" value={selectedHousehold.code} copyValue={selectedHousehold.code} isMono />
                        <DetailRow label="Chủ hộ" value={selectedHousehold.ownerName} />
                        <DetailRow label="Loại cư trú" value={selectedHousehold.type || "Thường trú"} />
                        <DetailRow label="Khu vực KP3" value={extractKp3Area(selectedHousehold.address)} />
                        <DetailRow label="Số nhân khẩu" value={`${selectedHousehold.members.length} người`} isNumeric />
                        <DetailRow label="Tọa độ GIS" value={selectedHousehold.coordinates} copyValue={selectedHousehold.coordinates} isMono />
                        <DetailRow label="Địa chỉ thường trú" value={selectedHousehold.address} colSpan={2} />
                      </DetailGrid>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Danh sách nhân khẩu ({selectedHousehold.members.length})</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFullPii(prev => !prev)}
                          className="min-h-8 flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-300"
                          aria-pressed={showFullPii}
                        >
                          {showFullPii ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                          <span>{showFullPii ? "Che CCCD/SĐT" : "Hiện CCCD/SĐT"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDetailModal(false);
                            setActiveTab("recognition");
                          }}
                          className="min-h-8 flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-300"
                        >
                          <Sparkles size={13} className="text-emerald-700" aria-hidden="true" /> Nhận diện Dân cư
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddMemberModal(true)}
                          className="min-h-8 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          <UserPlus size={13} aria-hidden="true" /> Thêm nhân khẩu
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedHousehold.members.map(m => (
                        <div key={m.cccd} className="p-3.5 bg-white hover:border-slate-300 border border-slate-200 rounded-2xl space-y-2.5 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <button
                              type="button"
                              onClick={() => setProfileViewMember({ name: m.name, relation: m.relation, cccd: m.cccd })}
                              className="text-left cursor-pointer hover:text-emerald-800 transition-colors flex-1 min-w-0"
                            >
                              <h4 className="font-bold text-slate-900 text-sm hover:underline truncate">{m.name}</h4>
                              <p className="text-xs text-slate-600 font-mono mt-0.5 truncate">
                                Sinh {m.birthYear} • CCCD: {maskCccd(m.cccd, showFullPii)}
                              </p>
                            </button>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold shrink-0 border ${
                              m.relation === "Chủ hộ"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {m.relation}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-600 font-mono truncate">
                              {m.phone && m.phone !== "N/A" ? maskPhone(m.phone, showFullPii) : "—"}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setProfileViewMember({ name: m.name, relation: m.relation, cccd: m.cccd })}
                                className="min-h-7 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
                              >
                                Hồ sơ
                              </button>
                              <button
                                type="button"
                                onClick={() => startMoveMember(m.name, m.cccd)}
                                className="min-h-7 text-xs bg-white hover:bg-slate-100 text-indigo-700 border border-slate-300 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
                              >
                                Chuyển
                              </button>
                              {m.relation !== "Chủ hộ" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={startSplitHousehold}
                                    className="min-h-7 text-xs bg-white hover:bg-slate-100 text-emerald-800 border border-slate-300 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
                                  >
                                    Tách
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(m.cccd)}
                                    className="min-h-7 text-xs text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                    aria-label={`Xóa ${m.name} khỏi sổ`}
                                  >
                                    <Trash2 size={14} aria-hidden="true" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailTab === "businesses" && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <HouseholdBusinesses
                      household={selectedHousehold}
                      residents={residents}
                    />
                  </div>
                )}

                {detailTab === "history" && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Nhật ký biến động và sửa đổi sổ</span>
                    {((selectedHousehold as any).auditHistory || []).length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">Chưa ghi nhận biến động chính thức nào kể từ ngày lập sổ.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {((selectedHousehold as any).auditHistory || []).map((log: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs">
                            <History size={14} className="text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
                            <div>
                              <p className="text-slate-800 font-semibold">{log.action}</p>
                              <span className="text-xs text-slate-500 font-mono block mt-0.5">{log.date} • Cán bộ: {log.actor}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Modal>
            );
          })()}
        </div>
      )}

      {/* Lập Sổ Hộ Khẩu Mới Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90dvh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-900 p-4 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-sm">Lập Sổ Hộ Khẩu Điện Tử Mới</h3>
                <p className="text-xs text-slate-600 mt-0.5">Phân khoa số hóa Tư pháp cơ sở</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ lập sổ mới"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateHousehold} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="new-h-code" className="font-bold text-slate-700 block">Mã số Sổ Hộ Khẩu *</label>
                  <input 
                    id="new-h-code"
                    type="text"
                    required
                    placeholder="HK-XXX"
                    value={newHCode}
                    onChange={(e) => setNewHCode(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Loại cư trú *</label>
                  <ReportSelect
                    aria-label="Loại cư trú"
                    value={newHType}
                    onChange={(val) => setNewHType(val as "Thường trú" | "Tạm trú")}
                    options={[
                      { value: "Thường trú", label: "Thường trú (KT1, KT2)" },
                      { value: "Tạm trú", label: "Tạm trú (KT3, KT4)" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label htmlFor="new-h-owner" className="font-bold text-slate-700 block">Tên Chủ hộ mới *</label>
                  <input 
                    id="new-h-owner"
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="new-h-address" className="font-bold text-slate-700 block">Địa chỉ Đăng ký Thường trú *</label>
                <input 
                  id="new-h-address"
                  type="text"
                  required
                  placeholder="Số..., đường Lương Định Của, Phường An Phú"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              {/* LIVE COORDINATE INPUT & FEEDBACK */}
              <div className="space-y-1">
                <label htmlFor="new-h-coord" className="font-bold text-slate-700 block flex justify-between gap-2">
                  <span>Tọa độ GPS WGS84 (Vĩ độ, Kinh độ)</span>
                  <span className="font-normal text-slate-500 font-mono">VD: 10.936828, 106.743392</span>
                </label>
                <input 
                  id="new-h-coord"
                  type="text"
                  placeholder="Dán hoặc điền tọa độ GPS có sẵn..."
                  value={coordInput}
                  onChange={(e) => handleCoordInputChange(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
                />
                {parsedGPS && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-mono">
                    ✓ Phát hiện hệ WGS84: Vĩ độ <strong>{parsedGPS.lat}</strong>, Kinh độ <strong>{parsedGPS.lng}</strong>
                  </div>
                )}
              </div>

              {/* Sub-members registration */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-xs">Đăng ký thêm thành viên hộ</span>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text"
                    aria-label="Tên thành viên"
                    placeholder="Tên thành viên"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="px-3 h-10 border border-slate-200 rounded-lg bg-white"
                  />
                  <input 
                    type="text"
                    aria-label="Số CCCD"
                    placeholder="Số CCCD"
                    value={newMemberCccd}
                    onChange={(e) => setNewMemberCccd(e.target.value)}
                    className="px-3 h-10 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                    onChange={(e) => setNewMemberBirthYear(e.target.value ? Number(e.target.value) : "")}
                    className="sm:col-span-1 px-3 h-10 border border-slate-200 rounded-lg bg-white"
                  />
                  <input 
                    type="text"
                    aria-label="Số điện thoại"
                    placeholder="Số ĐT"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    className="sm:col-span-1 px-3 h-10 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddTempMember}
                  className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer flex justify-center items-center gap-1.5 text-xs"
                >
                  <Plus size={14} /> Thêm thành viên vào danh sách tạm
                </button>

                {tempMembers.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-200 pt-2 text-xs">
                    <span className="font-bold text-slate-600 uppercase text-xs block">Danh sách đăng ký tạm ({tempMembers.length})</span>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {tempMembers.map((m, idx) => (
                        <div key={idx} className="p-2 bg-white border border-slate-200 rounded-lg flex justify-between items-center font-mono">
                          <span>{m.name} ({m.relation})</span>
                          <button
                            type="button"
                            onClick={() => setTempMembers(tempMembers.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                          >
                            Xóa
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
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Lập Sổ Hộ Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sửa Thông tin Sổ Hộ Khẩu Modal */}
      {showEditModal && selectedHousehold && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-900 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Chỉnh sửa thông tin Sổ</h3>
                <p className="text-xs text-slate-600 mt-0.5">Sổ ID: {selectedHousehold.code}</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ sửa sổ"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditHousehold} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="space-y-1">
                <label htmlFor="edit-h-address" className="font-bold text-slate-700 block">Địa chỉ cư trú</label>
                <input 
                  id="edit-h-address"
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Chủ hộ đại diện</label>
                  <ReportSelect
                    aria-label="Chủ hộ đại diện"
                    value={editOwner}
                    onChange={setEditOwner}
                    options={selectedHousehold.members.map(m => ({
                      value: m.name,
                      label: `${m.name} (${m.relation})`
                    }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Phân hệ cư trú</label>
                  <ReportSelect
                    aria-label="Phân hệ cư trú"
                    value={editType}
                    onChange={(val) => setEditType(val as "Thường trú" | "Tạm trú")}
                    options={[
                      { value: "Thường trú", label: "Thường trú" },
                      { value: "Tạm trú", label: "Tạm trú" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <label htmlFor="edit-h-coord" className="font-bold text-slate-700 block">GPS vệ tinh WGS84</label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(editAddress || selectedHousehold.address, selectedHousehold.code);
                      setCoordInput(auto.dms);
                      setParsedGPS(parseCoordinates(auto.dms));
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} className="text-emerald-600" /> Tự động nhận diện từ địa chỉ
                  </button>
                </div>
                <input 
                  id="edit-h-coord"
                  type="text"
                  placeholder="Dán hoặc chỉnh sửa tọa độ..."
                  value={coordInput}
                  onChange={(e) => handleCoordInputChange(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500 bg-white"
                />
                {parsedGPS && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-mono">
                    ✓ Phát hiện WGS84: {parsedGPS.lat}, {parsedGPS.lng}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Ghi chú biến động / Nguyên nhân thay đổi</label>
                <textarea 
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Nhập ghi chú biến động lưu trữ..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg h-20 focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thêm nhân khẩu vào Hộ tịch Modal */}
      {showAddMemberModal && selectedHousehold && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-900 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Thêm Nhân khẩu vào Hộ tịch</h3>
                <p className="text-xs text-slate-600 mt-0.5">Sổ HK: {selectedHousehold.code}</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ thêm nhân khẩu"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddNewMember} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="space-y-1">
                <label htmlFor="add-mem-name" className="font-bold text-slate-700 block">Họ và tên thành viên *</label>
                <input 
                  id="add-mem-name"
                  type="text"
                  required
                  placeholder="Nguyễn Văn B"
                  value={addMemName}
                  onChange={(e) => setAddMemName(e.target.value)}
                  className="w-full px-3 h-10 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="add-mem-cccd" className="font-bold text-slate-700 block">Số CCCD gắn chip *</label>
                  <input 
                    id="add-mem-cccd"
                    type="text"
                    required
                    placeholder="079XXXXXXXXX"
                    value={addMemCccd}
                    onChange={(e) => setAddMemCccd(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="add-mem-year" className="font-bold text-slate-700 block">Năm sinh *</label>
                  <input 
                    id="add-mem-year"
                    type="number"
                    required
                    placeholder="1995"
                    value={addMemBirthYear}
                    onChange={(e) => setAddMemBirthYear(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 h-10 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Quan hệ với chủ hộ *</label>
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
                <div className="space-y-1">
                  <label htmlFor="add-mem-phone" className="font-bold text-slate-700 block">Số điện thoại di động</label>
                  <input 
                    id="add-mem-phone"
                    type="text"
                    placeholder="09XXXXXXXX"
                    value={addMemPhone}
                    onChange={(e) => setAddMemPhone(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Xác nhận Nhập khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chuyển hộ tịch Modal */}
      {showMoveModal && selectedHousehold && moveTargetMember && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-900 p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Chuyển hộ tịch Nhân khẩu</h3>
              <button 
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ chuyển hộ tịch"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="leading-relaxed">
                Đang thực hiện chuyển nhân khẩu <strong>{moveTargetMember.name}</strong> (CCCD: {maskCccd(moveTargetMember.cccd, showFullPii)}) từ Sổ hộ khẩu hiện tại ({selectedHousehold.code}) sang một Sổ hộ khẩu điện tử đích khác.
              </p>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Lựa chọn Sổ hộ khẩu đích</label>
                <ReportSelect
                  aria-label="Sổ hộ khẩu đích"
                  value={moveTargetHCode}
                  onChange={setMoveTargetHCode}
                  options={households
                    .filter(h => h.id !== selectedHousehold.id && !(h as any).deletedAt)
                    .map(h => ({
                      value: h.code,
                      label: `${h.code} - Hộ ${h.ownerName} (${h.address})`
                    }))}
                  className="w-full"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handlePerformMoveMember}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Xác nhận chuyển hộ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tách hộ tịch Modal */}
      {showSplitModal && selectedHousehold && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-900 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Tách hộ tịch (Chia tách gia đình)</h3>
                <p className="text-xs text-slate-600 mt-0.5">Sổ nguồn: {selectedHousehold.code}</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ tách hộ tịch"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              {/* Step 1: select members to split */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Tích chọn các thành viên muốn tách sổ *</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  {selectedHousehold.members.filter(m => m.relation !== "Chủ hộ").map(m => (
                    <div key={m.cccd} className="flex items-center gap-2 select-none">
                      <input 
                        type="checkbox"
                        id={`split-${m.cccd}`}
                        checked={splitSelectedCccds.includes(m.cccd)}
                        onChange={() => toggleSelectSplitMember(m.cccd)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded cursor-pointer"
                      />
                      <label htmlFor={`split-${m.cccd}`} className="text-slate-800 cursor-pointer font-semibold">
                        {m.name} ({m.relation})
                      </label>
                    </div>
                  ))}
                  {selectedHousehold.members.filter(m => m.relation !== "Chủ hộ").length === 0 && (
                    <p className="text-xs text-slate-500 italic">Sổ này không có thành viên phụ để tách!</p>
                  )}
                </div>
              </div>

              {splitSelectedCccds.length > 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label htmlFor="split-new-h-code" className="font-bold text-slate-700 block">Mã số Sổ mới *</label>
                      <input 
                        id="split-new-h-code"
                        type="text"
                        value={splitNewHCode}
                        onChange={(e) => setSplitNewHCode(e.target.value)}
                        className="w-full px-3 h-10 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-indigo-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Chỉ định Chủ hộ mới *</label>
                      <ReportSelect
                        aria-label="Chỉ định chủ hộ mới"
                        value={splitNewOwner}
                        onChange={setSplitNewOwner}
                        options={[
                          { value: "", label: "-- Lựa chọn --" },
                          ...selectedHousehold.members
                            .filter(m => splitSelectedCccds.includes(m.cccd))
                            .map(m => ({ value: m.cccd, label: m.name }))
                        ]}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="split-new-address" className="font-bold text-slate-700 block">Địa chỉ sổ mới đăng ký *</label>
                    <input 
                      id="split-new-address"
                      type="text"
                      value={splitNewAddress}
                      onChange={(e) => setSplitNewAddress(e.target.value)}
                      className="w-full px-3 h-10 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handlePerformSplitHousehold}
                  disabled={splitSelectedCccds.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Xác nhận tách hộ tịch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sơ đồ Cây gia đình phả hệ Modal */}
      {showTreeModal && selectedHousehold && (
        <HouseholdFamilyTree 
          household={selectedHousehold}
          onClose={() => setShowTreeModal(false)}
          onSelectMember={(name, relation, cccd) => {
            setProfileViewMember({ name, relation, cccd });
          }}
        />
      )}

      {/* Chi tiết Profile thành viên Modal */}
      {profileViewMember && (
        <HouseholdMemberProfile 
          resident={residents.find(r => r.cccd === profileViewMember.cccd) || null}
          relation={profileViewMember.relation}
          onClose={() => setProfileViewMember(null)}
        />
      )}

      {/* MODAL GHIM / ĐỒNG BỘ TỌA ĐỘ GIS HỘ KHẨU */}
      {gisPinModalHousehold && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setGisPinModalHousehold(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Modal Header: Flat Hairline */}
            <div className="bg-slate-50 p-4 text-slate-900 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ghim & Đồng bộ Tọa độ GIS Hộ Khẩu</h3>
                  <p className="text-xs text-slate-600 font-mono">
                    Hộ: {gisPinModalHousehold.ownerName} • Mã sổ: {gisPinModalHousehold.code}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setGisPinModalHousehold(null)}
                className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ ghim tọa độ GIS"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider block">Địa chỉ hộ cư trú:</span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{gisPinModalHousehold.address}</p>
                <span className="text-xs text-slate-600 block">Khu phố 3, Phường An Phú, TP. Hồ Chí Minh</span>
              </div>

              {/* Coordinate Input */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <label htmlFor="gis-pin-coord-input" className="font-bold text-slate-700">Tọa độ GIS (Định dạng DMS hoặc Thập phân):</label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(gisPinModalHousehold.address, gisPinModalHousehold.code);
                      setGisPinInput(auto.dms);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Tự động ước tính tọa độ dựa trên địa chỉ hộ trong ranh giới KP3"
                  >
                    <Sparkles size={12} className="text-emerald-600" /> Tự động nhận diện từ địa chỉ
                  </button>
                </div>

                <div className="relative">
                  <input 
                    id="gis-pin-coord-input"
                    type="text"
                    value={gisPinInput}
                    onChange={(e) => setGisPinInput(e.target.value)}
                    placeholder="Ví dụ: 10°56'13.2&quot;N 106°44'40.8&quot;E hoặc 10.936997, 106.744645"
                    className="w-full px-3.5 h-10 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white pr-9"
                  />
                  <MapPin size={15} className="absolute right-3 top-3 text-slate-400" />
                </div>
              </div>

              {/* Presets for KP3 */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Gợi ý phân khu / tuyến đường nhanh:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'13.2"N 106°44\'40.7"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">42 Lương Định Của</strong>
                    <span className="text-xs text-slate-600 font-mono">10.936997, 106.744645</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'16.1"N 106°44\'43.8"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 42 Lương Định Của</strong>
                    <span className="text-xs text-slate-600 font-mono">10.937800, 106.745500</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'08.9"N 106°44\'48.5"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 18 Lương Định Của</strong>
                    <span className="text-xs text-slate-600 font-mono">10.935800, 106.746800</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'12.5"N 106°44\'42.6"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">KDC Giáp ranh Tây Bắc KP3</strong>
                    <span className="text-xs text-slate-600 font-mono">10.936800, 106.744600</span>
                  </button>
                </div>
              </div>

              {/* Status helper */}
              {gisPinInput && (() => {
                const parsed = parseGisCoords(gisPinInput);
                if (parsed) {
                  return (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check size={13} className="text-emerald-600" />
                        <span>Tọa độ hợp lệ: {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)}</span>
                      </div>
                      <span className="font-mono text-xs bg-emerald-100 px-2 py-0.5 rounded">
                        {decimalToDMS(parsed.lat, parsed.lng)}
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-amber-600 shrink-0" />
                      <span>Đang kiểm tra định dạng tọa độ. Vui lòng nhập đúng chuẩn hoặc bấm nút tự động nhận diện.</span>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setGisPinModalHousehold(null)}
                className="px-3.5 py-2 text-slate-700 hover:bg-slate-200/70 border border-slate-200 bg-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Lưu & Đồng bộ GIS
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>Lưu & Dẫn đường ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notice && (showAddModal || showEditModal || showAddMemberModal || showMoveModal || showSplitModal || gisPinModalHousehold) && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-md w-full px-4 sm:px-0">
          <InlineNotice
            message={notice.message}
            type={notice.type}
            onDismiss={() => setNotice(null)}
          />
        </div>
      )}

      {confirmDialog && (
        <ConfirmModal
          isOpen={true}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
