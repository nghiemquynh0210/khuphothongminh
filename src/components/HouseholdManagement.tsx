import React, { useState, useEffect } from "react";
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
  RefreshCw
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
  const [typeFilter, setTypeFilter] = useState<"Tất cả" | "Thường trú" | "Tạm trú">("Tất cả");
  const [showSoftDeleted, setShowSoftDeleted] = useState(false); // Recycle bin toggle
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const itemsPerPage = 8;

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
  const [gisPinToast, setGisPinToast] = useState<string | null>(null);

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
      alert("Vui lòng nhập hoặc lấy tọa độ GIS!");
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
      setGisPinToast(`Đã đồng bộ tọa độ Hộ ${targetH.ownerName} (${finalCoord}) lên bản đồ GIS!`);
      setTimeout(() => setGisPinToast(null), 3500);
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

  // Filter households by search, type, and soft-delete status
  const filteredHouseholds = households.filter((h) => {
    const isDeleted = !!(h as any).deletedAt;
    if (showSoftDeleted !== isDeleted) return false;

    const matchesSearch = 
      h.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.members.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.cccd.includes(searchTerm));
    
    const matchesType = typeFilter === "Tất cả" || (h.type || "Thường trú") === typeFilter;
    
    return matchesSearch && matchesType;
  });

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
      alert("Vui lòng điền đầy đủ các thông mục có dấu sao (*)");
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
      alert("Vui lòng điền tên, CCCD và năm sinh thành viên tạm thời!");
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
      alert("Cảnh báo: Không thể xóa sổ hộ khẩu khi vẫn còn thành viên cư ngụ! Vui lòng thực hiện tách hộ hoặc chuyển thành viên trước.");
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa (Soft Delete) Sổ hộ khẩu ${target.code}? Sổ sẽ được chuyển vào mục lưu trữ.`)) return;

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
    alert("Khôi phục sổ hộ khẩu thành công!");
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
      alert("Không thể xóa chủ hộ khỏi sổ! Hãy chỉ định một chủ hộ mới bằng cách Sửa sổ trước.");
      return;
    }

    if (!confirm(`Bạn chắc chắn muốn xóa thành viên ${member.name} khỏi sổ hộ tịch ${selectedHousehold.code}?`)) return;

    // Update Household Members
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

    // Update Residents to NA household
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
      alert("Vui lòng nhập tên, CCCD và năm sinh!");
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
      alert("Hộ tịch đích không tồn tại!");
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
    alert(`Đã chuyển nhân khẩu ${moveTargetMember.name} cư trú sang sổ ${targetH.code} thành công.`);
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
      alert("Vui lòng tích chọn thành viên tách và nhập mã sổ mới + chủ hộ mới!");
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
    alert(`Tách hộ tịch thành công! Sổ mới ${splitNewHCode} đã được khởi tạo.`);
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
    <div className="space-y-6 font-sans text-sm bg-slate-50/50 p-4 sm:p-6 rounded-2xl border border-slate-100">
      
      {/* Top Banner Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="text-emerald-600 animate-pulse" size={20} />
            <h1 className="font-black text-slate-800 text-lg tracking-tight">Hệ thống Quản lý Hộ tịch thông minh</h1>
          </div>
          <p className="text-xs text-slate-400">Đồng bộ cơ sở dữ liệu quốc gia, rà soát địa chỉ GPS & kiểm duyệt liên ngành tự quản</p>
        </div>

        {/* Action and view tabs bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Module Selection */}
          <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100 gap-0.5 text-xs">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === "list" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Hộ Gia Đình
            </button>
            <button
              id="btn-tab-auto-recognition"
              onClick={() => setActiveTab("recognition")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "recognition" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Sparkles size={13} className="text-emerald-600" /> Tự Nhận Diện Hộ
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === "dashboard" ? "bg-white text-indigo-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Thống Kê Thẻ
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === "audit" ? "bg-white text-amber-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Trùng Lặp & Gộp
            </button>
          </div>

          <button
            id="btn-scan-residents"
            onClick={() => setActiveTab("recognition")}
            className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            title="Quét dữ liệu dân cư thường trú để tự động nhận diện chủ hộ và thành viên"
          >
            <Sparkles size={14} className="text-emerald-600" /> Nhận diện từ Dân cư
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <Plus size={14} /> Lập Sổ Mới
          </button>
        </div>
      </div>

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
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                id="household-search-input"
                name="householdSearchTerm"
                type="text"
                placeholder="Tìm kiếm theo chủ hộ, mã số sổ, địa chỉ, CCCD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>

            {/* Quick selectors */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5">
                <button
                  onClick={() => setTypeFilter("Tất cả")}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${typeFilter === "Tất cả" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                >
                  Tất cả ({households.filter(h => !(h as any).deletedAt).length})
                </button>
                <button
                  onClick={() => setTypeFilter("Thường trú")}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${typeFilter === "Thường trú" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                >
                  Thường trú ({households.filter(h => !(h as any).deletedAt && (h.type || "Thường trú") === "Thường trú").length})
                </button>
                <button
                  onClick={() => setTypeFilter("Tạm trú")}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${typeFilter === "Tạm trú" ? "bg-white text-amber-800 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                >
                  Tạm trú ({households.filter(h => !(h as any).deletedAt && h.type === "Tạm trú").length})
                </button>
              </div>

              {/* Recycle bin trash toggle */}
              <button
                onClick={() => {
                  setShowSoftDeleted(!showSoftDeleted);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1 px-3 py-2 border rounded-xl font-bold transition-all cursor-pointer ${
                  showSoftDeleted 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
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
                  className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "list" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
                  title="Xem dạng Danh sách"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "card" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
                  title="Xem dạng Thẻ Grid"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Container: Toàn bộ chiều rộng cho danh sách Sổ Hộ Khẩu */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {showSoftDeleted ? "Lưu trữ thùng rác sổ hộ khẩu" : "Danh sách sổ chính thống"} ({filteredHouseholds.length})
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
                        onClick={() => handleOpenDetailModal(h)}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors group
                          ${isSelected ? "bg-emerald-50/50 border-l-4 border-emerald-500" : "hover:bg-slate-50/70"}
                        `}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{h.code}</span>
                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">{h.ownerName}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hType === "Tạm trú" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                              {hType}
                            </span>
                            {h.coordinates && (
                              <span className="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                GPS: {h.coordinates}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">{h.address}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleDirections(h)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            title="Chỉ đường / Dẫn đường trực tiếp tới hộ trên bản đồ GIS"
                          >
                            <Navigation size={13} />
                            <span>Chỉ đường</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openPinModal(h)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
                              h.coordinates 
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            }`}
                            title={h.coordinates ? `Đã ghim GIS: ${h.coordinates}` : "Ghim tọa độ bản đồ GIS"}
                          >
                            <MapPin size={12} />
                            <span>{h.coordinates ? "Ghim GIS" : "+ Tọa độ"}</span>
                          </button>
                          <span className="hidden md:flex text-xs font-semibold text-slate-600 items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-full">
                            <Users size={12} className="text-slate-500" /> {h.memberCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(h)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-colors cursor-pointer"
                            title="Xem chi tiết Sổ hộ khẩu"
                          >
                            <span>Xem Sổ</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
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
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 bg-white hover:shadow-md group
                          ${isSelected 
                            ? "border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/20" 
                            : "border-slate-150 hover:border-slate-300"
                          }
                        `}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">{h.code}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${hType === "Tạm trú" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                              {hType}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">Chủ hộ: {h.ownerName}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={12} className="shrink-0 text-slate-400" /> <span className="truncate">{h.address}</span>
                          </p>
                        </div>
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDirections(h)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              title="Chỉ đường trên bản đồ GIS"
                            >
                              <Navigation size={11} />
                              <span>Dẫn đường</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openPinModal(h)}
                              className={`p-1 rounded-lg text-[11px] font-semibold flex items-center gap-0.5 border ${
                                h.coordinates 
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              }`}
                              title={h.coordinates ? `Tọa độ: ${h.coordinates}` : "Thêm tọa độ GIS"}
                            >
                              <MapPin size={11} />
                            </button>
                          </div>
                          <span className="text-[11px] text-emerald-700 font-bold group-hover:underline flex items-center gap-0.5" onClick={() => handleOpenDetailModal(h)}>
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

          {/* MODAL CHI TIẾT SỔ HỘ KHẨU Ở CHÍNH GIỮA VIEWPORT (Chuẩn Reference KP3) */}
          {showDetailModal && selectedHousehold && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-[2px] animate-in fade-in duration-200"
              onClick={handleCloseDetailModal}
            >
              <div 
                id="household-detail-modal"
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
              >
                {/* Header: Dark Navy Gradient & Centered Home Icon / Owner Name / Badges */}
                <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 pt-6 pb-5 text-white relative text-center border-b border-slate-800 shrink-0">
                  <button 
                    id="btn-close-household-modal"
                    onClick={handleCloseDetailModal}
                    className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Đóng (Esc)"
                  >
                    <X size={18} />
                  </button>

                  {/* Centered Circular Household Icon */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-300 mx-auto flex items-center justify-center shadow-lg ring-4 ring-slate-800/80 mb-2.5">
                    <Home size={32} className="text-emerald-300" />
                  </div>

                  {/* Centered Owner Name */}
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight text-center leading-snug break-words">
                    Hộ: {selectedHousehold.ownerName}
                  </h2>

                  {/* Centered Badges: Mã Sổ (green) & Loại hộ (blue) & Nhân khẩu */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest font-mono bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      SỔ HỘ KHẨU ĐIỆN TỬ
                    </span>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                      {selectedHousehold.code}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider ${
                      selectedHousehold.type === "Tạm trú" 
                        ? "bg-amber-950/80 text-amber-300 border border-amber-500/40" 
                        : "bg-blue-950/80 text-blue-300 border border-blue-500/40"
                    }`}>
                      {selectedHousehold.type || "Thường trú"}
                    </span>
                    <span className="text-[11px] font-bold bg-slate-800/80 text-slate-200 border border-slate-700/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Users size={12} className="text-emerald-400" />
                      <span>{selectedHousehold.members.length} nhân khẩu</span>
                    </span>
                  </div>

                  {/* Address & GPS & Quick Navigation */}
                  <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs w-full max-w-2xl mx-auto">
                    <div className="text-left text-slate-200 space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate">{selectedHousehold.address}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                        {selectedHousehold.coordinates ? (
                          <span>Tọa độ GIS: <strong className="text-indigo-300 font-bold">{selectedHousehold.coordinates}</strong></span>
                        ) : (
                          <span className="text-amber-400 italic">Chưa ghim vị trí trên bản đồ GIS</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          handleDirections(selectedHousehold);
                          setShowDetailModal(false);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        title="Dẫn đường trực tiếp trên bản đồ số GIS Khu phố 3"
                      >
                        <Navigation size={13} />
                        <span>Dẫn đường GIS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openPinModal(selectedHousehold)}
                        className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/40 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Cập nhật tọa độ ghim trên bản đồ GIS"
                      >
                        <MapPin size={13} />
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
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="Mở chỉ đường ngoài ứng dụng bằng Google Maps GPS"
                        >
                          <ExternalLink size={12} />
                          <span>Google Maps</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-tabs header */}
                <div className="flex border-b border-slate-200 bg-white px-6 gap-6 text-xs font-bold shrink-0">
                  <button 
                    onClick={() => setDetailTab("members")}
                    className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-1.5 ${
                      detailTab === "members" ? "text-emerald-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Users size={15} />
                    <span>Thành viên nhân khẩu ({selectedHousehold.members.length})</span>
                    {detailTab === "members" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}
                  </button>
                  <button 
                    onClick={() => setDetailTab("businesses")}
                    className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-1.5 ${
                      detailTab === "businesses" ? "text-indigo-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Home size={15} />
                    <span>Hộ kinh doanh tại địa chỉ</span>
                    {detailTab === "businesses" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
                  </button>
                  <button 
                    onClick={() => setDetailTab("history")}
                    className={`py-3.5 transition-all relative cursor-pointer flex items-center gap-1.5 ${
                      detailTab === "history" ? "text-slate-900 font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <History size={15} />
                    <span>Nhật ký biến động</span>
                    {detailTab === "history" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900"></div>}
                  </button>
                </div>

                {/* Nội dung chi tiết cuộn độc lập */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/60">
                  {detailTab === "members" && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách nhân khẩu thường trú / tạm trú</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setShowDetailModal(false);
                              setActiveTab("recognition");
                            }}
                            className="flex items-center gap-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-teal-200"
                            title="Tự động nhận diện chủ hộ và thành viên từ dữ liệu cư dân"
                          >
                            <Sparkles size={13} className="text-teal-600" /> Nhận diện từ Dân cư
                          </button>
                          <button
                            onClick={() => setShowAddMemberModal(true)}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                          >
                            <UserPlus size={13} /> Thêm nhân khẩu
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedHousehold.members.map(m => (
                          <div key={m.cccd} className="p-4 bg-white hover:shadow-md border border-slate-200/80 rounded-2xl space-y-3 transition-all relative group">
                            <div className="flex justify-between items-start gap-2">
                              <div 
                                onClick={() => setProfileViewMember({ name: m.name, relation: m.relation, cccd: m.cccd })}
                                className="cursor-pointer group-hover:text-emerald-700 transition-colors"
                              >
                                <h4 className="font-bold text-slate-900 text-sm hover:underline">{m.name}</h4>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Sinh năm: {m.birthYear} • CCCD: {m.cccd}</p>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                                m.relation === "Chủ hộ" 
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              }`}>
                                {m.relation}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-mono text-[11px]">
                                {m.phone && m.phone !== "N/A" ? m.phone : "Chưa có SĐT"}
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setProfileViewMember({ name: m.name, relation: m.relation, cccd: m.cccd })}
                                  className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer"
                                >
                                  Hồ sơ
                                </button>
                                <button
                                  onClick={() => startMoveMember(m.name, m.cccd)}
                                  className="text-[11px] bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer"
                                >
                                  Chuyển hộ
                                </button>
                                {m.relation !== "Chủ hộ" && (
                                  <>
                                    <button
                                      onClick={startSplitHousehold}
                                      className="text-[11px] bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer"
                                    >
                                      Tách hộ
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMember(m.cccd)}
                                      className="text-[11px] bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer"
                                    >
                                      Xóa
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
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <HouseholdBusinesses 
                        household={selectedHousehold} 
                        residents={residents} 
                      />
                    </div>
                  )}

                  {detailTab === "history" && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nhật ký biến động và sửa đổi sổ</span>
                      {((selectedHousehold as any).auditHistory || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">Chưa ghi nhận biến động chính thức nào kể từ ngày lập sổ.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {((selectedHousehold as any).auditHistory || []).map((log: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-start gap-2.5 text-xs">
                              <History size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-slate-800 font-semibold">{log.action}</p>
                                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{log.date} • Cán bộ: {log.actor}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer hành động của Modal */}
                <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <button 
                    id="btn-modal-tree"
                    onClick={() => setShowTreeModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    <GitBranch size={15} /> Sơ đồ cây Phả Hệ Hộ Tịch
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      id="btn-modal-edit-household"
                      onClick={startEditHousehold}
                      className="flex items-center gap-1.5 py-2.5 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Edit3 size={13} /> Sửa Sổ
                    </button>
                    
                    {showSoftDeleted ? (
                      <button
                        onClick={() => {
                          handleRestoreHousehold(selectedHousehold.id);
                          setShowDetailModal(false);
                        }}
                        className="flex items-center gap-1.5 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Undo2 size={13} /> Khôi phục Sổ
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleSoftDeleteHousehold(selectedHousehold.id);
                          setShowDetailModal(false);
                        }}
                        className="flex items-center gap-1.5 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Trash2 size={13} /> Xóa Sổ
                      </button>
                    )}

                    <button
                      id="btn-close-household-footer"
                      onClick={handleCloseDetailModal}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lập Sổ Hộ Khẩu Mới Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Lập Sổ Hộ Khẩu Điện Tử Mới</h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Phân khoa số hóa Tư pháp cơ sở</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateHousehold} className="p-6 space-y-4 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Mã số Sổ Hộ Khẩu *</label>
                  <input 
                    type="text"
                    required
                    placeholder="HK-XXX"
                    value={newHCode}
                    onChange={(e) => setNewHCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Loại cư trú *</label>
                  <select
                    value={newHType}
                    onChange={(e) => setNewHType(e.target.value as "Thường trú" | "Tạm trú")}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="Thường trú">Thường trú (KT1, KT2)</option>
                    <option value="Tạm trú">Tạm trú (KT3, KT4)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Tên Chủ hộ mới *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Địa chỉ Đăng ký Thường trú *</label>
                <input 
                  type="text"
                  required
                  placeholder="Số..., đường Lương Định Của, Phường An Phú"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              {/* LIVE COORDINATE INPUT & FEEDBACK */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block flex justify-between">
                  <span>Tọa độ GPS WGS84 (Kết hợp Vĩ độ, Kinh độ)</span>
                  <span className="font-normal text-slate-400 font-mono">Ví dụ: 10.936828, 106.743392</span>
                </label>
                <input 
                  type="text"
                  placeholder="Dán hoặc điền tọa độ GPS có sẵn..."
                  value={coordInput}
                  onChange={(e) => handleCoordInputChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
                />
                {parsedGPS && (
                  <div className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 p-2 rounded-lg font-mono">
                    ✓ Phát hiện hệ WGS84: Vĩ độ <strong>{parsedGPS.lat}</strong>, Kinh độ <strong>{parsedGPS.lng}</strong>
                  </div>
                )}
              </div>

              {/* Sub-members registration */}
              <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 space-y-3">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Đăng ký thêm thành viên hộ</span>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text"
                    placeholder="Tên thành viên"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg bg-white"
                  />
                  <input 
                    type="text"
                    placeholder="Số CCCD"
                    value={newMemberCccd}
                    onChange={(e) => setNewMemberCccd(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select 
                    value={newMemberRelation}
                    onChange={(e) => setNewMemberRelation(e.target.value)}
                    className="col-span-1 p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Vợ">Vợ</option>
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
                    value={newMemberBirthYear}
                    onChange={(e) => setNewMemberBirthYear(e.target.value ? Number(e.target.value) : "")}
                    className="col-span-1 p-2 border border-slate-200 rounded-lg bg-white"
                  />
                  <input 
                    type="text"
                    placeholder="Số ĐT"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    className="col-span-1 p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddTempMember}
                  className="w-full py-1.5 bg-slate-850 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer flex justify-center items-center gap-1"
                >
                  <Plus size={12} /> Thêm thành viên vào danh sách tạm
                </button>

                {tempMembers.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-200 pt-2 text-[11px]">
                    <span className="font-bold text-slate-400 uppercase text-[9px] block">Danh sách đăng ký tạm ({tempMembers.length})</span>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {tempMembers.map((m, idx) => (
                        <div key={idx} className="p-1.5 bg-white border border-slate-100 rounded-lg flex justify-between items-center font-mono">
                          <span>{m.name} ({m.relation})</span>
                          <button
                            type="button"
                            onClick={() => setTempMembers(tempMembers.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 font-bold"
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Chỉnh sửa thông tin Sổ</h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Sổ ID: {selectedHousehold.code}</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditHousehold} className="p-5 space-y-4 text-xs text-slate-600">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Địa chỉ cư trú</label>
                <input 
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Chủ hộ đại diện</label>
                  <select
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {selectedHousehold.members.map(m => (
                      <option key={m.cccd} value={m.name}>{m.name} ({m.relation})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Phân hệ cư trú</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as "Thường trú" | "Tạm trú")}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="Thường trú">Thường trú</option>
                    <option value="Tạm trú">Tạm trú</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-600 block">GPS vệ tinh WGS84</label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(editAddress || selectedHousehold.address, selectedHousehold.code);
                      setCoordInput(auto.dms);
                      setParsedGPS(parseCoordinates(auto.dms));
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} className="text-emerald-600" /> Tự động nhận diện từ địa chỉ
                  </button>
                </div>
                <input 
                  type="text"
                  placeholder="Dán hoặc chỉnh sửa tọa độ..."
                  value={coordInput}
                  onChange={(e) => handleCoordInputChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500 bg-white"
                />
                {parsedGPS && (
                  <div className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg font-mono">
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Thêm Nhân khẩu vào Hộ tịch</h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Sổ HK: {selectedHousehold.code}</p>
              </div>
              <button 
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddNewMember} className="p-5 space-y-4 text-xs text-slate-600">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Họ và tên thành viên *</label>
                <input 
                  type="text"
                  required
                  placeholder="Nguyễn Văn B"
                  value={addMemName}
                  onChange={(e) => setAddMemName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Số CCCD gắn chip *</label>
                  <input 
                    type="text"
                    required
                    placeholder="079XXXXXXXXX"
                    value={addMemCccd}
                    onChange={(e) => setAddMemCccd(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Năm sinh *</label>
                  <input 
                    type="number"
                    required
                    placeholder="1995"
                    value={addMemBirthYear}
                    onChange={(e) => setAddMemBirthYear(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Quan hệ với chủ hộ *</label>
                  <select
                    value={addMemRelation}
                    onChange={(e) => setAddMemRelation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white animate-none"
                  >
                    <option value="Vợ">Vợ</option>
                    <option value="Con trai">Con trai</option>
                    <option value="Con gái">Con gái</option>
                    <option value="Bố">Bố</option>
                    <option value="Mẹ">Mẹ</option>
                    <option value="Anh/Em trai">Anh/Em trai</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Số điện thoại di động</label>
                  <input 
                    type="text"
                    placeholder="09XXXXXXXX"
                    value={addMemPhone}
                    onChange={(e) => setAddMemPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500 bg-white"
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Chuyển hộ tịch Nhân khẩu</h3>
              <button 
                onClick={() => setShowMoveModal(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                Đang thực hiện chuyển nhân khẩu <strong>{moveTargetMember.name}</strong> (CCCD: {moveTargetMember.cccd}) từ Sổ hộ khẩu hiện tại ({selectedHousehold.code}) sang một Sổ hộ khẩu điện tử đích khác.
              </p>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Lựa chọn Sổ hộ khẩu đích</label>
                <select
                  value={moveTargetHCode}
                  onChange={(e) => setMoveTargetHCode(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {households.filter(h => h.id !== selectedHousehold.id && !(h as any).deletedAt).map(h => (
                    <option key={h.id} value={h.code}>{h.code} - Hộ {h.ownerName} ({h.address})</option>
                  ))}
                </select>
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Tách hộ tịch (Chia tách gia đình)</h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Sổ nguồn: {selectedHousehold.code}</p>
              </div>
              <button 
                onClick={() => setShowSplitModal(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              {/* Step 1: select members to split */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 block">Tích chọn các thành viên muốn tách sổ *</label>
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
                      <label htmlFor={`split-${m.cccd}`} className="text-slate-700 cursor-pointer font-semibold">
                        {m.name} ({m.relation})
                      </label>
                    </div>
                  ))}
                  {selectedHousehold.members.filter(m => m.relation !== "Chủ hộ").length === 0 && (
                    <p className="text-xs text-slate-400 italic">Sổ này không có thành viên phụ để tách!</p>
                  )}
                </div>
              </div>

              {splitSelectedCccds.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">Mã số Sổ mới *</label>
                      <input 
                        type="text"
                        value={splitNewHCode}
                        onChange={(e) => setSplitNewHCode(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-indigo-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">Chỉ định Chủ hộ mới *</label>
                      <select
                        value={splitNewOwner}
                        onChange={(e) => setSplitNewOwner(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- Lựa chọn --</option>
                        {selectedHousehold.members.filter(m => splitSelectedCccds.includes(m.cccd)).map(m => (
                          <option key={m.cccd} value={m.cccd}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block">Địa chỉ sổ mới đăng ký *</label>
                    <input 
                      type="text"
                      value={splitNewAddress}
                      onChange={(e) => setSplitNewAddress(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
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

      {/* TOAST THÔNG BÁO ĐỒNG BỘ GIS */}
      {gisPinToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5 duration-200">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span className="font-medium">{gisPinToast}</span>
        </div>
      )}

      {/* MODAL GHIM / ĐỒNG BỘ TỌA ĐỘ GIS HỘ KHẨU */}
      {gisPinModalHousehold && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setGisPinModalHousehold(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-4 text-white flex justify-between items-center border-b border-emerald-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl text-emerald-300">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Ghim & Đồng bộ Tọa độ GIS Hộ Khẩu</h3>
                  <p className="text-[11px] text-emerald-200/90 font-mono">
                    Hộ: {gisPinModalHousehold.ownerName} • Mã sổ: {gisPinModalHousehold.code}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setGisPinModalHousehold(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Địa chỉ hộ cư trú:</span>
                <p className="font-bold text-slate-800 text-xs sm:text-sm">{gisPinModalHousehold.address}</p>
                <span className="text-[11px] text-slate-500 block">Khu phố 3, Phường An Phú, TP. Thủ Đức</span>
              </div>

              {/* Coordinate Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Tọa độ GIS (Định dạng DMS hoặc Thập phân):</label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = generateDefaultCoordinatesForAddress(gisPinModalHousehold.address, gisPinModalHousehold.code);
                      setGisPinInput(auto.dms);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Tự động ước tính tọa độ dựa trên địa chỉ hộ trong ranh giới KP3"
                  >
                    <Sparkles size={12} className="text-emerald-600" /> Tự động nhận diện từ địa chỉ
                  </button>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    value={gisPinInput}
                    onChange={(e) => setGisPinInput(e.target.value)}
                    placeholder="Ví dụ: 10°56'13.2&quot;N 106°44'40.8&quot;E hoặc 10.936997, 106.744645"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                  />
                  <MapPin size={15} className="absolute right-3 top-3 text-slate-400" />
                </div>
              </div>

              {/* Presets for KP3 */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gợi ý phân khu / tuyến đường nhanh:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'13.2"N 106°44\'40.7"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">42 Lương Định Của</strong>
                    <span className="text-[10px] text-slate-500 font-mono">10.936997, 106.744645</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'16.1"N 106°44\'43.8"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 42 Lương Định Của</strong>
                    <span className="text-[10px] text-slate-500 font-mono">10.937800, 106.745500</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'08.9"N 106°44\'48.5"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">Hẻm 18 Lương Định Của</strong>
                    <span className="text-[10px] text-slate-500 font-mono">10.935800, 106.746800</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGisPinInput('10°56\'12.5"N 106°44\'42.6"E')}
                    className="p-2 text-left bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <strong className="block text-slate-900">KDC Tổ dân phố 12-14</strong>
                    <span className="text-[10px] text-slate-500 font-mono">10.936800, 106.744600</span>
                  </button>
                </div>
              </div>

              {/* Status helper */}
              {gisPinInput && (() => {
                const parsed = parseGisCoords(gisPinInput);
                if (parsed) {
                  return (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check size={13} className="text-emerald-600" />
                        <span>Tọa độ hợp lệ: {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)}</span>
                      </div>
                      <span className="font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded">
                        {decimalToDMS(parsed.lat, parsed.lng)}
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
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
                className="px-3 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Lưu & Đồng bộ GIS
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePinCoordinates(true)}
                  className="px-4 py-2 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>Lưu & Dẫn đường ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
