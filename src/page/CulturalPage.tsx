import React, { useEffect, useMemo, useState } from "react";
import CommunityEvents from "../components/CommunityEvents";
import NewsDetailPage from "./NewsDetailPage";
import NewsFormPage from "./NewsFormPage";
import EventDetailPage from "./EventDetailPage";
import EventFormPage from "./EventFormPage";
import { LoadingFade } from "../components/common/LoadingFade";
import { InlineNotice } from "../components/ui/ConfirmModal";
import { CommunityEvent, LocalNews } from "../types";
import { initialNewsList } from "../mockData";
import {
  ROUTES,
  getEventCreatePath,
  getEventDetailPath,
  getEventEditPath,
  getNewsCreatePath,
  getNewsDetailPath,
  getNewsEditPath,
  navigate,
  parseCulturalRoute,
  useCurrentLocation,
} from "../routes";

export interface CulturalPageProps {
  events: CommunityEvent[];
  onAddEvent: (newEvent: CommunityEvent) => void;
  onUpdateEventStatus: (id: string, status: CommunityEvent["status"]) => void;
  onUpdateEvent?: (updatedEvent: CommunityEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  newsList?: LocalNews[];
  onAddNews?: (newNews: LocalNews) => void;
  onUpdateNews?: (updatedNews: LocalNews) => void;
  onDeleteNews?: (newsId: string) => void;
  isDataLoading?: boolean;
}

export default function CulturalPage(props: CulturalPageProps) {
  const location = useCurrentLocation();
  const routeMatch = parseCulturalRoute(location.pathname, location.search);

  const basePath = useMemo(() => {
    return location.pathname.startsWith("/citizen")
      ? "/citizen/cultural"
      : ROUTES.DASHBOARD_CULTURAL;
  }, [location.pathname]);

  const [localNewsList, setLocalNewsList] = useState<LocalNews[]>(() => {
    if (props.newsList && props.newsList.length > 0) {
      return props.newsList;
    }
    try {
      const saved = localStorage.getItem("kp3_local_news");
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialNewsList;
  });

  useEffect(() => {
    if (props.newsList && props.newsList.length > 0) {
      setLocalNewsList(props.newsList);
    }
  }, [props.newsList]);

  const [notice, setNotice] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleAddNews = (newNews: LocalNews) => {
    props.onAddNews?.(newNews);
    setLocalNewsList((prev) => [newNews, ...prev]);
    try {
      const updated = [newNews, ...localNewsList];
      localStorage.setItem("kp3_local_news", JSON.stringify(updated));
    } catch {}
  };

  const handleUpdateNews = (updatedNews: LocalNews) => {
    props.onUpdateNews?.(updatedNews);
    setLocalNewsList((prev) =>
      prev.map((n) => (n.id === updatedNews.id ? updatedNews : n))
    );
    try {
      const updated = localNewsList.map((n) =>
        n.id === updatedNews.id ? updatedNews : n
      );
      localStorage.setItem("kp3_local_news", JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteNews = (newsId: string, newsTitle?: string) => {
    props.onDeleteNews?.(newsId);
    setLocalNewsList((prev) => prev.filter((n) => n.id !== newsId));
    try {
      const updated = localNewsList.filter((n) => n.id !== newsId);
      localStorage.setItem("kp3_local_news", JSON.stringify(updated));
    } catch {}
    setNotice({
      type: "success",
      message: `Đã xóa bản tin "${newsTitle || newsId}" khỏi hệ thống.`,
    });
    navigate(basePath);
  };

  const handleDeleteEvent = (eventId: string, eventTitle?: string) => {
    props.onDeleteEvent?.(eventId);
    setNotice({
      type: "success",
      message: `Đã xóa sự kiện "${eventTitle || eventId}" khỏi hệ thống.`,
    });
    navigate(basePath);
  };

  // Route Dispatching: News
  if (routeMatch?.type === "news") {
    if (routeMatch.mode === "detail") {
      return (
        <NewsDetailPage
          newsId={routeMatch.newsId}
          newsList={localNewsList}
          isDataLoading={props.isDataLoading}
          basePath={basePath}
          onBack={() => navigate(basePath)}
          onEdit={(news) => navigate(getNewsEditPath(news.id, basePath))}
          onDelete={(id, title) => handleDeleteNews(id, title)}
          onSelectNews={(news) =>
            navigate(getNewsDetailPath(news.id, basePath))
          }
        />
      );
    }

    if (routeMatch.mode === "edit") {
      return (
        <NewsFormPage
          mode="edit"
          newsId={routeMatch.newsId}
          newsList={localNewsList}
          isDataLoading={props.isDataLoading}
          basePath={basePath}
          onUpdateNews={handleUpdateNews}
          onCancel={() =>
            navigate(getNewsDetailPath(routeMatch.newsId, basePath))
          }
          onSaved={(saved) => {
            setNotice({
              type: "success",
              message: `Đã cập nhật bài viết "${saved.title}" thành công!`,
            });
            navigate(getNewsDetailPath(saved.id, basePath));
          }}
        />
      );
    }

    return (
      <NewsFormPage
        mode="create"
        newsList={localNewsList}
        isDataLoading={props.isDataLoading}
        basePath={basePath}
        onAddNews={handleAddNews}
        onCancel={() => navigate(basePath)}
        onSaved={(saved) => {
          setNotice({
            type: "success",
            message: `Đã phát hành bản tin "${saved.title}" thành công!`,
          });
          navigate(getNewsDetailPath(saved.id, basePath));
        }}
      />
    );
  }

  // Route Dispatching: Event
  if (routeMatch?.type === "event") {
    if (routeMatch.mode === "detail") {
      return (
        <EventDetailPage
          eventId={routeMatch.eventId}
          events={props.events}
          isDataLoading={props.isDataLoading}
          basePath={basePath}
          onBack={() => navigate(basePath)}
          onEdit={(ev) => navigate(getEventEditPath(ev.id, basePath))}
          onDelete={(id, title) => handleDeleteEvent(id, title)}
          onSelectEvent={(ev) =>
            navigate(getEventDetailPath(ev.id, basePath))
          }
        />
      );
    }

    if (routeMatch.mode === "edit") {
      return (
        <EventFormPage
          mode="edit"
          eventId={routeMatch.eventId}
          events={props.events}
          isDataLoading={props.isDataLoading}
          basePath={basePath}
          onUpdateEvent={props.onUpdateEvent}
          onCancel={() =>
            navigate(getEventDetailPath(routeMatch.eventId, basePath))
          }
          onSaved={(saved) => {
            setNotice({
              type: "success",
              message: `Đã cập nhật sự kiện "${saved.title}" thành công!`,
            });
            navigate(getEventDetailPath(saved.id, basePath));
          }}
        />
      );
    }

    return (
      <EventFormPage
        mode="create"
        events={props.events}
        isDataLoading={props.isDataLoading}
        basePath={basePath}
        onAddEvent={props.onAddEvent}
        onCancel={() => navigate(basePath)}
        onSaved={(saved) => {
          setNotice({
            type: "success",
            message: `Đã lên lịch sự kiện "${saved.title}" thành công!`,
          });
          navigate(getEventDetailPath(saved.id, basePath));
        }}
      />
    );
  }

  // Default List View
  return (
    <div className="space-y-4">
      {notice && (
        <InlineNotice
          type={notice.type}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}
      {props.isDataLoading ? (
        <LoadingFade title="Đang tải dữ liệu bản tin & sự kiện KP3..." />
      ) : (
        <CommunityEvents
          {...props}
          newsList={localNewsList}
          basePath={basePath}
          onOpenCreateNews={() => navigate(getNewsCreatePath(basePath))}
          onOpenEditNews={(news) =>
            navigate(getNewsEditPath(news.id, basePath))
          }
          onOpenDetailNews={(news) =>
            navigate(getNewsDetailPath(news.id, basePath))
          }
          onOpenCreateEvent={() => navigate(getEventCreatePath(basePath))}
          onOpenEditEvent={(ev) =>
            navigate(getEventEditPath(ev.id, basePath))
          }
          onOpenDetailEvent={(ev) =>
            navigate(getEventDetailPath(ev.id, basePath))
          }
        />
      )}
    </div>
  );
}
