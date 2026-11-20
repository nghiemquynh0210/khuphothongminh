export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  author_name?: string;
  created_at?: string;
  published_at?: string;
  is_pinned?: boolean;
  is_urgent?: boolean;
  image_url?: string;
}

export interface FieldReport {
  id: string;
  title: string;
  report_type: string;
  location: string;
  description: string;
  reporter_name?: string;
  reporter_phone?: string;
  status: "pending" | "processing" | "resolved" | "rejected";
  created_at?: string;
  photo_urls?: string[];
}

export interface ResidentLookupResult {
  found: boolean;
  fullName?: string;
  idCardMasked?: string;
  residenceType?: "Thường trú" | "Tạm trú";
  address?: string;
  temporaryRegDate?: string;
  temporaryExpDate?: string;
  expiryStatus?: "valid" | "warning_30d" | "expired";
  daysLeft?: number;
  householdCode?: string;
  managementStatus?: string;
}
