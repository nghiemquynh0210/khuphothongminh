import React, { useState } from "react";
import { Drawer } from "vaul";
import {
  AlertTriangle,
  Award,
  Building2,
  CalendarCheck,
  ChevronRight,
  Clock,
  Coins,
  Download,
  FileText,
  Flame,
  Globe,
  Home,
  Megaphone,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { ActiveTab, FieldReport, TaskItem } from "../../types";
import { formatVNNumber } from "../../utils/numberFormat";
import { triggerLightHaptic, triggerMediumHaptic } from "../../utils/mobileHaptics";
import { navigate, ROUTES } from "../../routes";

interface MobileStaffHomeProps {
  currentUserName: string;
  population: number;
  thuongTruCount: number;
  tamTruCount: number;
  totalHouseholds: number;
  permanentHouseholds: number;
  temporaryHouseholds: number;
  totalBusinesses: number;
  hostelsCount: number;
  roomsCount: number;
  openActionCount: number;
  urgentCount: number;
  pendingReportsCount: number;
  openTasksCount: number;
  expiredTempCount: number;
  expiringTempCount: number;
  pcccWarningCount: number;
  fundBalance: number;
  topTasks: TaskItem[];
  openReports: FieldReport[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenWordReport: () => void;
  onExportExcelReport: () => void;
  onOpenQuickCommand?: () => void;
}

export const MobileStaffHome: React.FC<MobileStaffHomeProps> = ({
  currentUserName,
  population,
  thuongTruCount,
  tamTruCount,
  totalHouseholds,
  permanentHouseholds,
  temporaryHouseholds,
  totalBusinesses,
  hostelsCount,
  roomsCount,
  openActionCount,
  urgentCount,
  pendingReportsCount,
  openTasksCount,
  expiredTempCount,
  expiringTempCount,
  pcccWarningCount,
  fundBalance,
  topTasks = [],
  openReports = [],
  onNavigateTab,
  onOpenWordReport,
  onExportExcelReport,
  onOpenQuickCommand,
}) => {
  const [reportSheetOpen, setReportSheetOpen] = useState(false);

  const goTab = (tab: ActiveTab) => {
    void triggerLightHaptic();
    onNavigateTab(tab);
  };

  return (
    <div className="md:hidden -mx-3.5 -mt-3.5 pb-4 bg-slate-50 min-h-screen">
      {/* 1. HERO BANNER ĐỎ TRỐNG ĐỒNG (CHUẨN SUPER-APP NATIVE) */}
      <div
        className="text-white px-4 pt-4 pb-10 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 85% 120%, rgba(254,202,202,0.18) 0%, transparent 50%), repeating-radial-gradient(circle at 80% 110%, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 15px), linear-gradient(135deg, #B91C1C 0%, #DC2626 55%, #991B1B 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-red-100/95 uppercase tracking-wide">
              Khu phố 3 • Phường An Phú
            </p>
            <h1 className="text-base font-extrabold tracking-tight truncate mt-0.5">
              {currentUserName || "Ban Điều hành KP3"}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenQuickCommand && (
              <button
                type="button"
                onClick={() => {
                  void triggerLightHaptic();
                  onOpenQuickCommand();
                }}
                aria-label="Tìm nhanh dân cư, hộ khẩu"
                className="w-9 h-9 rounded-full bg-white/15 active:bg-white/25 flex items-center justify-center text-white backdrop-blur-xs cursor-pointer"
              >
                <Search size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void triggerLightHaptic();
                navigate(ROUTES.HOME);
              }}
              aria-label="Xem Cổng Cư dân"
              className="w-9 h-9 rounded-full bg-white/15 active:bg-white/25 flex items-center justify-center text-white backdrop-blur-xs cursor-pointer"
            >
              <Globe size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. LƯỚI KPI 2x2 SIÊU GỌN NỔI ĐÈ CHÂN HERO */}
      <div className="px-3.5 -mt-6 relative z-10">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => goTab("residents")}
            className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Nhân khẩu KP3</span>
              <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Users size={15} />
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {formatVNNumber(population)}
            </p>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
              TT {formatVNNumber(thuongTruCount)} • Tạm trú {formatVNNumber(tamTruCount)}
            </p>
          </button>

          <button
            type="button"
            onClick={() => goTab("households")}
            className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Hộ quản lý</span>
              <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Home size={15} />
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {formatVNNumber(totalHouseholds)}
            </p>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
              CT01: {formatVNNumber(permanentHouseholds)} • CT08: {formatVNNumber(temporaryHouseholds)}
            </p>
          </button>

          <button
            type="button"
            onClick={() => goTab("businesses")}
            className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Kinh tế &amp; Trọ</span>
              <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Building2 size={15} />
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {formatVNNumber(totalBusinesses)}
            </p>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
              {formatVNNumber(hostelsCount)} nhà trọ ({formatVNNumber(roomsCount)}p)
            </p>
          </button>

          <button
            type="button"
            onClick={() => goTab(pendingReportsCount > 0 ? "reports" : "tasks")}
            className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Việc cần xử lý</span>
              <span className="w-7 h-7 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <ShieldAlert size={15} />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <p className="text-xl font-extrabold text-slate-900 tabular-nums">{openActionCount}</p>
              {urgentCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {urgentCount} khẩn
                </span>
              )}
            </div>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
              1022: {pendingReportsCount} • Nhiệm vụ: {openTasksCount}
            </p>
          </button>
        </div>

        {/* 3. DẢI CẢNH BÁO NÓNG CUỘN NGANG */}
        <div className="mt-3.5 -mx-3.5 px-3.5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {expiredTempCount > 0 && (
            <button
              type="button"
              onClick={() => goTab("residents")}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold cursor-pointer active:scale-95 transition-transform"
            >
              <AlertTriangle size={13} className="text-rose-600" />
              <span>Quá hạn tạm trú: {expiredTempCount}</span>
            </button>
          )}
          {expiringTempCount > 0 && (
            <button
              type="button"
              onClick={() => goTab("residents")}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold cursor-pointer active:scale-95 transition-transform"
            >
              <Clock size={13} className="text-amber-600" />
              <span>Sắp hết hạn ≤30N: {expiringTempCount}</span>
            </button>
          )}
          {pcccWarningCount > 0 && (
            <button
              type="button"
              onClick={() => goTab("businesses")}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-900 text-[11px] font-bold cursor-pointer active:scale-95 transition-transform"
            >
              <Flame size={13} className="text-orange-600" />
              <span>Rà soát PCCC: {pcccWarningCount}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => goTab("finance")}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold cursor-pointer active:scale-95 transition-transform"
          >
            <Coins size={13} className="text-emerald-600" />
            <span>Quỹ KP3: {formatVNNumber(fundBalance)}đ</span>
          </button>
        </div>

        {/* 4. 4 LỐI TẮT TÁC NGHIỆP NHANH */}
        <div className="mt-3.5 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => goTab("residents")}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-sm">
                <Users size={19} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                Tra cứu Dân
              </span>
            </button>

            <button
              type="button"
              onClick={() => goTab("residents")}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-sm">
                <Award size={19} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                Rà soát NVQS
              </span>
            </button>

            <button
              type="button"
              onClick={() => goTab("tasks")}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-700 text-white flex items-center justify-center shadow-sm">
                <CalendarCheck size={19} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                Lịch &amp; Việc
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void triggerMediumHaptic();
                setReportSheetOpen(true);
              }}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center shadow-sm">
                <FileText size={19} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                Xuất Báo cáo
              </span>
            </button>
          </div>
        </div>

        {/* 5. NHIỆM VỤ TRỌNG TÂM GẦN NHẤT */}
        <section className="mt-3.5 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Nhiệm vụ trọng tâm ({openTasksCount})
            </h2>
            <button
              type="button"
              onClick={() => goTab("tasks")}
              className="text-[11px] font-bold text-red-700 inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>Tất cả</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {topTasks.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Chưa có nhiệm vụ đang mở.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topTasks.slice(0, 3).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => goTab("tasks")}
                  className="w-full py-2.5 first:pt-1 last:pb-0 text-left flex items-start justify-between gap-2 active:bg-slate-50 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                      {task.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {task.assigneeName || task.department} • Hạn {task.dueDate || "—"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.priority === "Khẩn cấp" || task.priority === "Cao"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {task.priority}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 6. PHẢN ÁNH 1022 ĐANG MỞ */}
        <section className="mt-3.5 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Megaphone size={13} className="text-red-600" />
              <span>Phản ánh 1022 ({pendingReportsCount})</span>
            </h2>
            <button
              type="button"
              onClick={() => goTab("reports")}
              className="text-[11px] font-bold text-red-700 inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>Xem hết</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {openReports.length === 0 ? (
            <p className="text-xs text-slate-500 py-1.5">Tất cả phản ánh 1022 đã được giải quyết.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {openReports.slice(0, 2).map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => goTab("reports")}
                  className="w-full py-2 first:pt-1 last:pb-0 text-left flex items-start justify-between gap-2 active:bg-slate-50 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{rep.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{rep.location}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                    {rep.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* VAUL NATIVE GESTURE BOTTOM SHEET — XUẤT BÁO CÁO WORD / EXCEL */}
      <Drawer.Root open={reportSheetOpen} onOpenChange={setReportSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-slate-950/50 z-[95] backdrop-blur-[1px]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[96] bg-white rounded-t-3xl p-5 pb-8 outline-none shadow-2xl">
            <div className="mx-auto w-11 h-1.5 rounded-full bg-slate-300 mb-4" />
            <Drawer.Title className="text-base font-extrabold text-slate-900">
              Xuất Báo cáo Điều hành Khu phố 3
            </Drawer.Title>
            <Drawer.Description className="text-xs text-slate-500 mt-0.5">
              Tổng hợp số liệu thực tế từ CSDL Cloud ra định dạng chuẩn hành chính
            </Drawer.Description>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  void triggerMediumHaptic();
                  setReportSheetOpen(false);
                  onOpenWordReport();
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 active:scale-[0.99] transition-transform text-left cursor-pointer"
              >
                <span className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-emerald-950">Báo cáo Định kỳ Word (.docx)</p>
                  <p className="text-[11px] text-emerald-800/80">
                    Chuẩn Nghị định 30/2020/NĐ-CP • Ký tên Bí thư Chi bộ
                  </p>
                </div>
                <ChevronRight size={16} className="text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  void triggerMediumHaptic();
                  setReportSheetOpen(false);
                  onExportExcelReport();
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 active:scale-[0.99] transition-transform text-left cursor-pointer"
              >
                <span className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Download size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-900">Bảng tổng hợp Giao ban (.xlsx)</p>
                  <p className="text-[11px] text-slate-600">
                    Xuất file Excel nhiều sheet: Dân cư, Hộ khẩu, Nhà trọ, Quỹ
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-500 shrink-0" />
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};
