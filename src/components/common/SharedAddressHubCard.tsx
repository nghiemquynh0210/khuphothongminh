import React from "react";
import {
  AlertTriangle,
  Briefcase,
  Building,
  ExternalLink,
  Home,
  Layers,
  Plus,
  Store,
} from "lucide-react";
import { Business, Household } from "../../types";
import { isAccommodationBusiness, resolveCoLocatedEntities } from "../../utils/addressCoLocationUtils";
import { normalizeEntityLandParcels } from "../../utils/landParcelsUtils";
import {
  ROUTES,
  getBusinessDetailPath,
  getEnterpriseDetailPath,
  getHouseholdDetailPath,
  navigate,
} from "../../routes";

export const KP3_CO_LOCATION_PREFILL_KEY = "kp3_colocation_prefill_v1";

export interface CoLocationPrefillPayload {
  address: string;
  coordinates?: string;
  linkedHouseholdCodes: string[];
  premisesOwner?: string;
  premisesOwnerPhone?: string;
}

interface SharedAddressHubCardProps {
  focusHousehold?: Household | null;
  focusBusiness?: Business | null;
  households: Household[];
  businesses: Business[];
  showQuickCreateActions?: boolean;
  hideHouseholds?: boolean;
  hideWhenEmpty?: boolean;
}

export const SharedAddressHubCard: React.FC<SharedAddressHubCardProps> = ({
  focusHousehold,
  focusBusiness,
  households,
  businesses,
  showQuickCreateActions = true,
  hideHouseholds = false,
  hideWhenEmpty = false,
}) => {
  const bundle = React.useMemo(
    () =>
      resolveCoLocatedEntities({
        focusHousehold,
        focusBusiness,
        households,
        businesses,
      }),
    [focusHousehold, focusBusiness, households, businesses]
  );

  const visibleHouseholds = hideHouseholds ? [] : bundle.households;
  const visibleTotalOtherEntities =
    visibleHouseholds.length + bundle.enterprises.length + bundle.businesses.length;

  if (hideWhenEmpty && visibleTotalOtherEntities === 0) {
    return null;
  }

  const handleQuickCreateAtAddress = (target: "business" | "enterprise") => {
    const baseAddress =
      focusHousehold?.address || focusBusiness?.address || "";
    const coords =
      focusHousehold?.coordinates || focusBusiness?.coordinates || "";
    const hhCodes: string[] = [];

    if (focusHousehold?.code) {
      hhCodes.push(focusHousehold.code);
    }
    bundle.households.forEach((h) => {
      if (!hhCodes.includes(h.code)) hhCodes.push(h.code);
    });

    const ownerPhone =
      focusHousehold?.members?.find((m) => m.relation === "Chủ hộ")?.phone ||
      focusHousehold?.members?.[0]?.phone ||
      focusBusiness?.premisesOwnerPhone ||
      "";

    const payload: CoLocationPrefillPayload = {
      address: baseAddress,
      coordinates: coords,
      linkedHouseholdCodes: hhCodes,
      premisesOwner:
        focusHousehold?.ownerName ||
        bundle.households[0]?.ownerName ||
        focusBusiness?.premisesOwner ||
        "",
      premisesOwnerPhone: ownerPhone,
    };

    try {
      sessionStorage.setItem(
        KP3_CO_LOCATION_PREFILL_KEY,
        JSON.stringify(payload)
      );
    } catch {}

    navigate(
      target === "enterprise"
        ? ROUTES.DASHBOARD_ENTERPRISES_NEW
        : ROUTES.DASHBOARD_BUSINESSES_NEW
    );
  };

  return (
    <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <Layers size={14} />
          </span>
          <div>
            <h4 className="font-bold text-emerald-950 text-xs sm:text-[13px] flex items-center gap-1.5 flex-wrap">
              <span>Tổ hợp Hộ khẩu • Doanh nghiệp • Cơ sở KD Cùng Địa Chỉ</span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-emerald-200/80 text-emerald-950">
                {visibleTotalOtherEntities} đơn vị liên quan
              </span>
            </h4>
            <p className="text-[11px] text-slate-600">
              Đối khớp chính xác theo số nhà, mặt bằng ghép liền kề &amp; thửa đất
              địa chính Sổ đỏ
            </p>
          </div>
        </div>

        {showQuickCreateActions && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleQuickCreateAtAddress("business")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-bold transition-colors cursor-pointer"
              title="Đăng ký thêm Hộ kinh doanh / Nhà trọ tại cùng địa chỉ này"
            >
              <Plus size={12} />
              <span>Cơ sở KD cùng ĐC</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickCreateAtAddress("enterprise")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-bold transition-colors cursor-pointer"
              title="Đăng ký thêm Doanh nghiệp đặt trụ sở tại cùng địa chỉ này"
            >
              <Plus size={12} />
              <span>Doanh nghiệp cùng ĐC</span>
            </button>
          </div>
        )}
      </div>

      {/* Lưu ý tổ hợp đa công năng phục vụ PCCC & ANTT */}
      {bundle.isMultiFunctional && bundle.multiFunctionalNote && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/90 text-[11px] text-amber-950 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">
            {bundle.multiFunctionalNote}
          </span>
        </div>
      )}

      {visibleTotalOtherEntities === 0 ? (
        <div className="p-3 rounded-lg bg-white/85 border border-emerald-100 text-[11.5px] text-slate-600">
          Hiện chưa ghi nhận đơn vị Hộ khẩu, Doanh nghiệp hoặc Cơ sở kinh doanh
          khác dùng chung địa chỉ / thửa đất này.
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* 1. Danh sách Hộ khẩu cùng địa chỉ / mặt bằng ghép */}
          {visibleHouseholds.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Home size={13} className="text-emerald-700" />
                <span>
                  Hộ khẩu Cư trú tại Địa chỉ / Mặt bằng ghép (
                  {visibleHouseholds.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {visibleHouseholds.map((hh) => {
                  const hhParcels = normalizeEntityLandParcels(hh);
                  return (
                    <div
                      key={hh.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(getHouseholdDetailPath(hh.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(getHouseholdDetailPath(hh.id));
                        }
                      }}
                      className="group p-2.5 rounded-lg bg-white hover:bg-emerald-50/40 border border-emerald-200/80 hover:border-emerald-400 transition-all cursor-pointer flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[10.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                            {hh.code}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-emerald-800 truncate">
                            Chủ hộ: {hh.ownerName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">
                          {hh.address}
                        </p>
                        <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
                          <span>
                            {hh.type || "Thường trú"} • {hh.memberCount} nhân khẩu
                          </span>
                          {hhParcels.length >= 2 && (
                            <span className="font-semibold text-indigo-700">
                              • {hhParcels.length} Sổ đỏ
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink
                        size={13}
                        className="text-slate-400 group-hover:text-emerald-700 shrink-0 mt-0.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Danh sách Doanh nghiệp (Công ty TNHH/CP/DNTN) cùng địa chỉ */}
          {bundle.enterprises.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={13} className="text-indigo-700" />
                <span>
                  Doanh nghiệp Đặt Trụ sở Cùng Địa Chỉ (
                  {bundle.enterprises.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {bundle.enterprises.map((ent) => {
                  const entParcels = normalizeEntityLandParcels(ent);
                  return (
                    <div
                      key={ent.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(getEnterpriseDetailPath(ent.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(getEnterpriseDetailPath(ent.id));
                        }
                      }}
                      className="group p-2.5 rounded-lg bg-white hover:bg-indigo-50/40 border border-indigo-200/80 hover:border-indigo-400 transition-all cursor-pointer flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900">
                            MST: {ent.taxCode || ent.licenseNumber || "Đang cập nhật"}
                          </span>
                          {entParcels.length >= 2 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                              {entParcels.length} Sổ đỏ
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 group-hover:text-indigo-800 truncate">
                          {ent.name}
                        </p>
                        <p className="text-[10.5px] text-slate-500 truncate">
                          ĐDPL: {ent.legalRepresentative || ent.owner} •{" "}
                          {ent.employeeCount} LĐ • {ent.status}
                        </p>
                      </div>
                      <ExternalLink
                        size={13}
                        className="text-slate-400 group-hover:text-indigo-700 shrink-0 mt-0.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Danh sách Cơ sở kinh doanh / Nhà trọ cùng địa chỉ */}
          {bundle.businesses.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Store size={13} className="text-amber-700" />
                <span>
                  Cơ sở Kinh doanh &amp; Nhà trọ Cùng Địa Chỉ (
                  {bundle.businesses.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {bundle.businesses.map((biz) => {
                  const isAcc = isAccommodationBusiness(biz);
                  const bizParcels = normalizeEntityLandParcels(biz);
                  return (
                    <div
                      key={biz.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(getBusinessDetailPath(biz.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(getBusinessDetailPath(biz.id));
                        }
                      }}
                      className="group p-2.5 rounded-lg bg-white hover:bg-amber-50/40 border border-amber-200/80 hover:border-amber-400 transition-all cursor-pointer flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                            {isAcc ? (
                              <>
                                <Building size={10} /> Nhà trọ ({biz.soPhong || 0}{" "}
                                phòng)
                              </>
                            ) : (
                              biz.type || "Hộ KD"
                            )}
                          </span>
                          {bizParcels.length >= 2 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900">
                              {bizParcels.length} Sổ đỏ
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 group-hover:text-amber-900 truncate">
                          {biz.name}
                        </p>
                        <p className="text-[10.5px] text-slate-500 truncate">
                          Chủ CS: {biz.owner} • GP: {biz.licenseNumber || "—"}
                        </p>
                      </div>
                      <ExternalLink
                        size={13}
                        className="text-slate-400 group-hover:text-amber-700 shrink-0 mt-0.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SharedAddressHubCard;
