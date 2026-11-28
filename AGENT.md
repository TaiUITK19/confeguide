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
   confeguide/
   ├── index.html                  # Trang chủ & cổng tìm kiếm nhanh
   ├── search.html                 # Trang tra cứu & lọc hội nghị đa chiều
   ├── detail.html                 # Trang chi tiết hội nghị (?id=<slug>)
   ├── tracker.html                # Trang theo dõi danh sách hội nghị đã lưu
   ├── profile.html                # Trang hồ sơ cá nhân & lịch mốc hạn (Auth Guard)
   ├── about.html                  # Trang giới thiệu đồ án IE104 & đề xuất hội nghị
   ├── contact.html                # Trang liên hệ & đóng góp thông tin
   ├── login.html                  # Trang đăng nhập tài khoản
   ├── register.html               # Trang đăng ký tài khoản mới
   ├── 404.html                    # Trang báo lỗi 404 tối giản
   ├── css/
   │   ├── base/                   # base.css, transition.css
   │   ├── components/             # calendar.css, compare.css
   │   └── pages/                  # 404.css, about.css, auth.css, detail.css, index.css, profile.css, search.css, tracker.css
   ├── js/
   │   ├── core/                   # layout.js, page-transition.js
   │   ├── components/             # calendar.js, compare.js, search-core.js
   │   └── pages/                  # about.js, auth.js, detail.js, index.js, profile.js, search.js, tracker.js
   ├── data/                       # about.json, conference_data.json, users.json
   ├── images/                     # logo.svg, ben-cang-nha-rong.jpg
   ├── .editorconfig
   ├── .gitignore
   ├── AGENT.md
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
1. Đối với mã nguồn hiện tại của repository (43 file sau tái cấu trúc và tinh gọn trang 404 bỏ `js/pages/404.js`), giữ nguyên 10 trang HTML phẳng ở gốc (`index.html`, `search.html`, `detail.html`, `tracker.html`, `profile.html`, `about.html`, `contact.html`, `login.html`, `register.html`, `404.html`), cấu trúc phân tầng `css/` (`base/`, `components/`, `pages/`), `js/` (`core/`, `components/`, `pages/`), `data/`, `images/`, `.editorconfig`, quy ước đặt tên chữ thường `kebab-case` (bộ ba `<trang>.html ↔ css/pages/<trang>.css ↔ js/pages/<trang>.js`, file data số nhiều), và các quy tắc vận hành tại Mục 7 của tài liệu kiến trúc bên dưới (không tự ý sửa `#site-header`/`#site-footer` trong HTML, giữ script inline chống FOUC đầu `<body>`, giữ nguyên schema `data/` và các class runtime). Khi viết code mới hoặc refactor theo yêu cầu, áp dụng chuẩn code Phần 1 (BEM, tiền tố `js-` cho hook JS, không dùng inline CSS/JS mới, chuẩn W3C HTML5/CSS3, A11y, SEO và comment tiếng Việt).
2. Ngoại lệ đặt tên tệp dữ liệu chính: tệp danh sách hội nghị sử dụng đường dẫn `data/conference_data.json` (dùng dấu gạch dưới `snake_case` thay vì `kebab-case`) theo xác nhận chủ động của chủ dự án.
3. Định hướng hiện hành của ConfGuide là hội nghị khoa học CNTT cả trong nước lẫn quốc tế; mọi văn bản, comment và tài liệu mới không được giới hạn phạm vi ở Việt Nam. Nhóm lọc Phạm vi suy ra lúc chạy từ `country`/`location`, không thêm trường mới vào `data/`. Múi giờ hiển thị chuẩn vẫn là UTC+7.
4. Ngoại lệ kiến trúc mở rộng cho tính năng Đăng nhập Google & Quản lý lĩnh vực thuần Frontend (xác nhận chủ động của chủ dự án): cho phép bổ sung thư mục `js/services/` (`google-auth.js`, `openalex.js`, `domain-mapper.js`) mà không thay đổi hoặc xóa cấu trúc thư mục hiện tại; cho phép `js/services/google-auth.js` nạp động thư viện Google Identity Services (`https://accounts.google.com/gsi/client`) chỉ trên môi trường `http:`/`https:` khi có OAuth Client ID cấu hình (có chế độ dự phòng không lỗi console trên `file:///` hoặc khi chưa cấu hình Client ID) và cho phép `js/services/openalex.js` gọi OpenAlex REST API công khai hỗ trợ CORS (`https://api.openalex.org`) để tìm hồ sơ tác giả và đọc `topics`.
5. Ngoại lệ bổ sung Backend nhỏ (xác nhận chủ động của chủ dự án): cho phép thêm thư mục `backend/` (Node.js + Express, các gói npm `express`, `cors`, `dotenv`, `google-auth-library`, `cheerio`) với cấu trúc `backend/server.js`, `backend/routes/`, `backend/services/scholar.js`, `backend/services/fieldMap.js` (ngoại lệ tên `camelCase` theo yêu cầu), `backend/.env.example`, `backend/.gitignore`, `backend/data/` (lưu `fields.json` theo email), cùng phần nối tối thiểu ở frontend để gọi API backend khi khả dụng và giữ fallback `localStorage` cho chế độ tĩnh.
6. Ngoại lệ cấu hình triển khai GitHub & Vercel (xác nhận chủ động của chủ dự án): cho phép bổ sung tệp cấu hình triển khai `vercel.json`, `package.json` (và `package-lock.json`) ở thư mục gốc cùng hàm serverless chuyển tiếp `api/index.js` gọi lại `backend/server.js`, cho phép ghi tệp tạm tại `os.tmpdir()` khi chạy trên môi trường read-only của Vercel.

---

## PHẦN 2 – TÀI LIỆU KIẾN TRÚC & QUY TẮC HIỆN HÀNH CỦA REPO (NỘI DUNG GỐC CỦA AGENT.MD)

# ConfGuide — Agent Context & Architectural Reference

Tài liệu hướng dẫn kỹ thuật dành cho AI Agents và Lập trình viên tiếp tục phát triển dự án ConfGuide.

---

## 1. Tổng quan & Bản chất Kỹ thuật Cốt lõi
- **Tổng quan**: ConfGuide là nền tảng web tĩnh hỗ trợ tra cứu, khuyến nghị và theo dõi hạn nộp bài của các hội nghị khoa học Công nghệ thông tin, trong nước lẫn quốc tế (không phụ thuộc nơi tổ chức). Ứng dụng giúp các nhà nghiên cứu, giảng viên và sinh viên dễ dàng tìm kiếm sự kiện phù hợp, nắm bắt hạn nộp bài theo giờ Việt Nam (`UTC+7`, quy đổi từ AoE) và quản lý tiến độ nộp bài.
- **Công nghệ (Tech Stack)**: Semantic HTML5, CSS thuần hiện đại (CSS Custom Properties, Flexbox, Grid), Vanilla JavaScript (ES6+). Hoàn toàn không dùng framework (React, Vue), không sử dụng bundler hay công cụ build (zero build tools, zero npm dependencies).
- **Phạm vi sản phẩm**: Dự án định hướng phục vụ tra cứu, khuyến nghị và theo dõi hạn nộp bài của các hội nghị khoa học thuộc lĩnh vực Công nghệ thông tin, trong nước lẫn quốc tế, không phụ thuộc nơi tổ chức.
- **Ràng buộc tương thích file:/// & Web Server tĩnh**:
  - Mã nguồn tương thích khi chạy qua máy chủ HTTP tĩnh (Live Server, `python -m http.server`) cũng như khi mở trực tiếp file HTML từ ổ đĩa qua giao thức `file:///`.
  - Không tải template HTML bằng `fetch()`; toàn bộ Header và Footer được render động bằng JavaScript template string trong [`js/core/layout.js`](file:///d:/IE104/doangithub/confeguide/js/core/layout.js).
  - Mọi thao tác nạp dữ liệu từ thư mục `data/` qua `fetch()` đều có khối `try/catch` với dữ liệu dự phòng tĩnh (`FALLBACK_CONFERENCES`, `SEED_USERS`, `DEFAULT_UTILS`) phòng trường hợp trình duyệt chặn CORS trên giao thức `file:///`.

---

## 2. Bản đồ Cấu trúc File & Quy ước Đặt tên (43 Files)

- **Quy ước đặt tên:** Chữ thường 100%, `kebab-case`, ASCII không dấu, không khoảng trắng, dùng danh từ tiếng Anh rõ nghĩa (dữ liệu dùng danh từ số nhiều, ngoại lệ `conference_data.json`).
- **Bộ ba theo trang:** `<trang>.html` ↔ `css/pages/<trang>.css` ↔ `js/pages/<trang>.js` (riêng `login.html` và `register.html` dùng chung `auth.css`/`auth.js`; trang không có CSS/JS riêng không tạo file rỗng).
- **Phân tầng tài nguyên:** `css/base/` → `css/components/` → `css/pages/` (giữ nguyên thứ tự `<link>` cascade); `js/core/` → `js/components/` → `js/pages/` (giữ nguyên thứ tự thực thi). Thư mục `images/` đặt phẳng gồm `logo.svg` và `ben-cang-nha-rong.jpg`.

### 2.1. Các Trang HTML (HTML Pages — 10 trang, đặt phẳng ở gốc)
| File | Mục đích | Style & Script đi kèm |
|---|---|---|
| [`index.html`](file:///d:/IE104/doangithub/confeguide/index.html) | Trang chủ & Cổng tìm kiếm nhanh (Hero Slider 3 slide, Slide 1 gợi ý cá nhân hóa tối giản, danh sách hội nghị sắp diễn ra gom nhóm theo rank cuộn ngang, so sánh) | `css/base/base.css`, `css/pages/index.css`, `css/components/compare.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js`, `js/components/search-core.js`, `js/components/compare.js`, `js/pages/index.js` |
| [`search.html`](file:///d:/IE104/doangithub/confeguide/search.html) | Tra cứu nâng cao: 7 nhóm bộ lọc accordion (Hạn nộp bài, Lĩnh vực gộp + Xem thêm, Phạm vi Việt Nam/Quốc tế, Địa điểm, Thời gian diễn ra `ongoing`/`next1`/`next3`/`next6`/`unknown`, Hình thức tổ chức Trực tiếp/Trực tuyến/Kết hợp/Chưa rõ hình thức, Rank CORE), đồng bộ URL parameters | `css/base/base.css`, `css/pages/search.css`, `css/components/compare.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js`, `js/components/compare.js`, `js/components/search-core.js`, `js/pages/search.js` |
| [`detail.html`](file:///d:/IE104/doangithub/confeguide/detail.html) | Chi tiết hội nghị theo `?id=<slug>`, timeline trượt ngang toàn bộ mốc hạn AoE/UTC+7 căn giữa mốc đang chọn, Giới thiệu, Thông tin học thuật (Xếp hạng, Lĩnh vực nghiên cứu, Xác minh lần cuối), lưu theo dõi, xuất lịch | `css/base/base.css`, `css/pages/detail.css`, `css/components/compare.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js`, `js/components/compare.js`, `js/pages/detail.js` |
| [`tracker.html`](file:///d:/IE104/doangithub/confeguide/tracker.html) | Theo dõi hội nghị: quản lý danh sách hội nghị đã lưu theo người dùng qua LocalStorage | `css/base/base.css`, `css/pages/tracker.css`, `css/components/compare.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js`, `js/components/compare.js`, `js/pages/tracker.js` |
| [`profile.html`](file:///d:/IE104/doangithub/confeguide/profile.html) | Hồ sơ cá nhân: thông tin nghiên cứu, bảng chọn lĩnh vực quan tâm, lịch mốc hạn cá nhân, chỉnh sửa hồ sơ, đổi avatar (bảo vệ bởi auth guard) | `css/base/base.css`, `css/pages/profile.css`, `css/components/compare.css`, `css/components/calendar.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js`, `js/components/compare.js`, `js/components/calendar.js`, `js/pages/profile.js` |
| [`about.html`](file:///d:/IE104/doangithub/confeguide/about.html) | Giới thiệu đồ án môn học IE104, đội ngũ UIT, roadmap và modal đề xuất hội nghị mới | `css/base/base.css`, `css/pages/about.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js`, `js/pages/about.js` |
| [`contact.html`](file:///d:/IE104/doangithub/confeguide/contact.html) | Liên hệ & đóng góp thông tin hội nghị | `css/base/base.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js` |
| [`login.html`](file:///d:/IE104/doangithub/confeguide/login.html) | Đăng nhập tài khoản (hỗ trợ chuyển hướng `?redirect=<url>`) | `css/base/base.css`, `css/pages/auth.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js`, `js/pages/auth.js` |
| [`register.html`](file:///d:/IE104/doangithub/confeguide/register.html) | Đăng ký tài khoản người dùng mới (gắn cờ khảo sát cá nhân hóa lần sử dụng đầu) | `css/base/base.css`, `css/pages/auth.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js`, `js/pages/auth.js` |
| [`404.html`](file:///d:/IE104/doangithub/confeguide/404.html) | Trang báo lỗi 404 Not Found tối giản: tự neo `<base>` trên route nhiều cấp, hiển thị thông báo 404 căn giữa và nút quay lại trang chủ | `css/base/base.css`, `css/pages/404.css`, `css/base/transition.css`, `js/core/page-transition.js`, `js/core/layout.js` |

### 2.2. Kiểu dáng & Giao diện (CSS — 12 files)
| File | Tầng / Vai trò | Mô tả |
|---|---|---|
| [`css/base/base.css`](file:///d:/IE104/doangithub/confeguide/css/base/base.css) | **Base** | Hệ thống design tokens OKLCH tỷ lệ 60:30:10, Dark Mode, typography, header chung (72px), footer 4 cột, modal toàn cục (Cài đặt, Bảng chọn lĩnh vực nghiên cứu dùng chung), toast. |
| [`css/base/transition.css`](file:///d:/IE104/doangithub/confeguide/css/base/transition.css) | **Base** | CSS `@view-transition`, `view-transition-name`, shared-element thanh tìm kiếm và fallback `is-entering` / `is-leaving`. |
| [`css/components/calendar.css`](file:///d:/IE104/doangithub/confeguide/css/components/calendar.css) | **Component** | Styles lưới lịch hạn nộp bài cá nhân (UTC+7) trên `profile.html`. |
| [`css/components/compare.css`](file:///d:/IE104/doangithub/confeguide/css/components/compare.css) | **Component** | Styles thanh nổi dưới đáy và modal bảng đối chiếu cạnh nhau tối đa 3 hội nghị. |
| [`css/pages/404.css`](file:///d:/IE104/doangithub/confeguide/css/pages/404.css) | **Page** | Styles trang báo lỗi 404 tối giản (căn giữa nội dung trên nền `--bg-hero`, Light & Dark Mode). |
| [`css/pages/about.css`](file:///d:/IE104/doangithub/confeguide/css/pages/about.css) | **Page** | Styles trang giới thiệu (giá trị cốt lõi, đội ngũ nghiên cứu, roadmap, modal đề xuất). |
| [`css/pages/auth.css`](file:///d:/IE104/doangithub/confeguide/css/pages/auth.css) | **Page** | Styles dùng chung cho `login.html` và `register.html` (nền `images/ben-cang-nha-rong.jpg` + lớp phủ `--auth-overlay`, layout 2 cột, form nhập liệu). |
| [`css/pages/detail.css`](file:///d:/IE104/doangithub/confeguide/css/pages/detail.css) | **Page** | Styles trang chi tiết hội nghị (hero banner, dải cuộn ngang timeline mốc hạn phóng to thẻ giữa/thu nhỏ hai bên, khối Giới thiệu, Thông tin học thuật `<dl>`, liên kết ngoài, sidebar đếm ngược). |
| [`css/pages/index.css`](file:///d:/IE104/doangithub/confeguide/css/pages/index.css) | **Page** | Styles trang chủ (hero 2 cột, Hero Slider, ô tìm kiếm nhanh, các hàng thẻ hội nghị thu gọn cuộn ngang gom nhóm theo rank, 3 feature cards). |
| [`css/pages/profile.css`](file:///d:/IE104/doangithub/confeguide/css/pages/profile.css) | **Page** | Styles trang hồ sơ cá nhân (Light Mode: dual-surface banner tối + thân sáng; Dark Mode: đồng bộ nền `--surface` tối; nút & chip lĩnh vực, modal chỉnh sửa). |
| [`css/pages/search.css`](file:///d:/IE104/doangithub/confeguide/css/pages/search.css) | **Page** | Styles trang tra cứu (hero tìm kiếm, combobox, sidebar bộ lọc accordion 6 nhóm, danh sách chủ đề thu gọn/cuộn, ẩn chân nút Desktop, drawer mobile, thẻ kết quả). |
| [`css/pages/tracker.css`](file:///d:/IE104/doangithub/confeguide/css/pages/tracker.css) | **Page** | Styles trang theo dõi nộp bài (bảng hội nghị đã lưu, đếm ngược hạn, nút gỡ bỏ). |

### 2.3. Logic Ứng dụng (JavaScript — 12 files)
| File | Tầng / Vai trò | Mô tả |
|---|---|---|
| [`js/core/layout.js`](file:///d:/IE104/doangithub/confeguide/js/core/layout.js) | **Core** | Render Header/Footer động vào `#site-header`/`#site-footer`, quản lý `confguide_theme`, session, auth guard, modal toàn cục, kích hoạt bảng chọn lĩnh vực lần đầu cho tài khoản mới (`maybeTriggerNewUserOnboarding`) và modal chọn lĩnh vực dùng chung (`openPreferencesSurveyModal`), góp ý chân trang. |
| [`js/core/page-transition.js`](file:///d:/IE104/doangithub/confeguide/js/core/page-transition.js) | **Core** | Điều phối View Transitions (`pageswap`/`pagereveal`), focus `#searchInput` sau chuyển trang và fallback `is-leaving`/`is-entering`. |
| [`js/components/calendar.js`](file:///d:/IE104/doangithub/confeguide/js/components/calendar.js) | **Component** | Logic thành phần lịch các mốc hội nghị cá nhân trên `profile.html`. |
| [`js/components/compare.js`](file:///d:/IE104/doangithub/confeguide/js/components/compare.js) | **Component** | Logic chọn tối đa 3 hội nghị qua `sessionStorage` và dựng bảng so sánh cạnh nhau. |
| [`js/components/search-core.js`](file:///d:/IE104/doangithub/confeguide/js/components/search-core.js) | **Component** | Lõi tìm kiếm thuần túy (chuẩn hóa văn bản, khớp mờ Levenshtein, chuẩn hóa phạm vi `normalizeScopeKey` & địa điểm `normalizeCityKey`, lọc mốc thời gian `matchesMonthGroup`, chuẩn hóa hình thức tổ chức `normalizeModeKey`, lọc lĩnh vực `matchesTopicValue`, tính điểm và facet pre-counts). |
| [`js/pages/about.js`](file:///d:/IE104/doangithub/confeguide/js/pages/about.js) | **Page** | Logic trang giới thiệu: nạp dữ liệu từ `data/about.json`, modal đề xuất hội nghị lưu vào `confguide_proposals`. |
| [`js/pages/auth.js`](file:///d:/IE104/doangithub/confeguide/js/pages/auth.js) | **Page** | Logic xác thực cho `login.html` và `register.html` (SHA-256, seed users, gắn cờ `needsOnboarding: true` khi đăng ký mới, `?redirect=`). |
| [`js/pages/detail.js`](file:///d:/IE104/doangithub/confeguide/js/pages/detail.js) | **Page** | Logic chi tiết hội nghị: đọc `?id=<slug>`, thanh trượt ngang timeline tự căn giữa mốc sắp tới gần nhất (`scroll-snap` + `scrollIntoView`), phần Giới thiệu, Thông tin học thuật 3 mục (`renderAcademicInfo`), nút lưu bookmark, xuất lịch `.ics`/Google Calendar. |
| [`js/pages/index.js`](file:///d:/IE104/doangithub/confeguide/js/pages/index.js) | **Page** | Logic trang chủ: điều hướng tìm kiếm sang `search.html?q=...`, Hero Slider (Slide 1 mở modal *Thêm lĩnh vực* `topicsOnly: true` khi trống và hiển thị tối đa 2 thẻ gợi ý gọn khi đã chọn) và hiển thị các hàng hội nghị sắp diễn ra gom nhóm theo `RANK_ORDER` (tối đa 10 thẻ/hàng, cuộn ngang). |
| [`js/pages/profile.js`](file:///d:/IE104/doangithub/confeguide/js/pages/profile.js) | **Page** | Logic hồ sơ cá nhân: hiển thị thông tin user, mở bảng chọn lĩnh vực (`topicsOnly: true`), modal cập nhật hồ sơ, đổi avatar 200x200, đồng bộ LocalStorage. |
| [`js/pages/search.js`](file:///d:/IE104/doangithub/confeguide/js/pages/search.js) | **Page** | Logic trang tra cứu: lọc đa tiêu chí 7 nhóm (mở 5 nhóm đầu gồm Phạm vi, thu gọn Hình thức & Phân hạng; nhóm lĩnh vực gộp + Xem thêm; nhóm Phạm vi kèm pre-count `updateScopeFacetCounts`; mốc Thời gian diễn ra; 4 hình thức gồm Chưa rõ hình thức), đồng bộ 2 chiều URL parameters (`?scope=`, `?topic=`..., hỗ trợ Back/Forward `restoreStateFromBrowserHistory`), lưu hội nghị. |
| [`js/pages/tracker.js`](file:///d:/IE104/doangithub/confeguide/js/pages/tracker.js) | **Page** | Logic quản lý danh sách hội nghị đã theo dõi qua LocalStorage theo user ID. |

### 2.4. Dữ liệu Tĩnh (Data — 3 files)
| File | Vai trò | Mô tả |
|---|---|---|
| [`data/conference_data.json`](file:///d:/IE104/doangithub/confeguide/data/conference_data.json) | Dữ liệu chính | Mảng các hội nghị khoa học CNTT trong nước và quốc tế (địa điểm, quốc gia, thời gian, lĩnh vực, hình thức, lệ phí, phân hạng CORE/CCF, deadlines, website). |
| [`data/users.json`](file:///d:/IE104/doangithub/confeguide/data/users.json) | Dữ liệu seed | Mảng 20 tài khoản người dùng mẫu phục vụ kiểm thử đăng nhập. |
| [`data/about.json`](file:///d:/IE104/doangithub/confeguide/data/about.json) | Dữ liệu giới thiệu | Dữ liệu cấu trúc về môn học IE104, đội ngũ UIT và lộ trình phát triển. |

### 2.5. Tài nguyên Đồ họa, Tài liệu & Cấu hình (6 files)
- [`images/logo.svg`](file:///d:/IE104/doangithub/confeguide/images/logo.svg): Logo nhận diện thương hiệu SVG dùng chung cho favicon, header và footer.
- [`images/ben-cang-nha-rong.jpg`](file:///d:/IE104/doangithub/confeguide/images/ben-cang-nha-rong.jpg): Ảnh nền Bến cảng Nhà Rồng lưu cục bộ cho lớp `.auth-page` trên `login.html` và `register.html`.
- [`.editorconfig`](file:///d:/IE104/doangithub/confeguide/.editorconfig): Cấu hình thống nhất bộ mã UTF-8, kết thúc dòng LF và thụt lề.
- [`.gitignore`](file:///d:/IE104/doangithub/confeguide/.gitignore): Cấu hình bỏ qua các file tạm, log, cache IDE và môi trường ảo.
- [`AGENT.md`](file:///d:/IE104/doangithub/confeguide/AGENT.md): Tài liệu hướng dẫn kỹ thuật dành cho AI Agents.
- [`README.md`](file:///d:/IE104/doangithub/confeguide/README.md): Tài liệu hướng dẫn đồ án dành cho người đọc (bao gồm 5 Phụ lục kỹ thuật A–E về tái cấu trúc, baseline/báo cáo tối ưu, chẩn đoán chuyển trang và báo cáo clean code).

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
  "location": "Ho Chi Minh City, Vietnam",
  "country": "Vietnam",
  "is_it_related": true,
  "date_happen": "2026-12-04 to 2026-12-05",
  "start_date": "2026-12-04",
  "end_date": "2026-12-05",
  "topics": ["ai", "data", "vision", "security"],
  "primary_topic": "ai",
  "topic_labels": ["Trí tuệ nhân tạo & Học máy", "Khoa học dữ liệu & Dữ liệu lớn"],
  "attendance_mode": "offline",
  "attendance_label": "Trực tiếp",
  "registration_fees": [{ "category": "Author (full registration)", "amount": 550, "currency": "USD" }],
  "fee_min": 250,
  "fee_max": 650,
  "fee_currency": "USD",
  "fee_note": "...",
  "image_url": "https://soict.org/wp-content/uploads/...",
  "logo_url": "https://soict.org/wp-content/uploads/...",
  "deadlines": [
    { "name": "Abstract Submission", "date": "2026-09-20" },
    { "name": "Full Paper Submission", "date": "2026-09-20" },
    { "name": "Author Notification", "date": "2026-10-18" },
    { "name": "Camera-Ready Submission", "date": "2026-10-30" }
  ],
  "crawled_at": "2026-11-20T01:33:35+00:00",
  "status": "complete",
  "errors": [],
  "rank": { "core": null, "core_source": null, "ccf": null, "matched_title": null, "matched_by": null }
}
```

### 3.2. Cơ chế Đọc Dữ liệu (Load Strategy)
- Các file JavaScript (`js/pages/index.js`, `js/pages/search.js`, `js/pages/detail.js`, `js/pages/tracker.js`, `js/pages/profile.js`, `js/components/compare.js`) gọi `fetch('data/conference_data.json')` (ưu tiên qua `ConfGuideUtils.fetchJsonCached`).
- Khi fetch thành công: Dữ liệu JSON được parse và hiển thị.
- Khi fetch thất bại (ví dụ duyệt qua `file:///` bị trình duyệt chặn): Cơ chế `catch` kích hoạt, tự động gán sang hằng số `FALLBACK_CONFERENCES` nhúng sẵn trong file JS để giao diện không bị trắng hoặc crash.

---

## 4. Quy tắc Điều hướng & Giao diện (Navigation & UI Conventions)

### 4.1. Điều hướng Header (Sticky 72px)
Được quản lý hoàn toàn tự động qua [`js/core/layout.js`](file:///d:/IE104/doangithub/confeguide/js/core/layout.js):
- **Trang Auth (`login.html`, `register.html`)**:
  - `<body>` được gắn class `auth-page`.
  - Header **không có thanh điều hướng 4 mục**, **không có footer**.
  - Có Logo thương hiệu, nút chuyển đổi chế độ sáng/tối, và nút chuyển đổi góc phải trên ("Đăng ký" nếu ở login, "Đăng nhập" nếu ở register).
- **Các trang còn lại (8 trang, gồm 7 trang nội dung và `404.html`)**:
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
- Cột 2 (Khám phá): Chia 2 cụm liên kết (Chính: Trang chủ, Tra cứu, Theo dõi hội nghị, Hồ sơ; Phụ: Về chúng tôi, Liên hệ, Điều khoản & Điều kiện → `404.html?reason=broken-link&from=terms.html`, Chính sách bảo mật → `404.html?reason=broken-link&from=privacy.html`).
- Cột 3 (Kết nối): Các kênh mạng xã hội học thuật (Facebook, LinkedIn, YouTube, ResearchGate; tất cả trỏ về `404.html?reason=broken-link&from=social%2F...`).
- Cột 4 (Liên hệ & Góp ý): Email, hotline và ô gửi góp ý tức thì (chống spam với debounce 10 giây, lưu vào `confguide_feedback`).

### 4.3. Các Khác biệt Thiết kế Có chủ đích
1. **Trang hồ sơ (`profile.html`)**: Ở Light Mode dùng thiết kế phân tầng kép (dual-surface): banner phần đầu có nền tối (`--surface-dark`), phần thân thẻ thông tin người dùng có nền trắng/surface sáng (`--surface`); khi chuyển sang Dark Mode (`body.dark`), toàn bộ phần thân thẻ đồng bộ chuyển sang nền tối `--surface`.
2. **Hiệu ứng Kính mờ & Visual Tokens**: Thanh điều hướng bán trong suốt (`backdrop-filter: blur(14px)`), viền mỏng tinh tế (`--border`), bo góc đồng bộ qua biến CSS (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`).
3. **Favicon**: Thống nhất `<link rel="icon" type="image/svg+xml" href="images/logo.svg">` trên toàn bộ 10 trang HTML.

---

## 5. Khóa Lưu trữ LocalStorage & SessionStorage (Storage Keys)

| Tên Khóa | Kiểu Dữ liệu | Mục đích |
|---|---|---|
| `confguide_theme` | `"light"` \| `"dark"` | Lưu trạng thái giao diện (đồng bộ qua class `dark` trên `<body>`). |
| `confguide_current_user` | Object JSON | Phiên đăng nhập người dùng `{ id, username, email, name, fullName, role, avatarUrl, fieldsOfInterest, needsOnboarding }`. |
| `confguide_users` | Array JSON | Danh sách tài khoản người dùng đã đăng ký (gắn `needsOnboarding: true` ở tài khoản mới) và 20 tài khoản seed mẫu. |
| `confguide_saved_${userId}` | Array JSON | Danh sách ID hội nghị đã lưu theo từng user (ví dụ `["soict-2026", "rivf-2026"]`). Với khách dùng `confguide_saved_guest`. |
| `confguide_feedback` | Array JSON | Danh sách phản hồi gửi từ form chân trang: `{ id, text, userId, createdAt }`. |
| `confguide_proposals` | Array JSON | Danh sách đề xuất hội nghị mới từ modal trang `about.html`. |
| `confguide_reports` | Array JSON | Danh sách báo cáo sự cố từ modal toàn cục: `{ id, category, confName, title, description, userId, createdAt, status }`. |
| `confguide_contact_messages` | Array JSON | Danh sách tin nhắn liên hệ gửi từ biểu mẫu `contact.html`. |
| `confguide_user_preferences` | Object JSON | Tùy chọn người dùng `{ aoe, countdown, purpose, bannerDismissed, onboardingCompleted, updatedAt }`. |
| `confguides` | Array JSON | Danh sách mốc hạn nộp bài cá nhân (Tracker cá nhân) đồng bộ vào Lịch trên `profile.html`. |
| `confguide_compare_ids` *(SessionStorage)* | Array JSON | Danh sách tối đa 3 ID hội nghị đang chọn so sánh cạnh nhau. |

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

### 6.2. Kiểm tra Tính toàn vẹn (Manual Checklist)
- Mở `index.html`: Header và Footer hiển thị đủ, tìm kiếm chuyển hướng sang `search.html?q=...`, click chip gợi ý lọc đúng từ khóa.
- Mở `search.html`: Các accordion bộ lọc đóng/mở mượt mà, gõ từ khóa và chọn lọc cập nhật kết quả theo thời gian thực, URL được đồng bộ tự động.
- Chuyển đổi Dark Mode: Nhấp nút mặt trăng/mặt trời, toàn bộ giao diện đổi màu đồng nhất, tải lại trang không bị giật nhấp nháy (FOUC).
- Thử nghiệm tài khoản: Đăng nhập bằng tài khoản mẫu trong `data/users.json` (ví dụ `researcher1` / mật khẩu dạng `user1@`), kiểm tra menu avatar và trang `profile.html`.

---

## 7. Bẫy Thường Gặp & Những Điều Cần Tránh (Fragile Code Traps)

1. **TUYỆT ĐỐI KHÔNG sửa Header và Footer trong các file HTML riêng lẻ**:
   - Khối `<div id="site-header"></div>` và `<div id="site-footer"></div>` phải để rỗng trong HTML. Toàn bộ markup được sinh động bởi `js/core/layout.js`. Mọi chỉnh sửa HTML thủ công ở hai khối này sẽ bị ghi đè khi trang tải.
2. **KHÔNG tự ý xóa class CSS "có vẻ không dùng" trong HTML**:
   - Rất nhiều class được tạo hoặc gắn động bằng JavaScript trong thời gian chạy (runtime).
   - Ví dụ các class quan trọng: `.dark`, `.show`, `.open`, `.active`, `.has-avatar-photo`, `.user-dropdown-menu`, `.layout-modal`, `.modal-alert`, `.footer-feedback-status`, `.chip-keyword`, `.conference-card`, `.timeline-step`, `.accordion-head`, `.accordion-body`, `.keyword`, v.v.
3. **KHÔNG chỉnh sửa cấu trúc thư mục `data/` mà không đối chiếu logic JS**:
   - `data/conference_data.json` được đọc bởi nhiều module (`js/pages/index.js`, `js/pages/search.js`, `js/pages/detail.js`, `js/pages/tracker.js`, `js/pages/profile.js`, `js/components/compare.js`). Việc đổi tên trường dữ liệu (ví dụ `date_happen`, `deadlines`, `summarization`) sẽ dẫn đến lỗi hiển thị thẻ hội nghị hoặc timeline.
4. **Giữ nguyên thẻ script chống FOUC đầu thẻ `<body>`**:
   - Đoạn script inline đọc `confguide_theme` ở đầu thẻ `<body>` giúp kích hoạt class `dark` trước khi CSS render, ngăn chặn hiện tượng nhấp nháy màn hình trắng khi người dùng đang ở chế độ nền tối.
