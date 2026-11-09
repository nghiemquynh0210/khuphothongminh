# QUY TẮC & BỘ NHỚ LÀM VIỆC DỰ ÁN KHU PHỐ 3 AN PHÚ

AI Assistant (Antigravity) cần luôn ghi nhớ các thông số kỹ thuật sau trong mọi phiên làm việc:

1. **Địa bàn:** Khu phố 3, Phường An Phú, TP. Hồ Chí Minh.
2. **Database:** Supabase project `wjdgaobhipkgzveidtra` (URL: `https://wjdgaobhipkgzveidtra.supabase.co`).
   - Đã cấu hình kết nối qua Supabase MCP Server (`@supabase/mcp-server-supabase`) với Personal Access Token (PAT).
   - Đã nạp API Key `anon` và `VITE_SUPABASE_URL` vào file `.env`.
   - Cơ sở dữ liệu Cloud thực tế: Đã xác thực kết nối thành công tới 488 hộ gia đình và 11.632 nhân khẩu.
3. **Deployment & GitHub Repository:**
   - GitHub Repo: `https://github.com/nghiemquynh0210/khuphothongminh` (Branch: `main`)
   - GitHub Account: `nghiemquynh0210`
   - Đã cấu hình remote `origin`, lưu PAT vào `.env` (`GITHUB_PAT`) và MCP config toàn cục (`@modelcontextprotocol/server-github`).
   - Đã push đồng bộ toàn bộ mã nguồn mới nhất lên GitHub `main`.
   - Vercel Account: `nghiemquynh0210` (email: `nghiemquynh0210@gmail.com`, team: `nghiemquynh0210s-projects` - `team_5JdtH3l3j0wix2LsdMJVs7kZ`).
   - Đã cấu hình Vercel Access Token vào `.env` (`VERCEL_API_TOKEN`) và MCP config toàn cục (`@modelcontextprotocol/server-vercel`).
   - Domain triển khai: `https://bdhkp3.vercel.app`.
   - Git author: `Khupho3 <bdhkhupho3.ap@gmail.com>`.
4. **Bản đồ GIS:** Sử dụng Leaflet WGS-84 với đa giác khoanh vùng ranh giới hành chính Khu phố 3 An Phú.
   - **Ranh giới mốc tự động theo đường đứt đoạn:** Đường biên địa giới luôn được vẽ tự động nối các mốc bằng nét đứt đoạn chuẩn bản đồ địa chính (`dashArray: 12, 6, 3, 6`).
   - **Cơ chế Kéo thả / Cố định mốc:** Các điểm mốc ranh giới (1..N) mặc định là **CỐ ĐỊNH** (`draggable: false`) để tránh chạm nhầm. Khi bấm nút **"Sửa mốc"**, mốc chuyển sang trạng thái **KÉO DI CHUYỂN** (`draggable: true`), đường đứt đoạn tự động co giãn theo mốc khi kéo, lưu tọa độ vào `localStorage`. Khi bấm **"Hoàn tất & Cố định mốc"**, các mốc được khóa lại cố định.
   - **Thu gọn / Ẩn bảng chức năng:** Có nút **"Ẩn bảng"** trên thanh lớp bản đồ số để mở rộng 100% không gian hiển thị bản đồ toàn màn hình, kèm nút bấm nổi **"Hiện Lớp Bản Đồ Số"** để bật lại bất cứ lúc nào.
5. **Cấu hình MCP:** Được lưu tại `.agents/mcp_config.json` (hỗ trợ cả Supabase và Vercel).

---

## 6. QUY CHUẨN THIẾT KẾ ĐỒNG BỘ TOÀN HỆ THỐNG (UNIFIED UI/UX DESIGN SYSTEM)

Tất cả các phân hệ và tính năng trong dự án **phải tuân thủ 100%** bộ quy chuẩn giao diện đồng nhất dưới đây để tránh tình trạng phân hệ này một kiểu, phân hệ khác một kiểu:

### A. Chuẩn hóa Modal Chi tiết một hàng (`DetailRow` & `DetailGrid`)
- **Vị trí component:** `src/components/common/DetailRow.tsx` (`DetailRow`, `DetailGrid`, `DetailSection`).
- **Quy tắc bắt buộc:**
  + Mọi trường thông tin trong tất cả modal chi tiết (Công dân, Hộ khẩu, Hộ kinh doanh, Doanh nghiệp, Chi bộ Đảng, Nhiệm vụ, An sinh, Phản ánh 1022...) **bắt buộc hiển thị trên một hàng duy nhất** (`[Nhãn]: [Giá trị]`).
  + **Tuyệt đối không sử dụng** layout ô khối bento box xếp chồng nhãn trên/giá trị dưới (stacked) gây lãng phí diện tích dọc.
  + Nhãn cố định độ rộng: `min-w-[145px] sm:min-w-[165px] text-slate-500 font-medium text-[13px]`.
  + Giá trị: `text-[13px] sm:text-sm font-semibold text-slate-900 leading-snug`.
  + Phân cách giữa các dòng: `border-b border-slate-100/90 py-2 sm:py-2.5`.
  + Hỗ trợ font monospace cho mã số hành chính (`isMono`), sao chép 1 chạm (`canCopy`), và dải dữ liệu dài chiếm trọn hàng (`colSpan={2}`).

### B. Thẻ chỉ số Thống kê Dùng chung (`StatCard`)
- **Vị trí component:** `src/components/common/StatCard.tsx`.
- **Quy tắc bắt buộc:**
  + Mỗi trang phân hệ hiển thị dải 4 thẻ thống kê nhanh (KPI Metrics) ở đầu trang với cấu trúc đồng bộ:
    `p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between`
  + Icon container: `w-11 h-11 rounded-xl flex items-center justify-center shrink-0`.
  + Typography: Giá trị số lượng `text-2xl font-black text-slate-900`, nhãn phụ đề `text-[12px] font-semibold text-slate-500 uppercase tracking-wider`.
  + Bảng màu đồng nhất: `emerald` (tổng số/an toàn), `blue` (đang xử lý/phổ biến), `indigo` (định danh/chính thức), `amber` (chờ duyệt/cảnh báo), `rose` (khẩn cấp/quá hạn/tiêu cực), `purple` (đảng viên/đoàn thể), `slate` (khác).

### C. Tiêu đề Phân hệ Chuẩn Hành chính Công (`PageHeader`)
- **Vị trí component:** `src/components/common/PageHeader.tsx`.
- **Cấu trúc chuẩn:**
  + Huy hiệu cơ quan (`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold`).
  + Chấm tín hiệu trạng thái nhấp nháy (`animate-pulse`).
  + Tên phân hệ `text-2xl font-black text-slate-900 tracking-tight`.
  + Đoạn mô tả chỉ thị rõ ràng về phạm vi địa bàn Khu phố 3, Phường An Phú.
  + Cụm nút hành động chuẩn bên phải (Xuất Excel, Thêm mới, In phiếu...).

### D. Thanh công cụ Tìm kiếm & Bộ lọc (Toolbar)
- Input tìm kiếm và select bộ lọc: Bo góc `rounded-xl`, viền chuẩn `border-slate-200/90`, focus ring công quyền `focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600`.
- **Tuyệt đối cấm sử dụng class viền không tồn tại trong Tailwind CSS v4** như `border-slate-150` hoặc `border-slate-350`: do Tailwind v4 không có các shade này nên thuộc tính `border-color` sẽ bị bỏ qua và trình duyệt tự động fallback về `currentColor` (màu chữ đen `#000000` / `#0f172a`), gây ra lỗi viền khung đen sì, thô đậm không đồng bộ. Luôn dùng `border-slate-200/80` hoặc `border-slate-200/90` cho viền khung card container.

### E. Loại bỏ Triệt để `alert()` Trình duyệt
- **Quy tắc:** Không bao giờ gọi `alert()`, `confirm()` mặc định của trình duyệt vì gây gián đoạn luồng UX và tạo cảm giác nghiệp dư.
- **Giải pháp:** Sử dụng Toast Notification nổi (`fixed bottom-6 right-6 z-50 animate-slide-up bg-slate-900 text-white rounded-xl shadow-2xl`) hoặc mở Modal chuyên biệt có nút đóng rõ ràng.

### F. Bố cục Master-Detail và Danh bạ Tổ chức / Chi hội
- **Cột danh bạ (Master List):** Thiết kế theo dạng danh sách tinh gọn cao mật độ (compact high-density), **thu gọn chiều ngang chuẩn `w-full lg:w-[270px] xl:w-[280px] shrink-0`** (không dùng tỷ lệ 4/12 cột quá rộng) và **không hiển thị phần mô tả nhiệm vụ dài dòng** trong từng thẻ danh mục nhằm tiết kiệm tối đa cả chiều cao lẫn chiều ngang.
- **Không gian làm việc chính (Detail Workspace):** Chiếm toàn bộ không gian còn lại (`flex-1 min-w-0`), giúp các bảng biểu (Table), biểu mẫu và lưới thành viên có không gian rộng rãi, thoáng đãng, hiển thị đầy đủ các cột thông tin mà không bị co cụm hay ngắt dòng thô.
- **Quy chuẩn màu sắc & bố cục huy hiệu Chức danh (Role Badges):**
  + Tất cả chức danh **Trưởng / Người đứng đầu** (Chi hội trưởng, Bí thư Chi bộ, Trưởng Ban điều hành, Tổ trưởng ANTT, Tổ trưởng dân phố, Chỉ huy trưởng DQTV, Chủ nhiệm, Đội trưởng, Chi ủy viên...): Thống nhất quy định màu **Đỏ/Rose** (`bg-rose-50 text-rose-700 border-rose-200 font-bold`).
  + Tất cả chức danh **Phó** (Chi hội phó, Phó Bí thư, Phó Ban điều hành, Tổ phó ANTT, Tổ phó dân phố, Phó Chỉ huy trưởng, Phó Chủ nhiệm, Đội phó...): Thống nhất quy định màu **Vàng cam/Amber** (`bg-amber-50 text-amber-900 border-amber-200 font-bold`).
  + Các chức danh Thành viên/Hội viên/Đảng viên/Cố vấn/Cư dân: Dùng màu trung tính (`bg-slate-100 text-slate-700 border-slate-200 font-medium`).
  + **Hiển thị trên 1 dòng duy nhất:** Bắt buộc có class `whitespace-nowrap inline-flex` và bố trí hàng riêng biệt để không bao giờ bị ngắt dòng (`\n`) hay chèn ép làm co ngắn họ tên thành viên.
- Thông tin chi tiết, nhiệm vụ và tôn chỉ hoạt động được hiển thị rõ ràng tại không gian làm việc chi tiết (Detail Workspace) ở cột bên phải khi người dùng bấm chọn đối tượng.

### G. Kiểm tra Chất lượng Bắt buộc Trước khi Bàn giao
1. `npx tsc --noEmit` phải đạt **0 lỗi TypeScript**.
2. Kiểm tra giao diện qua Chrome DevTools MCP, Console **100% không có lỗi hay cảnh báo đỏ**.

### H. Quy chuẩn Font chữ, Cỡ chữ & Thứ bậc Typography (Typography Scale Standard)
- **Bộ Font chữ chuẩn hệ thống:**
  + Font Sans-serif chính: **`Inter`** (Google Fonts weights: 400, 500, 600, 700, 800, 900) kế thừa xuyên suốt toàn bộ thẻ `body`, `button`, `input`, `select`, `textarea`, `h1..h6`.
  + Font Monospace chuẩn kỹ thuật: **`JetBrains Mono`** (Google Fonts weights: 400, 500, 600, 700) kế thừa cho `code`, `pre`, `.font-mono` dành riêng cho Số CCCD, Mã định danh, Tọa độ GPS/DMS, Số Quyết định, Mã số thuế.
  + Font Serif: **Tuyệt đối không sử dụng** trong các thành phần giao diện thông thường; chỉ dùng duy nhất trong phôi in chứng nhận hành chính đặc thù (nếu có).
- **Thang kích thước chữ (Type Scale) chuẩn toàn app:**
  + **Tiêu đề Phân hệ (H1 / Page Title):** `text-xl md:text-2xl font-black text-slate-800 tracking-tight` (hoặc `text-slate-900`, `text-white` trên banner tối). Tuyệt đối không dùng cỡ nhỏ `text-lg` cho tiêu đề trang chính.
  + **Tiêu đề Mục / Khối nội dung (H2 / Section Title):** `text-base md:text-lg font-bold text-slate-900 tracking-tight`.
  + **Tiêu đề Thẻ / Tên mục con (H3 / Card Title):** `text-xs sm:text-[13px] md:text-sm font-bold text-slate-800`.
  + **Văn bản mô tả & Input biểu mẫu (Body / Form Control):** `text-xs sm:text-[13px] text-slate-700 font-normal`.
  + **Tiêu đề bảng (Table Header):** `text-[11px] font-bold uppercase tracking-wider text-slate-500`.
  + **Huy hiệu, Tag, Nhãn trạng thái (Badge / Tag / Pill):** `text-[10px] sm:text-[10.5px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full`.
  + **Nhãn phụ đề / Thống kê vi mô (Micro-captions):** Tối thiểu `text-[10px]` (`text-[10px] uppercase font-bold text-slate-400 tracking-wider`).
- **Nghiêm cấm cỡ chữ siêu nhỏ (Sub-10px):**
  + **Loại bỏ triệt để 100%** các class `text-[6px]`, `text-[7px]`, `text-[8px]`, `text-[9px]` trên toàn bộ mã nguồn. Kích thước tối thiểu cho bất kỳ nội dung hoặc nhãn nào phải là `10px` (`text-[10px]` hoặc `text-xs`) để đảm bảo khả năng tiếp cận WCAG và độ sắc nét trên mọi loại màn hình.

### I. Tinh gọn Thẻ Đối tượng & Tránh Trùng lặp Nhãn (Object Card Streamlining)
- **Header thẻ thông tin (Card Header):** Mỗi thẻ đối tượng (Cơ sở kinh doanh, Doanh nghiệp, Hộ gia đình, Cán bộ) chỉ hiển thị duy nhất **1 nhãn phân loại chính** (Category Badge kèm icon nhận diện) ở góc trên bên trái và **1 nhãn trạng thái** (Status Pill) ở góc trên bên phải trên cùng một hàng ngang (`flex justify-between items-center`).
- **Tuyệt đối không xếp chồng (stack) thêm nhãn loại hình phụ** (như `{b.type}`: "Dịch vụ ăn uống", "Dịch vụ đời sống", "Bán lẻ thương mại"...) ngay bên dưới nhãn nhóm ngành chính vì gây trùng lặp thông tin thừa thãi, chiếm dụng diện tích dọc, khiến chữ bị rớt dòng và làm vỡ nhịp điệu chiều cao đồng bộ của lưới thẻ (grid cards). Chi tiết tiểu ngành nghề xem tại Modal chi tiết hoặc Bảng dữ liệu mở rộng.

### J. Chuẩn hóa Hộp Thông tin Chi tiết (Detail Modal Dossier Standards)
- **Hồ sơ hợp nhất (Unified Dossier Canvas):** Thay thế các hộp/card trôi nổi rời rạc bị ngăn cách bởi khoảng xám lớn bằng một khối hồ sơ thống nhất duy nhất (`bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden`).
- **Tích hợp dải album ảnh vi mô (Integrated Mini Photo Strip):** Không dành nguyên một card to 100px ở đầu modal chỉ để chứa 1-2 thumbnail ảnh nhỏ. Thay vào đó, tích hợp dải thumbnail mini kèm nút `+ Thêm ảnh` ngay góc trên bên phải thanh tiêu đề phụ của hồ sơ.
- **Loại bỏ trùng lặp tiêu đề trong bảng dữ liệu:** Tên cơ sở/doanh nghiệp đã hiển thị trang trọng, cỡ lớn ở Header modal thì không lặp lại dòng `Tên cơ sở: ...` ở dòng đầu tiên của bảng `DetailGrid`.
- **Khắc phục vỡ layout Footer:** 
  + Trạng thái đối tượng được chuyển sang Dropdown `<select>` trang nhã, đồng nhất, giúp toàn bộ nút tác vụ ở Footer nằm cố định trên đúng 1 hàng ngang, tuyệt đối không bị rớt dòng ở mọi độ phân giải màn hình.
  + Nhóm nút tác vụ thành viên nhân khẩu (Hồ sơ, Chuyển, Tách, Xóa) được thiết kế dạng pill nhỏ gọn, có icon trực quan, không chiếm dụng không gian hàng ngang.

### K. Chuẩn hóa Quản lý Dân cư & Sổ Hộ tịch (Citizen & Household Management Standards)
- **Đồng bộ khối thống kê KPI:** Cả phân hệ Hộ khẩu và Cư dân đều phải sở hữu 4 thẻ KPI thống kê số liệu tổng quan trên đầu trang (Tổng quy mô, Thường trú, Tạm trú, Số hóa GIS/Người nước ngoài) để lãnh đạo địa phương nắm bắt biến động tức thì.
- **Phân cấp hành động chuẩn mực trên dòng sổ hộ khẩu:**
  + Nút **`[Xem sổ →]`** là **Primary Call-to-Action** (nổi bật với nền xanh emerald), thể hiện đúng bản chất quản lý sổ sách hành chính.
  + Các nút hỗ trợ bản đồ GIS (`[Chỉ đường]`, `[Ghim GIS]`) là tác vụ tiện ích thứ cấp, sử dụng nền trắng viền xám nhẹ (`bg-white border-slate-200 text-slate-600`), không được chiếm spotlight màu đậm của sổ hộ tịch.
  + Tọa độ GPS không hiển thị dạng chuỗi DMS dài thô; thay bằng badge tinh gọn `📍 Đã định vị GIS` kèm tooltip khi rê chuột.
  + Hiển thị quy mô nhân khẩu rõ ràng (`👥 3 nhân khẩu`) kèm tên vắn tắt các thành viên ngay trên dòng danh sách.
- **Liên kết 2 chiều Dân cư ↔ Hộ khẩu (Bidirectional Relational UX):**
  + Trong bảng Cư dân, mã sổ hộ khẩu (như `HK-301`) phải là một **Interactive Chip**. Khi cán bộ nhấp chuột, hệ thống lập tức mở cửa sổ xem nhanh thông tin Sổ hộ tịch (Chủ hộ, địa chỉ, danh sách đầy đủ tất cả các thành viên trong gia đình) mà không cần rời trang hay tìm kiếm thủ công.
  + Thanh công cụ tìm kiếm và lọc cư dân được bố trí 2 tầng thông thoáng, không chèn ép khiến ô tìm kiếm bị co cụm hay cắt cụt placeholder. Cột thao tác luôn có nút `[Xem]` mở nhanh hồ sơ định danh.

### L. Chuẩn hóa Cổng Xác thực & Đăng nhập (GovTech Auth & Session Persistence Standard)
- **Giao diện GovTech Chuẩn mực:** Thay thế hoàn toàn giao diện tối (Dark Neon) bằng phông sáng công vụ cao cấp (`bg-slate-50` pha sắc ngọc bích `emerald`), huy hiệu số KP3 và quốc hiệu đầy đủ: `KHU PHỐ THÔNG MINH AN PHÚ • ỦY BAN NHÂN DÂN PHƯỜNG AN PHÚ • KHU PHỐ 3`.
- **Tuyệt đối không để lộ mật khẩu hay công cụ demo:** Không hiển thị tài khoản mẫu, mật khẩu mẫu, nút bypass một chạm hay thanh huy hiệu/hướng dẫn rườm rà trên card đăng nhập. Thẻ đăng nhập chỉ tập trung vào các trường nghiệp vụ cốt lõi: Chọn vai trò -> Tài khoản/CCCD -> Mật khẩu -> Ghi nhớ -> Nút Đăng nhập hệ thống.
- **Xác thực Thật & Phân hệ 2 Vai trò:**
  + Cán bộ / Quản trị: Xác thực Supabase Auth thật (`bdhkhupho3.ap@gmail.com` / `Trunghuy741`), hỗ trợ alias `admin`, `canbo` và kiểm tra trạng thái phê duyệt danh tính `approval_status` trong `user_profiles`.
  + Cư dân Khu phố: Đăng nhập bằng số CCCD 12 chữ số hoặc SĐT tra cứu trực tiếp từ CSDL 11.632 nhân khẩu.
- **Duy trì Phiên làm việc (Session Persistence):** Lưu định danh tài khoản vào `localStorage` (`kp3_auth_user`). Khi F5 / tải lại trang không bị mất phiên đăng nhập. Nút Đăng xuất trên Header và Sidebar xóa sạch phiên và đưa về `/login` an toàn.

### M. Chuẩn hóa Phân hệ Chi hội Đoàn thể & Doanh nghiệp
- **Chi hội & Đoàn thể ([`PartyBranch.tsx`](file:///c:/Users/KHUPHO3/Downloads/khuphothongminh-main/khuphothongminh-main/src/components/PartyBranch.tsx)):** Thống nhất hiển thị tên tất cả 23 tổ chức/chi hội với nhãn vàng hổ phách mặc định (`bg-amber-50 text-amber-800 border-amber-200/90 font-bold`), cỡ chữ và font đồng bộ bảng điều hành tổng quan, loại bỏ việc phân nhóm/thể loại gây trùng lặp.
- **Quản lý Doanh nghiệp ([`EnterpriseManagement.tsx`](file:///c:/Users/KHUPHO3/Downloads/khuphothongminh-main/khuphothongminh-main/src/components/EnterpriseManagement.tsx)):** Hiển thị hình ảnh doanh nghiệp tương tự cơ sở kinh doanh, tính năng phân tích hình ảnh AI được thu gọn và có nút cho phép ẩn/hiện linh hoạt.
