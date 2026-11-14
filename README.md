# ConfeGuide — Website Tra Cứu Hội Nghị Khoa Học CNTT Tại Việt Nam

> **Slogan:** *Find the Right Place for Your Research*  
> **Đồ án môn học:** Internet và Công nghệ Web (IE104)  
> **Đơn vị:** Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT)

---

## 1. Giới thiệu Dự án

**ConfeGuide** là nền tảng web tĩnh hỗ trợ tra cứu, đánh giá uy tín học thuật và theo dõi các kỳ hội nghị khoa học thuộc lĩnh vực Công nghệ thông tin (CNTT) tại Việt Nam.

Website được phát triển nhằm hỗ trợ sinh viên, giảng viên, nghiên cứu sinh và các nhóm nghiên cứu dễ dàng tìm kiếm sự kiện phù hợp, đối chiếu chuẩn phân hạng học thuật (CORE Rankings, Scopus), theo dõi thời hạn nộp bài chuẩn múi giờ quốc tế Anywhere on Earth (AoE) và chủ động quản lý lộ trình công bố bài báo khoa học.

---

## 2. Mục tiêu & Phạm vi Sản phẩm

### Mục tiêu
- Tập trung hóa dữ liệu các hội nghị khoa học CNTT tổ chức tại Việt Nam trên một nền tảng thống nhất.
- Hỗ trợ công cụ tra cứu trực quan với bộ lọc đa tiêu chí (phân hạng, lĩnh vực, nhà xuất bản, hình thức, deadline).
- Đếm ngược hạn nộp bài theo thời gian thực và quản lý danh sách theo dõi cá nhân hóa.
- Ứng dụng kiến trúc web tĩnh thuần (Modular Hybrid) không phụ thuộc framework, tối ưu tốc độ tải và trải nghiệm người dùng.

### Phạm vi sản phẩm
- **Trọng tâm địa lý:** Tập trung phục vụ thông tin các hội nghị khoa học công nghệ thông tin được tổ chức tại các tỉnh, thành phố của Việt Nam (TP. Hồ Chí Minh, Hà Nội, Đà Nẵng, Cần Thơ, Hải Phòng, Quy Nhơn, v.v.).
- **Chuyên môn:** Các chuyên ngành hẹp của CNTT như Trí tuệ nhân tạo (AI/ML), Thị giác máy tính (Computer Vision), Mạng máy tính & An toàn thông tin, Xử lý ngôn ngữ tự nhiên (NLP), Khoa học dữ liệu và Kỹ thuật phần mềm.

---

## 3. Các Tính Năng Hiện Có (Đang Chạy Thật)

1. **Trang chủ & Cổng tìm kiếm nhanh (`index.html`)**:
   - Thanh tìm kiếm trung tâm tự động chuyển tiếp từ khóa sang trang tra cứu (`search.html?q=...`).
   - Các chip gợi ý chủ đề nổi bật (Computer Vision, Machine Learning, Multimedia, Cyber Security).
   - Hiển thị danh sách 6 hội nghị tiêu biểu sắp diễn ra với thông tin tóm tắt và hạn nộp bài.
2. **Tra cứu nâng cao & Bộ lọc đa chiều (`search.html`)**:
   - Tìm kiếm tức thì theo từ khóa trong tên viết tắt, tên đầy đủ và tóm tắt hội nghị.
   - Hệ thống bộ lọc dạng accordion đóng/mở linh hoạt:
     - **Phân hạng CORE:** CORE A*, CORE A, CORE B, CORE C, Chưa xếp hạng.
     - **Hình thức tổ chức:** Trực tiếp (Offline), Trực tuyến (Online), Kết hợp (Hybrid).
     - **Lĩnh vực nghiên cứu:** AI / Machine Learning, Computer Vision, Data Science, Security, v.v.
     - **Nhà xuất bản & Kỷ yếu:** IEEE, ACM, Springer, Elsevier.
     - **Trạng thái nộp bài:** Đang mở, Sắp mở, Đã hết hạn.
     - **Khoảng thời gian hạn nộp bài:** Chọn lọc theo từ ngày đến ngày.
   - Đồng bộ liên kết hai chiều vào URL Query Parameters (`search.html?q=...&rank=...`), cho phép chia sẻ hoặc lưu bookmark trạng thái lọc.
   - Thanh hiển thị các thẻ chip bộ lọc đang áp dụng kèm nút xóa nhanh từng tiêu chí hoặc đặt lại tất cả.
3. **Chi tiết hội nghị toàn diện (`detail.html`)**:
   - Truy xuất thông tin theo mã định danh `?id=<slug>`.
   - Timeline trực quan 4 mốc thời hạn quan trọng: *Abstract Submission*, *Full Paper Submission*, *Author Notification*, và *Camera-Ready*.
   - Đồng hồ đếm ngược thời gian thực đến hạn nộp bài gần nhất.
   - Đánh giá sao cộng đồng và tính năng lưu vào danh sách theo dõi cá nhân.
4. **Quản lý theo dõi nộp bài (`tracker.html`)**:
   - Danh sách các hội nghị người dùng đã nhấn lưu (Bookmark).
   - Dữ liệu được lưu trữ và cô lập theo từng tài khoản người dùng trong LocalStorage trình duyệt.
   - Xem nhanh thời gian đếm ngược và nút gỡ bỏ hội nghị khỏi danh sách.
5. **Hồ sơ cá nhân & Cài đặt (`profile.html`)**:
   - Xem và chỉnh sửa thông tin nhà nghiên cứu (Họ tên, Đơn vị công tác, Lĩnh vực quan tâm, Tiểu sử).
   - Đổi avatar đại diện, đồng bộ dữ liệu vào LocalStorage.
   - Trang được bảo vệ bởi cơ chế Auth Guard (tự động chuyển hướng về `login.html` nếu chưa đăng nhập).
6. **Xác thực & Tài khoản (`login.html`, `register.html`)**:
   - Đăng nhập, đăng ký tài khoản mới với cơ chế băm mật khẩu bảo mật một chiều SHA-256 (Web Crypto API).
   - Tích hợp sẵn 20 tài khoản seed mẫu (từ `data/users.json`) phục vụ kiểm thử.
   - Hỗ trợ tham số `?redirect=<url>` để quay lại đúng trang người dùng đang truy cập trước đó.
7. **Thông tin giới thiệu & Tương tác (`about.html`, `contact.html`)**:
   - Giới thiệu thông tin đề tài môn học IE104, đội ngũ phát triển UIT và lộ trình phát triển.
   - Modal gửi đề xuất hội nghị khoa học mới (lưu vào `confguide_proposals`).
   - Modal báo cáo sự cố và đóng góp dữ liệu (lưu vào `confguide_reports`).
8. **Trải nghiệm giao diện & Tiện ích chung**:
   - Thiết kế hiện đại hiệu ứng Liquid Glass (thẻ kính mờ viền sáng).
   - Chế độ Sáng / Tối (Light / Dark Mode) chuyển đổi tức thì, ghi nhớ qua `confguide_theme` và chống hiện tượng nhấp nháy trắng (FOUC).
   - Thanh Header (72px) và Chân trang (Footer 4 cột) dùng chung, tích hợp form gửi góp ý nhanh có cơ chế chống spam (debounce 10 giây).

---

## 4. Danh Sách Các Trang Web (11 Trang HTML)

| Trang | Tệp nguồn | Vai trò & Chức năng |
|---|---|---|
| Trang chủ | [`index.html`](file:///d:/IE104/doangithub/confeguide/index.html) | Cổng tìm kiếm nhanh, gợi ý chủ đề, danh sách hội nghị sắp tới |
| Tra cứu | [`search.html`](file:///d:/IE104/doangithub/confeguide/search.html) | Tra cứu nâng cao, bộ lọc accordion đa chiều, đồng bộ URL |
| Chi tiết hội nghị | [`detail.html`](file:///d:/IE104/doangithub/confeguide/detail.html) | Toàn văn thông tin hội nghị, timeline 4 mốc AoE, đánh giá cộng đồng |
| Theo dõi hội nghị | [`tracker.html`](file:///d:/IE104/doangithub/confeguide/tracker.html) | Quản lý danh sách hội nghị đã lưu cá nhân hóa |
| Hồ sơ cá nhân | [`profile.html`](file:///d:/IE104/doangithub/confeguide/profile.html) | Thông tin nhà nghiên cứu, modal chỉnh sửa, cập nhật avatar |
| Giới thiệu | [`about.html`](file:///d:/IE104/doangithub/confeguide/about.html) | Thông tin đề tài IE104, đội ngũ UIT, modal đề xuất hội nghị |
| Liên hệ | [`contact.html`](file:///d:/IE104/doangithub/confeguide/contact.html) | Thông tin liên hệ và biểu mẫu gửi đóng góp |
| Đăng nhập | [`login.html`](file:///d:/IE104/doangithub/confeguide/login.html) | Đăng nhập tài khoản, ghi nhớ phiên, chuyển hướng redirect |
| Đăng ký | [`register.html`](file:///d:/IE104/doangithub/confeguide/register.html) | Đăng ký tài khoản mới với mã hóa SHA-256 |
| Điều khoản | [`terms.html`](file:///d:/IE104/doangithub/confeguide/terms.html) | Các quy định và điều khoản sử dụng website |
| Chính sách riêng tư | [`privacy.html`](file:///d:/IE104/doangithub/confeguide/privacy.html) | Chính sách thu thập và bảo mật thông tin người dùng |

---

## 5. Công Nghệ Sử Dụng

| Công nghệ | Vai trò trong dự án |
|---|---|
| **HTML5** | Xây dựng cấu trúc ngữ nghĩa (Semantic HTML) cho 11 trang giao diện |
| **CSS3** | Thiết kế hệ thống Design Tokens (60:30:10), Dark Mode, hiệu ứng Liquid Glass, Grid và Flexbox responsive |
| **Vanilla JavaScript (ES6+)** | Xử lý logic nghiệp vụ, render Header/Footer dùng chung, xử lý lọc dữ liệu và đồng bộ URL |
| **Web Crypto API** | Mã hóa băm mật khẩu một chiều an toàn bằng thuật toán SHA-256 |
| **JSON** | Định dạng lưu trữ dữ liệu hội nghị, tài khoản seed và nội dung giới thiệu |
| **SVG** | Biểu tượng vector sắc nét, favicon và đồ họa nhận diện thương hiệu |

Dự án tuân thủ mô hình **Zero Build Step**: không sử dụng Webpack, Vite, Sass hay Babel, có thể khởi chạy trực tiếp không cần cài đặt gói thư viện bên ngoài qua npm.

---

## 6. Cấu Trúc Thư Mục Dự Án (35 Files)

```text
confeguide/
├── css/
│   ├── about.css          # Styles riêng trang giới thiệu (roadmap, giá trị cốt lõi)
│   ├── auth.css           # Styles màn hình đăng nhập & đăng ký (layout 2 cột)
│   ├── base.css           # Design tokens, dark mode, header, footer, modal, toast
│   ├── detail.css         # Styles trang chi tiết (timeline 4 mốc AoE, rater)
│   ├── home.css           # Styles trang chủ (hero, suggestions, feature cards)
│   ├── profile.css        # Styles trang hồ sơ cá nhân (dual-surface hero, avatar)
│   ├── search.css         # Styles trang tra cứu (accordion filter, chips, results)
│   └── tracker.css        # Styles trang theo dõi nộp bài (bảng dữ liệu, nút gỡ)
├── data/
│   ├── about.json         # Dữ liệu đề tài môn học IE104, đội ngũ phát triển UIT
│   ├── conference_data.json # Cơ sở dữ liệu 36 hội nghị khoa học CNTT tại Việt Nam
│   ├── main.py            # Script Python hỗ trợ thu thập dữ liệu độc lập
│   └── users.json         # Dữ liệu 20 tài khoản người dùng mẫu phục vụ chạy thử
├── images/
│   └── logo.svg           # Logo vector nhận diện thương hiệu và favicon website
├── js/
│   ├── about.js           # Xử lý render giới thiệu và modal đề xuất hội nghị
│   ├── app.js             # Logic tra cứu, accordion filters, đồng bộ URL parameters
│   ├── auth.js            # Xác thực tài khoản, băm SHA-256, nạp seed users
│   ├── detail.js          # Logic trang chi tiết hội nghị, timeline AoE, rating, bookmark
│   ├── layout.js          # [DÙNG CHUNG] Render Header & Footer, Dark mode, Auth guard
│   ├── profile.js         # Logic trang hồ sơ cá nhân, modal cập nhật thông tin
│   ├── script.js          # Logic trang chủ (gateway redirect, cards hội nghị sắp tới)
│   └── tracker.js         # Logic quản lý danh sách hội nghị đã lưu trong LocalStorage
├── .gitignore             # Danh sách loại trừ tệp tạm, cache, môi trường ảo
├── about.html             # Trang giới thiệu đề tài và đội ngũ phát triển
├── AGENT.md               # Tài liệu tham chiếu kỹ thuật cho AI Agents
├── contact.html           # Trang liên hệ
├── detail.html            # Trang chi tiết hội nghị
├── index.html             # Trang chủ website
├── login.html             # Trang đăng nhập
├── privacy.html           # Trang chính sách bảo mật
├── profile.html           # Trang hồ sơ cá nhân
├── README.md              # Tài liệu tổng quan dự án
├── register.html          # Trang đăng ký
├── search.html            # Trang tra cứu nâng cao
├── terms.html             # Trang điều khoản sử dụng
└── tracker.html           # Trang theo dõi nộp bài
```

---

## 7. Hướng Dẫn Khởi Chạy Ứng Dụng (Đã Kiểm Chứng)

### Cách 1: Sử dụng Visual Studio Code Live Server (Khuyến nghị)
1. Cài đặt tiện ích **Live Server** (của Ritwick Dey) trên VS Code.
2. Mở thư mục gốc `confeguide` trong VS Code.
3. Nhấp chuột phải vào tệp [`index.html`](file:///d:/IE104/doangithub/confeguide/index.html) và chọn **Open with Live Server**.
4. Trình duyệt sẽ tự động mở trang web tại địa chỉ: `http://127.0.0.1:5500/` hoặc `http://localhost:5500/`.

### Cách 2: Sử dụng Python HTTP Server
Mở terminal tại thư mục gốc của dự án và chạy lệnh sau (yêu cầu máy có cài đặt Python 3):

```bash
python -m http.server 8000
```

*(hoặc `python3 -m http.server 8000` tùy theo cấu hình hệ thống).*

Sau đó mở trình duyệt và truy cập:
```text
http://localhost:8000
```
Nhấn tổ hợp phím `Ctrl + C` trong cửa sổ dòng lệnh để dừng máy chủ khi hoàn tất.

> **Lưu ý:**
> - Máy chủ HTTP chỉ phục vụ các tệp tĩnh (HTML, CSS, JS, JSON) cho trình duyệt.
> - Tệp `data/main.py` là một công cụ cào dữ liệu độc lập chạy theo yêu cầu bảo trì dữ liệu, không phải là backend API server và không cần thiết để chạy website.
> - Mở qua máy chủ HTTP tĩnh là phương pháp tối ưu để trình duyệt cho phép JavaScript tải các tệp JSON trong thư mục `data/` mà không bị chặn bởi chính sách CORS của giao thức `file://`.

---

## 8. Dữ Liệu Dự Án

| Tệp dữ liệu | Nội dung chi tiết |
|---|---|
| [`data/conference_data.json`](file:///d:/IE104/doangithub/confeguide/data/conference_data.json) | Chứa thông tin chi tiết của 36 hội nghị khoa học CNTT tại Việt Nam (tên, thời gian diễn ra, địa điểm tổ chức, các mốc deadline, đường dẫn bài nộp). |
| [`data/users.json`](file:///d:/IE104/doangithub/confeguide/data/users.json) | Danh sách 20 tài khoản nghiên cứu viên mẫu được thiết lập sẵn phục vụ việc kiểm thử các tính năng cá nhân hóa, đăng nhập, theo dõi và đổi mật khẩu. |
| [`data/about.json`](file:///d:/IE104/doangithub/confeguide/data/about.json) | Nội dung giới thiệu tổng quan, bối cảnh thực tế, danh mục giá trị cốt lõi, đội ngũ thực hiện và lộ trình phát triển. |

---

## 9. Thông Tin Đồ Án & Đội Ngũ Thực Hiện

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
