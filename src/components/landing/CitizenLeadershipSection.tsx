import React, { useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Crown, Info, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { LandingConfig } from "../../types";
import { SectionHeader } from "./LandingCommon";
import {
  DEFAULT_LANDING_CONFIG,
  DEFAULT_LEADERSHIP_MEMBERS,
  PUBLIC_CONTACT_EMAIL,
  btnGhost,
} from "./landingConstants";
import { enforcePartySecretaryFirst } from "../../utils/leadershipSync";

export interface CitizenLeadershipSectionProps {
  landingConfig?: LandingConfig;
}

export default function CitizenLeadershipSection({
  landingConfig = DEFAULT_LANDING_CONFIG,
}: CitizenLeadershipSectionProps) {
  const [showAllAssociations, setShowAllAssociations] = useState(true);

  const rawLeaders =
    landingConfig.leadership && landingConfig.leadership.length > 0
      ? landingConfig.leadership
      : DEFAULT_LEADERSHIP_MEMBERS;
  const leaders = enforcePartySecretaryFirst(rawLeaders);

  const associationDirectory = (
    landingConfig.associationLeaders && landingConfig.associationLeaders.length > 0
      ? landingConfig.associationLeaders
      : DEFAULT_LANDING_CONFIG.associationLeaders || []
  ).filter((a) => a.assocId !== "ASC_DANG" && a.assocId !== "ASC_BDH");

  const email = landingConfig.contactEmail || PUBLIC_CONTACT_EMAIL;

  return (
    <section
      id="leadership"
      tabIndex={-1}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none"
    >
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-6">
        <SectionHeader
          icon={<ShieldCheck size={20} />}
          title="Cơ cấu tổ chức & cán bộ Khu phố 3"
        />
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaders.map((l, idx) => {
            const isTop = idx === 0 || Boolean(l.isTopLeader);
            const initial =
              l.name.trim().split(" ").slice(-1)[0]?.charAt(0) || "C";
            return (
              <li
                key={l.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 relative ${
                  isTop
                    ? "bg-rose-50/45 border-rose-300 ring-1 ring-rose-200/70"
                    : l.isHighlight
                    ? "bg-blue-50/40 border-blue-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  {l.avatar ? (
                    <img
                      src={l.avatar}
                      alt={l.name}
                      className="w-16 h-24 rounded-xl object-cover object-top border border-slate-200 shrink-0 bg-slate-100"
                    />
                  ) : (
                    <span
                      className={`w-16 h-24 rounded-xl font-black text-lg flex items-center justify-center shrink-0 border ${
                        isTop
                          ? "bg-rose-100 text-rose-900 border-rose-200"
                          : "bg-blue-100 text-gov-navy border-blue-200/70"
                      }`}
                      aria-hidden="true"
                    >
                      {initial}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {isTop && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full mb-1">
                        <Crown size={11} aria-hidden="true" /> Người đứng đầu Khu phố 3
                      </span>
                    )}
                    {l.group && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                        {l.group}
                      </span>
                    )}
                    <h3 className="font-bold text-base text-gov-text">
                      {l.name}
                    </h3>
                    <p className={`text-sm font-semibold ${isTop ? "text-rose-800 font-extrabold" : "text-gov-blue"}`}>
                      {l.role}
                    </p>
                    {l.subRole && (
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                        {l.subRole}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">{l.scope}</p>
                  </div>
                </div>

                {l.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {l.description}
                  </p>
                )}

                {(l.phone || l.schedule) && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {l.schedule && (
                      <span className="text-slate-600 flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500 shrink-0" aria-hidden="true" />
                        <span>{l.schedule}</span>
                      </span>
                    )}
                    {l.phone && (
                      <a
                        href={`tel:${l.phone}`}
                        className="font-mono font-bold text-gov-blue hover:text-gov-navy inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 ml-auto"
                      >
                        <Phone size={12} aria-hidden="true" /> {l.phone}
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {/* Danh bạ Trưởng / Phó các Chi hội Đoàn thể & Tổ tự quản (Đồng bộ trực tuyến) */}
        {associationDirectory.length > 0 && (
          <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <Users size={16} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Trưởng / Phó các Ban, Chi hội Đoàn thể &amp; Tổ tự quản ({associationDirectory.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đồng bộ trực tiếp từ hệ thống Quản lý Chi bộ &amp; Đoàn thể Khu phố 3
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllAssociations((prev) => !prev)}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showAllAssociations ? "Thu gọn danh bạ" : "Xem đầy đủ các Chi hội"}</span>
                {showAllAssociations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showAllAssociations && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {associationDirectory.map((assoc) => (
                  <div
                    key={assoc.assocId}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug">
                          {assoc.assocName}
                        </h4>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                          {assoc.memberCount} TV
                        </span>
                      </div>
                      <div className="text-xs text-slate-700">
                        <span className="text-slate-500">{assoc.headRole}:</span>{" "}
                        <strong className="text-slate-900">{assoc.headName}</strong>
                      </div>
                      {assoc.deputyList && assoc.deputyList.length > 0 && (
                        <div className="text-xs text-slate-600">
                          <span className="text-slate-500">{assoc.deputyList[0].role}:</span>{" "}
                          <span className="font-semibold text-slate-800">
                            {assoc.deputyList.map((d) => d.name).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                    {assoc.headPhone && assoc.headPhone !== "N/A" && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Liên hệ trực tiếp:</span>
                        <a
                          href={`tel:${assoc.headPhone}`}
                          className="font-mono font-bold text-gov-blue hover:text-gov-navy inline-flex items-center gap-1"
                        >
                          <Phone size={11} aria-hidden="true" /> {assoc.headPhone}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-4 rounded-2xl bg-gov-light border border-slate-200 text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="flex items-start gap-2">
            <Info
              size={16}
              className="text-gov-blue shrink-0 mt-0.5"
              aria-hidden="true"
            />
            Chức danh Trưởng / Phó và thông tin cán bộ được đồng bộ tự động toàn hệ thống từ Quản lý Chi bộ &amp; Đoàn thể Khu phố 3 (Bí thư Chi bộ đứng đầu Khu phố).
          </span>
          <a href={`mailto:${email}`} className={`${btnGhost} shrink-0`}>
            <Mail size={16} aria-hidden="true" /> {email}
          </a>
        </div>
      </div>
    </section>
  );
}
