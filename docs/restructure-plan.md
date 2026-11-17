# Kế hoạch Tái cấu trúc Repository ConfGuide (IE104)

Tài liệu này ghi nhận kết quả kiểm kê Bước 1 và bảng ánh xạ chính thức từ cấu trúc phẳng ban đầu sang cấu trúc phân tầng theo chức năng (Bước 2), phục vụ tái cấu trúc an toàn trên nhánh `refactor/repo-structure` bằng `git mv`.

---

## 1. Quy ước Đặt tên & Nguyên tắc Tổ chức

- **Định dạng tên tệp/thư mục:** Chữ thường 100%, `kebab-case`, chỉ dùng ASCII không dấu, không khoảng trắng, danh từ tiếng Anh rõ nghĩa, tránh viết tắt mơ hồ.
- **Bộ ba theo trang:** `<trang>.html` ↔ `css/pages/<trang>.css` ↔ `js/pages/<trang>.js` (trang không có CSS/JS riêng thì không tạo tệp rỗng).
- **CSS 3 tầng (`css/`):**
  - `css/base/` — biến màu OKLCH, reset, typography, bố cục dùng chung toàn site và hiệu ứng chuyển trang.
  - `css/components/` — thành phần dùng lại trên nhiều trang (thanh & bảng so sánh, lịch hạn nộp bài).
  - `css/pages/` — stylesheet riêng từng trang, giữ nguyên thứ tự `<link>` (cascade) hiện có.
- **JS 3 tầng (`js/`):**
  - `js/core/` — lõi dùng chung toàn site (Header/Footer, Theme, Session, Auth Guard, điều phối chuyển trang).
  - `js/components/` — module thành phần tái sử dụng (So sánh, Lõi tìm kiếm, Lịch).
  - `js/pages/` — điểm khởi chạy và logic nghiệp vụ từng trang, giữ nguyên thứ tự `<script>`.
- **Thư mục con tối thiểu 2 tệp:** `images/` hiện chỉ có duy nhất `logo.svg` nên giữ nguyên tại `images/logo.svg` (không tạo thư mục con `images/logos/` chỉ chứa 1 tệp); các trang HTML giữ phẳng ở thư mục gốc để phục vụ trực tiếp qua GitHub Pages.
- **Bất biến dữ liệu (`data/`):** Chỉ đổi tên tệp cho đúng quy ước, **không sửa bất kỳ byte nào bên trong** các tệp dữ liệu (đối chiếu bằng `sha256sum` trước và sau).

---

## 2. Bảng Ánh xạ Cũ → Mới (Toàn bộ Repository)

### 2.1. Nhóm HTML (11 tệp — giữ phẳng ở gốc)

| Đường dẫn cũ | Đường dẫn mới | Lý do |
|---|---|---|
| `index.html` | `index.html` | Đã đúng quy ước tiếng Anh, chữ thường, đặt ở gốc cho GitHub Pages (chỉ cập nhật đường dẫn CSS/JS) |
| `search.html` | `search.html` | Đã đúng quy ước (chỉ cập nhật đường dẫn CSS/JS và chú thích data) |
| `detail.html` | `detail.html` | Đã đúng quy ước (chỉ cập nhật đường dẫn CSS/JS) |
| `tracker.html` | `tracker.html` | Đã đúng quy ước (chỉ cập nhật đường dẫn CSS/JS) |
| `profile.html` | `profile.html` | Đã đúng quy ước (chỉ cập nhật đường dẫn CSS/JS) |
| `about.html` | `about.html` | Đã đúng quy ước (chỉ cập nhật đường dẫn CSS/JS) |
| `contact.html` | `contact.html` | Đã đúng quy ước, không có CSS/JS riêng (không tạo tệp rỗng) |
| `login.html` | `login.html` | Đã đúng quy ước (cùng dùng `auth.css`/`auth.js`) |
| `register.html` | `register.html` | Đã đúng quy ước (cùng dùng `auth.css`/`auth.js`) |
| `terms.html` | `terms.html` | Đã đúng quy ước, không có CSS/JS riêng (không tạo tệp rỗng) |
| `privacy.html` | `privacy.html` | Đã đúng quy ước, không có CSS/JS riêng (không tạo tệp rỗng) |

### 2.2. Nhóm CSS (11 tệp → `css/base/`, `css/components/`, `css/pages/`)

| Đường dẫn cũ | Đường dẫn mới | Lý do |
|---|---|---|
| `css/base.css` | `css/base/base.css` | Đưa CSS nền tảng dùng chung toàn site (tokens OKLCH, reset, typography, header/footer) vào `css/base/` |
| `css/transition.css` | `css/base/transition.css` | CSS chuyển trang `@view-transition` dùng chung trên cả 11/11 trang |
| `css/compare.css` | `css/components/compare.css` | Thành phần UI thanh/modal So sánh hội nghị dùng lại trên 5 trang |
| `css/calendar.css` | `css/components/calendar.css` | Thành phần UI lịch các mốc hội nghị (`profile.html`) |
| `css/home.css` | `css/pages/index.css` | Sửa tên lệch quy ước (`home` → `index`) để khớp bộ ba `index.html ↔ index.css ↔ index.js` |
| `css/search.css` | `css/pages/search.css` | Gom stylesheet trang Tra cứu vào `css/pages/` |
| `css/detail.css` | `css/pages/detail.css` | Gom stylesheet trang Chi tiết vào `css/pages/` |
| `css/tracker.css` | `css/pages/tracker.css` | Gom stylesheet trang Theo dõi vào `css/pages/` |
| `css/profile.css` | `css/pages/profile.css` | Gom stylesheet trang Hồ sơ cá nhân vào `css/pages/` |
| `css/about.css` | `css/pages/about.css` | Gom stylesheet trang Giới thiệu vào `css/pages/` |
| `css/auth.css` | `css/pages/auth.css` | Stylesheet chung cho cặp trang xác thực (`login.html`, `register.html`), giữ DRY không nhân bản |

### 2.3. Nhóm JavaScript (12 tệp → `js/core/`, `js/components/`, `js/pages/`)

| Đường dẫn cũ | Đường dẫn mới | Lý do |
|---|---|---|
| `js/layout.js` | `js/core/layout.js` | Module lõi render Header/Footer, Theme, Auth Guard, Modal toàn cục (11/11 trang) |
| `js/page-transition.js` | `js/core/page-transition.js` | Module lõi điều phối chuyển trang & View Transitions toàn site (11/11 trang) |
| `js/compare.js` | `js/components/compare.js` | Logic thành phần So sánh hội nghị dùng chung trên 5 trang |
| `js/search-core.js` | `js/components/search-core.js` | Lõi chỉ mục, chuẩn hóa & khớp mờ phục vụ thành phần tìm kiếm |
| `js/calendar.js` | `js/components/calendar.js` | Logic thành phần Lịch các mốc hội nghị |
| `js/script.js` | `js/pages/index.js` | Sửa tên chung chung (`script.js` → `index.js`) để khớp bộ ba `index.html ↔ index.css ↔ index.js` |
| `js/app.js` | `js/pages/search.js` | Sửa tên chung chung (`app.js` → `search.js`) để khớp bộ ba `search.html ↔ search.css ↔ search.js` |
| `js/detail.js` | `js/pages/detail.js` | Gom điểm khởi chạy trang Chi tiết vào `js/pages/` |
| `js/tracker.js` | `js/pages/tracker.js` | Gom điểm khởi chạy trang Theo dõi vào `js/pages/` |
| `js/profile.js` | `js/pages/profile.js` | Gom điểm khởi chạy trang Hồ sơ cá nhân vào `js/pages/` |
| `js/about.js` | `js/pages/about.js` | Gom điểm khởi chạy trang Giới thiệu vào `js/pages/` |
| `js/auth.js` | `js/pages/auth.js` | Module chung xử lý xác thực cho `login.html` và `register.html` |

### 2.4. Nhóm Data (4 tệp — giữ nguyên 100% nội dung từng byte)

| Đường dẫn cũ | Đường dẫn mới | Lý do |
|---|---|---|
| `data/conference_data.json` | `data/conferences.json` | Chuẩn hóa từ `snake_case`/số ít thừa `_data` sang danh từ số nhiều `conferences.json` |
| `data/main.py` | `data/scrape-conferences.py` | Đổi từ tên chung `main.py` sang `kebab-case` mô tả đúng chức năng script thu thập dữ liệu hội nghị độc lập |
| `data/users.json` | `data/users.json` | Đã đúng chuẩn chữ thường, danh từ số nhiều |
| `data/about.json` | `data/about.json` | Đã đúng chuẩn chữ thường, khớp nội dung trang `about.html` |

### 2.5. Hình ảnh, Cấu hình & Tài liệu

| Đường dẫn cũ | Đường dẫn mới | Lý do |
|---|---|---|
| `images/logo.svg` | `images/logo.svg` | Duy nhất 1 tệp trong `images/`, giữ nguyên tránh tạo thư mục con chỉ có 1 tệp |
| `.gitignore` | `.gitignore` | Bổ sung quy tắc bỏ qua file tạm/hệ điều hành/IDE chuẩn |
| `.editorconfig` *(mới)* | `.editorconfig` | Thống nhất UTF-8, LF và thụt lề 2 khoảng trắng cho HTML/CSS/JS/JSON |
| `docs/restructure-plan.md` *(mới)* | `docs/restructure-plan.md` | Lưu bảng ánh xạ và kế hoạch tái cấu trúc trong `docs/` |
| `AGENT.md` | `AGENT.md` | Giữ ở gốc, chỉ cập nhật mục cấu trúc thư mục và quy ước đặt tên mới |
| `README.md` | `README.md` | Giữ ở gốc, cập nhật cây thư mục, quy ước đặt tên, hướng dẫn GitHub Pages và nguyên tắc kiến trúc |

---

## 3. Danh sách Tham chiếu Cần Cập nhật theo Giai đoạn

1. **Tham chiếu CSS (`<link rel="stylesheet">` và chú thích đầu tệp CSS):**
   - Toàn bộ 11 tệp HTML (`index.html`, `search.html`, `detail.html`, `tracker.html`, `profile.html`, `about.html`, `contact.html`, `terms.html`, `privacy.html`, `login.html`, `register.html`) giữ nguyên thứ tự `<link>` để bảo toàn CSS cascade.
   - Chú thích đầu tệp trong `css/components/compare.css`, `css/components/calendar.css`, `css/pages/*.css` cập nhật đường dẫn mới.
   - URL nền trong `css/pages/auth.css` là URL HTTPS ngoài internet (không dùng đường dẫn `../images/` cục bộ), favicon trong 11 HTML dùng `images/logo.svg` (HTML vẫn ở gốc).
2. **Tham chiếu JS (`<script src>` và chú thích tệp JS):**
   - Toàn bộ 11 tệp HTML giữ nguyên vị trí `<script src="js/core/page-transition.js">` ở cuối `<head>` và thứ tự `<script>` ở cuối `<body>`.
   - Chú thích đầu tệp trong toàn bộ 12 tệp JS và 2 chú thích HTML (`detail.html`, `profile.html`) trỏ theo tên đường dẫn mới.
3. **Tham chiếu Dữ liệu (`fetch('data/conferences.json')`):**
   - 6 tệp JS gọi `fetch('data/conference_data.json')`: `js/pages/index.js`, `js/pages/search.js`, `js/pages/detail.js`, `js/pages/tracker.js`, `js/pages/profile.js`, `js/components/compare.js` (kèm thông báo lỗi thân thiện tại `js/pages/detail.js` và chú thích JSDoc tại `js/components/calendar.js`, `search.html`).

---

## 4. Ghi chú & Ràng buộc Ngoại lệ

- **Đường dẫn bên trong `data/scrape-conferences.py` (tên cũ `data/main.py`):** Dòng 120–123 trong tệp Python này khai báo `INPUT_FILE = "conferences.json"` và `OUTPUT_FILE = os.path.join("data", "conference_data.json")`. Do ràng buộc bất biến từng byte với các tệp trong `data/`, chuỗi này được giữ nguyên hoàn toàn và được ghi chú lại trong báo cáo để người phụ trách crawler chủ động cập nhật nếu sử dụng lại script.
- **Tham chiếu `logs.html` trong `js/core/layout.js`:** Dòng `currentPage === 'tracker.html' || currentPage === 'logs.html'` vẫn được giữ nguyên nhằm không thay đổi logic JS hiện có; không có tệp `logs.html` nào tồn tại trong repository.
- **Nhóm CSS phụ trong `css/pages/auth.css`:** Class `.auth-header` trong `css/pages/auth.css` là selector dự phòng/cũ vì header thực tế trên trang Auth do `js/core/layout.js` render thành `.site-header`; giữ nguyên theo nguyên tắc không xóa class CSS hiện có.
