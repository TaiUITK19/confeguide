# ConfGuide — Agent Context & Architectural Reference

Tài liệu hướng dẫn kỹ thuật dành cho AI Agents và Lập trình viên tiếp tục phát triển dự án ConfGuide.

---

## 1. Bản chất & Ràng buộc Kỹ thuật Cốt lõi
- **Kiến trúc**: Web tĩnh thuần (Semantic HTML5 + CSS thuần + Vanilla JavaScript ES6+).
- **Zero Build Tools**: Không sử dụng bundler (Vite, Webpack), không dùng framework (React, Vue), không compile step.
- **Ràng buộc file:/// Protocol**: Mọi trang web phải mở và chạy bình thường khi người dùng click trực tiếp file HTML từ ổ đĩa (`file:///d:/IE104/doangithub/confeguide/...`).
  - Không dùng `fetch()` để tải các đoạn template HTML (header/footer).
  - Tải dữ liệu JSON phải luôn kèm mảng fallback (`FALLBACK_CONFERENCES`, `SEED_USERS`) phòng trường hợp trình duyệt chặn CORS/local file fetch.

---

## 2. Bản đồ File Hệ thống (File Map)

### 2.1. Các Trang HTML (HTML Pages)
| File | Mục đích |
|---|---|
| [`index.html`](file:///d:/IE104/doangithub/confeguide/index.html) | Trang chủ & Cổng điều hướng tìm kiếm (Search Gateway), hiển thị tối đa 6 hội nghị sắp tới. |
| [`search.html`](file:///d:/IE104/doangithub/confeguide/search.html) | Tra cứu nâng cao: bộ lọc accordion đa chiều, đồng bộ URL parameters, chip tags xóa nhanh, ẩn hội nghị đã qua mặc định. |
| [`detail.html`](file:///d:/IE104/doangithub/confeguide/detail.html) | Chi tiết hội nghị theo `?id=<slug>`, hiển thị specs, mốc deadline, đánh giá cộng đồng, nút lưu bookmark, liên kết website. |
| [`chitiet.html`](file:///d:/IE104/doangithub/confeguide/chitiet.html) | Redirect mỏng tương thích ngược chuyển hướng sang `detail.html`. |
| [`tracker.html`](file:///d:/IE104/doangithub/confeguide/tracker.html) | Theo dõi nộp bài (đổi tên từ `logs.html`): CRUD danh sách hội nghị theo dõi nộp bài. |
| [`profile.html`](file:///d:/IE104/doangithub/confeguide/profile.html) | Hồ sơ cá nhân: thông tin tài khoản, danh sách hội nghị đã lưu, đếm thống kê. |
| [`about.html`](file:///d:/IE104/doangithub/confeguide/about.html) | Giới thiệu đề tài môn học IE104, mục tiêu và đơn vị phát triển. |
| [`contact.html`](file:///d:/IE104/doangithub/confeguide/contact.html) | Liên hệ & đóng góp thông tin hội nghị. |
| [`login.html`](file:///d:/IE104/doangithub/confeguide/login.html) | Đăng nhập tài khoản (hỗ trợ `?redirect=<url>`). |
| [`register.html`](file:///d:/IE104/doangithub/confeguide/register.html) | Đăng ký tài khoản người dùng mới. |
| [`terms.html`](file:///d:/IE104/doangithub/confeguide/terms.html) | Điều khoản & Điều kiện sử dụng chuẩn mực cho dự án học thuật ConfGuide. |
| [`privacy.html`](file:///d:/IE104/doangithub/confeguide/privacy.html) | Chính sách bảo mật thông tin và quyền riêng tư cá nhân người dùng. |

### 2.2. Kiểu dáng & Giao diện (CSS)
| File | Mục đích |
|---|---|
| [`css/base.css`](file:///d:/IE104/doangithub/confeguide/css/base.css) | Design tokens chuẩn 60:30:10, dark mode tokens, typography, shared header (4 nav items, 40x40 theme toggle, 40px login/register auth buttons group hoặc avatar, mobile drawer) và shared footer chuẩn 4 cột có vách ngăn dọc & radial glow. Mọi trang đều nạp file này. |
| [`css/home.css`](file:///d:/IE104/doangithub/confeguide/css/home.css) | Styles riêng cho Landing page, hero, card hội nghị, responsive grid. |
| [`css/search.css`](file:///d:/IE104/doangithub/confeguide/css/search.css) | Styles trang tra cứu, accordion collapsible filters, active chips bar, toast. |
| [`css/detail.css`](file:///d:/IE104/doangithub/confeguide/css/detail.css) | Styles trang chi tiết hội nghị, back button, reviews subpage, star rater. |
| [`css/tracker.css`](file:///d:/IE104/doangithub/confeguide/css/tracker.css) | Styles trang theo dõi nộp bài (bảng quản lý, modal form thêm/sửa). |
| [`css/auth.css`](file:///d:/IE104/doangithub/confeguide/css/auth.css) | Styles trang đăng nhập và đăng ký. |

### 2.3. Logic Ứng dụng (JavaScript)
| File | Mục đích |
|---|---|
| [`js/layout.js`](file:///d:/IE104/doangithub/confeguide/js/layout.js) | Render Header & Footer động vào `<div id="site-header"></div>` và `<div id="site-footer"></div>` bằng template string. Đồng bộ `confguide_theme` và session người dùng, `renderBrandHtml` dùng chung một nguồn sự thật, `renderAuthButtons` chuẩn hóa nút Đăng nhập / Đăng ký 40px, ẩn footer tại auth screens, footer 4 cột với form góp ý tự co giãn textarea chống spam. |
| [`js/script.js`](file:///d:/IE104/doangithub/confeguide/js/script.js) | Logic trang chủ: gateway redirect sang `search.html?q=...`, hiển thị tối đa 6 cards hội nghị sắp tới. |
| [`js/app.js`](file:///d:/IE104/doangithub/confeguide/js/app.js) | Logic tra cứu: accordion filters, đồng bộ 2 chiều URL parameters (`history.replaceState`), active filter chips, bookmark user-scoped. |
| [`js/detail.js`](file:///d:/IE104/doangithub/confeguide/js/detail.js) | Logic chi tiết hội nghị: đọc `?id=<slug>`, hiển thị dữ liệu động, rating, nút bookmark, back thông minh. |
| [`js/tracker.js`](file:///d:/IE104/doangithub/confeguide/js/tracker.js) | Logic CRUD theo dõi nộp bài qua `confguides`. |
| [`js/auth.js`](file:///d:/IE104/doangithub/confeguide/js/auth.js) | Xác thực mật khẩu SHA-256, nạp seed 20 tài khoản không trùng lặp, xử lý chuyển hướng `?redirect=`. |

### 2.4. Dữ liệu (Data)
| File | Cấu trúc & Mục đích |
|---|---|
| [`data/conference_data.json`](file:///d:/IE104/doangithub/confeguide/data/conference_data.json) | 49 bản ghi hội nghị chuẩn hóa với các trường: `id` (slug), `name`, `full_name`, `year`, `rank` (A*, A, B, C), `rating`, `rating_count`, `publisher`, `mode`, `fields`, `deadlines`, `location`, `date_happen`, `website_url`, `deadline_url`. |
| [`data/users.json`](file:///d:/IE104/doangithub/confeguide/data/users.json) | 20 tài khoản thử nghiệm (`user1` đến `user20`, mật khẩu tương ứng `user1@` đến `user20@` đã hash SHA-256). |

---

## 3. Khóa Lưu trữ LocalStorage (Storage Keys)

| Tên Khóa | Kiểu Dữ liệu | Mục đích |
|---|---|---|
| `confguide_theme` | `"light"` \| `"dark"` | Lưu theme toàn trang (đồng bộ qua class `dark` trên `<body>`). |
| `confguide_current_user` | Object JSON | Thông tin phiên người dùng đăng nhập hiện tại `{ id, username, email, name, role }`. |
| `confguide_users` | Array JSON | Danh sách tài khoản người dùng đã đăng ký và seed. |
| `confguide_saved_${userId}` | Array JSON | Danh sách ID hội nghị đã lưu theo từng user (e.g. `["cvpr-2026", "atc-2026"]`). Với khách vãng lai dùng `confguide_saved_guest`. |
| `confguides` | Array JSON | Danh sách hội nghị trong bảng Theo dõi nộp bài (`tracker.html`). |
| `confguide_feedback` | Array JSON | Mảng các bản ghi ý kiến đóng góp từ chân trang: `{ id, text, userId, createdAt }`. |

---

## 4. Chuẩn Định danh Hội nghị (Conference Slugs)
Các ID hội nghị tuân theo slug dạng chữ thường không dấu:
- `cvpr-2026`: IEEE/CVF CVPR 2026 (Rank A*, Vancouver)
- `neurips-2026`: NeurIPS 2026 (Rank A*, Sydney)
- `iclr-2026`: ICLR 2026 (Rank A*, Singapore)
- `acl-2026`: ACL 2026 (Rank A*, Vienna)
- `atc-2026`: ATC 2026 (Rank B, Quy Nhơn, Việt Nam)
- `soict-2026`: SOICT 2026 (Rank B, TP.HCM, Việt Nam)
- `mapr-2026`: MAPR 2026 (Rank B, Đà Nẵng, Việt Nam)
- v.v.

---

## 5. Cấu trúc URL Query String

### Tra cứu (`search.html`):
- `?q=...`: Từ khóa tìm kiếm
- `&rank=A*,A`: Mảng xếp hạng
- `&region=vietnam`: Khu vực (`vietnam` hoặc `international`)
- `&mode=Trực+tiếp`: Hình thức (`Trực tiếp`, `Online`, `Hybrid`)
- `&fields=computer+vision`: Lĩnh vực nghiên cứu
- `&publisher=ieee`: Nhà xuất bản & chỉ mục
- `&status=open`: Trạng thái (`open`, `urgent`, `closed`)
- `&from=YYYY-MM-DD&to=YYYY-MM-DD`: Khoảng thời gian deadline
- `&past=1`: Cho phép hiển thị hội nghị đã kết thúc (mặc định ẩn)
- `&sort=deadline`: Kiểu sắp xếp (`relevance`, `deadline`, `rating`, `date`, `name`)

### Chi tiết (`detail.html`):
- `?id=<slug>` (Ví dụ: `detail.html?id=cvpr-2026`)

### Đăng nhập (`login.html`):
- `?redirect=<destination>` (Ví dụ: `login.html?redirect=profile.html`)
