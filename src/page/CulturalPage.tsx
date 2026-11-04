import React from "react";
import CommunityEvents from "../components/CommunityEvents";

export interface CulturalPageProps {
  events: any[];
  onAddEvent: (newEvent: any) => void;
  onUpdateEventStatus: (id: string, status: any) => void;
  newsList?: any[];
  onAddNews?: (newNews: any) => void;
  onUpdateNews?: (updatedNews: any) => void;
  onDeleteNews?: (newsId: string) => void;
}

export default function CulturalPage(props: CulturalPageProps) {
  return <CommunityEvents {...props} />;
}

