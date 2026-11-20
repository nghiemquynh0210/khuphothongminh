import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { NewsItem } from "./types";
import { HomeTab } from "./components/HomeTab";
import { NewsTab } from "./components/NewsTab";
import { ReportTab } from "./components/ReportTab";
import { LookupTab } from "./components/LookupTab";
import { FormsTab } from "./components/FormsTab";
import { StaffTab, StaffProfile } from "./components/StaffTab";
import { NewsDetailModal } from "./components/NewsDetailModal";
import { Home, Bell, AlertTriangle, Search, ShieldCheck } from "lucide-react";

export type MiniAppTab = "home" | "news" | "report" | "lookup" | "forms" | "staff";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MiniAppTab>("home");
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("community_news")
        .select("id, title, summary, content, category, author_name, created_at, is_pinned, is_urgent, image_url")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data && data.length > 0) {
        setNewsList(data as NewsItem[]);
      } else {
        setNewsList([
          {
            id: "tb-430",
            title: "Thông báo số 430/TB-UBND về việc treo cờ Tổ quốc & lịch nghỉ Lễ Quốc khánh 02/9",
            summary: "Thực hiện chỉ đạo của UBND TP. Hồ Chí Minh và UBND Phường An Phú về treo cờ Tổ quốc và đảm bảo an ninh trật tự trên toàn địa bàn.",
            content: `ỦY BAN NHÂN DÂN PHƯỜNG AN PHÚ\nKHU PHỐ 3 - TP. HỒ CHÍ MINH\n\nTHÔNG BÁO VỀ VIỆC TREO CỜ TỔ QUỐC VÀ NGHỈ LỄ QUỐC KHÁNH 02/9\n\n1. Thời gian treo cờ Tổ quốc: Từ ngày 31/8 đến hết ngày 03/9.\n2. Tất cả các hộ gia đình, cơ sở kinh doanh, nhà trọ trên địa bàn Khu phố 3 đồng loạt treo cờ Tổ quốc trang nghiêm trước cửa nhà.\n3. Ban Chỉ huy Quân sự và Công an Khu vực tăng cường tuần tra đảm bảo an toàn PCCC và an ninh trật tự.\n\nTrân trọng thông báo!`,
            category: "Thông báo",
            is_pinned: true,
            published_at: new Date().toISOString(),
          },
          {
            id: "pccc-01",
            title: "Kế hoạch tổng kiểm tra an toàn PCCC & lối thoát hiểm các cơ sở nhà trọ Khu phố 3",
            summary: "Đoàn kiểm tra liên ngành Công an Phường An Phú phối hợp Ban Điều Hành Khu Phố 3 kiểm tra 108 cơ sở nhà trọ lưu trú.",
            content: `Thực hiện cao điểm kiểm tra PCCC theo chỉ đạo của Công an TP. Hồ Chí Minh:\n- Kiểm tra thiết bị bình chữa cháy xách tay, lối thoát nạn thứ 2 tại các cơ sở nhà trọ lưu trú.\n- Đề nghị các chủ cơ sở nhà trọ rà soát và khắc phục ngay các tồn tại trước ngày 30/11.\n\nĐầu mối liên hệ: Đại úy Trần Quốc Hải - Cảnh sát khu vực.`,
            category: "PCCC",
            is_pinned: true,
            published_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error("Fetch news error:", err);
    }
  };

  useEffect(() => {
    void fetchNews();

    // Khôi phục phiên đăng nhập Cán bộ nếu đã đăng nhập trước đó
    const restoreStaffSession = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, phone, role, approval_status, position")
        .eq("id", userId)
        .maybeSingle();
      if (profile && profile.approval_status === "approved") {
        setStaffProfile(profile as StaffProfile);
      }
    };
    void restoreStaffSession();
  }, []);

  return (
    <div className="mini-app-shell">
      {/* Tab Views */}
      <main className="flex-1">
        {activeTab === "home" && (
          <HomeTab
            newsList={newsList}
            onSelectNews={(n) => setSelectedNews(n)}
            onNavigateTab={(t) => setActiveTab(t)}
            staffName={staffProfile?.full_name}
          />
        )}
        {activeTab === "news" && (
          <NewsTab
            newsList={newsList}
            onSelectNews={(n) => setSelectedNews(n)}
          />
        )}
        {activeTab === "report" && <ReportTab />}
        {activeTab === "lookup" && <LookupTab />}
        {activeTab === "forms" && <FormsTab />}
        {activeTab === "staff" && (
          <StaffTab
            staffProfile={staffProfile}
            onAuthChange={(p) => setStaffProfile(p)}
            onNewsPublished={() => void fetchNews()}
          />
        )}
      </main>

      {/* Article Detail Modal */}
      <NewsDetailModal news={selectedNews} onClose={() => setSelectedNews(null)} />

      {/* Fixed Bottom Navigation (5 tabs gọn đẹp cho Cư dân + Cán bộ) */}
      <nav className="bottom-nav">
        <button
          type="button"
          onClick={() => setActiveTab("home")}
          className={`nav-item ${activeTab === "home" || activeTab === "forms" ? "active" : ""}`}
        >
          <Home size={20} />
          <span>Trang chủ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("news")}
          className={`nav-item ${activeTab === "news" ? "active" : ""}`}
        >
          <Bell size={20} />
          <span>Bản tin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`nav-item ${activeTab === "report" ? "active" : ""}`}
        >
          <AlertTriangle size={20} />
          <span>Báo 1022</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lookup")}
          className={`nav-item ${activeTab === "lookup" ? "active" : ""}`}
        >
          <Search size={20} />
          <span>Tra cứu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`nav-item ${activeTab === "staff" ? "active" : ""}`}
        >
          <div className="relative">
            <ShieldCheck size={20} />
            {staffProfile && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-1 border border-white" />
            )}
          </div>
          <span>{staffProfile ? "Điều hành" : "Cán bộ"}</span>
        </button>
      </nav>
    </div>
  );
};
