import React, { useState } from "react";
import {
  Palette,
  Type,
  Layers,
  Component,
  Search,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Download,
  AlertCircle,
  FileCheck2
} from "lucide-react";
import {
  Button,
  StatusBadge,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  EmptyState
} from "./ui";

export default function DesignSystemShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const colorTokens = [
    { name: "Government Navy", hex: "#073B72", role: "Định danh thương hiệu chính quyền số, Header/Sidebar", contrast: "14.2:1 (AAA)" },
    { name: "Government Blue", hex: "#005BAC", role: "Tương tác thứ cấp, liên kết, điều hướng", contrast: "7.8:1 (AAA)" },
    { name: "Civic Emerald", hex: "#059669", role: "Trạng thái hoàn tất, an toàn, lưu thành công", contrast: "4.8:1 (AA)" },
    { name: "Warning Amber", hex: "#D97706", role: "Chờ phê duyệt, cảnh báo sắp đến hạn", contrast: "4.6:1 (AA)" },
    { name: "Danger Red", hex: "#B4232D", role: "Cảnh báo khẩn cấp, vi phạm PCCC, xóa dữ liệu", contrast: "5.4:1 (AA)" },
    { name: "Neutral Slate-900", hex: "#0F172A", role: "Chữ chính, nền Sidebar Cán bộ", contrast: "19.8:1 (AAA)" },
    { name: "Neutral Slate-50", hex: "#F8FAFC", role: "Nền chính toàn bộ ứng dụng (Content background)", contrast: "Nền" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-16 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#073B72] to-[#005BAC] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold backdrop-blur-xs">
            <ShieldCheck className="w-3.5 h-3.5" /> Chuẩn UI/UX GovTech Quốc Gia
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
            Hệ Thống Thiết Kế Giao Diện (Design System) — KP3 An Phú
          </h1>
          <p className="text-xs md:text-sm text-slate-200 max-w-2xl">
            Tài liệu quy chuẩn 7 nguyên tố UI (D1 Primitives), bảng màu đạt chuẩn WCAG AAA, thang typography Inter + JetBrains Mono cho toàn bộ 16 phân hệ quản lý đô thị thông minh.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <Button
            variant="emerald"
            size="sm"
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => setIsModalOpen(true)}
          >
            Mở Thử Hộp Thoại Modal
          </Button>
        </div>
      </div>

      {/* 1. Palette Colors */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Palette className="w-5 h-5 text-[#073B72]" />
          <h2 className="text-lg font-bold text-slate-900">1. Bảng Màu & Độ Tương Phản (Color Tokens & WCAG)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {colorTokens.map((c, idx) => (
            <Card key={idx} className="p-4 flex flex-col justify-between">
              <div>
                <div
                  className="w-full h-16 rounded-lg mb-3 shadow-2xs border border-black/5"
                  style={{ backgroundColor: c.hex }}
                />
                <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                <p className="font-mono text-xs text-slate-500 font-semibold">{c.hex}</p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{c.role}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Tương phản:</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {c.contrast}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 2. Typography Scale */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Type className="w-5 h-5 text-[#073B72]" />
          <h2 className="text-lg font-bold text-slate-900">2. Thang Kiểu Chữ (Typography Scale — Inter & JetBrains Mono)</h2>
        </div>
        <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-50/50">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">H1 Display / Tiêu đề trang (24px / Bold -0.025em)</span>
            <span className="text-xl md:text-2xl font-black text-slate-900">
              Ủy ban Nhân dân Phường An Phú — Khu phố 3 Thông minh
            </span>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">H2 Section (18px / Semibold -0.02em)</span>
            <span className="text-base md:text-lg font-bold text-slate-900">
              Danh Sách Nhân Khẩu & Quản Lý Biến Động Cư Trú
            </span>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-50/50">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Body Regular (13.5px / Regular)</span>
            <span className="text-sm text-slate-700">
              Hệ thống quản lý 11.632 nhân khẩu, tiếp nhận xử lý phản ánh vệ sinh môi trường, an ninh trật tự và PCCC.
            </span>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Code / CCCD (JetBrains Mono 13px)</span>
            <span className="font-mono text-sm font-semibold text-slate-900 tracking-wider">
              CCCD: 079095012345 · TỔ DÂN PHỐ 12 · MÃ HỘ: HK-AP-0488
            </span>
          </div>
        </Card>
      </section>

      {/* 3. Seven Primitives Showcase */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Component className="w-5 h-5 text-[#073B72]" />
          <h2 className="text-lg font-bold text-slate-900">3. Bộ 7 Nguyên Tố Giao Diện Chuẩn (D1 Primitives)</h2>
        </div>

        {/* Primitive 1: Buttons */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Nguyên tố 1: Nút bấm (Button — 4 dạng chuẩn)</CardTitle>
            <CardDescription>Độ cao tiêu chuẩn 36px, tối thiểu 40px trên màn cảm ứng, phản hồi nhạy 150ms.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Primary (Navy)
            </Button>
            <Button variant="emerald" leftIcon={<Check className="w-4 h-4" />}>
              Emerald (Xác nhận / Lưu)
            </Button>
            <Button variant="secondary">
              Secondary (Slate-100)
            </Button>
            <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Outline (Viền mảnh)
            </Button>
            <Button variant="destructive" leftIcon={<Trash2 className="w-4 h-4" />}>
              Destructive (Xóa / Nguy hiểm)
            </Button>
            <Button variant="primary" isLoading>
              Đang đồng bộ
            </Button>
            <Button variant="primary" disabled>
              Vô hiệu hóa
            </Button>
          </div>
        </Card>

        {/* Primitive 2: Status Badges */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Nguyên tố 2: Huy hiệu Trạng thái (Status Badge — D2 Mapping)</CardTitle>
            <CardDescription>Bảng ánh xạ 4 trạng thái duy nhất, đồng nhất trên toàn bộ bảng và thẻ.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <StatusBadge status="pending" label="Chờ tiếp nhận" />
            <StatusBadge status="in_progress" label="Đang điều phối xử lý" />
            <StatusBadge status="completed" label="Đã giải quyết xong" />
            <StatusBadge status="danger" label="Cảnh báo PCCC / Quá hạn" />
            <StatusBadge status="info" label="Tạm trú 6 tháng" />
          </div>
        </Card>

        {/* Primitive 3: Inputs */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Nguyên tố 3: Ô nhập dữ liệu (Input & Search)</CardTitle>
            <CardDescription>Nền surface trắng, viền mảnh slate-300, focus ring emerald bảo đảm chuẩn tương phản.</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <Input
              label="Tìm kiếm nhân khẩu"
              placeholder="Nhập họ tên, số CCCD hoặc địa chỉ..."
              leftIcon={<Search className="w-4 h-4" />}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input
              label="Số điện thoại liên hệ"
              placeholder="09xx xxx xxx"
              helperText="Được mã hóa bảo mật theo quy định cư trú"
            />
            <Input
              label="Mã số định danh (Báo lỗi demo)"
              value="ABC-INVALID"
              error="Định dạng mã định danh phải bắt đầu bằng HK- hoặc NK-"
            />
          </div>
        </Card>

        {/* Primitive 4 & 5: Table and Cards */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Nguyên tố 4 & 5: Thẻ (Card) & Bảng Dữ Liệu (Table Row)</CardTitle>
            <CardDescription>Hàng bảng cao chuẩn 48px, hover nền mượt mà, phân cấp thông tin rõ ràng.</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã Hồ Sơ</TableHead>
                <TableHead>Họ và Tên</TableHead>
                <TableHead>Tổ Dân Phố</TableHead>
                <TableHead>Tình Trạng</TableHead>
                <TableHead className="text-right">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono font-semibold text-slate-900">#NK-01284</TableCell>
                <TableCell className="font-semibold text-slate-900">Nguyễn Văn Bình</TableCell>
                <TableCell>Tổ 12, Hẻm 42 Lương Định Của</TableCell>
                <TableCell>
                  <StatusBadge status="completed" label="Thường trú" size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">Chi tiết</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-semibold text-slate-900">#NK-01285</TableCell>
                <TableCell className="font-semibold text-slate-900">Trần Thị Thu Hà</TableCell>
                <TableCell>Chung cư An Phú Plaza, Căn 12.04</TableCell>
                <TableCell>
                  <StatusBadge status="pending" label="Chờ duyệt tạm trú" size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="emerald" size="sm">Phê duyệt</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-semibold text-slate-900">#PA-00912</TableCell>
                <TableCell className="font-semibold text-slate-900">Nhà trọ 48/5 (18 phòng)</TableCell>
                <TableCell>Tổ 14, Đường số 7</TableCell>
                <TableCell>
                  <StatusBadge status="danger" label="Chưa nghiệm thu PCCC" size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="destructive" size="sm">Nhắc nhở</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        {/* Primitive 6: Modal Demo */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Xác nhận phê duyệt hồ sơ cư trú"
          description="Hồ sơ nhân khẩu Nguyễn Văn Bình sẽ được cập nhật vào cơ sở dữ liệu chính thức của KP3 An Phú."
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button variant="emerald" onClick={() => setIsModalOpen(false)} leftIcon={<Check className="w-4 h-4" />}>
                Xác nhận lưu hồ sơ
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-sm text-slate-700">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Dữ liệu đã được kiểm chứng đối chiếu với CSDL Dân cư Quốc gia VNeID.</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 block">Số định danh CCCD:</span>
                <span className="font-mono font-bold text-slate-900">079095012345</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Ngày sinh:</span>
                <span className="font-semibold text-slate-900">14/08/1988</span>
              </div>
            </div>
          </div>
        </Modal>

        {/* Primitive 7: Empty State */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Nguyên tố 7: Trạng thái Rỗng (Empty State)</CardTitle>
            <CardDescription>Bảo đảm người dùng luôn có định hướng hành động tiếp theo khi không có dữ liệu.</CardDescription>
          </CardHeader>
          <EmptyState
            title="Không tìm thấy phản ánh nào trong mục này"
            description="Khu phố 3 hiện không có phản ánh tồn đọng nào về an ninh trật tự hay vệ sinh môi trường."
            actionText="Tạo phản ánh mới"
            onAction={() => alert("Đã mở form phản ánh hiện trường!")}
          />
        </Card>
      </section>
    </div>
  );
}

