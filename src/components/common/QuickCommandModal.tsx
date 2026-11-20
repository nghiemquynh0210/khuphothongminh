import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  Coins,
  FileText,
  Heart,
  Home,
  Info,
  LayoutDashboard,
  Map,
  MessageSquare,
  Newspaper,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Store,
  Users,
  X,
} from "lucide-react";
import {
  ActiveTab,
  Business,
  FieldReport,
  Household,
  Resident,
  TaskItem,
} from "../../types";
import {
  getBusinessDetailPath,
  getDashboardExtensionPath,
  getEnterpriseDetailPath,
  getHouseholdDetailPath,
  getReportDetailPath,
  getResidentDetailPath,
  navigate,
} from "../../routes";
import {
  formatShortRecordId,
  isEnterpriseRecord,
  maskCccd,
} from "../../utils/kp3Utils";

export type QuickCommandGroup =
  | "Cư dân KP3"
  | "Sổ Hộ khẩu"
  | "Cơ sở KD & Doanh nghiệp"
  | "Phản ánh 1022 & Nhiệm vụ"
  | "Thao tác nhanh"
  | "Phân hệ điều hành";

export interface QuickCommandItem {
  id: string;
  group: QuickCommandGroup;
  label: string;
  description: string;
  path: string;
  tab: ActiveTab;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  staffOnly?: boolean;
}

const COMMAND_ITEMS: QuickCommandItem[] = [
  {
    id: "act-new-report",
    group: "Thao tác nhanh",
    label: "Tạo hồ sơ Phản ánh 1022 mới",
    description: "Ghi nhận sự cố hiện trường kèm ảnh Timemark GPS",
    path: "/dashboard/reports/new",
    tab: "reports",
    icon: Plus,
  },
  {
    id: "act-new-resident",
    group: "Thao tác nhanh",
    label: "Thêm Nhân khẩu mới",
    description: "Khai báo công dân thường trú / tạm trú vào CSDL KP3",
    path: "/dashboard/residents/new",
    tab: "residents",
    icon: Plus,
    staffOnly: true,
  },
  {
    id: "act-new-household",
    group: "Thao tác nhanh",
    label: "Lập Sổ Hộ khẩu điện tử mới",
    description: "Tạo mới hồ sơ hộ gia đình và trích lục địa chính",
    path: "/dashboard/households/new",
    tab: "households",
    icon: Plus,
    staffOnly: true,
  },
  {
    id: "act-new-enterprise",
    group: "Thao tác nhanh",
    label: "Đăng ký Doanh nghiệp (DNNVV) mới",
    description: "Tạo hồ sơ pháp nhân, MST và liên kết sổ đỏ OCR",
    path: "/dashboard/enterprises/new",
    tab: "enterprises",
    icon: Plus,
    staffOnly: true,
  },
  {
    id: "act-new-business",
    group: "Thao tác nhanh",
    label: "Thêm Cơ sở kinh doanh / Nhà trọ mới",
    description: "Cập nhật hộ kinh doanh cá thể hoặc cơ sở lưu trú",
    path: "/dashboard/businesses/new",
    tab: "businesses",
    icon: Plus,
    staffOnly: true,
  },
  {
    id: "act-new-task",
    group: "Thao tác nhanh",
    label: "Giao nhiệm vụ công tác mới",
    description: "Phân công việc cho các tổ tự quản và cán bộ KP3",
    path: "/dashboard/tasks/new",
    tab: "tasks",
    icon: Plus,
    staffOnly: true,
  },
  {
    id: "mod-dashboard",
    group: "Phân hệ điều hành",
    label: "Bảng Điều hành Tổng quan",
    description: "Chỉ số KPI thời gian thực toàn địa bàn Khu phố 3",
    path: getDashboardExtensionPath("dashboard"),
    tab: "dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "mod-residents",
    group: "Phân hệ điều hành",
    label: "Quản lý Dân cư",
    description: "11.632 nhân khẩu thường trú & tạm trú, cảnh báo hết hạn",
    path: getDashboardExtensionPath("residents"),
    tab: "residents",
    icon: Users,
    staffOnly: true,
  },
  {
    id: "mod-households",
    group: "Phân hệ điều hành",
    label: "Quản lý Hộ khẩu",
    description: "488 sổ hộ tịch điện tử, tự nhận diện hộ & cây phả hệ",
    path: getDashboardExtensionPath("households"),
    tab: "households",
    icon: Home,
    staffOnly: true,
  },
  {
    id: "mod-enterprises",
    group: "Phân hệ điều hành",
    label: "Quản lý Doanh nghiệp (DNNVV)",
    description: "Hồ sơ pháp nhân, quy mô lao động NĐ 80/2021 & kiến nghị",
    path: getDashboardExtensionPath("enterprises"),
    tab: "enterprises",
    icon: Building2,
  },
  {
    id: "mod-businesses",
    group: "Phân hệ điều hành",
    label: "Cơ sở Kinh doanh & Nhà trọ",
    description: "Hộ cá thể, PCCC và 108 cơ sở lưu trú trên địa bàn",
    path: getDashboardExtensionPath("businesses"),
    tab: "businesses",
    icon: Store,
  },
  {
    id: "mod-gis",
    group: "Phân hệ điều hành",
    label: "Bản đồ Số GIS Khu phố 3",
    description: "Không gian địa lý, ranh giới mốc và định vị Timemark",
    path: getDashboardExtensionPath("gis"),
    tab: "gis",
    icon: Map,
  },
  {
    id: "mod-reports",
    group: "Phân hệ điều hành",
    label: "Phản ánh hiện trường 1022",
    description: "Tiếp nhận, điều phối theo SLA và nghiệm thu ảnh Trước–Sau",
    path: getDashboardExtensionPath("reports"),
    tab: "reports",
    icon: MessageSquare,
  },
  {
    id: "mod-tasks",
    group: "Phân hệ điều hành",
    label: "Lịch công tác & Nhiệm vụ",
    description: "Bảng Kanban giao việc, lịch họp và nhắc việc định kỳ",
    path: getDashboardExtensionPath("tasks"),
    tab: "tasks",
    icon: CalendarCheck,
  },
  {
    id: "mod-ai",
    group: "Phân hệ điều hành",
    label: "Trợ lý AI Khu phố 3",
    description: "Hỏi đáp thủ tục hành chính và tra cứu số liệu điều hành",
    path: getDashboardExtensionPath("ai"),
    tab: "ai",
    icon: Bot,
  },
  {
    id: "mod-party",
    group: "Phân hệ điều hành",
    label: "Quản lý Chi bộ & Đoàn thể",
    description: "Danh sách đảng viên, ban công tác mặt trận và các chi hội",
    path: getDashboardExtensionPath("party"),
    tab: "party",
    icon: ShieldAlert,
  },
  {
    id: "mod-welfare",
    group: "Phân hệ điều hành",
    label: "An sinh Xã hội",
    description: "Người có công, bảo trợ xã hội, đợt trao quà & cứu trợ nóng",
    path: getDashboardExtensionPath("welfare"),
    tab: "welfare",
    icon: Heart,
  },
  {
    id: "mod-cultural",
    group: "Phân hệ điều hành",
    label: "Tin tức & Sự kiện cộng đồng",
    description: "Bản tin khu phố, thông báo hành chính và phong trào",
    path: getDashboardExtensionPath("cultural"),
    tab: "cultural",
    icon: Newspaper,
  },
  {
    id: "mod-finance",
    group: "Phân hệ điều hành",
    label: "Quỹ Khu phố & VietQR",
    description: "Sổ thu chi minh bạch, biên lai đóng quỹ và đối soát",
    path: getDashboardExtensionPath("finance"),
    tab: "finance",
    icon: Coins,
  },
  {
    id: "mod-forms",
    group: "Phân hệ điều hành",
    label: "Kho Biểu mẫu Hành chính",
    description: "Tải biểu mẫu CT01, xác nhận cư trú, kinh doanh (.DOC)",
    path: getDashboardExtensionPath("forms"),
    tab: "forms",
    icon: FileText,
  },
  {
    id: "mod-plan",
    group: "Phân hệ điều hành",
    label: "Kiến trúc Đề án & CSDL",
    description: "Tổng quan thiết kế hệ thống đô thị thông minh KP3",
    path: getDashboardExtensionPath("plan"),
    tab: "plan",
    icon: Info,
  },
  {
    id: "mod-settings",
    group: "Phân hệ điều hành",
    label: "Cấu hình & Phê duyệt Cán bộ",
    description: "Phân quyền RBAC, duyệt tài khoản cán bộ và cấu hình cổng",
    path: getDashboardExtensionPath("settings"),
    tab: "settings",
    icon: Settings,
    staffOnly: true,
  },
];

export interface QuickCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStaff: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  residents?: Resident[];
  households?: Household[];
  businesses?: Business[];
  reports?: FieldReport[];
  tasks?: TaskItem[];
}

const ORDERED_GROUPS: QuickCommandGroup[] = [
  "Cư dân KP3",
  "Sổ Hộ khẩu",
  "Cơ sở KD & Doanh nghiệp",
  "Phản ánh 1022 & Nhiệm vụ",
  "Thao tác nhanh",
  "Phân hệ điều hành",
];

export function QuickCommandModal({
  isOpen,
  onClose,
  isStaff,
  onSelectTab,
  residents = [],
  households = [],
  businesses = [],
  reports = [],
  tasks = [],
}: QuickCommandModalProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matchedCommands = COMMAND_ITEMS.filter((item) => {
      if (item.staffOnly && !isStaff) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q)
      );
    });

    if (q.length < 2) {
      return matchedCommands;
    }

    const liveEntityResults: QuickCommandItem[] = [];

    // 1. Cư dân KP3 (tối đa 5 kết quả, chỉ dành cho cán bộ)
    if (isStaff && residents.length > 0) {
      let resCount = 0;
      for (let i = 0; i < residents.length && resCount < 5; i++) {
        const r = residents[i];
        const nameMatch = r.fullName?.toLowerCase().includes(q);
        const cccdMatch = r.cccd?.toLowerCase().includes(q);
        const phoneMatch = r.phone ? r.phone.toLowerCase().includes(q) : false;
        if (nameMatch || cccdMatch || phoneMatch) {
          liveEntityResults.push({
            id: `res-${r.id}`,
            group: "Cư dân KP3",
            label: `${r.fullName} (${r.status})`,
            description: `CCCD: ${maskCccd(r.cccd, false)}${
              r.phone && r.phone !== "N/A" ? ` • SĐT: ${r.phone}` : ""
            } • ${r.address}`,
            path: getResidentDetailPath(r.id),
            tab: "residents",
            icon: Users,
            staffOnly: true,
          });
          resCount++;
        }
      }
    }

    // 2. Sổ Hộ khẩu (tối đa 5 kết quả, chỉ dành cho cán bộ)
    if (isStaff && households.length > 0 && liveEntityResults.length < 15) {
      let hhCount = 0;
      for (
        let i = 0;
        i < households.length && hhCount < 5 && liveEntityResults.length < 15;
        i++
      ) {
        const h = households[i];
        const codeMatch = h.code?.toLowerCase().includes(q);
        const ownerMatch = h.ownerName?.toLowerCase().includes(q);
        const addrMatch = h.address?.toLowerCase().includes(q);
        if (codeMatch || ownerMatch || addrMatch) {
          liveEntityResults.push({
            id: `hh-${h.id}`,
            group: "Sổ Hộ khẩu",
            label: `${h.code} — Chủ hộ: ${h.ownerName}`,
            description: `${h.type || "Thường trú"} • ${h.memberCount} nhân khẩu • ${h.address}`,
            path: getHouseholdDetailPath(h.id),
            tab: "households",
            icon: Home,
            staffOnly: true,
          });
          hhCount++;
        }
      }
    }

    // 3. Cơ sở KD / Nhà trọ / Doanh nghiệp (tối đa 5 kết quả)
    if (businesses.length > 0 && liveEntityResults.length < 15) {
      let bizCount = 0;
      for (
        let i = 0;
        i < businesses.length && bizCount < 5 && liveEntityResults.length < 15;
        i++
      ) {
        const b = businesses[i];
        const match =
          b.name?.toLowerCase().includes(q) ||
          (b.taxCode && b.taxCode.toLowerCase().includes(q)) ||
          (b.licenseNumber && b.licenseNumber.toLowerCase().includes(q)) ||
          (b.owner && b.owner.toLowerCase().includes(q)) ||
          (b.legalRepresentative && b.legalRepresentative.toLowerCase().includes(q));

        if (match) {
          const isEnt = isEnterpriseRecord(b);
          liveEntityResults.push({
            id: `biz-${b.id}`,
            group: "Cơ sở KD & Doanh nghiệp",
            label: b.name,
            description: isEnt
              ? `MST: ${b.taxCode || b.licenseNumber || "—"} • ĐDPL: ${
                  b.legalRepresentative || b.owner || "—"
                } • ${b.address}`
              : `${
                  b.isAccommodation
                    ? `Nhà trọ (${b.soPhong || 0} phòng)`
                    : b.type || "Hộ KD"
                } • Chủ CS: ${b.owner || "—"} • GP: ${b.licenseNumber || "—"}`,
            path: isEnt ? getEnterpriseDetailPath(b.id) : getBusinessDetailPath(b.id),
            tab: isEnt ? "enterprises" : "businesses",
            icon: isEnt ? Building2 : Store,
          });
          bizCount++;
        }
      }
    }

    // 4. Phản ánh 1022 & Nhiệm vụ (tối đa 5 kết quả)
    if (liveEntityResults.length < 15) {
      let opsCount = 0;
      for (
        let i = 0;
        i < reports.length && opsCount < 5 && liveEntityResults.length < 15;
        i++
      ) {
        const rep = reports[i];
        const shortCode = formatShortRecordId(rep.id, "PA");
        const match =
          rep.id?.toLowerCase().includes(q) ||
          shortCode.toLowerCase().includes(q) ||
          rep.title?.toLowerCase().includes(q) ||
          rep.location?.toLowerCase().includes(q);
        if (match) {
          liveEntityResults.push({
            id: `rep-${rep.id}`,
            group: "Phản ánh 1022 & Nhiệm vụ",
            label: `[${shortCode}] ${rep.title}`,
            description: `${rep.status} • ${rep.category} • ${rep.location}`,
            path: getReportDetailPath(rep.id),
            tab: "reports",
            icon: MessageSquare,
          });
          opsCount++;
        }
      }

      if (isStaff && tasks.length > 0 && opsCount < 5 && liveEntityResults.length < 15) {
        for (
          let i = 0;
          i < tasks.length && opsCount < 5 && liveEntityResults.length < 15;
          i++
        ) {
          const t = tasks[i];
          const match =
            t.id?.toLowerCase().includes(q) ||
            t.title?.toLowerCase().includes(q) ||
            t.unit?.toLowerCase().includes(q);
          if (match) {
            liveEntityResults.push({
              id: `task-${t.id}`,
              group: "Phản ánh 1022 & Nhiệm vụ",
              label: t.title,
              description: `${t.status} • Ưu tiên: ${t.priority} • Đơn vị: ${t.unit}`,
              path: "/dashboard/tasks",
              tab: "tasks",
              icon: CalendarCheck,
              staffOnly: true,
            });
            opsCount++;
          }
        }
      }
    }

    return [...liveEntityResults, ...matchedCommands];
  }, [query, isStaff, residents, households, businesses, reports, tasks]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleTrigger = (item: QuickCommandItem) => {
    onSelectTab(item.tab);
    navigate(item.path);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((idx) =>
          filteredItems.length > 0 ? (idx + 1) % filteredItems.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((idx) =>
          filteredItems.length > 0
            ? (idx - 1 + filteredItems.length) % filteredItems.length
            : 0
        );
      } else if (e.key === "Enter" && filteredItems[activeIndex]) {
        e.preventDefault();
        handleTrigger(filteredItems[activeIndex]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, filteredItems, activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm liên thông toàn hệ thống và chuyển nhanh phân hệ"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
          <Search size={18} className="text-emerald-700 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            id="quick-command-search-input"
            name="quickCommandQuery"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm cư dân, CCCD, hộ khẩu, MST/nhà trọ, mã PA-..., nhiệm vụ hoặc phân hệ..."
            aria-label="Nhập từ khóa tìm kiếm liên thông toàn hệ thống"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại tìm nhanh"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-2 space-y-3 evon-scroll">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Không tìm thấy hồ sơ, phân hệ hoặc thao tác khớp với &quot;{query}&quot;.
            </div>
          ) : (
            ORDERED_GROUPS.map((groupName) => {
              const groupItems = filteredItems.filter((i) => i.group === groupName);
              if (groupItems.length === 0) return null;
              return (
                <div key={groupName} className="space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {groupName}
                  </div>
                  {groupItems.map((item) => {
                    const globalIdx = filteredItems.indexOf(item);
                    const isHighlighted = globalIdx === activeIndex;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onClick={() => handleTrigger(item)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          isHighlighted
                            ? "bg-emerald-50 text-emerald-950 border border-emerald-200"
                            : "text-slate-800 hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              isHighlighted
                                ? "bg-emerald-600 text-white border-emerald-700"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <IconComp size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-semibold truncate">
                              {item.label}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {item.description}
                            </div>
                          </div>
                        </div>
                        <ArrowRight
                          size={14}
                          className={`shrink-0 ${
                            isHighlighted ? "text-emerald-700" : "text-slate-400"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>↑↓ Di chuyển • Enter Mở ngay • Esc Đóng</span>
          <span className="font-mono font-semibold text-slate-600">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}

export default QuickCommandModal;
