# ConfeGuide — Website Tra Cứu Hội Nghị Khoa Học CNTT Tại Việt Nam

> **Slogan:** *Find the Right Place for Your Research*  
> **Đồ án môn học:** Internet và Công nghệ Web (IE104)  
> **Đơn vị:** Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT)

---

## 1. Giới thiệu Dự án

**ConfeGuide** là nền tảng web tĩnh hỗ trợ tra cứu, đánh giá uy tín học thuật và theo dõi các kỳ hội nghị khoa học thuộc lĩnh vực Công nghệ thông tin (CNTT) tại Việt Nam.

Website được phát triển nhằm hỗ trợ sinh viên, giảng viên, nghiên cứu sinh và các nhóm nghiên cứu dễ dàng tìm kiếm sự kiện phù hợp, đối chiếu chuẩn phân hạng học thuật (CORE Rankings, Scopus), theo dõi thời hạn nộp bài theo múi giờ UTC+7 (giờ Việt Nam, quy đổi từ chuẩn AoE) và chủ động quản lý lộ trình công bố bài báo khoa học.

---

## 2. Tính Năng Hiện Có

1. **Trang chủ & Cổng tìm kiếm nhanh (`index.html`):**
   - Thanh tìm kiếm trung tâm chuyển tiếp từ khóa sang trang tra cứu (`search.html?q=...`) kèm hiệu ứng biến hình mượt (shared-element transition).
   - Hero Slider 3 thẻ nổi bật (Danh ngôn học thuật, Hội nghị Rank A* & A, Sắp hết hạn UTC+7) cùng danh sách hội nghị sắp tới và nút Lưu.
2. **Tra cứu nâng cao & Bộ lọc đa chiều (`search.html`):**
   - Tìm kiếm tức thì, khớp mờ Damerau-Levenshtein, gợi ý combobox và bộ lọc accordion đa tiêu chí (Rank CORE, Hình thức tổ chức, Lĩnh vực, Nhà xuất bản, Trạng thái hạn nộp, Tháng/Khoảng thời gian).
   - Đồng bộ hai chiều lên URL Query Parameters (`search.html?q=...&rank=...`), thanh chip bộ lọc đang áp dụng và ngăn kéo bộ lọc trên di động.
3. **Chi tiết hội nghị toàn diện (`detail.html`):**
   - Truy xuất theo `?id=<slug>`, timeline 4 mốc thời hạn (UTC+7 / AoE), đồng hồ đếm ngược thời gian thực, đánh giá cộng đồng và xuất lịch Google Calendar / `.ics`.
4. **Theo dõi nộp bài & So sánh cạnh nhau (`tracker.html`, thanh So sánh):**
   - Lưu danh sách hội nghị quan tâm theo tài khoản qua `LocalStorage`, xem hạn nộp gần nhất.
   - Chọn tối đa 3 hội nghị để đối chiếu cạnh nhau qua thanh nổi và bảng so sánh (`css/components/compare.css`, `js/components/compare.js`).
5. **Hồ sơ cá nhân & Lịch hạn nộp bài (`profile.html`):**
   - Trang thiết kế dual-surface có chủ đích, chỉnh sửa hồ sơ/avatar, lịch mốc hội nghị cá nhân (`css/components/calendar.css`, `js/components/calendar.js`), bảo vệ bằng Auth Guard.
6. **Xác thực, Giới thiệu & Chính sách (`login.html`, `register.html`, `about.html`, `contact.html`, `terms.html`, `privacy.html`):**
   - Đăng nhập/đăng ký với SHA-256 (Web Crypto API) và 20 tài khoản seed từ `data/users.json`.
   - Trang giới thiệu tải nội dung từ `data/about.json` kèm modal đề xuất hội nghị mới; trang liên hệ, điều khoản và chính sách riêng tư.
7. **Hệ thống giao diện & Chuyển trang:**
   - Bảng màu chuẩn hóa OKLCH theo tỷ lệ 60:30:10, hiệu ứng Liquid Glass, hỗ trợ Light / Dark Mode qua `confguide_theme` (chống FOUC).
   - Hiệu ứng chuyển trang `@view-transition` kết hợp fallback JS thuần (`css/base/transition.css`, `js/core/page-transition.js`).

---

## 3. Công Nghệ Sử Dụng

| Công nghệ | Vai trò trong dự án |
|---|---|
| **HTML5** | Cấu trúc ngữ nghĩa (Semantic HTML) cho 11 trang giao diện đặt phẳng tại thư mục gốc |
| **CSS3** | Design Tokens OKLCH (`base.css`), hiệu ứng Liquid Glass, Grid/Flexbox responsive, CSS View Transitions |
| **Vanilla JavaScript (ES6+)** | Header/Footer dùng chung, tìm kiếm/lọc đa chiều, so sánh, lịch hạn nộp, chuyển trang |
| **Web Crypto API** | Mã hóa băm mật khẩu một chiều SHA-256 trên trình duyệt |
| **JSON** | Dữ liệu hội nghị, tài khoản mẫu và nội dung giới thiệu trong thư mục `data/` |
| **SVG** | Logo vector và biểu tượng nhận diện thương hiệu |

Dự án tuân thủ mô hình **Zero Build Step**: 100% HTML/CSS/JS thuần, không dùng thư viện hay công cụ build ngoài (`node_modules` không tồn tại trong sản phẩm).

---

## 4. Cấu Trúc Thư Mục & Nguyên Tắc Thiết Kế (Bản Cuối)

```text
confguide/
├── index.html                  # Trang chủ & cổng tìm kiếm nhanh
├── search.html                 # Trang tra cứu & lọc hội nghị nâng cao
├── detail.html                 # Trang chi tiết hội nghị (?id=<slug>)
├── tracker.html                # Trang theo dõi danh sách hội nghị đã lưu
├── profile.html                # Trang hồ sơ nghiên cứu & lịch cá nhân
├── about.html                  # Trang giới thiệu dự án & đội ngũ
├── contact.html                # Trang liên hệ & đóng góp dữ liệu
├── login.html                  # Trang đăng nhập
├── register.html               # Trang đăng ký
├── terms.html                  # Trang điều khoản sử dụng
├── privacy.html                # Trang chính sách bảo mật
├── css/
│   ├── base/
│   │   ├── base.css            # Design tokens OKLCH, reset, typography, header, footer, modal, toast
│   │   └── transition.css      # View Transitions giữa các trang & shared-element thanh tìm kiếm
│   ├── components/
│   │   ├── calendar.css        # Thành phần lịch các mốc hạn nộp bài (profile)
│   │   └── compare.css         # Thành phần thanh & bảng so sánh hội nghị cạnh nhau
│   └── pages/
│       ├── about.css           # Styles riêng trang about.html
│       ├── auth.css            # Styles chung cho login.html & register.html
│       ├── detail.css          # Styles riêng trang detail.html
│       ├── index.css           # Styles riêng trang index.html
│       ├── profile.css         # Styles riêng trang profile.html
│       ├── search.css          # Styles riêng trang search.html
│       └── tracker.css         # Styles riêng trang tracker.html
├── js/
│   ├── core/
│   │   ├── layout.js           # Header/Footer dùng chung, theme, auth guard, modal toàn cục
│   │   └── page-transition.js  # Điều phối View Transitions (pageswap/pagereveal) & fallback JS
│   ├── components/
│   │   ├── calendar.js         # Logic thành phần lịch hạn nộp bài cá nhân
│   │   ├── compare.js          # Logic thanh & bảng đối chiếu tối đa 3 hội nghị
│   │   └── search-core.js      # Lõi chuẩn hóa, khớp mờ & tính điểm tìm kiếm
│   └── pages/
│       ├── about.js            # Khởi chạy trang about.html
│       ├── auth.js             # Khởi chạy trang login.html & register.html
│       ├── detail.js           # Khởi chạy trang detail.html
│       ├── index.js            # Khởi chạy trang index.html
│       ├── profile.js          # Khởi chạy trang profile.html
│       ├── search.js           # Khởi chạy trang search.html
│       └── tracker.js          # Khởi chạy trang tracker.html
├── data/
│   ├── about.json              # Dữ liệu giới thiệu đồ án & đội ngũ
│   ├── conferences.json        # Cơ sở dữ liệu các hội nghị khoa học CNTT tại Việt Nam
│   ├── scrape-conferences.py   # Script Python thu thập dữ liệu độc lập (không phải backend)
│   └── users.json              # Dữ liệu 20 tài khoản nghiên cứu viên mẫu
├── images/
│   └── logo.svg                # Logo nhận diện & favicon của website
├── docs/
│   └── restructure-plan.md     # Kế hoạch & bảng ánh xạ tái cấu trúc repository
├── AGENT.md                    # Tài liệu hướng dẫn kỹ thuật & quy ước cho AI Agents
├── README.md                   # Tài liệu tổng quan dự án
├── .editorconfig               # Quy chuẩn mã hóa UTF-8, LF và thụt lề thống nhất
└── .gitignore                  # Quy tắc bỏ qua file tạm, IDE và môi trường ảo
```

### Nguyên tắc thiết kế cấu trúc
- **Tách mối quan tâm (Separation of Concerns):** Tách rạch ròi cấu trúc (`.html`), giao diện (`css/`), hành vi (`js/`) và dữ liệu (`data/`).
- **CSS phân tầng từ chung đến riêng:** `css/base/` → `css/components/` → `css/pages/`, giữ nguyên thứ tự `<link>` trong từng HTML để bảo toàn nguyên vẹn thứ tự cascade.
- **JS phân tầng rõ ràng:** `js/core/` → `js/components/` → `js/pages/`, giữ nguyên thứ tự `<script>` khi nạp trang.
- **HTML đặt phẳng ở gốc:** Phục vụ trực tiếp qua GitHub Pages với đường dẫn gọn và tương đối đơn giản; trang không có CSS/JS riêng không tạo file rỗng.
- **Thư mục con có chủ đích:** Chỉ tạo thư mục con khi nhóm có từ 2 tệp trở lên (`images/` hiện chỉ có `logo.svg` nên giữ phẳng).

### Quy ước đặt tên
- Chữ thường 100%, `kebab-case`, ASCII không dấu, không khoảng trắng, dùng danh từ tiếng Anh rõ nghĩa (dữ liệu dùng danh từ số nhiều như `conferences.json`, `users.json`).
- Quy tắc bộ ba theo trang: `<trang>.html` ↔ `css/pages/<trang>.css` ↔ `js/pages/<trang>.js` (riêng `login.html` và `register.html` dùng chung `css/pages/auth.css` và `js/pages/auth.js`).

---

## 5. Hướng Dẫn Khởi Chạy Ứng Dụng

> **Lưu ý quan trọng:** Cần chạy qua máy chủ HTTP tĩnh cục bộ vì trình duyệt chặn `fetch('data/*.json')` nếu mở trực tiếp bằng giao thức `file:///` (CORS).

### Cách 1: Sử dụng Visual Studio Code Live Server (Khuyến nghị)
1. Cài đặt tiện ích **Live Server** (Ritwick Dey) trên VS Code.
2. Mở thư mục gốc dự án trong VS Code.
3. Nhấp chuột phải vào [`index.html`](index.html) → chọn **Open with Live Server** (`http://127.0.0.1:5500/`).

### Cách 2: Sử dụng Python HTTP Server
Mở terminal tại thư mục gốc dự án và chạy:

```bash
python -m http.server 8000
```

Truy cập `http://localhost:8000` trên trình duyệt. Nhấn `Ctrl + C` để dừng máy chủ.

### Cách 3: Triển khai lên GitHub Pages
1. Vào **Settings → Pages** của repository trên GitHub.
2. Tại **Build and deployment**, chọn **Deploy from a branch**, chọn nhánh `main` (hoặc nhánh đã merge thay đổi) và thư mục **`/ (root)`**, nhấn **Save**.
3. Do toàn bộ file HTML đặt ở gốc và dùng đường dẫn tương đối không có dấu `/` đầu (`css/...`, `js/...`, `data/...`, `images/...`), website chạy đúng ngay trên cả URL dạng `https://<user>.github.io/<repo>/`.

---

## 6. Quy Ước Nhánh & Commit (Git Workflow)

- **Nhánh làm việc:** Phân nhánh rõ theo mục đích (`feature/...`, `fix/...`, `refactor/...`), không phát triển trực tiếp trên `main`.
- **Thông điệp commit:** Tuân thủ **Conventional Commits** (`feat(...)`, `fix(...)`, `refactor(...)`, `docs(...)`, `chore(...)`), giữ lịch sử đổi tên file bằng `git mv`.

---

## 7. Thông Tin Đồ Án & Đội Ngũ Thực Hiện

- **Đề tài:** Xây dựng website tra cứu hội nghị khoa học Công nghệ Thông tin tại Việt Nam (ConfeGuide)
- **Môn học:** Internet và Công nghệ Web (IE104)
- **Đơn vị đào tạo:** Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT)
- **Cố vấn chuyên môn:** ThS. Võ Tấn Khoa (Khoa Khoa học và Kỹ thuật Thông tin)
- **Nhóm sinh viên thực hiện:**
  1. **Nguyễn Tài** — MSSV: 24521549
  2. **Lê Hữu Thắng** — MSSV: 24521602
  3. **Dương Nhất Tâm** — MSSV: 24521566
  4. **Nguyễn Chí Nhân** — MSSV: 24521232
  5. **Nguyễn Nhã Quân** — MSSV: 24521445
