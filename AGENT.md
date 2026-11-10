# ConfGuide — Agent Context & Architectural Reference

Tài liệu hướng dẫn kỹ thuật dành cho AI Agents và Lập trình viên tiếp tục phát triển dự án ConfGuide.

---

## 1. Bản chất & Ràng buộc Kỹ thuật Cốt lõi
- **Kiến trúc**: Web tĩnh thuần theo mô hình Modular Hybrid (Semantic HTML5 + CSS thuần + Vanilla JavaScript ES6+).
- **Zero Build Tools**: Không sử dụng bundler (Vite, Webpack), không dùng framework (React, Vue), không compile step.
- **Ràng buộc file:/// Protocol**: Mọi trang web phải mở và chạy bình thường khi người dùng click trực tiếp file HTML từ ổ đĩa (`file:///...`).
  - Không dùng `fetch()` để tải các đoạn template HTML (header/footer).
  - Tải dữ liệu JSON luôn kèm mảng fallback (`FALLBACK_CONFERENCES`, `SEED_USERS`, `DEFAULT_UTILS`) phòng trường hợp trình duyệt chặn CORS/local file fetch.
- **Dữ liệu gốc**: Thư mục `data/` (`conference_data.json`, `users.json`, `about.json`, `main.py`) là nguồn dữ liệu chuẩn, không tự ý sửa đổi cấu trúc.

---

## 2. Bản đồ File Hệ thống (File Map)

### 2.1. Các Trang HTML (HTML Pages - 11 trang)
| File | Mục đích | Script & Style đi kèm |
|---|---|---|
| [`index.html`](file:///d:/IE104/doangithub/confeguide/index.html) | Trang chủ & Cổng điều hướng tìm kiếm (Search Gateway tập trung thị trường Việt Nam, 6 hội nghị tiêu biểu) | `css/base.css`, `css/home.css`, `js/layout.js`, `js/script.js` |
| [`search.html`](file:///d:/IE104/doangithub/confeguide/search.html) | Tra cứu nâng cao: bộ lọc accordion đa chiều (Rank CORE, Hình thức, Lĩnh vực, NXB, Trạng thái, Deadline), đồng bộ URL parameters, chip tags | `css/base.css`, `css/search.css`, `js/layout.js`, `js/app.js` |
| [`detail.html`](file:///d:/IE104/doangithub/confeguide/detail.html) | Chi tiết hội nghị theo `?id=<slug>`, timeline mốc hạn AoE, đánh giá cộng đồng | `css/base.css`, `css/detail.css`, `js/layout.js`, `js/detail.js` |
| [`tracker.html`](file:///d:/IE104/doangithub/confeguide/tracker.html) | Theo dõi nộp bài: quản lý danh sách hội nghị đã lưu trong trình duyệt | `css/base.css`, `css/tracker.css`, `js/layout.js`, `js/tracker.js` |
| [`profile.html`](file:///d:/IE104/doangithub/confeguide/profile.html) | Hồ sơ cá nhân: thông tin nghiên cứu, modal chỉnh sửa, avatar | `css/base.css`, `css/profile.css`, `js/layout.js`, `js/profile.js` |
| [`about.html`](file:///d:/IE104/doangithub/confeguide/about.html) | Giới thiệu đề tài môn học IE104, đội ngũ UIT, roadmap và modal đề xuất | `css/base.css`, `css/about.css`, `js/layout.js`, `js/about.js` |
| [`contact.html`](file:///d:/IE104/doangithub/confeguide/contact.html) | Liên hệ & đóng góp thông tin hội nghị | `css/base.css`, `js/layout.js` |
| [`login.html`](file:///d:/IE104/doangithub/confeguide/login.html) | Đăng nhập tài khoản (hỗ trợ `?redirect=<url>`) | `css/base.css`, `css/auth.css`, `js/layout.js`, `js/auth.js` |
| [`register.html`](file:///d:/IE104/doangithub/confeguide/register.html) | Đăng ký tài khoản người dùng mới | `css/base.css`, `css/auth.css`, `js/layout.js`, `js/auth.js` |
| [`terms.html`](file:///d:/IE104/doangithub/confeguide/terms.html) | Điều khoản & Điều kiện sử dụng chuẩn mực | `css/base.css`, `js/layout.js` |
| [`privacy.html`](file:///d:/IE104/doangithub/confeguide/privacy.html) | Chính sách bảo mật thông tin và quyền riêng tư | `css/base.css`, `js/layout.js` |

### 2.2. Kiểu dáng & Giao diện (CSS)
| File | Mục đích |
|---|---|
| [`css/base.css`](file:///d:/IE104/doangithub/confeguide/css/base.css) | **[DÙNG CHUNG]** Tokens 60:30:10, dark mode tokens, typography, container, common cards, shared header (72px, 4 nav items, theme toggle, auth button), shared footer 4 cột, modals, toasts và policy page layout. Mọi trang đều nạp file này. |
| [`css/home.css`](file:///d:/IE104/doangithub/confeguide/css/home.css) | **[MODULE]** Styles riêng cho Landing page (hero, search gateway, card hội nghị, 3 feature cards). |
| [`css/search.css`](file:///d:/IE104/doangithub/confeguide/css/search.css) | **[MODULE]** Styles trang tra cứu, accordion collapsible filters, active chips bar. |
| [`css/detail.css`](file:///d:/IE104/doangithub/confeguide/css/detail.css) | **[MODULE]** Styles trang chi tiết hội nghị, timeline AoE 4 mốc, reviews subpage, star rater. |
| [`css/tracker.css`](file:///d:/IE104/doangithub/confeguide/css/tracker.css) | **[MODULE]** Styles trang theo dõi nộp bài (bảng dữ liệu, nút xóa). |
| [`css/profile.css`](file:///d:/IE104/doangithub/confeguide/css/profile.css) | **[MODULE]** Styles trang hồ sơ nghiên cứu (banner tối trên/nội dung trắng dưới, avatar monogram, modal form). |
| [`css/auth.css`](file:///d:/IE104/doangithub/confeguide/css/auth.css) | **[MODULE]** Styles màn hình đăng nhập và đăng ký (layout 2 cột, promo banner, form card). |
| [`css/about.css`](file:///d:/IE104/doangithub/confeguide/css/about.css) | **[MODULE]** Styles trang giới thiệu (giá trị cốt lõi, roadmap, modal đề xuất). |

### 2.3. Logic Ứng dụng (JavaScript)
| File | Mục đích |
|---|---|
| [`js/layout.js`](file:///d:/IE104/doangithub/confeguide/js/layout.js) | **[DÙNG CHUNG]** Render Header & Footer động vào `<div id="site-header"></div>` và `<div id="site-footer"></div>`. Đồng bộ `confguide_theme` (sáng/tối), quản lý session đăng nhập, auth guard, xử lý form liên hệ `#contactForm`. |
| [`js/script.js`](file:///d:/IE104/doangithub/confeguide/js/script.js) | **[MODULE]** Logic trang chủ: gateway redirect sang `search.html?q=...`, hiển thị tối đa 6 cards hội nghị tiêu biểu. |
| [`js/app.js`](file:///d:/IE104/doangithub/confeguide/js/app.js) | **[MODULE]** Logic tra cứu: accordion filters (tập trung thị trường Việt Nam, bỏ lọc khu vực), đồng bộ 2 chiều URL parameters (`history.replaceState`), active filter chips, bookmark user-scoped. |
| [`js/detail.js`](file:///d:/IE104/doangithub/confeguide/js/detail.js) | **[MODULE]** Logic chi tiết hội nghị: đọc `?id=<slug>`, hiển thị dữ liệu động, rating, nút bookmark, timeline 4 mốc với fallback an toàn. |
| [`js/tracker.js`](file:///d:/IE104/doangithub/confeguide/js/tracker.js) | **[MODULE]** Logic CRUD theo dõi nộp bài qua LocalStorage theo user. |
| [`js/profile.js`](file:///d:/IE104/doangithub/confeguide/js/profile.js) | **[MODULE]** Logic hồ sơ cá nhân: chỉnh sửa thông tin, cập nhật avatar, đồng bộ LocalStorage. |
| [`js/auth.js`](file:///d:/IE104/doangithub/confeguide/js/auth.js) | **[MODULE]** Xác thực mật khẩu SHA-256, nạp seed 20 tài khoản không trùng lặp, xử lý chuyển hướng `?redirect=`. |
| [`js/about.js`](file:///d:/IE104/doangithub/confeguide/js/about.js) | **[MODULE]** Logic trang giới thiệu: render dữ liệu about, xử lý modal đề xuất hội nghị mới. |

---

## 3. Khác biệt Có chủ đích (Intentional Design Decisions)
1. **Trang Auth (`login.html`, `register.html`)**:
   - `<body>` mang class `auth-page`.
   - Header **không có thanh nav 4 mục**, **không có footer**, có nút chuyển đổi Đăng nhập/Đăng ký ở góc phải trên.
   - Nút sáng/tối vẫn hiển thị và đồng bộ trạng thái như mọi trang.
2. **Các trang nội dung còn lại**:
   - Header cố định 72px gồm 4 nav items: Trang chủ, Tra cứu, Theo dõi nộp bài, Hồ sơ (hoặc Giới thiệu), Theme toggle, và nhóm nút Auth / Avatar người dùng.
   - Thanh nav tự động đánh dấu active theo trang đang đứng qua `currentPage === item.href`.
   - Footer chung 4 cột chuẩn mực kèm form góp ý chống spam.
3. **Trang hồ sơ (`profile.html`)**:
   - Hero card được thiết kế phân tầng với **nền banner tối ở trên** và **nền nội dung màu trắng/surface ở dưới**. Đây là thiết kế chủ đích, không phải lỗi hiển thị.
4. **Nhận diện & Favicon**:
   - Mọi trang HTML đều gắn `<link rel="icon" type="image/svg+xml" href="images/logo.svg">`.

---

## 4. Quy tắc Phát triển & Mở rộng (Developer Guidelines)
- **KHÔNG sửa header/footer ở từng file HTML riêng lẻ**: Toàn bộ header và footer được quản lý tập trung qua `js/layout.js`. Chỉ cần đặt container rỗng `<div id="site-header"></div>` và `<div id="site-footer"></div>`.
- **Khi thêm trang mới**:
  1. Tạo file HTML ở thư mục gốc.
  2. Khai báo `<head>` với thẻ favicon `images/logo.svg`, font Inter, và stylesheet `css/base.css`.
  3. Đặt script chống FOUC ở đầu `<body>`: `<script>try { if (localStorage.getItem('confguide_theme') === 'dark') document.body.classList.add('dark'); } catch (e) {}</script>`.
  4. Đặt container `#site-header` và `#site-footer`.
  5. Nhúng `<script src="js/layout.js"></script>` và script module riêng của trang (nếu có).
  6. Khai báo route trong `js/layout.js` nếu muốn hiển thị trạng thái active tương ứng.
- **Không nhúng inline style hoặc script tùy tiện**: Tận dụng các utility class trong `css/base.css` (`.card-surface`, `.section-pad`, `.section-head`, `.policy-*`, `.btn-*`).

---

## 5. Khóa Lưu trữ LocalStorage (Storage Keys)

| Tên Khóa | Kiểu Dữ liệu | Mục đích |
|---|---|---|
| `confguide_theme` | `"light"` \| `"dark"` | Lưu theme toàn trang (đồng bộ qua class `dark` trên `<body>`). |
| `confguide_current_user` | Object JSON | Thông tin phiên người dùng đăng nhập hiện tại `{ id, username, email, name, role }`. |
| `confguide_users` | Array JSON | Danh sách tài khoản người dùng đã đăng ký và seed. |
| `confguide_saved_${userId}` | Array JSON | Danh sách ID hội nghị đã lưu theo từng user (e.g. `["cvpr-2026", "atc-2026"]`). Với khách vãng lai dùng `confguide_saved_guest`. |
| `confguide_feedback` | Array JSON | Mảng các bản ghi ý kiến đóng góp từ chân trang: `{ id, text, userId, createdAt }`. |
| `confguide_proposals` | Array JSON | Mảng các bản ghi đề xuất hội nghị mới từ modal `about.html`. |
