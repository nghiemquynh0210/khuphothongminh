import { Association, AssociationMember } from "../types";

// Danh mục chuẩn 23 Chi hội & Tổ chức đoàn thể tại Khu phố 3, Phường An Phú
export const INITIAL_ASSOCIATIONS: Association[] = [
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
      name: "Tổ ANTT cơ sở",
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
      name: "Chi hội Người cao tuổi",
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
  ];

const STORAGE_KEY = "kp3_associations_data";

export function getStoredAssociations(): Association[] {
  if (typeof window === "undefined") return INITIAL_ASSOCIATIONS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Could not load associations from storage:", e);
  }
  return INITIAL_ASSOCIATIONS;
}

export function saveStoredAssociations(associations: Association[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(associations));
  } catch (e) {
    console.warn("Could not save associations to storage:", e);
  }
}

export function getAssociationById(id: string, customList?: Association[]): Association | undefined {
  const list = customList || getStoredAssociations();
  return list.find(a => a.id === id);
}

export function getAssociationByName(name: string, customList?: Association[]): Association | undefined {
  const list = customList || getStoredAssociations();
  const lower = name.toLowerCase().trim();
  return list.find(a => a.name.toLowerCase().trim() === lower || lower.includes(a.name.toLowerCase().trim()));
}

export function getMembersForAssociation(assocIdOrName: string, customList?: Association[]): AssociationMember[] {
  const list = customList || getStoredAssociations();
  const found = list.find(a => a.id === assocIdOrName || a.name.toLowerCase().trim() === assocIdOrName.toLowerCase().trim());
  return found ? found.members : [];
}
