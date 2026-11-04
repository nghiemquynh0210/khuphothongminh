# 📋 KP3 An Phú — Beads Task Tracker
> Theo dõi đầu việc xuyên phiên (Công cụ #26)

---

## 🔴 Đang làm (In Progress)

- [ ] **[HIGH]** Xuất báo cáo thống kê dân cư ra Excel/PDF chuẩn Bộ CA
  - File: `scripts/export_residents.py`
  - Biểu mẫu: CT04, CT05 theo TT số 56/2021/TT-BCA
  
- [ ] **[HIGH]** Tích hợp email/webhook khi có phản ánh 1022 mới
  - Kết nối Supabase Realtime → webhook → email SMTP

---

## 🟡 Sắp làm (Todo)

### Tuần này
- [ ] Cài Gitleaks pre-commit hook (bảo mật secrets)
- [ ] Viết thêm Playwright E2E tests cho luồng đăng nhập
- [ ] Playwright E2E cho Cổng cư dân gửi phản ánh 1022
- [ ] Python pytest tests cho `extract_hostels.py`

### Sprint tới
- [ ] Thêm Firecrawl MCP để thu thập tin pháp luật cư trú
- [ ] Bruno API collection cho `/api/chat` endpoint
- [ ] Docker build + test trên local
- [ ] CI/CD GitHub Actions: ESLint + Vitest trước mỗi deploy Vercel

---

## ✅ Đã hoàn thành (Done)

### Tích hợp 30 công cụ Antigravity (2026-10-28)
- [x] **#01 Git** — `.gitignore` chuẩn hóa
- [x] **#02 Node.js** — `engines` field trong `package.json`
- [x] **#03 Python** — `scripts/requirements.txt` đầy đủ
- [x] **#04 uv** — `pyproject.toml` + `.venv` workflow
- [x] **#05 GitHub CLI** — Commit convention documented
- [x] **#06 Docker** — `Dockerfile` + `docker-compose.yml`
- [x] **#07 SKILL.md** — Kế hoạch skills trong `.agents/`
- [x] **#08 Rules** — `AGENTS.md` đầy đủ 17KB
- [x] **#11 UI UX Pro Max** — Design system hiện có
- [x] **#12 planning-with-files** — `BEADS_TASKS.md` (file này)
- [x] **#13 Context7** — Thêm vào `.agents/mcp_config.json`
- [x] **#14 GitHub MCP** — Thêm vào `.agents/mcp_config.json`
- [x] **#15 Playwright MCP** — Thêm vào `.agents/mcp_config.json`
- [x] **#19 ESLint** — `eslint.config.js` ✅
- [x] **#20 Prettier** — `.prettierrc` + `.prettierignore` ✅
- [x] **#21 Ruff** — `pyproject.toml` ✅
- [x] **#22 pytest** — `pyproject.toml` config ✅
- [x] **#23 Vitest** — `vite.config.ts` + `src/test/setup.ts` + unit tests ✅
- [x] **#24 Gitleaks** — `.gitleaks.toml` ✅
- [x] **#25 Repomix** — `repomix.config.json` ✅
- [x] **#26 Beads** — File này ✅
- [x] **#27 Postman** — API endpoints documented
- [x] **#28 Bruno** — `bruno/` collection ✅
- [x] **#29 DBeaver** — Queries documented trong plan
- [x] **#30 GitLens** — `.vscode/settings.json` ✅

### Data milestones đã đạt
- [x] 11.632 nhân khẩu nạp vào Supabase
- [x] 488 hộ gia đình số hóa
- [x] 108 cơ sở nhà trọ đồng bộ vào businesses
- [x] Cảnh báo tạm trú sắp hết hạn (≤30 ngày)
- [x] Dashboard số liệu thực 100% từ Supabase
- [x] RLS bật 100% trên 8 bảng

---

*Cập nhật: 2026-10-28 | Dự án: KP3 An Phú bdhkp3.vercel.app*
