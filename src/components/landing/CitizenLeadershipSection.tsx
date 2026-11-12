import React from "react";
import { Calendar, Info, Mail, Phone, ShieldCheck } from "lucide-react";
import { LandingConfig } from "../../types";
import { SectionHeader } from "./LandingCommon";
import {
  DEFAULT_LANDING_CONFIG,
  DEFAULT_LEADERSHIP_MEMBERS,
  PUBLIC_CONTACT_EMAIL,
  btnGhost,
} from "./landingConstants";

export interface CitizenLeadershipSectionProps {
  landingConfig?: LandingConfig;
}

export default function CitizenLeadershipSection({
  landingConfig = DEFAULT_LANDING_CONFIG,
}: CitizenLeadershipSectionProps) {
  const leaders =
    landingConfig.leadership && landingConfig.leadership.length > 0
      ? landingConfig.leadership
      : DEFAULT_LEADERSHIP_MEMBERS;

  const email = landingConfig.contactEmail || PUBLIC_CONTACT_EMAIL;

  return (
    <section
      id="leadership"
      tabIndex={-1}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24 outline-none"
    >
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-5">
        <SectionHeader
          icon={<ShieldCheck size={20} />}
          title="Cơ cấu tổ chức & cán bộ"
        />
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaders.map((l) => {
            const initial =
              l.name.trim().split(" ").slice(-1)[0]?.charAt(0) || "C";
            return (
              <li
                key={l.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 ${
                  l.isHighlight
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
                      className="w-16 h-24 rounded-xl bg-blue-100 text-gov-navy font-black text-lg flex items-center justify-center shrink-0 border border-blue-200/70"
                      aria-hidden="true"
                    >
                      {initial}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {l.group && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                        {l.group}
                      </span>
                    )}
                    <h3 className="font-bold text-base text-gov-text">
                      {l.name}
                    </h3>
                    <p className="text-sm font-semibold text-gov-blue">
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
        <div className="p-4 rounded-2xl bg-gov-light border border-slate-200 text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="flex items-start gap-2">
            <Info
              size={16}
              className="text-gov-blue shrink-0 mt-0.5"
              aria-hidden="true"
            />
            Thông tin liên hệ, ảnh chân dung và lịch tiếp dân của từng cán bộ được cập nhật trực tiếp từ Cài đặt Cổng Khu phố 3.
          </span>
          <a href={`mailto:${email}`} className={`${btnGhost} shrink-0`}>
            <Mail size={16} aria-hidden="true" /> {email}
          </a>
        </div>
      </div>
    </section>
  );
}
