import React from "react";
import { ChevronRight, Compass, Plus } from "lucide-react";
import { LocalNews } from "../../types";
import { SectionHeader } from "./LandingCommon";
import { btnGhost } from "./landingConstants";
import { NewsNewspaperFeed } from "../news/NewsNewspaperFeed";

export interface CitizenNewsSectionProps {
  displayNews: LocalNews[];
  setNewsDetail: (news: LocalNews | null) => void;
  onNavigateToTab: (tab: any) => void;
  isAdmin?: boolean;
  onAddNews?: () => void;
  onEditNews?: (news: LocalNews) => void;
  onDeleteNews?: (news: LocalNews) => void;
}

export default function CitizenNewsSection({
  displayNews,
  setNewsDetail,
  onNavigateToTab,
  isAdmin = false,
  onAddNews,
  onEditNews,
  onDeleteNews,
}: CitizenNewsSectionProps) {
  return (
    <section
      id="news"
      tabIndex={-1}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 scroll-mt-24 outline-none"
    >
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
        <SectionHeader
          icon={<Compass size={20} />}
          title="Bản tin & Báo điện tử Khu phố 3"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && onAddNews && (
                <button
                  type="button"
                  onClick={onAddNews}
                  className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  <Plus size={15} aria-hidden="true" /> Đăng bản tin mới
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("cultural")}
                  className={btnGhost}
                >
                  Quản trị Tin &amp; Sự kiện <ChevronRight size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          }
        />

        <NewsNewspaperFeed
          newsList={displayNews}
          onSelectNews={setNewsDetail}
          onEditNews={isAdmin ? onEditNews : undefined}
          onDeleteNews={isAdmin ? onDeleteNews : undefined}
          showMasthead={false}
          itemsPerPage={6}
        />
      </div>
    </section>
  );
}
