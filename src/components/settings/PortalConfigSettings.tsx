import React, { useRef, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Globe,
  Image as ImageIcon,
  Images,
  Info,
  Map as MapIcon,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  LandingConfig,
  LandingGalleryImage,
  LeadershipMember,
} from "../../types";
import {
  DEFAULT_LANDING_CONFIG,
  DEFAULT_LEADERSHIP_MEMBERS,
  mergeLandingConfig,
} from "../landing/landingConstants";
import {
  uploadSingleImage,
  validateImageFile,
} from "../../utils/imageUpload";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { ConfirmModal } from "../ui/ConfirmModal";

export interface PortalConfigSettingsProps {
  landingConfig: LandingConfig;
  onUpdateLandingConfig: (next: LandingConfig) => void;
  onNotify?: (msg: string) => void;
}

type PortalSubSection = "general" | "images" | "leadership" | "about";

const LEADER_GROUPS: NonNullable<LeadershipMember["group"]>[] = [
  "Cấp ủy Chi bộ",
  "Ban Điều hành Khu phố",
  "Công an khu vực",
  "Đoàn thể",
];

export const PortalConfigSettings: React.FC<PortalConfigSettingsProps> = ({
  landingConfig,
  onUpdateLandingConfig,
  onNotify,
}) => {
  const merged = mergeLandingConfig(landingConfig);
  const [section, setSection] = useState<PortalSubSection>("general");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Gallery draft
  const [newGalleryCaption, setNewGalleryCaption] = useState("");
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const galleryFileRef = useRef<HTMLInputElement | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);

  // Route draft for About KP3
  const [newRouteText, setNewRouteText] = useState("");

  // Leadership Modal Editor
  const [leaderModalOpen, setLeaderModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<LeadershipMember | null>(null);
  const [ldName, setLdName] = useState("");
  const [ldRole, setLdRole] = useState("");
  const [ldSubRole, setLdSubRole] = useState("");
  const [ldGroup, setLdGroup] =
    useState<NonNullable<LeadershipMember["group"]>>("Ban Điều hành Khu phố");
  const [ldScope, setLdScope] = useState("Ban Điều hành Khu phố 3");
  const [ldPhone, setLdPhone] = useState("");
  const [ldSchedule, setLdSchedule] = useState("");
  const [ldDesc, setLdDesc] = useState("");
  const [ldAvatar, setLdAvatar] = useState("");
  const [ldHighlight, setLdHighlight] = useState(false);
  const [ldFormError, setLdFormError] = useState("");
  const [deleteLeaderTarget, setDeleteLeaderTarget] = useState<LeadershipMember | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const mapInputRef = useRef<HTMLInputElement | null>(null);
  const leaderAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const editGalleryInputRef = useRef<HTMLInputElement | null>(null);

  const commit = (next: LandingConfig, toastText?: string) => {
    onUpdateLandingConfig(next);
    if (toastText) onNotify?.(toastText);
  };

  const handleImageUpload = async (
    file: File | undefined,
    key: string,
    maxW: number,
    maxH: number,
    onDone: (dataUrl: string) => void
  ) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    setUploadingKey(key);
    try {
      const uploadedUrl = await uploadSingleImage(file, `cms/${key}`, {
        maxWidth: maxW,
        maxHeight: maxH,
        quality: 0.85,
      });
      onDone(uploadedUrl);
    } catch (ex) {
      setErrorMsg(
        ex instanceof Error ? ex.message : "Không thể xử lý tệp hình ảnh."
      );
    } finally {
      setUploadingKey(null);
    }
  };

  // About updater helper
  const about = merged.about || DEFAULT_LANDING_CONFIG.about!;
  const updateAbout = (patch: Partial<NonNullable<LandingConfig["about"]>>) => {
    commit({
      ...merged,
      about: { ...about, ...patch },
    });
  };

  // Gallery CRUD
  const gallery = merged.galleryImages || [];
  const handleAddGalleryItem = (urlToUse: string) => {
    if (!urlToUse.trim()) return;
    const item: LandingGalleryImage = {
      id: `GAL-${Date.now().toString().slice(-6)}`,
      url: urlToUse.trim(),
      caption: newGalleryCaption.trim() || "Hoạt động cộng đồng Khu phố 3",
    };
    commit(
      { ...merged, galleryImages: [item, ...gallery] },
      "Đã thêm hình ảnh mới vào thư viện Khu phố 3."
    );
    setNewGalleryUrl("");
    setNewGalleryCaption("");
  };

  const handleUpdateGalleryCaption = (id: string, caption: string) => {
    commit({
      ...merged,
      galleryImages: gallery.map((g) => (g.id === id ? { ...g, caption } : g)),
    });
  };

  const handleReplaceGalleryImage = (id: string, url: string) => {
    commit(
      {
        ...merged,
        galleryImages: gallery.map((g) => (g.id === id ? { ...g, url } : g)),
      },
      "Đã cập nhật hình ảnh trong thư viện."
    );
  };

  const handleDeleteGalleryItem = (id: string) => {
    commit(
      {
        ...merged,
        galleryImages: gallery.filter((g) => g.id !== id),
      },
      "Đã xóa hình ảnh khỏi thư viện."
    );
  };

  // Leadership CRUD
  const leaders = merged.leadership || DEFAULT_LEADERSHIP_MEMBERS;

  const openAddLeader = () => {
    setEditingLeader(null);
    setLdName("");
    setLdRole("Thành viên Ban Điều hành");
    setLdSubRole("");
    setLdGroup("Ban Điều hành Khu phố");
    setLdScope("Ban Điều hành Khu phố 3");
    setLdPhone("");
    setLdSchedule("");
    setLdDesc("");
    setLdAvatar("");
    setLdHighlight(false);
    setLdFormError("");
    setLeaderModalOpen(true);
  };

  const openEditLeader = (member: LeadershipMember) => {
    setEditingLeader(member);
    setLdName(member.name);
    setLdRole(member.role);
    setLdSubRole(member.subRole || "");
    setLdGroup(member.group || "Ban Điều hành Khu phố");
    setLdScope(member.scope || "");
    setLdPhone(member.phone || "");
    setLdSchedule(member.schedule || "");
    setLdDesc(member.description || "");
    setLdAvatar(member.avatar || "");
    setLdHighlight(Boolean(member.isHighlight));
    setLdFormError("");
    setLeaderModalOpen(true);
  };

  const handleSaveLeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ldName.trim() || !ldRole.trim()) {
      setLdFormError("Vui lòng nhập họ tên và chức vụ cán bộ.");
      return;
    }

    const saved: LeadershipMember = {
      id: editingLeader?.id || `LD-${Date.now().toString().slice(-6)}`,
      name: ldName.trim(),
      role: ldRole.trim(),
      subRole: ldSubRole.trim() || undefined,
      group: ldGroup,
      scope: ldScope.trim() || "Ban Điều hành Khu phố 3",
      phone: ldPhone.trim() || undefined,
      schedule: ldSchedule.trim() || undefined,
      description: ldDesc.trim() || undefined,
      avatar: ldAvatar.trim() || undefined,
      isHighlight: ldHighlight,
    };

    const nextList = editingLeader
      ? leaders.map((l) => (l.id === saved.id ? saved : l))
      : [...leaders, saved];

    commit(
      { ...merged, leadership: nextList },
      editingLeader
        ? `Đã cập nhật thông tin cán bộ "${saved.name}".`
        : `Đã thêm cán bộ "${saved.name}" vào cơ cấu tổ chức.`
    );
    setLeaderModalOpen(false);
  };

  const executeDeleteLeader = () => {
    if (!deleteLeaderTarget) return;
    commit(
      {
        ...merged,
        leadership: leaders.filter((l) => l.id !== deleteLeaderTarget.id),
      },
      `Đã xóa cán bộ "${deleteLeaderTarget.name}" khỏi danh sách.`
    );
    setDeleteLeaderTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & inner sub-tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Cấu hình Trang chủ, Hình ảnh, Giới thiệu KP3 &amp; Cán bộ
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Mọi thay đổi được lưu trực tiếp và đồng bộ ngay ra Cổng cư dân công khai (Trang chủ, Giới thiệu KP3, Cơ cấu tổ chức &amp; cán bộ).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw size={14} />}
            onClick={() => setConfirmResetAll(true)}
          >
            Khôi phục mặc định
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {[
            { id: "general", label: "Trang chủ & Liên hệ", icon: Globe },
            { id: "images", label: "Cài đặt & Sửa Hình ảnh", icon: ImageIcon },
            {
              id: "leadership",
              label: `Quản lý Cán bộ (${leaders.length})`,
              icon: Users,
            },
            { id: "about", label: "Giới thiệu thông tin KP3", icon: Info },
          ].map((tab) => {
            const IconComp = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id as PortalSubSection)}
                className={`min-h-10 px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  active
                    ? "bg-emerald-700 border-emerald-700 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <IconComp size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center justify-between gap-2"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* SECTION 1: TRANG CHỦ & LIÊN HỆ */}
      {section === "general" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onNotify?.("Đã lưu cấu hình Trang chủ & Thông tin liên hệ Khu phố 3.");
          }}
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <h5 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Thông tin chung Cổng cư dân &amp; Liên hệ
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="portal-site-title"
              label="Tên cổng (Header & Footer)"
              value={merged.siteTitle}
              onChange={(e) => commit({ ...merged, siteTitle: e.target.value })}
            />
            <Input
              id="portal-site-subtitle"
              label="Mô tả ngắn dưới Logo"
              value={merged.siteSubtitle}
              onChange={(e) => commit({ ...merged, siteSubtitle: e.target.value })}
            />
          </div>

          <Input
            id="portal-hero-badge"
            label="Nhãn hành chính đầu trang"
            value={merged.heroBadge}
            onChange={(e) => commit({ ...merged, heroBadge: e.target.value })}
          />

          <Input
            id="portal-hero-title"
            label="Tiêu đề chính Cổng thông tin (H1)"
            value={merged.heroTitle}
            onChange={(e) => commit({ ...merged, heroTitle: e.target.value })}
          />

          <Input
            id="portal-hero-note"
            label="Mô tả địa giới ngắn trên Trang chủ"
            value={merged.heroAddressNote}
            onChange={(e) =>
              commit({ ...merged, heroAddressNote: e.target.value })
            }
          />

          <div className="space-y-1.5">
            <label
              htmlFor="portal-banner-notice"
              className="block text-sm font-medium text-slate-700"
            >
              Thông báo nổi bật toàn cổng (để trống nếu không hiển thị)
            </label>
            <textarea
              id="portal-banner-notice"
              rows={2}
              value={merged.bannerNotice || ""}
              onChange={(e) =>
                commit({ ...merged, bannerNotice: e.target.value })
              }
              placeholder="VD: Thông báo lịch họp giao ban Ban Điều hành Khu phố 3..."
              className="w-full px-3.5 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <Input
              id="portal-contact-addr"
              label="Địa chỉ Nhà Văn hóa / Trụ sở KP3"
              value={merged.contactAddress}
              onChange={(e) =>
                commit({ ...merged, contactAddress: e.target.value })
              }
            />
            <Input
              id="portal-hotline"
              label="Số điện thoại trực ban"
              value={merged.hotline}
              onChange={(e) => commit({ ...merged, hotline: e.target.value })}
            />
            <Input
              id="portal-hours"
              label="Giờ tiếp công dân"
              value={merged.workingHours}
              onChange={(e) =>
                commit({ ...merged, workingHours: e.target.value })
              }
            />
            <Input
              id="portal-email"
              label="Email tiếp nhận phản ánh"
              type="email"
              value={merged.contactEmail}
              onChange={(e) =>
                commit({ ...merged, contactEmail: e.target.value })
              }
            />
          </div>

          <Input
            id="portal-footer-op"
            label="Đơn vị phụ trách nội dung (Chân trang)"
            value={merged.footerOperator}
            onChange={(e) =>
              commit({ ...merged, footerOperator: e.target.value })
            }
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="emerald" leftIcon={<Save size={15} />}>
              Xác nhận lưu thay đổi
            </Button>
          </div>
        </form>
      )}

      {/* SECTION 2: CÀI ĐẶT & SỬA HÌNH ẢNH */}
      {section === "images" && (
        <div className="space-y-6">
          {/* Logo, Hero Cover & Map Image */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Logo Portal */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h5 className="text-sm font-bold text-slate-900">
                Logo Cổng Khu phố 3 (Header)
              </h5>
              <div className="h-32 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {merged.logoUrl ? (
                  <img
                    src={merged.logoUrl}
                    alt="Logo Cổng KP3"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-xs text-slate-500">
                    Đang dùng biểu tượng mặc định
                  </span>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  handleImageUpload(file, "logo", 512, 512, (url) =>
                    commit({ ...merged, logoUrl: url }, "Đã cập nhật Logo cổng.")
                  );
                }}
              />
              <input
                type="text"
                aria-label="URL Logo Cổng"
                placeholder="Dán URL logo (https://...)"
                value={
                  merged.logoUrl?.startsWith("data:image/")
                    ? ""
                    : merged.logoUrl || ""
                }
                onChange={(e) => commit({ ...merged, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Upload size={13} />}
                  disabled={uploadingKey === "logo"}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingKey === "logo" ? "Đang tải..." : "Tải ảnh Logo"}
                </Button>
                {merged.logoUrl && (
                  <Button
                    size="sm"
                    variant="dangerGhost"
                    leftIcon={<Trash2 size={13} />}
                    onClick={() =>
                      commit({ ...merged, logoUrl: "" }, "Đã gỡ ảnh Logo tùy chỉnh.")
                    }
                  >
                    Xóa Logo
                  </Button>
                )}
              </div>
            </div>

            {/* Ảnh bìa / Banner Khu phố */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h5 className="text-sm font-bold text-slate-900">
                Ảnh minh họa Chung Khu phố 3
              </h5>
              <div className="h-32 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <img
                  src={
                    merged.heroCoverUrl || DEFAULT_LANDING_CONFIG.heroCoverUrl
                  }
                  alt="Ảnh bìa KP3"
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                ref={heroInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  handleImageUpload(file, "hero", 1400, 900, (url) =>
                    commit({ ...merged, heroCoverUrl: url }, "Đã cập nhật ảnh minh họa.")
                  );
                }}
              />
              <input
                type="text"
                aria-label="URL Ảnh bìa Khu phố"
                placeholder="Dán URL ảnh minh họa (https://...)"
                value={
                  merged.heroCoverUrl?.startsWith("data:image/")
                    ? ""
                    : merged.heroCoverUrl || ""
                }
                onChange={(e) =>
                  commit({ ...merged, heroCoverUrl: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Upload size={13} />}
                disabled={uploadingKey === "hero"}
                onClick={() => heroInputRef.current?.click()}
              >
                {uploadingKey === "hero" ? "Đang tải..." : "Đổi ảnh từ máy"}
              </Button>
            </div>

            {/* Ảnh Bản đồ ranh giới (/about) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h5 className="text-sm font-bold text-slate-900">
                Ảnh Bản đồ Số Địa giới (Mục Giới thiệu)
              </h5>
              <div className="h-32 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <img
                  src={about.mapImageUrl}
                  alt="Bản đồ Khu phố 3"
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                ref={mapInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  handleImageUpload(file, "map", 1600, 1100, (url) => {
                    updateAbout({ mapImageUrl: url });
                    onNotify?.("Đã cập nhật ảnh bản đồ địa giới KP3.");
                  });
                }}
              />
              <input
                type="text"
                aria-label="URL Bản đồ Khu phố 3"
                placeholder="Dán URL ảnh bản đồ (https://...)"
                value={
                  about.mapImageUrl.startsWith("data:image/")
                    ? ""
                    : about.mapImageUrl
                }
                onChange={(e) => updateAbout({ mapImageUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Upload size={13} />}
                  disabled={uploadingKey === "map"}
                  onClick={() => mapInputRef.current?.click()}
                >
                  {uploadingKey === "map" ? "Đang tải..." : "Tải ảnh Bản đồ"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<RotateCcw size={13} />}
                  onClick={() => {
                    updateAbout({
                      mapImageUrl: DEFAULT_LANDING_CONFIG.about!.mapImageUrl,
                    });
                    onNotify?.("Đã khôi phục ảnh bản đồ Phường An Phú mặc định.");
                  }}
                >
                  Ảnh gốc
                </Button>
              </div>
            </div>
          </div>

          {/* Thư viện Hình ảnh Hoạt động Khu phố */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h5 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Images size={16} className="text-emerald-700" />
                  Thư viện Hình ảnh Hoạt động Khu phố ({gallery.length} ảnh)
                </h5>
                <p className="text-xs text-slate-600 mt-0.5">
                  Thêm mới, sửa ảnh, chỉnh chú thích hoặc xóa ảnh hiển thị tại trang Giới thiệu Khu phố 3.
                </p>
              </div>
              <div>
                <input
                  ref={galleryFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    handleImageUpload(file, "new-gallery", 1400, 1000, (url) =>
                      handleAddGalleryItem(url)
                    );
                  }}
                />
                <Button
                  size="sm"
                  variant="emerald"
                  leftIcon={<Upload size={14} />}
                  disabled={uploadingKey === "new-gallery"}
                  onClick={() => galleryFileRef.current?.click()}
                >
                  {uploadingKey === "new-gallery"
                    ? "Đang tải..."
                    : "Tải ảnh mới từ máy"}
                </Button>
              </div>
            </div>

            {/* Add by URL + Caption */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <input
                type="text"
                value={newGalleryCaption}
                onChange={(e) => setNewGalleryCaption(e.target.value)}
                placeholder="Chú thích hình ảnh mới (VD: Ngày hội Đại đoàn kết KP3)"
                className="sm:col-span-5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="url"
                value={newGalleryUrl}
                onChange={(e) => setNewGalleryUrl(e.target.value)}
                placeholder="Hoặc dán URL hình ảnh (https://...)"
                className="sm:col-span-5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
              <Button
                size="sm"
                variant="primary"
                className="sm:col-span-2"
                leftIcon={<Plus size={14} />}
                disabled={!newGalleryUrl.trim()}
                onClick={() => handleAddGalleryItem(newGalleryUrl)}
              >
                Thêm ảnh
              </Button>
            </div>

            <input
              ref={editGalleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                const targetId = editingGalleryId;
                setEditingGalleryId(null);
                if (!targetId) return;
                handleImageUpload(file, `edit-${targetId}`, 1400, 1000, (url) =>
                  handleReplaceGalleryImage(targetId, url)
                );
              }}
            />

            {gallery.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Chưa có hình ảnh nào trong thư viện.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 overflow-hidden bg-white flex flex-col justify-between"
                  >
                    <div className="relative aspect-video bg-slate-100">
                      <img
                        src={item.url}
                        alt={item.caption}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-2.5">
                      <input
                        type="text"
                        aria-label="Chú thích ảnh"
                        value={item.caption}
                        onChange={(e) =>
                          handleUpdateGalleryCaption(item.id, e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGalleryId(item.id);
                            editGalleryInputRef.current?.click();
                          }}
                          className="min-h-8 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={12} /> Sửa / Đổi ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryItem(item.id)}
                          className="min-h-8 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: QUẢN LÝ CÁN BỘ (THÊM / SỬA / XÓA) */}
      {section === "leadership" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h5 className="text-sm font-bold text-slate-900">
                Danh sách Cơ cấu tổ chức &amp; Cán bộ Khu phố 3 ({leaders.length})
              </h5>
              <p className="text-xs text-slate-600 mt-0.5">
                Hiển thị công khai tại chuyên mục Cơ cấu tổ chức &amp; cán bộ và trang Giới thiệu Khu phố 3.
              </p>
            </div>
            <Button
              size="sm"
              variant="emerald"
              leftIcon={<UserPlus size={15} />}
              onClick={openAddLeader}
            >
              Thêm cán bộ mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaders.map((m) => {
              const initial = m.name.trim().split(" ").slice(-1)[0]?.charAt(0) || "C";
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="w-16 h-24 rounded-xl object-cover object-top border border-slate-200 bg-white shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-24 rounded-xl bg-blue-100 text-gov-navy font-black text-lg flex items-center justify-center shrink-0 border border-blue-200/70">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                        {m.group || "Ban Điều hành Khu phố"}
                      </span>
                      <h6 className="font-bold text-sm text-slate-900 truncate">
                        {m.name}
                      </h6>
                      <p className="text-xs font-semibold text-gov-blue">
                        {m.role}
                        {m.subRole ? ` · ${m.subRole}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {m.scope}
                      </p>
                    </div>
                  </div>

                  {m.phone && (
                    <div className="text-xs font-mono text-slate-700 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <Phone size={12} className="text-emerald-700 shrink-0" />
                      <span>{m.phone}</span>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditLeader(m)}
                      className="min-h-9 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={12} /> Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteLeaderTarget(m)}
                      className="min-h-9 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} /> Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: GIỚI THIỆU THÔNG TIN KHU PHỐ 3 (/about) */}
      {section === "about" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <h5 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Nội dung trang Giới thiệu Khu phố 3
          </h5>

          <div className="space-y-1.5">
            <label
              htmlFor="about-summary-text"
              className="block text-sm font-medium text-slate-700"
            >
              Đoạn giới thiệu tổng quan Khu phố 3 (Header trang Giới thiệu)
            </label>
            <textarea
              id="about-summary-text"
              rows={3}
              value={about.summaryText}
              onChange={(e) => updateAbout({ summaryText: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="about-stat-val"
              label="Chỉ số nổi bật (VD: 100%)"
              value={about.civilizedStatValue}
              onChange={(e) =>
                updateAbout({ civilizedStatValue: e.target.value })
              }
            />
            <Input
              id="about-stat-label"
              label="Mô tả chỉ số"
              value={about.civilizedStatLabel}
              onChange={(e) =>
                updateAbout({ civilizedStatLabel: e.target.value })
              }
            />
          </div>

          {/* Tọa độ & Trục giao thông chính */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
            <span className="text-xs font-bold text-gov-navy flex items-center gap-1.5 uppercase">
              <MapIcon size={14} /> Khối Tọa độ &amp; Trục giao thông chính
            </span>
            <Input
              id="about-transport-title"
              label="Tiêu đề khối"
              value={about.transportTitle}
              onChange={(e) => updateAbout({ transportTitle: e.target.value })}
            />
            <div className="space-y-1">
              <label
                htmlFor="about-transport-intro"
                className="block text-sm font-medium text-slate-700"
              >
                Mô tả dẫn nhập
              </label>
              <textarea
                id="about-transport-intro"
                rows={2}
                value={about.transportIntro}
                onChange={(e) => updateAbout({ transportIntro: e.target.value })}
                className="w-full px-3 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Danh sách các tuyến đường / điểm mốc:
              </span>
              {about.transportRoutes.map((route, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={route}
                    onChange={(e) => {
                      const nextRoutes = [...about.transportRoutes];
                      nextRoutes[idx] = e.target.value;
                      updateAbout({ transportRoutes: nextRoutes });
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    aria-label={`Xóa tuyến ${idx + 1}`}
                    onClick={() =>
                      updateAbout({
                        transportRoutes: about.transportRoutes.filter(
                          (_, i) => i !== idx
                        ),
                      })
                    }
                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newRouteText}
                  onChange={(e) => setNewRouteText(e.target.value)}
                  placeholder="Thêm tuyến đường hoặc điểm nhấn mới..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Plus size={13} />}
                  disabled={!newRouteText.trim()}
                  onClick={() => {
                    updateAbout({
                      transportRoutes: [
                        ...about.transportRoutes,
                        newRouteText.trim(),
                      ],
                    });
                    setNewRouteText("");
                  }}
                >
                  Thêm dòng
                </Button>
              </div>
            </div>
          </div>

          {/* Điểm nhấn mô hình tự quản */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase">
              <CheckCircle2 size={14} /> Khối Điểm nhấn mô hình tự quản
            </span>
            <Input
              id="about-selfgov-title"
              label="Tiêu đề khối tự quản"
              value={about.selfGovTitle}
              onChange={(e) => updateAbout({ selfGovTitle: e.target.value })}
            />
            <div className="space-y-1">
              <label
                htmlFor="about-selfgov-desc"
                className="block text-sm font-medium text-slate-700"
              >
                Nội dung mô hình tự quản
              </label>
              <textarea
                id="about-selfgov-desc"
                rows={3}
                value={about.selfGovDescription}
                onChange={(e) =>
                  updateAbout({ selfGovDescription: e.target.value })
                }
                className="w-full px-3 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <Input
            id="about-map-caption"
            label="Chú thích nguồn bản đồ trang Giới thiệu"
            value={about.mapCaption}
            onChange={(e) => updateAbout({ mapCaption: e.target.value })}
          />

          <div className="flex justify-end">
            <Button
              type="button"
              variant="emerald"
              leftIcon={<Save size={15} />}
              onClick={() =>
                onNotify?.("Đã lưu thông tin Giới thiệu Khu phố 3.")
              }
            >
              Lưu Giới thiệu KP3
            </Button>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Cán bộ */}
      <Modal
        isOpen={leaderModalOpen}
        onClose={() => setLeaderModalOpen(false)}
        title={
          editingLeader
            ? `Cập nhật thông tin: ${editingLeader.name}`
            : "Thêm Cán bộ mới vào Cơ cấu tổ chức"
        }
        size="xl"
        closeOnOverlayClick={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaderModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="leader-editor-form"
              variant="emerald"
              leftIcon={<Save size={15} />}
            >
              {editingLeader ? "Lưu thay đổi" : "Thêm cán bộ"}
            </Button>
          </>
        }
      >
        <form
          id="leader-editor-form"
          onSubmit={handleSaveLeader}
          noValidate
          className="space-y-4"
        >
          {ldFormError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
            >
              {ldFormError}
            </div>
          )}

          {/* Avatar upload (Chuẩn ảnh thẻ 4x6 - tỷ lệ 2:3) */}
          <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            {ldAvatar ? (
              <img
                src={ldAvatar}
                alt="Ảnh thẻ cán bộ 4x6"
                className="w-20 h-[120px] rounded-xl object-cover object-top border border-slate-200 bg-white shrink-0"
              />
            ) : (
              <div className="w-20 h-[120px] rounded-xl bg-blue-100 text-gov-navy font-black text-xl flex flex-col items-center justify-center shrink-0 border border-blue-200/70">
                <span>{(ldName.trim().split(" ").slice(-1)[0]?.charAt(0) || "C").toUpperCase()}</span>
                <span className="text-[10px] font-semibold text-blue-700 mt-1">Ảnh 4×6</span>
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={leaderAvatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    handleImageUpload(file, "leader-avatar", 600, 900, (url) =>
                      setLdAvatar(url)
                    );
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  leftIcon={<Upload size={13} />}
                  disabled={uploadingKey === "leader-avatar"}
                  onClick={() => leaderAvatarInputRef.current?.click()}
                >
                  {uploadingKey === "leader-avatar"
                    ? "Đang tải..."
                    : "Tải ảnh thẻ 4×6"}
                </Button>
                {ldAvatar && (
                  <Button
                    type="button"
                    size="sm"
                    variant="dangerGhost"
                    leftIcon={<Trash2 size={13} />}
                    onClick={() => setLdAvatar("")}
                  >
                    Xóa ảnh
                  </Button>
                )}
              </div>
              <input
                type="text"
                aria-label="URL ảnh đại diện cán bộ"
                placeholder="Hoặc dán URL ảnh đại diện (https://...)"
                value={ldAvatar.startsWith("data:image/") ? "" : ldAvatar}
                onChange={(e) => setLdAvatar(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id="ld-name"
              label="Họ và tên *"
              required
              value={ldName}
              onChange={(e) => {
                setLdName(e.target.value);
                if (ldFormError) setLdFormError("");
              }}
              placeholder="VD: Nguyễn Văn A"
            />
            <Input
              id="ld-role"
              label="Chức vụ chính *"
              required
              value={ldRole}
              onChange={(e) => {
                setLdRole(e.target.value);
                if (ldFormError) setLdFormError("");
              }}
              placeholder="VD: Trưởng Khu phố / Bí thư Chi bộ"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id="ld-subrole"
              label="Chức danh kiêm nhiệm (nếu có)"
              value={ldSubRole}
              onChange={(e) => setLdSubRole(e.target.value)}
              placeholder="VD: Trưởng Ban Điều hành KP3"
            />
            <div className="space-y-1.5">
              <label
                htmlFor="ld-group"
                className="block text-sm font-medium text-slate-700"
              >
                Nhóm tổ chức
              </label>
              <select
                id="ld-group"
                value={ldGroup}
                onChange={(e) =>
                  setLdGroup(
                    e.target.value as NonNullable<LeadershipMember["group"]>
                  )
                }
                className="w-full h-10 px-3 bg-white text-slate-900 text-sm rounded-lg border border-slate-300"
              >
                {LEADER_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id="ld-scope"
              label="Đơn vị / Phạm vi phụ trách"
              value={ldScope}
              onChange={(e) => setLdScope(e.target.value)}
            />
            <Input
              id="ld-phone"
              label="Số điện thoại công khai"
              value={ldPhone}
              onChange={(e) => setLdPhone(e.target.value)}
              placeholder="09xx..."
            />
          </div>

          <Input
            id="ld-schedule"
            label="Lịch tiếp công dân (tùy chọn)"
            value={ldSchedule}
            onChange={(e) => setLdSchedule(e.target.value)}
            placeholder="VD: Sáng Thứ 2 - Thứ 6 (08:00 - 11:00)"
          />

          <div className="space-y-1.5">
            <label
              htmlFor="ld-desc"
              className="block text-sm font-medium text-slate-700"
            >
              Mô tả nhiệm vụ phụ trách
            </label>
            <textarea
              id="ld-desc"
              rows={3}
              value={ldDesc}
              onChange={(e) => setLdDesc(e.target.value)}
              placeholder="Nhiệm vụ chính tại Khu phố 3..."
              className="w-full px-3.5 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={ldHighlight}
              onChange={(e) => setLdHighlight(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span>Đánh dấu cán bộ chủ chốt (hiển thị nổi bật)</span>
          </label>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteLeaderTarget)}
        onClose={() => setDeleteLeaderTarget(null)}
        onConfirm={executeDeleteLeader}
        title="Xác nhận xóa cán bộ"
        description={`Bạn chắc chắn muốn xóa cán bộ "${deleteLeaderTarget?.name || ""}" khỏi Cơ cấu tổ chức Khu phố 3?`}
        confirmLabel="Xóa cán bộ"
        variant="danger"
      />

      <ConfirmModal
        isOpen={confirmResetAll}
        onClose={() => setConfirmResetAll(false)}
        onConfirm={() => {
          commit(
            DEFAULT_LANDING_CONFIG,
            "Đã khôi phục toàn bộ cấu hình Trang chủ, Hình ảnh, Cán bộ và Giới thiệu KP3 về mặc định."
          );
          setConfirmResetAll(false);
        }}
        title="Khôi phục cấu hình mặc định"
        description="Khôi phục lại cấu hình gốc cho Trang chủ, Hình ảnh, Cán bộ và Thông tin Giới thiệu Khu phố 3?"
        confirmLabel="Khôi phục ngay"
        variant="warning"
      />
    </div>
  );
};
