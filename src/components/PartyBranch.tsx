import React, { useState } from "react";
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Plus, 
  X, 
  Search, 
  Trash2, 
  Edit2,
  Award, 
  Flame, 
  Calendar, 
  Heart, 
  MapPin, 
  PlusCircle, 
  UserCheck, 
  CheckCircle,
  FolderPlus,
  HelpCircle,
  FileSpreadsheet,
  Pencil,
  AlertTriangle,
  FileText,
  UploadCloud,
  Download,
  Eye,
  Paperclip,
  FileCheck,
  FileUp,
  File,
  Image as ImageIcon,
  ExternalLink,
  Printer,
  Sparkles,
  CheckSquare,
  Square,
  Layers,
  BadgeCheck,
  CheckCircle2,
  SlidersHorizontal,
  BookmarkPlus,
  Camera,
  LayoutGrid,
  List,
  Phone,
  Home,
  CreditCard,
  Settings
} from "lucide-react";
import { Resident, PartyMember, Association, AssociationMember } from "../types";
import Pagination from "./Pagination";

export interface TargetGroupConfig {
  id: string;
  name: string;
  section: "Đảng viên" | "Chính quyền" | "Đoàn thể" | "Chính sách" | "Nhóm khác";
  defaultRole: string;
  roles: string[];
  description: string;
  badgeBg: string;
  badgeText: string;
  category: "Chính trị - Xã hội" | "Chính quyền cơ sở" | "An ninh - Quốc phòng" | "Đoàn thể nhân dân" | "Hội quần chúng" | "Chính sách xã hội" | "Phong trào tự quản";
}

export const TARGET_GROUPS: TargetGroupConfig[] = [
  // 1. Nhóm Đảng
  {
    id: "ASC_DANG",
    name: "Chi bộ Đảng (Đảng viên)",
    section: "Đảng viên",
    defaultRole: "Đảng viên",
    roles: ["Đảng viên", "Bí thư Chi bộ", "Phó Bí thư", "Chi ủy viên", "Đảng viên dự bị"],
    description: "Tổ chức hạt nhân lãnh đạo chính trị tại cơ sở, gương mẫu đi đầu trong mọi phong trào.",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800",
    category: "Chính trị - Xã hội"
  },
  {
    id: "ASC_CTDANG",
    name: "Cảm tình Đảng",
    section: "Đảng viên",
    defaultRole: "Đối tượng bồi dưỡng Đảng",
    roles: ["Đối tượng bồi dưỡng Đảng", "Quần chúng ưu tú", "Học viên lớp nhận thức Đảng"],
    description: "Lực lượng quần chúng ưu tú, hạt giống bồi dưỡng kết nạp Đảng tại khu phố.",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-800",
    category: "Chính trị - Xã hội"
  },
  {
    id: "ASC_DANG213",
    name: "Đảng viên 213",
    section: "Đảng viên",
    defaultRole: "Đảng viên sinh hoạt nơi cư trú",
    roles: ["Đảng viên sinh hoạt nơi cư trú", "Tổ trưởng đảng viên 213", "Tổ phó đảng viên 213"],
    description: "Đảng viên đang công tác tham gia sinh hoạt định kỳ tại nơi cư trú theo Quy định 213.",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    category: "Chính trị - Xã hội"
  },

  // 2. Nhóm Chính quyền
  {
    id: "ASC_BDH",
    name: "Ban điều hành khu phố",
    section: "Chính quyền",
    defaultRole: "Thành viên Ban điều hành",
    roles: ["Trưởng Ban điều hành", "Phó Ban điều hành", "Thành viên Ban điều hành", "Thư ký Ban điều hành"],
    description: "Bộ máy tự quản trực tiếp điều hành mọi hoạt động hành chính, kinh tế - xã hội tại khu phố.",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    category: "Chính quyền cơ sở"
  },
  {
    id: "ASC_TOTRUONG",
    name: "Tổ trưởng dân phố",
    section: "Chính quyền",
    defaultRole: "Tổ trưởng dân phố",
    roles: ["Tổ trưởng dân phố", "Tổ phó dân phố", "Cán sự phụ trách cụm liên gia"],
    description: "Cầu nối trực tiếp giữa Ban điều hành khu phố và từng hộ gia đình trong tổ dân phố.",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
    category: "Chính quyền cơ sở"
  },
  {
    id: "ASC_KHUDOI",
    name: "Khu Đội",
    section: "Chính quyền",
    defaultRole: "Chiến sĩ dân quân",
    roles: ["Chỉ huy trưởng DQTV", "Chỉ huy phó DQTV", "Chiến sĩ dân quân cơ động", "Chiến sĩ Y tế dân quân", "Chiến sĩ dân quân"],
    description: "Lực lượng quân sự địa phương, sẵn sàng chiến đấu, tuần tra và phòng chống thiên tai.",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    category: "An ninh - Quốc phòng"
  },

  // 3. Nhóm Đoàn thể
  {
    id: "ASC_MT",
    name: "Ban Công tác Mặt trận",
    section: "Đoàn thể",
    defaultRole: "Ủy viên Ban CTMT",
    roles: ["Trưởng Ban CTMT", "Phó Ban CTMT", "Ủy viên Ban CTMT", "Đại biểu phối hợp"],
    description: "Tập hợp, phát huy khối đại đoàn kết toàn dân tộc, giám sát và phản biện xã hội.",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_PN",
    name: "Chi hội Phụ nữ",
    section: "Đoàn thể",
    defaultRole: "Hội viên Phụ nữ",
    roles: ["Chi hội trưởng", "Chi hội phó", "Ủy viên BCH", "Hội viên nòng cốt", "Hội viên Phụ nữ"],
    description: "Vận động phụ nữ xây dựng gia đình 5 không 3 sạch, bình đẳng giới và phát triển kinh tế.",
    badgeBg: "bg-pink-100",
    badgeText: "text-pink-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_TN",
    name: "Đoàn Thanh niên",
    section: "Đoàn thể",
    defaultRole: "Đoàn viên",
    roles: ["Bí thư Chi đoàn", "Phó Bí thư Chi đoàn", "Ủy viên BCH", "Đoàn viên tích cực", "Đoàn viên"],
    description: "Lực lượng thanh niên xung kích đi đầu trong chuyển đổi số, tình nguyện và văn hóa.",
    badgeBg: "bg-cyan-100",
    badgeText: "text-cyan-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_CCB",
    name: "Chi hội Cựu chiến binh",
    section: "Đoàn thể",
    defaultRole: "Hội viên Cựu chiến binh",
    roles: ["Chi hội trưởng", "Chi hội phó", "Ủy viên BCH", "Hội viên gương mẫu", "Hội viên Cựu chiến binh"],
    description: "Gương mẫu gìn giữ truyền thống anh bộ đội Cụ Hồ, giáo dục lòng yêu nước cho thế hệ trẻ.",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-900",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_NCT",
    name: "Chi Hội Người cao tuổi",
    section: "Đoàn thể",
    defaultRole: "Hội viên Người cao tuổi",
    roles: ["Chi hội trưởng", "Chi hội phó", "Ủy viên BCH", "Hội viên tiêu biểu", "Hội viên Người cao tuổi"],
    description: "Phát huy tinh thần Tuổi cao - Gương sáng, sống vui sống khỏe sống có ích cho cộng đồng.",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_CCA",
    name: "Hội Cựu Công An",
    section: "Đoàn thể",
    defaultRole: "Hội viên Cựu Công an",
    roles: ["Chi hội trưởng Cựu CAND", "Chi hội phó", "Cố vấn an ninh", "Hội viên Cựu Công an"],
    description: "Tập hợp cán bộ Công an hưu trí, cố vấn an ninh trật tự và tuyên truyền pháp luật.",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-800",
    category: "Đoàn thể nhân dân"
  },
  {
    id: "ASC_CTD",
    name: "Chi hội Chữ Thập Đỏ",
    section: "Đoàn thể",
    defaultRole: "Tình nguyện viên Chữ thập đỏ",
    roles: ["Chi hội trưởng", "Chi hội phó", "Tình nguyện viên CTĐ", "Hội viên Chữ thập đỏ"],
    description: "Tổ chức hoạt động nhân đạo, cứu trợ khẩn cấp, chăm sóc sức khỏe cộng đồng.",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    category: "Hội quần chúng"
  },

  // 4. Nhóm Chính sách
  {
    id: "ASC_CS_NCC",
    name: "Người có công",
    section: "Chính sách",
    defaultRole: "Người có công với cách mạng",
    roles: ["Thương binh", "Bệnh binh", "Người có công với cách mạng", "Người hoạt động kháng chiến"],
    description: "Nhóm cư dân có cống hiến cho sự nghiệp cách mạng được nhà nước và khu phố ưu đãi chăm lo.",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_GDCS",
    name: "Gia đình chính sách",
    section: "Chính sách",
    defaultRole: "Gia đình chính sách",
    roles: ["Thân nhân Liệt sĩ", "Gia đình thương binh - liệt sĩ", "Đại diện gia đình chính sách"],
    description: "Hộ gia đình có thân nhân liệt sĩ, thương bệnh binh được hỗ trợ và tri ân thường xuyên.",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-800",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_MVNAH",
    name: "Mẹ Việt Nam Anh hùng",
    section: "Chính sách",
    defaultRole: "Mẹ Việt Nam Anh hùng",
    roles: ["Mẹ Việt Nam Anh hùng", "Người trực tiếp phụng dưỡng Mẹ VNAH"],
    description: "Mẹ Việt Nam Anh hùng và thân nhân phụng dưỡng được toàn khu phố chăm lo chu đáo.",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-900",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_NGHEO",
    name: "Hộ nghèo",
    section: "Chính sách",
    defaultRole: "Thành viên hộ nghèo",
    roles: ["Chủ hộ nghèo", "Chủ hộ cận nghèo", "Thành viên hộ nghèo", "Thành viên hộ cận nghèo"],
    description: "Nhóm hộ gia đình cần hỗ trợ an sinh xã hội, bảo hiểm y tế và phương kế thoát nghèo bền vững.",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-900",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_CANNGHEO",
    name: "Hộ cận nghèo",
    section: "Chính sách",
    defaultRole: "Thành viên hộ cận nghèo",
    roles: ["Chủ hộ cận nghèo", "Thành viên hộ cận nghèo"],
    description: "Hộ gia đình có thu nhập cận chuẩn nghèo được hưởng các chính sách trợ cấp xã hội.",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-900",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_NKT",
    name: "Người khuyết tật",
    section: "Chính sách",
    defaultRole: "Người khuyết tật",
    roles: ["Người khuyết tật đặc biệt nặng", "Người khuyết tật nặng", "Đối tượng bảo trợ xã hội"],
    description: "Nhóm cư dân yếu thế cần sự chăm sóc đặc biệt về y tế, bảo trợ và tiếp cận cộng đồng.",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-800",
    category: "Chính sách xã hội"
  },
  {
    id: "ASC_CS_TE",
    name: "Trẻ em",
    section: "Chính sách",
    defaultRole: "Thiếu niên nhi đồng",
    roles: ["Trẻ em có hoàn cảnh đặc biệt", "Trẻ em mồ côi", "Thiếu nhi nòng cốt", "Thiếu niên nhi đồng"],
    description: "Nhóm trẻ em dưới 16 tuổi cần được bảo vệ quyền lợi, hỗ trợ học tập và tạo sân chơi lành mạnh.",
    badgeBg: "bg-lime-100",
    badgeText: "text-lime-800",
    category: "Chính sách xã hội"
  },

  // 5. Nhóm khác / Phong trào tự quản
  {
    id: "ASC_PCCC",
    name: "Tổ liên gia PCCC",
    section: "Nhóm khác",
    defaultRole: "Thành viên Tổ liên gia PCCC",
    roles: ["Tổ trưởng Tổ liên gia PCCC", "Tổ phó Tổ liên gia PCCC", "Thành viên Tổ liên gia PCCC", "Đội viên PCCC xung kích"],
    description: "Mô hình an toàn PCCC liên gia đình, chuông báo động liên thông và phương án chữa cháy tại chỗ.",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    category: "Phong trào tự quản"
  },
  {
    id: "ASC_ANTT",
    name: "TỔ ANTT cơ sở",
    section: "Nhóm khác",
    defaultRole: "Đội viên ANTT cơ sở",
    roles: ["Tổ trưởng ANTT cơ sở", "Tổ phó ANTT cơ sở", "Đội viên ANTT cơ sở"],
    description: "Lực lượng bảo vệ an ninh trật tự ở cơ sở, phối hợp cùng công an khu vực tuần tra khép kín.",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    category: "An ninh - Quốc phòng"
  },
  {
    id: "ASC_HG",
    name: "Tổ hoà giải",
    section: "Nhóm khác",
    defaultRole: "Hòa giải viên cơ sở",
    roles: ["Tổ trưởng Tổ hòa giải", "Tổ phó Tổ hòa giải", "Hòa giải viên cơ sở"],
    description: "Hòa giải kịp thời các mâu thuẫn tranh chấp dân sự nhỏ, giữ vững tình làng nghĩa xóm.",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    category: "Phong trào tự quản"
  }
];

interface PartyBranchProps {
  partyMembers: PartyMember[];
  residents?: Resident[];
}

export default function PartyBranch({ partyMembers, residents = [] }: PartyBranchProps) {
  // Pre-populated default associations (Chi hội) matching the user requirements with multi-role residents
  const [associations, setAssociations] = useState<Association[]>([
    {
      id: "ASC_BDH",
      name: "Ban điều hành khu phố",
      category: "Chính quyền cơ sở",
      description: "Tổ chức tự quản trực tiếp điều hành mọi hoạt động dân cư và đời sống cơ sở tại Khu phố 3.",
      leaderName: "Nguyễn Trung Huy",
      leaderCccd: "079080009988",
      members: [
        {
          id: "M_HUY_BDH",
          fullName: "Nguyễn Trung Huy",
          role: "Trưởng Ban điều hành",
          cccd: "079080009988",
          phone: "0909123888",
          birthDate: "12/03/1980",
          joinDate: "15/01/2020",
          decisionNumber: "QĐ-01/UBND-AP",
          decisionDate: "10/01/2020",
          decisionFile: {
            name: "QĐ_chuan_y_Truong_Ban_dieu_hanh_KP3.pdf",
            type: "pdf",
            size: "310 KB",
            url: "https://example.com/decision_bdh_huy.pdf"
          }
        },
        {
          id: "M_SON_BDH",
          fullName: "Lê Văn Sơn",
          role: "Phó Ban điều hành",
          cccd: "079070003112",
          phone: "0944112233",
          birthDate: "08/12/1970",
          joinDate: "15/01/2020",
          decisionNumber: "QĐ-02/UBND-AP"
        },
        {
          id: "M_HUNG_BDH",
          fullName: "Nguyễn Văn Hùng",
          role: "Cố vấn Ban điều hành",
          cccd: "079068001234",
          phone: "0903829112",
          birthDate: "15/04/1968",
          joinDate: "15/01/2020",
          decisionNumber: "QĐ-03/UBND-AP"
        }
      ]
    },
    {
      id: "ASC_DANG",
      name: "Chi bộ Đảng (Đảng viên)",
      category: "Chính trị - Xã hội",
      description: "Tổ chức hạt nhân lãnh đạo chính trị tại cơ sở, đề ra chủ trương chỉ đạo các mặt đời sống xã hội.",
      leaderName: "Nguyễn Văn Hùng",
      leaderCccd: "079068001234",
      members: [
        { 
          id: "M101", 
          fullName: "Nguyễn Văn Hùng", 
          role: "Bí thư Chi bộ", 
          cccd: "079068001234", 
          phone: "0903829112", 
          birthDate: "15/04/1968",
          joinDate: "19/05/1992",
          decisionNumber: "QĐ-12/ĐU-AP",
          decisionFile: {
            name: "Quyet_dinh_cong_nhan_Bi_thu_Chi_bo.pdf",
            type: "pdf",
            size: "245 KB",
            url: "https://example.com/decision_101.pdf"
          }
        },
        { 
          id: "M102", 
          fullName: "Lê Văn Sơn", 
          role: "Phó Bí thư", 
          cccd: "079070003112", 
          phone: "0944112233", 
          birthDate: "08/12/1970",
          joinDate: "03/02/1996",
          decisionNumber: "QĐ-08/ĐU-AP",
          decisionFile: {
            name: "Quyet_dinh_chuan_y_Pho_Bi_thu.jpg",
            type: "image",
            size: "380 KB",
            url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=700"
          }
        },
        { 
          id: "M_HUY_DANG", 
          fullName: "Nguyễn Trung Huy", 
          role: "Đảng viên", 
          cccd: "079080009988", 
          phone: "0909123888", 
          birthDate: "12/03/1980",
          joinDate: "03/02/2012",
          decisionNumber: "QĐ-22/ĐU-AP",
          decisionFile: {
            name: "Quyet_dinh_chuyen_dang_chinh_thuc_Huy.pdf",
            type: "pdf",
            size: "270 KB",
            url: "https://example.com/decision_dang_huy.pdf"
          }
        },
        { 
          id: "M103", 
          fullName: "Nguyễn Thị Ngọc", 
          role: "Chi ủy viên", 
          cccd: "079073005511", 
          phone: "0908123456", 
          birthDate: "11/03/1973",
          joinDate: "02/09/2000",
          decisionNumber: "QĐ-19/ĐU-AP"
        },
        { 
          id: "M104", 
          fullName: "Trần Văn Thanh", 
          role: "Đảng viên", 
          cccd: "079081005555", 
          phone: "0919887766", 
          birthDate: "25/07/1981",
          joinDate: "07/11/2010",
          decisionNumber: "QĐ-45/ĐU-AP"
        }
      ]
    },
    {
      id: "ASC_PCCC",
      name: "Tổ liên gia PCCC",
      category: "Phong trào tự quản",
      description: "Mô hình Tổ liên gia an toàn phòng cháy chữa cháy, kiểm tra trang thiết bị bình CO2 và chuông báo cháy.",
      leaderName: "Nguyễn Trung Huy",
      leaderCccd: "079080009988",
      members: [
        {
          id: "M_HUY_PCCC",
          fullName: "Nguyễn Trung Huy",
          role: "Tổ trưởng Tổ liên gia PCCC",
          cccd: "079080009988",
          phone: "0909123888",
          birthDate: "12/03/1980",
          joinDate: "10/05/2023",
          decisionNumber: "QĐ-08/UBND-PCCC",
          decisionFile: {
            name: "Cong_nhan_To_truong_To_lien_gia_PCCC.pdf",
            type: "pdf",
            size: "260 KB",
            url: "https://example.com/decision_pccc_huy.pdf"
          }
        },
        {
          id: "M_TUAN_PCCC",
          fullName: "Phạm Minh Tuấn",
          role: "Tổ phó Tổ liên gia PCCC",
          cccd: "079101007788",
          phone: "0356789123",
          birthDate: "30/01/2001",
          joinDate: "10/05/2023",
          decisionNumber: "QĐ-09/UBND-PCCC"
        },
        {
          id: "M_NAM_PCCC",
          fullName: "Nguyễn Hoàng Nam",
          role: "Đội viên PCCC xung kích",
          cccd: "079095009876",
          phone: "0932456789",
          birthDate: "05/09/1995",
          joinDate: "10/05/2023",
          decisionNumber: "QĐ-10/UBND-PCCC"
        }
      ]
    },
    {
      id: "ASC_ANTT",
      name: "TỔ ANTT cơ sở",
      category: "An ninh - Quốc phòng",
      description: "Lực lượng nòng cốt bảo vệ an ninh trật tự, tuần tra, giữ gìn bình yên các tuyến hẻm nội khu theo Luật mới.",
      leaderName: "Phạm Minh Tuấn",
      leaderCccd: "079101007788",
      members: [
        { 
          id: "M201", 
          fullName: "Phạm Minh Tuấn", 
          role: "Tổ trưởng ANTT cơ sở", 
          cccd: "079101007788", 
          phone: "0356789123", 
          birthDate: "30/01/2001",
          joinDate: "01/07/2024",
          decisionNumber: "QĐ-05/UBND-KP3",
          decisionFile: {
            name: "Quyet_dinh_To_truong_ANTT_KP3.pdf",
            type: "pdf",
            size: "315 KB",
            url: "https://example.com/decision_ancs_tuan.pdf"
          }
        },
        { 
          id: "M_HUY_ANTT", 
          fullName: "Nguyễn Trung Huy", 
          role: "Đội viên ANTT cơ sở", 
          cccd: "079080009988", 
          phone: "0909123888", 
          birthDate: "12/03/1980",
          joinDate: "01/07/2024",
          decisionNumber: "QĐ-06/UBND-KP3"
        },
        { 
          id: "M202", 
          fullName: "Nguyễn Hoàng Nam", 
          role: "Đội viên ANTT cơ sở", 
          cccd: "079095009876", 
          phone: "0932456789", 
          birthDate: "05/09/1995",
          joinDate: "01/07/2024",
          decisionNumber: "QĐ-07/UBND-KP3"
        },
        { 
          id: "M203", 
          fullName: "Lê Văn Sơn", 
          role: "Cố vấn nghiệp vụ", 
          cccd: "079070003112", 
          phone: "0944112233", 
          birthDate: "08/12/1970",
          joinDate: "01/07/2024",
          decisionNumber: "QĐ-08/UBND-KP3"
        }
      ]
    },
    {
      id: "ASC_HG",
      name: "Tổ hoà giải",
      category: "Phong trào tự quản",
      description: "Tổ chức hòa giải mâu thuẫn tranh chấp dân sự, đất đai, tiếng ồn trong nội bộ nhân dân khu phố.",
      leaderName: "Nguyễn Trung Huy",
      leaderCccd: "079080009988",
      members: [
        {
          id: "M_HUY_HG",
          fullName: "Nguyễn Trung Huy",
          role: "Tổ trưởng Tổ hòa giải",
          cccd: "079080009988",
          phone: "0909123888",
          birthDate: "12/03/1980",
          joinDate: "12/03/2022",
          decisionNumber: "QĐ-12/UBND-HG"
        },
        {
          id: "M_HUNG_HG",
          fullName: "Nguyễn Văn Hùng",
          role: "Hòa giải viên cơ sở",
          cccd: "079068001234",
          phone: "0903829112",
          birthDate: "15/04/1968",
          joinDate: "12/03/2022"
        },
        {
          id: "M_MAI_HG",
          fullName: "Lê Thị Mai",
          role: "Hòa giải viên cơ sở",
          cccd: "079075003421",
          phone: "0987654321",
          birthDate: "10/08/1975",
          joinDate: "12/03/2022"
        }
      ]
    },
    {
      id: "ASC_TOTRUONG",
      name: "Tổ trưởng dân phố",
      category: "Chính quyền cơ sở",
      description: "Ban cán sự gồm các tổ trưởng, tổ phó các tổ dân phố 1, 2, 3, 4 trên địa bàn Khu phố 3.",
      leaderName: "Lê Văn Sơn",
      leaderCccd: "079070003112",
      members: [
        {
          id: "M_SON_TT",
          fullName: "Lê Văn Sơn",
          role: "Tổ trưởng dân phố Tổ 1",
          cccd: "079070003112",
          phone: "0944112233",
          birthDate: "08/12/1970",
          joinDate: "01/01/2021",
          decisionNumber: "QĐ-04/UBND-AP"
        },
        {
          id: "M_LAN_TT",
          fullName: "Trần Thị Lan",
          role: "Tổ trưởng dân phố Tổ 2",
          cccd: "079071004567",
          phone: "0918345678",
          birthDate: "22/11/1971",
          joinDate: "01/01/2021",
          decisionNumber: "QĐ-05/UBND-AP"
        }
      ]
    },
    {
      id: "ASC_KHUDOI",
      name: "Khu Đội",
      category: "An ninh - Quốc phòng",
      description: "Lực lượng dân quân tự vệ thực hiện nhiệm vụ sẵn sàng chiến đấu, khắc phục thiên tai, cứu nạn.",
      leaderName: "Lê Văn Sơn",
      leaderCccd: "079070003112",
      members: [
        { 
          id: "M301", 
          fullName: "Lê Văn Sơn", 
          role: "Chỉ huy trưởng DQTV", 
          cccd: "079070003112", 
          phone: "0944112233", 
          birthDate: "08/12/1970",
          joinDate: "10/01/2015",
          decisionNumber: "QĐ-03/BCHQS-AP",
          decisionFile: {
            name: "Quyet_dinh_Chi_huy_truong_DQTV.pdf",
            type: "pdf",
            size: "260 KB",
            url: "https://example.com/decision_dqtv_son.pdf"
          }
        },
        { 
          id: "M302", 
          fullName: "Nguyễn Hoàng Nam", 
          role: "Chiến sĩ dân quân", 
          cccd: "079095009876", 
          phone: "0932456789", 
          birthDate: "05/09/1995",
          joinDate: "20/03/2022",
          decisionNumber: "QĐ-14/BCHQS-AP"
        },
        { 
          id: "M303", 
          fullName: "Vũ Hoàng My", 
          role: "Chiến sĩ Y tế dân quân", 
          cccd: "079098002345", 
          phone: "0898765432", 
          birthDate: "14/02/1998",
          joinDate: "15/08/2022",
          decisionNumber: "QĐ-22/BCHQS-AP"
        }
      ]
    },
    {
      id: "ASC_MT",
      name: "Ban Công tác Mặt trận",
      category: "Đoàn thể nhân dân",
      description: "Tập hợp khối đại đoàn kết, phối hợp với các đoàn thể chăm lo an sinh xã hội cho khu phố.",
      leaderName: "Nguyễn Văn Hùng",
      leaderCccd: "079068001234",
      members: [
        {
          id: "M_HUNG_MT",
          fullName: "Nguyễn Văn Hùng",
          role: "Trưởng Ban CTMT",
          cccd: "079068001234",
          phone: "0903829112",
          birthDate: "15/04/1968",
          joinDate: "05/05/2019",
          decisionNumber: "QĐ-06/UBMT-AP"
        },
        {
          id: "M_MAI_MT",
          fullName: "Lê Thị Mai",
          role: "Phó Ban CTMT",
          cccd: "079075003421",
          phone: "0987654321",
          birthDate: "10/08/1975",
          joinDate: "05/05/2019"
        },
        {
          id: "M_NGOC_MT",
          fullName: "Nguyễn Thị Ngọc",
          role: "Ủy viên Ban CTMT",
          cccd: "079073005511",
          phone: "0908123456",
          birthDate: "11/03/1973",
          joinDate: "05/05/2019"
        }
      ]
    },
    {
      id: "ASC_TN",
      name: "Đoàn Thanh niên",
      category: "Đoàn thể nhân dân",
      description: "Chi đoàn Thanh niên Cộng sản Hồ Chí Minh Khu phố 3, dẫn đầu các hoạt động văn hóa, chuyển đổi số.",
      leaderName: "Vũ Hoàng My",
      leaderCccd: "079098002345",
      members: [
        { 
          id: "M401", 
          fullName: "Vũ Hoàng My", 
          role: "Bí thư Chi đoàn", 
          cccd: "079098002345", 
          phone: "0898765432", 
          birthDate: "14/02/1998",
          joinDate: "26/03/2016",
          decisionNumber: "QĐ-15/ĐTN-AP",
          decisionFile: {
            name: "Nghi_quyet_chuan_y_Bi_thu_Doan.jpg",
            type: "image",
            size: "512 KB",
            url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=700"
          }
        },
        { 
          id: "M402", 
          fullName: "Phạm Minh Tuấn", 
          role: "Phó Bí thư Chi đoàn", 
          cccd: "079101007788", 
          phone: "0356789123", 
          birthDate: "30/01/2001",
          joinDate: "26/03/2019",
          decisionNumber: "QĐ-21/ĐTN-AP"
        },
        { 
          id: "M403", 
          fullName: "Nguyễn Hoàng Nam", 
          role: "Đoàn viên tích cực", 
          cccd: "079095009876", 
          phone: "0932456789", 
          birthDate: "05/09/1995",
          joinDate: "19/05/2015",
          decisionNumber: "QĐ-09/ĐTN-AP"
        }
      ]
    },
    {
      id: "ASC_CCB",
      name: "Chi hội Cựu chiến binh",
      category: "Đoàn thể nhân dân",
      description: "Hội cựu chiến binh gương mẫu bảo vệ Đảng, chính quyền, giáo dục truyền thống cách mạng cho thế hệ trẻ.",
      leaderName: "Nguyễn Văn Hùng",
      leaderCccd: "079068001234",
      members: [
        { 
          id: "M501", 
          fullName: "Nguyễn Văn Hùng", 
          role: "Chi hội trưởng", 
          cccd: "079068001234", 
          phone: "0903829112", 
          birthDate: "15/04/1968",
          joinDate: "06/12/2005",
          decisionNumber: "QĐ-02/CCB-AP",
          decisionFile: {
            name: "Quyet_dinh_Chi_hoi_truong_CCB.pdf",
            type: "pdf",
            size: "195 KB",
            url: "https://example.com/decision_ccb_hung.pdf"
          }
        },
        { 
          id: "M502", 
          fullName: "Lê Văn Sơn", 
          role: "Chi hội phó", 
          cccd: "079070003112", 
          phone: "0944112233", 
          birthDate: "08/12/1970",
          joinDate: "06/12/2010",
          decisionNumber: "QĐ-05/CCB-AP"
        }
      ]
    },
    {
      id: "ASC_PN",
      name: "Chi hội Phụ nữ",
      category: "Đoàn thể nhân dân",
      description: "Vận động phụ nữ tham gia phát triển kinh tế xã hội, bảo vệ quyền lợi hợp pháp và hạnh phúc gia đình.",
      leaderName: "Lê Thị Mai",
      leaderCccd: "079075003421",
      members: [
        { 
          id: "M601", 
          fullName: "Lê Thị Mai", 
          role: "Chi hội trưởng", 
          cccd: "079075003421", 
          phone: "0987654321", 
          birthDate: "10/08/1975",
          joinDate: "20/10/2008",
          decisionNumber: "QĐ-04/HPN-KP3",
          decisionFile: {
            name: "Quyet_dinh_cong_nhan_Chi_hoi_truong_PN.pdf",
            type: "pdf",
            size: "185 KB",
            url: "https://example.com/decision_hpn_mai.pdf"
          }
        },
        { 
          id: "M602", 
          fullName: "Trần Thị Lan", 
          role: "Chi hội phó", 
          cccd: "079071004567", 
          phone: "0918345678", 
          birthDate: "22/11/1971",
          joinDate: "20/10/2010",
          decisionNumber: "QĐ-09/HPN-KP3"
        },
        { 
          id: "M603", 
          fullName: "Nguyễn Thị Ngọc", 
          role: "Ủy viên ban chấp hành", 
          cccd: "079073005511", 
          phone: "0908123456", 
          birthDate: "11/03/1973",
          joinDate: "08/03/2012",
          decisionNumber: "QĐ-11/HPN-KP3"
        },
        { 
          id: "M604", 
          fullName: "Vũ Hoàng My", 
          role: "Hội viên tích cực", 
          cccd: "079098002345", 
          phone: "0898765432", 
          birthDate: "14/02/1998",
          joinDate: "20/10/2022",
          decisionNumber: "QĐ-33/HPN-KP3"
        }
      ]
    },
    {
      id: "ASC_NCT",
      name: "Chi Hội Người cao tuổi",
      category: "Đoàn thể nhân dân",
      description: "Hội người cao tuổi sống vui, sống khỏe, nêu gương sáng trong gia đình và khu dân cư.",
      leaderName: "Nguyễn Văn Hùng",
      leaderCccd: "079068001234",
      members: [
        {
          id: "M_HUNG_NCT",
          fullName: "Nguyễn Văn Hùng",
          role: "Chi hội trưởng",
          cccd: "079068001234",
          phone: "0903829112",
          birthDate: "15/04/1968",
          joinDate: "01/10/2018",
          decisionNumber: "QĐ-15/HNCT-AP"
        },
        {
          id: "M_LAN_NCT",
          fullName: "Trần Thị Lan",
          role: "Hội viên Người cao tuổi",
          cccd: "079071004567",
          phone: "0918345678",
          birthDate: "22/11/1971",
          joinDate: "01/10/2021"
        }
      ]
    },
    {
      id: "ASC_CCA",
      name: "Hội Cựu Công An",
      category: "Đoàn thể nhân dân",
      description: "Tập hợp các cán bộ chiến sĩ công an đã nghỉ hưu, đóng góp kinh nghiệm giữ gìn trật tự.",
      leaderName: "Lê Văn Sơn",
      leaderCccd: "079070003112",
      members: [
        {
          id: "M_SON_CCA",
          fullName: "Lê Văn Sơn",
          role: "Chi hội trưởng Cựu CAND",
          cccd: "079070003112",
          phone: "0944112233",
          birthDate: "08/12/1970",
          joinDate: "19/08/2023",
          decisionNumber: "QĐ-01/CAND-AP"
        }
      ]
    },
    {
      id: "ASC_CTD",
      name: "Chi hội Chữ Thập Đỏ",
      category: "Hội quần chúng",
      description: "Thực hiện cứu trợ nhân đạo, hiến máu tình nguyện và chăm lo cho các gia đình khó khăn.",
      leaderName: "Trần Thị Lan",
      leaderCccd: "079071004567",
      members: [
        {
          id: "M_LAN_CTD",
          fullName: "Trần Thị Lan",
          role: "Chi hội trưởng",
          cccd: "079071004567",
          phone: "0918345678",
          birthDate: "22/11/1971",
          joinDate: "08/05/2015",
          decisionNumber: "QĐ-09/CTD-AP"
        },
        {
          id: "M_MAI_CTD",
          fullName: "Lê Thị Mai",
          role: "Tình nguyện viên CTĐ",
          cccd: "079075003421",
          phone: "0987654321",
          birthDate: "10/08/1975",
          joinDate: "08/05/2015"
        }
      ]
    },
    {
      id: "ASC_CS_NCC",
      name: "Người có công",
      category: "Chính sách xã hội",
      description: "Danh sách quản lý và chăm lo cho các cá nhân là thương binh, bệnh binh, người có công cách mạng.",
      leaderName: "Nguyễn Văn Hùng",
      leaderCccd: "079068001234",
      members: [
        {
          id: "M_HUNG_NCC",
          fullName: "Nguyễn Văn Hùng",
          role: "Thương binh 4/4",
          cccd: "079068001234",
          phone: "0903829112",
          birthDate: "15/04/1968",
          joinDate: "27/07/2000",
          decisionNumber: "GCN-TB-789"
        }
      ]
    },
    {
      id: "ASC_CS_GDCS",
      name: "Gia đình chính sách",
      category: "Chính sách xã hội",
      description: "Quản lý và thăm hỏi các gia đình chính sách, thân nhân liệt sĩ nhân các dịp lễ tết.",
      leaderName: "Nguyễn Văn Hùng",
      leaderCccd: "079068001234",
      members: [
        {
          id: "M_HUNG_GDCS",
          fullName: "Nguyễn Văn Hùng",
          role: "Đại diện thân nhân Liệt sĩ",
          cccd: "079068001234",
          phone: "0903829112",
          birthDate: "15/04/1968",
          joinDate: "27/07/2000"
        }
      ]
    },
    {
      id: "ASC_CS_MVNAH",
      name: "Mẹ Việt Nam Anh hùng",
      category: "Chính sách xã hội",
      description: "Chăm lo, phụng dưỡng các Mẹ Việt Nam Anh hùng và thân nhân liệt sĩ trên địa bàn.",
      leaderName: "Lê Thị Mai",
      leaderCccd: "079075003421",
      members: [
        {
          id: "M_MAI_MVNAH",
          fullName: "Lê Thị Mai",
          role: "Người chăm sóc phụng dưỡng",
          cccd: "079075003421",
          phone: "0987654321",
          birthDate: "10/08/1975",
          joinDate: "27/07/2015"
        }
      ]
    },
    {
      id: "ASC_CS_NGHEO",
      name: "Hộ nghèo",
      category: "Chính sách xã hội",
      description: "Hộ nghèo theo chuẩn nghèo đa chiều thành phố, hỗ trợ vay vốn và miễn giảm chi phí.",
      leaderName: "Trần Thị Lan",
      leaderCccd: "079071004567",
      members: [
        {
          id: "M_NAM_NGHEO",
          fullName: "Nguyễn Hoàng Nam",
          role: "Thành viên hộ cận nghèo",
          cccd: "079095009876",
          phone: "0932456789",
          birthDate: "05/09/1995",
          joinDate: "01/01/2023"
        }
      ]
    },
    {
      id: "ASC_CS_CANNGHEO",
      name: "Hộ cận nghèo",
      category: "Chính sách xã hội",
      description: "Hộ cận nghèo bảo trợ xã hội, hỗ trợ thẻ BHYT và học bổng cho học sinh nghèo.",
      leaderName: "Trần Thị Lan",
      leaderCccd: "079071004567",
      members: []
    },
    {
      id: "ASC_CS_NKT",
      name: "Người khuyết tật",
      category: "Chính sách xã hội",
      description: "Đối tượng khuyết tật được cấp thẻ bảo hiểm y tế và chi trả trợ cấp hàng tháng.",
      leaderName: "Vũ Hoàng My",
      leaderCccd: "079098002345",
      members: []
    },
    {
      id: "ASC_CS_TE",
      name: "Trẻ em",
      category: "Chính sách xã hội",
      description: "Bảo vệ trẻ em, tổ chức Tết Trung thu, Quốc tế thiếu nhi 1/6 và phòng chống đuối nước.",
      leaderName: "Vũ Hoàng My",
      leaderCccd: "079098002345",
      members: []
    },
    {
      id: "ASC_CTDANG",
      name: "Cảm tình Đảng",
      category: "Chính trị - Xã hội",
      description: "Quần chúng ưu tú tham gia các lớp bồi dưỡng nhận thức về Đảng để chuẩn bị kết nạp.",
      leaderName: "Nguyễn Hoàng Nam",
      leaderCccd: "079095009876",
      members: [
        {
          id: "M_NAM_CTDANG",
          fullName: "Nguyễn Hoàng Nam",
          role: "Đối tượng bồi dưỡng Đảng",
          cccd: "079095009876",
          phone: "0932456789",
          birthDate: "05/09/1995",
          joinDate: "03/02/2023",
          decisionNumber: "GCN-CTD-45"
        }
      ]
    },
    {
      id: "ASC_DANG213",
      name: "Đảng viên 213",
      category: "Chính trị - Xã hội",
      description: "Đảng viên sinh hoạt nơi cư trú theo Quy định số 213-QĐ/TW của Bộ Chính trị.",
      leaderName: "Trần Văn Thanh",
      leaderCccd: "079081005555",
      members: [
        {
          id: "M_THANH_213",
          fullName: "Trần Văn Thanh",
          role: "Tổ trưởng đảng viên 213",
          cccd: "079081005555",
          phone: "0919887766",
          birthDate: "25/07/1981",
          joinDate: "01/01/2020",
          decisionNumber: "QĐ-213/ĐU-AP"
        }
      ]
    }
  ]);

  const [selectedAssociationId, setSelectedAssociationId] = useState<string>("ASC_BDH");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Search & filter members within selected association
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("Tất cả");

  // Fallback safe association to guarantee no undefined access
  const fallbackAssociation: Association = {
    id: "ASC_BDH",
    name: "Ban điều hành khu phố",
    category: "Chính quyền cơ sở",
    description: "Tổ chức tự quản trực tiếp điều hành mọi hoạt động dân cư và đời sống cơ sở tại Khu phố 3.",
    leaderName: "Nguyễn Trung Huy",
    leaderCccd: "079080009988",
    members: []
  };

  // Selected association derived from ID for single source of truth and instant reactivity
  const selectedAssociation = associations.find(a => a.id === selectedAssociationId) || associations[0] || fallbackAssociation;

  // Modern Toast alert system for cross-origin iframe compliance (replaces window.alert)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Custom modal state for member deletion (replaces window.confirm)
  const [memberToDelete, setMemberToDelete] = useState<{ cccd: string; name: string } | null>(null);

  // Custom modal state for editing member
  const [editingMember, setEditingMember] = useState<AssociationMember | null>(null);
  const [editMemberRole, setEditMemberRole] = useState<string>("");
  const [editMemberJoinDate, setEditMemberJoinDate] = useState<string>("");
  const [editMemberDecisionNumber, setEditMemberDecisionNumber] = useState<string>("");
  const [editMemberDecisionDate, setEditMemberDecisionDate] = useState<string>("");
  const [editMemberDecisionFile, setEditMemberDecisionFile] = useState<{
    name: string;
    url: string;
    type: "image" | "pdf";
    size?: string;
  } | null>(null);

  // Document preview modal state
  const [viewingDecisionDoc, setViewingDecisionDoc] = useState<{
    memberName: string;
    memberRole: string;
    memberCccd: string;
    associationName: string;
    decisionNumber?: string;
    decisionDate?: string;
    joinDate?: string;
    file: {
      name: string;
      url: string;
      type: "image" | "pdf";
      size?: string;
    };
  } | null>(null);

  // File upload processing (Image & PDF supported)
  const handleProcessFileUpload = (
    file: File,
    onSuccess: (fileObj: { name: string; url: string; type: "image" | "pdf"; size: string }) => void
  ) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);

    if (!isPdf && !isImage) {
      showToast("Chỉ hỗ trợ tệp định dạng PDF hoặc hình ảnh (PNG, JPG, WebP)!", "error");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast("Dung lượng tệp tối đa cho phép là 20MB!", "error");
      return;
    }

    const formattedSize = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      onSuccess({
        name: file.name,
        url: reader.result as string,
        type: isPdf ? "pdf" : "image",
        size: formattedSize
      });
      showToast(`Đã tải lên tệp: ${file.name} (${formattedSize})`, "success");
    };
    reader.onerror = () => {
      showToast("Không thể đọc tệp tin đã chọn!", "error");
    };
    reader.readAsDataURL(file);
  };

  // Download attached decision file
  const handleDownloadFile = (fileObj: { name: string; url: string }) => {
    const link = document.createElement("a");
    link.href = fileObj.url;
    link.download = fileObj.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đang tải xuống tệp: ${fileObj.name}`, "success");
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  // State for creating new Association
  const [showAddAssocModal, setShowAddAssocModal] = useState(false);
  const [newAssocName, setNewAssocName] = useState("");
  const [newAssocCategory, setNewAssocCategory] = useState<"Chính trị - Xã hội" | "An ninh - Quốc phòng" | "Đoàn thể nhân dân" | "Hội quần chúng">("Đoàn thể nhân dân");
  const [newAssocDesc, setNewAssocDesc] = useState("");
  const [newAssocLeaderCccd, setNewAssocLeaderCccd] = useState("");
  const [newAssocLeaderRole, setNewAssocLeaderRole] = useState("Chi hội trưởng");

  // State for adding a member from Residents database
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedResidentCccd, setSelectedResidentCccd] = useState("");
  const [memberRole, setMemberRole] = useState("Hội viên");
  const [memberJoinDate, setMemberJoinDate] = useState("");
  const [memberDecisionNumber, setMemberDecisionNumber] = useState("");
  const [memberDecisionDate, setMemberDecisionDate] = useState("");
  const [memberDecisionFile, setMemberDecisionFile] = useState<{
    name: string;
    url: string;
    type: "image" | "pdf";
    size?: string;
  } | null>(null);
  const [residentSearchTerm, setResidentSearchTerm] = useState("");

  // View mode switcher: "associations" (standard) or "multi-role-matrix" (multi-role overview table)
  const [activeViewMode, setActiveViewMode] = useState<"associations" | "multi-role-matrix">("associations");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixFilterCategory, setMatrixFilterCategory] = useState<string>("Tất cả");

  // Member Display Mode in Association: "card" (cards grid) or "list" (table rows)
  const [memberViewMode, setMemberViewMode] = useState<"card" | "list">("card");

  // State for Quick Multi-Role / Multi-Group Assignment Modal
  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [quickAssignTab, setQuickAssignTab] = useState<"by-resident" | "by-group">("by-resident");
  const [quickAssignResidentCccd, setQuickAssignResidentCccd] = useState<string>("");
  const [quickAssignGroupSelections, setQuickAssignGroupSelections] = useState<Record<string, { selected: boolean; role: string }>>({});
  const [quickAssignTargetGroupId, setQuickAssignTargetGroupId] = useState<string>("ASC_BDH");
  const [quickAssignSelectedResidentCccds, setQuickAssignSelectedResidentCccds] = useState<string[]>([]);
  const [quickAssignResidentSearch, setQuickAssignResidentSearch] = useState<string>("");

  // Member Detail Modal State (Modal chi tiết thành viên chuẩn như phân hệ quản lý cư dân)
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<AssociationMember | null>(null);

  // Dynamic Customizable Roles List (Thêm, Sửa, Xóa chức danh trong dropdown)
  const DEFAULT_ROLES = [
    "Chi hội trưởng",
    "Chi hội phó",
    "Ủy viên Ban chấp hành",
    "Bí thư Chi bộ",
    "Phó Bí thư Chi bộ",
    "Tổ trưởng",
    "Tổ phó",
    "Thư ký",
    "Hội viên",
    "Hội viên tích cực",
    "Hội viên nòng cốt",
    "Đội viên ANTT cơ sở",
    "Chiến sĩ Dân quân tự vệ",
    "Chỉ huy trưởng DQTV",
    "Hòa giải viên cơ sở",
    "Trưởng Ban điều hành",
    "Phó Ban điều hành",
    "Cán bộ Đoàn thanh niên",
    "Cán bộ Hội phụ nữ",
    "Cán bộ Hội Cựu chiến binh",
    "Cán bộ Hội Nông dân",
    "Cộng tác viên Dân số"
  ];

  const [customRoles, setCustomRoles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kp3_association_roles");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_ROLES;
  });

  // Role Manager Modal State (cho phép thêm, sửa, xóa chức danh linh hoạt)
  const [showRoleManagerModal, setShowRoleManagerModal] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState("");
  const [roleSearchFilter, setRoleSearchFilter] = useState("");

  const handleAddCustomRole = (newRoleName: string) => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      showToast("Vui lòng nhập tên chức danh!", "error");
      return false;
    }
    if (customRoles.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      showToast("Chức danh này đã có trong danh mục!", "error");
      return false;
    }
    const updated = [trimmed, ...customRoles];
    setCustomRoles(updated);
    try {
      localStorage.setItem("kp3_association_roles", JSON.stringify(updated));
    } catch (e) {}
    showToast(`Đã thêm chức danh "${trimmed}" thành công!`, "success");
    setNewRoleInput("");
    return true;
  };

  const handleEditCustomRole = (oldRole: string, newRole: string) => {
    const trimmed = newRole.trim();
    if (!trimmed || trimmed === oldRole) {
      setEditingRoleIndex(null);
      return;
    }
    const updated = customRoles.map(r => r === oldRole ? trimmed : r);
    setCustomRoles(updated);
    try {
      localStorage.setItem("kp3_association_roles", JSON.stringify(updated));
    } catch (e) {}
    // Update members across all associations
    setAssociations(prev => prev.map(a => ({
      ...a,
      members: a.members.map(m => m.role === oldRole ? { ...m, role: trimmed } : m)
    })));
    if (editMemberRole === oldRole) setEditMemberRole(trimmed);
    if (memberRole === oldRole) setMemberRole(trimmed);
    setEditingRoleIndex(null);
    showToast(`Đã cập nhật chức danh thành "${trimmed}"!`, "success");
  };

  const handleDeleteCustomRole = (roleToDelete: string) => {
    if (customRoles.length <= 1) {
      showToast("Phải duy trì ít nhất 01 chức danh trong hệ thống!", "error");
      return;
    }
    const updated = customRoles.filter(r => r !== roleToDelete);
    setCustomRoles(updated);
    try {
      localStorage.setItem("kp3_association_roles", JSON.stringify(updated));
    } catch (e) {}
    if (editMemberRole === roleToDelete) setEditMemberRole(updated[0]);
    if (memberRole === roleToDelete) setMemberRole(updated[0]);
    showToast(`Đã xóa chức danh "${roleToDelete}" khỏi danh mục!`, "success");
  };

  // Upload Avatar for a member
  const handleUploadMemberAvatar = (memberCccd: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Chỉ hỗ trợ tệp định dạng hình ảnh (PNG, JPG, WebP)!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAssociations(prev => prev.map(assoc => ({
        ...assoc,
        members: assoc.members.map(m => m.cccd === memberCccd ? { ...m, avatar: dataUrl } : m)
      })));
      setSelectedMemberForDetail(prev => prev && prev.cccd === memberCccd ? { ...prev, avatar: dataUrl } : prev);
      setEditingMember(prev => prev && prev.cccd === memberCccd ? { ...prev, avatar: dataUrl } : prev);
      showToast("Đã cập nhật ảnh đại diện thành viên thành công!", "success");
    };
    reader.onerror = () => {
      showToast("Không thể đọc tệp hình ảnh!", "error");
    };
    reader.readAsDataURL(file);
  };





  // Open Quick Multi-Role Assignment Modal
  const handleOpenQuickAssignModal = (target?: Resident | AssociationMember | string) => {
    let targetCccd = "";
    if (typeof target === "string") {
      targetCccd = target;
    } else if (target && "cccd" in target) {
      targetCccd = target.cccd;
    } else if (residents.length > 0) {
      targetCccd = residents[0].cccd;
    }
    
    setQuickAssignResidentCccd(targetCccd);
    
    const initialSelections: Record<string, { selected: boolean; role: string }> = {};
    TARGET_GROUPS.forEach(g => {
      const assoc = associations.find(a => a.id === g.id || a.name.toLowerCase() === g.name.toLowerCase());
      const member = assoc?.members.find(m => m.cccd === targetCccd);
      initialSelections[g.id] = {
        selected: !!member,
        role: member?.role || g.defaultRole
      };
    });
    setQuickAssignGroupSelections(initialSelections);
    setQuickAssignSelectedResidentCccds([]);
    setQuickAssignResidentSearch("");
    setShowQuickAssignModal(true);
  };

  const handleSelectQuickAssignResident = (cccd: string) => {
    setQuickAssignResidentCccd(cccd);
    const initialSelections: Record<string, { selected: boolean; role: string }> = {};
    TARGET_GROUPS.forEach(g => {
      const assoc = associations.find(a => a.id === g.id || a.name.toLowerCase() === g.name.toLowerCase());
      const member = assoc?.members.find(m => m.cccd === cccd);
      initialSelections[g.id] = {
        selected: !!member,
        role: member?.role || g.defaultRole
      };
    });
    setQuickAssignGroupSelections(initialSelections);
  };

  const handleToggleQuickAssignGroup = (groupId: string) => {
    setQuickAssignGroupSelections(prev => {
      const current = prev[groupId] || { selected: false, role: TARGET_GROUPS.find(g => g.id === groupId)?.defaultRole || "Hội viên" };
      return {
        ...prev,
        [groupId]: {
          ...current,
          selected: !current.selected
        }
      };
    });
  };

  const handleUpdateQuickAssignRole = (groupId: string, newRole: string) => {
    setQuickAssignGroupSelections(prev => {
      const current = prev[groupId] || { selected: true, role: newRole };
      return {
        ...prev,
        [groupId]: {
          ...current,
          role: newRole
        }
      };
    });
  };

  const handleToggleBatchResidentCccd = (cccd: string) => {
    setQuickAssignSelectedResidentCccds(prev => 
      prev.includes(cccd) ? prev.filter(c => c !== cccd) : [...prev, cccd]
    );
  };

  const handleSaveQuickAssignByResident = () => {
    const resident = residents.find(r => r.cccd === quickAssignResidentCccd) || 
      associations.flatMap(a => a.members).find(m => m.cccd === quickAssignResidentCccd);
    
    if (!resident) {
      showToast("Không tìm thấy thông tin cư dân!", "error");
      return;
    }

    setAssociations(prevAssocs => {
      return prevAssocs.map(assoc => {
        const matchedGroup = TARGET_GROUPS.find(g => g.id === assoc.id || g.name.toLowerCase() === assoc.name.toLowerCase());
        if (!matchedGroup) return assoc;

        const selection = quickAssignGroupSelections[matchedGroup.id];
        if (!selection) return assoc;

        const isCurrentlyMember = assoc.members.some(m => m.cccd === resident.cccd);

        if (selection.selected) {
          if (isCurrentlyMember) {
            return {
              ...assoc,
              members: assoc.members.map(m => m.cccd === resident.cccd ? { ...m, role: selection.role } : m)
            };
          } else {
            const newMember: AssociationMember = {
              id: "MEM_" + Date.now().toString().slice(-4) + "_" + Math.floor(Math.random() * 100),
              fullName: resident.fullName,
              role: selection.role,
              cccd: resident.cccd,
              phone: resident.phone,
              birthDate: resident.birthDate,
              joinDate: new Date().toLocaleDateString("vi-VN"),
              decisionNumber: `QĐ-${Math.floor(10 + Math.random() * 90)}/UBND-KP3`,
              avatar: (resident as any).avatar
            };
            return {
              ...assoc,
              members: [newMember, ...assoc.members]
            };
          }
        } else {
          if (isCurrentlyMember) {
            return {
              ...assoc,
              members: assoc.members.filter(m => m.cccd !== resident.cccd)
            };
          }
          return assoc;
        }
      });
    });

    setShowQuickAssignModal(false);
    showToast(`Đã cập nhật phân công đa vai trò cho "${resident.fullName}"!`, "success");
  };

  const handleSaveQuickAssignByGroup = () => {
    const targetGroup = TARGET_GROUPS.find(g => g.id === quickAssignTargetGroupId);
    if (!targetGroup) return;

    if (quickAssignSelectedResidentCccds.length === 0) {
      showToast("Vui lòng tích chọn ít nhất 01 cư dân!", "error");
      return;
    }

    setAssociations(prevAssocs => {
      return prevAssocs.map(assoc => {
        const isMatched = assoc.id === targetGroup.id || assoc.name.toLowerCase() === targetGroup.name.toLowerCase();
        if (!isMatched) return assoc;

        const existingCccds = new Set(assoc.members.map(m => m.cccd));
        const newMembers: AssociationMember[] = [];

        quickAssignSelectedResidentCccds.forEach(cccd => {
          if (!existingCccds.has(cccd)) {
            const res = residents.find(r => r.cccd === cccd);
            if (res) {
              newMembers.push({
                id: "MEM_" + Date.now().toString().slice(-4) + "_" + Math.floor(Math.random() * 100),
                fullName: res.fullName,
                role: targetGroup.defaultRole,
                cccd: res.cccd,
                phone: res.phone,
                birthDate: res.birthDate,
                joinDate: new Date().toLocaleDateString("vi-VN"),
                decisionNumber: `QĐ-${Math.floor(10 + Math.random() * 90)}/UBND-KP3`,
                avatar: res.avatar
              });
            }
          }
        });

        return {
          ...assoc,
          members: [...newMembers, ...assoc.members]
        };
      });
    });

    setShowQuickAssignModal(false);
    showToast(`Đã thêm ${quickAssignSelectedResidentCccds.length} cư dân vào nhóm "${targetGroup.name}"!`, "success");
  };

  // Create new Association
  const handleCreateAssociation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssocName.trim()) {
      showToast("Vui lòng nhập tên chi hội!", "error");
      return;
    }

    // Try to find the leader in residents database
    const leaderResident = residents.find(r => r.cccd === newAssocLeaderCccd);
    const leaderName = leaderResident ? leaderResident.fullName : "Chưa xác định";

    const newAssoc: Association = {
      id: "ASC" + (associations.length + 1).toString().padStart(3, "0"),
      name: newAssocName,
      category: newAssocCategory,
      description: newAssocDesc || "Không có mô tả chi tiết.",
      leaderName: leaderName,
      leaderCccd: newAssocLeaderCccd || "N/A",
      members: leaderResident ? [
        {
          id: "M" + Date.now(),
          fullName: leaderResident.fullName,
          role: newAssocLeaderRole || "Chi hội trưởng",
          cccd: leaderResident.cccd,
          phone: leaderResident.phone,
          birthDate: leaderResident.birthDate
        }
      ] : []
    };

    const updated = [...associations, newAssoc];
    setAssociations(updated);
    setSelectedAssociationId(newAssoc.id);
    setShowAddAssocModal(false);
    showToast("Đã tạo Chi hội mới thành công", "success");

    // Reset Form
    setNewAssocName("");
    setNewAssocDesc("");
    setNewAssocLeaderCccd("");
    setNewAssocLeaderRole("Chi hội trưởng");
  };

  // State for Editing Association
  const [showEditAssocModal, setShowEditAssocModal] = useState(false);
  const [assocToEdit, setAssocToEdit] = useState<Association | null>(null);
  const [editAssocName, setEditAssocName] = useState("");
  const [editAssocCategory, setEditAssocCategory] = useState<"Chính trị - Xã hội" | "An ninh - Quốc phòng" | "Đoàn thể nhân dân" | "Hội quần chúng">("Đoàn thể nhân dân");
  const [editAssocDesc, setEditAssocDesc] = useState("");
  const [editAssocLeaderCccd, setEditAssocLeaderCccd] = useState("");
  const [editAssocLeaderRole, setEditAssocLeaderRole] = useState("Chi hội trưởng");

  // State for Deleting / Dissolving Association
  const [assocToDelete, setAssocToDelete] = useState<Association | null>(null);

  // Open Edit Association Modal
  const handleOpenEditAssoc = (assoc: Association) => {
    setAssocToEdit(assoc);
    setEditAssocName(assoc.name);
    setEditAssocCategory(assoc.category);
    setEditAssocDesc(assoc.description);
    setEditAssocLeaderCccd(assoc.leaderCccd !== "N/A" ? assoc.leaderCccd : "");
    const leaderMember = assoc.members.find(m => m.cccd === assoc.leaderCccd);
    setEditAssocLeaderRole(leaderMember ? leaderMember.role : "Chi hội trưởng");
    setShowEditAssocModal(true);
  };

  // Submit Edit Association Form
  const handleUpdateAssociation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assocToEdit) return;
    if (!editAssocName.trim()) {
      showToast("Vui lòng nhập tên chi hội!", "error");
      return;
    }

    const leaderResident = residents.find(r => r.cccd === editAssocLeaderCccd);
    const leaderName = leaderResident 
      ? leaderResident.fullName 
      : (editAssocLeaderCccd ? assocToEdit.leaderName : "Chưa xác định");

    // Update members list: if new leader is from residents, sync leadership role
    let updatedMembers = [...assocToEdit.members];
    if (leaderResident) {
      const idx = updatedMembers.findIndex(m => m.cccd === leaderResident.cccd);
      if (idx >= 0) {
        updatedMembers[idx] = {
          ...updatedMembers[idx],
          role: editAssocLeaderRole || "Chi hội trưởng"
        };
      } else {
        updatedMembers.unshift({
          id: "M" + Date.now(),
          fullName: leaderResident.fullName,
          role: editAssocLeaderRole || "Chi hội trưởng",
          cccd: leaderResident.cccd,
          phone: leaderResident.phone,
          birthDate: leaderResident.birthDate
        });
      }
    }

    const updatedAssoc: Association = {
      ...assocToEdit,
      name: editAssocName.trim(),
      category: editAssocCategory,
      description: editAssocDesc.trim() || "Không có mô tả chi tiết.",
      leaderName: leaderName,
      leaderCccd: editAssocLeaderCccd || "N/A",
      members: updatedMembers
    };

    const newAssocs = associations.map(a => a.id === assocToEdit.id ? updatedAssoc : a);
    setAssociations(newAssocs);
    setShowEditAssocModal(false);
    setAssocToEdit(null);
    showToast(`Đã cập nhật Chi hội: "${updatedAssoc.name}" thành công!`, "success");
  };

  // Open Delete / Dissolve Association Confirmation
  const handleOpenDeleteAssoc = (assoc: Association) => {
    setAssocToDelete(assoc);
  };

  // Confirm Delete / Dissolve Association
  const handleConfirmDeleteAssoc = () => {
    if (!assocToDelete) return;
    if (associations.length <= 1) {
      showToast("Hệ thống phải duy trì ít nhất 01 Chi hội trong danh sách!", "error");
      setAssocToDelete(null);
      return;
    }

    const remaining = associations.filter(a => a.id !== assocToDelete.id);
    setAssociations(remaining);

    // If the deleted association was currently active, switch to first remaining
    if (selectedAssociationId === assocToDelete.id) {
      setSelectedAssociationId(remaining[0].id);
    }

    showToast(`Đã xóa / giải thể Chi hội: "${assocToDelete.name}" thành công!`, "success");
    setAssocToDelete(null);
  };

  // Add a member from the existing Residents database
  const handleAddMemberFromResidents = () => {
    if (!selectedResidentCccd) {
      showToast("Vui lòng chọn một cư dân từ danh sách!", "error");
      return;
    }

    // Check if the resident is already a member of this Association
    const alreadyMember = selectedAssociation.members.some(m => m.cccd === selectedResidentCccd);
    if (alreadyMember) {
      showToast("Cư dân này đã là thành viên của chi hội này!", "error");
      return;
    }

    const residentObj = residents.find(r => r.cccd === selectedResidentCccd);
    if (!residentObj) return;

    const newMember: AssociationMember = {
      id: "M" + Date.now(),
      fullName: residentObj.fullName,
      role: memberRole,
      cccd: residentObj.cccd,
      phone: residentObj.phone || "N/A",
      birthDate: residentObj.birthDate,
      joinDate: memberJoinDate.trim() || new Date().toLocaleDateString("vi-VN"),
      decisionNumber: memberDecisionNumber.trim() || undefined,
      decisionDate: memberDecisionDate.trim() || undefined,
      decisionFile: memberDecisionFile || undefined
    };

    const updatedMembers = [...selectedAssociation.members, newMember];
    
    // Check if the role is a main leader role and we want to auto-assign leadership
    let updatedLeaderName = selectedAssociation.leaderName;
    let updatedLeaderCccd = selectedAssociation.leaderCccd;
    if (["Bí thư", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng"].includes(memberRole)) {
      updatedLeaderName = residentObj.fullName;
      updatedLeaderCccd = residentObj.cccd;
    }

    const updatedAssociation: Association = {
      ...selectedAssociation,
      leaderName: updatedLeaderName,
      leaderCccd: updatedLeaderCccd,
      members: updatedMembers
    };

    const updatedAssociations = associations.map(a => a.id === selectedAssociation.id ? updatedAssociation : a);
    setAssociations(updatedAssociations);
    showToast(`Đã ghi danh ${newMember.fullName} vào ${selectedAssociation.name} thành công!`, "success");
    setShowAddMemberModal(false);

    // Reset Form
    setSelectedResidentCccd("");
    setMemberRole("Hội viên");
    setMemberJoinDate("");
    setMemberDecisionNumber("");
    setMemberDecisionDate("");
    setMemberDecisionFile(null);
    setResidentSearchTerm("");
  };

  // Remove a member from the selected association
  const handleRemoveMember = (memberCccd: string, name: string) => {
    setMemberToDelete({ cccd: memberCccd, name });
  };

  const performRemoveMember = (memberCccd: string) => {
    const updatedMembers = selectedAssociation.members.filter(m => m.cccd !== memberCccd);
    
    // If the leader is deleted, update leader details
    let updatedLeaderName = selectedAssociation.leaderName;
    let updatedLeaderCccd = selectedAssociation.leaderCccd;
    if (selectedAssociation.leaderCccd === memberCccd) {
      const nextLeader = updatedMembers[0];
      updatedLeaderName = nextLeader ? nextLeader.fullName : "Chưa phân công";
      updatedLeaderCccd = nextLeader ? nextLeader.cccd : "N/A";
    }

    const updatedAssociation: Association = {
      ...selectedAssociation,
      leaderName: updatedLeaderName,
      leaderCccd: updatedLeaderCccd,
      members: updatedMembers
    };

    const updatedAssociations = associations.map(a => a.id === selectedAssociation.id ? updatedAssociation : a);
    setAssociations(updatedAssociations);
    showToast("Đã xóa thành viên khỏi Chi hội thành công!", "success");
  };

  const handleOpenEditMember = (member: AssociationMember) => {
    setEditingMember(member);
    setEditMemberRole(member.role);
    setEditMemberJoinDate(member.joinDate || "");
    setEditMemberDecisionNumber(member.decisionNumber || "");
    setEditMemberDecisionDate(member.decisionDate || "");
    setEditMemberDecisionFile(member.decisionFile || null);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editMemberRole.trim()) {
      showToast("Vui lòng nhập chức vụ / chức danh!", "error");
      return;
    }

    const updatedMembers = selectedAssociation.members.map(m => {
      if (m.cccd === editingMember.cccd) {
        return { 
          ...m, 
          role: editMemberRole.trim(),
          joinDate: editMemberJoinDate.trim() || undefined,
          decisionNumber: editMemberDecisionNumber.trim() || undefined,
          decisionDate: editMemberDecisionDate.trim() || undefined,
          decisionFile: editMemberDecisionFile || undefined
        };
      }
      return m;
    });

    // Check if we need to update association leadership
    let updatedLeaderName = selectedAssociation.leaderName;
    let updatedLeaderCccd = selectedAssociation.leaderCccd;

    const leaderRoles = ["Bí thư Chi bộ", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng DQTV", "Phó Bí thư", "Chi hội phó"];
    const isNewRoleLeader = leaderRoles.includes(editMemberRole.trim());

    if (isNewRoleLeader) {
      // Promptly promote them as the current leader
      updatedLeaderName = editingMember.fullName;
      updatedLeaderCccd = editingMember.cccd;
    } else if (selectedAssociation.leaderCccd === editingMember.cccd) {
      // If this member was the leader and we demoted them, we can find a new leader from remaining leader-role members or keep it as is
      const alternativeLeader = updatedMembers.find(m => leaderRoles.includes(m.role));
      updatedLeaderName = alternativeLeader ? alternativeLeader.fullName : "Chưa phân công";
      updatedLeaderCccd = alternativeLeader ? alternativeLeader.cccd : "N/A";
    }

    const updatedAssociation: Association = {
      ...selectedAssociation,
      leaderName: updatedLeaderName,
      leaderCccd: updatedLeaderCccd,
      members: updatedMembers
    };

    const updatedAssociations = associations.map(a => a.id === selectedAssociation.id ? updatedAssociation : a);
    setAssociations(updatedAssociations);
    showToast(`Đã cập nhật thông tin & hồ sơ của ${editingMember.fullName} thành công!`, "success");
    setEditingMember(null);
  };

  // Filter Associations
  const filteredAssociations = associations.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "Tất cả" || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination Logic
  const totalItems = filteredAssociations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedAssociations = filteredAssociations.slice(startIndex, startIndex + itemsPerPage);

  // Eligible residents search
  const searchedResidents = (residents || []).filter(r => {
    if (!r) return false;
    const search = (residentSearchTerm || "").toLowerCase();
    const name = r.fullName || "";
    const cccd = r.cccd || "";
    const matchesNameOrCccd = name.toLowerCase().includes(search) || cccd.includes(search);
    // Exclude those already in the selected association
    const isAlreadyMember = (selectedAssociation?.members || []).some(m => m?.cccd === r.cccd);
    return matchesNameOrCccd && !isAlreadyMember;
  });

  // Calculate some analytics
  const totalAssociationsCount = (associations || []).length;
  const totalUniqueMembersCount = new Set(
    (associations || []).flatMap(a => (a?.members || []).map(m => m?.cccd).filter(Boolean))
  ).size;

  // Excel Export functions
  const handleExportToExcel = () => {
    if (!selectedAssociation) return;
    const headers = [
      "Mã Chi hội",
      "Tên Chi hội/Tổ chức",
      "Phân nhóm",
      "STT Thành viên",
      "Họ và tên",
      "Chức vụ/Vai trò",
      "Số CCCD",
      "Số điện thoại",
      "Năm sinh",
      "Ngày tham gia",
      "Số Quyết định",
      "Ngày ban hành QĐ",
      "Tệp đính kèm QĐ"
    ];

    const rows = selectedAssociation.members.map((member, index) => {
      const birthYear = member.birthDate ? member.birthDate.split("/").pop() : "N/A";
      return [
        selectedAssociation.id,
        selectedAssociation.name,
        selectedAssociation.category,
        index + 1,
        member.fullName,
        member.role,
        `="${member.cccd}"`,
        `="${member.phone || "N/A"}"`,
        birthYear,
        member.joinDate || "Chưa cập nhật",
        member.decisionNumber || "Chưa có",
        member.decisionDate || "N/A",
        member.decisionFile ? `${member.decisionFile.name} (${member.decisionFile.type.toUpperCase()})` : "Chưa đính kèm"
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const safeName = selectedAssociation.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-zA-Z0-9]/g, "_");
      
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_thanh_vien_${safeName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllToExcel = () => {
    const headers = [
      "Mã Chi hội",
      "Tên Chi hội/Tổ chức",
      "Phân loại nhóm",
      "Mô tả hoạt động",
      "Người đứng đầu",
      "CCCD Người đứng đầu",
      "STT Thành viên",
      "Họ tên Thành viên",
      "Chức vụ/Vai trò",
      "CCCD Thành viên",
      "SĐT Thành viên",
      "Năm sinh",
      "Ngày tham gia",
      "Số Quyết định",
      "Tệp đính kèm QĐ"
    ];

    const rows: any[] = [];
    
    associations.forEach(assoc => {
      if (assoc.members.length === 0) {
        rows.push([
          assoc.id,
          assoc.name,
          assoc.category,
          assoc.description,
          assoc.leaderName,
          `="${assoc.leaderCccd}"`,
          "",
          "(Chưa có thành viên)",
          "",
          "",
          "",
          "",
          "",
          "",
          ""
        ]);
      } else {
        assoc.members.forEach((member, idx) => {
          const birthYear = member.birthDate ? member.birthDate.split("/").pop() : "N/A";
          rows.push([
            assoc.id,
            assoc.name,
            assoc.category,
            assoc.description,
            assoc.leaderName,
            `="${assoc.leaderCccd}"`,
            idx + 1,
            member.fullName,
            member.role,
            `="${member.cccd}"`,
            `="${member.phone || "N/A"}"`,
            birthYear,
            member.joinDate || "Chưa cập nhật",
            member.decisionNumber || "Chưa có",
            member.decisionFile ? `${member.decisionFile.name} (${member.decisionFile.type.toUpperCase()})` : "Chưa đính kèm"
          ]);
        });
      }
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Danh_sach_tong_hop_tat_ca_Chi_hoi_Khu_pho_3.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách tất cả các chi hội ra file Excel!", "success");
  };

  // Multi-role Resident Analytics and Matrix
  const multiRoleSummary = (residents || []).map(resident => {
    if (!resident) return null;
    const rolesHeld: { groupName: string; groupId: string; role: string; category: string; section: string; joinDate?: string; decisionNumber?: string }[] = [];
    
    (associations || []).forEach(assoc => {
      if (!assoc || !assoc.members) return;
      const member = assoc.members.find(m => m && m.cccd === resident.cccd);
      if (member) {
        const targetConfig = TARGET_GROUPS.find(g => g.id === assoc.id || (assoc.name && g.name.toLowerCase() === assoc.name.toLowerCase()));
        rolesHeld.push({
          groupName: assoc.name || "",
          groupId: assoc.id,
          role: member.role || "",
          category: assoc.category || "",
          section: targetConfig?.section || "Nhóm khác",
          joinDate: member.joinDate,
          decisionNumber: member.decisionNumber
        });
      }
    });

    return {
      resident,
      roles: rolesHeld,
      rolesCount: rolesHeld.length,
      isMultiRole: rolesHeld.length > 1
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const multiRoleResidentsCount = multiRoleSummary.filter(s => s.rolesCount > 1).length;
  const anyRoleResidentsCount = multiRoleSummary.filter(s => s.rolesCount > 0).length;

  const filteredMultiRoleSummary = multiRoleSummary.filter(item => {
    const name = item.resident?.fullName || "";
    const cccd = item.resident?.cccd || "";
    const query = matrixSearch.toLowerCase();
    const matchesSearch = name.toLowerCase().includes(query) || 
                          cccd.includes(query) ||
                          item.roles.some(r => (r.role || "").toLowerCase().includes(query) || (r.groupName || "").toLowerCase().includes(query));
    
    if (!matchesSearch) return false;

    if (matrixFilterCategory === "Đa nhiệm (≥ 2 vai trò)") {
      return item.rolesCount >= 2;
    }
    if (matrixFilterCategory === "Có vai trò (≥ 1 vai trò)") {
      return item.rolesCount >= 1;
    }
    if (matrixFilterCategory === "Chưa tham gia") {
      return item.rolesCount === 0;
    }
    if (matrixFilterCategory !== "Tất cả") {
      return item.roles.some(r => r.section === matrixFilterCategory);
    }
    return true;
  });

  // Export Multi-Role Registry to Excel
  const handleExportMultiRoleReport = () => {
    const headers = [
      "STT",
      "Họ và tên Cư dân",
      "Số CCCD",
      "Số điện thoại",
      "Địa chỉ cư trú",
      "Số lượng vai trò đảm nhiệm",
      "Chi tiết các vai trò & Tổ chức",
      "Đánh giá Đa nhiệm"
    ];

    const rows = multiRoleSummary
      .filter(item => item.rolesCount > 0)
      .map((item, idx) => {
        const rolesDetail = item.roles.map(r => `${r.groupName} (${r.role})`).join("; ");
        return [
          idx + 1,
          item.resident.fullName,
          `="${item.resident.cccd}"`,
          `="${item.resident.phone || "N/A"}"`,
          item.resident.address,
          item.rolesCount,
          rolesDetail,
          item.rolesCount > 1 ? "Cán bộ Đa nhiệm" : "Thành viên đơn nhiệm"
        ];
      });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Danh_sach_phan_cong_da_vai_tro_can_bo_Khu_pho_3.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách phân công đa vai trò ra file Excel!", "success");
  };

  // Filter members of selectedAssociation
  const filteredMembers = (selectedAssociation?.members || []).filter(member => {
    if (!member) return false;
    const query = memberSearchTerm.trim().toLowerCase();
    const matchesSearch = !query || 
      (member.fullName || "").toLowerCase().includes(query) ||
      (member.cccd || "").includes(query) ||
      (member.phone || "").includes(query) ||
      (member.role || "").toLowerCase().includes(query) ||
      (member.decisionNumber || "").toLowerCase().includes(query);

    const isLeaderRole = ["Bí thư Chi bộ", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng DQTV", "Phó Bí thư", "Chi hội phó"].includes(member.role);
    let matchesRole = true;
    if (memberRoleFilter === "Lãnh đạo / Trưởng phó") {
      matchesRole = isLeaderRole;
    } else if (memberRoleFilter === "Hội viên") {
      matchesRole = !isLeaderRole;
    } else if (memberRoleFilter === "Có Quyết định") {
      matchesRole = Boolean(member.decisionNumber || member.decisionFile);
    }

    return matchesSearch && matchesRole;
  });

  return (
    <div id="association-management-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header: Clean, modern, balanced */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-5 md:p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-emerald-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Chi hội & Đoàn thể cơ sở
            </span>
            <span className="text-xs text-slate-300 font-sans hidden sm:inline">• Khu phố 3, Bình Hòa</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Quản lý Chi hội & Đoàn thể</h1>
          <p className="text-slate-300 text-xs max-w-2xl">
            Tổ chức bộ máy chính trị - xã hội, ban điều hành, tổ bảo vệ ANTT và lực lượng liên kết. Đồng bộ đa vai trò cùng cơ sở dữ liệu dân cư.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button 
            type="button"
            onClick={() => handleOpenQuickAssignModal()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer border border-amber-300"
            title="Mở nhanh bảng phân công đa vai trò cư dân"
          >
            <Sparkles size={14} className="text-slate-950" />
            <span>Phân công Đa vai trò</span>
          </button>

          <button 
            onClick={handleExportAllToExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl font-medium text-xs transition-all border border-white/15 cursor-pointer shadow-xs"
            title="Xuất toàn bộ danh sách tổng hợp tất cả chi hội ra file Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-300" /> 
            <span>Xuất Excel</span>
          </button>
          <button 
            onClick={() => setShowAddAssocModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs cursor-pointer border border-emerald-400/30"
          >
            <FolderPlus size={15} /> 
            <span>+ Tạo Chi hội mới</span>
          </button>
        </div>
      </div>

      {/* Quick Analytics Summary: Clean, scannable, balanced */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold">Tổng số Chi hội</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Award size={16} /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-800 tracking-tight">{totalAssociationsCount}</span>
            <span className="text-xs text-slate-400">tổ chức</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium block mt-1">Đầy đủ các khối đoàn thể</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold">Nhân sự liên kết</span>
            <span className="p-1.5 bg-teal-50 text-teal-600 rounded-lg"><Users size={16} /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-800 tracking-tight">{totalUniqueMembersCount}</span>
            <span className="text-xs text-slate-400">cá nhân</span>
          </div>
          <span className="text-[10px] text-teal-700 font-medium block mt-1">Đã chuẩn hóa CCCD</span>
        </div>

        <div 
          onClick={() => setActiveViewMode(activeViewMode === "multi-role-matrix" ? "associations" : "multi-role-matrix")}
          className={`p-4 rounded-xl border shadow-2xs transition-all cursor-pointer ${
            activeViewMode === "multi-role-matrix"
              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 shadow-xs"
              : "bg-white border-slate-200/80 hover:border-amber-400 hover:shadow-xs"
          }`}
          title="Bấm để mở Ma trận Đa vai trò"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold">Cán bộ Đa nhiệm</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Sparkles size={16} /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-900 tracking-tight">{multiRoleResidentsCount}</span>
            <span className="text-xs text-slate-400">cán bộ</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-amber-700 font-medium">
            <span>Đảm nhiệm ≥ 2 vị trí</span>
            <span className="font-bold underline flex items-center gap-0.5">
              {activeViewMode === "multi-role-matrix" ? "Đang xem ma trận" : "Mở ma trận →"}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold">ANTT & Dân quân</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><ShieldCheck size={16} /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-800 tracking-tight">
              {(associations.find(a => a.id === "ASC002")?.members.length || 0) + (associations.find(a => a.id === "ASC003")?.members.length || 0)}
            </span>
            <span className="text-xs text-slate-400">đồng chí</span>
          </div>
          <span className="text-[10px] text-rose-700 font-medium block mt-1">Trực sẵn sàng 24/7</span>
        </div>
      </div>

      {/* View Mode Switcher: Tab bar styling */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex gap-1.5 p-1 bg-slate-100/90 rounded-lg">
          <button
            onClick={() => setActiveViewMode("associations")}
            className={`flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeViewMode === "associations"
                ? "bg-white text-emerald-800 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award size={14} className="text-emerald-600" />
            <span>Danh mục Chi hội & Hội viên</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode("multi-role-matrix")}
            className={`flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeViewMode === "multi-role-matrix"
                ? "bg-amber-400 text-slate-950 shadow-xs font-black ring-1 ring-amber-300"
                : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
            }`}
          >
            <Sparkles size={14} className={activeViewMode === "multi-role-matrix" ? "text-slate-950" : "text-amber-700"} />
            <span>Đa vai trò (Multi-Role Matrix)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeViewMode === "multi-role-matrix" ? "bg-black/20 text-slate-950" : "bg-amber-200 text-amber-900"
            }`}>
              {multiRoleResidentsCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeViewMode === "multi-role-matrix" && (
            <button
              onClick={handleExportMultiRoleReport}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Xuất Ma trận Excel</span>
            </button>
          )}

          {activeViewMode === "associations" && (
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition-all cursor-pointer"
              title="Xuất danh sách hội viên chi hội ra Excel"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          )}
        </div>
      </div>

      {activeViewMode === "associations" ? (
        <>
          {/* Main 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Left column (col-span-12 lg:col-span-4): Association List & Filters */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 space-y-3">
                {/* Header with count and add button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Chi hội</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                      {filteredAssociations.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAddAssocModal(true)}
                    className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Thêm chi hội mới"
                  >
                    <Plus size={13} />
                    <span>Thêm</span>
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    id="party-search-input"
                    name="partySearch"
                    type="text" 
                    placeholder="Tìm chi hội theo tên..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Category Pills Filter */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {["Tất cả", "Chính trị - Xã hội", "Chính quyền cơ sở", "An ninh - Quốc phòng", "Đoàn thể nhân dân", "Hội quần chúng", "Chính sách xã hội"].map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryFilterChange(cat)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        categoryFilter === cat 
                          ? "bg-emerald-700 text-white font-semibold shadow-2xs" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Association Cards List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredAssociations.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-2xs text-center text-slate-400 text-xs">
                    Không tìm thấy chi hội phù hợp bộ lọc
                  </div>
                ) : (
                  paginatedAssociations.map((assoc) => {
                    const isSelected = selectedAssociation.id === assoc.id;
                    const catBadgeColor = 
                      assoc.category === "Chính trị - Xã hội" ? "bg-rose-50 text-rose-700 border-rose-200" :
                      assoc.category === "Chính quyền cơ sở" ? "bg-amber-50 text-amber-800 border-amber-200" :
                      assoc.category === "An ninh - Quốc phòng" ? "bg-red-50 text-red-700 border-red-200" :
                      assoc.category === "Chính sách xã hội" ? "bg-purple-50 text-purple-700 border-purple-200" :
                      assoc.category === "Đoàn thể nhân dân" ? "bg-blue-50 text-blue-700 border-blue-200" : 
                      "bg-slate-100 text-slate-700 border-slate-200";

                    return (
                      <div 
                        key={assoc.id}
                        onClick={() => setSelectedAssociationId(assoc.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                          isSelected 
                            ? "bg-emerald-50/50 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30" 
                            : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600"></div>
                        )}
                        <div className="flex items-center justify-between gap-1 pl-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${catBadgeColor}`}>
                            {assoc.category}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditAssoc(assoc);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-colors cursor-pointer"
                              title="Sửa thông tin"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteAssoc(assoc);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                              title="Giải thể chi hội"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="pl-1 mt-1.5">
                          <h3 className={`font-bold text-xs leading-snug transition-colors ${
                            isSelected ? "text-emerald-900" : "text-slate-800 group-hover:text-emerald-700"
                          }`}>
                            {assoc.name}
                          </h3>
                          <p className="text-slate-500 text-[11px] mt-1 line-clamp-1 leading-normal font-sans">
                            {assoc.description}
                          </p>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 pl-1">
                          <span className="text-slate-500 truncate max-w-[170px]">
                            Trưởng: <strong className="text-slate-700 font-semibold">{assoc.leaderName}</strong>
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                          }`}>
                            {assoc.members.length} tv
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Compact Pagination */}
              {totalPages > 1 && (
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                  <Pagination
                    id="association-pagination"
                    currentPage={activePage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>

            {/* Right column (col-span-12 lg:col-span-8): Selected Association Workspace */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-5">
                
                {/* Association Title & Main Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-4 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                        {selectedAssociation.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Mã: {selectedAssociation.id}
                      </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                      {selectedAssociation.name}
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      {selectedAssociation.description}
                    </p>
                  </div>

                  {/* Primary & Secondary Action Buttons with clear hierarchy */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowAddMemberModal(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      <UserPlus size={14} />
                      <span>+ Thêm Hội viên</span>
                    </button>

                    <button 
                      onClick={handleExportToExcel}
                      className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium shadow-2xs transition-all cursor-pointer"
                      title="Xuất file danh sách thành viên ra Excel"
                    >
                      <FileSpreadsheet size={13} className="text-emerald-600" />
                      <span>Excel</span>
                    </button>
                    <button 
                      onClick={() => handleOpenEditAssoc(selectedAssociation)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Sửa thông tin chi hội"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => handleOpenDeleteAssoc(selectedAssociation)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Xóa / Giải thể chi hội"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Organization Details: Leader & Summary Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                        Người đứng đầu (Lãnh đạo phụ trách)
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-slate-800 text-sm">{selectedAssociation.leaderName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">CCCD: {selectedAssociation.leaderCccd}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:justify-end items-center gap-4 sm:border-l sm:border-slate-200/80 sm:pl-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Tổng số thành viên</span>
                      <span className="text-base font-extrabold text-emerald-800">{selectedAssociation.members.length} người</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Trạng thái</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        Đang hoạt động
                      </span>
                    </div>
                  </div>
                </div>

                {/* Members Section Header with Filter and Search */}
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Danh sách thành viên ({selectedAssociation.members.length})
                      </h3>
                      {filteredMembers.length !== selectedAssociation.members.length && (
                        <span className="text-xs text-slate-400 font-normal">
                          (Hiển thị {filteredMembers.length})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* View mode toggle: Card vs List */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setMemberViewMode("card")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            memberViewMode === "card"
                              ? "bg-white text-emerald-800 shadow-2xs font-bold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                          title="Hiển thị dạng thẻ (Cards)"
                        >
                          <LayoutGrid size={13} />
                          <span>Thẻ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemberViewMode("list")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            memberViewMode === "list"
                              ? "bg-white text-emerald-800 shadow-2xs font-bold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                          title="Hiển thị dạng danh sách (List)"
                        >
                          <List size={13} />
                          <span>Danh sách</span>
                        </button>
                      </div>

                      {/* Member search input */}
                      <div className="relative flex-1 sm:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                          id="party-member-search"
                          name="memberSearchTerm"
                          type="text"
                          placeholder="Lọc tên, CCCD, QĐ..."
                          value={memberSearchTerm}
                          onChange={(e) => setMemberSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                        />
                      </div>

                      {/* Filter by role pill */}
                      <select
                        id="party-member-role-filter"
                        name="memberRoleFilter"
                        value={memberRoleFilter}
                        onChange={(e) => setMemberRoleFilter(e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white focus:outline-none focus:border-emerald-500 shrink-0"
                      >
                        <option value="Tất cả">Tất cả chức vụ</option>
                        <option value="Lãnh đạo / Trưởng phó">Lãnh đạo / Trưởng phó</option>
                        <option value="Hội viên">Hội viên</option>
                        <option value="Có Quyết định">Có Quyết định</option>
                      </select>
                    </div>
                  </div>

                  {/* Members list rendering */}
                  {selectedAssociation.members.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl text-center text-slate-400 text-xs space-y-2">
                      <Users className="mx-auto text-slate-300" size={32} />
                      <p>Chưa có thành viên nào tham gia chi hội này.</p>
                      <button 
                        onClick={() => setShowAddMemberModal(true)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <UserPlus size={13} />
                        <span>Thêm thành viên từ Dữ liệu Dân cư</span>
                      </button>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl text-center text-slate-400 text-xs">
                      Không tìm thấy thành viên nào phù hợp với từ khóa "{memberSearchTerm}".
                    </div>
                  ) : memberViewMode === "card" ? (
                    /* CARD VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredMembers.map((member) => {
                        const matchedRes = residents.find(r => r.cccd === member.cccd);
                        const isLeader = ["Bí thư Chi bộ", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng DQTV", "Phó Bí thư", "Chi hội phó"].includes(member.role);
                        const roleBadgeColor = 
                          ["Bí thư Chi bộ", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng DQTV"].includes(member.role) 
                            ? "bg-rose-50 text-rose-800 border-rose-200 font-bold" 
                            : isLeader 
                            ? "bg-amber-50 text-amber-900 border-amber-200 font-bold"
                            : "bg-slate-100 text-slate-700 border-slate-200";
                        const isPartyMem = partyMembers.some(p => p.cccd === member.cccd);
                        const memberAvatar = member.avatar || matchedRes?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";

                        return (
                          <div 
                            key={member.cccd} 
                            className={`p-3.5 rounded-xl border relative transition-all bg-white hover:border-slate-300 hover:shadow-2xs flex flex-col justify-between ${
                              isLeader 
                                ? "border-amber-200/80 bg-gradient-to-br from-amber-50/20 to-white" 
                                : "border-slate-200/80"
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Member Header with Avatar */}
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <img 
                                      src={memberAvatar} 
                                      alt={member.fullName}
                                      className="w-10 h-10 rounded-full border-2 border-emerald-500/40 object-cover bg-slate-100"
                                      referrerPolicy="no-referrer"
                                    />
                                    {isPartyMem && (
                                      <span 
                                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[9px] font-bold"
                                        title="Đảng viên ĐCSVN"
                                      >
                                        ★
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <h4 
                                        onClick={() => setSelectedMemberForDetail(member)}
                                        className="font-bold text-slate-900 text-xs truncate max-w-[140px] hover:text-emerald-700 cursor-pointer"
                                        title="Bấm để xem hồ sơ chi tiết"
                                      >
                                        {member.fullName}
                                      </h4>
                                      <span className={`px-2 py-0.5 rounded text-[10px] border ${roleBadgeColor}`}>
                                        {member.role}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono">
                                      CCCD: {member.cccd}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={() => handleOpenQuickAssignModal(member.cccd)}
                                    className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                    title="Gán nhanh Đa vai trò / Nhóm khác"
                                  >
                                    <Sparkles size={13} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedMemberForDetail(member)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                    title="Xem chi tiết hồ sơ thành viên (Mô hình cư dân)"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditMember(member)}
                                    className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                    title="Sửa thông tin & Quyết định"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(member.cccd, member.fullName)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                    title="Xóa khỏi Chi hội"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Member Meta Info */}
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                <div className="truncate">
                                  <span className="text-slate-400">SĐT:</span> <span className="font-mono text-slate-700 font-medium">{member.phone || matchedRes?.phone || "N/A"}</span>
                                </div>
                                <div className="truncate">
                                  <span className="text-slate-400">Năm sinh:</span> <span className="text-slate-700 font-medium">{(member.birthDate || matchedRes?.birthDate)?.split("/").pop() || "N/A"}</span>
                                </div>
                                <div className="col-span-2 flex items-center gap-1.5 truncate text-[10px]">
                                  <Calendar size={11} className="text-emerald-600 shrink-0" />
                                  <span className="text-slate-400">Tham gia:</span>
                                  <span className="font-semibold text-emerald-800">{member.joinDate || "Chưa cập nhật"}</span>
                                </div>
                              </div>

                              {/* Decision info */}
                              {member.decisionNumber && (
                                <div className="pt-0.5">
                                  <div className="inline-flex items-center gap-1 bg-blue-50/80 border border-blue-200 text-blue-800 px-2 py-0.5 rounded text-[10px] font-mono">
                                    <FileCheck size={11} className="text-blue-600 shrink-0" />
                                    <span>QĐ: <strong>{member.decisionNumber}</strong></span>
                                    {member.decisionDate && <span className="text-blue-500 font-sans">({member.decisionDate})</span>}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* File Attachment / Upload Area */}
                            <div className="pt-2.5 mt-2 border-t border-slate-100">
                              {member.decisionFile ? (
                                <div className="flex items-center justify-between w-full bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-lg px-2 py-1 transition-colors">
                                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                    {member.decisionFile.type === "pdf" ? (
                                      <FileText size={13} className="text-rose-600 shrink-0" />
                                    ) : (
                                      <ImageIcon size={13} className="text-emerald-600 shrink-0" />
                                    )}
                                    <span className="text-[11px] font-medium text-slate-800 truncate" title={member.decisionFile.name}>
                                      {member.decisionFile.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setViewingDecisionDoc({
                                        memberName: member.fullName,
                                        memberRole: member.role,
                                        memberCccd: member.cccd,
                                        associationName: selectedAssociation.name,
                                        decisionNumber: member.decisionNumber,
                                        decisionDate: member.decisionDate,
                                        joinDate: member.joinDate,
                                        file: member.decisionFile!
                                      })}
                                      className="text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                      title="Xem trước văn bản"
                                    >
                                      <Eye size={11} className="inline mr-0.5" /> Xem
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadFile(member.decisionFile!)}
                                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                                      title="Tải về"
                                    >
                                      <Download size={12} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMember(member)}
                                  className="w-full flex items-center justify-center gap-1 py-1 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-lg text-[10px] font-medium text-slate-500 hover:text-emerald-700 transition-all cursor-pointer"
                                >
                                  <UploadCloud size={11} className="text-slate-400" />
                                  <span>+ Tải lên hồ sơ / Quyết định</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* LIST (TABLE) VIEW */
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider">
                              <th className="py-2.5 px-3 w-10 text-center">STT</th>
                              <th className="py-2.5 px-3 min-w-[200px]">Thành viên</th>
                              <th className="py-2.5 px-3 min-w-[140px]">Chức danh / Vai trò</th>
                              <th className="py-2.5 px-3 w-28">Năm sinh & SĐT</th>
                              <th className="py-2.5 px-3 min-w-[170px]">Địa chỉ cư trú</th>
                              <th className="py-2.5 px-3 w-36">Hồ sơ / Quyết định</th>
                              <th className="py-2.5 px-3 w-28 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredMembers.map((member, mIdx) => {
                              const matchedRes = residents.find(r => r.cccd === member.cccd);
                              const isLeader = ["Bí thư Chi bộ", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng DQTV", "Phó Bí thư", "Chi hội phó"].includes(member.role);
                              const roleBadgeColor = 
                                ["Bí thư Chi bộ", "Chi hội trưởng", "Tổ trưởng", "Chỉ huy trưởng DQTV"].includes(member.role) 
                                  ? "bg-rose-50 text-rose-800 border-rose-200 font-bold" 
                                  : isLeader 
                                  ? "bg-amber-50 text-amber-900 border-amber-200 font-bold"
                                  : "bg-slate-100 text-slate-700 border-slate-200";
                              const isPartyMem = partyMembers.some(p => p.cccd === member.cccd);
                              const memberAvatar = member.avatar || matchedRes?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";

                              return (
                                <tr key={member.cccd} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                    {mIdx + 1}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="relative shrink-0">
                                        <img 
                                          src={memberAvatar} 
                                          alt={member.fullName}
                                          className="w-8 h-8 rounded-full border border-emerald-500/40 object-cover bg-slate-100"
                                          referrerPolicy="no-referrer"
                                        />
                                        {isPartyMem && (
                                          <span 
                                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[8px] font-bold"
                                            title="Đảng viên ĐCSVN"
                                          >
                                            ★
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedMemberForDetail(member)}
                                          className="font-bold text-slate-900 hover:text-emerald-700 text-xs text-left cursor-pointer transition-colors block"
                                        >
                                          {member.fullName}
                                        </button>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                          CCCD: {member.cccd}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${roleBadgeColor}`}>
                                      {member.role}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-[11px] text-slate-800 font-mono">
                                      {member.phone || matchedRes?.phone || "N/A"}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {(member.birthDate || matchedRes?.birthDate) || "N/A"}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="text-[11px] text-slate-600 line-clamp-1 max-w-[200px]" title={matchedRes?.address || "Khu phố 3, An Phú"}>
                                      {matchedRes?.address || "Khu phố 3, An Phú"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {member.decisionNumber ? (
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] font-mono font-bold text-blue-700 block truncate" title={member.decisionNumber}>
                                          {member.decisionNumber}
                                        </span>
                                        {member.decisionFile && (
                                          <button
                                            type="button"
                                            onClick={() => setViewingDecisionDoc({
                                              memberName: member.fullName,
                                              memberRole: member.role,
                                              memberCccd: member.cccd,
                                              associationName: selectedAssociation.name,
                                              decisionNumber: member.decisionNumber,
                                              decisionDate: member.decisionDate,
                                              joinDate: member.joinDate,
                                              file: member.decisionFile!
                                            })}
                                            className="text-[10px] text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                          >
                                            <FileText size={10} /> Xem tệp
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">
                                        {member.joinDate ? `Từ ${member.joinDate}` : "Ghi nhận hệ thống"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMemberForDetail(member)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                        title="Xem chi tiết hồ sơ thành viên"
                                      >
                                        <Eye size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditMember(member)}
                                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                        title="Sửa thông tin & Quyết định"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMember(member.cccd, member.fullName)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                        title="Xóa khỏi Chi hội"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </>
      ) : (
        /* Multi-role Matrix View */
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Matrix Header & Filters */}
          <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={17} className="text-amber-500" />
                  <span>Bảng tổng hợp Phân công Đa vai trò Cán bộ & Nhân sự</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Theo dõi danh sách các cá nhân kiêm nhiệm nhiều vị trí (Đảng viên, Ban điều hành, ANTT, Hòa giải, Đoàn thể, Chính sách). Tích chọn nhanh để bổ sung vai trò.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveViewMode("associations")}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  title="Quay lại danh mục chi hội và hội viên"
                >
                  <Award size={13} className="text-emerald-700" />
                  <span>← Danh mục Chi hội</span>
                </button>
                <button
                  onClick={handleExportMultiRoleReport}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span>Xuất Excel</span>
                </button>
              </div>
            </div>

            {/* Filter Pills and Search */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-3 border-t border-slate-100">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên cư dân, số CCCD, vai trò, hoặc chi hội..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-slate-50/50"
                />
              </div>

              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
                {[
                  "Tất cả",
                  "Đa nhiệm (≥ 2 vai trò)",
                  "Có vai trò (≥ 1 vai trò)",
                  "Đảng viên",
                  "Chính quyền",
                  "Đoàn thể",
                  "Chính sách",
                  "Nhóm khác"
                ].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setMatrixFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      matrixFilterCategory === cat
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3.5 w-12 text-center">STT</th>
                    <th className="py-3 px-3.5 min-w-[160px]">Cán bộ / Cư dân</th>
                    <th className="py-3 px-3.5 min-w-[160px]">Thông tin liên lạc</th>
                    <th className="py-3 px-3.5 w-28 text-center">Số vai trò</th>
                    <th className="py-3 px-3.5 min-w-[280px]">Chi tiết Vai trò & Tổ chức</th>
                    <th className="py-3 px-3.5 w-24 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMultiRoleSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Không tìm thấy cư dân nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredMultiRoleSummary.map((item, idx) => {
                      const isProminentHuy = item.resident.fullName.includes("Nguyễn Trung Huy");
                      return (
                        <tr 
                          key={item.resident.cccd} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isProminentHuy ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="py-3 px-3.5 text-center text-slate-400 font-mono font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{item.resident.fullName}</span>
                              {item.rolesCount > 1 && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                  Đa nhiệm
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              CCCD: {item.resident.cccd}
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="text-slate-700 font-mono font-medium text-xs">
                              {item.resident.phone || "Chưa cập nhật"}
                            </div>
                            <div className="text-slate-400 text-[11px] truncate max-w-[200px] mt-0.5">
                              {item.resident.address}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              item.rolesCount >= 3 
                                ? "bg-purple-100 text-purple-800 border border-purple-200" 
                                : item.rolesCount === 2 
                                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                : item.rolesCount === 1 
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {item.rolesCount} vai trò
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            {item.roles.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">Chưa phân công nhóm nào</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-xl">
                                {item.roles.map((r, rIdx) => {
                                  const isDang = r.section === "Đảng viên";
                                  const isChinhQuyen = r.section === "Chính quyền";
                                  const isDoanThe = r.section === "Đoàn thể";
                                  const isChinhSach = r.section === "Chính sách";
                                  return (
                                    <span
                                      key={rIdx}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                        isDang ? "bg-rose-50 text-rose-800 border-rose-200" :
                                        isChinhQuyen ? "bg-amber-50 text-amber-900 border-amber-200" :
                                        isDoanThe ? "bg-blue-50 text-blue-800 border-blue-200" :
                                        isChinhSach ? "bg-purple-50 text-purple-800 border-purple-200" :
                                        "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      }`}
                                      title={`${r.groupName} - Vai trò: ${r.role}`}
                                    >
                                      <strong className="font-semibold">{r.groupName}:</strong> {r.role}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenQuickAssignModal(item.resident.cccd)}
                              className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs mr-1.5"
                              title="Gán thêm vai trò hoặc nhóm mới"
                            >
                              <Sparkles size={12} className="text-amber-700" />
                              <span>Gán nhanh</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const matchedMember = associations.flatMap(a => a.members).find(m => m.cccd === item.resident.cccd);
                                const memberObj: AssociationMember = matchedMember || {
                                  id: "M_" + item.resident.cccd.slice(-4),
                                  fullName: item.resident.fullName,
                                  role: item.roles[0]?.role || "Cư dân",
                                  cccd: item.resident.cccd,
                                  phone: item.resident.phone,
                                  birthDate: item.resident.birthDate
                                };
                                setSelectedMemberForDetail(memberObj);
                              }}
                              className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-blue-400 hover:text-blue-700"
                              title="Xem chi tiết hồ sơ cán bộ / cư dân"
                            >
                              <Eye size={12} className="text-blue-600" />
                              <span>Chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add New Association (Chi hội) Modal */}
      {showAddAssocModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Tạo Chi hội / Tổ chức phong trào mới</h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Thêm chi hội tự quản thuộc mặt trận ban dân vận địa phương</p>
              </div>
              <button 
                onClick={() => setShowAddAssocModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAssociation} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Tên Chi hội / Tổ chức *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Chi hội Khuyến học, Câu lạc bộ dưỡng sinh..."
                  value={newAssocName}
                  onChange={(e) => setNewAssocName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Phân nhóm / Thể loại *</label>
                <select
                  value={newAssocCategory}
                  onChange={(e) => setNewAssocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="Đoàn thể nhân dân">Đoàn thể nhân dân</option>
                  <option value="Chính trị - Xã hội">Chính trị - Xã hội</option>
                  <option value="An ninh - Quốc phòng">An ninh - Quốc phòng</option>
                  <option value="Hội quần chúng">Hội quần chúng</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Người đứng đầu (Chọn từ danh sách Cư dân có sẵn) *</label>
                <select
                  value={newAssocLeaderCccd}
                  onChange={(e) => setNewAssocLeaderCccd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="">-- Chọn đại diện đứng đầu --</option>
                  {residents.map(r => (
                    <option key={r.cccd} value={r.cccd}>
                      {r.fullName} - CCCD: {r.cccd} ({r.occupation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Chức danh của người đứng đầu</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Chi hội trưởng, Chủ nhiệm CLB, Bí thư..."
                  value={newAssocLeaderRole}
                  onChange={(e) => setNewAssocLeaderRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Mô tả mục tiêu & nhiệm vụ</label>
                <textarea 
                  rows={3}
                  placeholder="Mô tả tóm tắt tôn chỉ mục đích hoạt động..."
                  value={newAssocDesc}
                  onChange={(e) => setNewAssocDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setShowAddAssocModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Tạo chi hội mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Association Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-slate-900 text-white p-4 px-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <UserPlus size={16} className="text-emerald-400" />
                  Ghi danh Cư dân vào Chi hội & Tải hồ sơ Quyết định
                </h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Chi hội: <strong className="text-emerald-300">{selectedAssociation.name}</strong></p>
              </div>
              <button 
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* 1. Chọn Cư dân */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">1. Tìm kiếm và chọn cư dân *</label>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    placeholder="Nhập tên hoặc CCCD để lọc nhanh danh sách..."
                    value={residentSearchTerm}
                    onChange={(e) => setResidentSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={selectedResidentCccd}
                  onChange={(e) => setSelectedResidentCccd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">-- Chọn thành viên từ cơ sở dữ liệu ({searchedResidents.length} cư dân) --</option>
                  {searchedResidents.map(r => (
                    <option key={r.cccd} value={r.cccd}>
                      {r.fullName} - CCCD: {r.cccd} ({r.birthDate ? r.birthDate.split("/").pop() : "N/A"}) - {r.occupation || "Cư dân"}
                    </option>
                  ))}
                </select>
                {searchedResidents.length === 0 && (
                  <span className="text-[10px] text-rose-500 block">Không tìm thấy cư dân nào hợp lệ chưa tham gia.</span>
                )}
              </div>

              {/* 2. Chức vụ & Ngày tham gia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">2. Chức danh / Vai trò *</label>
                    <button
                      type="button"
                      onClick={() => setShowRoleManagerModal(true)}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      title="Thêm, sửa, xóa chức danh linh hoạt trong dropdown"
                    >
                      <Settings size={11} />
                      <span>Quản lý</span>
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <select
                      value={memberRole}
                      onChange={(e) => {
                        if (e.target.value === "__MANAGE_ROLES__") {
                          setShowRoleManagerModal(true);
                        } else {
                          setMemberRole(e.target.value);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      {customRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                      <option value="__MANAGE_ROLES__">⚙️ + Thêm / Sửa / Xóa chức danh...</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowRoleManagerModal(true)}
                      className="px-2 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Tùy biến danh mục chức danh"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">3. Ngày tham gia / Kết nạp</label>
                    <button
                      type="button"
                      onClick={() => setMemberJoinDate(new Date().toLocaleDateString("vi-VN"))}
                      className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Hôm nay
                    </button>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input 
                      type="text"
                      placeholder="DD/MM/YYYY (ví dụ: 15/08/2024)"
                      value={memberJoinDate}
                      onChange={(e) => setMemberJoinDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Số quyết định & Ngày quyết định */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">4. Số Quyết định công nhận</label>
                  <div className="relative">
                    <FileCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input 
                      type="text"
                      placeholder="Ví dụ: QĐ-18/UBND-KP3"
                      value={memberDecisionNumber}
                      onChange={(e) => setMemberDecisionNumber(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">5. Ngày ban hành Quyết định</label>
                  <input 
                    type="text"
                    placeholder="DD/MM/YYYY (ví dụ: 10/08/2024)"
                    value={memberDecisionDate}
                    onChange={(e) => setMemberDecisionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* 4. Tải lên tệp Quyết định (Hình ảnh, File PDF) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">
                    6. Đính kèm Quyết định (Hình ảnh, File PDF)
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-400">Gắn mẫu test:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const residentObj = residents.find(r => r.cccd === selectedResidentCccd);
                        const name = residentObj ? residentObj.fullName : "Hoi_vien";
                        setMemberDecisionFile({
                          name: `Quyet_dinh_ket_nap_${name.replace(/\s+/g, "_")}.pdf`,
                          type: "pdf",
                          size: "285 KB",
                          url: "data:application/pdf;base64,JVBERi0xLjQKJ"
                        });
                        if (!memberDecisionNumber) setMemberDecisionNumber("QĐ-24/UBND-KP3");
                        if (!memberJoinDate) setMemberJoinDate(new Date().toLocaleDateString("vi-VN"));
                        showToast("Đã gắn mẫu file PDF Quyết định", "success");
                      }}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      [Mẫu PDF]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const residentObj = residents.find(r => r.cccd === selectedResidentCccd);
                        const name = residentObj ? residentObj.fullName : "Hoi_vien";
                        setMemberDecisionFile({
                          name: `Anh_chup_Quyet_dinh_${name.replace(/\s+/g, "_")}.jpg`,
                          type: "image",
                          size: "420 KB",
                          url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=900"
                        });
                        if (!memberDecisionNumber) setMemberDecisionNumber("QĐ-25/UBND-KP3");
                        if (!memberJoinDate) setMemberJoinDate(new Date().toLocaleDateString("vi-VN"));
                        showToast("Đã gắn mẫu ảnh chụp Quyết định", "success");
                      }}
                      className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                    >
                      [Mẫu Ảnh]
                    </button>
                  </div>
                </div>

                {memberDecisionFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {memberDecisionFile.type === "pdf" ? (
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{memberDecisionFile.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="uppercase font-bold text-emerald-700 font-mono">{memberDecisionFile.type}</span>
                          <span>•</span>
                          <span>{memberDecisionFile.size || "Sẵn sàng"}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMemberDecisionFile(null)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                      title="Gỡ bỏ tệp này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                    <UploadCloud size={24} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Kéo thả hoặc nhấp để chọn tệp tải lên</span>
                    <span className="text-[10px] text-slate-400">Hỗ trợ file PDF hoặc hình ảnh (PNG, JPG, WebP) tối đa 20MB</span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFileUpload(file, setMemberDecisionFile);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleAddMemberFromResidents}
                  disabled={!selectedResidentCccd}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <UserPlus size={14} />
                  Ghi danh thành viên
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Toast Notification Container */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 animate-pulse" 
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {toast.message}
          </div>
        </div>
      )}

      {/* Modern Custom Member Deletion Confirmation Dialog */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Xác nhận xóa thành viên</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa thành viên <strong className="text-slate-800">{memberToDelete.name}</strong> khỏi chi hội <strong className="text-emerald-800">{selectedAssociation.name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  performRemoveMember(memberToDelete.cccd);
                  setMemberToDelete(null);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Custom Member Edit Dialog (Role, Join Date, Decision Number & File Upload) */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-slate-900 text-white p-4 px-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Edit2 size={16} className="text-emerald-400" />
                  Cập nhật Hồ sơ & Quyết định Thành viên
                </h3>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Thành viên: <strong className="text-white">{editingMember.fullName}</strong> - CCCD: <span className="font-mono text-emerald-300">{editingMember.cccd}</span>
                </p>
              </div>
              <button 
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveMember} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Member overview banner */}
              {/* Member overview banner with Avatar & Upload */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="relative shrink-0">
                  <img
                    src={editingMember.avatar || residents.find(r => r.cccd === editingMember.cccd)?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt={editingMember.fullName}
                    className="w-14 h-14 rounded-full border-2 border-emerald-500/50 object-cover bg-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <label 
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md border-2 border-white transition-transform hover:scale-110"
                    title="Tải lên ảnh đại diện mới"
                  >
                    <Camera size={12} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadMemberAvatar(editingMember.cccd, file);
                      }}
                    />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{editingMember.fullName}</span>
                    <span className="text-[10px] font-mono text-slate-500">CCCD: {editingMember.cccd}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Chi hội: <strong className="text-emerald-800">{selectedAssociation.name}</strong> • Năm sinh: <strong className="text-slate-800">{editingMember.birthDate ? editingMember.birthDate.split("/").pop() : "N/A"}</strong>
                  </div>
                  <label className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1 mt-1">
                    <Camera size={12} />
                    <span>Thay đổi hình đại diện</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadMemberAvatar(editingMember.cccd, file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Chức danh / Vai trò linh hoạt */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">1. Chức danh / Vai trò trong Chi hội *</label>
                  <button
                    type="button"
                    onClick={() => setShowRoleManagerModal(true)}
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    title="Thêm, sửa, xóa chức danh linh hoạt trong dropdown"
                  >
                    <Settings size={11} />
                    <span>Quản lý chức danh</span>
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <select 
                    value={editMemberRole}
                    onChange={(e) => {
                      if (e.target.value === "__MANAGE_ROLES__") {
                        setShowRoleManagerModal(true);
                      } else {
                        setEditMemberRole(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-white font-medium"
                  >
                    {customRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                    <option value="__MANAGE_ROLES__">⚙️ + Thêm / Sửa / Xóa chức danh...</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowRoleManagerModal(true)}
                    className="px-2.5 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Tùy biến danh mục chức danh"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Hoặc tự gõ chức danh khác..."
                  value={editMemberRole}
                  onChange={(e) => setEditMemberRole(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-medium text-slate-800"
                />
              </div>

              {/* Ngày tham gia & Ngày quyết định */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">2. Ngày tham gia chi hội</label>
                    <button
                      type="button"
                      onClick={() => setEditMemberJoinDate(new Date().toLocaleDateString("vi-VN"))}
                      className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Hôm nay
                    </button>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input 
                      type="text"
                      placeholder="DD/MM/YYYY (ví dụ: 15/08/2023)"
                      value={editMemberJoinDate}
                      onChange={(e) => setEditMemberJoinDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">3. Số Quyết định công nhận</label>
                  <div className="relative">
                    <FileCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input 
                      type="text"
                      placeholder="Ví dụ: QĐ-12/ĐU-AP"
                      value={editMemberDecisionNumber}
                      onChange={(e) => setEditMemberDecisionNumber(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Ngày ký quyết định */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">4. Ngày ký / ban hành Quyết định</label>
                <input 
                  type="text"
                  placeholder="DD/MM/YYYY (ví dụ: 10/08/2023)"
                  value={editMemberDecisionDate}
                  onChange={(e) => setEditMemberDecisionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Tải lên / Thay thế tệp Quyết định */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">
                    5. Tệp Quyết định đính kèm (Hình ảnh, PDF)
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-400">Gắn mẫu:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditMemberDecisionFile({
                          name: `Quyet_dinh_chuan_y_${editingMember.fullName.replace(/\s+/g, "_")}.pdf`,
                          type: "pdf",
                          size: "245 KB",
                          url: "data:application/pdf;base64,JVBERi0xLjQKJ"
                        });
                        if (!editMemberDecisionNumber) setEditMemberDecisionNumber("QĐ-08/UBND-KP3");
                        showToast("Đã gắn mẫu Quyết định (file PDF)", "success");
                      }}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      [Mẫu PDF]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditMemberDecisionFile({
                          name: `Anh_chup_QĐ_${editingMember.fullName.replace(/\s+/g, "_")}.jpg`,
                          type: "image",
                          size: "380 KB",
                          url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=900"
                        });
                        if (!editMemberDecisionNumber) setEditMemberDecisionNumber("QĐ-14/UBND-KP3");
                        showToast("Đã gắn mẫu ảnh chụp Quyết định", "success");
                      }}
                      className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                    >
                      [Mẫu Ảnh]
                    </button>
                  </div>
                </div>

                {editMemberDecisionFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {editMemberDecisionFile.type === "pdf" ? (
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{editMemberDecisionFile.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="uppercase font-bold text-emerald-700 font-mono">{editMemberDecisionFile.type}</span>
                          <span>•</span>
                          <span>{editMemberDecisionFile.size || "Sẵn sàng"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingDecisionDoc({
                          memberName: editingMember.fullName,
                          memberRole: editMemberRole,
                          memberCccd: editingMember.cccd,
                          associationName: selectedAssociation.name,
                          decisionNumber: editMemberDecisionNumber,
                          decisionDate: editMemberDecisionDate,
                          joinDate: editMemberJoinDate,
                          file: editMemberDecisionFile!
                        })}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        title="Xem thử tệp này"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditMemberDecisionFile(null)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                        title="Gỡ bỏ tệp này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                    <UploadCloud size={24} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Kéo thả hoặc nhấp để tải lên tệp mới</span>
                    <span className="text-[10px] text-slate-400">Hỗ trợ file PDF hoặc hình ảnh (PNG, JPG, WebP) tối đa 20MB</span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFileUpload(file, setEditMemberDecisionFile);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal (Văn bản Quyết định Công nhận / Kết nạp) */}
      {viewingDecisionDoc && (
        <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 px-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${viewingDecisionDoc.file.type === 'pdf' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {viewingDecisionDoc.file.type === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                    Hồ sơ Quyết định Công nhận & Kết nạp
                    <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-300">
                      {viewingDecisionDoc.file.type}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                    <span>Thành viên: <strong>{viewingDecisionDoc.memberName}</strong></span>
                    <span>•</span>
                    <span>Chi hội: <strong>{viewingDecisionDoc.associationName}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingDecisionDoc.file)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Tải về tệp này"
                >
                  <Download size={13} /> Tải tệp về
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="In văn bản"
                >
                  <Printer size={13} /> In
                </button>
                <button 
                  type="button"
                  onClick={() => setViewingDecisionDoc(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer ml-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Sub-header info bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
              <div className="flex items-center gap-4">
                <span>Số QĐ: <strong className="font-mono text-blue-700">{viewingDecisionDoc.decisionNumber || "QĐ-HĐND-AP"}</strong></span>
                <span>Ngày ký: <strong className="text-slate-800">{viewingDecisionDoc.decisionDate || viewingDecisionDoc.joinDate || "Ghi nhận hệ thống"}</strong></span>
                <span>Chức vụ: <strong className="text-emerald-700">{viewingDecisionDoc.memberRole}</strong></span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Tệp: {viewingDecisionDoc.file.name} {viewingDecisionDoc.file.size && `(${viewingDecisionDoc.file.size})`}
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70">
              {viewingDecisionDoc.file.type === "image" ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 max-w-full">
                    <img 
                      src={viewingDecisionDoc.file.url} 
                      alt={viewingDecisionDoc.file.name}
                      className="max-h-[520px] w-auto object-contain rounded-lg mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=900";
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">Hình ảnh bản quét / chụp quyết định kết nạp chính thức</span>
                </div>
              ) : (
                /* PDF Display */
                <div className="space-y-4">
                  {viewingDecisionDoc.file.url.startsWith("data:application/pdf") ? (
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                      <iframe 
                        src={viewingDecisionDoc.file.url} 
                        title={viewingDecisionDoc.file.name} 
                        className="w-full h-[520px]"
                      />
                    </div>
                  ) : (
                    /* Standard Official Administrative Decision Certificate Layout */
                    <div className="bg-white p-8 md:p-10 rounded-2xl shadow-md border border-slate-300 max-w-2xl mx-auto space-y-6 text-slate-800 font-serif">
                      {/* National Header */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                        <div className="text-center font-sans text-xs space-y-0.5">
                          <div className="font-bold text-slate-800 uppercase tracking-tight">UBND PHƯỜNG AN PHÚ</div>
                          <div className="font-bold text-emerald-800 uppercase text-[11px]">KHU PHỐ 3 - BAN ĐIỀU HÀNH</div>
                          <div className="text-[10px] text-slate-500 font-mono pt-1">Số: {viewingDecisionDoc.decisionNumber || "12/QĐ-UBND-KP3"}</div>
                        </div>

                        <div className="text-center space-y-0.5 font-sans">
                          <div className="font-black text-xs uppercase tracking-wider text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                          <div className="font-bold text-xs text-slate-700 underline decoration-1 underline-offset-4">Độc lập - Tự do - Hạnh phúc</div>
                          <div className="text-[10px] text-slate-400 italic pt-1">An Phú, ngày {viewingDecisionDoc.decisionDate || viewingDecisionDoc.joinDate || "15 tháng 08 năm 2024"}</div>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="text-center space-y-1.5 py-2 font-sans">
                        <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wide">QUYẾT ĐỊNH</h2>
                        <p className="text-xs font-bold text-slate-700 italic">
                          Về việc công nhận hội viên và chuẩn y nhiệm vụ trong {viewingDecisionDoc.associationName}
                        </p>
                      </div>

                      {/* Content */}
                      <div className="space-y-3 text-xs leading-relaxed font-sans text-slate-700">
                        <p className="italic text-slate-600">
                          - Căn cứ Quy chế tổ chức và hoạt động của Khu phố và các Chi hội Đoàn thể cơ sở;<br/>
                          - Căn cứ Điều lệ và Hướng dẫn thực hiện Điều lệ của {viewingDecisionDoc.associationName};<br/>
                          - Xét đơn tự nguyện gia nhập và phẩm chất đạo đức, tinh thần trách nhiệm của công dân;
                        </p>

                        <div className="font-bold text-slate-900 text-center uppercase tracking-wider py-1">QUYẾT ĐỊNH:</div>

                        <div className="space-y-2">
                          <p>
                            <strong>Điều 1.</strong> Công nhận Ông/Bà: <strong className="text-slate-900 text-sm font-bold uppercase">{viewingDecisionDoc.memberName}</strong>
                            <br/>
                            Số CCCD: <span className="font-mono">{viewingDecisionDoc.memberCccd}</span>.
                            <br/>
                            Tham gia sinh hoạt tại: <strong>{viewingDecisionDoc.associationName}</strong> với vai trò/chức danh: <strong className="text-emerald-800">{viewingDecisionDoc.memberRole}</strong>.
                          </p>
                          <p>
                            <strong>Điều 2.</strong> Ngày chính thức tham gia và bắt đầu hưởng quyền lợi, thực hiện nghĩa vụ hội viên từ ngày: <strong>{viewingDecisionDoc.joinDate || "Theo ngày ban hành"}</strong>.
                          </p>
                          <p>
                            <strong>Điều 3.</strong> Ban Điều hành Khu phố, Ban Chấp hành {viewingDecisionDoc.associationName} và Ông/Bà <strong>{viewingDecisionDoc.memberName}</strong> chịu trách nhiệm thi hành Quyết định này.
                          </p>
                        </div>
                      </div>

                      {/* Signature and Seal */}
                      <div className="flex justify-between items-end pt-6 font-sans">
                        <div className="text-[10px] text-slate-500 italic space-y-0.5">
                          <div><strong>Nơi nhận:</strong></div>
                          <div>- Như Điều 3;</div>
                          <div>- UBND Phường (báo cáo);</div>
                          <div>- Lưu hồ sơ Chi hội.</div>
                        </div>

                        <div className="text-center space-y-1 relative pr-4">
                          <div className="text-[11px] font-bold text-slate-800 uppercase">TM. BAN ĐIỀU HÀNH / CHI HỘI</div>
                          <div className="text-[10px] text-slate-500 italic">Trưởng ban / Chi hội trưởng</div>
                          
                          {/* Simulated Red Official Stamp */}
                          <div className="relative py-4 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full border-2 border-dashed border-rose-600/70 text-rose-600 flex flex-col items-center justify-center text-[8px] font-bold uppercase leading-tight rotate-[-12deg] shadow-2xs pointer-events-none select-none">
                              <span className="text-[7px]">★ KHU PHỐ 3 ★</span>
                              <span className="font-extrabold text-[8px] text-rose-700">BAN ĐIỀU HÀNH</span>
                              <span className="text-[6px] text-rose-500">ĐÃ CHUẨN Y</span>
                            </div>
                          </div>
                          <div className="font-bold text-xs text-slate-900 pt-1">Đã ký và đóng dấu</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 px-6 bg-white border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
              <span className="text-slate-400 text-[11px]">
                Hệ thống Quản lý Chi hội & Đoàn thể Khu phố 3 - Phường An Phú
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingDecisionDoc.file)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Tải về máy ({viewingDecisionDoc.file.size || "Tệp"})
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDecisionDoc(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Association (Chi hội) Modal */}
      {showEditAssocModal && assocToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Pencil size={16} className="text-emerald-400" />
                  Chỉnh sửa Thông tin Chi hội
                </h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Mã chi hội: {assocToEdit.id}</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditAssocModal(false);
                  setAssocToEdit(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateAssociation} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Tên Chi hội / Tổ chức *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Chi hội Khuyến học, Câu lạc bộ dưỡng sinh..."
                  value={editAssocName}
                  onChange={(e) => setEditAssocName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Phân nhóm / Thể loại *</label>
                <select
                  value={editAssocCategory}
                  onChange={(e) => setEditAssocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="Đoàn thể nhân dân">Đoàn thể nhân dân</option>
                  <option value="Chính trị - Xã hội">Chính trị - Xã hội</option>
                  <option value="An ninh - Quốc phòng">An ninh - Quốc phòng</option>
                  <option value="Hội quần chúng">Hội quần chúng</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Người đứng đầu (Chọn từ danh sách Cư dân)</label>
                <select
                  value={editAssocLeaderCccd}
                  onChange={(e) => setEditAssocLeaderCccd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="">-- Giữ nguyên hoặc chọn người khác --</option>
                  {residents.map(r => (
                    <option key={r.cccd} value={r.cccd}>
                      {r.fullName} - CCCD: {r.cccd} ({r.occupation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Chức danh người đứng đầu</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Chi hội trưởng, Chủ nhiệm CLB, Bí thư..."
                  value={editAssocLeaderRole}
                  onChange={(e) => setEditAssocLeaderRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Mô tả mục tiêu & nhiệm vụ</label>
                <textarea 
                  rows={3}
                  placeholder="Mô tả tóm tắt tôn chỉ mục đích hoạt động..."
                  value={editAssocDesc}
                  onChange={(e) => setEditAssocDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditAssocModal(false);
                    setAssocToEdit(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Dissolve Association Confirmation Modal */}
      {assocToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 border border-rose-100">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-rose-100">
                <AlertTriangle size={28} />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-black text-slate-900 text-base">Xác nhận Giải thể / Xóa Chi hội?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bạn đang chuẩn bị giải thể hoặc xóa tổ chức:
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1">
                  <div className="font-bold text-slate-800 text-sm">{assocToDelete.name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Phân loại: <strong className="text-slate-700">{assocToDelete.category}</strong></span>
                    <span>Quy mô: <strong className="text-rose-600">{assocToDelete.members.length} thành viên</strong></span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Người phụ trách: <strong className="text-slate-700">{assocToDelete.leaderName}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-left">
                  ⚠️ Lưu ý: Hành động này sẽ gỡ bỏ hồ sơ tổ chức của chi hội khỏi danh sách điều hành khu phố.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAssocToDelete(null)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy giữ lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAssoc}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Xác nhận giải thể
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 1. MODAL CHI TIẾT THÀNH VIÊN CHI HỘI (Chuẩn Reference Modal KP3 như phân hệ Cư Dân & Hỗ trợ tải lên ảnh đại diện) */}
      {selectedMemberForDetail && (() => {
        const member = selectedMemberForDetail;
        const matchedRes = residents.find(r => r.cccd === member.cccd);
        const memberAvatar = member.avatar || matchedRes?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
        const isPartyMem = partyMembers.some(p => p.cccd === member.cccd);

        // Find all roles this member holds across all associations in KP3
        const allAssociatedRoles = associations
          .filter(a => a.members.some(m => m.cccd === member.cccd))
          .map(a => {
            const m = a.members.find(mem => mem.cccd === member.cccd)!;
            return {
              assocName: a.name,
              assocCategory: a.category,
              role: m.role,
              decisionNumber: m.decisionNumber,
              joinDate: m.joinDate,
              isCurrentAssoc: a.id === selectedAssociation.id
            };
          });

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setSelectedMemberForDetail(null)}
            role="dialog"
            aria-modal="true"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-[500px] max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 relative"
            >
              {/* Header: Nền xanh navy đậm chuyển sắc, căn giữa ảnh, tên, vai trò */}
              <div className="bg-gradient-to-b from-[#12233c] via-[#0f1f35] to-[#0a1626] text-white px-5 pt-6 pb-5 relative shrink-0 text-center shadow-inner">
                {/* Nút đóng ở góc trên bên phải */}
                <button 
                  onClick={() => setSelectedMemberForDetail(null)}
                  className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white transition-all cursor-pointer backdrop-blur-xs focus:outline-none focus:ring-2 focus:ring-white/40"
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>

                {/* Avatar tròn 76px căn giữa kèm nút Camera upload ảnh */}
                <div className="flex justify-center mb-3">
                  <div className="relative group">
                    <img 
                      src={memberAvatar} 
                      alt={member.fullName}
                      className="w-20 h-20 rounded-full border-3 border-emerald-400/90 shadow-lg object-cover bg-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    {isPartyMem && (
                      <span 
                        className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-xs"
                        title="Đảng viên ĐCSVN"
                      >
                        ★
                      </span>
                    )}
                    {/* Camera upload badge */}
                    <label 
                      className="absolute inset-0 rounded-full bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-[10px] font-semibold gap-0.5 backdrop-blur-2xs"
                      title="Bấm để tải lên ảnh đại diện mới"
                    >
                      <Camera size={18} />
                      <span>Đổi ảnh</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadMemberAvatar(member.cccd, file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Họ tên thành viên chữ trắng, đậm, căn giữa */}
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug px-4">
                  {member.fullName}
                </h2>

                {/* Badge Chi hội & Chức danh */}
                <div className="flex items-center justify-center gap-2 mt-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-900/90 text-emerald-200 border border-emerald-600/40 shadow-2xs">
                    {selectedAssociation.name}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 shadow-2xs">
                    {member.role}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 shadow-2xs">
                    CCCD: {member.cccd}
                  </span>
                </div>
              </div>

              {/* Thân modal: Nền xám nhạt, padding gọn gàng, các thẻ card chuyên nghiệp */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-100/70 text-xs">
                
                {/* THẺ 1: Thông tin định danh & Tham gia Chi hội */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <CreditCard size={15} className="text-emerald-700" />
                      <span>1. Định danh & Nhiệm vụ Chi hội</span>
                    </div>
                    <label className="text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer">
                      <Camera size={12} />
                      <span>Upload ảnh</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadMemberAvatar(member.cccd, file);
                        }}
                      />
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 text-[11px]">Số CCCD / Định danh:</span>
                      <span className="font-mono font-bold text-slate-900 tracking-wider text-xs">
                        {member.cccd}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 py-1 border-b border-slate-50">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Chức danh / Vai trò:</span>
                        <span className="font-bold text-emerald-800">{member.role}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Ngày tham gia:</span>
                        <span className="font-semibold text-slate-800">
                          {member.joinDate || "Ghi nhận hệ thống"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500 text-[11px]">Đảng viên ĐCSVN:</span>
                      <span className={isPartyMem ? "font-bold text-rose-600" : "font-bold text-slate-500"}>
                        {isPartyMem ? "★ Đảng viên chính thức" : "Quần chúng"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* THẺ 2: Cư trú & Liên hệ */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-xs">
                    <Home size={15} className="text-blue-700" />
                    <span>2. Thông tin cư trú & Liên hệ</span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 py-1 border-b border-slate-50">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Số điện thoại:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {member.phone || matchedRes?.phone || "Chưa cập nhật"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Ngày / Năm sinh:</span>
                        <span className="font-semibold text-slate-800">
                          {member.birthDate || matchedRes?.birthDate || "Chưa cập nhật"}
                        </span>
                      </div>
                    </div>

                    <div className="py-1 border-b border-slate-50">
                      <span className="text-slate-500 text-[11px] block">Địa chỉ nơi cư trú:</span>
                      <span className="font-medium text-slate-800">
                        {matchedRes?.address || "Khu phố 3, Phường An Phú, TP. Thủ Đức"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-1">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Mã Hộ gia đình:</span>
                        <span className="font-mono font-semibold text-blue-800">
                          {matchedRes?.householdId || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Tình trạng cư trú:</span>
                        <span className="font-semibold text-emerald-800">
                          {matchedRes?.status || "Thường trú"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THẺ 3: Hồ sơ Quyết định công nhận */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <FileCheck size={15} className="text-amber-600" />
                      <span>3. Hồ sơ & Quyết định công nhận</span>
                    </div>
                    {member.decisionFile && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Có tệp đính kèm
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 py-1 border-b border-slate-50">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Số Quyết định:</span>
                        <span className="font-mono font-bold text-blue-700">
                          {member.decisionNumber || "Chưa nhập số QĐ"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Ngày ký quyết định:</span>
                        <span className="font-mono text-slate-700">
                          {member.decisionDate || "N/A"}
                        </span>
                      </div>
                    </div>

                    {member.decisionFile ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {member.decisionFile.type === "pdf" ? (
                            <FileText size={16} className="text-rose-600 shrink-0" />
                          ) : (
                            <ImageIcon size={16} className="text-emerald-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate" title={member.decisionFile.name}>
                              {member.decisionFile.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {member.decisionFile.size || "Tệp văn bản"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberForDetail(null);
                              setViewingDecisionDoc({
                                memberName: member.fullName,
                                memberRole: member.role,
                                memberCccd: member.cccd,
                                associationName: selectedAssociation.name,
                                decisionNumber: member.decisionNumber,
                                decisionDate: member.decisionDate,
                                joinDate: member.joinDate,
                                file: member.decisionFile!
                              });
                            }}
                            className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            Xem văn bản
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(member.decisionFile!)}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                            title="Tải về máy"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-1">
                        Chưa có văn bản Quyết định dạng tệp đính kèm. Bạn có thể bấm "Chỉnh sửa" để tải lên.
                      </p>
                    )}
                  </div>
                </div>

                {/* THẺ 4: Đa vai trò - Các vị trí / Kiêm nhiệm khác tại Khu phố 3 */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <Sparkles size={15} className="text-amber-500" />
                      <span>4. Đa vai trò & Kiêm nhiệm tại Khu phố 3</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      {allAssociatedRoles.length} tổ chức
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {allAssociatedRoles.map((roleItem, idx) => (
                      <div 
                        key={idx}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                          roleItem.isCurrentAssoc 
                            ? "bg-emerald-50/70 border-emerald-200" 
                            : "bg-slate-50/60 border-slate-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {roleItem.assocName}
                            </span>
                            {roleItem.isCurrentAssoc && (
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Hiện tại
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            Chức danh: <strong className="text-slate-700">{roleItem.role}</strong>
                            {roleItem.decisionNumber ? ` • QĐ: ${roleItem.decisionNumber}` : ""}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {roleItem.assocCategory}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-3.5 px-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                <label className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all">
                  <Camera size={14} className="text-emerald-700" />
                  <span>Đổi ảnh đại diện</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadMemberAvatar(member.cccd, file);
                    }}
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberForDetail(null);
                      handleOpenEditMember(member);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Edit2 size={13} />
                    <span>Sửa hồ sơ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMemberForDetail(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. MODAL PHÂN CÔNG ĐA VAI TRÒ & GÁN NHÓM NHANH (QUICK ASSIGN) */}
      {showQuickAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-700 text-white p-5 flex justify-between items-start shrink-0 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-white/20 text-white font-mono">
                    Đa vai trò & Đa nhiệm
                  </span>
                  <span className="text-amber-200 text-xs font-semibold">Khu phố 3</span>
                </div>
                <h3 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-200" />
                  Phân công Nhanh Đa vai trò - Gán Cư dân vào các Nhóm / Chi hội
                </h3>
                <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
                  01 Cư dân có thể đảm nhiệm nhiều vai trò cùng lúc (Ví dụ: Nguyễn Trung Huy có thể là Đảng viên, Trưởng Ban điều hành, Tổ trưởng Tổ hòa giải, Đội viên ANTT cơ sở...). Chỉ cần đánh dấu hoặc tích chọn để thêm nhanh vào các nhóm khác.
                </p>
              </div>
              <button 
                onClick={() => setShowQuickAssignModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab selection: Gán theo Cư dân VS Gán theo Nhóm */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 pt-3 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setQuickAssignTab("by-resident")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickAssignTab === "by-resident"
                    ? "border-amber-600 text-amber-900 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserCheck size={14} />
                <span>1. Phân công theo Cư dân (Chọn cư dân rồi gán các vai trò)</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickAssignTab("by-group")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickAssignTab === "by-group"
                    ? "border-amber-600 text-amber-900 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users size={14} />
                <span>2. Gán nhóm hàng loạt (Chọn chi hội rồi tích chọn các cư dân)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {quickAssignTab === "by-resident" ? (
                /* TAB 1: GÁN THEO CƯ DÂN */
                <div className="space-y-4">
                  {/* Select target resident */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Chọn Cư dân để cấu hình Đa vai trò / Đa nhiệm *
                      </label>
                      <select
                        value={quickAssignResidentCccd}
                        onChange={(e) => handleSelectQuickAssignResident(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 font-medium"
                      >
                        {residents.map(r => (
                          <option key={r.cccd} value={r.cccd}>
                            {r.fullName} - CCCD: {r.cccd} ({r.occupation || "Cư dân"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selected resident quick summary */}
                    {(() => {
                      const res = residents.find(r => r.cccd === quickAssignResidentCccd);
                      if (!res) return null;
                      const currentRoles = associations.filter(a => a.members.some(m => m.cccd === res.cccd));

                      return (
                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
                          <img 
                            src={res.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                            alt={res.fullName}
                            className="w-10 h-10 rounded-full border border-amber-300 object-cover bg-slate-100 shrink-0"
                          />
                          <div className="text-xs min-w-0">
                            <div className="font-bold text-slate-900 truncate">{res.fullName}</div>
                            <div className="text-slate-500 text-[11px] font-mono">SĐT: {res.phone || "N/A"} • {res.address}</div>
                            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                              Hiện đang tham gia: <strong>{currentRoles.length}</strong> tổ chức / chi hội
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Target Groups Multi-select Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Tích chọn các Chi hội & Nhóm nhiệm vụ mà cư dân này đảm nhiệm:
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Đang chọn {Object.values(quickAssignGroupSelections).filter((g: any) => g.selected).length}/{TARGET_GROUPS.length} nhóm
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {TARGET_GROUPS.map(group => {
                        const selection = quickAssignGroupSelections[group.id] || { selected: false, role: group.defaultRole };
                        const isSelected = selection.selected;

                        return (
                          <div 
                            key={group.id}
                            className={`p-3.5 rounded-xl border transition-all ${
                              isSelected 
                                ? "bg-amber-50/60 border-amber-300 shadow-2xs ring-1 ring-amber-300/60" 
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleQuickAssignGroup(group.id)}
                                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                                />
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <span>{group.name}</span>
                                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                      {group.category}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{group.description}</p>
                                </div>
                              </label>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isSelected ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-400"
                              }`}>
                                {isSelected ? "Đã gán" : "Chưa tham gia"}
                              </span>
                            </div>

                            {/* Specific role input if selected */}
                            {isSelected && (
                              <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center gap-2">
                                <label className="text-[11px] font-semibold text-slate-600 shrink-0">Chức vụ đảm nhận:</label>
                                <input 
                                  type="text" 
                                  value={selection.role}
                                  onChange={(e) => handleUpdateQuickAssignRole(group.id, e.target.value)}
                                  placeholder="Ví dụ: Chi hội phó, Đội viên..."
                                  className="flex-1 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* TAB 2: GÁN THEO NHÓM (CHỌN CHI HỘI RỒI TÍCH NHIỀU CƯ DÂN) */
                <div className="space-y-4">
                  {/* Select target group */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Chọn Chi hội / Tổ chức mục tiêu để nạp cư dân vào *
                    </label>
                    <select
                      value={quickAssignTargetGroupId}
                      onChange={(e) => setQuickAssignTargetGroupId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      {TARGET_GROUPS.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.category}) - Vai trò mặc định: {g.defaultRole}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Residents search and selection list */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                          type="text"
                          placeholder="Lọc tên cư dân, số CCCD, nghề nghiệp..."
                          value={quickAssignResidentSearch}
                          onChange={(e) => setQuickAssignResidentSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = residents
                              .filter(r => !quickAssignResidentSearch.trim() || r.fullName.toLowerCase().includes(quickAssignResidentSearch.toLowerCase()) || r.cccd.includes(quickAssignResidentSearch))
                              .map(r => r.cccd);
                            setQuickAssignSelectedResidentCccds(filtered);
                          }}
                          className="text-amber-700 hover:underline font-semibold cursor-pointer"
                        >
                          Chọn tất cả lọc ({residents.filter(r => !quickAssignResidentSearch.trim() || r.fullName.toLowerCase().includes(quickAssignResidentSearch.toLowerCase()) || r.cccd.includes(quickAssignResidentSearch)).length})
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setQuickAssignSelectedResidentCccds([])}
                          className="text-slate-500 hover:underline font-semibold cursor-pointer"
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                      {residents
                        .filter(r => {
                          if (!quickAssignResidentSearch.trim()) return true;
                          const q = quickAssignResidentSearch.toLowerCase();
                          return r.fullName.toLowerCase().includes(q) || r.cccd.includes(q) || (r.occupation && r.occupation.toLowerCase().includes(q));
                        })
                        .map(res => {
                          const isChecked = quickAssignSelectedResidentCccds.includes(res.cccd);
                          
                          const targetGroupAssoc = associations.find(a => a.id === quickAssignTargetGroupId || a.name.toLowerCase() === TARGET_GROUPS.find(g => g.id === quickAssignTargetGroupId)?.name.toLowerCase());
                          const isAlreadyMember = targetGroupAssoc?.members.some(m => m.cccd === res.cccd);
                          const rolesCount = associations.filter(a => a.members.some(m => m.cccd === res.cccd)).length;

                          return (
                            <label
                              key={res.cccd}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-amber-50 border-amber-300 ring-1 ring-amber-300 shadow-2xs"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleBatchResidentCccd(res.cccd)}
                                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    <span className="truncate">{res.fullName}</span>
                                    {isAlreadyMember && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                        Đã là thành viên
                                      </span>
                                    )}
                                    {rolesCount > 1 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                                        {rolesCount} vai trò khác
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                    <span>CCCD: <strong className="font-mono text-slate-700">{res.cccd}</strong></span>
                                    <span>SĐT: <strong className="font-mono text-slate-700">{res.phone || "N/A"}</strong></span>
                                    <span className="truncate">{res.address}</span>
                                  </div>
                                </div>
                              </div>

                              <span className="text-xs text-amber-600 font-bold shrink-0">
                                {isChecked ? "✓ Đã chọn" : "+ Tích chọn"}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <div className="text-xs text-slate-600">
                {quickAssignTab === "by-resident" ? (
                  <span>
                    Đang thiết lập: <strong>{Object.values(quickAssignGroupSelections).filter((g: any) => g.selected).length}</strong> nhóm đối tượng cho cư dân đã chọn.
                  </span>
                ) : (
                  <span>
                    Đang chọn: <strong>{quickAssignSelectedResidentCccds.length}</strong> cư dân để thêm vào nhóm <strong>{TARGET_GROUPS.find(g => g.id === quickAssignTargetGroupId)?.name}</strong>.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowQuickAssignModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                {quickAssignTab === "by-resident" ? (
                  <button
                    type="button"
                    onClick={handleSaveQuickAssignByResident}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={16} /> Lưu & Cập nhật phân công
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveQuickAssignByGroup}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={16} /> Thêm {quickAssignSelectedResidentCccds.length} cư dân đã tích
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL QUẢN LÝ DANH MỤC CHỨC DANH / VAI TRÒ (Thêm, Sửa, Xóa chức danh linh hoạt trong Dropdown) */}
      {showRoleManagerModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 px-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Quản lý Danh mục Chức danh / Vai trò</h3>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Thêm mới, chỉnh sửa, xóa chức danh linh hoạt hiển thị trong dropdown Chi hội
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowRoleManagerModal(false);
                  setEditingRoleIndex(null);
                  setNewRoleInput("");
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Thêm chức danh mới */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <label className="font-bold text-emerald-900 block text-xs flex items-center gap-1.5">
                  <Plus size={14} className="text-emerald-700" />
                  <span>Thêm Chức danh / Vai trò mới vào danh mục:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ví dụ: Trưởng ban thanh tra nhân dân, Thủ quỹ, Phó Chủ nhiệm CLB..."
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomRole(newRoleInput);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomRole(newRoleInput)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Lọc tìm kiếm chức danh */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm chức danh trong danh mục..."
                    value={roleSearchFilter}
                    onChange={(e) => setRoleSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/60 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Khôi phục danh mục về các chức danh chuẩn mặc định?")) {
                      setCustomRoles(DEFAULT_ROLES);
                      try {
                        localStorage.setItem("kp3_association_roles", JSON.stringify(DEFAULT_ROLES));
                      } catch (e) {}
                      showToast("Đã khôi phục danh mục chức danh mặc định!", "success");
                    }
                  }}
                  className="text-[11px] text-slate-500 hover:text-emerald-700 hover:underline font-medium shrink-0 cursor-pointer"
                  title="Khôi phục danh sách chức danh mẫu chuẩn"
                >
                  Khôi phục mặc định
                </button>
              </div>

              {/* Danh sách các chức danh */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-1">
                  Danh mục chức danh hiện có ({customRoles.length}):
                </div>
                {customRoles
                  .filter(r => !roleSearchFilter.trim() || r.toLowerCase().includes(roleSearchFilter.trim().toLowerCase()))
                  .map((role, idx) => {
                    const isEditing = editingRoleIndex === idx;
                    // Count how many members are holding this role
                    const membersCount = associations.reduce((acc, a) => 
                      acc + a.members.filter(m => m.role === role).length, 0
                    );

                    return (
                      <div 
                        key={idx}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-2 transition-colors"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingRoleValue}
                              onChange={(e) => setEditingRoleValue(e.target.value)}
                              className="flex-1 px-2.5 py-1 bg-white border border-emerald-500 rounded-lg text-xs focus:outline-none font-medium"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditCustomRole(role, editingRoleValue);
                                if (e.key === "Escape") setEditingRoleIndex(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleEditCustomRole(role, editingRoleValue)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                              title="Lưu thay đổi"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRoleIndex(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Hủy sửa"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-800 text-xs truncate">
                                {role}
                              </span>
                              {membersCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700 font-medium shrink-0">
                                  {membersCount} người giữ
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoleIndex(idx);
                                  setEditingRoleValue(role);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Sửa tên chức danh"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm("Bạn có chắc chắn muốn xóa chức danh này khỏi danh mục?")) {
                                    handleDeleteCustomRole(role);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Xóa chức danh này"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 px-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0 text-xs">
              <span className="text-slate-500 text-[11px]">
                Tổng cộng: <strong>{customRoles.length}</strong> chức danh khả dụng
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowRoleManagerModal(false);
                  setEditingRoleIndex(null);
                  setNewRoleInput("");
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Xong & Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
