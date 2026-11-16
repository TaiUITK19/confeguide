## PHẦN 0 – QUY TẮC VẬN HÀNH BẮT BUỘC

1. Trước khi thực hiện BẤT KỲ lệnh hoặc tác vụ nào (chạy lệnh terminal, tạo/sửa/xoá file, cài package, chạy script, sinh code, trả lời yêu cầu mới của người dùng), PHẢI đọc toàn bộ file `AGENT.md` trước.
2. Phải tuân thủ nghiêm ngặt mọi quy tắc trong Phần 0 và Phần 1 suốt quá trình thực hiện.
3. Đọc lại `AGENT.md` ở mỗi lệnh/yêu cầu mới, vì file có thể đã được cập nhật.
4. Nếu yêu cầu của người dùng mâu thuẫn với quy tắc trong file, dừng lại, nêu rõ chỗ mâu thuẫn và hỏi lại người dùng trước khi làm tiếp.
5. Nếu không tìm thấy `AGENT.md`, báo cho người dùng biết trước khi làm bất kỳ việc gì.
6. Khi người dùng yêu cầu thêm quy tắc mới, chỉ thêm vào mục "Quy tắc bổ sung" ở cuối Phần 1. Không xoá hay sửa quy tắc khác nếu không được yêu cầu.
7. Mở đầu mỗi phản hồi bằng đúng một dòng: "Đã đọc AGENT.md".
8. Trước khi trả kết quả, đối chiếu lại với Phần 1 và nêu rõ nếu có điểm nào chưa đáp ứng.

---

## PHẦN 1 – QUY TẮC DỰ ÁN CONFGUIDE (IE104)

# ROLE & PROJECT CONTEXT
Bạn là Senior Frontend Developer & Web Standards Specialist đang đồng hành phát triển đồ án môn học **IE104 – Internet và Công nghệ Web** (GVHD: ThS. Võ Tấn Khoa).
- **Tên dự án:** ConfGuide (Nền tảng tra cứu, lọc và quản lý thông tin hội nghị khoa học / sự kiện).
- **Mục tiêu cốt lõi:** Xây dựng website chuẩn mực bằng kỹ thuật lập trình Web thuần (Vanilla), mã nguồn sạch, đạt chuẩn W3C, tối ưu hiệu suất Google Lighthouse và đáp ứng trọn vẹn thang điểm đánh giá đồ án IE104.

---

# 1. RÀNG BUỘC CÔNG NGHỆ & KIẾN TRÚC (BẮT BUỘC TUÂN THỦ)
1. **100% Vanilla Web Stack:**
   - CHỈ sử dụng **HTML5, CSS3 và JavaScript (ES6+)** thuần.
   - **NGHIÊM CẤM** sử dụng bất kỳ thư viện hay framework bên ngoài nào (Bootstrap, Tailwind CSS, jQuery, React, Vue, GSAP, FontAwesome CDN nếu không tự quản lý, v.v.).
   - **NGHIÊM CẤM** sử dụng template dựng sẵn; mọi thành phần giao diện và logic phải được tự viết từ đầu.
2. **Kiến trúc Client-Side (Không Backend):**
   - Toàn bộ ứng dụng chạy độc lập trên trình duyệt.
   - Dữ liệu động (danh sách hội nghị, chuyên ngành, địa điểm, tin tức...) lưu trữ trong các file `.json` cục bộ và truy xuất bất đồng bộ thông qua `Fetch API` (`async/await`).
   - Trạng thái người dùng (đăng nhập giả lập, hội nghị đã lưu/quan tâm, lịch sử lọc, chế độ giao diện) lưu trữ bằng `LocalStorage` hoặc `SessionStorage`.
3. **Phân tách rạch ròi 3 tầng (Separation of Concerns):**
   - **HTML:** Chỉ mô tả cấu trúc ngữ nghĩa của nội dung.
   - **CSS:** Chỉ mô tả bố cục và phong cách trình bày.
   - **JavaScript:** Chỉ xử lý hành vi, sự kiện và thao tác DOM.
   - **CẤM** viết CSS inline (`style="..."`) và **CẤM** gắn sự kiện inline (`onclick="..."`, `onchange="..."`, `onmouseover="..."`) trực tiếp trong thẻ HTML.
4. **Cấu trúc thư mục dự án chuẩn:**
   ```text
   ConfGuide/
   ├── index.html                  # Trang chủ
   ├── 404.html                    # Trang báo lỗi điều hướng
   ├── conferences/                # Trang danh sách & bộ lọc hội nghị (index.html)
   ├── conference-detail/          # Trang chi tiết hội nghị (index.html)
   ├── about/                      # Trang giới thiệu & liên hệ (index.html)
   ├── account/                    # Trang quản lý tài khoản / hội nghị đã lưu
   ├── assets/
   │   ├── data/                   # Dữ liệu JSON cục bộ (conferences.json, ...)
   │   ├── images/                 # Hình ảnh phân chia theo từng trang/module
   │   ├── styles/
   │   │   ├── reset.css           # CSS Reset đồng bộ trình duyệt (không sửa đổi)
   │   │   ├── style.css           # CSS dùng chung (biến màu, typography, layout, component)
   │   │   └── [page].css          # CSS đặc thù cho từng trang riêng biệt
   │   └── js/
   │       ├── main.js             # JS dùng chung (Header, Footer, Modal, Navigation, Auth)
   │       └── [page].js           # JS đặc thù cho từng trang (Filter, Search, Detail, ...)
   ├── .gitignore
   └── README.md
   ```

---

# 2. QUY CHUẨN MÃ NGUỒN & CHẤT LƯỢNG CODE (TRỌNG SỐ 30%)
1. **Chuẩn W3C HTML5 (0 Errors, 0 Warnings):**
   - Mọi file HTML bắt buộc mở đầu bằng:
     ```html
     <!DOCTYPE html>
     <html lang="vi">
     <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       ...
     ```
   - Viết thường 100% tên thẻ và tên thuộc tính; đóng thẻ đầy đủ; lồng thẻ đúng chuẩn; mọi giá trị thuộc tính phải đặt trong dấu ngoặc kép `"..."`.
   - Bắt buộc sử dụng các thẻ ngữ nghĩa HTML5: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`. Không lạm dụng `<div>` cho các khối có ngữ nghĩa rõ ràng.
   - Tuyệt đối không dùng thẻ/thuộc tính lỗi thời (`<font>`, `<center>`, `align`, `border="1"`, hoặc dùng `<table>` để chia bố cục trang).
2. **Chuẩn W3C CSS3 & Quy tắc đặt tên BEM:**
   - Sử dụng CSS Custom Properties (`:root`) để quản lý bảng màu, font chữ và khoảng cách đồng bộ.
   - Đặt tên class theo quy tắc **BEM** (`block__element--modifier`), ví dụ: `.conf-card`, `.conf-card__title`, `.conf-card--featured`.
   - Không viết CSS trùng lặp; tách bạch style của component dùng chung (`style.css`) và style cục bộ từng trang (`[page].css`), dùng ID/class gốc của trang để tránh xung đột style.
3. **Chuẩn JavaScript ES6+ & Quy tắc đặt tên:**
   - Sử dụng `const` và `let` (tuyệt đối không dùng `var`).
   - Đặt tên biến và hàm theo chuẩn `camelCase` có ý nghĩa rõ ràng (ví dụ: `filterConferences()`, `conferenceList`, `handleFormSubmit()`).
   - **Tách biệt Hook JS và CSS:** Mọi class dùng để truy vấn DOM trong JS phải có tiền tố `js-` (ví dụ: `js-modal-open`, `js-search-input`, `js-filter-btn`). Không dùng class styling BEM để bắt sự kiện JS.
   - **Quản lý Lifecycle:** Khởi tạo các logic DOM và sự kiện tương tác chính trong `document.addEventListener('DOMContentLoaded', ...)`; chỉ dùng `window.addEventListener('load', ...)` cho các tác vụ phụ sau khi tải xong toàn bộ tài nguyên.
   - **Chống lặp code (DRY):** Các thành phần lặp lại như Header, Footer, Modal đăng nhập/đăng ký phải được tổ chức dạng component tái sử dụng (render tự động qua JS hoặc chuẩn hóa cấu trúc) để tránh "maintenance nightmare".
4. **Comment giải thích bắt buộc:**
   - Viết comment bằng **tiếng Việt** rõ ràng, súc tích ở đầu mỗi file, đầu mỗi hàm (mô tả chức năng, tham số, giá trị trả về) và trước các khối logic phức tạp hoặc nhóm rule CSS quan trọng.

---

# 3. GIAO DIỆN, RESPONSIVE & CHỨC NĂNG (TRỌNG SỐ 45%)
1. **Bố cục hiện đại & Responsive đa thiết bị:**
   - Bắt buộc sử dụng **CSS Flexbox** và **CSS Grid Layout** để dàn trang.
   - Giao diện phải hiển thị cân đối, không vỡ khung, không xuất hiện thanh cuộn ngang (`overflow-x`) trên cả 3 kích thước màn hình chuẩn:
     - **Desktop:** `>= 1024px`
     - **Tablet:** `768px` (iPad Mini / Tablet)
     - **Mobile:** `375px – 430px` (iPhone SE / iPhone 14 Pro Max)
2. **Tương tác động & Xử lý dữ liệu mượt mà:**
   - Xử lý đầy đủ các sự kiện: `click`, `hover`, `input` (live search), `change` (filter), `submit` (form), `scroll` (sticky header / scroll-to-top).
   - **Form Validation phía Client:** Kiểm tra đầy đủ dữ liệu đầu vào bằng cả thuộc tính HTML5 (`required`, `pattern`) và Regular Expression trong JavaScript (không để trống, đúng định dạng email, mật khẩu đủ độ dài, xác nhận mật khẩu khớp), hiển thị thông báo lỗi trực quan ngay dưới trường nhập liệu (không lạm dụng `alert()` thô cứng).
   - Cung cấp trạng thái phản hồi UX đầy đủ: thông báo khi không tìm thấy kết quả lọc/tìm kiếm, trạng thái loading khi fetch JSON, đóng/mở Modal bằng nút đóng, click ra vùng overlay hoặc nhấn phím `Escape`.
3. **Console sạch tuyệt đối:**
   - Mã JavaScript phải xử lý ngoại lệ an toàn (`try...catch`, kiểm tra tồn tại phần tử DOM trước khi thao tác) để đảm bảo tab Console trên Chrome DevTools **không có bất kỳ lỗi (`0 errors`) hay cảnh báo (`0 warnings`) nào**.

---

# 4. TỐI ƯU HIỆU SUẤT, SEO & ACCESSIBILITY (TRỌNG SỐ 10%)
1. **Tối ưu hình ảnh & Chỉ số Core Web Vitals (Lighthouse):**
   - Mọi thẻ `<img>` đều phải có thuộc tính `alt` mô tả chính xác nội dung, khai báo `width`/`height` hoặc `aspect-ratio` rõ ràng để tránh dịch chuyển bố cục (`CLS`).
   - Áp dụng `loading="lazy"` cho toàn bộ hình ảnh nằm ngoài màn hình hiển thị đầu tiên (below-the-fold).
2. **Chuẩn SEO On-Page & Accessibility (A11y):**
   - Mỗi trang có thẻ `<title>` riêng phản ánh đúng nội dung trang, `<meta name="description">` và `<link rel="icon">`.
   - Mỗi trang chỉ có **duy nhất 1 thẻ `<h1>`**; các thẻ `<h2>`, `<h3>`, `<h4>` phân cấp tuần tự, không nhảy cấp.
   - Đảm bảo độ tương phản màu sắc tốt, gắn `aria-label` cho các nút chỉ có icon và hỗ trợ điều hướng bàn phím (`focus`).

---

# 5. QUY TẮC HỖ TRỢ GITHUB & BÁO CÁO ĐỒ ÁN (TRỌNG SỐ 15%)
- Khi sinh hoặc sửa code, luôn chỉ rõ đường dẫn file cần đặt mã nguồn và giữ nguyên tính nhất quán với các file hiện có.
- Khi hỗ trợ viết báo cáo hoặc `README.md`, trình bày theo văn phong học thuật kỹ thuật, bám sát cấu trúc chuẩn của môn IE104 (Mô tả bài toán, Sitemap, Rule Code, Phân tích luồng hoạt động từng chức năng/component, và quy trình kiểm thử W3C Validator / Responsive / DevTools / Lighthouse).

### Quy tắc bổ sung
(Các quy tắc mới được thêm vào đây, mỗi quy tắc một dòng, đánh số tiếp theo.)
1. Đối với mã nguồn hiện tại của repository (35 file), giữ nguyên cấu trúc thư mục phẳng hiện có (`index.html`, `search.html`, `detail.html`, `tracker.html`, `profile.html`, `about.html`, `contact.html`, `login.html`, `register.html`, `terms.html`, `privacy.html`, `css/`, `js/`, `data/`, `images/`) và các quy tắc vận hành tại Mục 7 của tài liệu kiến trúc hiện hành bên dưới (không tự ý sửa `#site-header`/`#site-footer` trong HTML, giữ script inline chống FOUC đầu `<body>`, giữ nguyên schema `data/` và các class runtime). Khi viết code mới hoặc refactor theo yêu cầu, áp dụng chuẩn code Phần 1 (BEM, tiền tố `js-` cho hook JS, không dùng inline CSS/JS mới, chuẩn W3C HTML5/CSS3, A11y, SEO và comment tiếng Việt), trừ khi người dùng yêu cầu tái cấu trúc toàn bộ dự án.

---

## PHẦN 2 – TÀI LIỆU KIẾN TRÚC & QUY TẮC HIỆN HÀNH CỦA REPO (NỘI DUNG GỐC CỦA AGENT.MD)

# ConfGuide — Agent Context & Architectural Reference

Tài liệu hướng dẫn kỹ thuật dành cho AI Agents và Lập trình viên tiếp tục phát triển dự án ConfGuide.

---

## 1. Tổng quan & Bản chất Kỹ thuật Cốt lõi
- **Tổng quan**: ConfGuide là nền tảng web tĩnh hỗ trợ tra cứu, đánh giá và theo dõi các hội nghị khoa học công nghệ thông tin tại Việt Nam. Ứng dụng giúp các nhà nghiên cứu, giảng viên và sinh viên dễ dàng tìm kiếm sự kiện phù hợp, nắm bắt hạn nộp bài (AoE) và quản lý tiến độ nộp bài.
- **Công nghệ (Tech Stack)**: Semantic HTML5, CSS thuần hiện đại (CSS Custom Properties, Flexbox, Grid), Vanilla JavaScript (ES6+). Hoàn toàn không dùng framework (React, Vue), không sử dụng bundler hay công cụ build (zero build tools, zero npm dependencies).
- **Phạm vi sản phẩm**: Dự án định hướng phục vụ tra cứu các hội nghị khoa học CNTT được tổ chức tại Việt Nam.
- **Ràng buộc tương thích file:/// & Web Server tĩnh**:
  - Mã nguồn tương thích khi chạy qua máy chủ HTTP tĩnh (Live Server, `python -m http.server`) cũng như khi mở trực tiếp file HTML từ ổ đĩa qua giao thức `file:///`.
  - Không tải template HTML bằng `fetch()`; toàn bộ Header và Footer được render động bằng JavaScript template string trong [`js/layout.js`](file:///d:/IE104/doangithub/confeguide/js/layout.js).
  - Mọi thao tác nạp dữ liệu từ thư mục `data/` qua `fetch()` đều có khối `try/catch` với dữ liệu dự phòng tĩnh (`FALLBACK_CONFERENCES`, `SEED_USERS`, `DEFAULT_UTILS`) phòng trường hợp trình duyệt chặn CORS trên giao thức `file:///`.

---

## 2. Bản đồ Cấu trúc File (File Map — 35 Files)

Dự án gồm 35 file chính thức, được phân định rõ ràng giữa tài nguyên dùng chung và module riêng cho từng trang:

### 2.1. Các Trang HTML (HTML Pages — 11 trang)
| File | Mục đích | Script & Style đi kèm |
|---|---|---|
| [`index.html`](file:///d:/IE104/doangithub/confeguide/index.html) | Trang chủ & Cổng tìm kiếm nhanh (Search Gateway, danh sách 6 hội nghị tiêu biểu sắp diễn ra, gợi ý chủ đề) | `css/base.css`, `css/home.css`, `js/layout.js`, `js/script.js` |
| [`search.html`](file:///d:/IE104/doangithub/confeguide/search.html) | Tra cứu nâng cao: bộ lọc accordion đa chiều (Rank CORE, Hình thức, Lĩnh vực, NXB, Trạng thái, Deadline), đồng bộ URL parameters, chip tags | `css/base.css`, `css/search.css`, `js/layout.js`, `js/app.js` |
| [`detail.html`](file:///d:/IE104/doangithub/confeguide/detail.html) | Chi tiết hội nghị theo `?id=<slug>`, timeline 4 mốc hạn AoE, đánh giá sao cộng đồng, lưu theo dõi | `css/base.css`, `css/detail.css`, `js/layout.js`, `js/detail.js` |
| [`tracker.html`](file:///d:/IE104/doangithub/confeguide/tracker.html) | Theo dõi hội nghị: quản lý danh sách hội nghị đã lưu theo người dùng qua LocalStorage | `css/base.css`, `css/tracker.css`, `js/layout.js`, `js/tracker.js` |
| [`profile.html`](file:///d:/IE104/doangithub/confeguide/profile.html) | Hồ sơ cá nhân: thông tin nghiên cứu, chỉnh sửa hồ sơ, đổi avatar, đồng bộ LocalStorage (bảo vệ bởi auth guard) | `css/base.css`, `css/profile.css`, `js/layout.js`, `js/profile.js` |
| [`about.html`](file:///d:/IE104/doangithub/confeguide/about.html) | Giới thiệu đồ án môn học IE104, đội ngũ UIT, roadmap và modal đề xuất hội nghị mới | `css/base.css`, `css/about.css`, `js/layout.js`, `js/about.js` |
| [`contact.html`](file:///d:/IE104/doangithub/confeguide/contact.html) | Liên hệ & đóng góp thông tin hội nghị | `css/base.css`, `js/layout.js` |
| [`login.html`](file:///d:/IE104/doangithub/confeguide/login.html) | Đăng nhập tài khoản (hỗ trợ chuyển hướng `?redirect=<url>`) | `css/base.css`, `css/auth.css`, `js/layout.js`, `js/auth.js` |
| [`register.html`](file:///d:/IE104/doangithub/confeguide/register.html) | Đăng ký tài khoản người dùng mới | `css/base.css`, `css/auth.css`, `js/layout.js`, `js/auth.js` |
| [`terms.html`](file:///d:/IE104/doangithub/confeguide/terms.html) | Điều khoản & Điều kiện sử dụng website | `css/base.css`, `js/layout.js` |
| [`privacy.html`](file:///d:/IE104/doangithub/confeguide/privacy.html) | Chính sách bảo mật thông tin và quyền riêng tư | `css/base.css`, `js/layout.js` |

### 2.2. Kiểu dáng & Giao diện (CSS — 8 files)
| File | Vai trò | Mô tả |
|---|---|---|
| [`css/base.css`](file:///d:/IE104/doangithub/confeguide/css/base.css) | **[DÙNG CHUNG]** | Hệ thống design tokens tỷ lệ 60:30:10, bảng màu Dark Mode, typography, header chung (72px, 4 nav items, theme toggle, avatar/auth), footer 4 cột, modals toàn cục, toast notifications và layout chung cho các trang chính sách. Nạp ở mọi trang. |
| [`css/home.css`](file:///d:/IE104/doangithub/confeguide/css/home.css) | **[MODULE RIÊNG]** | Styles trang chủ (hero section, ô tìm kiếm gateway, suggestion chips, grid thẻ hội nghị tiêu biểu, 3 feature cards). |
| [`css/search.css`](file:///d:/IE104/doangithub/confeguide/css/search.css) | **[MODULE RIÊNG]** | Styles trang tra cứu (thanh tìm kiếm kèm ví dụ gợi ý, sidebar bộ lọc accordion đóng/mở, thanh active chips, grid kết quả tra cứu). |
| [`css/detail.css`](file:///d:/IE104/doangithub/confeguide/css/detail.css) | **[MODULE RIÊNG]** | Styles trang chi tiết hội nghị (hero banner hội nghị, timeline AoE 4 mốc, khối đánh giá sao, liên kết ngoài). |
| [`css/tracker.css`](file:///d:/IE104/doangithub/confeguide/css/tracker.css) | **[MODULE RIÊNG]** | Styles trang theo dõi nộp bài (bảng dữ liệu hội nghị đã lưu, đếm ngược hạn, nút gỡ bỏ). |
| [`css/profile.css`](file:///d:/IE104/doangithub/confeguide/css/profile.css) | **[MODULE RIÊNG]** | Styles trang hồ sơ cá nhân (thiết kế dual-surface: banner tối ở trên và card thông tin nền trắng/surface ở dưới, modal chỉnh sửa). |
| [`css/auth.css`](file:///d:/IE104/doangithub/confeguide/css/auth.css) | **[MODULE RIÊNG]** | Styles màn hình đăng nhập và đăng ký (layout 2 cột, banner giới thiệu bên trái, form nhập liệu bên phải). |
| [`css/about.css`](file:///d:/IE104/doangithub/confeguide/css/about.css) | **[MODULE RIÊNG]** | Styles trang giới thiệu (giá trị cốt lõi, đội ngũ nghiên cứu, timeline roadmap, modal form đề xuất). |

### 2.3. Logic Ứng dụng (JavaScript — 8 files)
| File | Vai trò | Mô tả |
|---|---|---|
| [`js/layout.js`](file:///d:/IE104/doangithub/confeguide/js/layout.js) | **[DÙNG CHUNG]** | Render Header và Footer động vào `#site-header` và `#site-footer`. Xử lý đồng bộ `confguide_theme` (sáng/tối), quản lý session đăng nhập, auth guard (`profile.html`), các modal toàn cục (Cài đặt, Trợ giúp, Báo cáo sự cố) và form góp ý chân trang (debounce 10s). |
| [`js/script.js`](file:///d:/IE104/doangithub/confeguide/js/script.js) | **[MODULE RIÊNG]** | Logic trang chủ: điều hướng tìm kiếm sang `search.html?q=...`, xử lý click chip gợi ý chủ đề, nạp và hiển thị tối đa 6 thẻ hội nghị sắp tới. |
| [`js/app.js`](file:///d:/IE104/doangithub/confeguide/js/app.js) | **[MODULE RIÊNG]** | Logic trang tra cứu: nạp dữ liệu, lọc đa tiêu chí (Rank, Hình thức, Lĩnh vực, NXB, Trạng thái, Deadline), đồng bộ 2 chiều URL parameters (`history.replaceState`), active filter chips, lưu hội nghị theo người dùng. |
| [`js/detail.js`](file:///d:/IE104/doangithub/confeguide/js/detail.js) | **[MODULE RIÊNG]** | Logic chi tiết hội nghị: đọc `?id=<slug>`, hiển thị dữ liệu hội nghị, timeline 4 mốc (kèm fallback an toàn), đánh giá sao cộng đồng, nút lưu bookmark. |
| [`js/tracker.js`](file:///d:/IE104/doangithub/confeguide/js/tracker.js) | **[MODULE RIÊNG]** | Logic quản lý danh sách hội nghị đã theo dõi qua LocalStorage theo user ID (hiển thị, xóa khỏi danh sách). |
| [`js/profile.js`](file:///d:/IE104/doangithub/confeguide/js/profile.js) | **[MODULE RIÊNG]** | Logic hồ sơ cá nhân: hiển thị thông tin user, mở modal cập nhật thông tin, cập nhật avatar, đồng bộ LocalStorage. |
| [`js/auth.js`](file:///d:/IE104/doangithub/confeguide/js/auth.js) | **[MODULE RIÊNG]** | Logic xác thực đăng nhập/đăng ký: mã hóa SHA-256 (Web Crypto API), nạp seed 20 tài khoản mẫu không trùng lặp, xử lý tham số `?redirect=`. |
| [`js/about.js`](file:///d:/IE104/doangithub/confeguide/js/about.js) | **[MODULE RIÊNG]** | Logic trang giới thiệu: nạp dữ liệu từ `data/about.json`, xử lý modal đề xuất hội nghị mới lưu vào `confguide_proposals`. |

### 2.4. Dữ liệu & Script Phụ trợ (Data — 4 files)
| File | Vai trò | Mô tả |
|---|---|---|
| [`data/conference_data.json`](file:///d:/IE104/doangithub/confeguide/data/conference_data.json) | Dữ liệu chính | Mảng 36 hội nghị khoa học CNTT tại Việt Nam (kèm địa điểm, thời gian, deadlines, website). |
| [`data/users.json`](file:///d:/IE104/doangithub/confeguide/data/users.json) | Dữ liệu seed | Mảng 20 tài khoản người dùng mẫu phục vụ chạy thử nghiệm và kiểm thử đăng nhập. |
| [`data/about.json`](file:///d:/IE104/doangithub/confeguide/data/about.json) | Dữ liệu giới thiệu | Dữ liệu cấu trúc về môn học IE104, đội ngũ phát triển UIT và lộ trình phát triển. |
| [`data/main.py`](file:///d:/IE104/doangithub/confeguide/data/main.py) | Script độc lập | Script Python hỗ trợ thu thập/cập nhật dữ liệu hội nghị độc lập; không phải backend server của website. |

### 2.5. Tài nguyên Đồ họa & Tài liệu Cấu hình (4 files)
- [`images/logo.svg`](file:///d:/IE104/doangithub/confeguide/images/logo.svg): Logo nhận diện thương hiệu SVG dùng chung cho favicon và header.
- [`.gitignore`](file:///d:/IE104/doangithub/confeguide/.gitignore): Cấu hình bỏ qua các file tạm, log, cache môi trường ảo.
- [`AGENT.md`](file:///d:/IE104/doangithub/confeguide/AGENT.md): Tài liệu hướng dẫn kỹ thuật dành cho AI Agents.
- [`README.md`](file:///d:/IE104/doangithub/confeguide/README.md): Tài liệu hướng dẫn đồ án dành cho người đọc.

*(Lưu ý: File trùng `chitiet.html` và 7 file SVG banner không sử dụng trước đây đã được dọn sạch khỏi repository).*

---

## 3. Kiến trúc Dữ liệu & Cơ chế Đọc (Data Architecture)

### 3.1. Cấu trúc Bản ghi Hội nghị (`conference_data.json`)
Mỗi bản ghi hội nghị trong `data/conference_data.json` có cấu trúc chuẩn như sau:
```json
{
  "name": "SOICT 2026",
  "year": "2026",
  "website_url": "https://soict.org/",
  "deadline_url": "https://soict.org/submission/",
  "full_name": "The 15th International Symposium on Information and Communication Technology",
  "summarization": "SOICT 2026 is an international symposium...",
  "location": "Ho Chi Minh",
  "country": "Vietnam",
  "is_it_related": true,
  "date_happen": "2026-12-04 to 2026-12-05",
  "start_date": "2026-12-04",
  "end_date": "2026-12-05",
  "image_url": "https://soict.org/wp-content/uploads/...",
  "logo_url": "https://soict.org/wp-content/uploads/...",
  "deadlines": [
    { "name": "Abstract Submission", "date": "2026-09-20" },
    { "name": "Full Paper Submission", "date": "2026-09-20" },
    { "name": "Author Notification", "date": "2026-10-18" },
    { "name": "Camera-Ready Submission", "date": "2026-10-30" }
  ],
  "crawled_at": "2026-11-09T17:29:22+00:00",
  "status": "complete",
  "errors": []
}
```

### 3.2. Cơ chế Đọc Dữ liệu (Load Strategy)
- Các file JavaScript (`script.js`, `app.js`, `detail.js`) gọi `fetch('data/conference_data.json')`.
- Khi fetch thành công: Dữ liệu JSON được parse và hiển thị.
- Khi fetch thất bại (ví dụ duyệt qua `file:///` bị trình duyệt chặn): Cơ chế `catch` kích hoạt, tự động gán sang hằng số `FALLBACK_CONFERENCES` nhúng sẵn trong file JS để giao diện không bị trắng hoặc crash.

---

## 4. Quy tắc Điều hướng & Giao diện (Navigation & UI Conventions)

### 4.1. Điều hướng Header (Sticky 72px)
Được quản lý hoàn toàn tự động qua [`js/layout.js`](file:///d:/IE104/doangithub/confeguide/js/layout.js):
- **Trang Auth (`login.html`, `register.html`)**:
  - `<body>` được gắn class `auth-page`.
  - Header **không có thanh điều hướng 4 mục**, **không có footer**.
  - Có Logo thương hiệu, nút chuyển đổi chế độ sáng/tối, và nút chuyển đổi góc phải trên ("Đăng ký" nếu ở login, "Đăng nhập" nếu ở register).
- **Các trang còn lại (9 trang)**:
  - Header cố định 72px gồm 4 mục điều hướng chính:
    1. **Trang chủ** (`index.html`)
    2. **Tra cứu** (`search.html`)
    3. **Theo dõi hội nghị** (`tracker.html`)
    4. **Về chúng tôi** (`about.html`)
  - Tự động đánh dấu class `.active` cho link tương ứng với tên file HTML trên URL (`window.location.pathname`).
  - Nút chuyển theme sáng/tối (`#themeToggleBtn`).
  - Nút Auth: Khi chưa đăng nhập hiển thị cặp nút "Đăng nhập" / "Đăng ký". Khi đã đăng nhập hiển thị Avatar người dùng kèm dropdown menu (Trang cá nhân `profile.html`, Cài đặt & Quyền riêng tư, Trợ giúp, Báo cáo sự cố, Đăng xuất).

### 4.2. Chân trang Dùng chung (Shared 4-Column Footer)
- Cột 1: Thương hiệu ConfGuide, slogan, bản quyền `© 2026 ConfGuide`.
- Cột 2 (Khám phá): Chia 2 cụm liên kết (Chính: Trang chủ, Tra cứu, Theo dõi hội nghị, Hồ sơ; Phụ: Về chúng tôi, Liên hệ, Điều khoản, Chính sách).
- Cột 3 (Kết nối): Các kênh mạng xã hội học thuật (Facebook, LinkedIn, YouTube, ResearchGate).
- Cột 4 (Liên hệ & Góp ý): Email, hotline và ô gửi góp ý tức thì (chống spam với debounce 10 giây, lưu vào `confguide_feedback`).

### 4.3. Các Khác biệt Thiết kế Có chủ đích
1. **Trang hồ sơ (`profile.html`)**: Thiết kế phân tầng kép (dual-surface): Banner phần đầu có nền tối (`--surface-dark`), phần thân thẻ thông tin người dùng có nền trắng/surface sáng. Đây là định dạng chủ đích, không phải lỗi hiển thị.
2. **Hiệu ứng Liquid Glass & Visual Tokens**: Thẻ kính mờ (`backdrop-filter: blur(12px)`), viền mỏng tinh tế (`--border`), bo góc đồng bộ qua biến CSS (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`).
3. **Favicon**: Thống nhất `<link rel="icon" type="image/svg+xml" href="images/logo.svg">` trên toàn bộ 11 trang HTML.

---

## 5. Khóa Lưu trữ LocalStorage (Storage Keys)

| Tên Khóa | Kiểu Dữ liệu | Mục đích |
|---|---|---|
| `confguide_theme` | `"light"` \| `"dark"` | Lưu trạng thái giao diện (đồng bộ qua class `dark` trên `<body>`). |
| `confguide_current_user` | Object JSON | Phiên đăng nhập người dùng `{ id, username, email, fullName, role, avatarUrl }`. |
| `confguide_users` | Array JSON | Danh sách tài khoản người dùng đã đăng ký và 20 tài khoản seed mẫu. |
| `confguide_saved_${userId}` | Array JSON | Danh sách ID hội nghị đã lưu theo từng user (ví dụ `["soict-2026", "rivf-2026"]`). Với khách dùng `confguide_saved_guest`. |
| `confguide_feedback` | Array JSON | Danh sách phản hồi gửi từ form chân trang: `{ id, text, userId, createdAt }`. |
| `confguide_proposals` | Array JSON | Danh sách đề xuất hội nghị mới từ modal trang `about.html`. |
| `confguide_reports` | Array JSON | Danh sách báo cáo sự cố từ modal toàn cục: `{ id, category, confName, title, description, userId, createdAt, status }`. |
| `confguide_user_preferences` | Object JSON | Tùy chọn hiển thị của người dùng (ví dụ `{ aoe: true, countdown: true }`). |

---

## 6. Hướng dẫn Chạy & Kiểm thử Thực tế

### 6.1. Chạy Dự án
- **Cách 1: Sử dụng Visual Studio Code Live Server**
  - Mở thư mục gốc dự án trong VS Code.
  - Nhấp chuột phải vào `index.html` chọn **Open with Live Server**.
  - Ứng dụng chạy tại địa chỉ: `http://127.0.0.1:5500/` hoặc `http://localhost:5500/`.
- **Cách 2: Sử dụng Python Static Server (Đã kiểm chứng)**
  - Chạy lệnh:
    ```bash
    python -m http.server 8000
    ```
    (hoặc `python3 -m http.server 8000` tùy hệ điều hành).
  - Mở trình duyệt tại: `http://localhost:8000/`.
- **Lưu ý về `data/main.py`**: Đây là script độc lập dùng để cào/cập nhật dữ liệu từ các nguồn hội nghị; không phải máy chủ backend và không cần chạy script này để vận hành website.

### 6.2. Kiểm tra Tính toàn vẹn (Manual Checklist)
- Mở `index.html`: Header và Footer hiển thị đủ, tìm kiếm chuyển hướng sang `search.html?q=...`, click chip gợi ý lọc đúng từ khóa.
- Mở `search.html`: Các accordion bộ lọc đóng/mở mượt mà, gõ từ khóa và chọn lọc cập nhật kết quả theo thời gian thực, URL được đồng bộ tự động.
- Chuyển đổi Dark Mode: Nhấp nút mặt trăng/mặt trời, toàn bộ giao diện đổi màu đồng nhất, tải lại trang không bị giật nhấp nháy (FOUC).
- Thử nghiệm tài khoản: Đăng nhập bằng tài khoản mẫu trong `data/users.json` (ví dụ `researcher1` / mật khẩu dạng `user1@`), kiểm tra menu avatar và trang `profile.html`.

---

## 7. Bẫy Thường Gặp & Những Điều Cần Tránh (Fragile Code Traps)

1. **TUYỆT ĐỐI KHÔNG sửa Header và Footer trong các file HTML riêng lẻ**:
   - Khối `<div id="site-header"></div>` và `<div id="site-footer"></div>` phải để rỗng trong HTML. Toàn bộ markup được sinh động bởi `js/layout.js`. Mọi chỉnh sửa HTML thủ công ở hai khối này sẽ bị ghi đè khi trang tải.
2. **KHÔNG tự ý xóa class CSS "có vẻ không dùng" trong HTML**:
   - Rất nhiều class được tạo hoặc gắn động bằng JavaScript trong thời gian chạy (runtime).
   - Ví dụ các class quan trọng: `.dark`, `.show`, `.open`, `.active`, `.has-avatar-photo`, `.user-dropdown-menu`, `.layout-modal`, `.modal-alert`, `.footer-feedback-status`, `.chip-keyword`, `.conference-card`, `.timeline-step`, `.accordion-head`, `.accordion-body`, `.keyword`, v.v.
3. **KHÔNG chỉnh sửa cấu trúc thư mục `data/` mà không đối chiếu logic JS**:
   - `data/conference_data.json` được đọc bởi nhiều module (`script.js`, `app.js`, `detail.js`). Việc đổi tên trường dữ liệu (ví dụ `date_happen`, `deadlines`, `summarization`) sẽ dẫn đến lỗi hiển thị thẻ hội nghị hoặc timeline.
4. **Giữ nguyên thẻ script chống FOUC đầu thẻ `<body>`**:
   - Đoạn script inline đọc `confguide_theme` ở đầu thẻ `<body>` giúp kích hoạt class `dark` trước khi CSS render, ngăn chặn hiện tượng nhấp nháy màn hình trắng khi người dùng đang ở chế độ nền tối.
