import React, { useMemo, useState } from "react";
import { ChevronRight, Compass, Plus } from "lucide-react";
import { LocalNews } from "../../types";
import { SectionHeader } from "./LandingCommon";
import { ROUTES, navigate, useCurrentPath } from "./landingConstants";
import { NewsNewspaperFeed } from "../news/NewsNewspaperFeed";
import NewsDetailPage from "../../page/NewsDetailPage";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export interface CitizenNewsSectionProps {
  displayNews: LocalNews[];
  setNewsDetail?: (news: LocalNews | null) => void;
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
  const currentPath = useCurrentPath();
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);

  // Bóc tách newsId từ URL nếu đường dẫn có dạng /news/detail/:id hoặc /dashboard/cultural/news/detail/:id
  const urlNewsId = useMemo(() => {
    if (currentPath.startsWith("/news/detail/")) {
      return decodeURIComponent(currentPath.replace(/^\/news\/detail\//, ""));
    }
    if (currentPath.startsWith("/dashboard/cultural/news/detail/")) {
      return decodeURIComponent(
        currentPath.replace(/^\/dashboard\/cultural\/news\/detail\//, "")
      );
    }
    return null;
  }, [currentPath]);

  const activeNewsId = selectedNewsId || urlNewsId;

  const handleSelectNews = (news: LocalNews) => {
    setSelectedNewsId(news.id);
    navigate(`/news/detail/${encodeURIComponent(news.id)}`);
  };

  const handleBackToList = () => {
    setSelectedNewsId(null);
    navigate(ROUTES.NEWS);
  };

  // Điều hướng và render trang chi tiết bản tin chuyên dụng (NewsDetailPage trong src/page)
  if (activeNewsId) {
    return (
      <section
        id="news-detail-view"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 scroll-mt-24 outline-none"
      >
        <NewsDetailPage
          newsId={activeNewsId}
          newsList={displayNews}
          basePath={ROUTES.NEWS}
          onBack={handleBackToList}
          onSelectNews={(nextNews) => {
            setSelectedNewsId(nextNews.id);
            navigate(`/news/detail/${encodeURIComponent(nextNews.id)}`);
          }}
          onEdit={isAdmin ? onEditNews : undefined}
          onDelete={
            isAdmin && onDeleteNews
              ? (id) => {
                  const target = displayNews.find((n) => n.id === id);
                  if (target) onDeleteNews(target);
                  handleBackToList();
                }
              : undefined
          }
        />
      </section>
    );
  }

  return (
    <section
      id="news"
      tabIndex={-1}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 scroll-mt-24 outline-none"
    >
      <Card className="rounded-2xl sm:rounded-3xl border-slate-200/90 p-5 sm:p-8 shadow-2xs space-y-6 bg-white">
        <SectionHeader
          icon={<Compass size={20} />}
          title="Bản tin & Báo điện tử Khu phố 3"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && onAddNews && (
                <Button
                  type="button"
                  size="sm"
                  variant="emerald"
                  onClick={onAddNews}
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  className="font-bold shadow-2xs"
                >
                  Đăng bản tin mới
                </Button>
              )}
              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateToTab("cultural")}
                  rightIcon={<ChevronRight size={16} aria-hidden="true" />}
                  className="font-semibold text-slate-700 hover:text-slate-900 border-slate-200"
                >
                  Quản trị Tin &amp; Sự kiện
                </Button>
              )}
            </div>
          }
        />

        <NewsNewspaperFeed
          newsList={displayNews}
          onSelectNews={handleSelectNews}
          onEditNews={isAdmin ? onEditNews : undefined}
          onDeleteNews={isAdmin ? onDeleteNews : undefined}
          showMasthead={false}
          itemsPerPage={6}
        />
      </Card>
    </section>
  );
}
