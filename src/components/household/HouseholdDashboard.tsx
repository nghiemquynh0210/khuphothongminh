import React from "react";
import { Calendar, CheckCircle, FileText, ShieldAlert, TrendingUp, UserCheck, Users } from "lucide-react";
import { Household, Resident } from "../../types";
import { KP3_OFFICIAL_BASELINE, computeKp3PopulationMetrics } from "../../utils/kp3Utils";
import { formatVNNumber } from "../../utils/numberFormat";
import { StatCard } from "../common/StatCard";

interface HouseholdDashboardProps {
  households: Household[];
  residents: Resident[];
}

export default function HouseholdDashboard({ households, residents }: HouseholdDashboardProps) {
  const activeHouseholds = households.filter((h) => !(h as any).deletedAt);
  const totalHouseholds = activeHouseholds.length;
  const thuongTruCount = activeHouseholds.filter((h) => (h.type || "Thường trú") === "Thường trú").length;
  const tamTruCount = activeHouseholds.filter((h) => h.type === "Tạm trú").length;

  const popMetrics = computeKp3PopulationMetrics(residents, activeHouseholds);

  const sizes = activeHouseholds.map((h) => h.members.length);
  const singleMemberHouseholds = sizes.filter((s) => s === 1).length;
  const smallFamilyHouseholds = sizes.filter((s) => s === 2).length;
  const mediumFamilyHouseholds = sizes.filter((s) => s === 3 || s === 4).length;
  const largeFamilyHouseholds = sizes.filter((s) => s >= 5).length;

  const getPercent = (value: number) => {
    if (totalHouseholds === 0) return 0;
    return Math.round((value / totalHouseholds) * 100);
  };

  const fluctuationLogs = [
    { date: "18/07/2026", type: "Nhập khẩu", resident: "Nguyễn Minh Hòa", household: "HK-301", note: "Đồng bộ từ CSDL Quốc gia" },
    { date: "16/07/2026", type: "Tách hộ", resident: "Lê Văn Hải", household: "HK-304", note: "Tách mới lập Sổ điện tử" },
    { date: "14/07/2026", type: "Khai báo tạm trú", resident: "Trần Anh Thư", household: "HK-302", note: "Khai báo tạm trú trực tuyến" },
    { date: "10/07/2026", type: "Xóa đăng ký", resident: "Phạm Minh Tuấn", household: "HK-303", note: "Đăng ký tạm vắng đi du học" },
  ];

  return (
    <div className="space-y-5 font-sans text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng Sổ Hộ khẩu"
          value={totalHouseholds}
          icon={FileText}
          color="emerald"
          subtext={`Định mức KP3: ${formatVNNumber(KP3_OFFICIAL_BASELINE.households)} hộ`}
          subtextRight="Toàn địa bàn KP3"
        />
        <StatCard
          label="Hộ Thường trú (KT1)"
          value={thuongTruCount}
          icon={UserCheck}
          color="indigo"
          subtext={`Chiếm ${getPercent(thuongTruCount)}% số sổ`}
          subtextRight="Ổn định"
        />
        <StatCard
          label="Hộ Tạm trú (KT3)"
          value={tamTruCount}
          icon={ShieldAlert}
          color="amber"
          subtext={`Chiếm ${getPercent(tamTruCount)}% số sổ`}
          subtextRight="Theo dõi CSKV"
        />
        <StatCard
          label="Nhân khẩu số hóa"
          value={popMetrics.digitizedResidentsCount}
          icon={Users}
          color="blue"
          subtext={`TB ${popMetrics.avgPerDigitizedHouseholdLabel} người/hộ (${popMetrics.matchedHouseholdsCount} hộ)`}
          subtextRight="CSDL chi tiết"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="bg-white p-5 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Phân bổ Quy mô Hộ gia đình</h3>
              <p className="text-xs text-slate-600 mt-0.5">Số lượng thành viên theo từng sổ hộ khẩu điện tử</p>
            </div>
            <TrendingUp size={16} className="text-emerald-700" aria-hidden="true" />
          </div>

          <div className="space-y-3.5 pt-1 text-xs">
            {[
              { label: "Hộ đơn thân (1 nhân khẩu)", count: singleMemberHouseholds, color: "bg-amber-500" },
              { label: "Hộ hai người", count: smallFamilyHouseholds, color: "bg-blue-600" },
              { label: "Hộ hạt nhân (3–4 nhân khẩu)", count: mediumFamilyHouseholds, color: "bg-indigo-600" },
              { label: "Hộ đa thế hệ (≥ 5 nhân khẩu)", count: largeFamilyHouseholds, color: "bg-emerald-700" },
            ].map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-slate-800 font-semibold">
                  <span>{row.label}</span>
                  <span>
                    {row.count} hộ ({getPercent(row.count)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`${row.color} h-full rounded-full`} style={{ width: `${getPercent(row.count)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-5 border border-slate-200 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Biến động Cư trú gần đây</h3>
              <p className="text-xs text-slate-600 mt-0.5">Nhật ký nhập khẩu, tách hộ và khai báo lưu trú</p>
            </div>
            <Calendar size={16} className="text-slate-600" aria-hidden="true" />
          </div>

          <div className="divide-y divide-slate-200 max-h-[240px] overflow-y-auto">
            {fluctuationLogs.map((log, idx) => (
              <div key={idx} className="py-2.5 flex justify-between items-start gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                        log.type === "Nhập khẩu"
                          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                          : log.type === "Tách hộ"
                          ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                          : "bg-amber-50 text-amber-900 border-amber-200"
                      }`}
                    >
                      {log.type}
                    </span>
                    <strong className="text-slate-900 font-bold text-xs">{log.resident}</strong>
                  </div>
                  <p className="text-xs text-slate-600">
                    Sổ {log.household} • {log.note}
                  </p>
                </div>
                <span className="text-xs text-slate-600 font-mono shrink-0">{log.date}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 text-xs text-emerald-900 flex items-center gap-1.5 font-medium">
            <CheckCircle size={14} className="text-emerald-700" aria-hidden="true" />
            <span>Dữ liệu được đối soát giữa Danh sách Cư dân & Sổ Hộ khẩu</span>
          </div>
        </section>
      </div>
    </div>
  );
}
